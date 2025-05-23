
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, FileText, Users, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const NavLinks: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  const navLinkClass = "text-base font-medium text-gray-600 hover:text-brandPurple-600 transition-colors flex items-center";
  const activeNavLinkClass = "text-purple-700";

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <Link 
        to="/dashboard" 
        className={`${navLinkClass} ${isActive('/dashboard') ? activeNavLinkClass : ""}`}
      >
        <BarChart3 size={18} className="mr-1" />
        Dashboard
      </Link>
      
      <Link 
        to="/surveys" 
        className={`${navLinkClass} ${isActive('/surveys') ? activeNavLinkClass : ""}`}
      >
        <FileText size={18} className="mr-1" />
        Surveys
      </Link>
      
      <Link 
        to="/team" 
        className={`${navLinkClass} ${isActive('/team') ? activeNavLinkClass : ""}`}
      >
        <Users size={18} className="mr-1" />
        Team
      </Link>
      
      <Link 
        to="/analysis" 
        className={`${navLinkClass} ${isActive('/analysis') ? activeNavLinkClass : ""}`}
      >
        <TrendingUp size={18} className="mr-1" />
        Analysis
      </Link>
    </>
  );
};

export default NavLinks;
