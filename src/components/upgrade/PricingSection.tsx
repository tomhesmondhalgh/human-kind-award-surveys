import React, { useState, useEffect } from 'react';
import PlanCard, { PlanType } from './PlanCard';
import { useSubscription } from '../../hooks/useSubscription';
import { useSubscriptionPlans } from '../../hooks/useSubscriptionPlans';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import RedemptionCodeDialog from './RedemptionCodeDialog';

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  schoolName: string;
  schoolAddress: string;
}

interface InvoiceDetails {
  schoolName: string;
  address: string;
  contactName: string;
  contactEmail: string;
  purchaseOrderNumber?: string;
  additionalInformation?: string;
}

const PricingSection: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showRedemptionDialog, setShowRedemptionDialog] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<{type: 'foundation' | 'progress' | 'premium', purchaseType: 'subscription' | 'one-time'} | null>(null);
  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetails>({
    schoolName: '',
    address: '',
    contactName: '',
    contactEmail: '',
    purchaseOrderNumber: '',
    additionalInformation: ''
  });

  const {
    subscription,
    isLoading: isSubscriptionLoading,
    isFree,
    isFoundation,
    isProgress,
    isPremium,
    isLegacy
  } = useSubscription();
  
  const {
    plans,
    isLoading: isPlansLoading,
    formatPrice
  } = useSubscriptionPlans();
  
  const { toast } = useToast();

  const cleanupDialogState = () => {
    setShowInvoiceDialog(false);
    setIsProcessing(false);
    setCurrentPlan(null);
    
    document.body.style.overflow = '';
    document.body.style.pointerEvents = '';
    document.body.removeAttribute('aria-hidden');
  };

  useEffect(() => {
    cleanupDialogState();
    
    return () => {
      cleanupDialogState();
    };
  }, [location.pathname]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('payment') === 'cancelled') {
      cleanupDialogState();
      toast({
        title: 'Payment Cancelled',
        description: 'Your payment process was cancelled.',
        variant: 'default',
      });
      navigate('/upgrade', { replace: true });
    } else if (params.get('payment') === 'success' || params.get('payment') === 'invoice-requested') {
      cleanupDialogState();
      navigate('/upgrade', { replace: true });
    }
  }, [location.search, toast, navigate]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name, last_name, school_name, school_address')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error('Error fetching user profile:', error);
          return;
        }
        
        if (data) {
          setUserProfile({
            firstName: data.first_name || '',
            lastName: data.last_name || '',
            email: user.email || '',
            schoolName: data.school_name || '',
            schoolAddress: data.school_address || ''
          });

          setInvoiceDetails({
            schoolName: data.school_name || '',
            address: data.school_address || '',
            contactName: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
            contactEmail: user.email || '',
            purchaseOrderNumber: '',
            additionalInformation: ''
          });
        }
      } catch (error) {
        console.error('Error in fetchUserProfile:', error);
      }
    };
    
    fetchUserProfile();
  }, [user]);

  const handleUpgrade = async (stripePriceId: string, planType: 'foundation' | 'progress' | 'premium', purchaseType: 'subscription' | 'one-time') => {
    try {
      if (isProcessing) {
        console.log('Already processing a payment request, please wait...');
        return;
      }
      
      setIsProcessing(true);
      
      console.log('Initiating upgrade process:', {
        stripePriceId,
        planType,
        purchaseType,
        userProfile
      });

      toast({
        title: 'Processing',
        description: 'Preparing your payment session...',
      });

      const { data, error } = await supabase.functions.invoke('create-payment-session', {
        body: {
          priceId: stripePriceId,
          planType,
          purchaseType,
          successUrl: `${window.location.origin}/dashboard?payment=success`,
          cancelUrl: `${window.location.origin}/upgrade?payment=cancelled`,
          billingDetails: {
            schoolName: userProfile?.schoolName || '',
            address: userProfile?.schoolAddress || '',
            contactName: `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim(),
            contactEmail: userProfile?.email || ''
          }
        }
      });

      console.log('Payment session response:', { data, error });

      if (error) {
        console.error('Error creating payment session:', error);
        toast({
          title: 'Error',
          description: `Failed to create payment session: ${error.message || 'Unknown error'}`,
          variant: 'destructive'
        });
        setIsProcessing(false);
        throw error;
      }

      if (data?.url) {
        console.log('Redirecting to payment URL:', data.url);
        window.location.href = data.url;
      } else {
        console.error('No checkout URL returned:', data);
        toast({
          title: 'Error',
          description: 'No payment URL was returned. Please try again later.',
          variant: 'destructive'
        });
        setIsProcessing(false);
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Error upgrading plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to process your request. Please try again later.',
        variant: 'destructive'
      });
      setIsProcessing(false);
    }
  };

  const openInvoiceDialog = (planType: 'foundation' | 'progress' | 'premium', purchaseType: 'subscription' | 'one-time') => {
    cleanupDialogState();
    setCurrentPlan({ type: planType, purchaseType });
    setShowInvoiceDialog(true);
  };

  const handleInvoiceRequest = async () => {
    if (!currentPlan || !user) {
      toast({
        title: 'Error',
        description: 'Missing plan information or user data',
        variant: 'destructive'
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('update-invoice-status', {
        body: {
          planType: currentPlan.type,
          purchaseType: currentPlan.purchaseType,
          billingDetails: {
            schoolName: invoiceDetails.schoolName,
            address: invoiceDetails.address,
            contactName: invoiceDetails.contactName,
            contactEmail: invoiceDetails.contactEmail,
            purchaseOrderNumber: invoiceDetails.purchaseOrderNumber,
            additionalInformation: invoiceDetails.additionalInformation
          }
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Success',
        description: 'Your invoice request has been submitted. Our team will contact you shortly.',
      });

      setShowInvoiceDialog(false);
      navigate('/dashboard?payment=invoice-requested');
    } catch (error) {
      console.error('Error requesting invoice:', error);
      toast({
        title: 'Error',
        description: 'Failed to process your invoice request. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setTimeout(() => {
        cleanupDialogState();
      }, 150);
    }
  };

  const getButtonText = (planType: PlanType) => {
    if (planType === 'free' && isFree || 
        planType === 'foundation' && (isFoundation || isLegacy) || 
        planType === 'progress' && isProgress || 
        planType === 'premium' && isPremium) {
      return 'Your Current Plan';
    }

    const planLevels = {
      free: 0,
      foundation: 1,
      legacy: 1,
      progress: 2,
      premium: 3
    };
    const currentPlanLevel = isFree ? 0 : (isFoundation || isLegacy) ? 1 : isProgress ? 2 : isPremium ? 3 : 0;
    const targetPlanLevel = planLevels[planType];
    
    if (targetPlanLevel < currentPlanLevel) {
      return 'Contact to Downgrade';
    }
    
    if (planType === 'free') {
      return 'Get Started';
    }
    
    return `Upgrade to ${planType.charAt(0).toUpperCase() + planType.slice(1)}`;
  };

  const getButtonVariant = (planType: PlanType): 'default' | 'outline' => {
    if (planType === 'free' && isFree || 
        planType === 'foundation' && (isFoundation || isLegacy) || 
        planType === 'progress' && isProgress || 
        planType === 'premium' && isPremium) {
      return 'outline';
    }
    const planLevels = {
      free: 0,
      foundation: 1,
      legacy: 1,
      progress: 2,
      premium: 3
    };
    const currentPlanLevel = isFree ? 0 : (isFoundation || isLegacy) ? 1 : isProgress ? 2 : isPremium ? 3 : 0;
    const targetPlanLevel = planLevels[planType];
    return targetPlanLevel > currentPlanLevel ? 'default' : 'outline';
  };

  const handleButtonClick = (planType: PlanType, onButtonClick: () => void) => {
    const planLevels = {
      free: 0,
      foundation: 1,
      legacy: 1,
      progress: 2,
      premium: 3
    };
    const currentPlanLevel = isFree ? 0 : (isFoundation || isLegacy) ? 1 : isProgress ? 2 : isPremium ? 3 : 0;
    const targetPlanLevel = planLevels[planType];
    
    if (targetPlanLevel < currentPlanLevel) {
      window.location.href = 'mailto:happytohelp@humankindaward.com?subject=Plan Downgrade Request';
      return;
    }
    
    onButtonClick();
  };

  if (isPlansLoading || isSubscriptionLoading) {
    return (
      <div className="mt-12 text-center">
        <h2 className="text-2xl font-bold mb-10 py-[30px]">Loading Plans...</h2>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brandPurple-600"></div>
        </div>
      </div>
    );
  }

  // Filter out legacy plans from the main display
  const displayPlans = plans
    .filter(plan => plan.name.toLowerCase() !== 'legacy')
    .map(plan => {
      const planType = plan.name.toLowerCase() as PlanType;
      const price = formatPrice(plan.price);
      const priceSubtext = plan.price > 0 
        ? `+ VAT (${plan.purchase_type === 'subscription' ? `${plan.duration_months ? plan.duration_months/12 : 3}-year subscription` : 'one-off payment'})`
        : undefined;
      
      const isPaidPlan = planType !== 'free';
      const upgradePlanType = isPaidPlan ? planType as 'foundation' | 'progress' | 'premium' : 'foundation';
      
      return {
        title: plan.name,
        description: plan.description,
        price: plan.price === 0 ? "Free" : price,
        priceSubtext,
        features: plan.features.map(feature => ({ text: feature })),
        planType,
        isPopular: plan.is_popular,
        onButtonClick: () => handleButtonClick(planType, () => {
          if (planType === 'free') {
            navigate('/dashboard');
          } else if (isFree || isSubscriptionLoading || 
              (planType === 'progress' && isFoundation) || 
              (planType === 'premium' && (isFoundation || isProgress))) {
            handleUpgrade(plan.stripe_price_id || '', upgradePlanType, plan.purchase_type || 'subscription');
          }
        }),
        buttonText: getButtonText(planType),
        buttonVariant: getButtonVariant(planType),
        disabled: (planType === 'foundation' && (isFoundation || isProgress || isPremium)) ||
                  (planType === 'progress' && (isProgress || isPremium)) ||
                  (planType === 'premium' && isPremium),
        hasInvoiceOption: planType !== 'free',
        onCardPayment: () => isPaidPlan ? 
          handleUpgrade(plan.stripe_price_id || '', upgradePlanType, plan.purchase_type || 'subscription') : 
          navigate('/dashboard'),
        onInvoiceRequest: () => isPaidPlan ? 
          openInvoiceDialog(upgradePlanType, plan.purchase_type || 'subscription') : 
          null
      };
    });

  displayPlans.sort((a, b) => {
    const aOrder = plans.find(p => p.name.toLowerCase() === a.planType)?.sort_order || 0;
    const bOrder = plans.find(p => p.name.toLowerCase() === b.planType)?.sort_order || 0;
    return aOrder - bOrder;
  });

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold text-center mb-10 py-[30px]">Choose the Right Plan for Your Organisation</h2>
      
      <div className="grid md:grid-cols-4 gap-8">
        {displayPlans.map((plan, index) => (
          <PlanCard 
            key={index} 
            {...plan} 
            disabled={plan.disabled || isProcessing} 
            hasInvoiceOption={plan.hasInvoiceOption}
            onInvoiceRequest={plan.hasInvoiceOption ? plan.onInvoiceRequest : undefined}
            onCardPayment={plan.hasInvoiceOption ? plan.onCardPayment : undefined}
          />
        ))}
      </div>
      
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>
          Need help choosing the right plan? <a href="mailto:contact@humankindaward.com" className="text-brandPurple-600 underline">Contact our support team</a>
          {" | "}
          <button 
            onClick={() => setShowRedemptionDialog(true)}
            className="text-brandPurple-600 underline hover:text-brandPurple-700 transition-colors"
          >
            Have a code?
          </button>
        </p>
      </div>

      <RedemptionCodeDialog 
        open={showRedemptionDialog} 
        onOpenChange={setShowRedemptionDialog} 
      />

      {showInvoiceDialog && (
        <Dialog 
          open={showInvoiceDialog} 
          onOpenChange={handleDialogClose}
        >
          <DialogContent 
            className="sm:max-w-[600px]"
            onEscapeKeyDown={() => handleDialogClose(false)}
            onInteractOutside={() => handleDialogClose(false)}
            onPointerDownOutside={() => handleDialogClose(false)}
          >
            <DialogHeader>
              <DialogTitle>Request Invoice Payment</DialogTitle>
              <DialogDescription>
                Fill in your billing details below to request payment by invoice.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="schoolName">School/Organisation Name</Label>
                  <Input
                    id="schoolName"
                    value={invoiceDetails.schoolName}
                    onChange={(e) => setInvoiceDetails({...invoiceDetails, schoolName: e.target.value})}
                    className="mt-1"
                    required
                  />
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="address">Billing Address</Label>
                  <Textarea
                    id="address"
                    value={invoiceDetails.address}
                    onChange={(e) => setInvoiceDetails({...invoiceDetails, address: e.target.value})}
                    className="mt-1"
                    rows={3}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="contactName">Contact Name</Label>
                  <Input
                    id="contactName"
                    value={invoiceDetails.contactName}
                    onChange={(e) => setInvoiceDetails({...invoiceDetails, contactName: e.target.value})}
                    className="mt-1"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={invoiceDetails.contactEmail}
                    onChange={(e) => setInvoiceDetails({...invoiceDetails, contactEmail: e.target.value})}
                    className="mt-1"
                    required
                  />
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="purchaseOrderNumber">Purchase Order Number (optional)</Label>
                  <Input
                    id="purchaseOrderNumber"
                    value={invoiceDetails.purchaseOrderNumber}
                    onChange={(e) => setInvoiceDetails({...invoiceDetails, purchaseOrderNumber: e.target.value})}
                    className="mt-1"
                  />
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="additionalInformation">Additional Information (optional)</Label>
                  <Textarea
                    id="additionalInformation"
                    value={invoiceDetails.additionalInformation}
                    onChange={(e) => setInvoiceDetails({...invoiceDetails, additionalInformation: e.target.value})}
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-4">
              <Button
                variant="outline"
                onClick={() => handleDialogClose(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleInvoiceRequest}
                disabled={isProcessing || !invoiceDetails.schoolName || !invoiceDetails.address || !invoiceDetails.contactName || !invoiceDetails.contactEmail}
              >
                {isProcessing ? 'Processing...' : 'Request Invoice'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default PricingSection;
