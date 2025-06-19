import React, { useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useOrganization } from '../contexts/OrganizationContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Users, UserPlus, Mail, Crown, Edit3, Eye, Trash2, Building, AlertCircle, RefreshCw } from 'lucide-react';
import { useTeamMembers } from '../components/team/hooks/useTeamMembers';
import { useTeamInvitations } from '../components/team/hooks/useTeamInvitations';
import { Skeleton } from '../components/ui/skeleton';
import TeamInviteModal from '../components/team/TeamInviteModal';
import ConfirmDeleteModal from '../components/team/ConfirmDeleteModal';
import OrganizationsList from '../components/team/OrganizationsList';
import { useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { validateAndRefreshSession } from '../utils/auth/sessionUtils';

const Team = () => {
  const { user, isAuthenticated, authCheckComplete } = useAuth();
  const { currentOrganization, isLoading: orgLoading, error: orgError } = useOrganization();
  const [memberToDelete, setMemberToDelete] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState('members');
  const location = useLocation();
  const navigate = useNavigate();

  // Parse organization ID from URL if present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const orgId = params.get('organization');
    
    if (orgId && currentOrganization?.id !== orgId) {
      // If URL has an org ID that doesn't match current, switch to it
      // This will be handled by OrganizationContext
    }
    
    // Always set to members tab since organizations tab is hidden
    setActiveTab('members');
  }, [location, currentOrganization, orgLoading]);

  const {
    members,
    isLoading: membersLoading,
    isError: membersError,
    error: membersErrorDetails,
    refetch: refetchMembers,
    isInviteModalOpen,
    setIsInviteModalOpen,
    sendInvitation,
    removeMember,
    resendInvitation
  } = useTeamMembers(currentOrganization?.id);

  const {
    invitations,
    invitationsLoading
  } = useTeamInvitations(currentOrganization?.id);

  // Function to handle sending invitations that returns void
  const handleSendInvitation = async (data: { email: string; role: string }) => {
    await sendInvitation.mutateAsync(data);
    return;
  };

  // Function to handle resending invitations that returns void
  const handleResendInvitation = async (invitationId: string) => {
    try {
      await resendInvitation.mutateAsync(invitationId);
    } catch (error) {
      console.error('Failed to resend invitation:', error);
    }
  };

  if (orgLoading || !authCheckComplete) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </MainLayout>
    );
  }

  // Show authentication error if not authenticated
  if (!isAuthenticated) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
            <p className="text-gray-600 mb-6">Please log in to access team management.</p>
            <Button onClick={() => navigate('/login')} className="bg-brandPurple-500 hover:bg-brandPurple-600">
              Log In
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const currentUserMembership = members?.find(m => m.user_id === user?.id);
  const canManageTeam = currentUserMembership?.role === 'admin';

  // Debug logging for team management permissions
  console.log('Team management debug:', {
    currentUserMembership,
    canManageTeam,
    membersCount: members?.length || 0,
    hasCurrentOrganization: !!currentOrganization,
    membersError,
    membersErrorDetails: membersErrorDetails?.message
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default';
      case 'editor': return 'secondary';
      case 'viewer': return 'outline';
      default: return 'outline';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown size={12} />;
      case 'editor': return <Edit3 size={12} />;
      case 'viewer': return <Eye size={12} />;
      default: return null;
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    try {
      await removeMember.mutateAsync(memberId);
      setMemberToDelete(null);
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const handleRetryLoadingMembers = () => {
    refetchMembers();
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
              <p className="text-gray-600">
                {currentOrganization 
                  ? `Manage members and permissions for ${currentOrganization.name}`
                  : 'No organisation selected - please contact support to set up your organisation'}
              </p>
            </div>

            {currentOrganization && canManageTeam && (
              <Button 
                onClick={() => setIsInviteModalOpen(true)} 
                className="flex items-center gap-2"
              >
                <UserPlus size={16} />
                Invite Member
              </Button>
            )}
          </div>

          {/* Show current organization info */}
          {currentOrganization && (
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Building className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">{currentOrganization.name}</p>
                    <p className="text-sm text-gray-500">Current Organisation</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentOrganization ? (
            <>
              {/* Show error state for members loading with retry option */}
              {membersError && (
                <Card className="mb-6 border-red-200 bg-red-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertCircle size={16} />
                      <span className="font-medium">Failed to load team members</span>
                    </div>
                    <p className="text-sm text-red-600 mt-1">
                      {membersErrorDetails?.message || 'There was an error loading the team members. Please try again.'}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-700 border-red-300 hover:bg-red-100"
                        onClick={handleRetryLoadingMembers}
                        disabled={membersLoading}
                      >
                        {membersLoading ? (
                          <>
                            <RefreshCw size={12} className="mr-1 animate-spin" />
                            Retrying...
                          </>
                        ) : (
                          <>
                            <RefreshCw size={12} className="mr-1" />
                            Retry
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-700 border-red-300 hover:bg-red-100"
                        onClick={() => window.location.reload()}
                      >
                        Refresh Page
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Members</p>
                        <p className="text-xl font-semibold">{members?.length || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Crown className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Administrators</p>
                        <p className="text-xl font-semibold">
                          {members?.filter(m => m.role === 'admin').length || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Mail className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Pending Invitations</p>
                        <p className="text-xl font-semibold">{invitations?.length || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Team Members */}
              <Card>
                <CardHeader>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>
                    Current members of your organisation and their roles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {membersLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : members?.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 mb-2">No team members found</p>
                      <p className="text-sm text-gray-400">
                        {canManageTeam ? 'Click "Invite Member" to add your first team member.' : 'Contact an administrator to invite team members.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {members?.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-600">
                                {member.profile?.first_name?.[0]?.toUpperCase() || 
                                member.profile?.last_name?.[0]?.toUpperCase() || '?'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">
                                {member.profile?.first_name} {member.profile?.last_name}
                              </p>
                              <p className="text-sm text-gray-500">{member.profile?.job_title}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant={getRoleBadgeVariant(member.role)} className="flex items-center gap-1">
                              {getRoleIcon(member.role)}
                              {member.role}
                            </Badge>
                            {canManageTeam && member.user_id !== user?.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setMemberToDelete(member.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 size={16} />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pending Invitations */}
              {invitations && invitations.length > 0 && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Pending Invitations</CardTitle>
                    <CardDescription>
                      Invitations that haven't been accepted yet
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {invitations.map((invitation) => (
                        <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                              <Mail className="h-5 w-5 text-yellow-600" />
                            </div>
                            <div>
                              <p className="font-medium">{invitation.email}</p>
                              <p className="text-sm text-gray-500">
                                Invited {new Date(invitation.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant={getRoleBadgeVariant(invitation.role)} className="flex items-center gap-1">
                              {getRoleIcon(invitation.role)}
                              {invitation.role}
                            </Badge>
                            {canManageTeam && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleResendInvitation(invitation.id)}
                                disabled={resendInvitation.isPending}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                {resendInvitation.isPending ? 'Sending...' : 'Resend'}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No organisation found</p>
              <p className="text-sm text-gray-400">Please contact support to set up your organisation.</p>
            </div>
          )}
        </div>

        {/* Modals */}
        <TeamInviteModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          onSendInvitation={handleSendInvitation}
          isLoading={sendInvitation.isPending}
        />

        <ConfirmDeleteModal
          isOpen={!!memberToDelete}
          onClose={() => setMemberToDelete(null)}
          onConfirm={() => memberToDelete && handleDeleteMember(memberToDelete)}
          isLoading={removeMember.isPending}
          memberName={members?.find(m => m.id === memberToDelete)?.profile?.first_name || 'this member'}
        />
      </div>
    </MainLayout>
  );
};

export default Team;
