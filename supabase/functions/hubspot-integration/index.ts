import { HttpError, json, serveJson } from "../_shared/http.ts";
import { requireUserOrRecentSignup, serviceClient } from "../_shared/auth.ts";
import { HUBSPOT_LISTS, upsertHubspotContact } from "../_shared/hubspot.ts";

// Adds or updates the caller's own HubSpot contact. The caller is the JWT user,
// or a just-created account (signup has no session yet). The contact details
// come from the database. The old version took any email and details from the
// request, so anyone could create or overwrite any HubSpot contact.
serveJson(async (req) => {
  const { userId, listId } = await req.json();
  if (listId !== undefined && !HUBSPOT_LISTS.includes(String(listId))) {
    throw new HttpError(400, 'Unknown list');
  }

  const user = await requireUserOrRecentSignup(req, userId);
  if (!user.email) throw new HttpError(400, 'User has no email');

  const { data: profile } = await serviceClient()
    .from('profiles')
    .select('first_name, last_name, job_title, school_name, school_address')
    .eq('id', user.id)
    .maybeSingle();
  const meta = user.user_metadata ?? {};

  const contactId = await upsertHubspotContact({
    email: user.email,
    firstName: profile?.first_name ?? meta.first_name ?? '',
    lastName: profile?.last_name ?? meta.last_name ?? '',
    jobTitle: profile?.job_title ?? meta.job_title ?? '',
    schoolName: profile?.school_name ?? meta.school_name ?? '',
    schoolAddress: profile?.school_address ?? meta.school_address ?? '',
  }, listId === undefined ? undefined : String(listId));

  return json(req, { success: true, contact: { id: contactId } });
});
