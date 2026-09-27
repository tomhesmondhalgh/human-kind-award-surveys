import { describe, expect, it } from 'vitest';
import { pickInvitationToResend } from '../../../supabase/functions/_shared/invitations';
import { authLink, emailChangeMessages } from '../../../supabase/functions/_shared/authEmailLinks';
import { answersForSurvey } from '../../../supabase/functions/_shared/surveyResponses';

describe('pickInvitationToResend', () => {
  const now = new Date('2026-09-27T12:00:00Z');
  const expired = { id: 'expired', email: 'Jo@School.org', expires_at: '2026-09-01T00:00:00Z', created_at: '2026-08-25T00:00:00Z' };
  const live = { id: 'live', email: 'jo@school.org', expires_at: '2026-10-01T00:00:00Z', created_at: '2026-09-24T00:00:00Z' };
  const otherPerson = { id: 'other', email: 'sam@school.org', expires_at: '2026-10-01T00:00:00Z', created_at: '2026-09-26T00:00:00Z' };

  it('prefers the still-valid invitation when an expired duplicate exists', () => {
    expect(pickInvitationToResend([expired, live, otherPerson], 'jo@school.org', now)?.id).toBe('live');
  });

  it('falls back to the newest expired invitation so it can be extended', () => {
    expect(pickInvitationToResend([expired, otherPerson], 'JO@school.org ', now)?.id).toBe('expired');
  });

  it('returns null when there is nothing for that address', () => {
    expect(pickInvitationToResend([otherPerson], 'jo@school.org', now)).toBeNull();
  });
});

describe('emailChangeMessages', () => {
  it('sends each address its own token (Supabase field names are reversed)', () => {
    const messages = emailChangeMessages({
      user: { email: 'old@school.org', new_email: 'new@school.org' },
      email_data: { token_hash: 'hash-for-new', token_hash_new: 'hash-for-current' },
    });
    expect(messages).toEqual([
      { to: 'new@school.org', tokenHash: 'hash-for-new', isNewAddress: true },
      { to: 'old@school.org', tokenHash: 'hash-for-current', isNewAddress: false },
    ]);
  });

  it('sends a single email to the new address when secure email change is off', () => {
    const messages = emailChangeMessages({
      user: { email: 'old@school.org', new_email: 'new@school.org' },
      email_data: { token_hash: 'h1', token_hash_new: '' },
    });
    expect(messages).toEqual([{ to: 'new@school.org', tokenHash: 'h1', isNewAddress: true }]);
  });

  it('builds links whose type matches what the login page verifies', () => {
    expect(authLink('a/b', 'email_change')).toBe('https://surveys.humankindaward.com/login?token=a%2Fb&type=email_change');
  });
});

describe('answersForSurvey', () => {
  it('drops answers to questions that are not on the survey, and duplicates', () => {
    const { kept, dropped } = answersForSurvey(
      [
        { question_id: 'q1', answer: 'a' },
        { question_id: 'not-on-survey', answer: 'b' },
        { question_id: 'q1', answer: 'again' },
        { question_id: 'q2', answer: 'c' },
      ],
      ['q1', 'q2'],
    );
    expect(kept.map((a) => a.answer)).toEqual(['a', 'c']);
    expect(dropped).toHaveLength(2);
  });
});
