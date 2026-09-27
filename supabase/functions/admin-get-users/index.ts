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

const IN_CHUNK = 100;

function chunks<T>(items: T[], size = IN_CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// Survey and response totals per user, summed over the organisations each
// user is a member of.
async function countSurveysAndResponses(userIds: string[]) {
  const surveyCounts: Record<string, number> = {};
  const responseCounts: Record<string, number> = {};
  if (userIds.length === 0) return { surveyCounts, responseCounts };

  const memberships: { user_id: string; organization_id: string }[] = [];
  for (const ids of chunks(userIds)) {
    const { data, error } = await supabaseAdmin
      .from('organization_memberships')
      .select('user_id, organization_id')
      .in('user_id', ids);
    if (error) throw new Error(`Loading memberships: ${error.message}`);
    memberships.push(...(data ?? []));
  }

  const orgIds = [...new Set(memberships.map((m) => m.organization_id))];
  const surveysByOrg: Record<string, string[]> = {};
  for (const ids of chunks(orgIds)) {
    const { data, error } = await supabaseAdmin
      .from('survey_templates')
      .select('id, organization_id')
      .in('organization_id', ids);
    if (error) throw new Error(`Loading surveys: ${error.message}`);
    for (const survey of data ?? []) {
      (surveysByOrg[survey.organization_id] ??= []).push(survey.id);
    }
  }

  const responsesByOrg: Record<string, number> = {};
  await Promise.all(orgIds.map(async (orgId) => {
    let total = 0;
    for (const ids of chunks(surveysByOrg[orgId] ?? [])) {
      const { count, error } = await supabaseAdmin
        .from('survey_responses')
        .select('id', { count: 'exact', head: true })
        .in('survey_template_id', ids);
      if (error) throw new Error(`Counting responses: ${error.message}`);
      total += count ?? 0;
    }
    responsesByOrg[orgId] = total;
  }));

  for (const { user_id, organization_id } of memberships) {
    surveyCounts[user_id] = (surveyCounts[user_id] ?? 0) + (surveysByOrg[organization_id]?.length ?? 0);
    responseCounts[user_id] = (responseCounts[user_id] ?? 0) + (responsesByOrg[organization_id] ?? 0);
  }
  return { surveyCounts, responseCounts };
}

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

    // Check if the user is an admin using the secure is_admin function
    const { data: isAdmin, error: adminCheckError } = await supabaseAdmin.rpc('is_admin', {
      _user_id: user.id
    });

    if (adminCheckError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized access: Admin privileges required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body to get pagination and search params
    const { page = 1, perPage = 10, searchQuery = '' } = await req.json();
    
    // Get the total count for pagination
    const { count, error: countError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });
      
    if (countError) {
      console.error('Error counting users:', countError);
    }
    
    // Different approach based on search query presence
    let users = [];
    let filteredCount = 0;
    
    if (searchQuery) {
      // When searching, fetch a larger set of users (up to 1000)
      console.log(`Searching users with query: "${searchQuery}"`);
      const maxUsersToFetch = 1000;  // Adjust based on your expected user base size
      
      const { data: userData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: maxUsersToFetch
      });
      
      if (usersError) {
        throw new Error(`Failed to fetch users: ${usersError.message}`);
      }
      
      if (!userData || !userData.users) {
        return new Response(
          JSON.stringify({ users: [], count: 0, totalPages: 0 }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Get profiles for all users
      const userIds = userData.users.map(user => user.id);
      const { data: allProfiles, error: allProfilesError } = await supabaseAdmin
        .from('profiles')
        .select('*');
      
      if (allProfilesError) {
        console.error('Error fetching all profiles:', allProfilesError);
      }
      
      // Map profiles to a dictionary for easy lookup
      const profileDict: Record<string, any> = {};
      if (allProfiles) {
        allProfiles.forEach(profile => {
          profileDict[profile.id] = profile;
        });
      }
      
      // Get subscription data for all users
      const { data: allSubscriptions, error: allSubsError } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (allSubsError) {
        console.error('Error fetching all subscriptions:', allSubsError);
      }
      
      // Map subscriptions to users (get most recent subscription for each user)
      const subscriptionDict: Record<string, any> = {};
      if (allSubscriptions) {
        allSubscriptions.forEach(sub => {
          if (!subscriptionDict[sub.user_id] || new Date(sub.created_at) > new Date(subscriptionDict[sub.user_id].created_at)) {
            subscriptionDict[sub.user_id] = sub;
          }
        });
      }
      
      // Surveys belong to organisations, so a user's counts are those of the
      // organisation(s) they belong to.
      const { surveyCounts, responseCounts } = await countSurveysAndResponses(userIds);
      
      // Get admin statuses for all users
      const adminStatuses: Record<string, boolean> = {};
      await Promise.all(userIds.map(async (userId) => {
        const { data: isUserAdmin } = await supabaseAdmin.rpc('is_admin', {
          _user_id: userId
        });
        adminStatuses[userId] = isUserAdmin === true;
      }));
      
      // Combine all data and apply search filtering
      const allCombinedUsers = userData.users.map(user => {
        const profile = profileDict[user.id] || {};
        const subscription = subscriptionDict[user.id] || {};
        
        return {
          id: user.id,
          email: user.email || '',
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          schoolName: profile.school_name || '',
          isAdmin: adminStatuses[user.id] || false,
          plan: subscription.plan_type || 'free',
          surveyCount: surveyCounts[user.id] || 0,
          responseCount: responseCounts[user.id] || 0,
          created_at: user.created_at || ''
        };
      });
      
      // Apply search filter
      const filteredUsers = allCombinedUsers.filter(user => 
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.schoolName.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      // Calculate pagination based on filtered results
      filteredCount = filteredUsers.length;
      const totalPages = Math.ceil(filteredCount / perPage);
      
      // Paginate the filtered results
      const startIndex = (page - 1) * perPage;
      users = filteredUsers.slice(startIndex, startIndex + perPage);
      
      console.log(`Found ${filteredCount} users matching search, showing page ${page} (${users.length} users)`);
    } else {
      // Standard paginated approach when not searching
      console.log(`Fetching users page ${page}, perPage ${perPage}, no search`);
      
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
          JSON.stringify({ users: [], count: 0, totalPages: 0 }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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
      
      // Surveys belong to organisations, so a user's counts are those of the
      // organisation(s) they belong to.
      const { surveyCounts, responseCounts } = await countSurveysAndResponses(userIds);
      
      // Get admin statuses for all users
      const adminStatuses: Record<string, boolean> = {};
      await Promise.all(userIds.map(async (userId) => {
        const { data: isUserAdmin } = await supabaseAdmin.rpc('is_admin', {
          _user_id: userId
        });
        adminStatuses[userId] = isUserAdmin === true;
      }));
      
      // Combine all data
      users = userData.users.map(user => {
        const profile = profileDict[user.id] || {};
        const subscription = subscriptionDict[user.id] || {};
        
        return {
          id: user.id,
          email: user.email || '',
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          schoolName: profile.school_name || '',
          isAdmin: adminStatuses[user.id] || false,
          plan: subscription.plan_type || 'free',
          surveyCount: surveyCounts[user.id] || 0,
          responseCount: responseCounts[user.id] || 0,
          created_at: user.created_at || ''
        };
      });
      
      filteredCount = count || 0;
    }

    return new Response(
      JSON.stringify({ 
        users: users,
        count: filteredCount,
        totalPages: Math.ceil(filteredCount / perPage)
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in admin-get-users function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Unable to retrieve user data',
        code: 'USER_FETCH_ERROR'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
