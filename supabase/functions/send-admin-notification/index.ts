import { Resend } from "https://esm.sh/resend@2.0.0";
import { createEmailTemplate } from "../_shared/emailTemplate.ts";
import { HttpError, json, serveJson, siteUrl } from "../_shared/http.ts";
import { serviceClient } from "../_shared/auth.ts";
import { escapeHtml } from "../_shared/html.ts";

const ADMIN_RECIPIENTS = [
  "tom.hesmondhalgh@creativeeducation.co.uk",
  "sophie.beresford@creativeeducation.co.uk",
];

// Only accounts created in this window can trigger a notification.
const RECENT_SIGNUP_MS = 30 * 60 * 1000;

// Notifies the platform team of a new registration. Called from the
// "check your email" page, before the user has a session, so it can't require a
// login. Instead it takes the new user's id and reads their details from the
// database, and only for accounts created in the last few minutes.
serveJson(async (req) => {
  const { userId } = await req.json();
  if (typeof userId !== 'string') throw new HttpError(400, 'userId is required');

  const { data, error } = await serviceClient().auth.admin.getUserById(userId);
  const user = data?.user;
  if (error || !user) throw new HttpError(404, 'User not found');
  if (Date.now() - new Date(user.created_at).getTime() > RECENT_SIGNUP_MS) {
    throw new HttpError(400, 'Not a recent registration');
  }

  const meta = user.user_metadata ?? {};
  const row = (label: string, value: unknown) => `
    <tr style="border-bottom: 1px solid #e9ecef;">
      <td style="padding: 8px 0; font-weight: 600; color: #3c3c3c; width: 30%;">${label}:</td>
      <td style="padding: 8px 0; color: #6c757d;">${escapeHtml(value || 'Not provided')}</td>
    </tr>`;
  const fullName = [meta.first_name, meta.last_name].filter(Boolean).join(' ');

  const content = `
    <p>A new user has registered for Staff Wellbeing Surveys:</p>
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 25px 0; border: 1px solid #e9ecef;">
      <table style="width: 100%; border-collapse: collapse;">
        ${row('Name', fullName)}
        ${row('Email', user.email)}
        ${row('Job Title', meta.job_title)}
        ${row('School/College', meta.school_name)}
        ${row('Address', meta.school_address)}
      </table>
    </div>
    <p>You can log in to the admin portal to view more details about this user.</p>
  `;

  const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
  const { error: sendError } = await resend.emails.send({
    from: "Human Kind <contact@humankindaward.com>",
    to: ADMIN_RECIPIENTS,
    subject: "New Registration",
    html: createEmailTemplate({
      title: "New User Registration",
      preheader: `New registration from ${fullName || user.email}`,
      content,
      buttonText: "View in Admin Portal",
      buttonUrl: `${siteUrl()}/admin`,
    }),
  });
  if (sendError) throw new Error(`Resend error: ${sendError.message}`);

  return json(req, { success: true });
});
