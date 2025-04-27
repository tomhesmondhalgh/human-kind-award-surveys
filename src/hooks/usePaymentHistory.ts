
import { useState, useEffect } from 'react';
import { getPaymentHistoryOptimized } from '@/utils/db/queryOptimizer';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const usePaymentHistory = (limit = 10) => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const { user } = useAuth();

  useEffect(() => {
    const fetchPayments = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const data = await getPaymentHistoryOptimized(user.id, limit, page);
        setPayments(data);
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
