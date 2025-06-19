import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { useSubscriptionPlans } from '../hooks/useSubscriptionPlans';
import IntroSection from '../components/improve/IntroSection';
import BenefitsSection from '../components/improve/BenefitsSection';
import PricingSection from '../components/improve/PricingSection';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

const Improve: React.FC = () => {
  const { user } = useAuth();
  const { subscription, isLoading: subscriptionLoading } = useSubscription();
  const { plans, isLoading: plansLoading, error } = useSubscriptionPlans();

  if (subscriptionLoading || plansLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading subscription information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {errorMessage}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto py-12">
        <IntroSection />
        <BenefitsSection />
        {plans && <PricingSection plans={plans} />}
      </div>
    </div>
  );
};

export default Improve;
