import { describe, it, expect } from 'vitest';
import { buildStaffEmail } from '@/utils/survey/shareText';

describe('buildStaffEmail', () => {
  const url = 'https://surveys.humankindaward.com/survey/abc';

  it('includes the link, anonymity reassurance and close date', () => {
    const { subject, body } = buildStaffEmail({
      surveyUrl: url,
      closeDate: new Date(2026, 9, 9, 23, 59, 59, 999).toISOString(),
      schoolName: 'Oak Primary',
    });
    expect(subject).toMatch(/wellbeing survey/i);
    expect(body).toContain(url);
    expect(body).toMatch(/anonymous/i);
    expect(body).toContain('at Oak Primary');
    expect(body).toContain('closes at the end of Friday 9 October');
  });

  it('leaves out the close date line when there is none', () => {
    const { body } = buildStaffEmail({ surveyUrl: url });
    expect(body).not.toMatch(/closes/i);
    expect(body).toContain(url);
  });
});
