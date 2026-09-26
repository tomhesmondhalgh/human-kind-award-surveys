
import React from 'react';
import { Check, ArrowRight } from "lucide-react";

interface SummarySectionProps {
  summary: any;
}

const SummarySection: React.FC<SummarySectionProps> = ({ summary }) => {
  if (summary.insufficientData) {
    return <div className="mb-12">
        <h2 className="text-xl font-semibold mb-1 text-center">AI-Powered Summary</h2>
        <p className="text-sm text-gray-500 italic mb-6 text-center">This is an experimental feature. Results may not be accurate.</p>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <div className="flex flex-col items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-700 mb-2">AI-Powered Summary Coming Soon</h3>
            <p className="text-gray-500 max-w-md">
              An intelligent analysis of your survey data will be available when you have 10 or more responses.
            </p>
          </div>
        </div>
      </div>;
  }
  return <div className="mb-12">
      <h2 className="text-xl font-semibold mb-1 text-center">AI-Powered Summary</h2>
      <p className="text-sm text-gray-500 italic mb-6 text-center">This is an experimental feature. Results may not be accurate.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-green-50 rounded-lg p-6 border border-green-200">
          <h3 className="text-lg font-medium mb-4 text-green-700 flex items-center border-b border-green-200 pb-2">
            <Check className="h-5 w-5 mr-2" /> Areas of Strength
          </h3>
          <ul className="space-y-4">
            {summary.strengths && summary.strengths.length > 0 ? summary.strengths.map((strength: string, index: number) => <li key={index} className="flex items-start">
                <span className="inline-flex h-6 w-6 shrink-0 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-3 mt-0.5">
                  {index + 1}
                </span>
                <span className="text-green-800 text-left">{strength}</span>
              </li>) : <li className="text-gray-500">No strengths identified.</li>}
          </ul>
        </div>
        
        <div className="bg-amber-50 rounded-lg p-6 border border-amber-200">
          <h3 className="text-lg font-medium mb-4 text-amber-700 flex items-center border-b border-amber-200 pb-2">
            <ArrowRight className="h-5 w-5 mr-2" /> Areas for Improvement
          </h3>
          <ul className="space-y-4">
            {summary.improvements && summary.improvements.length > 0 ? summary.improvements.map((improvement: string, index: number) => <li key={index} className="flex items-start">
                <span className="inline-flex h-6 w-6 shrink-0 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mr-3 mt-0.5">
                  {index + 1}
                </span>
                <span className="text-amber-800 text-left">{improvement}</span>
              </li>) : <li className="text-gray-500">No improvements suggested.</li>}
          </ul>
        </div>
      </div>
    </div>;
};

export default SummarySection;
