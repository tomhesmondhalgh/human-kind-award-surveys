import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react';
import { toast } from 'sonner';

const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { refreshOrganizations } = useOrganization();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired' | 'not-found'>('loading');
  const [invitation, setInvitation] = useState<any>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      console.log('No token provided in URL');
      setStatus('not-found');
      return;
    }

    // Fetch invitation immediately without waiting for auth
    fetchInvitation();
  }, [token]);

  const fetchInvitation = async () => {
    try {
      console.log('Fetching invitation with token:', token);
      
      // First, get the invitation
      const { data: invitationData, error: invitationError } = await supabase
        .from('organization_invitations')
        .select('*')
        .eq('token', token)
        .is('accepted_at', null)
        .maybeSingle();

      if (invitationError) {
        console.error('Error fetching invitation:', invitationError);
        setStatus('error');
        return;
      }

      if (!invitationData) {
        console.log('No invitation found for token:', token);
        setStatus('not-found');
        return;
      }

      console.log('Invitation found:', invitationData);

      // Check if invitation has expired
      if (new Date(invitationData.expires_at) < new Date()) {
        console.log('Invitation has expired');
        setStatus('expired');
        return;
      }

      // Now get the organization details separately
      const { data: organizationData, error: organizationError } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('id', invitationData.organization_id)
        .single();

      if (organizationError) {
        console.error('Error fetching organization:', organizationError);
        setStatus('error');
        return;
      }

      // Combine the data
      const combinedInvitation = {
        ...invitationData,
        organizations: organizationData
      };

      setInvitation(combinedInvitation);
      setStatus('success');
      console.log('Combined invitation data:', combinedInvitation);
    } catch (error) {
      console.error('Error in fetchInvitation:', error);
      setStatus('error');
    }
  };

  const acceptInvitation = async () => {
    if (!user || !invitation) {
      toast.error('Please log in to accept this invitation');
      navigate('/login', { state: { returnTo: window.location.pathname + window.location.search } });
      return;
    }

    setIsAccepting(true);
    try {
      console.log('Accepting invitation:', invitation.id);

      // Create organization membership
      const { error: membershipError } = await supabase
        .from('organization_memberships')
        .insert({
          user_id: user.id,
          organization_id: invitation.organization_id,
          role: invitation.role,
          is_primary: false
        });

      if (membershipError) {
        console.error('Error creating membership:', membershipError);
        toast.error('Failed to accept invitation');
        return;
      }

      console.log('Membership created successfully');

      // Mark invitation as accepted (only update accepted_at, not accepted_by)
      const { error: invitationError } = await supabase
        .from('organization_invitations')
        .update({ 
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      if (invitationError) {
        console.error('Error updating invitation:', invitationError);
        // Don't fail here as the membership was created successfully
      } else {
        console.log('Invitation marked as accepted');
      }

      // Refresh organizations to include the new one
      await refreshOrganizations();

      toast.success(`Successfully joined ${invitation.organizations.name}!`);
      navigate('/team');
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error('Failed to accept invitation');
    } finally {
      setIsAccepting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
              <p className="text-gray-600">Loading invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'not-found') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <XCircle className="h-12 w-12 text-red-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Invitation Not Found</h2>
              <p className="text-gray-600 mb-4">
                This invitation link is invalid or has already been used.
              </p>
              <Button onClick={() => navigate('/')} variant="outline">
                Go to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <XCircle className="h-12 w-12 text-orange-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Invitation Expired</h2>
              <p className="text-gray-600 mb-4">
                This invitation has expired. Please contact your administrator for a new invitation.
              </p>
              <Button onClick={() => navigate('/')} variant="outline">
                Go to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <XCircle className="h-12 w-12 text-red-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error</h2>
              <p className="text-gray-600 mb-4">
                There was an error processing your invitation. Please try again.
              </p>
              <div className="flex gap-2">
                <Button onClick={fetchInvitation} variant="outline">
                  Try Again
                </Button>
                <Button onClick={() => navigate('/')} variant="outline">
                  Go to Home
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Mail className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle>Team Invitation</CardTitle>
          <CardDescription>
            You've been invited to join a team
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {invitation && (
            <div className="text-center">
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <h3 className="font-semibold text-lg mb-2">
                  {invitation.organizations?.name}
                </h3>
                <p className="text-gray-600 text-sm mb-2">
                  Role: <span className="font-medium capitalize">{invitation.role}</span>
                </p>
                <p className="text-gray-500 text-xs">
                  Invited to: {invitation.email}
                </p>
              </div>

              {!isAuthenticated ? (
                <div>
                  <p className="text-gray-600 mb-4">
                    Please log in to accept this invitation.
                  </p>
                  <Button 
                    onClick={() => navigate('/login', { 
                      state: { returnTo: window.location.pathname + window.location.search } 
                    })}
                    className="w-full"
                  >
                    Log In
                  </Button>
                </div>
              ) : user?.email !== invitation.email ? (
                <div>
                  <p className="text-amber-600 mb-4 text-sm">
                    This invitation was sent to {invitation.email}, but you're logged in as {user?.email}.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button onClick={acceptInvitation} disabled={isAccepting} className="w-full">
                      {isAccepting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Accepting...
                        </>
                      ) : (
                        'Accept Anyway'
                      )}
                    </Button>
                    <Button 
                      onClick={() => navigate('/login')} 
                      variant="outline" 
                      className="w-full"
                    >
                      Switch Account
                    </Button>
                  </div>
                </div>
              ) : (
                <Button onClick={acceptInvitation} disabled={isAccepting} className="w-full">
                  {isAccepting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Accepting Invitation...
                    </>
                  ) : (
                    'Accept Invitation'
                  )}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvitation;
