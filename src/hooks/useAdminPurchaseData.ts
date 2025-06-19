
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';

export const useAdminPurchaseData = () => {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckComplete, setAdminCheckComplete] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const checkAdminStatus = async () => {
    if (!user) {
      setIsAdmin(false);
      setAdminCheckComplete(true);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } else {
        setIsAdmin(data?.is_admin || false);
      }
    } catch (err) {
      console.error('Unexpected error checking admin status:', err);
      setIsAdmin(false);
    } finally {
      setAdminCheckComplete(true);
    }
  };

  const fetchPurchases = async () => {
    if (!isAdmin) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch all payment history entries
      const { data: payments, error: paymentError } = await supabase
        .from('payment_history')
        .select(`
          *,
          subscription:subscriptions (
            id,
            plan_type
          )
        `)
        .order('created_at', { ascending: false });

      if (paymentError) {
        throw paymentError;
      }

      setPurchases(payments || []);
      setTotalCount((payments || []).length);
    } catch (err) {
      console.error('Error fetching purchases:', err);
      setError(err instanceof Error ? err : new Error('Unknown error loading purchases'));
    } finally {
      setLoading(false);
    }
  };

  const refreshPurchases = () => {
    fetchPurchases();
  };

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    if (adminCheckComplete && isAdmin) {
      fetchPurchases();
    }
  }, [adminCheckComplete, isAdmin]);

  return { 
    purchases, 
    loading, 
    error, 
    isAdmin, 
    adminCheckComplete, 
    refreshPurchases,
    totalCount,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize
  };
};
