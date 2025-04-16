
import React from 'react';
import { SurveyFormData } from '../../types/surveyForm';
import RatingQuestion from './RatingQuestion';
import RadioQuestion from './RadioQuestion';
import TextQuestion from './TextQuestion';
import { frequencyOptions } from './constants';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface StandardQuestionsProps {
  formData: SurveyFormData;
  handleInputChange: (key: string, value: string) => void;
  validationErrors?: string[];
}

const StandardQuestions: React.FC<StandardQuestionsProps> = ({
  formData,
  handleInputChange,
  validationErrors = []
}) => {
  // Map of error messages for specific fields
  const fieldErrorMessages: Record<string, string> = {
    'role': 'Role is required',
    'leadership_prioritize': 'Leadership prioritisation rating is required',
    'manageable_workload': 'Workload rating is required',
    'work_life_balance': 'Work-life balance rating is required',
    'health_state': 'Health state rating is required',
    'valued_member': 'Team value rating is required',
    'support_access': 'Support access rating is required',
    'confidence_in_role': 'Role confidence rating is required',
    'org_pride': 'Organisation pride rating is required',
    'recommendation_score': 'Recommendation score is required',
    'leaving_contemplation': 'Leaving contemplation response is required',
    'doing_well': 'Doing well response is required',
    'improvements': 'Improvements response is required'
  };

  // Check if a field has a validation error
  const hasError = (fieldName: string): boolean => {
    // Direct match for field error message
    const errorMessage = fieldErrorMessages[fieldName];
    if (!errorMessage) return false;
    
    console.log(`Checking field: ${fieldName}, error message: ${errorMessage}`);
    
    // Check if this exact error message exists in the validation errors
    const found = validationErrors.includes(errorMessage);
    
    if (found) {
      console.log(`Field ${fieldName} has validation error`);
    }
    
    return found;
  };

  // Helper function to get error message for a field
  const getErrorMessage = (fieldName: string): string | undefined => {
    if (hasError(fieldName)) {
      return fieldErrorMessages[fieldName];
    }
    return undefined;
  };

  return (
    <div className="space-y-16">
      <div className="mb-10">
        <label className="text-lg font-medium mb-3 block text-left">
          What Is Your Role? <span className="text-red-500">*</span>
        </label>
        <Select 
          value={formData.role} 
          onValueChange={(value) => handleInputChange('role', value)}
          required
        >
          <SelectTrigger className={`w-full ${hasError('role') ? 'border-red-500 ring-1 ring-red-500' : ''}`}>
            <SelectValue placeholder="Select your role" />
          </SelectTrigger>
          <SelectContent>
            {['Senior Leader', 'Middle or Team Leader', 'Teacher / Trainer', 'Teaching Assistant', 'Support Staff', 'Other'].map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasError('role') && (
          <p className="text-red-500 text-sm mt-1">Role is required</p>
        )}
      </div>
      
      <RatingQuestion
        label="Leadership Prioritise Staff Wellbeing In Our Organisation"
        name="leadership_prioritize"
        value={formData.leadership_prioritize}
        onChange={(e) => handleInputChange('leadership_prioritize', e.target.value)}
        required
        error={getErrorMessage('leadership_prioritize')}
      />
      
      <RatingQuestion
        label="I Have A Manageable Workload"
        name="manageable_workload"
        value={formData.manageable_workload}
        onChange={(e) => handleInputChange('manageable_workload', e.target.value)}
        required
        error={getErrorMessage('manageable_workload')}
      />
      
      <RatingQuestion
        label="I Have A Good Work-Life Balance"
        name="work_life_balance"
        value={formData.work_life_balance}
        onChange={(e) => handleInputChange('work_life_balance', e.target.value)}
        required
        error={getErrorMessage('work_life_balance')}
      />
      
      <RatingQuestion
        label="I Am In Good Physical And Mental Health"
        name="health_state"
        value={formData.health_state}
        onChange={(e) => handleInputChange('health_state', e.target.value)}
        required
        error={getErrorMessage('health_state')}
      />
      
      <RatingQuestion
        label="I Feel Like A Valued Member Of The Team"
        name="valued_member"
        value={formData.valued_member}
        onChange={(e) => handleInputChange('valued_member', e.target.value)}
        required
        error={getErrorMessage('valued_member')}
      />
      
      <RatingQuestion
        label="I Have Access To Support When I Need It"
        name="support_access"
        value={formData.support_access}
        onChange={(e) => handleInputChange('support_access', e.target.value)}
        required
        error={getErrorMessage('support_access')}
      />
      
      <RatingQuestion
        label="I Feel Confident Performing My Role And Am Given Chances To Grow"
        name="confidence_in_role"
        value={formData.confidence_in_role}
        onChange={(e) => handleInputChange('confidence_in_role', e.target.value)}
        required
        error={getErrorMessage('confidence_in_role')}
      />
      
      <RatingQuestion
        label="I Am Proud To Be Part Of This Organisation"
        name="org_pride"
        value={formData.org_pride}
        onChange={(e) => handleInputChange('org_pride', e.target.value)}
        required
        error={getErrorMessage('org_pride')}
      />
      
      <RadioQuestion
        label="On A Scale Of 1-10 How Likely Are You To Recommend This Organisation To Others As A Great Place To Work?"
        name="recommendation_score"
        options={['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']}
        value={formData.recommendation_score}
        onChange={(e) => handleInputChange('recommendation_score', e.target.value)}
        error={getErrorMessage('recommendation_score')}
        required
        useSlider={true}
      />
      
      <RadioQuestion
        label="In The Last 6 Months I Have Contemplated Leaving My Role"
        name="leaving_contemplation"
        options={frequencyOptions}
        value={formData.leaving_contemplation}
        onChange={(e) => handleInputChange('leaving_contemplation', e.target.value)}
        required
        error={getErrorMessage('leaving_contemplation')}
      />
      
      <TextQuestion
        label="What Is Your School Doing Well To Support Staff Wellbeing?"
        name="doing_well"
        value={formData.doing_well}
        onChange={(e) => handleInputChange('doing_well', e.target.value)}
        required
        error={getErrorMessage('doing_well')}
      />
      
      <TextQuestion
        label="What Could Your School Do Better To Support Staff Wellbeing?"
        name="improvements"
        value={formData.improvements}
        onChange={(e) => handleInputChange('improvements', e.target.value)}
        required
        error={getErrorMessage('improvements')}
      />
    </div>
  );
};

export default StandardQuestions;
