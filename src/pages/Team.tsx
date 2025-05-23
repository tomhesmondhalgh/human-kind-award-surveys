
import React, { useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useOrganization } from '../contexts/OrganizationContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Users, UserPlus, Mail, Crown, Edit3, Eye, Trash2, Building } from 'lucide-react';
import { useTeamMembers } from '../components/team/hooks/useTeamMembers';
import { useTeamInvitations } from '../components/team/hooks/useTeamInvitations';
import { Skeleton } from '../components/ui/skeleton';
import TeamInviteModal from '../components/team/TeamInviteModal';
import ConfirmDeleteModal from '../components/team/ConfirmDeleteModal';
import OrganizationsList from '../components/team/OrganizationsList';
import { useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

const Team = () => {
  const { user } = useAuth();
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
    
    // Set appropriate tab based on whether we have an organization
    if (!currentOrganization && !orgLoading) {
      setActiveTab('organizations');
    }
  }, [location, currentOrganization, orgLoading]);

  const {
    members,
    isLoading: membersLoading,
    isInviteModalOpen,
    setIsInviteModalOpen,
    sendInvitation,
    removeMember
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

  if (orgLoading) {
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

  const currentUserMembership = members?.find(m => m.user_id === user?.id);
  const canManageTeam = currentUserMembership?.role === 'admin';

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
                  : 'Create or select an organisation to manage team members'}
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

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="organizations" className="flex items-center gap-2">
                <Building size={16} />
                Organizations
              </TabsTrigger>
              
              <TabsTrigger 
                value="members" 
                className="flex items-center gap-2"
                disabled={!currentOrganization}
              >
                <Users size={16} />
                Team Members
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="organizations">
              <OrganizationsList />
            </TabsContent>
            
            <TabsContent value="members">
              {currentOrganization ? (
                <>
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
                          <p className="text-gray-500">No team members found</p>
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
                              <Badge variant={getRoleBadgeVariant(invitation.role)} className="flex items-center gap-1">
                                {getRoleIcon(invitation.role)}
                                {invitation.role}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Please select or create an organisation to manage team members.</p>
                  <Button 
                    onClick={() => setActiveTab('organizations')} 
                    variant="outline" 
                    className="mt-4"
                  >
                    <Building size={16} className="mr-2" />
                    Manage Organizations
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
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
