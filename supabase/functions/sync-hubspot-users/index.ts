
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Get environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const hubspotApiKey = Deno.env.get('HUBSPOT_API_KEY') || '';

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client with service role for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey);

type SyncType = 'all-users' | 'survey-creators';

interface SyncResponse {
  success: boolean;
  totalProcessed: number;
  successCount: number;
  failCount: number;
  errors?: string[];
  message?: string;
}

interface UserToSync {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  schoolName?: string;
  schoolAddress?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { syncType, listId } = await req.json();
    
    if (!syncType || !listId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Missing required parameters: syncType and listId' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Starting Hubspot sync for ${syncType} to list ${listId}`);
    
    // Initialize variables for tracking progress
    let usersToSync: UserToSync[] = [];
    let errors: string[] = [];
    
    // Get all profiles with user data
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profilesError) {
      throw new Error(`Failed to fetch user profiles: ${profilesError.message}`);
    }
    
    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          totalProcessed: 0,
          successCount: 0,
          failCount: 0,
          message: 'No profiles found to sync' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Filter profiles for survey creators if needed
    let filteredProfiles = [...profiles];
    
    if (syncType === 'survey-creators') {
      // Get all users who have created surveys
      const { data: surveyTemplates, error: surveyError } = await supabase
        .from('survey_templates')
        .select('creator_id')
        .not('creator_id', 'is', null);
        
      if (surveyError) {
        throw new Error(`Failed to fetch survey creators: ${surveyError.message}`);
      }
      
      if (!surveyTemplates || surveyTemplates.length === 0) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            totalProcessed: 0,
            successCount: 0,
            failCount: 0,
            message: 'No survey creators found to sync' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Filter profiles to only include survey creators
      const creatorIds = [...new Set(surveyTemplates.map(item => item.creator_id))];
      filteredProfiles = profiles.filter(profile => creatorIds.includes(profile.id));
      
      console.log(`Found ${filteredProfiles.length} survey creators to sync`);
    } else {
      console.log(`Found ${filteredProfiles.length} users to sync`);
    }
    
    // Get user emails from auth.users using admin API
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      throw new Error(`Failed to fetch auth users: ${authError.message}`);
    }
    
    if (!authUsers || !authUsers.users) {
      throw new Error('No auth users found');
    }
    
    // Map profiles to users with emails
    for (const profile of filteredProfiles) {
      const user = authUsers.users.find(u => u.id === profile.id);
      
      if (user && user.email) {
        usersToSync.push({
          id: profile.id,
          email: user.email,
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          jobTitle: profile.job_title || '',
          schoolName: profile.school_name || '',
          schoolAddress: profile.school_address || ''
        });
      } else {
        errors.push(`No email found for user ${profile.id}`);
      }
    }
    
    console.log(`Prepared ${usersToSync.length} users with emails for syncing`);
    
    // Process users in batches
    const BATCH_SIZE = 10;
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < usersToSync.length; i += BATCH_SIZE) {
      const batch = usersToSync.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (userData) => {
        try {
          // Send to Hubspot using the existing edge function
          const response = await supabase.functions.invoke('hubspot-integration', {
            body: {
              userData: {
                email: userData.email,
                firstName: userData.firstName || '',
                lastName: userData.lastName || '',
                jobTitle: userData.jobTitle || '',
                schoolName: userData.schoolName || '',
                schoolAddress: userData.schoolAddress || ''
              },
              listId: listId
            }
          });
          
          if (response.error) {
            console.error(`Error syncing user ${userData.id} to Hubspot:`, response.error);
            failCount++;
            errors.push(`Failed to sync user ${userData.id}: ${response.error.message}`);
          } else {
            successCount++;
          }
        } catch (err) {
          console.error(`Exception syncing user ${userData.id} to Hubspot:`, err);
          failCount++;
          errors.push(`Exception syncing user ${userData.id}: ${err.message || String(err)}`);
        }
      }));
      
      console.log(`Processed batch ${i/BATCH_SIZE + 1}/${Math.ceil(usersToSync.length/BATCH_SIZE)}`);
    }
    
    // Construct the response
    const syncResponse: SyncResponse = {
      success: true,
      totalProcessed: usersToSync.length,
      successCount,
      failCount,
      errors: errors.length > 0 ? errors : undefined
    };
    
    return new Response(
      JSON.stringify(syncResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in sync-hubspot-users function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        totalProcessed: 0,
        successCount: 0,
        failCount: 1,
        message: `Error: ${error.message || String(error)}`
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
