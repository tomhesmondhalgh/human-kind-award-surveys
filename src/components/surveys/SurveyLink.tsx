
import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { updateTable } from '@/utils/supabaseHelpers';

interface SurveyLinkProps {
  surveyUrl: string | null;
  surveyId?: string;
  currentStatus?: string;
  onStatusChange?: () => void;
}

const SurveyLink: React.FC<SurveyLinkProps> = ({ 
  surveyUrl, 
  surveyId, 
  currentStatus,
  onStatusChange 
}) => {
  const [copied, setCopied] = useState(false);

  if (!surveyUrl) return null;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(surveyUrl);
      setCopied(true);
      toast.success("Survey link copied to clipboard", {
        description: "You can now share this link with your staff."
      });
      
      // Update survey status to 'Sent' if it's not already 'Sent' or 'Completed'
      if (surveyId && currentStatus && 
          currentStatus !== 'Sent' && 
          currentStatus !== 'Completed') {
        console.log(`Updating survey ${surveyId} status to Sent after copying link`);
        
        const { error } = await updateTable('survey_templates', { status: 'Sent' }, surveyId);
          
        if (error) {
          console.error('Error updating survey status:', error);
        } else {
          console.log('Successfully updated survey status to Sent');
          if (onStatusChange) {
            onStatusChange();
          }
        }
      }
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error("Failed to copy link", {
        description: "Please try again or copy the URL manually."
      });
    }
  };

  return (
    <div className="mt-8 p-4 border border-brandPurple-200 rounded-md bg-brandPurple-50 animate-slide-up">
      <h3 className="text-sm font-medium text-gray-900 mb-2">Survey Link</h3>
      <div className="flex items-center">
        <input
          type="text"
          readOnly
          value={surveyUrl}
          className="form-input flex-grow text-sm"
        />
        <button 
          onClick={handleCopyUrl}
          className="ml-2 btn-secondary flex items-center"
        >
          {copied ? <Check size={16} className="mr-1" /> : <Copy size={16} className="mr-1" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        Share this unique link with your staff. The link will be active until the close date.
      </p>
    </div>
  );
};

export default SurveyLink;
