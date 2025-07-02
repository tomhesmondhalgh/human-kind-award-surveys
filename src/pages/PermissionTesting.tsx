import React from 'react';
import PageTitle from '@/components/ui/PageTitle';
import PermissionDiagnostic from '@/components/debug/PermissionDiagnostic';
import RoleDiagnostic from '@/components/debug/RoleDiagnostic';
import JWTStatusIndicator from '@/components/team/JWTStatusIndicator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bug } from 'lucide-react';

const PermissionTesting: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <PageTitle title="Permission System Testing" />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Debug Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            This page provides comprehensive testing and debugging tools for the organization 
            permission system. Use these tools to diagnose issues with invitations and survey creation.
          </p>
          <div className="text-sm text-gray-500 space-y-1">
            <p>• <strong>JWT Status:</strong> Checks authentication token validity</p>
            <p>• <strong>Role Diagnostic:</strong> Verifies your role in the current organization</p>
            <p>• <strong>Permission Diagnostic:</strong> Tests all permission-related functions</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-1 xl:grid-cols-2">
        <div className="space-y-6">
          <JWTStatusIndicator />
          <RoleDiagnostic />
        </div>
        
        <div>
          <PermissionDiagnostic />
        </div>
      </div>
    </div>
  );
};

export default PermissionTesting;