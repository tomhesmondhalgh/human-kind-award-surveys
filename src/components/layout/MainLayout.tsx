
import React from 'react';
import Navbar from './Navbar';
import AuthDebugPanel from '../debug/AuthDebugPanel';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>{children}</main>
      {/* Only show debug panel in development */}
      {process.env.NODE_ENV === 'development' && <AuthDebugPanel />}
    </div>
  );
};

export default MainLayout;
