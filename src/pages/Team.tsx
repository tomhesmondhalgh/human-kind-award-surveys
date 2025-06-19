import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus, Building2, Users, Settings } from 'lucide-react';
import TeamInviteModal from '../components/team/TeamInviteModal';
import OrganizationsList from '../components/team/OrganizationsList';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useTeamMembers } from '../components/team/hooks/useTeamMembers';
import { Alert, AlertDescription } from '@/components/ui/alert';

const Team: React.FC = () => {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  
  const {
    members,
    isLoading,
    isError,
    error,
    currentUserRole,
    isInviteModalOpen: hookInviteModalOpen,
    setIsInviteModalOpen: setHookInviteModalOpen,
    handleInviteUser,
    handleUpdateRole,
    handleRemoveMember,
    refetchMembers
  } = useTeamMembers();

  const handleOpenInvite = () => {
    setIsInviteModalOpen(true);
  };

  const handleCloseInvite = () => {
    setIsInviteModalOpen(false);
    refetchMembers();
  };

  if (!currentOrganization) {
    return (
      <div className="container mx-auto p-4">
        <Alert>
          <AlertDescription>
            Please select an organisation to manage team members.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <TeamInviteModal
        open={isInviteModalOpen}
        onOpenChange={setIsInviteModalOpen}
        onInvite={handleInviteUser}
        onClose={handleCloseInvite}
      />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground">
            Manage your team members and their roles within the organisation
          </p>
        </div>
        <Button onClick={handleOpenInvite} className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Invite Member
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Manage team members for {currentOrganization.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Loading team members...</div>
          ) : isError ? (
            <Alert variant="destructive">
              <AlertDescription>
                {error instanceof Error ? error.message : 'An unknown error occurred'}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4">
              {members?.map((member) => (
                <div key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Users className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium leading-none">{member.email}</p>
                      <p className="text-sm text-muted-foreground">Role: {member.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {currentUserRole === 'admin' && member.role !== 'admin' && (
                      <Button variant="outline" size="sm" onClick={() => handleUpdateRole(member.id, 'admin')}>
                        Make Admin
                      </Button>
                    )}
                    {currentUserRole === 'admin' && (
                      <Button variant="destructive" size="sm" onClick={() => handleRemoveMember(member.id)}>
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Team;
