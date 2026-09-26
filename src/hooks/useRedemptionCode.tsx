
import { useState } from 'react';
import { verifyRedemptionCode } from '../services/redemptionCodeService';
import { useSubscription } from './useSubscription';
import { toast } from 'sonner';

export function useRedemptionCode() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshSubscription } = useSubscription();
  
  const redeemCode = async (code: string): Promise<boolean> => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await verifyRedemptionCode(code);
      
      if (!result.success) {
        setError(result.message);
        toast.error('Error', { description: result.message });
        return false;
      }
      
      // Refresh subscription data since we've just added a new subscription
      await refreshSubscription();
      
      toast.success('Success', { description: `Code redeemed successfully! You now have access to the ${result.planType?.toUpperCase()} plan.` });
      
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to redeem code';
      setError(message);
      toast.error('Error', { description: message });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };
  
  return {
    redeemCode,
    isProcessing,
    error
  };
}
