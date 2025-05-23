
import React from 'react';
import { Link } from 'react-router-dom';
import NavLinks from './NavLinks';
import SettingsDropdown from './SettingsDropdown';

interface DesktopNavProps {
  isAuthenticated: boolean;
  hideAuthButtons: boolean;
  canManageTeam: boolean;
  isAdmin: boolean;
  handleSignOut: () => Promise<void>;
}

const DesktopNav: React.FC<DesktopNavProps> = ({
  isAuthenticated,
  hideAuthButtons,
  canManageTeam,
  isAdmin,
  handleSignOut,
}) => {
  return (
    <nav className="hidden md:flex items-center space-x-8">
      {isAuthenticated ? (
        <>
          <div className="flex items-center space-x-8">
            <NavLinks />
          </div>
          <SettingsDropdown handleSignOut={handleSignOut} />
        </>
      ) : (
        // Only show login/signup options if not on survey response or complete pages
        !hideAuthButtons && (
          <>
            <Link to="/login" className="btn-ghost">
              Log in
            </Link>
            <Link to="/signup" className="btn-primary">
              Sign up
            </Link>
          </>
        )
      )}
    </nav>
  );
};

export default DesktopNav;
