
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { AlertCircle, Users, Loader2, RefreshCw, Check, AlertTriangle } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { sendUserToHubspot } from '@/utils/auth/hubspot';
import { Progress } from "../ui/progress";
import { toast } from "sonner";

type SyncStatus = 'idle' | 'inProgress' | 'completed' | 'failed';

interface SyncLogItem {
  timestamp: Date;
  operation: string;
  success: number;
  failed: number;
  total: number;
}

// Define interfaces for the user data types
interface UserData {
  id: string;
  email?: string;
}

interface AuthUsers {
  users: UserData[];
}

const HubspotIntegration = () => {
  const [newUsersSyncStatus, setNewUsersSyncStatus] = useState<SyncStatus>('idle');
  const [surveyCreatorsSyncStatus, setSurveyCreatorsSyncStatus] = useState<SyncStatus>('idle');
  
  const [newUsersProgress, setNewUsersProgress] = useState<number>(0);
  const [surveyCreatorsProgress, setSurveyCreatorsProgress] = useState<number>(0);
  
  const [syncLogs, setSyncLogs] = useState<SyncLogItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Sync users to the signup list (5417)
  const syncNewUsersList = async () => {
    try {
      setError(null);
      setNewUsersSyncStatus('inProgress');
      setNewUsersProgress(0);
      
      // Get all users with profile information
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
      
      if (profilesError) {
        throw new Error(`Failed to fetch user profiles: ${profilesError.message}`);
      }
      
      if (!profiles || profiles.length === 0) {
        toast.info("No users found to sync");
        setNewUsersSyncStatus('completed');
        return;
      }
      
      console.log(`Found ${profiles.length} users to sync to new users list`);
      
      let successCount = 0;
      let failCount = 0;
      
      // Process users in batches to avoid overwhelming the API
      const BATCH_SIZE = 10;
      for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
        const batch = profiles.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (profile) => {
          try {
            // Get user email from auth.users
            const { data: authData } = await supabase.auth.admin.listUsers();
            const users = authData as AuthUsers;
            const user = users?.users.find(u => u.id === profile.id);
            
            if (!user || !user.email) {
              console.error(`No email found for user ${profile.id}`);
              failCount++;
              return;
            }
            
            // Send to Hubspot
            await sendUserToHubspot({
              email: user.email,
              firstName: profile.first_name || '',
              lastName: profile.last_name || '',
              jobTitle: profile.job_title || '',
              schoolName: profile.school_name || '',
              schoolAddress: profile.school_address || ''
            }, '5417'); // List ID for new users
            
            successCount++;
          } catch (err) {
            console.error(`Error syncing user to Hubspot:`, err);
            failCount++;
          }
        }));
        
        // Update progress
        setNewUsersProgress(Math.round(((i + batch.length) / profiles.length) * 100));
      }
      
      // Log the sync operation
      const logItem: SyncLogItem = {
        timestamp: new Date(),
        operation: "New Users Sync",
        success: successCount,
        failed: failCount,
        total: profiles.length
      };
      
      setSyncLogs(prev => [logItem, ...prev].slice(0, 10));
      
      if (failCount > 0) {
        toast.warning(`Sync completed with issues`, {
          description: `${successCount} users synced successfully, ${failCount} failed.`
        });
      } else {
        toast.success(`${successCount} users synced successfully to Hubspot`);
      }
      
      setNewUsersSyncStatus('completed');
    } catch (err) {
      console.error('Error during sync operation:', err);
      setError(`Sync failed: ${err instanceof Error ? err.message : String(err)}`);
      setNewUsersSyncStatus('failed');
    }
  };
  
  // Sync survey creators to the survey creators list (5418)
  const syncSurveyCreatorsList = async () => {
    try {
      setError(null);
      setSurveyCreatorsSyncStatus('inProgress');
      setSurveyCreatorsProgress(0);
      
      // Get all users who have created surveys
      const { data: surveyTemplates, error: surveyError } = await supabase
        .from('survey_templates')
        .select('creator_id')
        .not('creator_id', 'is', null);
        
      if (surveyError) {
        throw new Error(`Failed to fetch survey creators: ${surveyError.message}`);
      }
      
      if (!surveyTemplates || surveyTemplates.length === 0) {
        toast.info("No survey creators found to sync");
        setSurveyCreatorsSyncStatus('completed');
        return;
      }
      
      // Get unique creator IDs
      const creatorIds = [...new Set(surveyTemplates.map(item => item.creator_id))];
      console.log(`Found ${creatorIds.length} unique survey creators to sync`);
      
      // Get profile data for these creators
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', creatorIds);
      
      if (profilesError) {
        throw new Error(`Failed to fetch survey creator profiles: ${profilesError.message}`);
      }
      
      if (!profiles || profiles.length === 0) {
        toast.info("No survey creator profiles found to sync");
        setSurveyCreatorsSyncStatus('completed');
        return;
      }
      
      let successCount = 0;
      let failCount = 0;
      
      // Process users in batches
      const BATCH_SIZE = 10;
      for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
        const batch = profiles.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (profile) => {
          try {
            // Get user email from auth.users
            const { data: authData } = await supabase.auth.admin.listUsers();
            const users = authData as AuthUsers;
            const user = users?.users.find(u => u.id === profile.id);
            
            if (!user || !user.email) {
              console.error(`No email found for user ${profile.id}`);
              failCount++;
              return;
            }
            
            // Send to Hubspot
            await sendUserToHubspot({
              email: user.email,
              firstName: profile.first_name || '',
              lastName: profile.last_name || '',
              jobTitle: profile.job_title || '',
              schoolName: profile.school_name || '',
              schoolAddress: profile.school_address || ''
            }, '5418'); // List ID for survey creators
            
            successCount++;
          } catch (err) {
            console.error(`Error syncing survey creator to Hubspot:`, err);
            failCount++;
          }
        }));
        
        // Update progress
        setSurveyCreatorsProgress(Math.round(((i + batch.length) / profiles.length) * 100));
      }
      
      // Log the sync operation
      const logItem: SyncLogItem = {
        timestamp: new Date(),
        operation: "Survey Creators Sync",
        success: successCount,
        failed: failCount,
        total: profiles.length
      };
      
      setSyncLogs(prev => [logItem, ...prev].slice(0, 10));
      
      if (failCount > 0) {
        toast.warning(`Survey creators sync completed with issues`, {
          description: `${successCount} users synced successfully, ${failCount} failed.`
        });
      } else {
        toast.success(`${successCount} survey creators synced successfully to Hubspot`);
      }
      
      setSurveyCreatorsSyncStatus('completed');
    } catch (err) {
      console.error('Error during survey creators sync operation:', err);
      setError(`Survey creators sync failed: ${err instanceof Error ? err.message : String(err)}`);
      setSurveyCreatorsSyncStatus('failed');
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hubspot Integration</CardTitle>
        <CardDescription>
          Sync your users to Hubspot marketing lists
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Sync All Users to New Users List */}
          <div className="bg-white rounded-lg border p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium">New Users List</h3>
                <p className="text-sm text-muted-foreground">
                  Sync all users to Hubspot list 5417
                </p>
              </div>
              <Users className="h-8 w-8 text-brandPurple-500" />
            </div>
            
            {newUsersSyncStatus === 'inProgress' && (
              <div className="mb-4">
                <Progress value={newUsersProgress} className="mb-2" />
                <p className="text-sm text-center text-muted-foreground">{newUsersProgress}% complete</p>
              </div>
            )}
            
            <Button 
              onClick={syncNewUsersList} 
              disabled={newUsersSyncStatus === 'inProgress'} 
              className="w-full"
            >
              {newUsersSyncStatus === 'inProgress' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : newUsersSyncStatus === 'completed' ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Sync Completed
                </>
              ) : newUsersSyncStatus === 'failed' ? (
                <>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Retry Sync
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync All Users
                </>
              )}
            </Button>
          </div>
          
          {/* Sync Survey Creators to Survey Creators List */}
          <div className="bg-white rounded-lg border p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium">Survey Creators List</h3>
                <p className="text-sm text-muted-foreground">
                  Sync survey creators to Hubspot list 5418
                </p>
              </div>
              <Users className="h-8 w-8 text-brandPurple-500" />
            </div>
            
            {surveyCreatorsSyncStatus === 'inProgress' && (
              <div className="mb-4">
                <Progress value={surveyCreatorsProgress} className="mb-2" />
                <p className="text-sm text-center text-muted-foreground">{surveyCreatorsProgress}% complete</p>
              </div>
            )}
            
            <Button 
              onClick={syncSurveyCreatorsList} 
              disabled={surveyCreatorsSyncStatus === 'inProgress'} 
              className="w-full"
            >
              {surveyCreatorsSyncStatus === 'inProgress' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : surveyCreatorsSyncStatus === 'completed' ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Sync Completed
                </>
              ) : surveyCreatorsSyncStatus === 'failed' ? (
                <>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Retry Sync
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync Survey Creators
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Sync History */}
        {syncLogs.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-medium mb-3">Sync History</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operation</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Results</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {syncLogs.map((log, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.timestamp.toLocaleString('en-GB')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {log.operation}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {log.success === log.total ? (
                          <span className="text-green-600">{log.success}/{log.total} successful</span>
                        ) : (
                          <span>
                            <span className="text-green-600">{log.success}</span>/<span className="text-red-600">{log.failed}</span>/<span>{log.total}</span> (success/failed/total)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HubspotIntegration;
