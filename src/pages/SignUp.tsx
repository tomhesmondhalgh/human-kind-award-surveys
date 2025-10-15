import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import AuthForm from '../components/auth/AuthForm';
import PageTitle from '../components/ui/PageTitle';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '@/services/toastService';
import { supabase } from '@/integrations/supabase/client';
import { SignUpFormData } from '../types/auth';

const SIGNUP_VERSION = 'main_signup_component_v1.2';

const SignUp = () => {
  console.log(`Rendering SignUp component (${SIGNUP_VERSION})`);
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp, completeUserProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<any>(null);

  useEffect(() => {
    console.log('SignUp component mounted with:');
    console.log('- Current URL:', window.location.href);
    console.log('- Environment:', import.meta.env.MODE);
    console.log('- Route location:', location);
  }, [location]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('invitation');
    
    if (token) {
      setInvitationToken(token);
      fetchInvitationDetails(token);
    }
    
    console.log('SignUp component mounted, pathname:', location.pathname);
  }, [location.search, location.pathname]);

  const fetchInvitationDetails = async (token: string) => {
    try {
      // This is commented out as the "invitations" table doesn't exist
      // Keeping the function structure for future implementation
      console.log('Invitation token received:', token);
      // In a future implementation, we can add the invitations table
      setInvitation({
        role: 'viewer',
        organizations: { 
          school_name: 'School' 
        }
      });
    } catch (err) {
      console.error('Error fetching invitation:', err);
    }
  };

  const handleSubmit = async (data: SignUpFormData) => {
    setIsLoading(true);
    console.log('Form submitted with data:', data);
    
    try {
      // Ensure all necessary data is included
      const userData = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        jobTitle: data.jobTitle || '',
        schoolName: data.schoolName || '',
        schoolAddress: data.schoolAddress || compileCustomAddress(data),
      };
      
      console.log('Signup data being sent:', userData);
      
      const { error: signUpError, success: signUpSuccess, user } = await signUp(data.email, data.password, userData);
      
      if (!signUpSuccess) {
        throw signUpError || new Error('Failed to create account');
      }
      
      if (invitationToken) {
        toast.info('Please check your email to confirm your account before accessing your invitation');
        navigate(`/email-confirmation`, { 
          state: { 
            email: data.email,
            userData: userData 
          } 
        });
      } else {
        console.log('Signup successful, redirecting to email confirmation page');
        navigate('/email-confirmation', { 
          state: { 
            email: data.email,
            userData: userData
          } 
        });
      }
      
      toast.success('Account created successfully!');
    } catch (err: any) {
      console.error('Signup error details:', err);
      
      // Provide specific error messages based on error type
      if (err.message === 'DUPLICATE_EMAIL') {
        toast.error({
          title: 'Account already exists',
          description: 'An account with this email address already exists. Please log in or reset your password if you\'ve forgotten it.',
          duration: 6000 // Longer duration for actionable message
        });
      } else if (err.message?.includes('organization with this name already exists')) {
        toast.error({
          title: 'Organization name already exists',
          description: 'An organization with this name already exists. Please use a different name or contact support if you believe this is your organization.',
          duration: 6000
        });
      } else if (err.message?.includes('Failed to set up organization')) {
        toast.error({
          title: 'Organization setup failed',
          description: 'We couldn\'t set up your organization. Please try again or contact support if the problem persists.',
          duration: 6000
        });
      } else if (err.message?.toLowerCase().includes('password')) {
        toast.error({
          title: 'Invalid password',
          description: 'Password must be at least 6 characters long.',
          duration: 5000
        });
      } else if (err.message?.toLowerCase().includes('email') && 
                 err.message?.toLowerCase().includes('invalid')) {
        toast.error({
          title: 'Invalid email address',
          description: 'Please enter a valid email address.',
          duration: 5000
        });
      } else {
        // Generic fallback for unexpected errors
        toast.error({
          title: 'Failed to create account',
          description: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
          duration: 5000
        });
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const compileCustomAddress = (data: SignUpFormData) => {
    const addressParts = [
      data.customStreetAddress,
      data.customStreetAddress2,
      data.customCity,
      data.customCounty,
      data.customPostalCode,
      data.customCountry,
    ].filter(Boolean);
    
    return addressParts.join(', ');
  };

  return (
    <MainLayout>
      <div className="page-container">
        <PageTitle 
          title={invitation ? `Join ${invitation.organizations.school_name}` : "Create your account"} 
          subtitle={invitation 
            ? `Complete your account to accept the invitation as ${invitation?.role?.replace('_', ' ')}`
            : "Sign up to create wellbeing surveys for your staff"
          }
        />
        {invitation && (
          <div className="mb-4 text-sm text-brandPurple-100 rounded-lg p-3 bg-brandPurple-50 border border-brandPurple-100">
            <p>You've been invited to join an organisation. Create your account to continue.</p>
          </div>
        )}
        <AuthForm 
          mode="signup" 
          onSubmit={handleSubmit} 
          isLoading={isLoading}
          invitationData={invitation}
        />
      </div>
    </MainLayout>
  );
};

export default SignUp;
