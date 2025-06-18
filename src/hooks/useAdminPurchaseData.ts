
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Purchase } from '../types/purchases';
import { ProfileData, PaymentHistoryData } from '@/types/supabase-overrides';

export type PurchasesQueryParams = {
  page: number;
  pageSize: number;
  searchQuery?: string;
};

export const useAdminPurchaseData = (initialParams?: Partial<PurchasesQueryParams>) => {
  // State for purchase data
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for admin permissions
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminCheckComplete, setAdminCheckComplete] = useState<boolean>(false);
  
  // State for pagination
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(initialParams?.page || 1);
  const [pageSize, setPageSize] = useState<number>(initialParams?.pageSize || 10);

  // State for retry logic
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  
  // Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const user = (await supabase.auth.getUser()).data.user;
        
        if (!user) {
          setIsAdmin(false);
          setAdminCheckComplete(true);
          return;
        }
        
        console.log('Checking admin status for user:', user.id);
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();
        
        if (profileError) {
          console.error('Error checking admin status:', profileError);
          setIsAdmin(false);
        } else {
          console.log('Admin check result:', profile?.is_admin);
          setIsAdmin(!!profile?.is_admin);
        }
      } catch (error) {
        console.error('Error in admin check:', error);
        setIsAdmin(false);
      } finally {
        setAdminCheckComplete(true);
      }
    };
    
    checkAdminStatus();
  }, []);

  // Fetch purchases data with retry logic and proper pagination
  const fetchPurchases = useCallback(async () => {
    if (!isAdmin) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching payment records for page ${currentPage} with pageSize ${pageSize}...`);
      
      // First, get the total count
      const { count, error: countError } = await supabase
        .from('payment_history')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.error('Error fetching payment count:', countError);
        throw new Error(`Failed to fetch payment count: ${countError.message}`);
      }
      
      setTotalCount(count || 0);
      console.log(`Total payment records: ${count}`);
      
      // Calculate pagination ranges
      const from = (currentPage - 1) * pageSize;
      
      // Fetch paginated records with all related data
      const { data, error } = await supabase
        .from('payment_history')
        .select(`
          *,
          subscriptions:subscription_id (
            plan_type,
            purchase_type
          )
        `)
        .order('created_at', { ascending: false })
        .range(from, from + pageSize - 1);
      
      if (error) {
        console.error('Error fetching payment records:', error);
        throw new Error(`Failed to fetch payment data: ${error.message}`);
      }
      
      console.log(`Successfully fetched ${data?.length || 0} payment records for page ${currentPage}`);
      
      if (!data) {
        setPurchases([]);
        return;
      }
      
      // Format the data for the UI with proper type checking
      const formattedData = data.map((item: any) => ({
        id: item.id || '',
        subscription_id: item.subscription_id || '',
        amount: item.amount || 0,
        currency: item.currency || 'GBP',
        payment_method: item.payment_method || 'stripe',
        payment_status: item.payment_status || 'pending',
        invoice_number: item.invoice_number || null,
        billing_school_name: item.billing_school_name || null,
        billing_contact_name: item.billing_contact_name || null,
        billing_contact_email: item.billing_contact_email || null,
        billing_address: item.billing_address || null,
        created_at: item.created_at || '',
        plan_type: item.subscriptions?.plan_type || 'foundation',
        purchase_type: item.subscriptions?.purchase_type || 'subscription'
      }));
      
      setPurchases(formattedData);
      setRetryCount(0); // Reset retry count on success
    } catch (err: any) {
      console.error('Error in fetchPurchases:', err);
      setError(`Failed to load payment data: ${err.message}`);
      
      // Implement retry logic
      if (retryCount < MAX_RETRIES) {
        console.log(`Retrying fetch (${retryCount + 1}/${MAX_RETRIES})...`);
        setRetryCount(prev => prev + 1);
        // Retry after a delay that increases with each retry
        setTimeout(() => fetchPurchases(), 1000 * (retryCount + 1));
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, isAdmin, retryCount]);

  // Fetch purchases when dependencies change or admin check completes
  useEffect(() => {
    if (adminCheckComplete && isAdmin) {
      fetchPurchases();
    }
  }, [adminCheckComplete, isAdmin, currentPage, pageSize, fetchPurchases]);

  return { 
    purchases,
    loading, 
    error, 
    isAdmin, 
    adminCheckComplete, 
    refreshPurchases: fetchPurchases,
    totalCount,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize
  };
};
