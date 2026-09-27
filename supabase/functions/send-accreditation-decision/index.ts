import { Resend } from "npm:resend@2.0.0";
import { createEmailTemplate } from "../_shared/emailTemplate.ts";
import { HttpError, json, serveJson, siteUrl } from "../_shared/http.ts";
import { requirePlatformAdmin, requireUser, serviceClient } from "../_shared/auth.ts";
import { escapeHtml } from "../_shared/html.ts";

// Tells a school's organisation admins the outcome of their accreditation
// submission. Only platform admins can call it. The decision, notes and
// recipients all come from the database, not the request, so the caller can
// only trigger an email that matches what's actually saved.

type Decision = "approved" | "rejected" | "under_review";

const COPY: Record<Decision, { subject: string; title: string; intro: string; button: string }> = {
  approved: {
    subject: "Congratulations - your Human Kind Award accreditation is approved",
    title: "Accreditation Approved",
    intro: "Congratulations! Your wellbeing action plan has been reviewed and your school is now accredited under the Human Kind Award framework. You can download your certificate from the Accreditation page.",
    button: "Download Your Certificate",
  },
  rejected: {
    subject: "Update on your Human Kind Award accreditation",
    title: "Accreditation Not Yet Approved",
    intro: "Thank you for submitting your wellbeing action plan. Our reviewers aren't able to approve it just yet. Please read their notes below, update your action plan, and resubmit when you're ready.",
    button: "View Accreditation",
  },
  under_review: {
    subject: "Your Human Kind Award accreditation is under review",
    title: "Submission Under Review",
    intro: "Our reviewers have started looking at your wellbeing action plan. We'll email you again as soon as a decision has been made.",
    button: "View Accreditation",
  },
};

function isDecision(status: unknown): status is Decision {
  return status === "approved" || status === "rejected" || status === "under_review";
}

serveJson(async (req) => {
  const user = await requireUser(req);
  await requirePlatformAdmin(user.id);

  const { submissionId } = await req.json();
  if (typeof submissionId !== "string") throw new HttpError(400, "submissionId is required");

  const db = serviceClient();
  const { data: submission, error } = await db
    .from("action_plan_submissions")
    .select("id, organization_id, status, reviewer_notes, approved_at, next_submission_due")
    .eq("id", submissionId)
    .maybeSingle();
  if (error) throw new Error(`Submission lookup failed: ${error.message}`);
  if (!submission) throw new HttpError(404, "Submission not found");
  if (!isDecision(submission.status)) throw new HttpError(400, "Submission has no decision to send");

  const [{ data: organization }, { data: admins, error: adminError }] = await Promise.all([
    db.from("organizations").select("name").eq("id", submission.organization_id).maybeSingle(),
    db.from("organization_memberships")
      .select("user_id")
      .eq("organization_id", submission.organization_id)
      .eq("role", "admin"),
  ]);
  if (adminError) throw new Error(`Admin lookup failed: ${adminError.message}`);

  const copy = COPY[submission.status];
  const schoolName = organization?.name || "your school";
  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const details: string[] = [];
  if (submission.status === "approved" && submission.approved_at) {
    details.push(`<p><strong>Approved:</strong> ${escapeHtml(formatDate(submission.approved_at))}</p>`);
  }
  if (submission.status === "approved" && submission.next_submission_due) {
    details.push(`<p><strong>Valid until:</strong> ${escapeHtml(formatDate(submission.next_submission_due))}</p>`);
  }
  const notes = submission.reviewer_notes?.trim();
  const notesBlock = notes
    ? `<div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 25px 0; border: 1px solid #e9ecef;">
        <h3 style="font-family: 'League Spartan', sans-serif; color: #3c3c3c; margin-top: 0;">Reviewer notes</h3>
        <p style="white-space: pre-line; margin-bottom: 0;">${escapeHtml(notes)}</p>
      </div>`
    : "";

  const content = `
    <p><strong>${escapeHtml(schoolName)}</strong></p>
    <p>${escapeHtml(copy.intro)}</p>
    ${details.join("")}
    ${notesBlock}
  `;

  const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
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
      subject: copy.subject,
      html: createEmailTemplate({
        title: copy.title,
        preheader: `${copy.title} for ${schoolName}`,
        recipientName,
        content,
        buttonText: copy.button,
        buttonUrl: `${siteUrl()}/accredit`,
      }),
    });
    if (sendError) {
      failed++;
      console.error(`send-accreditation-decision: submission ${submission.id}, admin ${user_id}: ${sendError.message}`);
    } else {
      sent++;
    }
  }

  if (sent === 0 && failed > 0) throw new Error("Every decision email failed to send");
  return json(req, { success: true, emailsSent: sent, emailsFailed: failed });
});
