
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Purchase } from '../components/admin/PurchasesManagement';

export const usePurchases = (isAdmin: boolean) => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPurchases = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching purchases data as admin...', { isAdmin });
      
      // Verify admin status before proceeding
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();
      
      console.log('User Profile:', userProfile);
      
      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        setError('Failed to verify admin permissions');
        setLoading(false);
        return;
      }

      if (!userProfile?.is_admin) {
        console.error('User is not an admin');
        setError('User does not have admin privileges');
        setLoading(false);
        return;
      }
      
      // Fetch payment history directly
      const { data: paymentData, error: paymentError } = await supabase
        .from('payment_history')
        .select(`
          *,
          subscriptions:subscription_id (
            plan_type,
            purchase_type
          )
        `)
        .order('created_at', { ascending: false });
      
      if (paymentError) {
        console.error('Error fetching payment history:', paymentError);
        setError(`Failed to load payment data: ${paymentError.message}`);
        setLoading(false);
        return;
      }
      
      console.log('Payment data retrieved:', paymentData?.length || 0, 'records');
      
      if (!paymentData || paymentData.length === 0) {
        console.log('No payment records found');
        setPurchases([]);
        setLoading(false);
        return;
      }
      
      // Format the data for display
      const formattedData = paymentData.map(item => ({
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
      
      console.log('Formatted purchases data:', formattedData);
      setPurchases(formattedData);
      
    } catch (error) {
      console.error('Critical error in fetchPurchases:', error);
      setError(`Failed to load purchases data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchPurchases();
    }
  }, [isAdmin]);

  return { purchases, loading, error, fetchPurchases };
};
