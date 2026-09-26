import { HttpError, json, serveJson } from '../_shared/http.ts';
import { findUserByEmail, serviceClient } from '../_shared/auth.ts';

// Tells the invitation page whether the invited person already has an account,
// so it can offer "log in" or "sign up". It answers only for a valid pending
// invitation token. The old version answered for any email address, which let
// anyone find out who has an account.
serveJson(async (req) => {
  const { token } = await req.json();
  if (typeof token !== 'string' || !token) throw new HttpError(400, 'token is required');

  const { data: invitation, error } = await serviceClient()
    .from('organization_invitations')
    .select('email')
    .eq('token', token)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (error) throw new Error(`Invitation lookup failed: ${error.message}`);
  if (!invitation) throw new HttpError(404, 'Invitation not found');

  return json(req, { exists: (await findUserByEmail(invitation.email)) !== null });
});
