
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Create a simple in-memory cache to store admin status
// This is shared across all instances of the hook
const adminStatusCache: Record<string, {
  isAdmin: boolean,
  timestamp: number,
  expiresAt: number
}> = {};

// Cache expiry time in milliseconds (5 minutes)
const CACHE_EXPIRY = 5 * 60 * 1000;

export function useAdminRole() {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Clear cache for a specific user
  const clearCache = useCallback((userId: string) => {
    if (adminStatusCache[userId]) {
      delete adminStatusCache[userId];
    }
  }, []);

  // Function to check if user has admin role with caching
  const checkAdminRole = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    try {
      // Check cache if not in testing mode
      const now = Date.now();
      const cachedData = adminStatusCache[user.id];
      
      if (cachedData && now < cachedData.expiresAt) {
        console.log('Using cached admin status for user:', user.id);
        setIsAdmin(cachedData.isAdmin);
        setIsLoading(false);
        return;
      }

      console.log('Fetching fresh admin status for user:', user.id);
      setIsLoading(true);
      
      // Query the profiles table to check if the user has admin status
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } else {
        const isUserAdmin = data?.is_admin === true;
        console.log('Admin status from database:', isUserAdmin);
        setIsAdmin(isUserAdmin);
        
        // Update cache
        adminStatusCache[user.id] = {
          isAdmin: isUserAdmin,
          timestamp: now,
          expiresAt: now + CACHE_EXPIRY
        };
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
