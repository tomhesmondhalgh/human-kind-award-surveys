import { supabase } from '@/integrations/supabase/client';

// Links from send-auth-email other than signup confirmation. Each must be
// verified with its own OTP type: an email-change token can't be verified as
// 'signup'.
export type EmailLinkType = 'email_change' | 'magiclink';

export function emailLinkType(type: string | null): EmailLinkType | null {
  return type === 'email_change' || type === 'magiclink' ? type : null;
}

export type EmailLinkResult =
  | { status: 'email_updated' }
  // With secure email change, both the old and new address must confirm.
  // The first click succeeds without a session.
  | { status: 'email_change_pending' }
  | { status: 'signed_in' }
  | { status: 'failed'; message: string };

export async function verifyEmailLink(tokenHash: string, type: EmailLinkType): Promise<EmailLinkResult> {
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) return { status: 'failed', message: error.message };
  if (type === 'magiclink') return { status: 'signed_in' };
  return data.user || data.session ? { status: 'email_updated' } : { status: 'email_change_pending' };
}
