import { Resend } from "https://esm.sh/resend@2.0.0";
import { createEmailTemplate } from "../_shared/emailTemplate.ts";
import { HttpError, json, serveJson, siteUrl } from "../_shared/http.ts";
import { requireSurveyRole, requireUser } from "../_shared/auth.ts";
import { escapeHtml, isEmail } from "../_shared/html.ts";

const MAX_RECIPIENTS = 500;

// Sends survey invitations or reminders. The caller must be an editor in the
// survey's organisation; the survey name and link come from the database, not
// the request, so the email can't be repurposed.
serveJson(async (req) => {
  const user = await requireUser(req);
  const { surveyId, emails, isReminder } = await req.json();

  if (typeof surveyId !== 'string') throw new HttpError(400, 'surveyId is required');
  if (!Array.isArray(emails) || emails.length === 0) throw new HttpError(400, 'No email addresses provided');
  if (emails.length > MAX_RECIPIENTS) throw new HttpError(400, `At most ${MAX_RECIPIENTS} recipients per request`);

  const survey = await requireSurveyRole(user.id, surveyId, 'editor');

  const recipients = [...new Set(emails.map((e: unknown) => String(e).trim().toLowerCase()))].filter(isEmail);
  if (recipients.length === 0) throw new HttpError(400, 'No valid email addresses provided');

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) throw new Error("Missing RESEND_API_KEY");
  const resend = new Resend(resendApiKey);

  const surveyUrl = `${siteUrl()}/survey/${survey.id}`;
  const name = escapeHtml(survey.name);
  const subject = isReminder
    ? `Reminder: Please complete the "${survey.name}" wellbeing survey`
    : `You're invited to complete the "${survey.name}" wellbeing survey`;

  const content = `
    <p>${isReminder
      ? `This is a friendly reminder to complete the "${name}" wellbeing survey.`
      : `You have been invited to participate in the "${name}" wellbeing survey.`}</p>
    <p>Your feedback is important to help improve the wellbeing of staff at your school. The survey is anonymous and will only take a few minutes to complete.</p>
  `;

  const html = createEmailTemplate({
    title: `${isReminder ? 'Reminder: ' : ''}Wellbeing Survey Invitation`,
    preheader: `Complete the ${survey.name} survey - your feedback matters`,
    content,
    buttonText: "Complete Survey",
    buttonUrl: surveyUrl,
  });

  const successful: string[] = [];
  const failed: { email: string; error: string }[] = [];
  for (const email of recipients) {
    try {
      const { error } = await resend.emails.send({
        from: "Human Kind <contact@humankindaward.com>",
        to: email,
        subject,
        html,
      });
      if (error) throw new Error(error.message);
      successful.push(email);
    } catch (e) {
      failed.push({ email, error: e instanceof Error ? e.message : String(e) });
    }
  }

  console.log(`send-survey-email: survey ${survey.id}, sent ${successful.length}, failed ${failed.length}`);
  return json(req, {
    success: true,
    message: `Processed ${recipients.length} emails`,
    count: successful.length,
    results: { successful, failed },
  });
});
