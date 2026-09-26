
import React from 'react';
import SummarySection from './SummarySection';
import RecommendationScoreSection from './RecommendationScoreSection';
import LeavingContemplationChart from './LeavingContemplationChart';
import WellbeingQuestionChart from './WellbeingQuestionChart';
import TextResponsesSection from './TextResponsesSection';

interface DataWrapperProps {
  isLoading: boolean;
  summary: any;
  recommendationScore: {
    score: number;
    nationalAverage: number;
  };
  leavingContemplation: Record<string, number>;
  detailedResponses: any[];
  textResponses: {
    doingWell: any[];
    improvements: any[];
  };
  customQuestionResponses: any[];
  hasNationalAccess: boolean;
  analysisRef: React.RefObject<HTMLDivElement>;
}

const DataWrapper: React.FC<DataWrapperProps> = ({
  isLoading,
  summary,
  recommendationScore,
  leavingContemplation,
  detailedResponses,
  textResponses,
  customQuestionResponses,
  hasNationalAccess,
  analysisRef
}) => {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-brandPurple-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading data...</p>
      </div>
    );
  }
  
  return (
    <div ref={analysisRef}>
      <SummarySection summary={summary} />

      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-6 text-center">Survey Results</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <RecommendationScoreSection 
            score={recommendationScore.score} 
            nationalAverage={recommendationScore.nationalAverage} 
            hasAccess={hasNationalAccess} 
          />
          <LeavingContemplationChart 
            data={leavingContemplation} 
            hasAccess={hasNationalAccess} 
          />
        </div>
      </div>

      <div className="mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {detailedResponses.map((question, index) => (
            <WellbeingQuestionChart 
              key={index} 
              title={question.question} 
              data={question} 
              hasAccess={hasNationalAccess} 
            />
          ))}
        </div>
      </div>

      <TextResponsesSection 
        doingWellResponses={textResponses.doingWell} 
        improvementResponses={textResponses.improvements} 
        customQuestionResponses={customQuestionResponses}
      />
    </div>
  );
};

export default DataWrapper;
