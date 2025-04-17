
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
      const { data: functionData, error: functionError } = await supabase
        .rpc('admin_get_all_payments');
      
      if (functionError) {
        console.error('Error with admin_get_all_payments function:', functionError);
        setError(`Database function error: ${functionError.message}`);
      }
      
      if (functionData && functionData.length > 0) {
        setPurchases(functionData);
      } else {
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
