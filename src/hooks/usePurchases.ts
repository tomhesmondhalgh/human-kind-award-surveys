
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
      console.log('Fetching ALL purchases data as admin...', { isAdmin });
      console.log('Current user ID:', await supabase.auth.getUser());
      console.log('Is admin parameter:', isAdmin);
      
      // Fetch the current user's profile to verify admin status
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();
      
      console.log('User Profile:', userProfile);
      console.log('Profile Error:', profileError);

      // Verify admin status before attempting to fetch purchases
      if (!userProfile?.is_admin) {
        console.error('User is not an admin');
        setError('User does not have admin privileges');
        setLoading(false);
        return;
      }
      
      // Try the RPC function first
      const { data: functionData, error: functionError } = await supabase
        .rpc('admin_get_all_payments');
      
      console.log('RPC Function Data:', functionData);
      console.log('RPC Function Error:', functionError);

      if (functionError) {
        console.error('Error with admin_get_all_payments function:', functionError);
        setError(`Database function error: ${functionError.message}`);
        
        // If the RPC function fails, try a direct query as a fallback
        const { data: directData, error: directError } = await supabase
          .from('payment_history')
          .select(`
            *,
            subscriptions:subscription_id (
              plan_type,
              purchase_type
            )
          `)
          .order('created_at', { ascending: false });
        
        console.log('Direct Query Data:', directData);
        console.log('Direct Query Error:', directError);

        if (directError) {
          console.error('Error with direct query fallback:', directError);
          setError(`Database query error: ${directError.message}`);
          return;
        }
        
        if (directData && directData.length > 0) {
          const formattedData = directData.map(item => ({
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
          
          console.log('Formatted Purchases:', formattedData);
          setPurchases(formattedData);
          return;
        }
      }
      
      if (functionData && functionData.length > 0) {
        console.log(`Total payments retrieved from RPC: ${functionData.length}`);
        setPurchases(functionData);
      } else {
        console.log('No payment records were found');
        setError('No payment records were found in the database.');
      }
    } catch (error) {
      console.error('Critical error in fetchPurchases:', error);
      setError(`Failed to load ALL purchases data: ${error.message}`);
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
