
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";
import { PurchaseRecord } from "../../hooks/useAdminPurchaseRecords";
import { supabase } from "../../integrations/supabase/client";
import { Alert, AlertDescription } from "../ui/alert";
import { AlertCircle } from "lucide-react";

interface UpdatePurchaseDialogProps {
  open: boolean;
  onClose: () => void;
  purchase: PurchaseRecord;
  onUpdated: () => void;
}

// Define the payment status type to match the database enum
type PaymentStatus = 'pending' | 'invoice_raised' | 'payment_made' | 'cancelled' | 'refunded';

export const NewUpdatePurchaseDialog: React.FC<UpdatePurchaseDialogProps> = ({
  open,
  onClose,
  purchase,
  onUpdated,
}) => {
  const [invoiceNumber, setInvoiceNumber] = useState(purchase.invoice_number || '');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(purchase.payment_status as PaymentStatus);
  const [billingSchoolName, setBillingSchoolName] = useState(purchase.billing_school_name || '');
  const [billingContactName, setBillingContactName] = useState(purchase.billing_contact_name || '');
  const [billingContactEmail, setBillingContactEmail] = useState(purchase.billing_contact_email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create a type-safe handler for the payment status change
  const handlePaymentStatusChange = (value: string) => {
    setPaymentStatus(value as PaymentStatus);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Update payment record in the database
      const { error } = await supabase
        .from('payment_history')
        .update({
          invoice_number: invoiceNumber,
          payment_status: paymentStatus,
          billing_school_name: billingSchoolName,
          billing_contact_name: billingContactName,
          billing_contact_email: billingContactEmail
        })
        .eq('id', purchase.id);

      if (error) {
        console.error('Error updating payment:', error);
        setError(`Failed to update payment: ${error.message}`);
        return;
      }

      // Call onUpdated callback to refresh the parent component
      onUpdated();
    } catch (err: any) {
      console.error('Error in handleSubmit:', err);
      setError(`An error occurred: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Update Purchase Record</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="billingSchoolName">School/Organisation Name</Label>
            <Input
              id="billingSchoolName"
              value={billingSchoolName}
              onChange={(e) => setBillingSchoolName(e.target.value)}
              placeholder="School or Organisation Name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="billingContactName">Contact Name</Label>
            <Input
              id="billingContactName"
              value={billingContactName}
              onChange={(e) => setBillingContactName(e.target.value)}
              placeholder="Contact Person Name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="billingContactEmail">Contact Email</Label>
            <Input
              id="billingContactEmail"
              type="email"
              value={billingContactEmail}
              onChange={(e) => setBillingContactEmail(e.target.value)}
              placeholder="contact@school.edu"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoiceNumber">Invoice Number</Label>
            <Input
              id="invoiceNumber"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="e.g. INV-12345"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentStatus">Payment Status</Label>
            <Select value={paymentStatus} onValueChange={handlePaymentStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="invoice_raised">Invoice Raised</SelectItem>
                <SelectItem value="payment_made">Payment Made</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Record'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
