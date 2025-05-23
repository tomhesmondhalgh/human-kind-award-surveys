
import React from 'react';
import { Link } from 'react-router-dom';
import { User, ShieldCheck, LogOut, CreditCard, Users } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminRole } from '../../hooks/useAdminRole';
import { useLocation } from 'react-router-dom';

interface SettingsDropdownProps {
  handleSignOut: () => Promise<void>;
}

const SettingsDropdown: React.FC<SettingsDropdownProps> = ({ handleSignOut }) => {
  const { user } = useAuth();
  const location = useLocation();
  const { isAdmin } = useAdminRole();

  const navLinkClass = "text-base font-medium text-gray-600 hover:text-brandPurple-600 transition-colors flex items-center";
  const activeNavLinkClass = "text-purple-700";
  
  // Active state for settings - check if we're on any settings-related page
  const isSettingsActive = location.pathname === '/profile' || 
                          location.pathname === '/admin' ||
                          location.pathname === '/purchases' ||
                          location.pathname === '/team' ||
                          location.pathname === '/custom-questions';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={`${navLinkClass} ${isSettingsActive ? activeNavLinkClass : ""}`}>
          Settings
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 mt-1 p-1 bg-white">
        <DropdownMenuItem asChild>
          <Link to="/profile" className="flex items-center w-full py-2">
            <User size={16} className="mr-2" />
            Profile
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link to="/team" className="flex items-center w-full py-2">
            <Users size={16} className="mr-2" />
            Team
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link to="/purchases" className="flex items-center w-full py-2">
            <CreditCard size={16} className="mr-2" />
            My Purchases
          </Link>
        </DropdownMenuItem>
        
        {/* Show Admin link if user has admin access */}
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link to="/admin" className="flex items-center w-full py-2">
              <ShieldCheck size={16} className="mr-2" />
              Admin
            </Link>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleSignOut} className="flex items-center py-2 text-red-600 hover:text-red-700 hover:bg-red-50">
          <LogOut size={16} className="mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SettingsDropdown;
