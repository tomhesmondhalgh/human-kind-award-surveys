
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { validateSessionWithDatabase, refreshAndValidateSession } from '@/utils/auth/sessionValidator';

const AuthDebugPanel: React.FC = () => {
  const { user, session, isAuthenticated, isSessionHealthy, sessionHealthIssues } = useAuth();
  const { currentOrganization, organizations } = useOrganization();
  const [isVisible, setIsVisible] = useState(false);
  const [testResults, setTestResults] = useState<any>({});
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [sessionValidation, setSessionValidation] = useState<any>(null);

  const runAuthTests = async () => {
    setIsRunningTests(true);
    const results: any = {};

    try {
      // Test 1: Enhanced Session Validation
      console.log('🔍 Testing enhanced session validation...');
      const validationResult = await validateSessionWithDatabase();
      results.enhancedSessionValidation = {
        success: validationResult.isValid,
        data: validationResult,
        error: validationResult.error
      };
      setSessionValidation(validationResult);

      // Test 2: Basic session check
      console.log('🔍 Testing basic session...');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      results.sessionCheck = {
        success: !sessionError && !!sessionData.session,
        data: sessionData,
        error: sessionError
      };

      // Test 3: User retrieval
      console.log('🔍 Testing user retrieval...');
      const { data: userData, error: userError } = await supabase.auth.getUser();
      results.userCheck = {
        success: !userError && !!userData.user,
        data: userData,
        error: userError
      };

      // Test 4: auth.uid() function test
      console.log('🔍 Testing auth.uid() function...');
      try {
        const { data: uidTest, error: uidError } = await supabase
          .rpc('get_current_user_email');
        results.authUidTest = {
          success: !uidError && !!uidTest,
          data: uidTest,
          error: uidError
        };
      } catch (error) {
        results.authUidTest = {
          success: false,
          error: error
        };
      }

      // Test 5: Organization membership test (if org exists)
      if (currentOrganization?.id) {
        console.log('🔍 Testing organization membership...');
        try {
          const { data: membershipTest, error: membershipError } = await supabase
            .rpc('user_can_manage_org_membership', {
              user_uuid: user?.id,
              org_id: currentOrganization.id
            });
          results.membershipTest = {
            success: !membershipError,
            data: membershipTest,
            error: membershipError
          };
        } catch (error) {
          results.membershipTest = {
            success: false,
            error: error
          };
        }
      }

      // Test 6: Direct organization memberships query
      if (user?.id) {
        console.log('🔍 Testing direct memberships query...');
        try {
          const { data: memberships, error: membershipsError } = await supabase
            .from('organization_memberships')
            .select('*')
            .eq('user_id', user.id);
          results.membershipsQuery = {
            success: !membershipsError,
            data: memberships,
            error: membershipsError
          };
        } catch (error) {
          results.membershipsQuery = {
            success: false,
            error: error
          };
        }
      }

      setTestResults(results);
      console.log('🎯 Auth test results:', results);
    } catch (error) {
      console.error('💥 Error running auth tests:', error);
      results.generalError = error;
      setTestResults(results);
    } finally {
      setIsRunningTests(false);
    }
  };

  const handleSessionRefresh = async () => {
    setIsRunningTests(true);
    try {
      console.log('🔄 Forcing session refresh...');
      const result = await refreshAndValidateSession();
      setSessionValidation(result);
      
      if (result.isValid) {
        // Re-run tests after successful refresh
        await runAuthTests();
      }
    } catch (error) {
      console.error('💥 Session refresh failed:', error);
    } finally {
      setIsRunningTests(false);
    }
  };

  const renderTestResult = (testName: string, result: any) => {
    if (!result) return null;

    const isSuccess = result.success;
    const Icon = isSuccess ? CheckCircle : XCircle;
    const variant = isSuccess ? 'default' : 'destructive';

    return (
      <div key={testName} className="border rounded p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Icon size={16} className={isSuccess ? 'text-green-600' : 'text-red-600'} />
          <span className="font-medium">{testName}</span>
          <Badge variant={variant}>
            {isSuccess ? 'PASS' : 'FAIL'}
          </Badge>
        </div>
        
        {result.data && (
          <div className="text-xs bg-gray-100 p-2 rounded">
            <strong>Data:</strong> {JSON.stringify(result.data, null, 2)}
          </div>
        )}
        
        {result.error && (
          <div className="text-xs bg-red-100 p-2 rounded text-red-800">
            <strong>Error:</strong> {JSON.stringify(result.error, null, 2)}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Toggle button - always visible in development */}
      <div className="fixed top-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsVisible(!isVisible)}
          className="bg-white shadow-lg"
        >
          {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
          Debug Auth
        </Button>
      </div>

      {/* Debug panel */}
      {isVisible && (
        <div className="fixed inset-4 z-40 bg-white border-2 border-blue-500 rounded-lg shadow-2xl overflow-auto">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="text-blue-600" />
                Enhanced Authentication Debug Panel
              </CardTitle>
              <CardDescription>
                Current authentication state and enhanced session validation
              </CardDescription>
              <div className="flex gap-2">
                <Button 
                  onClick={runAuthTests} 
                  disabled={isRunningTests}
                  size="sm"
                >
                  {isRunningTests ? 'Running Tests...' : 'Run Auth Tests'}
                </Button>
                <Button 
                  onClick={handleSessionRefresh}
                  disabled={isRunningTests}
                  size="sm"
                  variant="secondary"
                >
                  <RefreshCw size={16} className="mr-1" />
                  Refresh Session
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsVisible(false)}
                  size="sm"
                >
                  Close
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Enhanced Session Validation */}
              {sessionValidation && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Enhanced Session Validation</h3>
                  <div className="p-3 border rounded">
                    <div className="flex items-center gap-2 mb-2">
                      {sessionValidation.isValid ? (
                        <CheckCircle size={16} className="text-green-600" />
                      ) : (
                        <XCircle size={16} className="text-red-600" />
                      )}
                      <span className="font-medium">
                        JWT Database Sync: {sessionValidation.isValid ? 'VALID' : 'FAILED'}
                      </span>
                    </div>
                    {sessionValidation.error && (
                      <p className="text-sm text-red-600">{sessionValidation.error}</p>
                    )}
                    {sessionValidation.needsRefresh && (
                      <Badge variant="destructive" className="mt-2">Needs Refresh</Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Current Auth State */}
              <div className="space-y-3">
                <h3 className="font-semibold">Current Authentication State</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <strong>Authenticated:</strong> 
                    <Badge variant={isAuthenticated ? 'default' : 'destructive'} className="ml-2">
                      {isAuthenticated ? 'YES' : 'NO'}
                    </Badge>
                  </div>
                  <div>
                    <strong>Session Healthy:</strong>
                    <Badge variant={isSessionHealthy ? 'default' : 'destructive'} className="ml-2">
                      {isSessionHealthy ? 'YES' : 'NO'}
                    </Badge>
                  </div>
                  <div>
                    <strong>User ID:</strong> {user?.id || 'None'}
                  </div>
                  <div>
                    <strong>User Email:</strong> {user?.email || 'None'}
                  </div>
                  <div>
                    <strong>Current Org:</strong> {currentOrganization?.name || 'None'}
                  </div>
                  <div>
                    <strong>Org Role:</strong> {currentOrganization?.role || 'None'}
                  </div>
                </div>
                
                {sessionHealthIssues.length > 0 && (
                  <div className="text-sm bg-yellow-100 p-2 rounded">
                    <strong>Session Issues:</strong>
                    <ul className="list-disc list-inside">
                      {sessionHealthIssues.map((issue, index) => (
                        <li key={index}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Raw Session Data */}
              <div className="space-y-3">
                <h3 className="font-semibold">Raw Session Data</h3>
                <div className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40">
                  <pre>{JSON.stringify({ session, user }, null, 2)}</pre>
                </div>
              </div>

              {/* Organizations Data */}
              <div className="space-y-3">
                <h3 className="font-semibold">Organizations Data</h3>
                <div className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40">
                  <pre>{JSON.stringify({ organizations, currentOrganization }, null, 2)}</pre>
                </div>
              </div>

              {/* Test Results */}
              {Object.keys(testResults).length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Test Results</h3>
                  <div className="space-y-3">
                    {renderTestResult('Enhanced Session Validation', testResults.enhancedSessionValidation)}
                    {renderTestResult('Session Check', testResults.sessionCheck)}
                    {renderTestResult('User Check', testResults.userCheck)}
                    {renderTestResult('Auth UID Test', testResults.authUidTest)}
                    {renderTestResult('Membership Test', testResults.membershipTest)}
                    {renderTestResult('Memberships Query', testResults.membershipsQuery)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default AuthDebugPanel;
