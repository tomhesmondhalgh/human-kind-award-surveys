import React from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { SurveyWithResponses } from '../../utils/surveyUtils';
import { getSurveyStatus } from '../../utils/survey/status';

interface RecentSurveysListProps {
  surveys: SurveyWithResponses[];
  isLoading: boolean;
}

const RecentSurveysList = ({ surveys, isLoading }: RecentSurveysListProps) => {
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Most Recent Surveys</h2>
        <div className="bg-white rounded-lg overflow-hidden">
          <div className="divide-y divide-gray-100">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="p-6 animate-pulse">
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-3">
                    <div className="h-5 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                  <div className="col-span-2">
                    <div className="h-4 bg-gray-200 rounded"></div>
                  </div>
                  <div className="col-span-2">
                    <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                  </div>
                  <div className="col-span-1">
                    <div className="h-4 bg-gray-200 rounded"></div>
                  </div>
                  <div className="col-span-4 flex justify-end">
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (surveys.length === 0) {
    return (
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Most Recent Surveys</h2>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
          <h2 className="text-xl font-semibold mb-2">No surveys found</h2>
          <p className="text-gray-500 mb-6">You haven't created any surveys yet or no responses have been collected.</p>
          <Link to="/new-survey" className="bg-brandPurple-500 hover:bg-brandPurple-600 text-white font-medium py-2 px-6 rounded-md transition-all duration-200 inline-block">
            Create Your First Survey
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">Most Recent Surveys</h2>
      <div className="bg-white rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-500 uppercase">
          <div className="col-span-3">Survey</div>
          <div className="col-span-3">Date</div>
          <div className="col-span-3">Status</div>
          <div className="col-span-3">Responses</div>
        </div>
        
        <div className="divide-y divide-gray-100">
          {surveys.map((survey) => {
            const status = getSurveyStatus(survey.date, survey.close_date);
            
            return (
              <div key={survey.id} className="grid grid-cols-12 gap-4 px-6 py-5 items-center hover:bg-gray-50 transition-colors">
                <div className="col-span-3">
                  <div>
                    <h3 className="text-gray-900 font-medium">
                      <Link 
                        to={`/analysis?surveyId=${survey.id}`}
                        className="hover:text-brandPurple-600 transition-colors"
                      >
                        {survey.name}
                      </Link>
                    </h3>
                    {survey.close_date && (
                      <p className="text-xs text-gray-500 mt-1">
                        Closes: {formatDate(survey.close_date)}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="col-span-3 text-gray-700">
                  {formatDate(survey.date)}
                </div>
                
                <div className="col-span-3">
                  <span className={`
                    inline-flex px-2.5 py-1 rounded-full text-xs font-medium
                    ${status === 'Scheduled' ? 'bg-yellow-100 text-yellow-800' : 
                      status === 'Sent' ? 'bg-blue-100 text-blue-800' : 
                      'bg-purple-100 text-purple-800'}
                  `}>
                    {status}
                  </span>
                </div>
                
                <div className="col-span-3 text-gray-700">
                  {survey.responses}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RecentSurveysList;
