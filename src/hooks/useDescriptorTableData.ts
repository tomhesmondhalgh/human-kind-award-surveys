import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ActionPlanDescriptor, DescriptorStatus } from '@/types/actionPlan';
import { updateDescriptor, getActionPlanDescriptors } from '@/utils/actionPlanUtils';
import type { DescriptorUpdates } from '@/utils/actionPlan/updateDescriptor';
import { useEditableCell } from '@/hooks/useEditableCell';

// Errors from updateDescriptor that mean our copy of the table is out of date.
const STALE_DATA_ERRORS = ['DESCRIPTOR_NOT_ACCESSIBLE', 'NO_ROWS_UPDATED', 'INVALID_SESSION'];

export function useDescriptorTableData(
  organizationId: string,
  section: string,
  onRefreshSummary: () => void
) {
  const [progressNoteId, setProgressNoteId] = useState<string | null>(null);
  const [viewNotesId, setViewNotesId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { editingCell, editValue, setEditValue, handleEditStart, setEditingCell } = useEditableCell();
  const queryClient = useQueryClient();
  const queryKey = ['actionPlanDescriptors', organizationId, section];

  const { data: descriptors = [], isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await getActionPlanDescriptors(organizationId, section);
      if (!result.success || !result.data) {
        toast.error('Failed to load data');
        throw new Error('Failed to load action plan descriptors');
      }
      return [...result.data].sort((a, b) =>
        a.index_number.localeCompare(b.index_number, undefined, { numeric: true })
      );
    },
    enabled: !!organizationId && !!section,
  });

  // Saves one change to a descriptor and updates the table without a refetch.
  const saveChange = async (
    id: string,
    changes: DescriptorUpdates,
    failureLabel: string
  ): Promise<boolean> => {
    try {
      const result = await updateDescriptor(id, changes);
      if (result.success) {
        queryClient.setQueryData<ActionPlanDescriptor[]>(queryKey, (current = []) =>
          current.map((d) => (d.id === id ? { ...d, ...changes } : d))
        );
        return true;
      }

      const message = result.error?.message || 'Please check your permissions and try again.';
      toast.error(`Failed to ${failureLabel}: ${message}`);
      if (STALE_DATA_ERRORS.includes(result.error?.code)) {
        await refetch();
        toast.info('Data refreshed. Please try again.');
      }
    } catch (error) {
      console.error(`Error trying to ${failureLabel}:`, error);
      toast.error(`Failed to ${failureLabel}`);
    }
    return false;
  };

  const handleStatusChange = async (id: string, status: DescriptorStatus) => {
    if (await saveChange(id, { status }, 'update status')) {
      onRefreshSummary();
    }
  };

  const handleDateChange = async (id: string, date: string) => {
    await saveChange(id, { deadline: date || null }, 'update deadline');
  };

  const handleEditSave = async () => {
    if (!editingCell) return;
    const { id, field } = editingCell;
    // Only key_actions and assigned_to are edited inline.
    if (await saveChange(id, { [field]: editValue } as DescriptorUpdates, 'save changes')) {
      setEditingCell(null);
    }
  };

  const term = searchTerm.toLowerCase();
  const filteredDescriptors = descriptors.filter(descriptor =>
    descriptor.descriptor_text.toLowerCase().includes(term) ||
    descriptor.reference.toLowerCase().includes(term) ||
    descriptor.index_number.toLowerCase().includes(term) ||
    (descriptor.assigned_to && descriptor.assigned_to.toLowerCase().includes(term)) ||
    (descriptor.key_actions && descriptor.key_actions.toLowerCase().includes(term))
  );

  const refetchDescriptors = useCallback(() => {
    refetch();
  }, [refetch]);

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
