
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
      toast.error('Failed to create account');
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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-brandPurple-50">
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
    </div>
  );
};

export default SignUp;
