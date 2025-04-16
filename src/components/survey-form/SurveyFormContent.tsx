
import React, { useEffect, useState } from 'react';
import { SurveyFormData } from '../../types/surveyForm';
import StandardQuestions from './StandardQuestions';
import CustomQuestionsSection from './CustomQuestionsSection';
import SubmitButton from './SubmitButton';
import { useSurveyCustomQuestions } from '../../hooks/useSurveyCustomQuestions';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertTriangle } from 'lucide-react';

interface SurveyFormContentProps {
  formData: SurveyFormData;
  surveyId: string | null;
  isSubmitting: boolean;
  handleInputChange: (key: string, value: string) => void;
  handleCustomQuestionResponse: (questionId: string, value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
}

const SurveyFormContent: React.FC<SurveyFormContentProps> = ({
  formData,
  surveyId,
  isSubmitting,
  handleInputChange,
  handleCustomQuestionResponse,
  handleSubmit
}) => {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isFormValidated, setIsFormValidated] = useState(false);
  
  const { 
    questions, 
    responses, 
    hasQuestions, 
    isLoading, 
    error, 
    handleResponse 
  } = useSurveyCustomQuestions(surveyId);
  
  // Report errors from custom questions to the user
  useEffect(() => {
    if (error) {
      console.error('Custom questions error:', error);
      toast.error(`Error loading custom questions: ${error}`);
    }
  }, [error]);
  
  // Sync our local responses with the parent's state
  const handleQuestionResponse = (questionId: string, value: string) => {
    handleResponse(questionId, value);
    handleCustomQuestionResponse(questionId, value);
  };
  
  // Clear validation errors when form data changes
  useEffect(() => {
    if (isFormValidated && Object.values(formData).some(value => value)) {
      // Only clear errors if the user has started filling out the form
      console.log("Checking for fields that should have validation errors cleared");
      
      // Create new error array
      let newErrors = [...validationErrors];
      let errorCleared = false;
      
      // Clear errors for standard fields that have been filled
      if (formData.role) {
        const index = newErrors.findIndex(err => err === "Role is required");
        if (index !== -1) {
          newErrors.splice(index, 1);
          errorCleared = true;
          console.log("Cleared validation error for role");
        }
      }
      
      if (formData.leadership_prioritize) {
        const index = newErrors.findIndex(err => err === "Leadership prioritisation rating is required");
        if (index !== -1) {
          newErrors.splice(index, 1);
          errorCleared = true;
          console.log("Cleared validation error for leadership_prioritize");
        }
      }
      
      if (formData.manageable_workload) {
        const index = newErrors.findIndex(err => err === "Workload rating is required");
        if (index !== -1) {
          newErrors.splice(index, 1);
          errorCleared = true;
          console.log("Cleared validation error for manageable_workload");
        }
      }
      
      if (formData.work_life_balance) {
        const index = newErrors.findIndex(err => err === "Work-life balance rating is required");
        if (index !== -1) {
          newErrors.splice(index, 1);
          errorCleared = true;
          console.log("Cleared validation error for work_life_balance");
        }
      }
      
      if (formData.health_state) {
        const index = newErrors.findIndex(err => err === "Health state rating is required");
        if (index !== -1) {
          newErrors.splice(index, 1);
          errorCleared = true;
          console.log("Cleared validation error for health_state");
        }
      }
      
      if (formData.valued_member) {
        const index = newErrors.findIndex(err => err === "Team value rating is required");
        if (index !== -1) {
          newErrors.splice(index, 1);
          errorCleared = true;
          console.log("Cleared validation error for valued_member");
        }
      }
      
      if (formData.support_access) {
        const index = newErrors.findIndex(err => err === "Support access rating is required");
        if (index !== -1) {
          newErrors.splice(index, 1);
          errorCleared = true;
          console.log("Cleared validation error for support_access");
        }
      }
      
      if (formData.confidence_in_role) {
        const index = newErrors.findIndex(err => err === "Role confidence rating is required");
        if (index !== -1) {
          newErrors.splice(index, 1);
          errorCleared = true;
          console.log("Cleared validation error for confidence_in_role");
        }
      }
      
      if (formData.org_pride) {
        const index = newErrors.findIndex(err => err === "Organisation pride rating is required");
        if (index !== -1) {
          newErrors.splice(index, 1);
          errorCleared = true;
          console.log("Cleared validation error for org_pride");
        }
      }
      
      if (formData.recommendation_score) {
        const index = newErrors.findIndex(err => err === "Recommendation score is required");
        if (index !== -1) {
          newErrors.splice(index, 1);
          errorCleared = true;
          console.log("Cleared validation error for recommendation_score");
        }
      }
      
      if (formData.leaving_contemplation) {
        const index = newErrors.findIndex(err => err === "Leaving contemplation response is required");
        if (index !== -1) {
          newErrors.splice(index, 1);
          errorCleared = true;
          console.log("Cleared validation error for leaving_contemplation");
        }
      }
      
      if (formData.doing_well) {
        const index = newErrors.findIndex(err => err === "Doing well response is required");
        if (index !== -1) {
          newErrors.splice(index, 1);
          errorCleared = true;
          console.log("Cleared validation error for doing_well");
        }
      }
      
      if (formData.improvements) {
        const index = newErrors.findIndex(err => err === "Improvements response is required");
        if (index !== -1) {
          newErrors.splice(index, 1);
          errorCleared = true;
          console.log("Cleared validation error for improvements");
        }
      }
      
      // Check custom responses
      if (formData.custom_responses && Object.keys(formData.custom_responses).length > 0) {
        Object.entries(formData.custom_responses).forEach(([questionId, value]) => {
          if (value) {
            const questionText = questions?.find(q => q.id === questionId)?.text || '';
            const errorText = `Response for "${questionText}" is required`;
            const index = newErrors.findIndex(err => err === errorText);
            
            if (index !== -1) {
              newErrors.splice(index, 1);
              errorCleared = true;
              console.log(`Cleared validation error for custom question: ${questionText}`);
            }
          }
        });
      }
      
      if (errorCleared) {
        console.log("Setting new validation errors:", newErrors);
        setValidationErrors(newErrors);
      }
    }
  }, [formData, isFormValidated, validationErrors, questions]);
  
