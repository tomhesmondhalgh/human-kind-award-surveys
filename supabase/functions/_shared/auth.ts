// Authentication and authorisation helpers.
//
// verify_jwt=true in config.toml only proves the request carries *some* token
// signed by this project, and the public anon key qualifies. Functions that act
// on a user's behalf must call requireUser() and then check the user may touch
// the specific resource.

import { createClient, type SupabaseClient, type User } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { HttpError } from './http.ts';

let admin: SupabaseClient | null = null;

// Service-role client: bypasses RLS, so only use it after authorising the caller.
export function serviceClient(): SupabaseClient {
  admin ??= createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

export async function requireUser(req: Request): Promise<User> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'Not authenticated');
  const { data, error } = await serviceClient().auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'Not authenticated');
  return data.user;
}

export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const { data, error } = await serviceClient().rpc('is_admin', { _user_id: userId });
  if (error) throw new Error(`is_admin check failed: ${error.message}`);
  return data === true;
}

export async function requirePlatformAdmin(userId: string): Promise<void> {
  if (!(await isPlatformAdmin(userId))) throw new HttpError(403, 'Not authorised');
}

type OrgRole = 'viewer' | 'editor' | 'admin';

export async function hasOrgRole(userId: string, orgId: string, role: OrgRole): Promise<boolean> {
  const { data, error } = await serviceClient().rpc('user_has_organization_role', {
    user_uuid: userId,
    org_id: orgId,
    required_role: role,
  });
  if (error) throw new Error(`Role check failed: ${error.message}`);
  return data === true;
}

// Loads a survey and checks the user has at least `role` in its organisation
// (platform admins always pass). Returns the survey row.
export async function requireSurveyRole(userId: string, surveyId: string, role: OrgRole) {
  const { data: survey, error } = await serviceClient()
    .from('survey_templates')
    .select('id, name, organization_id, status, close_date')
    .eq('id', surveyId)
    .maybeSingle();
  if (error) throw new Error(`Survey lookup failed: ${error.message}`);
  if (!survey) throw new HttpError(404, 'Survey not found');
  if (!(await hasOrgRole(userId, survey.organization_id, role)) && !(await isPlatformAdmin(userId))) {
    throw new HttpError(403, 'Not authorised');
  }
  return survey;
}
