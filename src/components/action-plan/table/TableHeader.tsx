
import React from 'react';

const TableHeader = () => {
  return (
    <thead>
      <tr className="bg-gray-100">
        <th className="p-2 text-left font-medium text-gray-600 border border-gray-200 w-16">Index</th>
        <th className="p-2 text-left font-medium text-gray-600 border border-gray-200 w-1/4">Descriptor</th>
        <th className="p-2 text-left font-medium text-gray-600 border border-gray-200 w-44">Status & Deadline</th>
        <th className="p-2 text-left font-medium text-gray-600 border border-gray-200 w-32">Assigned To</th>
        <th className="p-2 text-left font-medium text-gray-600 border border-gray-200">Key Actions</th>
        <th className="p-2 text-left font-medium text-gray-600 border border-gray-200 w-28">Notes</th>
      </tr>
    </thead>
  );
};

export default TableHeader;
