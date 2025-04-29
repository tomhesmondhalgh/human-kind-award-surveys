
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { AlertCircle, Users, Loader2, RefreshCw, Check, AlertTriangle } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
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

interface SyncResponse {
  success: boolean;
  totalProcessed: number;
  successCount: number;
  failCount: number;
  errors?: string[];
  message?: string;
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
      
      console.log('Starting sync of all users to Hubspot list 5417');
      
      // Call our edge function to handle the sync
      const { data, error: syncError } = await supabase.functions.invoke('sync-hubspot-users', {
        body: {
          syncType: 'all-users',
          listId: '5417'
        }
      });
      
      if (syncError) {
        throw new Error(`Failed to sync users: ${syncError.message}`);
      }
      
      const response = data as SyncResponse;
      
      // Set progress to 100% as the operation is complete
      setNewUsersProgress(100);
      
      // Log the sync operation
      const logItem: SyncLogItem = {
        timestamp: new Date(),
        operation: "New Users Sync",
        success: response.successCount,
        failed: response.failCount,
        total: response.totalProcessed
      };
      
      setSyncLogs(prev => [logItem, ...prev].slice(0, 10));
      
      if (response.failCount > 0) {
        const errorMessage = response.errors && response.errors.length > 0
          ? response.errors[0]
          : 'Some users failed to sync';
          
        toast.warning(`Sync completed with issues`, {
          description: `${response.successCount} users synced successfully, ${response.failCount} failed. ${errorMessage}`
        });
      } else {
        toast.success(`${response.successCount} users synced successfully to Hubspot`);
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
      
      console.log('Starting sync of survey creators to Hubspot list 5418');
      
      // Call our edge function to handle the sync
      const { data, error: syncError } = await supabase.functions.invoke('sync-hubspot-users', {
        body: {
          syncType: 'survey-creators',
          listId: '5418'
        }
      });
      
      if (syncError) {
        throw new Error(`Failed to sync survey creators: ${syncError.message}`);
      }
      
      const response = data as SyncResponse;
      
      // Set progress to 100% as the operation is complete
      setSurveyCreatorsProgress(100);
      
      // Log the sync operation
      const logItem: SyncLogItem = {
        timestamp: new Date(),
        operation: "Survey Creators Sync",
        success: response.successCount,
        failed: response.failCount,
        total: response.totalProcessed
      };
      
      setSyncLogs(prev => [logItem, ...prev].slice(0, 10));
      
      if (response.failCount > 0) {
        const errorMessage = response.errors && response.errors.length > 0
          ? response.errors[0]
          : 'Some survey creators failed to sync';
          
        toast.warning(`Survey creators sync completed with issues`, {
          description: `${response.successCount} users synced successfully, ${response.failCount} failed. ${errorMessage}`
        });
      } else {
        toast.success(`${response.successCount} survey creators synced successfully to Hubspot`);
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
