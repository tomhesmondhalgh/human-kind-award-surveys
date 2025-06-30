
import React from 'react';
import MainLayout from '../layout/MainLayout';
import PageTitle from '../ui/PageTitle';

const SurveyLoading: React.FC = () => {
  return (
    <MainLayout>
      <div className="page-container max-w-4xl mx-auto px-4 py-8">
        <PageTitle 
          title="Loading Survey..." 
        />
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-brandPurple-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading survey data...</p>
        </div>
      </div>
    </MainLayout>
  );
};

export default SurveyLoading;
