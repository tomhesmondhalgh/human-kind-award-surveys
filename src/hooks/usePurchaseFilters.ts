
import { useState, useMemo, useCallback } from 'react';
import { Purchase } from '../types/purchases';

export interface PurchaseFilters {
  searchQuery: string;
  currentPage: number;
  pageSize: number;
}

export function usePurchaseFilters(
  purchases: Purchase[],
  totalCount: number,
  initialFilters: Partial<PurchaseFilters> = {}
) {
  // Filters state
  const [searchQuery, setSearchQuery] = useState(initialFilters.searchQuery || '');
  
  // Filter purchases based on search query
  const filteredPurchases = useMemo(() => {
    if (!searchQuery.trim()) return purchases;
    
    const query = searchQuery.toLowerCase();
    return purchases.filter(purchase => {
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
  }, [purchases, searchQuery]);

  // Update search query (and reset pagination in parent)
  const updateSearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  return {
    // Filters
    searchQuery,
    updateSearchQuery,
    
    // Results
    filteredPurchases,
    isFiltering: !!searchQuery.trim()
  };
}
