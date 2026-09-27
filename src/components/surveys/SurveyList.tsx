
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Send, Copy, Edit, QrCode } from 'lucide-react';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { Badge } from "@/components/ui/badge";
import { useMediaQuery } from '@/hooks/use-media-query';
import { getCloseDateDisplay } from '@/utils/survey/closeDate';
import { OrganizationRole } from '@/types/organizations';
import { canEditContent } from '@/utils/organizationPermissions';

export interface SurveyListItem {
  id: string;
  name: string;
  date: string;
  formattedDate: string;
  status: 'Saved' | 'Scheduled' | 'Sent' | 'Completed' | 'Archived';
  responseCount: number;
  closeDate?: string;
  closeDisplayDate?: string;
  url?: string;
  emails?: string;
}

interface SurveyListProps {
  surveys: SurveyListItem[];
  onShare?: (survey: SurveyListItem) => void;
  userRole?: OrganizationRole;
}

const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'Sent':
      return 'default'; // Blue
    case 'Completed':
      return 'secondary'; // Grey
    case 'Archived':
      return 'outline'; // Outlined grey
    case 'Scheduled':
      return 'default'; // Blue
    case 'Saved':
      return 'outline'; // Outlined
    default:
      return 'secondary';
  }
};

const SurveyList: React.FC<SurveyListProps> = ({ surveys, onShare, userRole }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const canEdit = canEditContent(userRole);

  // Copying a link never changes the survey's status. Only live ('Sent')
  // surveys offer a link; drafts must be published from the editor.
  const copyToClipboard = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Survey link copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error("Failed to copy link");
    }
  };

  const handleEditClick = (id: string) => {
    if (!canEdit) {
      toast.error("You don't have permission to edit surveys");
      return;
    }
    
    console.log(`Navigating to edit survey: ${id}`);
    navigate(`/survey-editor/${id}`);
  };
  
  const handleSendReminder = async (survey: SurveyListItem) => {
    if (!canEdit) {
      toast.error("You don't have permission to send reminders");
      return;
    }
    
    if (!survey.emails || !survey.emails.trim()) {
      toast.error("No email recipients", {
        description: "This survey doesn't have any email recipients configured."
      });
      return;
    }
    
    try {
      setSendingReminder(survey.id);
      
      const emails = survey.emails
        .split(',')
        .map(email => email.trim())
        .filter(email => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
      
      if (emails.length === 0) {
        toast.error("No valid email addresses", {
          description: "Please check the email addresses and try again."
        });
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('send-survey-email', {
        body: {
          surveyId: survey.id,
          surveyName: survey.name,
          emails,
          surveyUrl: survey.url,
          isReminder: true
        }
      });
      
      if (error) {
        throw error;
      }
      
      console.log("Reminder sending result:", data);
      
      if (data.success) {
        toast.success("Reminders sent successfully", {
          description: `Sent to ${data.count} recipients.`
        });
      } else {
        throw new Error(data.error || "Failed to send reminders");
      }
    } catch (error) {
      console.error("Error sending reminders:", error);
      toast.error("Failed to send reminders", {
        description: "There was a problem sending the reminders. Please try again."
      });
    } finally {
      setSendingReminder(null);
    }
  };

  if (surveys.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
        <h2 className="text-xl font-semibold mb-2">No surveys found</h2>
        <p className="text-gray-500 mb-6">You haven't created any surveys yet or no responses have been collected.</p>
        <Link to="/survey-editor" className="bg-brandPurple-500 hover:bg-brandPurple-600 text-white font-medium py-2 px-6 rounded-md transition-all duration-200 inline-block">
          Create Your First Survey
        </Link>
      </div>
    );
  }

  if (!isMobile) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">      
        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-500 uppercase">
          <div className="col-span-3">Survey</div>
          <div className="col-span-2">Date</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1">Responses</div>
          <div className="col-span-4 text-right">Actions</div>
        </div>
        
        <div className="divide-y divide-gray-100">
          {surveys.map((survey) => (
            <div key={survey.id} className="grid grid-cols-12 gap-4 px-6 py-5 items-center hover:bg-gray-50 transition-colors">
              <div className="col-span-3">
                <div>
                  <h3 className="text-gray-900 font-medium">
                    {canEdit ? (
                      <button 
                        onClick={() => handleEditClick(survey.id)}
                        className="hover:text-brandPurple-600 transition-colors text-left"
                      >
                        {survey.name}
                      </button>
                    ) : (
                      <span>{survey.name}</span>
                    )}
                  </h3>
            {(() => {
              const { text, className } = getCloseDateDisplay(survey.closeDate);
              return <p className={`text-xs mt-1 ${className}`}>{text}</p>;
            })()}
          </div>
        </div>
        
        <div className="col-span-2 text-gray-700">
          {survey.formattedDate}
        </div>
        
        <div className="col-span-2">
          <Badge variant={getStatusBadgeVariant(survey.status)}>
            {survey.status}
          </Badge>
        </div>
              
              <div className="col-span-1 text-gray-700">
                {survey.responseCount}
              </div>
              
              <div className="col-span-4 flex flex-wrap justify-end gap-x-4 gap-y-2">
                {survey.status === 'Sent' && canEdit && survey.emails && survey.emails.trim() !== '' && (
                  <button 
                    onClick={() => handleSendReminder(survey)}
                    className="flex items-center text-sm text-gray-500 hover:text-brandPurple-600 transition-colors whitespace-nowrap"
                    title="Send reminder to participants"
                    disabled={sendingReminder === survey.id}
                  >
                    <Send size={16} className="mr-1" />
                    <span>
                      {sendingReminder === survey.id ? 'Sending...' : 'Remind'}
                    </span>
                  </button>
                )}
                
                {survey.url && survey.status === 'Sent' && (
                  <button 
                    onClick={() => copyToClipboard(survey.id, survey.url!)}
                    className="flex items-center text-sm text-gray-500 hover:text-brandPurple-600 transition-colors whitespace-nowrap"
                    title="Copy survey link to clipboard"
                  >
                    <Copy size={16} className="mr-1" />
                    <span>{copiedId === survey.id ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                )}
                
                {survey.status === 'Sent' && onShare && (
                  <button 
                    onClick={() => onShare(survey)}
                    className="flex items-center text-sm text-gray-500 hover:text-brandPurple-600 transition-colors whitespace-nowrap"
                    title="QR code and suggested email for staff"
                  >
                    <QrCode size={16} className="mr-1" />
                    <span>Share</span>
                  </button>
                )}
                
                {survey.status === 'Saved' && canEdit && (
                  <span
                    className="flex items-center text-sm text-muted-foreground whitespace-nowrap"
                    title="Open Edit and click Publish to get a shareable link"
                  >
                    Draft: publish to share
                  </span>
                )}
                
                {canEdit && (
                  <button 
                    onClick={() => handleEditClick(survey.id)}
                    className="flex items-center text-sm text-gray-500 hover:text-brandPurple-600 transition-colors whitespace-nowrap"
                    title="Edit survey details"
                  >
                    <Edit size={16} className="mr-1" />
                    <span>Edit</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {surveys.map((survey) => (
        <div key={survey.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-gray-900 font-medium">
              {canEdit ? (
                <button 
                  onClick={() => handleEditClick(survey.id)}
                  className="hover:text-brandPurple-600 transition-colors text-left"
                >
                  {survey.name}
                </button>
              ) : (
                <span>{survey.name}</span>
              )}
            </h3>
          <Badge variant={getStatusBadgeVariant(survey.status)}>
            {survey.status}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
          <div>
            <span className="text-gray-500">Date:</span>
            <div className="text-gray-700">{survey.formattedDate}</div>
          </div>
          
          <div>
            <span className="text-gray-500">Responses:</span>
            <div className="text-gray-700">{survey.responseCount}</div>
          </div>
          
          <div className="col-span-2">
            {(() => {
              const { text, className } = getCloseDateDisplay(survey.closeDate);
              return (
                <>
                  <span className="text-gray-500">Closes:</span>
                  <div className={`${className}`}>{text}</div>
                </>
              );
            })()}
          </div>
        </div>
          
          <div className="border-t border-gray-100 pt-3 flex flex-wrap gap-3">
            {survey.status === 'Sent' && canEdit && survey.emails && survey.emails.trim() !== '' && (
              <button 
                onClick={() => handleSendReminder(survey)}
                className="flex items-center text-sm text-gray-500 hover:text-brandPurple-600 transition-colors"
                disabled={sendingReminder === survey.id}
              >
                <Send size={16} className="mr-1" />
                <span>
                  {sendingReminder === survey.id ? 'Sending...' : 'Remind'}
                </span>
              </button>
            )}
            
            {survey.url && survey.status === 'Sent' && (
              <button 
                onClick={() => copyToClipboard(survey.id, survey.url!)}
                className="flex items-center text-sm text-gray-500 hover:text-brandPurple-600 transition-colors"
              >
                <Copy size={16} className="mr-1" />
                <span>{copiedId === survey.id ? 'Copied!' : 'Copy Link'}</span>
              </button>
            )}
            
            {survey.status === 'Sent' && onShare && (
              <button 
                onClick={() => onShare(survey)}
                className="flex items-center text-sm text-gray-500 hover:text-brandPurple-600 transition-colors"
              >
                <QrCode size={16} className="mr-1" />
                <span>Share</span>
              </button>
            )}
            
            {survey.status === 'Saved' && canEdit && (
              <span
                className="flex items-center text-sm text-muted-foreground whitespace-nowrap"
                title="Open Edit and click Publish to get a shareable link"
              >
                Draft: publish to share
              </span>
            )}
            
            {canEdit && (
              <button 
                onClick={() => handleEditClick(survey.id)}
                className="flex items-center text-sm text-gray-500 hover:text-brandPurple-600 transition-colors"
              >
                <Edit size={16} className="mr-1" />
                <span>Edit</span>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SurveyList;
