
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Lock } from 'lucide-react';
import { toast } from '../services/toastService';
import PageTitle from '../components/ui/PageTitle';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      
      if (!data.session) {
        setIsValidToken(false);
        toast.error({
          title: 'Invalid or expired password reset link',
          description: 'Please request a new password reset link'
        });
      }
    };
    
    checkSession();
  }, []);

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

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-brandPurple-50">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-brandPurple-50">
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
    </div>
  );
};

export default ResetPassword;
