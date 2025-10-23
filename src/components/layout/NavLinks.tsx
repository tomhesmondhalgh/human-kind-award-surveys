
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import SettingsDropdown from './SettingsDropdown';
import { signOutUser } from '../../utils/auth';

const NavLinks: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { isPremium } = useSubscription();

  const navLinkClass = "text-base font-medium text-gray-600 hover:text-brandPurple-600 transition-colors";
  const activeNavLinkClass = "text-purple-700";

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const handleSignOut = async () => {
    await signOutUser();
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
        Dashboard
      </Link>
      
      <Link 
        to="/surveys" 
        className={`${navLinkClass} ${isActive('/surveys') ? activeNavLinkClass : ""}`}
      >
        Survey
      </Link>
      
      <Link 
        to="/analysis" 
        className={`${navLinkClass} ${isActive('/analysis') ? activeNavLinkClass : ""}`}
      >
        Analyse
      </Link>
      
      <Link 
        to="/improve" 
        className={`${navLinkClass} ${isActive('/improve') ? activeNavLinkClass : ""}`}
      >
        Improve
      </Link>
      
      <Link 
        to="/accredit" 
        className={`${navLinkClass} ${isActive('/accredit') ? activeNavLinkClass : ""}`}
      >
        Accredit
      </Link>
      
      {!isPremium && (
        <Link 
          to="/upgrade" 
          className={`${navLinkClass} ${isActive('/upgrade') ? activeNavLinkClass : ""}`}
        >
          Upgrade
        </Link>
      )}
      
      <SettingsDropdown handleSignOut={handleSignOut} />
    </>
  );
};

export default NavLinks;
