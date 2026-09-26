
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DescriptorStatus } from '@/types/actionPlan';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface StatusSelectorProps {
  status: DescriptorStatus;
  deadline: string | null | undefined;
  onStatusChange: (status: DescriptorStatus) => void;
  onDateChange: (date: string) => void;
  readOnly?: boolean;
}

const StatusSelector: React.FC<StatusSelectorProps> = ({
  status,
  deadline,
  onStatusChange,
  onDateChange,
  readOnly = false
}) => {
  const getStatusColor = (status: DescriptorStatus) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Blocked': return 'bg-red-100 text-red-800';
      case 'Not Started': return 'bg-gray-100 text-gray-800';
      case 'Not Applicable': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (readOnly) {
    return (
      <div className="flex flex-col space-y-2">
        <div className={cn("h-8 text-xs px-3 py-2 rounded-md", getStatusColor(status))}>
          {status}
        </div>
        {deadline && (
          <div className="flex items-center text-xs text-gray-700">
            <CalendarIcon className="h-3 w-3 mr-1 text-gray-500" />
            <span>{new Date(deadline).toLocaleDateString('en-GB')}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-2">
      <Select
        value={status}
        onValueChange={(value) => onStatusChange(value as DescriptorStatus)}
      >
        <SelectTrigger className={cn("h-8 text-xs", getStatusColor(status))}>
          <SelectValue placeholder="Select status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Not Started">Not Started</SelectItem>
          <SelectItem value="In Progress">In Progress</SelectItem>
          <SelectItem value="Blocked">Blocked</SelectItem>
          <SelectItem value="Completed">Completed</SelectItem>
          <SelectItem value="Not Applicable">Not Applicable</SelectItem>
        </SelectContent>
      </Select>
      
      <div className="flex items-center">
        <CalendarIcon className="h-3 w-3 mr-1 text-gray-500" />
        <Input
          type="date"
          value={deadline || ''}
          onChange={(e) => onDateChange(e.target.value)}
          className="h-7 text-xs"
        />
      </div>
    </div>
  );
};

export default StatusSelector;
