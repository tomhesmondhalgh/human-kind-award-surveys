import { supabase } from '@/integrations/supabase/client';

// Function to create a payment session in the backend
export const createPaymentSession = async (planId: string, successUrl: string, cancelUrl: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('create-payment-session', {
      body: { planId, successUrl, cancelUrl }
    });

    if (error) {
      console.error('Error creating payment session:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error creating payment session:', error);
    return { success: false, error };
  }
};

// Function to check subscription status
export const checkSubscriptionStatus = async () => {
  try {
    const { data, error } = await supabase.functions.invoke('check-subscription');

    if (error) {
      console.error('Error checking subscription:', error);
      return { success: false, error };
    }

    return { success: true, hasActiveSubscription: data.hasActiveSubscription };
  } catch (error) {
    console.error('Error checking subscription:', error);
    return { success: false, error };
  }
};

// Helper function to format currency amounts from Stripe (in cents)
export const formatCurrency = (amount: number, currency = 'GBP') => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency,
  }).format(amount / 100);
};
