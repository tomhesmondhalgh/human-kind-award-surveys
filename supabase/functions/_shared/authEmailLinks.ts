// Pure helpers for send-auth-email. No Deno imports so Vitest can test them.

export const SITE_URL = "https://surveys.humankindaward.com";

export interface EmailChangePayload {
  user: { email: string; new_email?: string | null };
  email_data: { token_hash: string; token_hash_new?: string | null };
}

export interface EmailChangeMessage {
  to: string;
  tokenHash: string;
  isNewAddress: boolean;
}

// Who gets an email-change link and with which token. Supabase's field names
// are reversed for backward compatibility: token_hash belongs to the NEW
// address and token_hash_new to the CURRENT one. With secure email change on,
// both addresses must confirm, so both get a link; otherwise only the new one.
export function emailChangeMessages(payload: EmailChangePayload): EmailChangeMessage[] {
  const { user, email_data } = payload;
  const newEmail = user.new_email || user.email;
  const messages: EmailChangeMessage[] = [
    { to: newEmail, tokenHash: email_data.token_hash, isNewAddress: true },
  ];
  if (email_data.token_hash_new && user.new_email && user.new_email !== user.email) {
    messages.push({ to: user.email, tokenHash: email_data.token_hash_new, isNewAddress: false });
  }
  return messages.filter((m) => m.to && m.tokenHash);
}

// The /login link for a token. `type` must match the verifyOtp type the page
// uses, or verification fails.
export function authLink(tokenHash: string, type: "signup" | "email_change" | "magiclink"): string {
  return `${SITE_URL}/login?token=${encodeURIComponent(tokenHash)}&type=${type}`;
}
