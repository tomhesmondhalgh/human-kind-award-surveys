import { Resend } from "https://esm.sh/resend@2.0.0";
import { createEmailTemplate } from "../_shared/emailTemplate.ts";
import { HttpError, json, serveJson, siteUrl } from "../_shared/http.ts";
import { requireSurveyRole, requireUser, serviceClient } from "../_shared/auth.ts";
import { escapeHtml } from "../_shared/html.ts";

// Tells a survey's organisation admins that it has closed. The caller must be a
// member of that organisation and the survey must actually be closed.
// Recipients come from the database, not the request.
serveJson(async (req) => {
  const user = await requireUser(req);
  const { surveyId } = await req.json();
  if (typeof surveyId !== 'string') throw new HttpError(400, 'surveyId is required');

  const survey = await requireSurveyRole(user.id, surveyId, 'viewer');
  const closed = survey.status === 'Completed' || (survey.close_date && new Date(survey.close_date) <= new Date());
  if (!closed) throw new HttpError(400, 'Survey has not closed');

  const db = serviceClient();
  const { data: admins, error } = await db
    .from('organization_memberships')
    .select('user_id')
    .eq('organization_id', survey.organization_id)
    .eq('role', 'admin');
  if (error) throw new Error(`Admin lookup failed: ${error.message}`);

  const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
  const name = escapeHtml(survey.name);
  let sent = 0;

  for (const { user_id } of admins ?? []) {
    const { data } = await db.auth.admin.getUserById(user_id);
    const email = data?.user?.email;
    if (!email) continue;
    const meta = data.user.user_metadata ?? {};
    const recipientName = [meta.first_name, meta.last_name].filter(Boolean).join(' ') || email.split('@')[0];

    const { error: sendError } = await resend.emails.send({
      from: "Human Kind <contact@humankindaward.com>",
      to: email,
      subject: `Your survey "${survey.name}" has now closed - see the results`,
      html: createEmailTemplate({
        title: "Survey Closed",
        preheader: `Your ${survey.name} survey has closed - view the results now`,
        recipientName,
        content: `
          <p>Your wellbeing survey "${name}" has now closed. Thank you for gathering valuable feedback from your staff.</p>
          <p>You can now view the complete analysis and insights from the survey responses.</p>
          <p>These insights will help you understand the wellbeing of your staff and identify areas where support may be needed.</p>
        `,
        buttonText: "View Survey Results",
        buttonUrl: `${siteUrl()}/analysis?id=${survey.id}`,
      }),
    });
    if (sendError) console.error(`send-closure-notification: send failed for ${user_id}: ${sendError.message}`);
    else sent++;
  }

  return json(req, { success: true, sent });
});
