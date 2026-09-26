import { Resend } from "npm:resend@2.0.0";
import { createEmailTemplate } from "../_shared/emailTemplate.ts";
import { HttpError, json, serveJson, siteUrl } from "../_shared/http.ts";
import { requireUser, serviceClient } from "../_shared/auth.ts";
import { escapeHtml } from "../_shared/html.ts";

// Tells the platform admins about a new accreditation submission. The caller
// must be the person who submitted it. Recipients are the platform admins in
// user_roles (the old version looked for a profiles.is_admin column that
// doesn't exist, so these emails were never sent).
serveJson(async (req) => {
  const user = await requireUser(req);
  const { submissionId, submissionData } = await req.json();
  if (typeof submissionId !== 'string') throw new HttpError(400, 'submissionId is required');

  const db = serviceClient();
  const { data: submission, error } = await db
    .from('action_plan_submissions')
    .select('id, user_id, organization_id, submitted_at')
    .eq('id', submissionId)
    .maybeSingle();
  if (error) throw new Error(`Submission lookup failed: ${error.message}`);
  if (!submission || submission.user_id !== user.id) throw new HttpError(404, 'Submission not found');

  const [{ data: profile }, { data: organization }, { data: adminRoles, error: rolesError }] = await Promise.all([
    db.from('profiles').select('first_name, last_name').eq('id', user.id).maybeSingle(),
    db.from('organizations').select('name').eq('id', submission.organization_id).maybeSingle(),
    db.from('user_roles').select('user_id').eq('role', 'admin'),
  ]);
  if (rolesError) throw new Error(`Admin lookup failed: ${rolesError.message}`);

  const adminEmails: string[] = [];
  for (const { user_id } of adminRoles ?? []) {
    const { data } = await db.auth.admin.getUserById(user_id);
    if (data?.user?.email) adminEmails.push(data.user.email);
  }
  if (adminEmails.length === 0) return json(req, { success: true, emailsSent: 0 });

  const submitterName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user.email || 'Unknown user';
  const schoolName = organization?.name || 'Not specified';
  const sections = Array.isArray(submissionData) ? submissionData.slice(0, 20) : [];
  const summary = sections.length === 0
    ? 'No submission data available'
    : sections.map((section: Record<string, unknown>) =>
        `• ${escapeHtml(section.title)}: ${Number(section.completedCount) || 0} completed, ${Number(section.notApplicableCount) || 0} not applicable`
      ).join('<br>');
  const submitted = new Date(submission.submitted_at ?? Date.now()).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const row = (label: string, value: string) => `
    <tr style="border-bottom: 1px solid #e9ecef;">
      <td style="padding: 8px 0; font-weight: 600; color: #3c3c3c; width: 30%;">${label}:</td>
      <td style="padding: 8px 0; color: #6c757d;">${escapeHtml(value)}</td>
    </tr>`;

  const content = `
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 25px 0; border: 1px solid #e9ecef;">
      <h3 style="font-family: 'League Spartan', sans-serif; color: #3c3c3c; margin-top: 0;">Submission Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        ${row('Submitter', submitterName)}
        ${row('School', schoolName)}
        ${row('Submission ID', submission.id)}
        ${row('Submitted', submitted)}
      </table>
    </div>
    <div style="margin-bottom: 20px;">
      <h3 style="font-family: 'League Spartan', sans-serif; color: #3c3c3c;">Action Plan Summary</h3>
      <div style="background-color: #f1f5f9; padding: 15px; border-radius: 6px;">${summary}</div>
    </div>
    <p>This submission requires your review for accreditation approval. Please log in to the admin panel to review and process this submission.</p>
  `;

  const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
  const { error: sendError } = await resend.emails.send({
    from: "Human Kind <contact@humankindaward.com>",
    to: adminEmails,
    subject: "New Action Plan Accreditation Submission",
    html: createEmailTemplate({
      title: "New Action Plan Accreditation Submission",
      preheader: `New submission from ${submitterName} at ${schoolName}`,
      content,
      buttonText: "Review Submission",
      buttonUrl: `${siteUrl()}/admin`,
    }),
  });
  if (sendError) throw new Error(`Resend error: ${sendError.message}`);

  return json(req, { success: true, emailsSent: adminEmails.length });
});
