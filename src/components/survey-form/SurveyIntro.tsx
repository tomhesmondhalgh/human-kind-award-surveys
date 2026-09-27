
import React from 'react';
import { SurveyTemplate } from '../../utils/types/survey';
import { MIN_RESPONSES_TO_SHOW_RESULTS } from '../../lib/anonymity';

interface SurveyIntroProps {
  surveyTemplate?: SurveyTemplate | null;
  name?: string;
}

const SurveyIntro: React.FC<SurveyIntroProps> = ({ surveyTemplate, name }) => {
  // Use surveyTemplate name if available, otherwise use the direct name prop
  const displayName = surveyTemplate?.name || name || '';
  
  return (
    <>
      <div className="mb-8 text-center">
        <img 
          src="/human-kind-logo.png" 
          alt="Our Human Kind Logo" 
          className="mx-auto max-h-20 mb-4"
        />
        <h1 className="text-2xl font-bold text-brandPurple-600 mb-2">Staff Wellbeing Survey</h1>
        <h2 className="text-lg text-gray-600">{displayName}</h2>
      </div>
      
      <div className="mb-8 text-left">
        <p className="text-gray-700">
          Completing this survey will only take around 5 minutes, but it will give your school or college 
          crucial information that will help them improve the wellbeing of staff. You'll also be helping to 
          improve staff wellbeing on a national level. This is an anonymous survey, please do not include 
          any personal identifiable data.
        </p>
        <p className="text-gray-700 mt-3">
          Results are only shown to your school or college once at least {MIN_RESPONSES_TO_SHOW_RESULTS} colleagues
          have responded, and your answers are never linked to you.
        </p>
      </div>
    </>
  );
};

export default SurveyIntro;
