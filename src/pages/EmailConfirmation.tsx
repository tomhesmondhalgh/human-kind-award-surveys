
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import PageTitle from '../components/ui/PageTitle';
import { Button } from '../components/ui/button';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const EmailConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || 'your email';
  const userData = location.state?.userData;

  useEffect(() => {
    const sendAdminNotification = async () => {
      if (userData) {
        console.log('Attempting to send admin notification with user data:', userData);
        
        try {
          const { error: notifyError } = await supabase.functions.invoke('send-admin-notification', {
            body: {
              email: userData.email,
              firstName: userData.firstName,
              lastName: userData.lastName,
              jobTitle: userData.jobTitle || "",
              schoolName: userData.schoolName || "",
              schoolAddress: userData.schoolAddress || ""
            }
          });

          if (notifyError) {
            console.error('Failed to send admin notification:', notifyError);
            throw notifyError;
          }

          console.log('Admin notification sent successfully');
        } catch (error) {
          console.error('Error in send-admin-notification:', error);
          toast.error('There was an issue notifying administrators');
        }
      }
    };

    sendAdminNotification();
  }, [userData]);

  return (
    <MainLayout>
      <div className="page-container max-w-md mx-auto text-center">
        <div className="mb-8">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-100 p-6 rounded-full">
              <Mail className="h-16 w-16 text-blue-600" />
            </div>
          </div>
          
          <PageTitle 
            title="Confirm your email" 
            subtitle="One more step to get started"
          />
          
          <div className="card p-6 mt-6">
            <p className="mb-6">
              We've sent an email to <strong className="font-medium">{email}</strong> with a confirmation link.
              Please check your inbox and click the link to activate your account.
            </p>
            
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-medium text-amber-800 mb-1">Important:</h3>
              <p className="text-amber-700 text-sm">
                You must confirm your email before you can log in. If you don't see the email, please check your spam folder.
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              <Button 
                onClick={() => navigate('/login')} 
                variant="default"
                className="w-full"
              >
                Continue to login
              </Button>
              
              <Button 
                onClick={() => navigate('/signup')} 
                variant="outline"
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to sign up
              </Button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default EmailConfirmation;
