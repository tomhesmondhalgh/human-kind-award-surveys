
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminRole } from '../../hooks/useAdminRole';
import NavbarBrand from './NavbarBrand';
import DesktopNav from './DesktopNav';
import MobileMenu from './MobileMenu';
import { signOutUser } from '../../utils/auth';

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const { isAdmin } = useAdminRole();
  
  const isAuthenticated = !!user;
  const hideAuthButtons = location.pathname === '/survey' || location.pathname === '/survey-complete';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOutUser();
    setIsMenuOpen(false);
  };

  return (
    <header 
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        isScrolled ? 'bg-white shadow-sm' : 'bg-white'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <NavbarBrand />
          
          <DesktopNav 
            isAuthenticated={isAuthenticated}
            hideAuthButtons={hideAuthButtons}
            canManageTeam={isAdmin}
            isAdmin={isAdmin}
            handleSignOut={handleSignOut}
          />
          
          <div className="md:hidden">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-brandPurple-600 hover:bg-brandPurple-50 focus:outline-none"
            >
              <span className="sr-only">{isMenuOpen ? 'Close menu' : 'Open menu'}</span>
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>
      
      <MobileMenu 
        isOpen={isMenuOpen}
        isAuthenticated={isAuthenticated}
        hideAuthButtons={hideAuthButtons}
        isAdmin={isAdmin}
        handleSignOut={handleSignOut}
        setIsMenuOpen={setIsMenuOpen}
      />
    </header>
  );
}

export default Navbar;
