import { Resend } from "https://esm.sh/resend@2.0.0";
import { createEmailTemplate } from "../_shared/emailTemplate.ts";
import { HttpError, json, serveJson } from "../_shared/http.ts";
import { requireSurveyRole, requireUser } from "../_shared/auth.ts";
import { escapeHtml, isEmail } from "../_shared/html.ts";

// Emails a survey analysis report. The caller must be a member of the survey's
// organisation. The report HTML is built here from structured data: the old
// version accepted raw HTML from the caller and would send it to anyone.

type Answer = 'Strongly Agree' | 'Agree' | 'Disagree' | 'Strongly Disagree';
const ANSWERS: Answer[] = ['Strongly Agree', 'Agree', 'Disagree', 'Strongly Disagree'];

interface ReportData {
  summary?: { strengths?: unknown[]; improvements?: unknown[]; insufficientData?: boolean } | null;
  recommendationScore?: { score?: unknown; nationalAverage?: unknown };
  leavingData?: { name?: unknown; value?: unknown }[];
  detailedResponses?: { question?: unknown; schoolResponses?: Record<string, unknown>; nationalResponses?: Record<string, unknown> }[];
}

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const cell = 'padding: 8px; border: 1px solid #ddd;';

function buildReport(surveyName: string, data: ReportData): string {
  const leaving = (data.leavingData ?? []).slice(0, 20);
  const leavingTotal = leaving.reduce((sum, item) => sum + num(item.value), 0);
  const leavingRows = leaving.map((item) => {
    const pct = leavingTotal > 0 ? ((num(item.value) / leavingTotal) * 100).toFixed(1) : '0.0';
    return `<tr><td style="${cell}">${escapeHtml(item.name)}</td><td style="${cell}">${num(item.value)}</td><td style="${cell}">${pct}%</td></tr>`;
  }).join('');

  const detailed = (data.detailedResponses ?? []).slice(0, 50).map((q) => {
    const school = q.schoolResponses ?? {};
    const national = q.nationalResponses ?? {};
    const diff = (num(school['Strongly Agree']) + num(school['Agree'])) - (num(national['Strongly Agree']) + num(national['Agree']));
    const comparison = Math.abs(diff) < 10 ? 'Similar to average' : diff > 0 ? 'Above average' : 'Below average';
    const rows = ANSWERS.map((a) =>
      `<tr><td style="${cell}">${a}</td><td style="${cell} text-align: center;">${num(school[a])}%</td><td style="${cell} text-align: center;">${num(national[a])}%</td></tr>`
    ).join('');
    return `
      <div style="margin: 20px 0; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h4 style="margin-bottom: 8px; font-size: 16px; font-weight: 600; text-align: center;">${escapeHtml(q.question)}</h4>
        <p style="text-align: center; margin-bottom: 15px; color: #6b7280;">${comparison}</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <tr><th style="${cell} text-align: left;">Response</th><th style="${cell} text-align: center;">Your School</th><th style="${cell} text-align: center;">National Average</th></tr>
          ${rows}
        </table>
      </div>`;
  }).join('');

  let summary = '';
  if (data.summary && !data.summary.insufficientData) {
    const list = (items: unknown[] | undefined) =>
      (items ?? []).slice(0, 20).map((i) => `<li style="margin-bottom: 8px;">${escapeHtml(i)}</li>`).join('');
    summary = `
      <div style="margin: 20px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #f9fafb;">
        <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 18px; color: #111827;">AI-Powered Summary</h3>
        <h4 style="margin: 0 0 10px; font-size: 16px; color: #047857;">Areas of Strength</h4>
        <ul style="padding-left: 20px; margin-top: 0;">${list(data.summary.strengths)}</ul>
        <h4 style="margin: 0 0 10px; font-size: 16px; color: #b45309;">Areas for Improvement</h4>
        <ul style="padding-left: 20px; margin-top: 0;">${list(data.summary.improvements)}</ul>
      </div>`;
  } else if (data.summary?.insufficientData) {
    summary = `<p style="color: #b45309; text-align: center;">Not enough data available for AI analysis. A minimum of 20 survey responses is required.</p>`;
  }

  const rec = data.recommendationScore ?? {};
  return `
    <h2 style="text-align: center; color: #4b5563;">${escapeHtml(surveyName)}</h2>
    ${summary}
    <div style="margin: 30px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #f9fafb;">
      <h3 style="margin-top: 0; font-size: 18px; color: #111827;">Recommendation Score</h3>
      <p><strong>Your school:</strong> ${num(rec.score)} &nbsp; <strong>National average:</strong> ${num(rec.nationalAverage)}</p>
      <p style="color: #6b7280; font-size: 14px;">Average score for "How likely are you to recommend this organisation to others as a great place to work?" (0-10)</p>
    </div>
    <div style="margin: 30px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #f9fafb;">
      <h3 style="margin-top: 0; font-size: 18px; color: #111827;">Staff Contemplating Leaving</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><th style="${cell} text-align: left;">Response</th><th style="${cell}">Count</th><th style="${cell}">Percentage</th></tr>
        ${leavingRows}
      </table>
      <p style="color: #6b7280; font-size: 14px;">Responses to "In the last 6 months I have contemplated leaving my role"</p>
    </div>
    <div style="margin: 30px 0;">
      <h3 style="margin-top: 0; font-size: 18px; color: #111827;">Detailed Wellbeing Responses</h3>
      ${detailed}
    </div>`;
}

serveJson(async (req) => {
  const user = await requireUser(req);
  const { to, surveyId, report } = await req.json();

  if (!isEmail(to)) throw new HttpError(400, 'Invalid email address');
  if (typeof surveyId !== 'string') throw new HttpError(400, 'surveyId is required');

  const survey = await requireSurveyRole(user.id, surveyId, 'viewer');

  const content = `
    <p>Here is the survey analysis report for "${escapeHtml(survey.name)}".</p>
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 25px 0;">
      ${buildReport(survey.name, (report ?? {}) as ReportData)}
    </div>
    <p>This analysis provides insights into the responses collected from your wellbeing survey. Use these findings to better understand and support staff wellbeing in your organisation.</p>
  `;

  const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
  const { error } = await resend.emails.send({
    from: "Human Kind <contact@humankindaward.com>",
    to: [to],
    subject: `Survey Analysis Report: ${survey.name}`,
    html: createEmailTemplate({
      title: "Survey Analysis Report",
      preheader: `Analysis report for ${survey.name} survey`,
      content,
      footerText: "Survey Analysis Team",
    }),
  });
  if (error) throw new Error(`Resend error: ${error.message}`);

  console.log(`send-analysis-email: survey ${survey.id} sent by ${user.id}`);
  return json(req, { success: true });
});
