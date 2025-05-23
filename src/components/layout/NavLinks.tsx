
import React from 'react';
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';

interface NavLinksProps {
  closeMobileMenu?: () => void;
  canManageTeam?: boolean;
  setIsMenuOpen?: (isOpen: boolean) => void;
}

interface NavLinkProps {
  to: string;
  active: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

const NavLink: React.FC<NavLinkProps> = ({ to, active, onClick, children }) => {
  return (
    <RouterNavLink
      to={to}
      className={`block py-2 px-4 text-base font-medium text-gray-600 hover:text-brandPurple-600 md:p-0 ${
        active ? 'text-purple-700' : ''
      }`}
      onClick={onClick}
    >
      {children}
    </RouterNavLink>
  );
};

export const NavLinks: React.FC<NavLinksProps> = ({ 
  closeMobileMenu,
  setIsMenuOpen
}) => {
  const location = useLocation();
  
  // Helper to check if a route is active
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  // Helper to close mobile menu when a link is clicked
  const handleLinkClick = () => {
    if (closeMobileMenu) {
      closeMobileMenu();
    }
    if (setIsMenuOpen) {
      setIsMenuOpen(false);
    }
  };
  
  // Include main navigation items plus Accredit
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-center">
      <NavLink 
        to="/dashboard" 
        active={isActive('/dashboard')} 
        onClick={handleLinkClick}
      >
        Dashboard
      </NavLink>
      
      <NavLink 
        to="/surveys" 
        active={isActive('/surveys')} 
        onClick={handleLinkClick}
      >
        Survey
      </NavLink>
      
      <NavLink 
        to="/analysis" 
        active={isActive('/analysis')} 
        onClick={handleLinkClick}
      >
        Analyse
      </NavLink>
      
      <NavLink 
        to="/improve" 
        active={isActive('/improve')} 
        onClick={handleLinkClick}
      >
        Improve
      </NavLink>
      
      <NavLink 
        to="/accredit" 
        active={isActive('/accredit')} 
        onClick={handleLinkClick}
      >
        Accredit
      </NavLink>
      
      <NavLink 
        to="/upgrade" 
        active={isActive('/upgrade')} 
        onClick={handleLinkClick}
      >
        Upgrade
      </NavLink>
    </div>
  );
};
