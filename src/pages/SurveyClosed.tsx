
import React from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import PageTitle from '../components/ui/PageTitle';

const SurveyClosed = () => {
  const navigate = useNavigate();
  
  return (
    <MainLayout>
      <div className="page-container max-w-3xl mx-auto py-8">
        <PageTitle
          title="Survey Closed"
        />
        
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="h-20 w-20 text-amber-500 mx-auto mb-6">
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
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
            This survey is no longer accepting responses
          </h2>
          
          <p className="text-gray-600 mb-8 text-center">
            The survey period has ended. Thank you for your interest.
          </p>
          
          <div className="flex justify-center">
            <button 
              onClick={() => navigate('/')}
              className="btn-primary"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default SurveyClosed;
