
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTestingMode } from '../contexts/TestingModeContext';
import { useAdminRole } from './useAdminRole';
import { PlanType, SubscriptionAccess } from '../lib/supabase/subscription';
import { getUserSubscription, checkPlanAccess, refreshUserSubscription } from '../services/subscriptionService';

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionAccess | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { isTestingMode, testingPlan } = useTestingMode();
  const { isAdmin } = useAdminRole();

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    try {
      const userSubscription = await getUserSubscription(user.id);
      setSubscription(userSubscription);
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Only apply testing mode if user is actually an admin (security check)
  const effectiveSubscription = (isTestingMode && testingPlan && isAdmin) ? {
    plan: testingPlan,
    isActive: true
  } : subscription;

  const hasAccess = useCallback(async (requiredPlan: PlanType): Promise<boolean> => {
    if (!user) return false;
    // Only allow testing mode access if user is admin
    if (isTestingMode && testingPlan && isAdmin) {
      const planLevels = { free: 0, foundation: 1, legacy: 1, progress: 2, premium: 3 };
      return planLevels[testingPlan] >= planLevels[requiredPlan];
    }
    return checkPlanAccess(user.id, requiredPlan);
  }, [user, isTestingMode, testingPlan, isAdmin]);

  // Force refresh subscription data
  const refreshSubscription = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const refreshedSubscription = await refreshUserSubscription(user.id);
      setSubscription(refreshedSubscription);
    } catch (error) {
      console.error('Error refreshing subscription data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return {
    subscription: effectiveSubscription,
    isLoading,
    hasAccess,
    refreshSubscription,
    isPremium: effectiveSubscription?.plan === 'premium' && effectiveSubscription?.isActive,
    isProgress: effectiveSubscription?.plan === 'progress' && effectiveSubscription?.isActive,
    isFoundation: effectiveSubscription?.plan === 'foundation' && effectiveSubscription?.isActive,
    isLegacy: effectiveSubscription?.plan === 'legacy' && effectiveSubscription?.isActive,
    isFree: effectiveSubscription?.plan === 'free' || !effectiveSubscription?.isActive,
  };
}
