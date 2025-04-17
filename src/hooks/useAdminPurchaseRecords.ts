
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type PurchaseRecord = {
  id: string;
  subscription_id: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_method: 'stripe' | 'invoice' | 'manual';
  payment_status: 'pending' | 'invoice_raised' | 'payment_made' | 'cancelled' | 'refunded';
  invoice_number?: string;
  billing_school_name?: string;
  billing_contact_name?: string;
  billing_contact_email?: string;
  billing_address?: string;
  created_at: string;
  plan_type: string;
  purchase_type: string;
};

export const useAdminPurchaseRecords = () => {
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminCheckComplete, setAdminCheckComplete] = useState<boolean>(false);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // First verify admin status
  useEffect(() => {
    async function checkAdminStatus() {
      try {
        const user = (await supabase.auth.getUser()).data.user;
        
        if (!user) {
          setIsAdmin(false);
          setAdminCheckComplete(true);
          return;
        }
        
        console.log('Checking admin status for user:', user.id);
        
        // Check if the user has admin privileges
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
    }
    
    checkAdminStatus();
  }, []);

  // Then fetch payments data if user is admin
  useEffect(() => {
    if (!adminCheckComplete) return;
    if (!isAdmin) return;
    
    fetchPayments();
  }, [adminCheckComplete, isAdmin, currentPage, pageSize]);

  // Direct query to get all payments with pagination
  const fetchPayments = async () => {
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
        setError(`Failed to fetch payment count: ${countError.message}`);
        return;
      }
      
      setTotalCount(count || 0);
      console.log(`Total payment records: ${count}`);
      
      // Calculate pagination ranges
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      
      // Direct query to the payment_history table with pagination
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
        .range(from, to);
      
      if (error) {
        console.error('Error fetching payment records:', error);
        setError(`Failed to fetch payment data: ${error.message}`);
        return;
      }
      
      console.log(`Successfully fetched ${data?.length || 0} payment records for page ${currentPage}`);
      
      if (!data || data.length === 0) {
        setPurchases([]);
        return;
      }
      
      // Format the data for the UI
      const formattedData = data.map(item => ({
        id: item.id,
        subscription_id: item.subscription_id,
        amount: item.amount,
        currency: item.currency,
        payment_date: item.payment_date,
        payment_method: item.payment_method,
        payment_status: item.payment_status,
        invoice_number: item.invoice_number,
        billing_school_name: item.billing_school_name,
        billing_contact_name: item.billing_contact_name,
        billing_contact_email: item.billing_contact_email,
        billing_address: item.billing_address,
        created_at: item.created_at,
        plan_type: item.subscriptions?.plan_type || 'unknown',
        purchase_type: item.subscriptions?.purchase_type || 'unknown'
      }));
      
      console.log('Formatted purchase data:', formattedData);
      setPurchases(formattedData);
    } catch (err: any) {
      console.error('Critical error in fetchPayments:', err);
      setError(`Failed to load payment data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return { 
    purchases, 
    loading, 
    error, 
    isAdmin, 
    adminCheckComplete, 
    refreshPurchases: fetchPayments,
    totalCount,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize 
  };
};
