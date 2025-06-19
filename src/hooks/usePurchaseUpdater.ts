
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Purchase, PaymentStatus } from '../types/purchases';
import { useAuth } from '../contexts/AuthContext';

interface PurchaseUpdateData {
  invoiceNumber?: string;
  paymentStatus?: PaymentStatus;
  billingSchoolName?: string;
  billingContactName?: string;
  billingContactEmail?: string;
}

export function usePurchaseUpdater() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const updatePurchase = async (purchase: Purchase, updateData: PurchaseUpdateData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      console.log('Updating purchase record:', purchase.id, updateData);
      
      // First, update the billing information directly
      const { error: billingError } = await supabase
        .from('payment_history')
        .update({
          billing_school_name: updateData.billingSchoolName,
          billing_contact_name: updateData.billingContactName,
          billing_contact_email: updateData.billingContactEmail
        })
        .eq('id', purchase.id);

      if (billingError) {
        console.error('Error updating billing information:', billingError);
        throw new Error(`Failed to update billing information: ${billingError.message}`);
      }

      // If payment status or invoice number needs updating, call the edge function
      if (updateData.paymentStatus || updateData.invoiceNumber) {
        const { data, error: functionError } = await supabase.functions.invoke('update-invoice-status', {
          body: {
            paymentId: purchase.id,
            status: updateData.paymentStatus,
            invoiceNumber: updateData.invoiceNumber,
            adminUserId: user?.id || 'unknown'
          }
        });

        if (functionError) {
          console.error('Edge function error:', functionError);
          throw new Error(`Failed to update payment status: ${functionError.message}`);
        }

        console.log('Update response from edge function:', data);
      }
      
      toast.success("Payment record updated successfully");
      return true;
    } catch (err: any) {
      console.error('Error in updatePurchase:', err);
      setError(`An error occurred: ${err.message}`);
      toast.error('Failed to update payment record');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    updatePurchase,
    isSubmitting,
    error,
    setError
  };
}
