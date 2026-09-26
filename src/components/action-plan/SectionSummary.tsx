
import React from 'react';

interface SectionSummaryProps {
  title: string;
  totalCount: number;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  blockedCount: number;
  notApplicableCount: number;
  percentComplete: number;
}

const SectionSummary: React.FC<SectionSummaryProps> = ({
  title,
  completedCount,
  inProgressCount,
  notStartedCount,
  blockedCount,
  notApplicableCount,
  percentComplete
}) => {
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <h3 className="font-medium text-lg mb-2">{title}</h3>
      
      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-green-600 h-2.5 rounded-full" 
            style={{ width: `${percentComplete}%` }}
          ></div>
        </div>
        <div className="mt-1 text-sm text-gray-600">
          {percentComplete}% Complete
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex justify-between px-2 py-1 bg-green-50 rounded">
          <span>Completed:</span>
          <span className="font-medium">{completedCount}</span>
        </div>
        <div className="flex justify-between px-2 py-1 bg-blue-50 rounded">
          <span>In Progress:</span>
          <span className="font-medium">{inProgressCount}</span>
        </div>
        <div className="flex justify-between px-2 py-1 bg-gray-50 rounded">
          <span>Not Started:</span>
          <span className="font-medium">{notStartedCount}</span>
        </div>
        <div className="flex justify-between px-2 py-1 bg-red-50 rounded">
          <span>Blocked:</span>
          <span className="font-medium">{blockedCount}</span>
        </div>
        <div className="flex justify-between px-2 py-1 bg-purple-50 rounded col-span-2">
          <span>Not Applicable:</span>
          <span className="font-medium">{notApplicableCount}</span>
        </div>
      </div>
    </div>
  );
};

export default SectionSummary;
