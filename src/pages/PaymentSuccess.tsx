import React from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { fetchUserSubscription, subscriptionQueryKey } from '../services/subscriptionService';
import { supabase } from '@/integrations/supabase/client';

// How long to wait for the Stripe webhook to activate the plan.
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 60000;

type Status = 'verifying' | 'active' | 'pending';

// Stripe sends the customer here after checkout. The subscription itself is
// created by the stripe-webhook edge function, usually within a few seconds, so
// this page polls until the purchased plan is active rather than assuming it.
const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('verifying');
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    const expectedPlan = new URLSearchParams(window.location.search).get('plan')?.toLowerCase();

    const waitForActivation = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStatus('pending');
        return;
      }

      const deadline = Date.now() + POLL_TIMEOUT_MS;
      while (!cancelled && Date.now() < deadline) {
        // Read straight from the database, not the 5-minute cache.
        const subscription = await fetchUserSubscription(user.id).catch(() => null);
        const activated = subscription?.isActive
          && (expectedPlan ? subscription.plan === expectedPlan : subscription.plan !== 'free');
        if (activated) {
          queryClient.setQueryData(subscriptionQueryKey(user.id), subscription);
          setStatus('active');
          toast.success('Payment Successful!', { description: 'Thank you for your purchase. Your plan is now active.' });
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }
      if (!cancelled) setStatus('pending');
    };

    waitForActivation().catch(() => {
      if (!cancelled) setStatus('pending');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl mx-auto">
          <div className="mb-6">
            <div className="h-20 w-20 rounded-full bg-green-100 mx-auto flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-4">
            {status === 'active' ? 'Payment Successful!' : 'Thank you for your payment'}
          </h1>

          {status === 'verifying' && (
            <p className="text-blue-600 mb-6">
              Confirming your payment and activating your plan...
            </p>
          )}

          {status === 'active' && (
            <p className="text-gray-600 mb-6">
              Your plan has been activated and you now have access to all of its features.
            </p>
          )}

          {status === 'pending' && (
            <p className="text-gray-600 mb-6">
              We've received your payment and are still activating your plan. This can take a few minutes;
              please refresh this page shortly. If your plan isn't active within the hour, contact us and we'll sort it out.
            </p>
          )}

          <p className="text-gray-600 mb-8">
            You will receive a confirmation email shortly with details of your purchase.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => navigate("/dashboard")} variant="default">
              Go to Dashboard
            </Button>
            <Button onClick={() => navigate("/improve")} variant="outline">
              View Your Plan
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default PaymentSuccess;
