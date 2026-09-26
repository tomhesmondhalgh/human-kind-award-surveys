import Stripe from 'https://esm.sh/stripe@13.9.0'
import { HttpError, json, serveJson } from '../_shared/http.ts'
import { requireUser, serviceClient } from '../_shared/auth.ts'

// Schedules the caller's own subscription to cancel at the end of the paid
// period. The user comes from the JWT: the old version trusted a userId in the
// request body, so anyone could cancel anyone's subscription.
serveJson(async (req) => {
  const user = await requireUser(req)
  const { subscriptionId } = await req.json()
  if (typeof subscriptionId !== 'string') throw new HttpError(400, 'subscriptionId is required')

  const db = serviceClient()
  const { data: subscription, error } = await db
    .from('subscriptions')
    .select('id, stripe_subscription_id')
    .eq('id', subscriptionId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) throw new Error(`Subscription lookup failed: ${error.message}`)
  if (!subscription) throw new HttpError(404, 'Subscription not found')
  if (!subscription.stripe_subscription_id) throw new HttpError(400, 'No Stripe subscription ID found')

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
    httpClient: Stripe.createFetchHttpClient(),
  })
  const stripeSubscription = await stripe.subscriptions.update(subscription.stripe_subscription_id, {
    cancel_at_period_end: true,
  })

  // Keep access until the end of the paid period (get_user_subscription treats
  // the plan as active until end_date). The stripe-webhook marks the row
  // canceled when Stripe actually ends the subscription.
  const periodEnd = new Date(stripeSubscription.current_period_end * 1000).toISOString()
  const { error: updateError } = await db
    .from('subscriptions')
    .update({ end_date: periodEnd, updated_at: new Date().toISOString() })
    .eq('id', subscription.id)
  if (updateError) throw new Error(`Failed to update subscription: ${updateError.message}`)

  return json(req, {
    success: true,
    message: 'Subscription has been scheduled to cancel at the end of the current billing period',
    data: {
      canceled_at: stripeSubscription.canceled_at,
      current_period_end: stripeSubscription.current_period_end,
    },
  })
})
