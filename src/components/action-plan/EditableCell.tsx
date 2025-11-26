
import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface EditableCellProps {
  id: string;
  field: string;
  value: string;
  placeholder: string;
  isEditing: boolean;
  editValue: string;
  onEditStart: (id: string, field: string, value: string) => void;
  onEditChange: (value: string) => void;
  onEditSave: () => void;
  isMultiline?: boolean;
  readOnly?: boolean;
}

const EditableCell: React.FC<EditableCellProps> = ({
  id,
  field,
  value,
  placeholder,
  isEditing,
  editValue,
  onEditStart,
  onEditChange,
  onEditSave,
  isMultiline = false,
  readOnly = false
}) => {
  if (readOnly) {
    return (
      <div className={`${isMultiline ? 'min-h-[40px] text-sm flex items-center text-left' : 'h-8 flex items-center text-sm'}`}>
        {value || <span className="text-gray-400 text-xs">{placeholder}</span>}
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="flex">
        {isMultiline ? (
          <Textarea
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            onBlur={onEditSave}
            className="text-sm min-h-[60px]"
            autoFocus
          />
        ) : (
          <Input
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            onBlur={onEditSave}
            onKeyDown={(e) => e.key === 'Enter' && onEditSave()}
            className="h-8 text-xs"
            autoFocus
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={`cursor-pointer ${isMultiline ? 'min-h-[40px] text-sm flex items-center text-left' : 'h-8 flex items-center text-sm'}`}
      onClick={() => onEditStart(id, field, value || '')}
    >
      {value || <span className="text-gray-400 text-xs">{placeholder}</span>}
    </div>
  );
};

export default EditableCell;
