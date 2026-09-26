
import React from 'react';

interface SurveyFormContainerProps {
  children: React.ReactNode;
}

const SurveyFormContainer: React.FC<SurveyFormContainerProps> = ({
  children
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="bg-white shadow-md rounded-lg p-6 md:p-8 border border-purple-100">
          {children}
        </div>
      </div>
    </div>
  );
};

export default SurveyFormContainer;
