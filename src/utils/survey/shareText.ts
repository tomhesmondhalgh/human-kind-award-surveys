import { format } from 'date-fns';

export interface StaffEmailInput {
  surveyUrl: string;
  closeDate?: string | Date | null;
  schoolName?: string | null;
}

export interface StaffEmail {
  subject: string;
  body: string;
}

/** Suggested email a school leader can paste into their own mail to staff. */
export const buildStaffEmail = ({ surveyUrl, closeDate, schoolName }: StaffEmailInput): StaffEmail => {
  const close = closeDate ? new Date(closeDate) : null;
  const hasClose = close && !Number.isNaN(close.getTime());

  const lines = [
    'Hi all,',
    '',
    `We'd really value your views on staff wellbeing${schoolName ? ` at ${schoolName}` : ''}. Please take a few minutes to complete our short wellbeing survey:`,
    '',
    surveyUrl,
    '',
    "The survey is anonymous. It doesn't ask for your name or email address, so please don't include anything in your answers that could identify you.",
  ];

  if (hasClose) {
    lines.push('', `The survey closes at the end of ${format(close, 'EEEE d MMMM')}.`);
  }

  lines.push(
    '',
    'We\'ll use what you tell us to decide what to do next, and we\'ll share what we learn.',
    '',
    'Thank you,'
  );

  return {
    subject: 'Please share your views: staff wellbeing survey',
    body: lines.join('\n'),
  };
};
