// Pure helpers for team invitations. No Deno imports so Vitest can test them.

export interface PendingInvitation {
  id: string;
  email: string;
  expires_at: string;
  created_at?: string | null;
}

// Among an organisation's unaccepted invitations, the one to resend to
// `email` (case-insensitive): a still-valid invitation if there is one,
// otherwise the newest expired one.
export function pickInvitationToResend<T extends PendingInvitation>(
  invitations: T[],
  email: string,
  now: Date = new Date(),
): T | null {
  const wanted = email.trim().toLowerCase();
  const matches = invitations.filter((i) => i.email.trim().toLowerCase() === wanted);
  const newestFirst = (a: T, b: T) =>
    Date.parse(b.created_at ?? b.expires_at) - Date.parse(a.created_at ?? a.expires_at);
  const live = matches.filter((i) => Date.parse(i.expires_at) > now.getTime()).sort(newestFirst);
  if (live.length > 0) return live[0];
  return matches.sort(newestFirst)[0] ?? null;
}
