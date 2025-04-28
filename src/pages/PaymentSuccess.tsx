import React from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { Button } from '../components/ui/button';
import { toast } from '../services/toastService';
import { useEffect, useState } from 'react';
import { getUserSubscription, checkAndCreateSubscription } from '../lib/supabase/subscription';
import { supabase } from '../lib/supabase/client';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(true);
  
  useEffect(() => {
    // Show success toast on page load
    toast.success({
      title: 'Payment Successful!',
      description: 'Thank you for your purchase. Your subscription has been activated.'
    });
    
    // Check subscription status and update if needed
    const checkSubscriptionStatus = async () => {
      setIsVerifying(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsVerifying(false);
          return;
        }
        
        // Check for URL params that might contain payment info
        const urlParams = new URLSearchParams(window.location.search);
        const stripePaymentId = urlParams.get('payment_id');
        
        // Refresh subscription data
        let subscription = await getUserSubscription(user.id);
        console.log('Initial subscription status:', subscription);
        
        // If we have a payment ID but no active subscription, try to create one
        if (stripePaymentId && (!subscription?.isActive)) {
          console.log('Attempting to create subscription for payment:', stripePaymentId);
          const success = await checkAndCreateSubscription(
            user.id, 
            'foundation', 
            stripePaymentId, 
            'subscription'
          );
          
          if (success) {
            console.log('Successfully created subscription from payment ID');
            // Re-fetch the subscription
            subscription = await getUserSubscription(user.id);
          }
        }
        
        if (!subscription?.isActive) {
          toast.info({
            title: 'Subscription Activation Pending',
            description: "We're processing your payment. Your subscription will be activated shortly."
          });
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
      } finally {
        setIsVerifying(false);
      }
    };
    
    checkSubscriptionStatus();
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

          <h1 className="text-2xl font-bold mb-4">Payment Successful!</h1>
          
          <p className="text-gray-600 mb-6">
            Thank you for your purchase. Your subscription has been activated and you now have access to all the features of your plan.
          </p>
          
          <p className="text-gray-600 mb-8">
            You will receive a confirmation email shortly with details of your purchase.
          </p>

          {isVerifying && (
            <p className="text-blue-600 mb-4">
              Verifying your subscription status...
            </p>
          )}

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
