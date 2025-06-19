import React from 'react';
import PlanCard, { PlanType } from './PlanCard';
import { useSubscription } from '../../hooks/useSubscription';
import { useSubscriptionPlans } from '../../hooks/useSubscriptionPlans';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/use-toast';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
  is_popular: boolean;
  stripe_price_id?: string;
  purchase_type?: string;
  duration_months?: number;
  sort_order: number;
}

interface PricingSectionProps {
  plans: Plan[];
}

const PricingSection: React.FC<PricingSectionProps> = ({ plans }) => {
  const navigate = useNavigate();
  const {
    subscription,
    isLoading: isSubscriptionLoading,
    isFree,
    isFoundation,
    isProgress,
    isPremium
  } = useSubscription();
  
  const {
    formatPrice
  } = useSubscriptionPlans();
  
  const { toast } = useToast();

  const handleUpgrade = async (stripePriceId: string, planType: 'foundation' | 'progress' | 'premium', purchaseType: 'subscription' | 'one-time') => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('supabase.auth.token')}`
        },
        body: JSON.stringify({
          priceId: stripePriceId,
          planType,
          purchaseType,
          successUrl: `${window.location.origin}/dashboard?payment=success`,
          cancelUrl: `${window.location.origin}/improve?payment=cancelled`
        })
      });
      const data = await response.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Error upgrading plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to process your request. Please try again later.',
        variant: 'destructive'
      });
    }
  };

  const getButtonText = (planType: PlanType) => {
    if (planType === 'free' && isFree || planType === 'foundation' && isFoundation || planType === 'progress' && isProgress || planType === 'premium' && isPremium) {
      return 'Your Current Plan';
    }
    if (planType === 'free') {
      return 'Get Started';
    }
    const planLevels = {
      free: 0,
      foundation: 1,
      progress: 2,
      premium: 3
    };
    const currentPlanLevel = isFree ? 0 : isFoundation ? 1 : isProgress ? 2 : isPremium ? 3 : 0;
    const targetPlanLevel = planLevels[planType];
    if (targetPlanLevel > currentPlanLevel) {
      return `Upgrade to ${planType.charAt(0).toUpperCase() + planType.slice(1)}`;
    } else {
      return `Downgrade to ${planType.charAt(0).toUpperCase() + planType.slice(1)}`;
    }
  };

  const getButtonVariant = (planType: PlanType): 'default' | 'outline' => {
    if (planType === 'free' && isFree || planType === 'foundation' && isFoundation || planType === 'progress' && isProgress || planType === 'premium' && isPremium) {
      return 'outline';
    }
    const planLevels = {
      free: 0,
      foundation: 1,
      progress: 2,
      premium: 3
    };
    const currentPlanLevel = isFree ? 0 : isFoundation ? 1 : isProgress ? 2 : isPremium ? 3 : 0;
    const targetPlanLevel = planLevels[planType];
    return targetPlanLevel > currentPlanLevel ? 'default' : 'outline';
  };

  // Show loading state when plans are loading
  if (isSubscriptionLoading) {
    return (
      <div className="mt-12 text-center">
        <h2 className="text-2xl font-bold text-center mb-10 py-[30px]">Loading Plans...</h2>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brandPurple-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold text-center mb-10 py-[30px]">Choose the Right Plan for Your Organisation</h2>
      
      <div className="grid md:grid-cols-4 gap-8">
        {plans.map((plan, index) => {
          const planType = plan.name.toLowerCase() as PlanType;
          const price = formatPrice(plan.price);
          const priceSubtext = plan.price > 0 
            ? `+ VAT (${plan.purchase_type === 'subscription' ? `${plan.duration_months ? plan.duration_months/12 : 3}-year subscription` : 'one-off payment'})`
            : undefined;
          
          // Special case for legacy plan - skip showing it
          if (planType === 'legacy') {
            return null;
          }
          
          return (
            <PlanCard 
              key={index} 
              title={plan.name}
              description={plan.description}
              price={plan.price === 0 ? "Free" : price}
              priceSubtext={priceSubtext}
              features={plan.features.map(feature => ({ text: feature }))}
              planType={planType}
              isPopular={plan.is_popular}
              onButtonClick={() => {
                if (planType === 'free') {
                  navigate('/dashboard');
                } else if (isFree || isSubscriptionLoading || 
                    (planType === 'progress' && isFoundation) || 
                    (planType === 'premium' && (isFoundation || isProgress))) {
                  // Only handle standard plan types, excluding legacy
                  if (planType === 'foundation' || planType === 'progress' || planType === 'premium') {
                    handleUpgrade(plan.stripe_price_id || '', planType, plan.purchase_type || 'subscription');
                  }
                }
              }}
              buttonText={getButtonText(planType)}
              buttonVariant={getButtonVariant(planType)}
              disabled={(planType === 'foundation' && (isFoundation || isProgress || isPremium)) ||
                        (planType === 'progress' && (isProgress || isPremium)) ||
                        (planType === 'premium' && isPremium)}
            />
          );
        }).filter(Boolean)}
      </div>
      
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>
          Need help choosing the right plan? <a href="mailto:support@wellbeingsurvey.com" className="text-brandPurple-600 underline">Contact our support team</a>
          {" | "}
          <button 
            onClick={() => navigate('/upgrade')}
            className="text-brandPurple-600 underline hover:text-brandPurple-700 transition-colors"
          >
            Have a code?
          </button>
        </p>
      </div>
    </div>
  );
};

export default PricingSection;
