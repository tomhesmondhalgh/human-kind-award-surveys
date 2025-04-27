
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { ActionPlanDescriptor, DescriptorStatus } from '@/types/actionPlan';
import { updateDescriptor, getActionPlanDescriptors } from '@/utils/actionPlanUtils';
import ProgressNoteDialog from './ProgressNoteDialog';
import ProgressNotesList from './ProgressNotesList';
import SearchBar from './SearchBar';
import DescriptorsTable from './DescriptorsTable';
import { useEditableCell } from '@/hooks/useEditableCell';
import { Skeleton } from '@/components/ui/skeleton';
import { getLocalStorageCache, setLocalStorageCache } from '@/utils/cache/cacheUtils';

interface DescriptorTableProps {
  userId: string;
  section: string;
  onRefreshSummary: () => void;
}

const DescriptorTable: React.FC<DescriptorTableProps> = ({ userId, section, onRefreshSummary }) => {
  const [descriptors, setDescriptors] = useState<ActionPlanDescriptor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [progressNoteId, setProgressNoteId] = useState<string | null>(null);
  const [viewNotesId, setViewNotesId] = useState<string | null>(null);
  const { editingCell, editValue, setEditValue, handleEditStart, setEditingCell } = useEditableCell();

  // Create a cache key for this section
  const cacheKey = `descriptors_${userId}_${section}`;

  // Load any cached data immediately to avoid flicker
  useEffect(() => {
    const cachedData = getLocalStorageCache<ActionPlanDescriptor[]>(cacheKey);
    if (cachedData) {
      console.log(`Loading cached descriptors for section ${section} from localStorage cache`);
      setDescriptors(cachedData);
      setIsLoading(false);
    }
  }, [cacheKey, section]);

  // Memoize fetchDescriptors to prevent unnecessary recreations
  const fetchDescriptors = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('Fetching descriptors for user:', userId, 'section:', section);
      const result = await getActionPlanDescriptors(userId, section);
      
      if (result.success && result.data) {
        console.log('Fetched descriptors successfully, count:', result.data.length);
        
        const sortedDescriptors = result.data.sort((a, b) => {
          if (!a.index_number) return 1;
          if (!b.index_number) return -1;
          return a.index_number.localeCompare(b.index_number, undefined, { numeric: true });
        });
        
        const uniqueDescriptors = Array.from(
          new Map(sortedDescriptors.map(descriptor => 
            [descriptor.index_number + descriptor.reference, descriptor]
          )).values()
        );
        
        console.log('Processed descriptors count:', uniqueDescriptors.length);
        setDescriptors(uniqueDescriptors as ActionPlanDescriptor[]);
        
        // Cache the descriptors for this section
        setLocalStorageCache(cacheKey, uniqueDescriptors, 30 * 60); // Cache for 30 minutes
      } else {
        console.error('Failed to load descriptors:', result.error);
        toast.error('Failed to load data');
      }
    } catch (error) {
      console.error('Exception fetching descriptors:', error);
      toast.error('An error occurred while loading data');
    } finally {
      setIsLoading(false);
    }
  }, [userId, section, cacheKey]);

  // Fetch descriptors when component mounts and when userId/section changes
  useEffect(() => {
    if (userId && section) {
      console.log(`Fetching descriptors for section: ${section}`);
      fetchDescriptors();
    }
  }, [userId, section, fetchDescriptors]);

  const filteredDescriptors = descriptors.filter(
    descriptor => 
      descriptor.descriptor_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      descriptor.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      descriptor.index_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (descriptor.assigned_to && descriptor.assigned_to.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (descriptor.key_actions && descriptor.key_actions.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleStatusChange = async (id: string, status: DescriptorStatus) => {
    try {
      console.log(`Updating status for descriptor ${id} to ${status}`);
      const result = await updateDescriptor(id, { status });
      if (result.success) {
        const updatedDescriptors = descriptors.map(d => d.id === id ? { ...d, status } : d);
        setDescriptors(updatedDescriptors);
        
        // Update cache
        setLocalStorageCache(cacheKey, updatedDescriptors, 30 * 60);
        
        onRefreshSummary();
      } else {
        console.error('Failed to update status:', result.error);
      }
    } catch (error) {
      console.error('Exception updating status:', error);
    }
  };

  const handleDateChange = async (id: string, date: string) => {
    try {
      console.log(`Updating deadline for descriptor ${id} to ${date}`);
      const result = await updateDescriptor(id, { deadline: date || null });
      if (result.success) {
        const updatedDescriptors = descriptors.map(d => d.id === id ? { ...d, deadline: date } : d);
        setDescriptors(updatedDescriptors);
        
        // Update cache
        setLocalStorageCache(cacheKey, updatedDescriptors, 30 * 60);
      } else {
        console.error('Failed to update date:', result.error);
      }
    } catch (error) {
      console.error('Exception updating date:', error);
    }
  };

  const handleEditSave = async () => {
    if (!editingCell) return;

    const { id, field } = editingCell;
    const updates: Partial<ActionPlanDescriptor> = { [field]: editValue };
    
    try {
      console.log(`Saving edit for descriptor ${id}, field ${field}`);
      const result = await updateDescriptor(id, updates);
      if (result.success) {
        const updatedDescriptors = descriptors.map(d => d.id === id ? { ...d, [field]: editValue } : d);
        setDescriptors(updatedDescriptors);
        
        // Update cache
        setLocalStorageCache(cacheKey, updatedDescriptors, 30 * 60);
        
        setEditingCell(null);
      } else {
        console.error('Failed to save edit:', result.error);
      }
    } catch (error) {
      console.error('Exception saving edit:', error);
    }
  };

  const handleProgressNoteAdded = async () => {
    console.log('Progress note added, refreshing data');
    await fetchDescriptors();
    onRefreshSummary();
  };

  const handleViewNotes = (id: string) => {
    console.log('Viewing notes for descriptor:', id);
    setViewNotesId(id);
  };

  return (
    <div className="space-y-4">
      <SearchBar 
        searchTerm={searchTerm} 
        onSearchChange={setSearchTerm} 
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : filteredDescriptors.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {searchTerm ? 'No descriptors match your search' : 'No descriptors available for this section'}
        </div>
      ) : (
        <DescriptorsTable
          descriptors={filteredDescriptors}
          editingCell={editingCell}
          editValue={editValue}
          onEditStart={handleEditStart}
          onEditValueChange={setEditValue}
          onEditSave={handleEditSave}
          onStatusChange={handleStatusChange}
          onDateChange={handleDateChange}
          onViewNotes={handleViewNotes}
          onAddNote={setProgressNoteId}
        />
      )}

      {progressNoteId && (
        <ProgressNoteDialog
          descriptorId={progressNoteId}
          isOpen={!!progressNoteId}
          onClose={() => setProgressNoteId(null)}
          onSuccess={handleProgressNoteAdded}
        />
      )}

      {viewNotesId && (
        <ProgressNotesList
          descriptorId={viewNotesId}
          isOpen={!!viewNotesId}
          onClose={() => setViewNotesId(null)}
        />
      )}
    </div>
  );
};

export default DescriptorTable;
