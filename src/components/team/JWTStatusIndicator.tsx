
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface JWTStatus {
  hasSession: boolean;
  hasToken: boolean;
  authUidWorks: boolean;
  isLoading: boolean;
  error?: string;
}

const JWTStatusIndicator: React.FC = () => {
  const [status, setStatus] = useState<JWTStatus>({
    hasSession: false,
    hasToken: false,
    authUidWorks: false,
    isLoading: true
  });

  const checkJWTStatus = async () => {
    setStatus(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Check session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const hasSession = !!sessionData.session && !sessionError;
      const hasToken = !!sessionData.session?.access_token;

      // Test auth.uid()
      const { data: userData, error: uidError } = await supabase.auth.getUser();
      const authUidWorks = !uidError && !!userData.user;
      const uidTest = userData?.user?.email;

      setStatus({
        hasSession,
        hasToken,
        authUidWorks,
        isLoading: false,
        error: sessionError?.message || uidError?.message
      });

    } catch (error) {
      setStatus({
        hasSession: false,
        hasToken: false,
        authUidWorks: false,
        isLoading: false,
        error: (error as Error).message
      });
    }
  };

  useEffect(() => {
    checkJWTStatus();
  }, []);

  const getStatusIcon = () => {
    if (status.isLoading) return <RefreshCw size={16} className="animate-spin text-gray-500" />;
    if (status.hasSession && status.hasToken && status.authUidWorks) return <CheckCircle size={16} className="text-green-600" />;
    if (status.hasSession && status.hasToken) return <AlertTriangle size={16} className="text-yellow-600" />;
    return <XCircle size={16} className="text-red-600" />;
  };

  const getStatusText = () => {
    if (status.isLoading) return 'Checking...';
    if (status.hasSession && status.hasToken && status.authUidWorks) return 'JWT Status: All Good';
    if (status.hasSession && status.hasToken) return 'JWT Status: Database Sync Issue';
    return 'JWT Status: Authentication Issue';
  };

  const getStatusColor = () => {
    if (status.isLoading) return 'secondary';
    if (status.hasSession && status.hasToken && status.authUidWorks) return 'default';
    if (status.hasSession && status.hasToken) return 'destructive';
    return 'destructive';
  };

  return (
    <Card className="mb-4 border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <p className="text-sm font-medium">{getStatusText()}</p>
              <div className="flex gap-2 mt-1">
                <Badge variant={status.hasSession ? 'default' : 'destructive'} className="text-xs">
                  Session: {status.hasSession ? 'OK' : 'NO'}
                </Badge>
                <Badge variant={status.hasToken ? 'default' : 'destructive'} className="text-xs">
                  Token: {status.hasToken ? 'OK' : 'NO'}
                </Badge>
                <Badge variant={status.authUidWorks ? 'default' : 'destructive'} className="text-xs">
                  DB Sync: {status.authUidWorks ? 'OK' : 'NO'}
                </Badge>
              </div>
            </div>
          </div>
          <button
            onClick={checkJWTStatus}
            className="text-sm text-blue-600 hover:text-blue-800"
            disabled={status.isLoading}
          >
            Refresh
          </button>
        </div>
        {status.error && (
          <p className="text-xs text-red-600 mt-2">Error: {status.error}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default JWTStatusIndicator;
