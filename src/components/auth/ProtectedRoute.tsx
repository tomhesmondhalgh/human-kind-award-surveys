
import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, authCheckComplete } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log('ProtectedRoute: Auth state check', {
      isAuthenticated,
      isLoading,
      authCheckComplete,
      path: location.pathname
    });
    
    if (!isLoading && authCheckComplete && !isAuthenticated) {
      // Store the path the user was trying to access for later redirect
      const currentPath = location.pathname + location.search;
      const returnTo = encodeURIComponent(currentPath);
      
      console.log('User not authenticated, redirecting to login with returnTo:', returnTo);
      
      toast.error('Please log in to access this page');
      
      // Redirect to login with the return path
      navigate(`/login?returnTo=${returnTo}`);
    }
  }, [isAuthenticated, isLoading, authCheckComplete, navigate, location]);

  // Show loading spinner while checking auth state
  if (isLoading || !authCheckComplete) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-brandPurple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Render protected content only if authenticated
  return isAuthenticated ? <>{children}</> : null;
};

export default ProtectedRoute;
