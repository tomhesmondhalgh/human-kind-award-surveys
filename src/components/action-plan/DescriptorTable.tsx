
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import SearchBar from './SearchBar';
import DescriptorsTable from './table/DescriptorsTable';
import ProgressNoteDialog from './ProgressNoteDialog';
import ProgressNotesList from './ProgressNotesList';
import { useDescriptorTableData } from '@/hooks/useDescriptorTableData';

interface DescriptorTableProps {
  userId: string;
  section: string;
  onRefreshSummary: () => void;
}

const DescriptorTable: React.FC<DescriptorTableProps> = ({ userId, section, onRefreshSummary }) => {
  const {
    descriptors,
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
  } = useDescriptorTableData(userId, section, onRefreshSummary);

  if (isLoading && descriptors.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (descriptors.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        {searchTerm ? 'No descriptors match your search' : 'No descriptors available for this section'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SearchBar 
        searchTerm={searchTerm} 
        onSearchChange={setSearchTerm} 
      />

      <DescriptorsTable
        descriptors={descriptors}
        editingCell={editingCell}
        editValue={editValue}
        onEditStart={handleEditStart}
        onEditValueChange={setEditValue}
        onEditSave={handleEditSave}
        onStatusChange={handleStatusChange}
        onDateChange={handleDateChange}
        onViewNotes={setViewNotesId}
        onAddNote={setProgressNoteId}
      />

      {progressNoteId && (
        <ProgressNoteDialog
          descriptorId={progressNoteId}
          isOpen={!!progressNoteId}
          onClose={() => setProgressNoteId(null)}
          onSuccess={() => {
            onRefreshSummary();
            refetchDescriptors();
          }}
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
