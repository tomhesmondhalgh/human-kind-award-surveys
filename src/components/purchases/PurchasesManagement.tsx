
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { AlertCircle, Search, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Skeleton } from "../ui/skeleton";
import { useAdminPurchaseData } from '../../hooks/useAdminPurchaseData';
import { usePurchaseFilters } from '../../hooks/usePurchaseFilters';
import { PurchaseTable } from './PurchaseTable';
import { PurchasePagination } from './PurchasePagination';
import { UpdatePurchaseDialog } from './UpdatePurchaseDialog';
import { Purchase } from '../../types/purchases';

const PurchasesManagement = () => {
  // Use the admin purchase data hook
  const { 
    purchases, 
    loading, 
    error, 
    isAdmin, 
    adminCheckComplete, 
    refreshPurchases,
    totalCount
  } = useAdminPurchaseData();
  
  // Use our new filters hook
  const {
    searchQuery,
    updateSearchQuery,
    currentPage,
    setCurrentPage,
    pageSize,
    handlePageSizeChange,
    filteredPurchases,
    totalPages,
    isFiltering
  } = usePurchaseFilters(purchases, totalCount);
  
  // State for update dialog
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  // Handler for opening the update dialog
  const handleUpdatePurchase = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setUpdateDialogOpen(true);
  };

  // Handler for after a purchase is updated
  const handlePurchaseUpdated = () => {
    setUpdateDialogOpen(false);
    setSelectedPurchase(null);
    refreshPurchases();
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

        <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
          <div className="relative flex-grow w-full md:w-auto md:mr-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by school, contact, invoice number, plan, or status..."
              value={searchQuery}
              onChange={(e) => updateSearchQuery(e.target.value)}
              className="pl-10 w-full"
              disabled={loading}
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground mr-2">Show:</span>
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange} disabled={loading}>
                <SelectTrigger className="w-[80px]">
                  <SelectValue placeholder="10" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              variant="outline" 
              onClick={refreshPurchases} 
              className="flex items-center ml-2"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-10 w-full max-w-[500px]" />
              <Skeleton className="h-10 w-20" />
            </div>
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <>
            <PurchaseTable
              purchases={filteredPurchases}
              onUpdatePurchase={handleUpdatePurchase}
            />
            
            <div className="mt-4 flex flex-col md:flex-row justify-between items-center">
              <div className="text-sm text-muted-foreground mb-2 md:mb-0">
                Showing {filteredPurchases.length} of {isFiltering ? purchases.length : totalCount} records
                {searchQuery && filteredPurchases.length !== purchases.length && 
                  ` (filtered from ${purchases.length} records)`}
              </div>
              
              <PurchasePagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
            
            {filteredPurchases.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "No purchases match your search criteria" : "No purchases found"}
              </div>
            )}
          </>
        )}
      </CardContent>

      {selectedPurchase && (
        <UpdatePurchaseDialog
          open={updateDialogOpen}
          onClose={() => setUpdateDialogOpen(false)}
          purchase={selectedPurchase}
          onUpdated={handlePurchaseUpdated}
        />
      )}
    </Card>
  );
};

export default PurchasesManagement;
