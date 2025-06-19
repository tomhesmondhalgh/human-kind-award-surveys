import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export const usePurchaseUpdater = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { user } = useAuth();

  const updatePurchase = async (purchaseId: string, updates: any) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('payment_history')
        .update(updates)
        .eq('id', purchaseId);

      if (error) {
        console.error('Error updating purchase:', error);
        toast.error('Failed to update purchase');
      } else {
        toast.success('Purchase updated successfully');
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('Unexpected error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  return { isUpdating, updatePurchase };
};
