
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { PaymentHistoryData } from '@/types/supabase-overrides';

export const usePaymentHistory = (limit = 10) => {
  const [payments, setPayments] = useState<PaymentHistoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const { user } = useAuth();

  useEffect(() => {
    const fetchPayments = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        
        // Query payment_history table with subscription details using direct Supabase client
        const { data, error } = await supabase
          .from('payment_history')
          .select(`
            *,
            subscriptions!inner(
              user_id,
              plan_type,
              purchase_type
            )
          `)
          .eq('subscriptions.user_id', user.id)
          .order('created_at', { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        if (error) {
          throw error;
        }

        // Format the data with proper type checking
        const formattedPayments: PaymentHistoryData[] = (data || []).map((item: any) => ({
          id: item.id,
          subscription_id: item.subscription_id,
          amount: item.amount,
          currency: item.currency || 'GBP',
          payment_method: item.payment_method,
          payment_status: item.payment_status,
          invoice_number: item.invoice_number,
          billing_school_name: item.billing_school_name,
          billing_contact_name: item.billing_contact_name,
          billing_contact_email: item.billing_contact_email,
          billing_address: item.billing_address,
          created_at: item.created_at,
          plan_type: item.subscriptions?.plan_type,
          purchase_type: item.subscriptions?.purchase_type
        }));

        setPayments(formattedPayments);
      } catch (err: any) {
        console.error('Error fetching payments:', err);
        setError(err.message);
        toast.error('Failed to load payment history');
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [user?.id, page, limit]);

  return { payments, loading, error, page, setPage };
};
