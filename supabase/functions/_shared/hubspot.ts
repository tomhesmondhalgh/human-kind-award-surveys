// HubSpot contact upsert, shared by hubspot-integration and sync-hubspot-users.
// The helper functions are carried over unchanged from the original
// hubspot-integration function.

const HUBSPOT_API_KEY = Deno.env.get('HUBSPOT_API_KEY');

// The only lists the app adds contacts to: all users, and survey creators.
export const HUBSPOT_LISTS = ['5417', '5418'];

export interface HubspotContact {
  email: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  schoolName?: string;
  schoolAddress?: string;
}

// Creates or updates the contact for this email, then optionally adds it to a list.
export async function upsertHubspotContact(contact: HubspotContact, listId?: string): Promise<string> {
  if (listId && !HUBSPOT_LISTS.includes(listId)) throw new Error(`Unknown HubSpot list ${listId}`);

  let contactId: string | undefined = (await findContactByEmail(contact.email))?.id;

  if (contactId) {
    const response = await updateContact(contactId, contact);
    if (!response.ok) throw new Error(`Failed to update contact: ${await response.text()}`);
  } else {
    const response = await createContact(contact);
    if (response.status === 409) {
      // HubSpot reports the existing contact's id in the conflict message.
      const errorData = await response.json();
      contactId = errorData.message?.match(/Existing ID: (\d+)/)?.[1];
      if (!contactId) throw new Error(`Contact exists but could not determine ID: ${JSON.stringify(errorData)}`);
      await updateContact(contactId, contact);
    } else if (!response.ok) {
      throw new Error(`Failed to create contact: ${await response.text()}`);
    } else {
      contactId = (await response.json()).id;
    }
  }

  if (listId) {
    const listResponse = await addContactToList(contactId!, listId);
    if (!listResponse.ok) console.error(`Failed to add contact to list ${listId}: ${await listResponse.text()}`);
  }
  return contactId!;
}

