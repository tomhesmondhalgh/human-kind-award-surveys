
import React from 'react';
import { ActionPlanDescriptor, DescriptorStatus } from '@/types/actionPlan';
import TableHeader from './TableHeader';
import DescriptorRow from '../DescriptorRow';

interface DescriptorsTableProps {
  descriptors: ActionPlanDescriptor[];
  editingCell: { id: string; field: string } | null;
  editValue: string;
  onEditStart: (id: string, field: string, value: string) => void;
  onEditValueChange: (value: string) => void;
  onEditSave: () => void;
  onStatusChange: (id: string, status: DescriptorStatus) => void;
  onDateChange: (id: string, date: string) => void;
  onViewNotes: (id: string) => void;
  onAddNote: (id: string) => void;
}

const DescriptorsTable: React.FC<DescriptorsTableProps> = ({
  descriptors,
  editingCell,
  editValue,
  onEditStart,
  onEditValueChange,
  onEditSave,
  onStatusChange,
  onDateChange,
  onViewNotes,
  onAddNote
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <TableHeader />
        <tbody>
          {descriptors.map((descriptor) => (
            <DescriptorRow
              key={descriptor.id}
              descriptor={descriptor}
              editingCell={editingCell}
              editValue={editValue}
              onEditStart={onEditStart}
              onEditValueChange={onEditValueChange}
              onEditSave={onEditSave}
              onStatusChange={onStatusChange}
              onDateChange={onDateChange}
              onViewNotes={onViewNotes}
              onAddNote={onAddNote}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DescriptorsTable;
