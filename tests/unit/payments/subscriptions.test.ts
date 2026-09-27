import { describe, expect, it } from 'vitest';
import {
  activationEndDate,
  checkoutPaymentKey,
  invoiceSubscriptionId,
  isRenewalInvoice,
  paymentStatusEndsAccess,
  pickPendingRow,
  planTypeFromPlanName,
} from '../../../supabase/functions/_shared/subscriptions';

describe('planTypeFromPlanName', () => {
  it('maps the plan names customers see', () => {
    expect(planTypeFromPlanName('Foundation')).toBe('foundation');
    expect(planTypeFromPlanName(' Progress ')).toBe('progress');
    expect(planTypeFromPlanName('Premium Plan')).toBe('premium');
  });

  it('rejects anything it cannot map', () => {
    expect(planTypeFromPlanName('Premium Plus')).toBeNull();
    expect(planTypeFromPlanName('Legacy')).toBeNull();
    expect(planTypeFromPlanName('free')).toBeNull();
    expect(planTypeFromPlanName('')).toBeNull();
    expect(planTypeFromPlanName(undefined)).toBeNull();
  });
});

describe('pickPendingRow', () => {
  const rows = [
    { id: 'old-cancelled', status: 'canceled', payment_method: 'stripe', created_at: '2025-01-01T00:00:00Z' },
    { id: 'invoice-pending', status: 'pending', payment_method: 'invoice', created_at: '2026-09-03T00:00:00Z' },
    { id: 'stripe-pending-old', status: 'pending', payment_method: 'stripe', created_at: '2026-09-01T00:00:00Z' },
    { id: 'stripe-pending-new', status: 'pending', payment_method: 'stripe', created_at: '2026-09-02T00:00:00Z' },
  ];

  it('never picks a cancelled row and prefers the newest pending row for the payment method', () => {
    expect(pickPendingRow(rows, 'stripe')?.id).toBe('stripe-pending-new');
  });

  it('falls back to the newest pending row of any method', () => {
    expect(pickPendingRow(rows, 'redemption_code')?.id).toBe('invoice-pending');
  });

  it('returns null when nothing is pending', () => {
    expect(pickPendingRow([rows[0]], 'stripe')).toBeNull();
  });
});

describe('activationEndDate', () => {
  it('clears end_date for subscriptions so a re-subscriber is active', () => {
    expect(activationEndDate('subscription')).toBeNull();
    expect(activationEndDate(undefined)).toBeNull();
  });

  it('gives one-time purchases three years', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    expect(activationEndDate('one-time', now)).toBe('2028-12-31T00:00:00.000Z');
  });
});

describe('checkoutPaymentKey', () => {
  it('uses the payment intent when Stripe provides one', () => {
    expect(checkoutPaymentKey({ id: 'cs_1', payment_intent: 'pi_1' })).toBe('pi_1');
    expect(checkoutPaymentKey({ id: 'cs_1', payment_intent: { id: 'pi_2' } })).toBe('pi_2');
  });

  it('falls back to the checkout session id in subscription mode', () => {
    expect(checkoutPaymentKey({ id: 'cs_1', payment_intent: null })).toBe('cs_1');
  });
});

describe('invoice helpers', () => {
  it('treats only the first subscription invoice as non-renewal', () => {
    expect(isRenewalInvoice({ billing_reason: 'subscription_create' })).toBe(false);
    expect(isRenewalInvoice({ billing_reason: 'subscription_cycle' })).toBe(true);
  });

  it('reads the subscription id from old and new invoice shapes', () => {
    expect(invoiceSubscriptionId({ subscription: 'sub_1' })).toBe('sub_1');
    expect(invoiceSubscriptionId({ parent: { subscription_details: { subscription: 'sub_2' } } })).toBe('sub_2');
    expect(invoiceSubscriptionId({})).toBeNull();
  });
});

describe('paymentStatusEndsAccess', () => {
  it('is true for refunded and cancelled only', () => {
    expect(paymentStatusEndsAccess('refunded')).toBe(true);
    expect(paymentStatusEndsAccess('cancelled')).toBe(true);
    expect(paymentStatusEndsAccess('payment_made')).toBe(false);
    expect(paymentStatusEndsAccess('invoice_raised')).toBe(false);
  });
});
