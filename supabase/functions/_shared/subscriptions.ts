// Pure helpers shared by the payment functions. No Deno or network imports so
// they can be unit tested with Vitest.

export type PaidPlanType = 'foundation' | 'progress' | 'premium';

const PAID_PLAN_TYPES: readonly PaidPlanType[] = ['foundation', 'progress', 'premium'];

// Maps a plans.name (shown to customers and editable by admins) to the
// plan_type enum. Only an exact match, optionally followed by the word "plan",
// is accepted: "Premium" and "Premium Plan" map to premium, anything else is
// rejected so a renamed plan fails before the customer pays instead of after.
export function planTypeFromPlanName(name: unknown): PaidPlanType | null {
  if (typeof name !== 'string') return null;
  const normalised = name.trim().toLowerCase().replace(/\s+plan$/, '');
  return (PAID_PLAN_TYPES as readonly string[]).includes(normalised)
    ? (normalised as PaidPlanType)
    : null;
}

export function isPaidPlanType(value: unknown): value is PaidPlanType {
  return typeof value === 'string' && (PAID_PLAN_TYPES as readonly string[]).includes(value);
}

export interface SubscriptionRow {
  id: string;
  status: string;
  payment_method?: string | null;
  created_at: string;
}

// The pending row a completed checkout should activate: the newest pending row
// for the user and plan, preferring one created for the same payment method.
export function pickPendingRow<T extends SubscriptionRow>(
  rows: T[],
  paymentMethod: string,
): T | null {
  const pending = rows
    .filter((r) => r.status === 'pending')
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  return pending.find((r) => r.payment_method === paymentMethod) ?? pending[0] ?? null;
}

const THREE_YEARS_MS = 3 * 365 * 24 * 60 * 60 * 1000;

// Stripe subscriptions run until Stripe tells us otherwise, so any end_date
// left over from an earlier cancellation must be cleared. One-time purchases
// last three years.
export function activationEndDate(purchaseType: unknown, now: Date = new Date()): string | null {
  return purchaseType === 'one-time' ? new Date(now.getTime() + THREE_YEARS_MS).toISOString() : null;
}

// The key stored in payment_history.stripe_payment_id for a checkout. In
// subscription mode Stripe leaves payment_intent null, so fall back to the
// checkout session id, which is unique per checkout.
export function checkoutPaymentKey(session: { id: string; payment_intent?: unknown }): string {
  return stripeId(session.payment_intent) ?? session.id;
}

// Stripe fields that reference another object are either its id or, when
// expanded, the object itself.
export function stripeId(value: unknown): string | null {
  if (typeof value === 'string' && value) return value;
  if (value && typeof value === 'object' && typeof (value as { id?: unknown }).id === 'string') {
    return (value as { id: string }).id;
  }
  return null;
}

// Stripe sends invoice.paid for the first invoice of a subscription as well as
// renewals. The first one is already recorded by checkout.session.completed.
export function isRenewalInvoice(invoice: { billing_reason?: string | null }): boolean {
  return invoice.billing_reason !== 'subscription_create';
}

// Stripe moved invoice.subscription under parent.subscription_details in newer
// API versions; accept either shape.
export function invoiceSubscriptionId(invoice: Record<string, unknown> | null | undefined): string | null {
  if (!invoice) return null;
  const parent = invoice.parent as { subscription_details?: { subscription?: unknown } } | undefined;
  return stripeId(invoice.subscription) ?? stripeId(parent?.subscription_details?.subscription);
}

// Payment statuses an admin can set that mean the school no longer paid.
export function paymentStatusEndsAccess(status: unknown): boolean {
  return status === 'refunded' || status === 'cancelled';
}
