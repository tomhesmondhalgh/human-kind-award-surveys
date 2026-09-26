
import { supabase } from '@/integrations/supabase/client';
import { getCacheItem, setCacheItem, clearCacheItem } from '@/utils/cache/cacheUtils';

// Cache expiry time (5 minutes)
const CACHE_EXPIRY = 5 * 60;

/**
 * Check if a user is authenticated
 * Uses caching to minimize API requests
 */
export async function checkAuthentication(): Promise<boolean> {
  // Check cache first
  const cacheKey = 'auth_status';
  const cachedStatus = getCacheItem<boolean>(cacheKey);
  
  if (cachedStatus !== null) {
    return cachedStatus;
  }
  
  // Cache miss, check authentication status
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
    
    const isAuthenticated = !!user;
    
    // Update cache
    setCacheItem(cacheKey, isAuthenticated, CACHE_EXPIRY);
    
    return isAuthenticated;
  } catch (error) {
    console.error('Error in authentication check:', error);
    return false;
  }
}

/**
 * Clear authentication cache
 */
export function clearAuthCache() {
  clearCacheItem('auth_status');
}

/**
 * Check if current user can access a survey resource
 */
export async function isResourceOwner(resourceId: string): Promise<boolean> {
  try {
    // Get the current user
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return false;
    }
    
    const cacheKey = `resource_owner_${user.id}_${resourceId}`;
    const cachedResult = getCacheItem<boolean>(cacheKey);
    
    if (cachedResult !== null) {
      return cachedResult;
    }
    
    // Query for the resource and check organization membership
    const { data, error: resourceError } = await supabase
      .from('survey_templates')
      .select('organization_id')
      .eq('id', resourceId)
      .single();
    
    if (resourceError || !data) {
      return false;
    }
    
    // Check if the user is a member of the organization that owns this resource
    const { data: membershipData, error: membershipError } = await supabase
      .from('organization_memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', data.organization_id)
      .single();
    
    if (membershipError || !membershipData) {
      return false;
    }
    
    // User has access if they're a member of the organization
    const hasAccess = !!membershipData;
    
    // Cache the result
    setCacheItem(cacheKey, hasAccess, CACHE_EXPIRY);
    
    return hasAccess;
  } catch (error) {
    console.error('Error checking resource ownership:', error);
    return false;
  }
}
