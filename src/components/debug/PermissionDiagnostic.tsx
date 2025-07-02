import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle, Bug, Database } from 'lucide-react';

interface PermissionTestResult {
  testName: string;
  success: boolean;
  result?: any;
  error?: string;
  details?: string;
}

const PermissionDiagnostic = () => {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [testResults, setTestResults] = useState<PermissionTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    if (!user || !currentOrganization) {
      toast.error('No user or organization found');
      return;
    }

    setIsRunning(true);
    const results: PermissionTestResult[] = [];

    console.log('🔍 === PERMISSION DIAGNOSTIC START ===');

    // Test 1: Direct membership query
    try {
      console.log('🧪 Test 1: Direct organization membership query');
      const { data: membership, error: membershipError } = await supabase
        .from('organization_memberships')
        .select('id, role, user_id, organization_id')
        .eq('user_id', user.id)
        .eq('organization_id', currentOrganization.id)
        .single();

      results.push({
        testName: 'Direct Membership Query',
        success: !membershipError,
        result: membership,
        error: membershipError?.message,
        details: membership ? `Role: ${membership.role}` : 'No membership found'
      });

      console.log('🧪 Test 1 result:', { membership, membershipError });
    } catch (error) {
      results.push({
        testName: 'Direct Membership Query',
        success: false,
        error: (error as Error).message
      });
    }

    // Test 2: user_can_manage_org_membership function
    try {
      console.log('🧪 Test 2: user_can_manage_org_membership function');
      const { data: canManage, error: manageError } = await supabase
        .rpc('user_can_manage_org_membership', {
          user_uuid: user.id,
          org_id: currentOrganization.id
        });

      results.push({
        testName: 'user_can_manage_org_membership',
        success: !manageError,
        result: canManage,
        error: manageError?.message,
        details: `Can manage: ${canManage}`
      });

      console.log('🧪 Test 2 result:', { canManage, manageError });
    } catch (error) {
      results.push({
        testName: 'user_can_manage_org_membership',
        success: false,
        error: (error as Error).message
      });
    }

    // Test 3: user_has_organization_role function
    try {
      console.log('🧪 Test 3: user_has_organization_role function');
      const { data: hasAdminRole, error: roleError } = await supabase
        .rpc('user_has_organization_role', {
          user_uuid: user.id,
          org_id: currentOrganization.id,
          required_role: 'admin'
        });

      results.push({
        testName: 'user_has_organization_role (admin)',
        success: !roleError,
        result: hasAdminRole,
        error: roleError?.message,
        details: `Has admin role: ${hasAdminRole}`
      });

      console.log('🧪 Test 3 result:', { hasAdminRole, roleError });
    } catch (error) {
      results.push({
        testName: 'user_has_organization_role (admin)',
        success: false,
        error: (error as Error).message
      });
    }

    // Test 4: JWT Token validation
    try {
      console.log('🧪 Test 4: JWT Token validation');
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      results.push({
        testName: 'JWT Token Validation',
        success: !authError && !!authUser,
        result: authUser ? { id: authUser.id, email: authUser.email } : null,
        error: authError?.message,
        details: authUser ? `User ID matches: ${authUser.id === user.id}` : 'No auth user'
      });

      console.log('🧪 Test 4 result:', { authUser, authError, matches: authUser?.id === user.id });
    } catch (error) {
      results.push({
        testName: 'JWT Token Validation',
        success: false,
        error: (error as Error).message
      });
    }

    // Test 5: Organization invitation creation attempt (dry run)
    try {
      console.log('🧪 Test 5: Organization invitation creation (permission check only)');
      const { data: inviteCheck, error: inviteError } = await supabase
        .from('organization_invitations')
        .select('id')
        .eq('organization_id', currentOrganization.id)
        .limit(1);

      results.push({
        testName: 'Invitation Table Access',
        success: !inviteError,
        result: inviteCheck,
        error: inviteError?.message,
        details: inviteError ? 'Cannot access invitation table' : 'Can access invitation table'
      });

      console.log('🧪 Test 5 result:', { inviteCheck, inviteError });
    } catch (error) {
      results.push({
        testName: 'Invitation Table Access',
        success: false,
        error: (error as Error).message
      });
    }

    // Test 6: Survey templates access
    try {
      console.log('🧪 Test 6: Survey templates access');
      const { data: surveyCheck, error: surveyError } = await supabase
        .from('survey_templates')
        .select('id, name')
        .eq('organization_id', currentOrganization.id)
        .limit(1);

      results.push({
        testName: 'Survey Templates Access',
        success: !surveyError,
        result: surveyCheck,
        error: surveyError?.message,
        details: surveyError ? 'Cannot access survey templates' : 'Can access survey templates'
      });

      console.log('🧪 Test 6 result:', { surveyCheck, surveyError });
    } catch (error) {
      results.push({
        testName: 'Survey Templates Access',
        success: false,
        error: (error as Error).message
      });
    }

    console.log('🔍 === PERMISSION DIAGNOSTIC END ===');
    console.log('📊 Summary:', results);

    setTestResults(results);
    setIsRunning(false);

    // Show summary toast
    const passedTests = results.filter(r => r.success).length;
    const totalTests = results.length;
    
    if (passedTests === totalTests) {
      toast.success(`All ${totalTests} permission tests passed!`);
    } else {
      toast.error(`${totalTests - passedTests} of ${totalTests} tests failed`);
    }
  };

  if (!user || !currentOrganization) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-600">No user or organization found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Permission System Diagnostic
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Organization: {currentOrganization.name}</p>
            <p className="text-xs text-gray-500">User ID: {user.id.slice(0, 8)}...</p>
          </div>
          <Button 
            onClick={runDiagnostics} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            <Bug className="h-4 w-4" />
            {isRunning ? 'Running Tests...' : 'Run Diagnostics'}
          </Button>
        </div>

        {testResults.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium">Test Results:</h3>
            {testResults.map((result, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{result.testName}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={result.success ? 'default' : 'destructive'}>
                      {result.success ? 'PASS' : 'FAIL'}
                    </Badge>
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
                
                {result.details && (
                  <p className="text-xs text-gray-600">{result.details}</p>
                )}
                
                {result.error && (
                  <p className="text-xs text-red-600">Error: {result.error}</p>
                )}
                
                {result.result && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-500">Raw Result</summary>
                    <pre className="mt-1 bg-gray-50 p-2 rounded text-xs overflow-auto">
                      {JSON.stringify(result.result, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PermissionDiagnostic;