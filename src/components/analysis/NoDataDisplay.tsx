
import React from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../layout/MainLayout';
import PageTitle from '../ui/PageTitle';

const NoDataDisplay: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <PageTitle 
          title="Analysis" 
          subtitle="View insights from your wellbeing surveys" 
          alignment="center"
        />
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">No surveys found</h2>
          <p className="text-gray-600 mb-6">You haven't created any surveys yet or no responses have been collected.</p>
          <button 
            onClick={() => navigate('/new-survey')} 
            className="bg-brandPurple-500 hover:bg-brandPurple-600 text-white font-medium py-2 px-6 rounded-md transition-all duration-200"
          >
            Create Your First Survey
          </button>
        </div>
      </div>
    </MainLayout>
  );
};

export default NoDataDisplay;
