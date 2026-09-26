
export type PaymentMethod = 'stripe' | 'invoice' | 'manual' | 'redemption_code';
export type PaymentStatus = 'pending' | 'invoice_raised' | 'payment_made' | 'cancelled' | 'refunded';
export type PurchaseType = 'subscription' | 'one-time' | 'credit' | 'unknown';

export type Purchase = {
  id: string;
  subscription_id: string;
  amount: number;
  currency: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus | null;
  invoice_number?: string | null;
  billing_school_name?: string | null;
  billing_contact_name?: string | null;
  billing_contact_email?: string | null;
  billing_address?: string | null;
  created_at: string;
  plan_type: string;
  purchase_type: string;
};
