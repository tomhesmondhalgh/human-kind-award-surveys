
import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Plus } from 'lucide-react';

interface NotesActionsProps {
  notesCount: number | null | undefined;
  onViewNotes: () => void;
  onAddNote: () => void;
  readOnly?: boolean;
}

const NotesActions: React.FC<NotesActionsProps> = ({
  notesCount,
  onViewNotes,
  onAddNote,
  readOnly = false
}) => {
  // Format note count safely
  const formatNoteCount = (count: number | null | undefined) => {
    // Ensure we're working with a number
    const numCount = typeof count === 'number' ? count : 0;
    return `${numCount} ${numCount === 1 ? 'Note' : 'Notes'}`;
  };

  // Use memoization to avoid unnecessary re-renders
  const formattedCount = React.useMemo(() => {
    console.log(`Formatting note count: ${notesCount}`);
    return formatNoteCount(notesCount);
  }, [notesCount]);

  return (
    <div className="flex flex-col space-y-1">
      <Button 
        size="sm" 
        variant="outline" 
        onClick={onViewNotes}
        className="h-7 px-2 text-xs w-full justify-start"
      >
        <FileText className="h-3 w-3 mr-1" />
        {formattedCount}
      </Button>
      {!readOnly && (
        <Button 
          size="sm" 
          variant="outline" 
          onClick={onAddNote}
          className="h-7 px-2 text-xs w-full justify-start"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      )}
    </div>
  );
};

export default NotesActions;
