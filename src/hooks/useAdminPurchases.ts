
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

export const useAdminPurchases = () => {
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminCheckComplete, setAdminCheckComplete] = useState<boolean>(false);

  // Verify admin status
  useEffect(() => {
    async function checkAdminStatus() {
      try {
        const user = (await supabase.auth.getUser()).data.user;
        
        if (!user) {
          setIsAdmin(false);
          setAdminCheckComplete(true);
          return;
        }
        
        // Check if the user is an admin
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();
        
        if (profileError) {
          console.error('Error checking admin status:', profileError);
          setIsAdmin(false);
        } else {
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

  // Fetch purchases data once admin status is confirmed
  useEffect(() => {
    if (!adminCheckComplete) return;
    if (!isAdmin) return;
    
    fetchPurchases();
  }, [adminCheckComplete, isAdmin]);

  const fetchPurchases = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching purchases data...');
      
      // Direct query to the payment_history table with subscription data joined
      const { data, error } = await supabase
        .from('payment_history')
        .select(`
          *,
          subscriptions:subscription_id (
            plan_type,
            purchase_type
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching purchases:', error);
        setError(`Failed to load purchase data: ${error.message}`);
        return;
      }
      
      console.log('Fetched purchase records:', data?.length || 0);
      
      if (!data || data.length === 0) {
        setPurchases([]);
        return;
      }
      
      // Format the data for display
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
      
      setPurchases(formattedData);
    } catch (err) {
      console.error('Critical error in fetchPurchases:', err);
      setError(`Failed to load purchases data: ${err.message}`);
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
    refreshPurchases: fetchPurchases 
  };
};
