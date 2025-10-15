
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../ui/button';
import SurveyFormInputs from './SurveyFormInputs';
import { Form } from '../ui/form';
import SurveyLink from './SurveyLink';
import { InfoIcon, Save, Play, Send } from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import CustomQuestionsSelect from './CustomQuestionsSelect';
import { useNavigate } from 'react-router-dom';
import { SurveyStatus } from '@/utils/types/survey';
import { useIsMobile } from '@/hooks/use-mobile';

// Form schema
const surveyFormSchema = z.object({
  name: z.string()
    .trim()
    .min(1, { message: 'Survey name is required' })
    .min(3, { message: 'Survey name must be at least 3 characters' }),
  date: z.date({
    required_error: 'Survey date is required',
  }),
  closeDate: z.date().optional(),
  recipients: z.string().optional(),
  status: z.enum(['Saved', 'Scheduled', 'Sent', 'Completed', 'Archived']).optional(),
  distributionMethod: z.enum(['link', 'email']).default('link')
});

export type SurveyFormData = z.infer<typeof surveyFormSchema>;

interface SurveyFormProps {
  initialData?: Partial<SurveyFormData>;
  onSubmit: (data: SurveyFormData, customQuestionIds: string[]) => void;
  onPreviewSurvey?: (data: SurveyFormData, customQuestionIds: string[]) => void;
  onSendSurvey?: (data: SurveyFormData, customQuestionIds: string[]) => void;
  submitButtonText?: string;
  isEdit?: boolean;
  surveyId?: string | null;
  isSubmitting?: boolean;
  initialCustomQuestionIds?: string[];
}

const SurveyForm: React.FC<SurveyFormProps> = ({ 
  initialData, 
  onSubmit, 
  submitButtonText = 'Save Changes',
  isEdit = false,
  surveyId,
  isSubmitting = false,
  initialCustomQuestionIds = [],
  onPreviewSurvey,
  onSendSurvey
}) => {
  const [showSurveyLink, setShowSurveyLink] = useState<boolean>(false);
  const [surveyLink, setSurveyLink] = useState<string>('');
  const [selectedCustomQuestionIds, setSelectedCustomQuestionIds] = useState<string[]>(initialCustomQuestionIds);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  React.useEffect(() => {
    if (showSurveyLink && surveyId) {
      const baseUrl = window.location.origin;
      setSurveyLink(`${baseUrl}/survey/${surveyId}`);
    }
  }, [showSurveyLink, surveyId]);
  
  const form = useForm<SurveyFormData>({
    resolver: zodResolver(surveyFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      date: initialData?.date ? new Date(initialData.date) : new Date(),
      closeDate: initialData?.closeDate ? new Date(initialData.closeDate) : undefined,
      recipients: initialData?.recipients || '',
      status: initialData?.status || 'Saved',
      distributionMethod: initialData?.distributionMethod || 'link'
    }
  });
  
  const handleFormSubmit = (data: SurveyFormData) => {
    onSubmit(data, selectedCustomQuestionIds || []);
    
    if (isEdit && surveyId) {
      setShowSurveyLink(true);
    }
  };

  const handlePreviewClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // Prevent form submission
    console.log('Preview button clicked on mobile:', isMobile);
    if (!onPreviewSurvey) return;
    const data = form.getValues();
    onPreviewSurvey(data, selectedCustomQuestionIds || []);
  };
  
  const handleSendSurvey = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // Prevent form submission
    if (!onSendSurvey) return;
    const data = form.getValues();
    onSendSurvey(data, selectedCustomQuestionIds || []);
  };

  // Create a wrapper for tooltips that conditionally renders based on device
  const TooltipWrapper = ({ children, content }: { children: React.ReactNode, content: string }) => {
    if (isMobile) {
      // On mobile, skip the tooltip to avoid potential touch conflicts
      return <>{children}</>;
    }
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {children}
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{content}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
          <SurveyFormInputs form={form} />
          
          {/* Custom Questions Select */}
          <CustomQuestionsSelect
            selectedQuestionIds={selectedCustomQuestionIds || []}
            onChange={setSelectedCustomQuestionIds}
          />
          
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <TooltipWrapper content="Save survey and return to surveys list">
              <Button 
                type="submit" 
                variant="outline"
                className="w-full sm:w-auto sm:flex-1" 
                disabled={isSubmitting}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Saving...' : submitButtonText}
              </Button>
            </TooltipWrapper>
            
            <TooltipWrapper content="Save and preview how the survey will look to recipients">
              <Button 
                type="button" 
                variant="secondary" 
                className="w-full sm:w-auto sm:flex-1" 
                onClick={handlePreviewClick}
                disabled={isSubmitting}
              >
                <Play className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Please wait...' : 'Preview Survey'}
              </Button>
            </TooltipWrapper>
            
            <TooltipWrapper content={form.watch("distributionMethod") === "email" ? 
              "Save, send email invitations and mark as sent" : 
              "Save, generate shareable link and mark as sent"}>
              <Button 
                type="button" 
                variant="default" 
                className="w-full sm:w-auto sm:flex-1 bg-brandPurple-500 hover:bg-brandPurple-600" 
                onClick={handleSendSurvey}
                disabled={isSubmitting}
              >
                <Send className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Sending...' : 'Send Survey'}
              </Button>
            </TooltipWrapper>
          </div>
        </form>
      </Form>
      
      {showSurveyLink && surveyLink && (
        <div className="border border-gray-200 rounded-md p-6 bg-gray-50 mt-8">
          <h3 className="text-lg font-medium mb-4">Your Survey Link</h3>
          <SurveyLink surveyUrl={surveyLink} />
        </div>
      )}
    </div>
  );
};

export default SurveyForm;
