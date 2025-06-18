
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getCacheItem, setCacheItem, clearCacheItem } from '@/utils/cache/cacheUtils';
import { queryTable } from '@/utils/supabaseHelpers';
import { ProfileData } from '@/types/supabase-overrides';

// Cache expiry time in seconds (5 minutes)
const CACHE_EXPIRY = 5 * 60;

export function useAdminRole() {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Clear cache for a specific user
  const clearCache = useCallback((userId: string) => {
    clearCacheItem(`admin_status_${userId}`);
  }, []);

  // Function to check if user has admin role with caching
  const checkAdminRole = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    try {
      // Check cache first
      const cacheKey = `admin_status_${user.id}`;
      const cachedStatus = getCacheItem<boolean>(cacheKey);
      
      if (cachedStatus !== null) {
        console.log('Using cached admin status for user:', user.id);
        setIsAdmin(cachedStatus);
        setIsLoading(false);
        return;
      }

      console.log('Fetching fresh admin status for user:', user.id);
      setIsLoading(true);
      
      // Query the profiles table to check if the user has admin status
      const { data, error } = await queryTable<ProfileData>(
        'profiles',
        'is_admin',
        { id: user.id as any }
      );
      
      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } else {
        // Safe property access with type checking
        const isUserAdmin = data && data.length > 0 && data[0] && 
          typeof data[0] === 'object' && 'is_admin' in data[0] 
          ? !!data[0].is_admin 
          : false;
        console.log('Admin status from database:', isUserAdmin);
        setIsAdmin(isUserAdmin);
        
        // Update cache
        setCacheItem(cacheKey, isUserAdmin, CACHE_EXPIRY);
      }
      
    } catch (error) {
      console.error('Error in admin role check:', error);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkAdminRole();
  }, [user, checkAdminRole]);

  // Expose method to force refresh the admin status
  const refreshAdminStatus = useCallback(() => {
    if (user) {
      clearCache(user.id);
      checkAdminRole();
    }
  }, [user, clearCache, checkAdminRole]);

  return { 
    isAdmin, 
    isLoading,
    refreshAdminStatus
  };
}
