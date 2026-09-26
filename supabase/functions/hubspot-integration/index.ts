import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const HUBSPOT_API_KEY = Deno.env.get('HUBSPOT_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Hubspot integration function called');
    
    const requestBody = await req.json();
    const { userData, listId } = requestBody;
    
    console.log('Request payload:', JSON.stringify({ 
      userData: { ...userData, email: userData.email ? userData.email : 'email missing' }, 
      listId 
    }));
    
    if (!userData || !userData.email) {
      console.error('Email is required but missing in request');
      throw new Error('Email is required');
    }

    console.log('Checking if contact exists in Hubspot:', userData.email);

    // First try to find by email
    let existingContact = null;
    try {
      existingContact = await findContactByEmail(userData.email);
      console.log('Initial search result:', existingContact ? `Found with ID ${existingContact.id}` : 'Not found');
    } catch (searchError) {
      console.error('Error searching for contact:', searchError);
      // Continue with workflow, but log the error
    }

    // If not found and we have a specific known ID from previous errors, try to get by ID
    if (!existingContact && userData.knownHubspotId) {
      console.log(`Contact not found by email search, trying with known ID: ${userData.knownHubspotId}`);
      try {
        existingContact = await getContactById(userData.knownHubspotId);
      } catch (idLookupError) {
        console.error('Error looking up contact by ID:', idLookupError);
        // Continue with workflow, but log the error
      }
    }

    let hubspotContactId;

    if (existingContact) {
      // Update existing contact
      console.log('Contact already exists in Hubspot with ID:', existingContact.id);
      try {
        const updateResponse = await updateContact(existingContact.id, userData);
        
        if (!updateResponse.ok) {
          const errorData = await updateResponse.json();
          console.error('Error updating contact in Hubspot:', errorData);
          throw new Error(`Failed to update contact: ${JSON.stringify(errorData)}`);
        }
        
        console.log('Successfully updated existing contact');
        hubspotContactId = existingContact.id;
      } catch (updateError) {
        console.error('Exception updating contact:', updateError);
        throw updateError;
      }
    } else {
      try {
        // Attempt to create new contact with error handling for duplicates
        console.log('No existing contact found, attempting to create new contact in Hubspot');
        const contactResponse = await createContact(userData);
        
        // Check for conflict (409) which means the contact actually exists
        if (contactResponse.status === 409) {
          const errorData = await contactResponse.json();
          console.log('Contact already exists (409 conflict):', errorData);
          
          // Extract the existing ID from the error message
          const idMatch = errorData.message?.match(/Existing ID: (\d+)/);
          if (idMatch && idMatch[1]) {
            hubspotContactId = idMatch[1];
            console.log('Extracted existing contact ID from error:', hubspotContactId);
            
            // Now update this existing contact
            try {
              const updateResponse = await updateContact(hubspotContactId, userData);
              if (!updateResponse.ok) {
                console.error('Error updating existing contact after 409:', await updateResponse.json());
              } else {
                console.log('Successfully updated contact after 409 detection');
              }
            } catch (updateAfter409Error) {
              console.error('Exception updating contact after 409:', updateAfter409Error);
              // Continue despite error
            }
          } else {
            console.error('Could not extract existing ID from 409 error', errorData);
            throw new Error(`Contact exists but could not determine ID: ${JSON.stringify(errorData)}`);
          }
        } else if (!contactResponse.ok) {
          // Handle other errors
          const errorData = await contactResponse.json();
          console.error('Error creating contact in Hubspot:', errorData);
          throw new Error(`Failed to create contact: ${JSON.stringify(errorData)}`);
        } else {
          // Contact created successfully
          const contactData = await contactResponse.json();
          hubspotContactId = contactData.id;
          console.log('Contact created in Hubspot with ID:', hubspotContactId);
        }
      } catch (createError) {
        console.error('Exception during contact creation/update:', createError);
        
        // If we got here but don't have a contact ID, try one more time to find by email
        if (!hubspotContactId) {
          console.log('Final attempt to find contact by email after error');
          try {
            existingContact = await findContactByEmail(userData.email);
            if (existingContact) {
              hubspotContactId = existingContact.id;
              console.log('Found contact on final attempt:', hubspotContactId);
            } else {
              throw createError;
            }
          } catch (finalSearchError) {
            console.error('Error in final search attempt:', finalSearchError);
            throw createError;
          }
        }
      }
    }
    
    // If we still don't have a hubspot contact ID, we can't continue
    if (!hubspotContactId) {
      throw new Error('Failed to create or find Hubspot contact');
    }
    
    // Add contact to list if listId is provided
    let listResult = null;
    if (listId) {
      console.log(`Adding contact ${hubspotContactId} to list ${listId}`);
      try {
        const listResponse = await addContactToList(hubspotContactId, listId);
        
        if (!listResponse.ok) {
          const errorData = await listResponse.json();
          console.error('Error adding contact to list:', errorData);
          throw new Error(`Failed to add contact to list: ${JSON.stringify(errorData)}`);
        }
        
        listResult = await listResponse.json();
        console.log('Contact added to list successfully:', listResult);
      } catch (listError) {
        console.error('Exception adding contact to list:', listError);
        // Don't fail if list addition fails, just log it
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        contact: { id: hubspotContactId },
        list: listResult
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error in hubspot-integration function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});

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

async function getContactById(contactId: string) {
  console.log(`Trying to get contact by ID: ${contactId}`);
  try {
    // Add retry mechanism
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        const response = await fetch(
          `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
            },
          }
        );

        if (!response.ok) {
          if (response.status >= 500) {
            // Only retry on server errors
            throw new Error(`Server error: ${response.status}`);
          }
          console.error(`Failed to get contact by ID ${contactId}, status: ${response.status}`);
          return null;
        }

        const contact = await response.json();
        console.log(`Successfully retrieved contact by ID: ${contactId}`);
        return contact;
      } catch (error) {
        retryCount++;
        
        if (retryCount < maxRetries) {
          // Exponential backoff
          const waitTime = Math.pow(2, retryCount) * 500;
          console.log(`Retrying getContactById after ${waitTime}ms (attempt ${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          console.error(`All ${maxRetries} getContactById attempts failed:`, error);
          throw error;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting contact by ID ${contactId}:`, error);
    return null;
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
