
import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, authCheckComplete, user, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [redirectAttempted, setRedirectAttempted] = useState(false);

  useEffect(() => {
    console.log('ProtectedRoute: Auth state check', {
      isAuthenticated,
      isLoading,
      authCheckComplete,
      hasUser: !!user,
      hasSession: !!session,
      path: location.pathname
    });
    
    // Only redirect if not authenticated after auth check is complete and not loading
    if (!isLoading && authCheckComplete && !isAuthenticated && !redirectAttempted) {
      const currentPath = location.pathname + location.search;
      const returnTo = encodeURIComponent(currentPath);
      
      console.log('User not authenticated, redirecting to login with returnTo:', returnTo);
      setRedirectAttempted(true);
      
      toast.error('Authentication Required', {
        description: 'Please log in to access this page'
      });
      
      navigate(`/login?returnTo=${returnTo}`);
    }
  }, [isAuthenticated, isLoading, authCheckComplete, navigate, location, redirectAttempted, user, session]);

  if (isLoading || !authCheckComplete) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-brandPurple-500 border-t-transparent rounded-full mb-4" />
        <p className="text-gray-600">Verifying authentication...</p>
        <p className="text-xs text-gray-400 mt-2">This should only take a moment</p>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : null;
};

export default ProtectedRoute;
