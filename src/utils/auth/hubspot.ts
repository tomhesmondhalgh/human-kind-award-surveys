import { supabase } from '@/integrations/supabase/client';

// Adds or updates the user's HubSpot contact. The edge function reads the
// contact details from the database; the id is only needed straight after
// signup, before the user has a session.
export async function sendUserToHubspot(userId: string, listId: string = '5417') {
  const response = await supabase.functions.invoke('hubspot-integration', {
    body: { userId, listId }
  });

  if (response.error) {
    throw new Error(`Hubspot integration failed: ${response.error.message}`);
  }

  return response.data;
}
