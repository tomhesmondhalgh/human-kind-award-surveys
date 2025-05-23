import React from 'react';
import { Link } from 'react-router-dom';
import NavLinks from './NavLinks';

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
  return (
    <div className={`md:hidden ${isOpen ? 'block' : 'hidden'} bg-white w-full border-t`}>
      <div className="px-2 pt-2 pb-3 space-y-1">
        {isAuthenticated ? (
          <>
            <NavLinks />
            <button
              onClick={handleSignOut}
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-brandPurple-600 hover:bg-brandPurple-50 focus:outline-none"
            >
              Sign Out
            </button>
          </>
        ) : (
          !hideAuthButtons && (
            <>
              <Link
                to="/login"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-brandPurple-600 hover:bg-brandPurple-50 focus:outline-none"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-brandPurple-600 hover:bg-brandPurple-50 focus:outline-none"
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
