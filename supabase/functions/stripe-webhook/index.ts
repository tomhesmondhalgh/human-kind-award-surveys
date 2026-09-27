
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
// Import Stripe using a URL instead of npm: prefix for better compatibility
import Stripe from "https://esm.sh/stripe@13.9.0";
import {
  activationEndDate,
  checkoutPaymentKey,
  invoiceSubscriptionId,
  isPaidPlanType,
  isRenewalInvoice,
  pickPendingRow,
  stripeId,
} from "../_shared/subscriptions.ts";

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

        if (!isPaidPlanType(planType)) {
          // Retrying won't help; log loudly and acknowledge so Stripe stops.
          console.error(`Unknown planType "${planType}" in checkout session ${session.id}; payment needs manual follow-up`);
          break;
        }

        console.log(`Processing subscription for user ${userId} to ${planType}`, {
          purchaseType,
        });

        const paymentKey = checkoutPaymentKey(session);

        // Stripe retries webhooks; if this checkout is already recorded, stop.
        const { data: alreadyRecorded, error: recordedError } = await supabase
          .from('payment_history')
          .select('id')
          .eq('stripe_payment_id', paymentKey)
          .limit(1);
        if (recordedError) {
          throw new Error(`Checking for existing payment: ${recordedError.message}`);
        }
        if (alreadyRecorded && alreadyRecorded.length > 0) {
          console.log(`Checkout ${session.id} already recorded as payment ${alreadyRecorded[0].id}`);
          break;
        }

        const stripeSubscriptionId = stripeId(session.subscription);
        const activation = {
          status: 'active',
          stripe_subscription_id: stripeSubscriptionId,
          start_date: new Date().toISOString(),
          end_date: activationEndDate(purchaseType),
          payment_method: 'stripe',
          purchase_type: purchaseType || 'subscription',
          updated_at: new Date().toISOString(),
        };

        // Activate the pending row created when checkout started (newest
        // first), so an old cancelled row is never the one reactivated.
        const { data: candidateRows, error: subCheckError } = await supabase
          .from('subscriptions')
          .select('id, status, payment_method, created_at, stripe_subscription_id')
          .eq('user_id', userId)
          .eq('plan_type', planType)
          .order('created_at', { ascending: false });
        if (subCheckError) {
          throw new Error(`Checking for existing subscriptions: ${subCheckError.message}`);
        }

        const rows = candidateRows ?? [];
        const target =
          (stripeSubscriptionId && rows.find((r) => r.stripe_subscription_id === stripeSubscriptionId)) ||
          pickPendingRow(rows, 'stripe');

        let subscriptionId: string | undefined;
        if (target) {
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update(activation)
            .eq('id', target.id);
          if (updateError) {
            throw new Error(`Updating existing subscription: ${updateError.message}`);
          }
          subscriptionId = target.id;
          console.log(`Activated subscription ID: ${subscriptionId}`);
        } else {
          const { data: newSub, error: createError } = await supabase
            .from('subscriptions')
            .insert({ user_id: userId, plan_type: planType, ...activation })
            .select('id')
            .single();
          if (createError) {
            throw new Error(`Creating new subscription: ${createError.message}`);
          }
          subscriptionId = newSub.id;
          console.log(`Created new subscription ID: ${subscriptionId}`);
        }

        // Any other abandoned checkouts for this plan are now moot.
        const { error: cleanupError } = await supabase
          .from('subscriptions')
          .update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('plan_type', planType)
          .eq('status', 'pending')
          .neq('id', subscriptionId);
        if (cleanupError) {
          console.error('Cancelling leftover pending subscriptions failed:', cleanupError);
        }

        const { data: paymentData, error: paymentError } = await supabase
          .from('payment_history')
          .insert({
            subscription_id: subscriptionId,
            amount: session.amount_total ? session.amount_total / 100 : 0,
            currency: session.currency?.toUpperCase() || 'GBP',
            payment_method: 'stripe',
            stripe_payment_id: paymentKey,
            invoice_id: stripeId(session.invoice),
            payment_status: 'payment_made',
            payment_date: new Date().toISOString(),
            billing_school_name: session.metadata?.billingSchoolName,
            billing_address: session.metadata?.billingAddress,
            billing_contact_name: session.metadata?.billingContactName,
            billing_contact_email: session.metadata?.billingContactEmail
          })
          .select('id');
        if (paymentError) {
          throw new Error(`Creating payment record: ${paymentError.message}`);
        }
        console.log(`Created payment record ID: ${paymentData?.[0]?.id}`);

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
        console.log(`Invoice paid: ${invoice.id}`, { billingReason: invoice.billing_reason });

        const stripeSubscriptionId = invoiceSubscriptionId(invoice);
        if (!stripeSubscriptionId) break;

        const { data: subRows, error: subError } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('stripe_subscription_id', stripeSubscriptionId)
          .order('created_at', { ascending: false })
          .limit(1);
        if (subError) {
          throw new Error(`Looking up subscription: ${subError.message}`);
        }

        let subscriptionId: string | undefined = subRows?.[0]?.id;

        if (!subscriptionId) {
          // The first invoice can arrive before checkout.session.completed,
          // which creates the row and records that payment itself.
          if (!isRenewalInvoice(invoice)) break;

          const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
          const userId = stripeSubscription?.metadata?.userId;
          const planType = stripeSubscription?.metadata?.planType;
          if (!userId || !isPaidPlanType(planType)) {
            console.error(`Renewal for unknown subscription ${stripeSubscriptionId}; no usable metadata`);
            break;
          }
          const { data: newSub, error: createError } = await supabase
            .from('subscriptions')
            .insert({
              user_id: userId,
              plan_type: planType,
              status: 'active',
              payment_method: 'stripe',
              purchase_type: 'subscription',
              stripe_subscription_id: stripeSubscriptionId,
              start_date: new Date().toISOString(),
              end_date: null,
            })
            .select('id')
            .single();
          if (createError) {
            throw new Error(`Creating subscription from renewal: ${createError.message}`);
          }
          subscriptionId = newSub.id;
        } else if (isRenewalInvoice(invoice)) {
          // A paid renewal means the plan carries on, whatever end_date an
          // earlier scheduled cancellation left behind.
          const { error } = await supabase
            .from('subscriptions')
            .update({ status: 'active', end_date: null, updated_at: new Date().toISOString() })
            .eq('id', subscriptionId);
          if (error) {
            throw new Error(`Updating subscription status: ${error.message}`);
          }
        }

        if (!isRenewalInvoice(invoice) || !invoice.amount_paid) break;

        const { data: existingPayment, error: existingError } = await supabase
          .from('payment_history')
          .select('id')
          .eq('invoice_id', invoice.id)
          .limit(1);
        if (existingError) {
          throw new Error(`Checking for existing renewal payment: ${existingError.message}`);
        }
        if (existingPayment && existingPayment.length > 0) {
          console.log(`Renewal invoice ${invoice.id} already recorded`);
          break;
        }

        const paidAt = invoice.status_transitions?.paid_at;
        const { error: paymentError } = await supabase
          .from('payment_history')
          .insert({
            subscription_id: subscriptionId,
            amount: invoice.amount_paid / 100,
            currency: invoice.currency?.toUpperCase() || 'GBP',
            payment_method: 'stripe',
            stripe_payment_id: stripeId(invoice.payment_intent) ?? invoice.id,
            invoice_id: invoice.id,
            payment_status: 'payment_made',
            payment_date: paidAt ? new Date(paidAt * 1000).toISOString() : new Date().toISOString(),
            billing_contact_name: invoice.customer_name ?? null,
            billing_contact_email: invoice.customer_email ?? null,
          });
        if (paymentError) {
          throw new Error(`Recording renewal payment: ${paymentError.message}`);
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        console.log(`Charge refunded: ${charge.id}`, {
          refunded: charge.refunded,
          amountRefunded: charge.amount_refunded,
        });

        // Partial refunds leave the plan in place; only a full refund ends it.
        if (!charge.refunded) break;

        const paymentIntentId = stripeId(charge.payment_intent);
        const chargeInvoiceId = stripeId(charge.invoice);

        const paymentFilters = [
          paymentIntentId ? `stripe_payment_id.eq.${paymentIntentId}` : null,
          chargeInvoiceId ? `invoice_id.eq.${chargeInvoiceId}` : null,
        ].filter((f): f is string => f !== null);

        let payments: { id: string; subscription_id: string }[] = [];
        if (paymentFilters.length > 0) {
          const { data, error } = await supabase
            .from('payment_history')
            .select('id, subscription_id')
            .or(paymentFilters.join(','));
          if (error) {
            throw new Error(`Looking up refunded payment: ${error.message}`);
          }
          payments = data ?? [];
        }

        const subscriptionIds = new Set(payments.map((p) => p.subscription_id));

        // A first subscription payment is stored under its checkout session
        // id, so fall back to the Stripe subscription behind the invoice.
        if (subscriptionIds.size === 0 && chargeInvoiceId) {
          const invoice = await stripe.invoices.retrieve(chargeInvoiceId);
          const stripeSubscriptionId = invoiceSubscriptionId(invoice as unknown as Record<string, unknown>);
          if (stripeSubscriptionId) {
            const { data, error } = await supabase
              .from('subscriptions')
              .select('id')
              .eq('stripe_subscription_id', stripeSubscriptionId);
            if (error) {
              throw new Error(`Looking up refunded subscription: ${error.message}`);
            }
            for (const row of data ?? []) subscriptionIds.add(row.id);
          }
        }

        if (subscriptionIds.size === 0) {
          console.error(`Refunded charge ${charge.id} does not match any recorded payment`);
          break;
        }

        let refundedPaymentIds = payments.map((p) => p.id);
        if (refundedPaymentIds.length === 0) {
          const { data: latest, error } = await supabase
            .from('payment_history')
            .select('id')
            .in('subscription_id', [...subscriptionIds])
            .eq('payment_status', 'payment_made')
            .order('payment_date', { ascending: false })
            .limit(1);
          if (error) {
            throw new Error(`Looking up latest payment: ${error.message}`);
          }
          refundedPaymentIds = (latest ?? []).map((p) => p.id);
        }

        if (refundedPaymentIds.length > 0) {
          const { error } = await supabase
            .from('payment_history')
            .update({ payment_status: 'refunded' })
            .in('id', refundedPaymentIds);
          if (error) {
            throw new Error(`Marking payment refunded: ${error.message}`);
          }
        }

        const now = new Date().toISOString();
        const { error: cancelError } = await supabase
          .from('subscriptions')
          .update({ status: 'canceled', end_date: now, updated_at: now })
          .in('id', [...subscriptionIds]);
        if (cancelError) {
          throw new Error(`Cancelling refunded subscription: ${cancelError.message}`);
        }
        console.log(`Cancelled subscription(s) ${[...subscriptionIds].join(', ')} after full refund`);
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


