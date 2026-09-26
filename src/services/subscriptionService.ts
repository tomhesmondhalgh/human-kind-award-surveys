import { supabase } from '@/integrations/supabase/client';
import { PlanType, SubscriptionAccess } from '@/lib/supabase/subscription';

// React Query key for a user's subscription. useSubscription caches it for
// five minutes; invalidate it after anything that changes the plan.
export const subscriptionQueryKey = (userId: string | undefined) => ['subscription', userId] as const;

/**
 * Fetch a user's current plan. Users without a subscription are on the free
 * plan.
 */
export async function fetchUserSubscription(userId: string): Promise<SubscriptionAccess> {
  const { data, error } = await supabase.rpc('get_user_subscription', { user_uuid: userId });
  if (error) throw error;

  if (!data || data.length === 0) {
    return { plan: 'free', isActive: false };
  }
  return { plan: data[0].plan as PlanType, isActive: data[0].is_active };
}
