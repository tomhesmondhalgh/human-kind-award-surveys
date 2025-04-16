
import React from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { SurveyWithResponses } from '../../utils/surveyUtils';
import { getSurveyStatus } from '../../utils/survey/status';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";

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
  
  const isMobile = useMediaQuery("(max-width: 768px)");

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

  // Desktop view with table
  if (!isMobile) {
    return (
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Most Recent Surveys</h2>
        <div className="bg-white rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Survey</TableHead>
                <TableHead className="w-[25%]">Date</TableHead>
                <TableHead className="w-[25%]">Status</TableHead>
                <TableHead className="w-[20%]">Responses</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {surveys.map((survey) => {
                const status = getSurveyStatus(survey.date, survey.close_date);
                
                return (
                  <TableRow key={survey.id}>
                    <TableCell className="font-medium">
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
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {formatDate(survey.date)}
                    </TableCell>
                    <TableCell>
                      <span className={`
                        inline-flex px-2.5 py-1 rounded-full text-xs font-medium
                        ${status === 'Scheduled' ? 'bg-yellow-100 text-yellow-800' : 
                          status === 'Sent' ? 'bg-blue-100 text-blue-800' : 
                          'bg-purple-100 text-purple-800'}
                      `}>
                        {status}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {survey.responses}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // Mobile view with cards
  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">Most Recent Surveys</h2>
      <div className="space-y-4">
        {surveys.map((survey) => {
          const status = getSurveyStatus(survey.date, survey.close_date);
          
          return (
            <Card key={survey.id} className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-gray-900 font-medium">
                  <Link 
                    to={`/analysis?surveyId=${survey.id}`}
                    className="hover:text-brandPurple-600 transition-colors"
                  >
                    {survey.name}
                  </Link>
                </h3>
                <span className={`
                  inline-flex px-2.5 py-1 rounded-full text-xs font-medium
                  ${status === 'Scheduled' ? 'bg-yellow-100 text-yellow-800' : 
                    status === 'Sent' ? 'bg-blue-100 text-blue-800' : 
                    'bg-purple-100 text-purple-800'}
                `}>
                  {status}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div>
                  <span className="text-gray-500">Date:</span>
                  <div className="text-gray-700">{formatDate(survey.date)}</div>
                </div>
                
                <div>
                  <span className="text-gray-500">Responses:</span>
                  <div className="text-gray-700">{survey.responses}</div>
                </div>
                
                {survey.close_date && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Closes:</span>
                    <div className="text-gray-700">{formatDate(survey.close_date)}</div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default RecentSurveysList;
