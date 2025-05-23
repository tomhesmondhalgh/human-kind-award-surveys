
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { ActionPlanDescriptor, DescriptorStatus } from '@/types/actionPlan';
import { updateDescriptor, getActionPlanDescriptors } from '@/utils/actionPlanUtils';
import { useEditableCell } from '@/hooks/useEditableCell';
import { getLocalStorageCache, setLocalStorageCache } from '@/utils/cache/cacheUtils';

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
    setIsLoading(true);
    try {
      const result = await getActionPlanDescriptors(organizationId, section);
      if (result.success && result.data) {
        const sortedDescriptors = result.data.sort((a, b) => 
          a.index_number.localeCompare(b.index_number, undefined, { numeric: true })
        );
        setDescriptors(sortedDescriptors);
        setLocalStorageCache(cacheKey, sortedDescriptors, 30 * 60);
      } else {
        toast.error('Failed to load data');
      }
    } catch (error) {
      console.error('Error fetching descriptors:', error);
      toast.error('An error occurred while loading data');
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, section, cacheKey]);

  useEffect(() => {
    const cachedData = getLocalStorageCache<ActionPlanDescriptor[]>(cacheKey);
    if (cachedData) {
      setDescriptors(cachedData);
      setIsLoading(false);
    }
    fetchDescriptors();
  }, [cacheKey, fetchDescriptors]);

  const handleStatusChange = async (id: string, status: DescriptorStatus) => {
    try {
      const result = await updateDescriptor(id, { status });
      if (result.success) {
        const updatedDescriptors = descriptors.map(d => 
          d.id === id ? { ...d, status } : d
        );
        setDescriptors(updatedDescriptors);
        setLocalStorageCache(cacheKey, updatedDescriptors, 30 * 60);
        onRefreshSummary();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleDateChange = async (id: string, date: string) => {
    try {
      const result = await updateDescriptor(id, { deadline: date || null });
      if (result.success) {
        const updatedDescriptors = descriptors.map(d => 
          d.id === id ? { ...d, deadline: date } : d
        );
        setDescriptors(updatedDescriptors);
        setLocalStorageCache(cacheKey, updatedDescriptors, 30 * 60);
      }
    } catch (error) {
      console.error('Error updating date:', error);
      toast.error('Failed to update deadline');
    }
  };

  const handleEditSave = async () => {
    if (!editingCell) return;

    const { id, field } = editingCell;
    try {
      const result = await updateDescriptor(id, { [field]: editValue });
      if (result.success) {
        const updatedDescriptors = descriptors.map(d => 
          d.id === id ? { ...d, [field]: editValue } : d
        );
        setDescriptors(updatedDescriptors);
        setLocalStorageCache(cacheKey, updatedDescriptors, 30 * 60);
        setEditingCell(null);
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
    setEditValue
  };
}
