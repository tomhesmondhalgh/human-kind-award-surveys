
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create a Supabase client with the Auth context
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header and create a client with it
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Create client with user's JWT token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Check if the user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body to get the redemption code
    const { code } = await req.json();
    
    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Redemption code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client to perform tasks that require elevated permissions
    const admin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // First, get the redemption code and validate it exists and is active
    const { data: codeData, error: codeError } = await admin
      .from('redemption_codes')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .maybeSingle();

    if (codeError) {
      console.error('Error fetching redemption code:', codeError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to validate redemption code',
          details: codeError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!codeData) {
      return new Response(
        JSON.stringify({ error: 'Invalid redemption code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Now check if the code has expired
    if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Redemption code has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if the code has reached its usage limit
    // Fixed: Using a separate check rather than SQL template literal which was causing the error
    if (codeData.max_uses > 0 && codeData.current_uses >= codeData.max_uses) {
      return new Response(
        JSON.stringify({ error: 'Redemption code has reached its maximum usage limit' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if the user has already used this code
    const { data: existingRedemption, error: redemptionError } = await admin
      .from('redemptions')
      .select('*')
      .eq('code_id', codeData.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (redemptionError) {
      console.error('Error checking existing redemptions:', redemptionError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to validate redemption history',
          details: redemptionError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingRedemption) {
      return new Response(
        JSON.stringify({ error: 'You have already used this redemption code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transaction to create a redemption and update the code usage
    // We'll use the service role to bypass RLS for the transaction
    const { data: transaction, error: transactionError } = await admin.rpc('redeem_code', {
      user_uuid: user.id,
      code_uuid: codeData.id,
      plan: codeData.plan_type
    });

    if (transactionError) {
      console.error('Transaction error:', transactionError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to redeem code', 
          details: transactionError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return success response with the plan type
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Redemption code applied successfully',
        planType: codeData.plan_type
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in verify-redemption-code function:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
