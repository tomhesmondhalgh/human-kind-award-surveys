
import React from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../layout/MainLayout';
import PageTitle from '../ui/PageTitle';
import { AlertTriangle } from 'lucide-react';

interface SurveyNotFoundProps {
  errorMessage?: string;
}

const SurveyNotFound: React.FC<SurveyNotFoundProps> = ({ errorMessage }) => {
  const navigate = useNavigate();
  
  return (
    <MainLayout>
      <div className="page-container max-w-4xl mx-auto px-4 py-8">
        <PageTitle 
          title="Survey Not Found" 
        />
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-amber-500" />
          </div>
          <p className="text-gray-700 mb-6">
            {errorMessage || "The survey you are looking for could not be found or has expired."}
          </p>
          <p className="text-sm text-gray-500 mb-6">
            If you've recently received this link, please contact the sender to verify it's correct.
          </p>
          <button 
            onClick={() => navigate('/')}
            className="btn-primary"
          >
            Go Home
          </button>
        </div>
      </div>
    </MainLayout>
  );
};

export default SurveyNotFound;
