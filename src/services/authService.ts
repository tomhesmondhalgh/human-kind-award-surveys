
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
 * Check if current user is the owner of a resource
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
    
    // Query for the resource
    const { data, error: resourceError } = await supabase
      .from('survey_templates')
      .select('creator_id')
      .eq('id', resourceId)
      .single();
    
    if (resourceError || !data) {
      return false;
    }
    
    // Check if the user is the owner
    const isOwner = data.creator_id === user.id;
    
    // Cache the result
    setCacheItem(cacheKey, isOwner, CACHE_EXPIRY);
    
    return isOwner;
  } catch (error) {
    console.error('Error checking resource ownership:', error);
    return false;
  }
}
