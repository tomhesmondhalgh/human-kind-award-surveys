
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";
import { Alert, AlertDescription } from "../ui/alert";
import { AlertCircle } from "lucide-react";
import { Purchase, PaymentStatus } from '../../types/purchases';
import { formatCurrency } from '../../lib/utils';
import { usePurchaseUpdater } from '../../hooks/usePurchaseUpdater';

interface UpdatePurchaseDialogProps {
  open: boolean;
  onClose: () => void;
  purchase: Purchase;
  onUpdated: () => void;
}

export const UpdatePurchaseDialog: React.FC<UpdatePurchaseDialogProps> = ({
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
  
  // Use our updated hook
  const { updatePurchase, isUpdating, error } = usePurchaseUpdater();

  const handlePaymentStatusChange = (value: string) => {
    setPaymentStatus(value as PaymentStatus);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const updateResult = await updatePurchase(purchase.id, {
      invoice_number: invoiceNumber,
      payment_status: paymentStatus,
      billing_school_name: billingSchoolName,
      billing_contact_name: billingContactName,
      billing_contact_email: billingContactEmail
    });

    if (updateResult) {
      onUpdated();
    }
  };

  const getButtonColorClass = () => {
    if (paymentStatus === 'payment_made') return 'bg-green-600 hover:bg-green-700';
    if (paymentStatus === 'cancelled') return 'bg-red-600 hover:bg-red-700';
    return '';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {purchase.payment_method === 'invoice' ? "Update Invoice" : "Update Payment Record"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Amount</Label>
              <div className="font-medium">
                {formatCurrency(purchase.amount, purchase.currency, true)}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Plan</Label>
              <div className="font-medium capitalize">
                {purchase.plan_type} ({purchase.purchase_type})
              </div>
            </div>
          </div>

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
            <Button 
              type="submit" 
              disabled={isUpdating}
              className={getButtonColorClass()}
            >
              {isUpdating ? 'Updating...' : 'Update Record'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
