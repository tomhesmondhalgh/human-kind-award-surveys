
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Copy, Check } from 'lucide-react';

interface SurveyLinkProps {
  surveyUrl: string;
}

const SurveyLink: React.FC<SurveyLinkProps> = ({ surveyUrl }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyClick = () => {
    navigator.clipboard.writeText(surveyUrl);
    setIsCopied(true);

    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  return (
    <div className="flex items-center space-x-4">
      <Input
        type="text"
        value={surveyUrl}
        readOnly
        className="flex-1"
      />
      <Button
        variant="secondary"
        onClick={handleCopyClick}
        disabled={isCopied}
      >
        {isCopied ? (
          <>
            <Check className="h-4 w-4 mr-2" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="h-4 w-4 mr-2" />
            Copy Link
          </>
        )}
      </Button>
    </div>
  );
};

export default SurveyLink;
