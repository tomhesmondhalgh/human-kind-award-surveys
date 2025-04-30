
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create a Supabase client with the service role key for admin privileges
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Handle CORS preflight requests
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract the authorization token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a client to verify the user is an admin
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // Get user from auth header
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if the user is an admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.is_admin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized access: Admin privileges required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body to get pagination and search params
    const { page = 1, perPage = 10, searchQuery = '' } = await req.json();
    
    console.log(`Fetching users page ${page}, perPage ${perPage}, search "${searchQuery}"`);

    // Get users with pagination from Auth API
    const { data: userData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      page: page,
      perPage: perPage
    });

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    if (!userData || !userData.users) {
      return new Response(
        JSON.stringify({ users: [], count: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the total count for pagination
    const { count, error: countError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });
      
    if (countError) {
      console.error('Error counting users:', countError);
    }
    
    const totalPages = Math.ceil((count || 0) / perPage);

    // Extract user IDs for further queries
    const userIds = userData.users.map(user => user.id);
    
    // Get user profiles for additional information
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .in('id', userIds);
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }
    
    // Map profiles to a dictionary for easy lookup
    const profileDict: Record<string, any> = {};
    if (profiles) {
      profiles.forEach(profile => {
        profileDict[profile.id] = profile;
      });
    }
    
    // Get subscription data for each user
    const { data: subscriptions, error: subsError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .in('user_id', userIds)
      .order('created_at', { ascending: false });
      
    if (subsError) {
      console.error('Error fetching subscriptions:', subsError);
    }
    
    // Map subscriptions to users (get most recent subscription for each user)
    const subscriptionDict: Record<string, any> = {};
    if (subscriptions) {
      subscriptions.forEach(sub => {
        if (!subscriptionDict[sub.user_id] || new Date(sub.created_at) > new Date(subscriptionDict[sub.user_id].created_at)) {
          subscriptionDict[sub.user_id] = sub;
        }
      });
    }
    
    // Get survey counts and response counts for each user
    const surveyCounts: Record<string, number> = {};
    const responseCounts: Record<string, number> = {};
    
    await Promise.all(userIds.map(async (userId) => {
      // Count surveys
      const { count: surveyCount, error: surveyError } = await supabaseAdmin
        .from('survey_templates')
        .select('id', { count: 'exact', head: true })
        .eq('creator_id', userId);
        
      if (!surveyError) {
        surveyCounts[userId] = surveyCount || 0;
      }
      
      // Get survey IDs for this user
      const { data: surveys, error: surveysError } = await supabaseAdmin
        .from('survey_templates')
        .select('id')
        .eq('creator_id', userId);
        
      if (!surveysError && surveys && surveys.length > 0) {
        const surveyIds = surveys.map(s => s.id);
        
        // Count responses across all surveys
        const { count: responseCount, error: responseError } = await supabaseAdmin
          .from('survey_responses')
          .select('id', { count: 'exact', head: true })
          .in('survey_template_id', surveyIds);
          
        if (!responseError) {
          responseCounts[userId] = responseCount || 0;
        }
      } else {
        responseCounts[userId] = 0;
      }
    }));
    
    // Combine all data
    const combinedUsers = userData.users.map(user => {
      const profile = profileDict[user.id] || {};
      const subscription = subscriptionDict[user.id] || {};
      
      return {
        id: user.id,
        email: user.email || '',
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        schoolName: profile.school_name || '',
        isAdmin: profile.is_admin || false,
        plan: subscription.plan_type || 'free',
        surveyCount: surveyCounts[user.id] || 0,
        responseCount: responseCounts[user.id] || 0,
        created_at: user.created_at || ''
      };
    });

    // Apply search filter if provided
    const filteredUsers = searchQuery
      ? combinedUsers.filter(user => 
          user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.schoolName.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : combinedUsers;

    return new Response(
      JSON.stringify({ 
        users: filteredUsers,
        count: count || 0,
        totalPages
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in admin-get-users function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred fetching users' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
