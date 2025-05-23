
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminRole } from '../../hooks/useAdminRole';
import { ChevronDown, ChevronRight, User, Users, CreditCard, ShieldCheck, LogOut } from 'lucide-react';

interface MobileMenuProps {
  isOpen: boolean;
  isAuthenticated: boolean;
  hideAuthButtons: boolean;
  isAdmin: boolean;
  handleSignOut: () => Promise<void>;
  setIsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  isAuthenticated,
  hideAuthButtons,
  isAdmin,
  handleSignOut,
  setIsMenuOpen,
}) => {
  const location = useLocation();
  const { user } = useAuth();
  const { isAdmin: userIsAdmin } = useAdminRole();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const mobileLinkClass = "block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-brandPurple-600 hover:bg-brandPurple-50 focus:outline-none";
  const activeMobileLinkClass = "text-purple-700 bg-brandPurple-50";

  const handleLinkClick = () => {
    setIsMenuOpen(false);
  };

  const handleSettingsToggle = () => {
    setIsSettingsOpen(!isSettingsOpen);
  };

  return (
    <div className={`md:hidden ${isOpen ? 'block' : 'hidden'} bg-white w-full border-t`}>
      <div className="px-2 pt-2 pb-3 space-y-1">
        {isAuthenticated && user ? (
          <>
            <Link
              to="/dashboard"
              onClick={handleLinkClick}
              className={`${mobileLinkClass} ${isActive('/dashboard') ? activeMobileLinkClass : ""}`}
            >
              Dashboard
            </Link>
            
            <Link
              to="/surveys"
              onClick={handleLinkClick}
              className={`${mobileLinkClass} ${isActive('/surveys') ? activeMobileLinkClass : ""}`}
            >
              Survey
            </Link>
            
            <Link
              to="/analysis"
              onClick={handleLinkClick}
              className={`${mobileLinkClass} ${isActive('/analysis') ? activeMobileLinkClass : ""}`}
            >
              Analyse
            </Link>
            
            <Link
              to="/improve"
              onClick={handleLinkClick}
              className={`${mobileLinkClass} ${isActive('/improve') ? activeMobileLinkClass : ""}`}
            >
              Improve
            </Link>
            
            <Link
              to="/accredit"
              onClick={handleLinkClick}
              className={`${mobileLinkClass} ${isActive('/accredit') ? activeMobileLinkClass : ""}`}
            >
              Accredit
            </Link>

            {/* Settings Dropdown */}
            <div>
              <button
                onClick={handleSettingsToggle}
                className={`${mobileLinkClass} w-full text-left flex items-center justify-between`}
              >
                Settings
                {isSettingsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              
              {isSettingsOpen && (
                <div className="ml-4 mt-1 space-y-1">
                  <Link
                    to="/profile"
                    onClick={handleLinkClick}
                    className={`${mobileLinkClass} flex items-center`}
                  >
                    <User size={16} className="mr-2" />
                    Profile
                  </Link>
                  
                  <Link
                    to="/team"
                    onClick={handleLinkClick}
                    className={`${mobileLinkClass} flex items-center`}
                  >
                    <Users size={16} className="mr-2" />
                    Team
                  </Link>
                  
                  <Link
                    to="/purchases"
                    onClick={handleLinkClick}
                    className={`${mobileLinkClass} flex items-center`}
                  >
                    <CreditCard size={16} className="mr-2" />
                    My Purchases
                  </Link>
                  
                  {userIsAdmin && (
                    <Link
                      to="/admin"
                      onClick={handleLinkClick}
                      className={`${mobileLinkClass} flex items-center`}
                    >
                      <ShieldCheck size={16} className="mr-2" />
                      Admin
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 my-2"></div>

            {/* Sign Out Button */}
            <button
              onClick={() => {
                handleSignOut();
                handleLinkClick();
              }}
              className={`${mobileLinkClass} w-full text-left text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center`}
            >
              <LogOut size={16} className="mr-2" />
              Sign Out
            </button>
          </>
        ) : (
          !hideAuthButtons && (
            <>
              <Link
                to="/login"
                onClick={handleLinkClick}
                className={mobileLinkClass}
              >
                Log in
              </Link>
              <Link
                to="/signup"
                onClick={handleLinkClick}
                className={mobileLinkClass}
              >
                Sign up
              </Link>
            </>
          )
        )}
      </div>
    </div>
  );
};

export default MobileMenu;
