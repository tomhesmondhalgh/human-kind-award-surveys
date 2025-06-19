import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';

export const useAdminPurchaseData = () => {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPurchases = async () => {
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
      } catch (err) {
        console.error('Error fetching purchases:', err);
        setError(err instanceof Error ? err : new Error('Unknown error loading purchases'));
      } finally {
        setLoading(false);
      }
    };

    fetchPurchases();
  }, [user]);

  return { purchases, loading, error };
};

