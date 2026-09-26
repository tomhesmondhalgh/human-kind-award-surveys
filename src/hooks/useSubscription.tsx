import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useTestingMode } from '../contexts/TestingModeContext';
import { useAdminRole } from './useAdminRole';
import { PlanType, SubscriptionAccess, planIncludes } from '../lib/supabase/subscription';
import { fetchUserSubscription, subscriptionQueryKey } from '../services/subscriptionService';

export function useSubscription() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isTestingMode, testingPlan } = useTestingMode();
  const { isAdmin } = useAdminRole();

  // Shared by every component that shows plan-dependent content, so a
  // refresh (after a payment or redeemed code) updates all of them.
  const { data: subscription = null, isLoading } = useQuery({
    queryKey: subscriptionQueryKey(user?.id),
    queryFn: () => fetchUserSubscription(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Only apply testing mode if user is actually an admin (security check)
  const effectiveSubscription: SubscriptionAccess | null = useMemo(
    () => (isTestingMode && testingPlan && isAdmin) ? { plan: testingPlan, isActive: true } : subscription,
    [isTestingMode, testingPlan, isAdmin, subscription]
  );

  const hasAccess = useCallback(async (requiredPlan: PlanType): Promise<boolean> => {
    if (!user) return false;
    const current = effectiveSubscription
      ?? await queryClient.fetchQuery({
        queryKey: subscriptionQueryKey(user.id),
        queryFn: () => fetchUserSubscription(user.id),
        staleTime: 5 * 60 * 1000,
      }).catch(() => null);
    return !!current?.isActive && planIncludes(current.plan, requiredPlan);
  }, [user, effectiveSubscription, queryClient]);

  // Force refresh subscription data
  const refreshSubscription = useCallback(async () => {
    if (!user) return;
    await queryClient.invalidateQueries({ queryKey: subscriptionQueryKey(user.id) });
  }, [user, queryClient]);

  return {
    subscription: effectiveSubscription,
    isLoading: !!user && isLoading,
    hasAccess,
    refreshSubscription,
    isPremium: effectiveSubscription?.plan === 'premium' && effectiveSubscription?.isActive,
    isProgress: effectiveSubscription?.plan === 'progress' && effectiveSubscription?.isActive,
    isFoundation: effectiveSubscription?.plan === 'foundation' && effectiveSubscription?.isActive,
    isLegacy: effectiveSubscription?.plan === 'legacy' && effectiveSubscription?.isActive,
    isFree: effectiveSubscription?.plan === 'free' || !effectiveSubscription?.isActive,
  };
}
