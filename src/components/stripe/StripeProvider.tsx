
import React, { ReactNode, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { toast } from 'sonner';

// Get the publishable key from environment variables
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 
  'pk_test_placeholder'; // Placeholder for development

// Initialize the Stripe instance
const stripePromise = loadStripe(stripePublishableKey);

interface StripeProviderProps {
  children: ReactNode;
}

const StripeProvider: React.FC<StripeProviderProps> = ({ children }) => {

  useEffect(() => {
    const checkStripeLoading = async () => {
      try {
        const stripe = await stripePromise;
        if (stripe) {
          console.log('Stripe loaded successfully');
        } else {
          console.error('Stripe failed to load, no error thrown');
          toast.error('Warning', { description: 'Payment system failed to initialize properly.' });
        }
      } catch (error) {
        console.error('Error loading Stripe:', error);
        toast.error('Error', { description: 'Failed to load payment system. Please refresh the page.' });
      }
    };

    checkStripeLoading();
  }, []);

  const stripeOptions = {
    locale: 'en-GB' as const, // Explicitly type as a literal
  };

  return (
    <Elements stripe={stripePromise} options={stripeOptions}>
      {children}
    </Elements>
  );
};

export default StripeProvider;
