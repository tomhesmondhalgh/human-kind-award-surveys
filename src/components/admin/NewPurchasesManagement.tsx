
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { AlertCircle, Search, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { useAdminPurchaseRecords, PurchaseRecord } from '../../hooks/useAdminPurchaseRecords';
import { NewPurchasesTable } from './NewPurchasesTable';
import { NewUpdatePurchaseDialog } from './NewUpdatePurchaseDialog';
import { NewPagination } from './NewPagination';
import { toast } from 'sonner';

const NewPurchasesManagement = () => {
  // States for managing purchases data
  const { purchases, loading, error, isAdmin, adminCheckComplete, refreshPurchases } = useAdminPurchaseRecords();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  // State for update dialog
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseRecord | null>(null);

  // Added debug log to track data
  useEffect(() => {
    console.log('Current purchases data:', purchases);
  }, [purchases]);

  // Reset to first page when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Filter purchases based on search query
  const filteredPurchases = purchases.filter(purchase => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      (purchase.billing_school_name || '').toLowerCase().includes(query) ||
      (purchase.billing_contact_name || '').toLowerCase().includes(query) ||
      (purchase.billing_contact_email || '').toLowerCase().includes(query) ||
      (purchase.invoice_number || '').toLowerCase().includes(query) ||
      purchase.plan_type.toLowerCase().includes(query) ||
      purchase.payment_method.toLowerCase().includes(query) ||
      purchase.payment_status.toLowerCase().includes(query)
    );
  });

  // Calculate pagination values
  const totalPages = Math.ceil(filteredPurchases.length / recordsPerPage);
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredPurchases.slice(indexOfFirstRecord, indexOfLastRecord);

  // Handler for opening the update dialog
  const handleUpdatePurchase = (purchase: PurchaseRecord) => {
    setSelectedPurchase(purchase);
    setUpdateDialogOpen(true);
  };

  // Handler for after a purchase is updated
  const handlePurchaseUpdated = () => {
    setUpdateDialogOpen(false);
    setSelectedPurchase(null);
    refreshPurchases();
    toast.success('Purchase record updated successfully');
  };

  // Handler for changing page
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // Handler for refreshing data
  const handleRefresh = () => {
    refreshPurchases();
    toast.info('Refreshing purchase data...');
  };

  // Show loading state while checking admin status
  if (!adminCheckComplete) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Purchases Management</CardTitle>
          <CardDescription>Checking permissions...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  // Show access denied if user is not an admin
  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Purchases Management</CardTitle>
          <CardDescription>Admin access required</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You do not have admin privileges to view purchase data.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchases Management</CardTitle>
        <CardDescription>
          View and manage all purchases including credit card payments and invoices
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="mb-4 flex justify-between items-center">
          <div className="relative flex-grow mr-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by school, contact, invoice number, plan, or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <Button variant="outline" onClick={handleRefresh} className="flex items-center">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p>Loading purchases data...</p>
          </div>
        ) : (
          <>
            <NewPurchasesTable
              purchases={currentRecords}
              onUpdatePurchase={handleUpdatePurchase}
            />
            
            <NewPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
            
            {filteredPurchases.length === 0 && searchQuery && (
              <div className="text-center py-8 text-muted-foreground">
                No purchases match your search criteria
              </div>
            )}
          </>
        )}
      </CardContent>

      {selectedPurchase && (
        <NewUpdatePurchaseDialog
          open={updateDialogOpen}
          onClose={() => setUpdateDialogOpen(false)}
          purchase={selectedPurchase}
          onUpdated={handlePurchaseUpdated}
        />
      )}
    </Card>
  );
};

export default NewPurchasesManagement;
