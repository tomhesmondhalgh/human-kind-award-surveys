
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import Stripe from "https://esm.sh/stripe@13.9.0";
import { isAllowedOrigin } from "../_shared/http.ts";
import { planTypeFromPlanName } from "../_shared/subscriptions.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "");
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

console.log('Function initialized with config:', {
  hasStripeKey: !!Deno.env.get("STRIPE_SECRET_KEY"),
  supabaseUrl: Deno.env.get("SUPABASE_URL"),
  stripeKeyLength: (Deno.env.get("STRIPE_SECRET_KEY") || "").length, // Log length to check if it's valid
});

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('User validation error:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid token or user not found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestData = await req.json();

    const { planId, successUrl, cancelUrl, billingDetails } = requestData;

    if (!planId || !successUrl || !cancelUrl) {
      console.error('Missing required fields:', { planId, successUrl, cancelUrl });
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Stripe redirects here after checkout, so only allow our own site.
    const ownUrl = (u: unknown) => {
      try { return typeof u === 'string' && isAllowedOrigin(new URL(u).origin); } catch { return false; }
    };
    if (!ownUrl(successUrl) || !ownUrl(cancelUrl)) {
      return new Response(
        JSON.stringify({ error: 'Invalid redirect URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get plan details from the database using plan ID (server-side lookup)
    const { data: planData, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .single();

    if (planError || !planData) {
      console.error('Error retrieving plan from database:', planError);
      return new Response(
        JSON.stringify({ error: `Invalid or inactive plan ID: ${planId}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully retrieved plan from database:', {
      id: planData.id,
      name: planData.name,
      price: planData.price,
      stripe_price_id: planData.stripe_price_id
    });

    // Extract the stripe_price_id from the plan (server-side only)
    const stripePriceId = planData.stripe_price_id;
    const planType = planTypeFromPlanName(planData.name);
    const purchaseType = planData.purchase_type || 'subscription';

    // The webhook writes plan_type into an enum column after the customer has
    // paid, so an unrecognised plan name must be caught before checkout.
    if (!planType) {
      console.error('Plan name does not map to a plan type:', planData.name);
      return new Response(
        JSON.stringify({ error: `Plan "${planData.name}" is not set up for online payment. Please contact us.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!stripePriceId) {
      console.error('Plan has no Stripe price ID:', planData.id);
      return new Response(
        JSON.stringify({ error: 'Plan configuration error: missing Stripe price ID' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const metadata = {
      userId: user.id,
      planType,
      purchaseType,
      billingSchoolName: billingDetails?.schoolName || '',
      billingAddress: billingDetails?.address || '',
      billingContactName: billingDetails?.contactName || '',
      billingContactEmail: billingDetails?.contactEmail || ''
    };

    console.log('Creating Stripe session with:', {
      mode: purchaseType === 'subscription' ? 'subscription' : 'payment',
      stripePriceId,
      metadata,
      successUrl,
      cancelUrl
    });

    const sessionOptions: Record<string, unknown> = {
      mode: purchaseType === 'subscription' ? 'subscription' : 'payment',
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
      client_reference_id: user.id,
      billing_address_collection: 'required',
      payment_method_types: ['card'],
      locale: 'en-GB',
      allow_promotion_codes: true,
    };

    if (purchaseType === 'subscription') {
      // Copied onto the Stripe subscription so renewal (invoice.paid) events
      // can be tied back to the user and plan.
      sessionOptions.subscription_data = { metadata: { userId: user.id, planType } };
    } else {
      sessionOptions.customer_creation = 'always';
    }

    // One pending row per user and plan: reuse it on repeat attempts so
    // abandoned checkouts don't pile up. get_user_subscription ignores pending
    // rows while an active plan exists, so this never hides a paid plan.
    const { data: pendingRows, error: pendingError } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('plan_type', planType)
      .eq('status', 'pending')
      .eq('payment_method', 'stripe')
      .order('created_at', { ascending: false })
      .limit(1);
    if (pendingError) {
      throw new Error(`Looking up pending subscription: ${pendingError.message}`);
    }

    if (pendingRows && pendingRows.length > 0) {
      const { error: reuseError } = await supabase
        .from('subscriptions')
        .update({ purchase_type: purchaseType, updated_at: new Date().toISOString() })
        .eq('id', pendingRows[0].id);
      if (reuseError) {
        throw new Error(`Updating pending subscription: ${reuseError.message}`);
      }
    } else {
      const { error: insertError } = await supabase.from('subscriptions').insert({
        user_id: user.id,
        plan_type: planType,
        status: 'pending',
        payment_method: 'stripe',
        purchase_type: purchaseType,
      });
      if (insertError) {
        throw new Error(`Creating pending subscription: ${insertError.message}`);
      }
    }

    // deno-lint-ignore no-explicit-any
    const session = await stripe.checkout.sessions.create(sessionOptions as any);

    console.log('Session created successfully:', {
      sessionId: session.id,
      url: session.url,
      hasUrlParameter: !!session.url
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Unable to process payment request',
        code: 'PAYMENT_SESSION_ERROR'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
