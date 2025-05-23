
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, FileText, Users, TrendingUp, User, ShieldCheck, CreditCard } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminRole } from '../../hooks/useAdminRole';

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
  const { isAdmin: isAdminRole } = useAdminRole();

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const mobileLinkClass = "block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-brandPurple-600 hover:bg-brandPurple-50 focus:outline-none flex items-center";
  const activeMobileLinkClass = "text-purple-700 bg-brandPurple-50";

  const handleLinkClick = () => {
    setIsMenuOpen(false);
  };

  return (
    <div className={`md:hidden ${isOpen ? 'block' : 'hidden'} bg-white w-full border-t`}>
      <div className="px-2 pt-2 pb-3 space-y-1">
        {isAuthenticated && user ? (
          <>
            {/* Main Navigation Links */}
            <Link
              to="/dashboard"
              onClick={handleLinkClick}
              className={`${mobileLinkClass} ${isActive('/dashboard') ? activeMobileLinkClass : ""}`}
            >
              <BarChart3 size={18} className="mr-2" />
              Dashboard
            </Link>
            
            <Link
              to="/surveys"
              onClick={handleLinkClick}
              className={`${mobileLinkClass} ${isActive('/surveys') ? activeMobileLinkClass : ""}`}
            >
              <FileText size={18} className="mr-2" />
              Surveys
            </Link>
            
            <Link
              to="/team"
              onClick={handleLinkClick}
              className={`${mobileLinkClass} ${isActive('/team') ? activeMobileLinkClass : ""}`}
            >
              <Users size={18} className="mr-2" />
              Team
            </Link>
            
            <Link
              to="/analysis"
              onClick={handleLinkClick}
              className={`${mobileLinkClass} ${isActive('/analysis') ? activeMobileLinkClass : ""}`}
            >
              <TrendingUp size={18} className="mr-2" />
              Analysis
            </Link>

            {/* Divider */}
            <div className="border-t border-gray-200 my-2"></div>

            {/* Settings Links */}
            <Link
              to="/profile"
              onClick={handleLinkClick}
              className={`${mobileLinkClass} ${isActive('/profile') ? activeMobileLinkClass : ""}`}
            >
              <User size={18} className="mr-2" />
              Profile
            </Link>
            
            <Link
              to="/purchases"
              onClick={handleLinkClick}
              className={`${mobileLinkClass} ${isActive('/purchases') ? activeMobileLinkClass : ""}`}
            >
              <CreditCard size={18} className="mr-2" />
              My Purchases
            </Link>
            
            {isAdminRole && (
              <Link
                to="/admin"
                onClick={handleLinkClick}
                className={`${mobileLinkClass} ${isActive('/admin') ? activeMobileLinkClass : ""}`}
              >
                <ShieldCheck size={18} className="mr-2" />
                Admin
              </Link>
            )}

            {/* Sign Out Button */}
            <button
              onClick={() => {
                handleSignOut();
                handleLinkClick();
              }}
              className={`${mobileLinkClass} w-full text-left text-red-600 hover:text-red-700 hover:bg-red-50`}
            >
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
