import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Lock } from 'lucide-react';
import { toast } from '../services/toastService';
import MainLayout from '../components/layout/MainLayout';
import PageTitle from '../components/ui/PageTitle';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isValidToken, setIsValidToken] = useState(true);

  useEffect(() => {
    const verifyRecoveryToken = async () => {
      const token = searchParams.get('token');
      const type = searchParams.get('type');
      
      if (!token || type !== 'recovery') {
        console.log('❌ No valid token found in URL');
        setIsValidToken(false);
        toast.error({
          title: 'Invalid password reset link',
          description: 'Please request a new password reset link'
        });
        setIsCheckingSession(false);
        return;
      }
      
      try {
        console.log('🔑 Verifying recovery token...');
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'recovery'
        });
        
        if (error) {
          console.error('❌ Token verification failed:', error);
          setIsValidToken(false);
          toast.error({
            title: 'Invalid or expired password reset link',
            description: 'Please request a new password reset link'
          });
        } else if (data.session) {
          console.log('✅ Token verified successfully, session created');
          setIsValidToken(true);
        }
      } catch (error) {
        console.error('❌ Token verification exception:', error);
        setIsValidToken(false);
        toast.error({
          title: 'Failed to verify reset link',
          description: 'Please try again or request a new link'
        });
      } finally {
        setIsCheckingSession(false);
      }
    };
    
    verifyRecoveryToken();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error({
        title: 'Passwords do not match'
      });
      return;
    }
    
    if (password.length < 6) {
      toast.error({
        title: 'Invalid password',
        description: 'Password must be at least 6 characters'
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        throw error;
      }
      
      toast.success({
        title: 'Password updated successfully'
      });
      
      await supabase.auth.signOut();
      navigate('/login?password_reset=true');
    } catch (error: any) {
      console.error('Password update error:', error);
      toast.error({
        title: 'Failed to update password',
        description: error.message || 'Please try again later'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <MainLayout>
        <div className="page-container">
          <div className="max-w-md mx-auto glass-card rounded-2xl p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-center">Verifying your reset link...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!isValidToken) {
    return (
      <MainLayout>
        <div className="page-container">
          <PageTitle 
            title="Invalid Reset Link" 
            subtitle="The password reset link is invalid or has expired"
            alignment="center"
          />
          <div className="max-w-md mx-auto glass-card rounded-2xl p-8">
            <p className="text-center mb-6">
              Please request a new password reset link from the login page.
            </p>
            <Button 
              className="w-full" 
              onClick={() => navigate('/login')}
            >
              Return to Login
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="page-container">
        <PageTitle 
          title="Reset Your Password" 
          subtitle="Enter a new password to secure your account"
          alignment="center"
        />
        
        <div className="max-w-md w-full mx-auto glass-card rounded-2xl p-8 animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <div className="flex items-center space-x-2">
                <Lock className="h-5 w-5 text-gray-500" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter new password"
                  disabled={isLoading}
                  className="flex-1"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <div className="flex items-center space-x-2">
                <Lock className="h-5 w-5 text-gray-500" />
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm new password"
                  disabled={isLoading}
                  className="flex-1"
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>
          </form>
        </div>
      </div>
    </MainLayout>
  );
};

export default ResetPassword;
