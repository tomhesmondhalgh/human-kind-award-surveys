
import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  useEffect(() => {
    console.log('ProtectedRoute: Auth state check', {
      isAuthenticated,
      isLoading,
      hasUser: !!user,
      path: location.pathname
    });
    
    // Only redirect if not authenticated after auth check is complete and not loading
    if (!isLoading && !isAuthenticated && !redirectAttempted) {
      const currentPath = location.pathname + location.search;
      const returnTo = encodeURIComponent(currentPath);
      
      console.log('User not authenticated, redirecting to login with returnTo:', returnTo);
      setRedirectAttempted(true);
      
      toast.error('Authentication Required', {
        description: 'Please log in to access this page'
      });
      
      navigate(`/login?returnTo=${returnTo}`);
    }
  }, [isAuthenticated, isLoading, navigate, location, redirectAttempted, user]);

  // Show debug panel when pressing Shift+D five times
  useEffect(() => {
    let clicks = 0;
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'd' && e.shiftKey) {
        clicks++;
        if (clicks >= 5) {
          setShowDebugInfo(true);
          clicks = 0;
        }
        
        // Reset clicks after 2 seconds
        setTimeout(() => {
          clicks = 0;
        }, 2000);
      }
    };
    
    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-brandPurple-500 border-t-transparent rounded-full mb-4" />
        <p className="text-gray-600">Verifying authentication...</p>
        <p className="text-xs text-gray-400 mt-2">This should only take a moment</p>
      </div>
    );
  }

  // Debug panel (only visible when activated)
  if (showDebugInfo) {
    return (
      <>
        <div className="fixed top-0 left-0 right-0 bg-black text-white p-4 z-50 overflow-auto max-h-[80vh]">
          <h3 className="text-lg font-bold mb-2">Auth Debug Info</h3>
          <pre className="text-xs overflow-auto">
            {JSON.stringify({
              isAuthenticated,
              isLoading,
              hasUser: !!user,
              userEmail: user?.email,
              userId: user?.id,
              path: location.pathname,
              redirectAttempted
            }, null, 2)}
          </pre>
          <button 
            className="mt-2 bg-red-600 text-white px-2 py-1 rounded text-xs"
            onClick={() => setShowDebugInfo(false)}
          >
            Close Debug Panel
          </button>
        </div>
        {isAuthenticated ? children : null}
      </>
    );
  }

  return isAuthenticated ? <>{children}</> : null;
};

export default ProtectedRoute;
