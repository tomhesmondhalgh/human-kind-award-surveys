
import React from 'react';
import { Card } from "../ui/card";
import { TextResponse } from '../../utils/analysisUtils';

interface TextResponsesSectionProps {
  doingWellResponses: TextResponse[];
  improvementResponses: TextResponse[];
  customQuestionResponses: any[];
}

const TextResponsesSection: React.FC<TextResponsesSectionProps> = ({
  doingWellResponses,
  improvementResponses,
  customQuestionResponses
}) => {
  const hasCustomResponses = customQuestionResponses && customQuestionResponses.length > 0;
  
  return (
    <div className="mt-12">
      <h2 className="text-xl font-semibold mb-6 text-center">Open-ended Feedback</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">What does your organisation do well?</h3>
          {doingWellResponses.length > 0 ? (
            <ul className="space-y-3">
              {doingWellResponses.map((response, index) => (
                <li key={index} className="text-sm">
                  {response.response}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No responses found.</p>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">What could your organisation do better?</h3>
          {improvementResponses.length > 0 ? (
            <ul className="space-y-3">
              {improvementResponses.map((response, index) => (
                <li key={index} className="text-sm">
                  {response.response}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No responses found.</p>
          )}
        </Card>
      </div>
      
      {hasCustomResponses && (
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-6 text-center">Custom Question Responses</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {customQuestionResponses.map((item, index) => (
              <Card key={index} className="p-6">
                <h3 className="text-lg font-medium mb-4">{item.question}</h3>
                {item.responses.length > 0 ? (
                  <ul className="space-y-3">
                    {item.responses.map((response: string, responseIndex: number) => (
                      <li key={responseIndex} className="text-sm">{response}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">No responses found.</p>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TextResponsesSection;
