
import React from 'react';
import { Button } from '../ui/button';

const PreviewModeFooter: React.FC = () => {
  return (
    <div className="mt-8 pt-4 border-t border-gray-200">
      <div className="bg-yellow-50 p-4 rounded-md">
        <p className="text-yellow-700 text-sm font-medium">Preview Mode</p>
        <p className="text-yellow-600 text-sm mt-1">This is a preview of how your survey will appear to participants.</p>
      </div>
      <div className="mt-4 flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => window.close()}
        >
          Close Preview
        </Button>
      </div>
    </div>
  );
};

export default PreviewModeFooter;
