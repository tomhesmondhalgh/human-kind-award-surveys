import { Resend } from "https://esm.sh/resend@2.0.0";
import { createEmailTemplate } from "../_shared/emailTemplate.ts";
import { HttpError, json, serveJson, siteUrl } from "../_shared/http.ts";
import { serviceClient } from "../_shared/auth.ts";
import { escapeHtml } from "../_shared/html.ts";

// Hourly pg_cron job (see the closure_notifications migration): emails
// each closed survey's organisation admins once, then records it in
// survey_templates.closure_notified_at. Only the scheduler can call this: it
// sends the secret the migration generated.

const BATCH_SIZE = 50;

serveJson(async (req) => {
  // The job's secret lives in Vault (see the closure_notifications migration).
  const db = serviceClient();
  const candidate = req.headers.get("x-cron-secret");
  const { data: valid, error: secretError } = candidate
    ? await db.rpc("is_valid_closure_cron_secret", { candidate })
    : { data: false, error: null };
  if (secretError) throw new Error(`Secret check failed: ${secretError.message}`);
  if (valid !== true) throw new HttpError(401, "Not authorised");

  const { data: surveys, error } = await db
    .from("survey_templates")
    .select("id, name, organization_id")
    .is("closure_notified_at", null)
    .not("close_date", "is", null)
    .lte("close_date", new Date().toISOString())
    .limit(BATCH_SIZE);
  if (error) throw new Error(`Survey lookup failed: ${error.message}`);

  const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
  const results: { surveyId: string; sent: number; failed: number }[] = [];

  for (const survey of surveys ?? []) {
    const { data: admins, error: adminError } = await db
      .from("organization_memberships")
      .select("user_id")
      .eq("organization_id", survey.organization_id)
      .eq("role", "admin");
    if (adminError) throw new Error(`Admin lookup failed: ${adminError.message}`);

    let sent = 0;
    let failed = 0;
    for (const { user_id } of admins ?? []) {
      const { data } = await db.auth.admin.getUserById(user_id);
      const email = data?.user?.email;
      if (!email) continue;
      const meta = data.user.user_metadata ?? {};
      const recipientName = [meta.first_name, meta.last_name].filter(Boolean).join(" ") || email.split("@")[0];

      const { error: sendError } = await resend.emails.send({
        from: "Human Kind <contact@humankindaward.com>",
        to: email,
        subject: `Your survey "${survey.name}" has now closed - see the results`,
        html: createEmailTemplate({
          title: "Survey Closed",
          preheader: `Your ${survey.name} survey has closed - view the results now`,
          recipientName,
          content: `
            <p>Your wellbeing survey "${escapeHtml(survey.name)}" has now closed. Thank you for gathering valuable feedback from your staff.</p>
            <p>You can now view the complete analysis and insights from the survey responses.</p>
            <p>These insights will help you understand the wellbeing of your staff and identify areas where support may be needed.</p>
          `,
          buttonText: "View Survey Results",
          buttonUrl: `${siteUrl()}/analysis?id=${survey.id}`,
        }),
      });
      if (sendError) {
        failed++;
        console.error(`send-closure-notification: survey ${survey.id}, admin ${user_id}: ${sendError.message}`);
      } else {
        sent++;
      }
    }

    // Retry next hour if every send failed; otherwise it's done (partial
    // failures are logged, and re-sending would duplicate emails to the others).
    if (failed === 0 || sent > 0) {
      const { error: markError } = await db
        .from("survey_templates")
        .update({ closure_notified_at: new Date().toISOString() })
        .eq("id", survey.id);
      if (markError) throw new Error(`Failed to mark survey ${survey.id}: ${markError.message}`);
    }
    results.push({ surveyId: survey.id, sent, failed });
  }

  return json(req, { success: true, processed: results.length, results });
});
