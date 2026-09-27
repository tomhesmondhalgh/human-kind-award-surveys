
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../ui/button';
import SurveyFormInputs from './SurveyFormInputs';
import { Form } from '../ui/form';
import { Play, Send } from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import CustomQuestionsSelect from './CustomQuestionsSelect';
import { useIsMobile } from '@/hooks/use-mobile';

import { surveyFormSchema, SurveyFormData } from './surveyFormSchema';

export type { SurveyFormData };

interface SurveyFormProps {
  initialData?: Partial<SurveyFormData>;
  onSubmit: (data: SurveyFormData, customQuestionIds: string[]) => void;
  onPreviewSurvey?: (data: SurveyFormData, customQuestionIds: string[]) => void;
  onSendSurvey?: (data: SurveyFormData, customQuestionIds: string[]) => void;
  isEdit?: boolean;
  surveyId?: string | null;
  isSubmitting?: boolean;
  initialCustomQuestionIds?: string[];
}

const SurveyForm: React.FC<SurveyFormProps> = ({ 
  initialData, 
  onSubmit, 
  isSubmitting = false,
  initialCustomQuestionIds = [],
  onPreviewSurvey,
  onSendSurvey
}) => {
  const [selectedCustomQuestionIds, setSelectedCustomQuestionIds] = useState<string[]>(initialCustomQuestionIds);
  const isMobile = useIsMobile();
  
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
  };

  // Both buttons run the zod schema first so field errors show inline and
  // nothing is saved or published with invalid data.
  const handlePreviewClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!onPreviewSurvey) return;
    form.handleSubmit((data) => onPreviewSurvey(data, selectedCustomQuestionIds || []))();
  };
  
  const handleSendSurvey = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!onSendSurvey) return;
    form.handleSubmit((data) => onSendSurvey(data, selectedCustomQuestionIds || []))();
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
            {/* Preview Button - Always shows, makes save explicit */}
            <TooltipWrapper content="Save your survey and preview how it will look to recipients">
              <Button 
                type="button" 
                variant="outline"
                className="w-full sm:w-auto sm:flex-1" 
                onClick={handlePreviewClick}
                disabled={isSubmitting}
              >
                <Play className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Saving...' : 'Save & Preview'}
              </Button>
            </TooltipWrapper>
            
            {/* Primary Action - Context-aware based on distribution method */}
            <TooltipWrapper content={
              form.watch("distributionMethod") === "email" 
                ? "Save survey and send email invitations to all recipients" 
                : "Save survey and mark as published. You'll get a shareable link."
            }>
              <Button 
                type="button" 
                variant="default" 
                className="w-full sm:w-auto sm:flex-1 bg-brandPurple-500 hover:bg-brandPurple-600" 
                onClick={handleSendSurvey}
                disabled={isSubmitting}
              >
                <Send className="mr-2 h-4 w-4" />
                {isSubmitting 
                  ? 'Saving...' 
                  : form.watch("distributionMethod") === "email" 
                    ? 'Send Invitations' 
                    : 'Publish Survey'
                }
              </Button>
            </TooltipWrapper>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default SurveyForm;
