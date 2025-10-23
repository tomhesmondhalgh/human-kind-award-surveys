
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import AuthForm from '../components/auth/AuthForm';
import PageTitle from '../components/ui/PageTitle';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const LOGIN_VERSION = 'main_login_component_v2';

const Login = () => {
  console.log(`Rendering Login component (${LOGIN_VERSION})`);
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, user, isAuthenticated, isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);

  useEffect(() => {
    console.log('Login component mounted with:');
    console.log('- Current URL:', window.location.href);
    console.log('- Environment:', import.meta.env.MODE);
    console.log('- Route location:', location);
    console.log('- Auth state:', isAuthenticated ? 'authenticated' : 'not authenticated');
    console.log('- Auth loading:', isLoading);
  }, [location, isAuthenticated, isLoading]);

  // Handle email confirmation tokens from email links
  useEffect(() => {
    const verifyEmailToken = async () => {
      const params = new URLSearchParams(location.search);
      const token = params.get('token');
      const type = params.get('type');
      
      // Only process signup confirmation tokens
      if (!token || type !== 'signup') {
        return;
      }
      
      console.log('🔑 Email confirmation token detected, verifying...');
      setIsVerifyingToken(true);
      
      try {
        // Verify the email confirmation token
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'signup'
        });
        
        if (error) {
          console.error('❌ Email confirmation failed:', error);
          toast.error('Email confirmation failed', {
            description: 'The confirmation link may have expired. Please sign up again.'
          });
          navigate('/login', { replace: true });
        } else if (data.session) {
          console.log('✅ Email confirmed successfully, session created');
          toast.success('Email confirmed successfully!', {
            description: 'Welcome! You can now access your account.'
          });
          
          // Check for pending invitation and auto-accept
          const pendingToken = localStorage.getItem('pendingInvitationToken');
          
          if (pendingToken) {
            console.log('🎯 Pending invitation found, auto-accepting...');
            
            try {
              const { data: inviteData, error: inviteError } = await supabase.functions.invoke('accept-invitation', {
                body: { token: pendingToken }
              });
              
              if (inviteError) {
                console.error('❌ Auto-accept invitation failed:', inviteError);
                toast.error('Please accept your invitation from the team page');
              } else if (inviteData?.success) {
                console.log('✅ Invitation auto-accepted');
                toast.success('Joined organisation successfully!');
                
                // Clean up
                localStorage.removeItem('pendingInvitationToken');
                localStorage.removeItem('pendingInvitation');
                
                // Redirect to team page
                navigate('/team', { replace: true });
                return;
              }
            } catch (inviteError) {
              console.error('💥 Error auto-accepting invitation:', inviteError);
            }
          }
          
          // If no invitation or auto-accept completed, redirect to dashboard
          navigate('/dashboard', { replace: true });
        }
      } catch (error) {
        console.error('💥 Token verification exception:', error);
        toast.error('Something went wrong', {
          description: 'Please try signing in manually.'
        });
        navigate('/login', { replace: true });
      } finally {
        setIsVerifyingToken(false);
      }
    };
    
    verifyEmailToken();
  }, [location.search, navigate]);

  const getReturnPath = () => {
    // Check for returnTo in state first (from navigation with state)
    if (location.state?.returnTo) {
      return location.state.returnTo;
    }
    
    // Then check URL params
    const params = new URLSearchParams(location.search);
    const returnPath = params.get('returnTo');
    return returnPath || '/dashboard';
  };

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const redirectPath = getReturnPath();
      console.log(`User authenticated, redirecting to: ${redirectPath}`);
      
      toast.success('Logged in successfully', {
        description: 'Welcome back!'
      });
      
      navigate(redirectPath);
    }
  }, [isAuthenticated, isLoading, navigate, location.search]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    
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
        console.log('Login successful, waiting for auth state to update');
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

  // Show loading state while verifying email token
  if (isVerifyingToken) {
    return (
      <MainLayout>
        <div className="page-container">
          <div className="max-w-md mx-auto glass-card rounded-2xl p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-center">Confirming your email address...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

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
          isLoading={isSubmitting || isLoading || isVerifyingToken} 
        />
      </div>
    </MainLayout>
  );
};

export default Login;
