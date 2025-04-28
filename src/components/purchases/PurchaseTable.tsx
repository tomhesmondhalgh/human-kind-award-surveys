
import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../ui/table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Pencil, CreditCard, FileText } from "lucide-react";
import { formatCurrency } from '../../lib/utils';
import { Purchase } from '../../types/purchases';

interface PurchaseTableProps {
  purchases: Purchase[];
  onUpdatePurchase: (purchase: Purchase) => void;
}

export const PurchaseTable: React.FC<PurchaseTableProps> = ({
  purchases,
  onUpdatePurchase
}) => {
  // Helper function to get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'payment_made':
        return <Badge className="bg-green-500">Payment Made</Badge>;
      case 'invoice_raised':
        return <Badge className="bg-blue-500">Invoice Raised</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500">Cancelled</Badge>;
      case 'refunded':
        return <Badge className="bg-purple-500">Refunded</Badge>;
      default:
        return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };

  // Helper function to get payment method icon
  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'stripe':
        return <CreditCard className="h-4 w-4 mr-1" />;
      case 'invoice':
        return <FileText className="h-4 w-4 mr-1" />;
      default:
        return null;
    }
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>School/Customer</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Payment Method</TableHead>
            <TableHead>Invoice #</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {purchases.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-4">
                No purchases found
              </TableCell>
            </TableRow>
          ) : (
            purchases.map((purchase) => (
              <TableRow key={purchase.id}>
                <TableCell>
                  {formatDate(purchase.created_at)}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{purchase.billing_school_name || 'N/A'}</div>
                  {purchase.billing_contact_name && (
                    <div className="text-sm text-muted-foreground">
                      {purchase.billing_contact_name}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="capitalize font-medium">{purchase.plan_type}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {purchase.purchase_type}
                  </div>
                </TableCell>
                <TableCell>
                  {formatCurrency(purchase.amount, purchase.currency, purchase.amount > 10000)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    {getPaymentMethodIcon(purchase.payment_method)}
                    <span className="capitalize">{purchase.payment_method}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {purchase.invoice_number || '—'}
                </TableCell>
                <TableCell>
                  {getStatusBadge(purchase.payment_status)}
                </TableCell>
                <TableCell>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onUpdatePurchase(purchase)}
                    className="flex items-center"
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Update
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
