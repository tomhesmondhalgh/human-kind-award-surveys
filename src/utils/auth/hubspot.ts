
import { supabase } from '@/integrations/supabase/client';

// Function to send user data to Hubspot
export async function sendUserToHubspot(userData: any, listId: string = '5417', knownHubspotId?: string) {
  console.log(`Sending user data to Hubspot for list ID: ${listId}`, userData);
  
  try {
    const response = await supabase.functions.invoke('hubspot-integration', {
      body: {
        userData: {
          email: userData.email,
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          jobTitle: userData.jobTitle || '',
          schoolName: userData.schoolName || '',
          schoolAddress: userData.schoolAddress || '',
          knownHubspotId: knownHubspotId
        },
        listId: listId
      }
    });

    if (response.error) {
      console.error('Hubspot integration error:', response.error);
      throw new Error(`Hubspot integration failed: ${response.error.message}`);
    }

    console.log('Successful response from Hubspot integration:', response.data);
    return response.data;
  } catch (error) {
    console.error('Exception in sendUserToHubspot:', error);
    throw error;
  }
}
