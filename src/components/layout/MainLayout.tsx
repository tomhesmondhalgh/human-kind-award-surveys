
import React, { useEffect } from 'react';
import Navbar from './Navbar';
import TestingModeIndicator from './TestingModeIndicator';
import CustomScriptsLoader from './CustomScriptsLoader';
import FeedbackButton from '../common/FeedbackButton';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  useEffect(() => {
    console.log('MainLayout mounted');
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-brandPurple-50">
      <Navbar />
      <main className="flex-grow w-full px-5 sm:px-20 pt-6">
        {children}
      </main>
      <footer className="py-6 border-t border-gray-100 bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} National Staff Wellbeing Survey. All rights reserved.</p>
        </div>
      </footer>
      <FeedbackButton />
      <TestingModeIndicator />
      <CustomScriptsLoader />
    </div>
  );
};

export default MainLayout;
