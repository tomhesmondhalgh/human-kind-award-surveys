
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export const usePurchaseUpdater = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const updatePurchase = async (purchaseId: string, updates: any) => {
    setIsUpdating(true);
    setError(null);
    
    try {
      const { error } = await supabase
        .from('payment_history')
        .update(updates)
        .eq('id', purchaseId);

      if (error) {
        console.error('Error updating purchase:', error);
        setError('Failed to update purchase');
        toast.error('Failed to update purchase');
        return false;
      } else {
        toast.success('Purchase updated successfully');
        return true;
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setError('Unexpected error occurred');
      toast.error('Unexpected error occurred');
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  return { 
    isUpdating, 
    isSubmitting: isUpdating, 
    error, 
    setError, 
    updatePurchase 
  };
};
