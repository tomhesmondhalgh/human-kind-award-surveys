
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle, Crown, Settings } from 'lucide-react';

interface RoleInfo {
  userId: string;
  organizationId: string;
  organizationName: string;
  currentRole: string;
  membershipId: string;
}

const RoleDiagnostic = () => {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [roleInfo, setRoleInfo] = useState<RoleInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFixing, setIsFixing] = useState(false);

  const checkRole = async () => {
    if (!user || !currentOrganization) {
      toast.error('No user or organization found');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Checking role for user:', user.id, 'in organization:', currentOrganization.id);

      const { data, error } = await supabase
        .from('organization_memberships')
        .select('id, role')
        .eq('user_id', user.id)
        .eq('organization_id', currentOrganization.id)
        .single();

      if (error) {
        console.error('Error checking role:', error);
        toast.error(`Error checking role: ${error.message}`);
        return;
      }

      const info: RoleInfo = {
        userId: user.id,
        organizationId: currentOrganization.id,
        organizationName: currentOrganization.name,
        currentRole: data.role,
        membershipId: data.id
      };

      setRoleInfo(info);
      console.log('Role info:', info);

      if (data.role === 'admin') {
        toast.success('You already have admin role');
      } else {
        toast.warning(`Your current role is: ${data.role}. You need admin role to send invitations.`);
      }
    } catch (error) {
      console.error('Error in checkRole:', error);
      toast.error('Failed to check role');
    } finally {
      setIsLoading(false);
    }
  };

  const fixRole = async () => {
    if (!roleInfo) {
      toast.error('No role information available');
      return;
    }

    setIsFixing(true);
    try {
      console.log('Fixing role for membership:', roleInfo.membershipId);

      const { error } = await supabase
        .from('organization_memberships')
        .update({ role: 'admin' })
        .eq('id', roleInfo.membershipId);

      if (error) {
        console.error('Error updating role:', error);
        toast.error(`Failed to update role: ${error.message}`);
        return;
      }

      toast.success('Role updated to admin successfully!');
      
      // Refresh role info
      await checkRole();
      
    } catch (error) {
      console.error('Error in fixRole:', error);
      toast.error('Failed to update role');
    } finally {
      setIsFixing(false);
    }
  };

  useEffect(() => {
    if (user && currentOrganization) {
      checkRole();
    }
  }, [user, currentOrganization]);

  if (!user || !currentOrganization) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-600">No user or organization found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Role Diagnostic
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Organization:</p>
          <p className="font-medium">{currentOrganization.name}</p>
        </div>

        {roleInfo && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Current Role:</p>
            <div className="flex items-center gap-2">
              <Badge 
                variant={roleInfo.currentRole === 'admin' ? 'default' : 'secondary'}
                className="flex items-center gap-1"
              >
                {roleInfo.currentRole === 'admin' && <Crown size={12} />}
                {roleInfo.currentRole}
              </Badge>
              {roleInfo.currentRole === 'admin' ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Button 
            onClick={checkRole} 
            disabled={isLoading} 
            variant="outline" 
            className="w-full"
          >
            {isLoading ? 'Checking...' : 'Check Role'}
          </Button>

          {roleInfo && roleInfo.currentRole !== 'admin' && (
            <Button 
              onClick={fixRole} 
              disabled={isFixing} 
              className="w-full"
            >
              {isFixing ? 'Updating...' : 'Fix Role (Make Admin)'}
            </Button>
          )}
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>User ID: {user.id.slice(0, 8)}...</p>
          <p>Org ID: {currentOrganization.id.slice(0, 8)}...</p>
          {roleInfo && <p>Membership ID: {roleInfo.membershipId.slice(0, 8)}...</p>}
        </div>
      </CardContent>
    </Card>
  );
};

export default RoleDiagnostic;
