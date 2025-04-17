
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
import { Purchase } from './PurchasesManagement';

interface PurchasesTableProps {
  purchases: Purchase[];
  onUpdateInvoice: (purchase: Purchase) => void;
  getStatusBadge: (status: string) => JSX.Element;
  getPaymentMethodIcon: (method: string) => JSX.Element;
}

export const PurchasesTable: React.FC<PurchasesTableProps> = ({
  purchases,
  onUpdateInvoice,
  getStatusBadge,
  getPaymentMethodIcon
}) => {
  return (
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
                {new Date(purchase.created_at).toLocaleDateString('en-GB')}
              </TableCell>
              <TableCell>
                <div className="font-medium">{purchase.billing_school_name || 'N/A'}</div>
                <div className="text-sm text-muted-foreground">
                  {purchase.billing_contact_name}
                </div>
              </TableCell>
              <TableCell>
                <div className="capitalize font-medium">{purchase.plan_type}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {purchase.purchase_type}
                </div>
              </TableCell>
              <TableCell>{formatCurrency(purchase.amount, purchase.currency, purchase.amount > 10000)}</TableCell>
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
                  onClick={() => onUpdateInvoice(purchase)}
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
  );
};
