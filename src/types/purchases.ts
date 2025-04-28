
export type PaymentMethod = 'stripe' | 'invoice' | 'manual';
export type PaymentStatus = 'pending' | 'invoice_raised' | 'payment_made' | 'cancelled' | 'refunded';
export type PurchaseType = 'subscription' | 'one-time' | 'credit' | 'unknown';

export type Purchase = {
  id: string;
  subscription_id: string;
  amount: number;
  currency: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  invoice_number?: string;
  billing_school_name?: string;
  billing_contact_name?: string;
  billing_contact_email?: string;
  billing_address?: string;
  created_at: string;
  plan_type: string;
  purchase_type: string;
};
