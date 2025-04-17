
import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { PurchaseRecord } from '../../hooks/useAdminPurchases';

interface UpdatePurchaseDialogProps {
  open: boolean;
  onClose: () => void;
  purchase: PurchaseRecord;
  onUpdated: () => void;
}

export function NewUpdatePurchaseDialog({ 
  open, 
  onClose, 
  purchase, 
  onUpdated 
}: UpdatePurchaseDialogProps) {
  const [invoiceNumber, setInvoiceNumber] = useState(purchase.invoice_number || '');
  const [status, setStatus] = useState<PurchaseRecord['payment_status']>(purchase.payment_status);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStatusChange = (value: string) => {
    setStatus(value as PurchaseRecord['payment_status']);
  };

  const formatCurrency = (amount: number, currency: string = 'GBP') => {
    let symbol = '£';
    if (currency === 'USD') symbol = '$';
    else if (currency === 'EUR') symbol = '€';
    
    return `${symbol}${amount.toFixed(2)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const user = (await supabase.auth.getUser()).data.user;
      
      console.log('Submitting purchase update:', {
        purchaseId: purchase.id,
        status,
        invoiceNumber,
        userId: user?.id
      });

      // Update the purchase record
      const { data, error } = await supabase
        .from('payment_history')
        .update({
          payment_status: status,
          invoice_number: invoiceNumber
        })
        .eq('id', purchase.id)
        .select();

      if (error) {
        console.error('Error updating purchase:', error);
        setErrorMessage(`Failed to update: ${error.message}`);
        return;
      }

      // If payment is marked as completed/payment_made, update the subscription status
      if (status === 'payment_made' && purchase.subscription_id) {
        const { error: subscriptionError } = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString()
          })
          .eq('id', purchase.subscription_id);

        if (subscriptionError) {
          console.error('Error updating subscription:', subscriptionError);
          // Continue anyway as the payment was updated successfully
        }
      }

      console.log('Purchase updated successfully');
      toast.success("Purchase record updated successfully");
      onUpdated();
    } catch (error) {
      console.error('Error updating purchase record:', error);
      setErrorMessage(`An unexpected error occurred: ${error.message}`);
      toast.error(`Failed to update: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDialogTitle = () => {
    return purchase.payment_method === 'invoice' 
      ? "Update Invoice" 
      : "Update Payment";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>
            Update payment details and status
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{errorMessage}</span>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">School</Label>
              <div className="font-medium truncate">{purchase.billing_school_name || 'Not provided'}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">Amount</Label>
              <div className="font-medium">{formatCurrency(purchase.amount, purchase.currency)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Contact</Label>
              <div className="font-medium truncate">{purchase.billing_contact_name || 'Not provided'}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <div className="font-medium truncate" title={purchase.billing_contact_email || 'Not provided'}>
                {purchase.billing_contact_email || 'Not provided'}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoiceNumber">Invoice Number</Label>
            <Input
              id="invoiceNumber"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Enter invoice number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Payment Status</Label>
            <Select
              value={status}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger id="status" className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">
                  <div className="flex items-center">
                    <span className="h-2 w-2 rounded-full bg-yellow-500 mr-2"></span>
                    Pending
                  </div>
                </SelectItem>
                <SelectItem value="invoice_raised">
                  <div className="flex items-center">
                    <span className="h-2 w-2 rounded-full bg-blue-500 mr-2"></span>
                    Invoice Raised
                  </div>
                </SelectItem>
                <SelectItem value="payment_made">
                  <div className="flex items-center">
                    <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                    Payment Made
                  </div>
                </SelectItem>
                <SelectItem value="cancelled">
                  <div className="flex items-center">
                    <span className="h-2 w-2 rounded-full bg-red-500 mr-2"></span>
                    Cancelled
                  </div>
                </SelectItem>
                <SelectItem value="refunded">
                  <div className="flex items-center">
                    <span className="h-2 w-2 rounded-full bg-purple-500 mr-2"></span>
                    Refunded
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {purchase.billing_address && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Address</Label>
              <div className="text-sm bg-gray-50 p-2 rounded">
                {purchase.billing_address}
              </div>
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className={status === 'payment_made' ? 'bg-green-600 hover:bg-green-700' : 
                        status === 'cancelled' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {isSubmitting ? 'Updating...' : 'Update Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
