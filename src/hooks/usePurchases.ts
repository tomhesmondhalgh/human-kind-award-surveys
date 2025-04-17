
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
      console.log('Current user admin status:', isAdmin);
      
      // Try the RPC function first
      const { data: functionData, error: functionError } = await supabase
        .rpc('admin_get_all_payments');
      
      if (functionError) {
        console.error('Error with admin_get_all_payments function:', functionError);
        setError(`Database function error: ${functionError.message}`);
        
        // If the RPC function fails, try a direct query as a fallback
        console.log('RPC function returned no data');
        console.log('RPC approach failed or returned no data, trying comprehensive direct query...');
        
        // Direct query fallback - this should have the same logic as the RPC function
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
        
        if (directError) {
          console.error('Error with direct query fallback:', directError);
          setError(`Database query error: ${directError.message}`);
          return;
        }
        
        if (directData && directData.length > 0) {
          console.log(`Total payments retrieved from direct query: ${directData.length}`);
          console.log('First payment in direct query:', directData[0]);
          
          // Transform the data to match the expected format
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
          
          setPurchases(formattedData);
          return;
        } else {
          console.log('No payments found in direct query fallback');
        }
      }
      
      if (functionData && functionData.length > 0) {
        console.log(`Total payments retrieved from RPC: ${functionData.length}`);
        console.log('First payment in RPC result:', functionData[0]);
        setPurchases(functionData);
      } else {
        console.log('No payment records were found via RPC');
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
