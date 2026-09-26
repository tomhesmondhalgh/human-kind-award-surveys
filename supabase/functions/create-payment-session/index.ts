
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import Stripe from "https://esm.sh/stripe@13.9.0";

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
    console.log('Request received:', {
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
    });

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
    console.log('Request data:', requestData);

    const { planId, successUrl, cancelUrl, billingDetails } = requestData;

    if (!planId || !successUrl || !cancelUrl) {
      console.error('Missing required fields:', { planId, successUrl, cancelUrl });
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
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
    const planType = planData.name.toLowerCase();
    const purchaseType = planData.purchase_type || 'subscription';

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
      priceId: priceId,
      metadata,
      successUrl,
      cancelUrl
    });

    // Fix: Set customer_creation only for 'payment' mode
    const sessionOptions = {
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

    // Only add customer_creation for payment mode
    if (purchaseType !== 'subscription') {
      // @ts-ignore - Add customer_creation only for payment mode
      sessionOptions.customer_creation = 'always';
    }

    const session = await stripe.checkout.sessions.create(sessionOptions);

    await supabase.from('subscriptions').insert({
      user_id: user.id,
      plan_type: planType,
      status: 'pending',
      payment_method: 'stripe',
      purchase_type: purchaseType,
    });

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
