
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
// Import Stripe using a URL instead of npm: prefix for better compatibility
import Stripe from "https://esm.sh/stripe@13.9.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  httpClient: Stripe.createFetchHttpClient(),
});
// Deno needs the async, SubtleCrypto-based verifier; the sync constructEvent throws.
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

console.log('Stripe webhook function initialized', {
  hasStripeKey: !!Deno.env.get("STRIPE_SECRET_KEY"),
  hasEndpointSecret: !!endpointSecret,
  endpointSecretLength: endpointSecret?.length || 0,
  supabaseUrl: supabaseUrl,
});

// Stripe subscription status -> our subscription_status enum. past_due keeps
// access while Stripe retries the card; only terminal states cancel.
function mapStripeStatus(status: string): 'active' | 'canceled' | 'pending' {
  switch (status) {
    case 'active':
    case 'trialing':
    case 'past_due':
      return 'active';
    case 'incomplete':
      return 'pending';
    default: // canceled, unpaid, incomplete_expired, paused
      return 'canceled';
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    console.log('Webhook request received', {
      hasSignature: !!signature,
      bodyLength: body.length,
      method: req.method,
      url: req.url,
    });

    if (!signature) {
      console.error('Missing stripe signature');
      return new Response(JSON.stringify({ error: "Missing stripe signature" }), { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Verify webhook signature
    let event;
    try {
      // Fail closed: without the secret anyone could forge a "payment completed" event.
      if (!endpointSecret) {
        console.error('STRIPE_WEBHOOK_SECRET is not set; rejecting webhook');
        return new Response(JSON.stringify({ error: "Webhook not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      event = await stripe.webhooks.constructEventAsync(body, signature, endpointSecret, undefined, cryptoProvider);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`, {
        error: err,
        signature: signature?.substring(0, 20) + '...',
        secretLength: endpointSecret?.length || 0
      });
      return new Response(JSON.stringify({ error: `Webhook Error: ${err.message}` }), { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`Processing webhook event: ${event.type}`, {
      eventId: event.id,
      eventType: event.type,
      objectId: event.data.object.id,
    });

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log(`Checkout session completed: ${session.id}`, {
          sessionData: {
            clientReferenceId: session.client_reference_id,
            metadata: session.metadata,
            paymentStatus: session.payment_status,
            status: session.status,
            amountTotal: session.amount_total,
            currency: session.currency,
            customerId: session.customer,
          }
        });
        
        // Extract the metadata from the session
        const userId = session.client_reference_id || session.metadata?.userId;
        const planType = session.metadata?.planType;
        const purchaseType = session.metadata?.purchaseType;
        
        if (!userId || !planType) {
          console.error('Missing required metadata in session', {
            userId,
            planType,
            purchaseType,
            metadata: session.metadata
          });
          break;
        }

        console.log(`Processing subscription for user ${userId} to ${planType}`, {
          purchaseType,
        });

        // Create or update subscription
        let subscriptionId;
        let existingSubscription;
        
        // First, check if the user already has a subscription for this plan
        const { data: existingSubs, error: subCheckError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId)
          .eq('plan_type', planType);
          
        if (subCheckError) {
          throw new Error(`Checking for existing subscriptions: ${subCheckError.message}`);
        } else if (existingSubs && existingSubs.length > 0) {
          // Use the existing subscription if there is one
          existingSubscription = existingSubs[0];
          subscriptionId = existingSubscription.id;
          
          // Update it to active
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              stripe_subscription_id: session.subscription,
              start_date: new Date().toISOString(),
              payment_method: 'stripe',
              ...(purchaseType === 'one-time' ? {
                end_date: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString()
              } : {})
            })
            .eq('id', subscriptionId);
            
          if (updateError) {
            throw new Error(`Updating existing subscription: ${updateError.message}`);
          } else {
            console.log(`Updated existing subscription ID: ${subscriptionId}`);
          }
        } else {
          // Create a new subscription
          const { data: newSub, error: createError } = await supabase
            .from('subscriptions')
            .insert({
              user_id: userId,
              plan_type: planType,
              status: 'active',
              payment_method: 'stripe',
              purchase_type: purchaseType || 'subscription',
              stripe_subscription_id: session.subscription,
              start_date: new Date().toISOString(),
              ...(purchaseType === 'one-time' ? {
                end_date: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString()
              } : {})
            })
            .select();
            
          if (createError) {
            throw new Error(`Creating new subscription: ${createError.message}`);
          } else if (newSub && newSub.length > 0) {
            subscriptionId = newSub[0].id;
            console.log(`Created new subscription ID: ${subscriptionId}`);
          }
        }

        // Only proceed with payment record if we have a subscription ID
        if (subscriptionId) {
          // Check if payment record already exists for this session
          const { data: existingPayment } = await supabase
            .from('payment_history')
            .select('id')
            .eq('stripe_payment_id', session.payment_intent)
            .maybeSingle();
            
          if (existingPayment) {
            console.log(`Payment record already exists for payment: ${existingPayment.id}`);
          } else {
            // Calculate amount from cents to standard currency
            let amount = 0;
            if (session.amount_total) {
              amount = session.amount_total / 100; // Convert from cents
            }
            
            // Create payment record
            const { data: paymentData, error: paymentError } = await supabase
              .from('payment_history')
              .insert({
                subscription_id: subscriptionId,
                amount: amount,
                currency: session.currency?.toUpperCase() || 'GBP',
                payment_method: 'stripe',
                stripe_payment_id: session.payment_intent,
                payment_status: 'payment_made',
                payment_date: new Date().toISOString(),
                billing_school_name: session.metadata?.billingSchoolName,
                billing_address: session.metadata?.billingAddress,
                billing_contact_name: session.metadata?.billingContactName,
                billing_contact_email: session.metadata?.billingContactEmail
              })
              .select();

            if (paymentError) {
              throw new Error(`Creating payment record: ${paymentError.message}`);
            } else if (paymentData) {
              console.log(`Created payment record ID: ${paymentData[0]?.id}`);
            }
          }
        }
        
        break;
      }
      
      case 'payment_intent.succeeded': {
        // Handle direct payment intent successes that aren't from checkout
        const paymentIntent = event.data.object;
        console.log(`Payment intent succeeded: ${paymentIntent.id}`, {
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          metadata: paymentIntent.metadata,
        });
        
        // Check if we have user information in the metadata
        const userId = paymentIntent.metadata?.userId;
        const planType = paymentIntent.metadata?.planType;
        const purchaseType = paymentIntent.metadata?.purchaseType;
        
        if (userId && planType) {
          // First check if payment already recorded
          const { data: existingPayment } = await supabase
            .from('payment_history')
            .select('id, subscription_id')
            .eq('stripe_payment_id', paymentIntent.id)
            .maybeSingle();
            
          if (existingPayment) {
            console.log(`Payment already recorded: ${existingPayment.id}`);
            break;
          }
          
          // Look for or create subscription
          let subscriptionId;
          
          // Check if user already has a subscription for this plan
          const { data: existingSubs } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('plan_type', planType)
            .eq('status', 'active');
            
          if (existingSubs && existingSubs.length > 0) {
            subscriptionId = existingSubs[0].id;
          } else {
            // Create new subscription
            const { data: newSub, error: createError } = await supabase
              .from('subscriptions')
              .insert({
                user_id: userId,
                plan_type: planType,
                status: 'active',
                payment_method: 'stripe',
                purchase_type: purchaseType || 'subscription',
                start_date: new Date().toISOString(),
                ...(purchaseType === 'one-time' ? {
                  end_date: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString()
                } : {})
              })
              .select();
              
            if (createError) {
              throw new Error(`Creating new subscription: ${createError.message}`);
              break;
            }
            
            subscriptionId = newSub?.[0]?.id;
          }
          
          if (subscriptionId) {
            // Create payment record
            const { data: paymentData, error: paymentError } = await supabase
              .from('payment_history')
              .insert({
                subscription_id: subscriptionId,
                amount: paymentIntent.amount / 100,
                currency: paymentIntent.currency?.toUpperCase() || 'GBP',
                payment_method: 'stripe',
                stripe_payment_id: paymentIntent.id,
                payment_status: 'payment_made',
                payment_date: new Date().toISOString(),
                billing_school_name: paymentIntent.metadata?.billingSchoolName,
                billing_address: paymentIntent.metadata?.billingAddress,
                billing_contact_name: paymentIntent.metadata?.billingContactName,
                billing_contact_email: paymentIntent.metadata?.billingContactEmail
              })
              .select();

            if (paymentError) {
              throw new Error(`Creating payment record: ${paymentError.message}`);
            } else if (paymentData) {
              console.log(`Created payment record ID: ${paymentData[0]?.id}`);
            }
          }
        }
        
        break;
      }
      
      case 'invoice.paid': {
        const invoice = event.data.object;
        console.log(`Invoice paid: ${invoice.id}`);
        
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          
          if (subscription && subscription.metadata.userId) {
            const { error } = await supabase
              .from('subscriptions')
              .update({ 
                status: 'active' 
              })
              .eq('stripe_subscription_id', invoice.subscription);
              
            if (error) {
              throw new Error(`Updating subscription status: ${error.message}`);
            }
          }
        }
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        console.log(`Subscription updated: ${subscription.id}`);
        
        const { error } = await supabase
          .from('subscriptions')
          .update({ 
            status: mapStripeStatus(subscription.status)
          })
          .eq('stripe_subscription_id', subscription.id);
          
        if (error) {
          throw new Error(`Updating subscription status: ${error.message}`);
        }
        
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log(`Subscription deleted: ${subscription.id}`);
        
        const { error } = await supabase
          .from('subscriptions')
          .update({ 
            status: 'canceled',
            end_date: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id);
          
        if (error) {
          throw new Error(`Updating subscription status: ${error.message}`);
        }
        
        break;
      }
      
      case 'invoice.payment_succeeded': {
        console.log('Invoice payment succeeded event received');
        break;
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});


