
import { supabase } from '@/integrations/supabase/client';
import { PlanType, SubscriptionAccess } from '@/lib/supabase/subscription';
import { getCacheItem, setCacheItem, clearCacheItem } from '@/utils/cache/cacheUtils';

// Cache expiry time (5 minutes)
const CACHE_EXPIRY = 5 * 60;

/**
 * Get user subscription data with caching
 */
export async function getUserSubscription(userId: string): Promise<SubscriptionAccess | null> {
  if (!userId) return null;
  
  // Check cache first
  const cacheKey = `subscription_${userId}`;
  const cachedData = getCacheItem<SubscriptionAccess>(cacheKey);
  
  if (cachedData) {
    return cachedData;
  }
  
  // Cache miss, fetch from database
  try {
    const { data, error } = await supabase
      .rpc('get_user_subscription', { user_uuid: userId });

    if (error) {
      console.error('Error fetching subscription:', error);
      return null;
    }

    const subscription = !data || data.length === 0 
      ? { plan: 'free' as PlanType, isActive: false } 
      : { 
          plan: data[0].plan as PlanType, 
          isActive: data[0].is_active 
        };
    
    // Update cache
    setCacheItem(cacheKey, subscription, CACHE_EXPIRY);
    
    return subscription;
  } catch (error) {
    console.error('Error in getUserSubscription:', error);
    return null;
  }
}

/**
 * Optimized batch fetch for multiple user subscriptions
 * Uses the Edge Function for better performance with large batches
 */
export async function batchGetUserSubscriptions(userIds: string[]): Promise<Record<string, SubscriptionAccess | null>> {
  if (!userIds.length) return {};
  
  const result: Record<string, SubscriptionAccess | null> = {};
  const idsToFetch: string[] = [];
  
  // First check cache for each user ID
  userIds.forEach(userId => {
    const cacheKey = `subscription_${userId}`;
    const cachedData = getCacheItem<SubscriptionAccess>(cacheKey);
    
    if (cachedData) {
      result[userId] = cachedData;
    } else {
      idsToFetch.push(userId);
    }
  });
  
  // If all IDs were in cache, return immediately
  if (idsToFetch.length === 0) {
    return result;
  }
  
  try {
    if (idsToFetch.length === 1) {
      // For single ID, use regular function
      const subscription = await getUserSubscription(idsToFetch[0]);
      result[idsToFetch[0]] = subscription;
      return result;
    }
    
    // For multiple IDs, use the Edge Function which supports batching
    const { data: response, error } = await supabase.functions.invoke('check-subscription', {
      body: { userIds: idsToFetch.join(',') }
    });
    
    if (error) {
      console.error('Error in batch subscription check:', error);
      // Fall back to individual requests
      await Promise.all(idsToFetch.map(async (id) => {
        const sub = await getUserSubscription(id);
        result[id] = sub;
      }));
      return result;
    }
    
    // Process the response and update cache
    for (const userId in response) {
      const subData = response[userId];
      const subscription: SubscriptionAccess = {
        plan: subData.plan as PlanType,
        isActive: subData.hasActiveSubscription
      };
      
      // Update cache
      const cacheKey = `subscription_${userId}`;
      setCacheItem(cacheKey, subscription, CACHE_EXPIRY);
      
      result[userId] = subscription;
    }
    
    // For any IDs not in the response, set as free
    idsToFetch.forEach(id => {
      if (!result[id]) {
        const defaultSub = { plan: 'free' as PlanType, isActive: false };
        result[id] = defaultSub;
        
        // Cache this result too
        const cacheKey = `subscription_${id}`;
        setCacheItem(cacheKey, defaultSub, CACHE_EXPIRY);
      }
    });
    
    return result;
  } catch (error) {
    console.error('Error in batchGetUserSubscriptions:', error);
    
    // Fall back to individual requests for any IDs that failed
    await Promise.all(idsToFetch.filter(id => !result[id]).map(async (id) => {
      const sub = await getUserSubscription(id);
      result[id] = sub;
    }));
    
    return result;
  }
}

/**
 * Check if user has access to a specific plan level with caching
 */
export async function checkPlanAccess(userId: string, requiredPlan: PlanType): Promise<boolean> {
  if (!userId) return false;
  
  try {
    // Get cached subscription first if available
    const subscription = await getUserSubscription(userId);
    if (!subscription) return false;
    
    // Compare plan levels
    const planLevels: Record<PlanType, number> = {
      free: 0,
      foundation: 1,
      progress: 2,
      premium: 3,
      enterprise: 4
    };
    
    const userPlanLevel = subscription.isActive ? planLevels[subscription.plan] : 0;
    const requiredPlanLevel = planLevels[requiredPlan];
    
    return userPlanLevel >= requiredPlanLevel;
  } catch (error) {
    console.error('Error in checkPlanAccess:', error);
    return false;
  }
}

/**
 * Clear subscription cache for a specific user or all users
 */
export function clearSubscriptionCache(userId?: string) {
  if (userId) {
    clearCacheItem(`subscription_${userId}`);
  } else {
    // Clear all subscription items from cache
    clearCacheItem('subscription_');
  }
}

/**
 * Force refresh the subscription data for a user
 */
export async function refreshUserSubscription(userId: string): Promise<SubscriptionAccess | null> {
  if (userId) {
    // Remove from cache to force a refresh
    clearCacheItem(`subscription_${userId}`);
    // Fetch fresh data
    return getUserSubscription(userId);
  }
  return null;
}
