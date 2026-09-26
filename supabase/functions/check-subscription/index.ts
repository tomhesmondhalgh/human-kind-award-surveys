
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
// Import Stripe using a URL instead of npm: prefix for better compatibility
import Stripe from "https://esm.sh/stripe@13.9.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "");
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header and extract the JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a Supabase client with the admin key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from the JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token or user not found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this is a batch request
    const url = new URL(req.url);
    const userIds = url.searchParams.get('userIds');
    
    if (userIds) {
      // Handle batch request
      const userIdArray = userIds.split(',');
      
      // Only allow admins to make batch requests
      // The role is 'admin', not 'administrator': use the shared check.
      const { data: adminCheck } = await supabase.rpc('is_admin', { _user_id: user.id });
      
      if (!adminCheck) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized: Only administrators can make batch requests' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Process batch request
      const results: Record<string, any> = {};
      
      await Promise.all(userIdArray.map(async (userId) => {
        const { data: subscriptionData } = await supabase
          .rpc('get_user_subscription', { user_uuid: userId });
          
        results[userId] = {
          hasActiveSubscription: subscriptionData && subscriptionData.length > 0 ? subscriptionData[0].is_active : false,
          plan: subscriptionData && subscriptionData.length > 0 ? subscriptionData[0].plan : 'free',
        };
      }));
      
      return new Response(
        JSON.stringify(results),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Handle single user request
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .rpc('get_user_subscription', { user_uuid: user.id });

    if (subscriptionError) {
      console.error('Error checking subscription:', subscriptionError);
      return new Response(
        JSON.stringify({ error: 'Error checking subscription status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If user has a Stripe subscription, verify it's still valid with Stripe
    const { data: subscriptions, error: dbError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('payment_method', 'stripe')
      .not('stripe_subscription_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (dbError) {
      console.error('Database error:', dbError);
    }

    let stripeStatus = null;
    if (subscriptions && subscriptions.length > 0 && subscriptions[0].stripe_subscription_id) {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(
          subscriptions[0].stripe_subscription_id
        );
        stripeStatus = stripeSubscription.status;
        
        // Update local subscription record if Stripe status doesn't match
        if ((stripeStatus !== 'active' && stripeStatus !== 'trialing') && 
            subscriptions[0].status === 'active') {
          await supabase
            .from('subscriptions')
            .update({ status: 'canceled' })
            .eq('id', subscriptions[0].id);
        }
      } catch (stripeError) {
        console.error('Stripe error:', stripeError);
      }
    }

    // Return the subscription information
    return new Response(
      JSON.stringify({ 
        hasActiveSubscription: subscriptionData && subscriptionData.length > 0 ? subscriptionData[0].is_active : false,
        plan: subscriptionData && subscriptionData.length > 0 ? subscriptionData[0].plan : 'free',
        stripeStatus
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
