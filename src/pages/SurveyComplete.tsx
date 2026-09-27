
import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import PageTitle from '../components/ui/PageTitle';

const SurveyComplete = () => {
  return (
    <MainLayout>
      <div className="page-container max-w-3xl mx-auto py-8">
        <PageTitle
          title="Thank you for taking part"
        />
        
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="h-20 w-20 text-green-500 mx-auto mb-6">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="w-full h-full"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
            Your response has been recorded
          </h2>
          
          <p className="text-gray-600 mb-4 text-center">
            Thank you for sharing your views. Your feedback helps your school understand what's working and what could be better for staff wellbeing.
          </p>

          <p className="text-gray-600 mb-4 text-center">
            Your answers are anonymous. We don't ask for your name or email address, and your school sees the survey results for all staff together, never linked to you.
          </p>

          <p className="text-gray-600 text-center">
            You can now close this page.
          </p>
        </div>
        
        <p className="text-sm text-gray-500 mt-8 text-center">
          The Human Kind Award helps schools and colleges look after the people who work in them.
        </p>
      </div>
    </MainLayout>
  );
};

export default SurveyComplete;