async function findContactByEmail(email: string) {
  console.log(`Searching for Hubspot contact with email: ${email}`);
  try {
    // Add a retry mechanism with exponential backoff
    const maxRetries = 3;
    let retryCount = 0;
    let lastError = null;
    
    while (retryCount < maxRetries) {
      try {
        // First attempt: Use the CRM search API (searches primary emails)
        const searchResponse = await fetch(
          `https://api.hubapi.com/crm/v3/objects/contacts/search`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
            },
            body: JSON.stringify({
              filterGroups: [
                {
                  filters: [
                    {
                      propertyName: 'email',
                      operator: 'EQ',
                      value: email
                    }
                  ]
                }
              ],
              properties: ['email', 'firstname', 'lastname'],
              limit: 1
            }),
          }
        );

        if (!searchResponse.ok) {
          const errorText = await searchResponse.text();
          console.error(`Error response from Hubspot search API (attempt ${retryCount + 1}):`, errorText);
          console.error('HTTP Status:', searchResponse.status);
          
          // If we get a 502 or other 5xx error, retry
          if (searchResponse.status >= 500) {
            throw new Error(`Server error: ${searchResponse.status}`);
          }
          return null;
        }

        const searchResult = await searchResponse.json();
        console.log('Search results count:', searchResult.total);
        
        if (searchResult.results && searchResult.results.length > 0) {
          console.log('Found existing contact:', searchResult.results[0].id);
          return searchResult.results[0];
        }
        
        // Second attempt: Use the contacts API directly (can find non-primary emails)
        console.log('Primary email search found no results, trying contacts API directly');
        try {
          // Try getting the contact directly by email using the "get by email" endpoint
          const altResponse = await fetch(
            `https://api.hubapi.com/contacts/v1/contact/email/${encodeURIComponent(email)}/profile`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
              }
            }
          );

          if (altResponse.ok) {
            const contactData = await altResponse.json();
            if (contactData && contactData.vid) {
              console.log('Found contact using contacts API lookup:', contactData.vid);
              return { id: contactData.vid.toString() };
            }
          } else {
            console.log(`Alternative contact lookup returned ${altResponse.status}`);
            if (altResponse.status !== 404 && altResponse.status >= 500) {
              // Retry on server errors
              throw new Error(`Server error in alternative lookup: ${altResponse.status}`);
            }
          }
        } catch (altError) {
          console.error('Error in alternative contact lookup:', altError);
          if (retryCount < maxRetries - 1) {
            continue; // Try again
          }
        }
        
        // Third attempt: Search by all email addresses (if API supports it)
        console.log('Attempting to search by all email addresses');
        try {
          const allEmailsResponse = await fetch(
            `https://api.hubapi.com/contacts/v1/search/email?q=${encodeURIComponent(email)}`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
              }
            }
          );
          
          if (allEmailsResponse.ok) {
            const emailSearchResults = await allEmailsResponse.json();
            console.log('All emails search results:', JSON.stringify(emailSearchResults));
            
            if (emailSearchResults && emailSearchResults.contacts && emailSearchResults.contacts.length > 0) {
              const contactId = emailSearchResults.contacts[0].vid;
              console.log('Found contact via email search API:', contactId);
              return { id: contactId.toString() };
            }
          } else {
            console.log(`Email search API returned ${allEmailsResponse.status}`);
            if (allEmailsResponse.status >= 500) {
              // Retry on server errors
              throw new Error(`Server error in email search: ${allEmailsResponse.status}`);
            }
          }
        } catch (emailSearchError) {
          console.error('Error in email search API:', emailSearchError);
          if (retryCount < maxRetries - 1) {
            continue; // Try again
          }
        }
        
        // If we reach here, all attempts have failed but with no server errors, just return null
        console.log('No existing contact found with email:', email);
        return null;
        
      } catch (error) {
        // Only retry on server errors (5xx)
        lastError = error;
        retryCount++;
        
        if (retryCount < maxRetries) {
          // Exponential backoff: wait longer between each retry
          const waitTime = Math.pow(2, retryCount) * 500;
          console.log(`Retrying search after ${waitTime}ms (attempt ${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    if (lastError) {
      console.error(`All ${maxRetries} search attempts failed:`, lastError);
    }
    
    return null;
  } catch (error) {
    console.error('Exception in findContactByEmail:', error);
    return null; // Return null but don't throw to allow contact creation to proceed
  }
}

async function createContact(userData: any) {
  // Map user data to Hubspot properties format
  const properties = {
    email: userData.email,
    firstname: userData.firstName || '',
    lastname: userData.lastName || '',
    jobtitle: userData.jobTitle || '',
    company: userData.schoolName || '',
    address: userData.schoolAddress || '',
  };

  console.log('Creating contact with properties:', JSON.stringify(properties));

  return fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
    },
    body: JSON.stringify({
      properties
    }),
  });
}

async function updateContact(contactId: string, userData: any) {
  // Map user data to Hubspot properties format
  const properties = {
    firstname: userData.firstName || '',
    lastname: userData.lastName || '',
    jobtitle: userData.jobTitle || '',
    company: userData.schoolName || '',
    address: userData.schoolAddress || '',
  };

  console.log(`Updating contact ${contactId} with properties:`, JSON.stringify(properties));

  // Add retry mechanism
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      const response = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        },
        body: JSON.stringify({
          properties
        }),
      });
      
      return response;
    } catch (error) {
      retryCount++;
      console.error(`Error updating contact (attempt ${retryCount}):`, error);
      
      if (retryCount < maxRetries) {
        // Exponential backoff
        const waitTime = Math.pow(2, retryCount) * 500;
        console.log(`Retrying update after ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        throw error;
      }
    }
  }
  
  throw new Error(`Failed to update contact after ${maxRetries} attempts`);
}

async function addContactToList(contactId: string, listId: string) {
  console.log(`Adding contact ID ${contactId} to list ID ${listId}`);
  
  // Add retry mechanism
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      const response = await fetch(`https://api.hubapi.com/contacts/v1/lists/${listId}/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        },
        body: JSON.stringify({
          vids: [contactId]
        }),
      });
      
      return response;
    } catch (error) {
      retryCount++;
      console.error(`Error adding contact to list (attempt ${retryCount}):`, error);
      
      if (retryCount < maxRetries) {
        // Exponential backoff
        const waitTime = Math.pow(2, retryCount) * 500;
        console.log(`Retrying list addition after ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        throw error;
      }
    }
  }
  
  throw new Error(`Failed to add contact to list after ${maxRetries} attempts`);
}