  // Validate form before submission
  const validateAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset validation errors
    setValidationErrors([]);
    
    // Collect validation errors
    const errors: string[] = [];
    
    // Check required standard fields
    if (!formData.role) errors.push("Role is required");
    if (!formData.leadership_prioritize) errors.push("Leadership prioritisation rating is required");
    if (!formData.manageable_workload) errors.push("Workload rating is required");
    if (!formData.work_life_balance) errors.push("Work-life balance rating is required");
    if (!formData.health_state) errors.push("Health state rating is required");
    if (!formData.valued_member) errors.push("Team value rating is required");
    if (!formData.support_access) errors.push("Support access rating is required");
    if (!formData.confidence_in_role) errors.push("Role confidence rating is required");
    if (!formData.org_pride) errors.push("Organisation pride rating is required");
    if (!formData.recommendation_score) errors.push("Recommendation score is required");
    if (!formData.leaving_contemplation) errors.push("Leaving contemplation response is required");
    if (!formData.doing_well) errors.push("'Doing well' response is required");
    if (!formData.improvements) errors.push("'Improvements' response is required");
    
    // Check required custom questions (if any are required)
    if (questions && questions.length > 0) {
      questions.forEach(question => {
        // Assuming all custom questions are required for now
        if (!formData.custom_responses[question.id]) {
          errors.push(`Response for "${question.text}" is required`);
        }
      });
    }
    
    console.log("Validation errors:", errors);
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      setIsFormValidated(true);
      // Scroll to the top to show validation errors
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    // If validation passes, proceed with submission
    handleSubmit(e);
  };
  
  // Debug logging
  console.log('Custom questions in SurveyFormContent:', questions);
  console.log('Current validation errors:', validationErrors);
  console.log('Confidence in role value:', formData.confidence_in_role);
  
  return (
    <>
      {validationErrors.length > 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium">Please complete the following required fields:</div>
            <ul className="list-disc pl-5 mt-2">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
      <form 
        onSubmit={validateAndSubmit} 
        className="mt-8 space-y-8"
        aria-label="Survey form"
        noValidate
      >
        {isLoading ? (
          <div className="text-center py-6" aria-live="polite" aria-busy="true">
            <p>Loading survey questions...</p>
          </div>
        ) : (
          <>
            <StandardQuestions 
              formData={formData} 
              handleInputChange={handleInputChange} 
              validationErrors={validationErrors}
            />
            
            <CustomQuestionsSection 
              questions={questions}
              responses={responses}
              onResponse={handleQuestionResponse}
              isLoading={isLoading}
              error={error}
              validationErrors={validationErrors}
            />
          </>
        )}
        
        <div className="pt-6">
          <SubmitButton isSubmitting={isSubmitting} />
        </div>
      </form>
    </>
  );
};

export default SurveyFormContent;
