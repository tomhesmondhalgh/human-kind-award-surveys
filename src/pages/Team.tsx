
import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useOrganization } from '../contexts/OrganizationContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Users, UserPlus, Mail, Crown, Edit3, Eye, Trash2 } from 'lucide-react';
import { useTeamMembers } from '../components/team/hooks/useTeamMembers';
import { useTeamInvitations } from '../components/team/hooks/useTeamInvitations';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import TeamInviteModal from '../components/team/TeamInviteModal';
import ConfirmDeleteModal from '../components/team/ConfirmDeleteModal';

const Team = () => {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [memberToDelete, setMemberToDelete] = React.useState<string | null>(null);

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

  if (!currentOrganization) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-gray-500">Please select an organisation to manage team members.</p>
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

  if (membersLoading) {
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

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
              <p className="text-gray-600">Manage members and permissions for {currentOrganization.name}</p>
            </div>
            {canManageTeam && (
              <Button onClick={() => setIsInviteModalOpen(true)} className="flex items-center gap-2">
                <UserPlus size={16} />
                Invite Member
              </Button>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </CardContent>
          </Card>

          {/* Pending Invitations */}
          {invitations && invitations.length > 0 && (
            <Card>
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
        </div>

        {/* Modals */}
        <TeamInviteModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          onSendInvitation={sendInvitation.mutateAsync}
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
