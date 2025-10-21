
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { ActionPlanDescriptor, DescriptorStatus } from '@/types/actionPlan';
import { updateDescriptor, getActionPlanDescriptors } from '@/utils/actionPlanUtils';
import { useEditableCell } from '@/hooks/useEditableCell';
import { getLocalStorageCache, setLocalStorageCache } from '@/utils/cache/cacheUtils';
import { supabase } from '@/integrations/supabase/client';

export function useDescriptorTableData(
  organizationId: string,
  section: string,
  onRefreshSummary: () => void
) {
  const [descriptors, setDescriptors] = useState<ActionPlanDescriptor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [progressNoteId, setProgressNoteId] = useState<string | null>(null);
  const [viewNotesId, setViewNotesId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { editingCell, editValue, setEditValue, handleEditStart, setEditingCell } = useEditableCell();

  const cacheKey = `descriptors_${organizationId}_${section}`;

  const fetchDescriptors = useCallback(async () => {
    console.log('=== FETCH DESCRIPTORS START ===');
    console.log('Organization ID:', organizationId);
    console.log('Section:', section);
    setIsLoading(true);
    try {
      const result = await getActionPlanDescriptors(organizationId, section);
      console.log('Fetch result:', result);
      
      if (result.success && result.data) {
        console.log('Fetched descriptor count:', result.data.length);
        console.log('First fetched descriptor:', result.data[0]);
        const sortedDescriptors = result.data.sort((a, b) => 
          a.index_number.localeCompare(b.index_number, undefined, { numeric: true })
        );
        console.log('Setting state with fetched descriptors');
        setDescriptors(sortedDescriptors);
        console.log('Updating cache with fetched descriptors');
        setLocalStorageCache(cacheKey, sortedDescriptors, 30 * 60);
        console.log('Cache updated successfully');
      } else {
        console.error('Failed to load data:', result);
        toast.error('Failed to load data');
      }
    } catch (error) {
      console.error('Error fetching descriptors:', error);
      toast.error('An error occurred while loading data');
    } finally {
      setIsLoading(false);
      console.log('=== FETCH DESCRIPTORS END ===');
    }
  }, [organizationId, section, cacheKey]);

  useEffect(() => {
    console.log('=== useDescriptorTableData MOUNT ===');
    console.log('Organization ID:', organizationId);
    console.log('Section:', section);
    console.log('Cache key:', cacheKey);
    
    const loadData = async () => {
      const cachedData = getLocalStorageCache<ActionPlanDescriptor[]>(cacheKey);
      console.log('Cached data found:', !!cachedData);
      
      if (cachedData && cachedData.length > 0) {
        console.log('Cached descriptor count:', cachedData.length);
        console.log('First cached descriptor:', cachedData[0]);
        
        // Validate that the first cached descriptor still exists in the database
        const { data: validationCheck } = await supabase
          .from('action_plan_descriptors')
          .select('id')
          .eq('id', cachedData[0].id)
          .eq('organization_id', organizationId)
          .maybeSingle();

        if (validationCheck) {
          // Cache is valid, use it
          console.log('Cache validation passed, using cached data');
          setDescriptors(cachedData);
          setIsLoading(false);
        } else {
          // Cache is stale, clear it
          console.log('Cache validation failed - stale descriptor IDs detected, clearing cache');
          localStorage.removeItem(cacheKey);
        }
      } else {
        console.log('No cached data found');
      }
      
      // Always fetch fresh data
      console.log('Fetching fresh data from database...');
      await fetchDescriptors();
      console.log('Fresh data fetch complete');
    };
    
    loadData();
  }, [cacheKey, organizationId, section, fetchDescriptors]);

  const handleStatusChange = async (id: string, status: DescriptorStatus) => {
    console.log('=== handleStatusChange CALLED ===');
    console.log('Descriptor ID:', id);
    console.log('New status:', status);
    console.log('Current descriptor in state:', descriptors.find(d => d.id === id));
    
    try {
      const result = await updateDescriptor(id, { status });
      console.log('=== updateDescriptor RESULT ===', result);
      
      if (result.success) {
        console.log('=== UPDATING LOCAL STATE AND CACHE ===');
        const updatedDescriptors = descriptors.map(d => 
          d.id === id ? { ...d, status } : d
        );
        console.log('Updated descriptors array:', updatedDescriptors);
        console.log('Cache key:', cacheKey);
        setDescriptors(updatedDescriptors);
        setLocalStorageCache(cacheKey, updatedDescriptors, 30 * 60);
        console.log('Cache updated successfully');
        onRefreshSummary();
      } else {
        console.error('Failed to update status:', result.error);
        const message = result.error?.message || 'Please check your permissions and try again.';
        toast.error(`Failed to update status: ${message}`);
        
        // If descriptor not found or no rows updated, clear cache and refetch
        if (result.error?.code === 'DESCRIPTOR_NOT_ACCESSIBLE' || 
            result.error?.code === 'NO_ROWS_UPDATED' ||
            result.error?.code === 'INVALID_SESSION') {
          console.log('Clearing stale cache and refetching due to error:', result.error?.code);
          localStorage.removeItem(cacheKey);
          await fetchDescriptors();
          toast.info('Data refreshed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleDateChange = async (id: string, date: string) => {
    console.log('=== handleDateChange CALLED ===');
    console.log('Descriptor ID:', id);
    console.log('New date:', date);
    console.log('Current descriptor in state:', descriptors.find(d => d.id === id));
    
    try {
      const result = await updateDescriptor(id, { deadline: date || null });
      console.log('=== updateDescriptor RESULT ===', result);
      
      if (result.success) {
        console.log('=== UPDATING LOCAL STATE AND CACHE ===');
        const updatedDescriptors = descriptors.map(d => 
          d.id === id ? { ...d, deadline: date } : d
        );
        console.log('Cache key:', cacheKey);
        setDescriptors(updatedDescriptors);
        setLocalStorageCache(cacheKey, updatedDescriptors, 30 * 60);
        console.log('Cache updated successfully');
      } else {
        console.error('Failed to update deadline:', result.error);
        const message = result.error?.message || 'Please check your permissions and try again.';
        toast.error(`Failed to update deadline: ${message}`);
        
        // If descriptor not found or no rows updated, clear cache and refetch
        if (result.error?.code === 'DESCRIPTOR_NOT_ACCESSIBLE' || 
            result.error?.code === 'NO_ROWS_UPDATED' ||
            result.error?.code === 'INVALID_SESSION') {
          console.log('Clearing stale cache and refetching due to error:', result.error?.code);
          localStorage.removeItem(cacheKey);
          await fetchDescriptors();
          toast.info('Data refreshed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error updating date:', error);
      toast.error('Failed to update deadline');
    }
  };

  const handleEditSave = async () => {
    if (!editingCell) return;

    const { id, field } = editingCell;
    console.log('=== handleEditSave CALLED ===');
    console.log('Descriptor ID:', id);
    console.log('Field:', field);
    console.log('New value:', editValue);
    console.log('Current descriptor in state:', descriptors.find(d => d.id === id));
    
    try {
      const result = await updateDescriptor(id, { [field]: editValue });
      console.log('=== updateDescriptor RESULT ===', result);
      
      if (result.success) {
        console.log('=== UPDATING LOCAL STATE AND CACHE ===');
        const updatedDescriptors = descriptors.map(d => 
          d.id === id ? { ...d, [field]: editValue } : d
        );
        console.log('Cache key:', cacheKey);
        setDescriptors(updatedDescriptors);
        setLocalStorageCache(cacheKey, updatedDescriptors, 30 * 60);
        console.log('Cache updated successfully');
        setEditingCell(null);
      } else {
        console.error('Failed to save changes:', result.error);
        const message = result.error?.message || 'Please check your permissions and try again.';
        toast.error(`Failed to save changes: ${message}`);
        
        // If descriptor not found or no rows updated, clear cache and refetch
        if (result.error?.code === 'DESCRIPTOR_NOT_ACCESSIBLE' || 
            result.error?.code === 'NO_ROWS_UPDATED' ||
            result.error?.code === 'INVALID_SESSION') {
          console.log('Clearing stale cache and refetching due to error:', result.error?.code);
          localStorage.removeItem(cacheKey);
          await fetchDescriptors();
          toast.info('Data refreshed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error saving edit:', error);
      toast.error('Failed to save changes');
    }
  };

  const filteredDescriptors = descriptors.filter(descriptor => 
    descriptor.descriptor_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    descriptor.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    descriptor.index_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (descriptor.assigned_to && descriptor.assigned_to.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (descriptor.key_actions && descriptor.key_actions.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const refetchDescriptors = useCallback(() => {
    fetchDescriptors();
  }, [fetchDescriptors]);

  return {
    descriptors: filteredDescriptors,
    isLoading,
    editingCell,
    editValue,
    progressNoteId,
    viewNotesId,
    searchTerm,
    setSearchTerm,
    setProgressNoteId,
    setViewNotesId,
    handleStatusChange,
    handleDateChange,
    handleEditStart,
    handleEditSave,
    setEditValue,
    refetchDescriptors
  };
}
