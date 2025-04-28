
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
      const currentPath = location.pathname + location.search;
      const returnTo = encodeURIComponent(currentPath);
      
      console.log('User not authenticated, redirecting to login with returnTo:', returnTo);
      
      toast.error('Authentication Required', {
        description: 'Please log in to access this page'
      });
      
      navigate(`/login?returnTo=${returnTo}`);
    }
  }, [isAuthenticated, isLoading, authCheckComplete, navigate, location]);

  if (isLoading || !authCheckComplete) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-brandPurple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : null;
};

export default ProtectedRoute;
