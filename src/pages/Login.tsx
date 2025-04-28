
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import AuthForm from '../components/auth/AuthForm';
import PageTitle from '../components/ui/PageTitle';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

// Add a constant to identify which login component is being used
const LOGIN_VERSION = 'main_login_component_v2';

const Login = () => {
  console.log(`Rendering Login component (${LOGIN_VERSION})`);
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, user, isAuthenticated, isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Log environment info to help with debugging
  useEffect(() => {
    console.log('Login component mounted with:');
    console.log('- Current URL:', window.location.href);
    console.log('- Environment:', import.meta.env.MODE);
    console.log('- Route location:', location);
    console.log('- Auth state:', isAuthenticated ? 'authenticated' : 'not authenticated');
    console.log('- Auth loading:', isLoading);
  }, [location, isAuthenticated, isLoading]);

  // Extract returnTo path from URL if present
  const getReturnPath = () => {
    const params = new URLSearchParams(location.search);
    const returnPath = params.get('returnTo');
    // We no longer handle invitation redirects since that page is removed
    return returnPath || '/dashboard';
  };

  // Redirect authenticated users
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const redirectPath = getReturnPath();
      console.log(`User authenticated, redirecting to: ${redirectPath}`);
      
      // Show success toast when user is authenticated
      if (!isLoading) {
        toast.success('Logged in successfully', {
          description: 'Welcome back!'
        });
      }
      
      navigate(redirectPath);
    }
  }, [isAuthenticated, isLoading, navigate, location.search]);

  // Check for email confirmation success and auto-login the user
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    
    // We'll still keep this toast for other scenarios
    if (params.get('email_reset') === 'true') {
      toast.success('Password reset email sent!', {
        description: 'Please check your inbox for instructions to reset your password.'
      });
    }
    
    if (params.get('password_reset') === 'true') {
      toast.success('Password reset successfully!', {
        description: 'You can now log in with your new password.'
      });
    }
  }, [location]);

  const handleSubmit = async (data: any) => {
    console.log('Login form submitted with:', data.email);
    setIsSubmitting(true);
    
    try {
      const { error, success } = await signIn(data.email, data.password);
      
      if (success) {
        // Toast will be shown in the useEffect above after authentication state updates
        console.log('Login successful, waiting for auth state to update');
        // The redirect will happen automatically via the useEffect above
      } else if (error) {
        console.error('Login error:', error);
        toast.error('Failed to log in', {
          description: error.message || 'Please check your credentials and try again.'
        });
      }
    } catch (err) {
      console.error('Login error:', err);
      toast.error('Something went wrong', {
        description: 'Please try again later.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="page-container">
        <PageTitle 
          title="Welcome back" 
          subtitle="Log in to access your surveys and analytics"
          alignment="center"
        />
        <AuthForm 
          mode="login" 
          onSubmit={handleSubmit} 
          isLoading={isSubmitting || isLoading} 
        />
      </div>
    </MainLayout>
  );
};

export default Login;
