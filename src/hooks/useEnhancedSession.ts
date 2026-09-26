
import { useState, useEffect, useRef, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { SessionMonitor } from '@/utils/auth/SessionMonitor';
import { detectStorageCapabilities } from '@/utils/auth/storageUtils';
import { validateAndRefreshSession } from '@/utils/auth/sessionUtils';

interface SessionState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  isHealthy: boolean;
  healthIssues: string[];
  lastRefresh: Date | null;
  storageCapabilities: any;
}

interface SessionActions {
  refreshSession: () => Promise<void>;
  validateSession: () => Promise<boolean>;
  getSessionHealth: () => { isHealthy: boolean; issues: string[] };
  forceLogout: () => void;
}

export const useEnhancedSession = (): SessionState & SessionActions => {
  const [sessionState, setSessionState] = useState<SessionState>({
    session: null,
    user: null,
    isLoading: true,
    error: null,
    isHealthy: true,
    healthIssues: [],
    lastRefresh: null,
    storageCapabilities: null
  });

  const sessionMonitorRef = useRef<SessionMonitor | null>(null);
  const mountedRef = useRef(true);

  // Initialize session monitor
  useEffect(() => {
    console.log('🔧 Initializing enhanced session management');
    
    const capabilities = detectStorageCapabilities();
    setSessionState(prev => ({ ...prev, storageCapabilities: capabilities }));

    sessionMonitorRef.current = new SessionMonitor({
      refreshBufferMinutes: 2,
      heartbeatIntervalSeconds: 30,
      maxRetryAttempts: 3,
      retryBaseDelay: 1000
    });

    return () => {
      mountedRef.current = false;
      if (sessionMonitorRef.current) {
        sessionMonitorRef.current.destroy();
      }
    };
  }, []);

  // Update session state safely
  const updateSessionState = useCallback((updates: Partial<SessionState>) => {
    if (mountedRef.current) {
      setSessionState(prev => ({ ...prev, ...updates }));
    }
  }, []);

  // Refresh session manually
  const refreshSession = useCallback(async () => {
    if (!sessionMonitorRef.current) return;

    try {
      updateSessionState({ isLoading: true, error: null });
      
      const result = await sessionMonitorRef.current.checkAndRefreshSession();
      
      if (result.session) {
        updateSessionState({
          session: result.session,
          user: result.session.user,
          lastRefresh: new Date(),
          error: null,
          isLoading: false
        });
      } else {
        updateSessionState({
          session: null,
          user: null,
          error: result.error,
          isLoading: false
        });
      }
    } catch (error) {
      console.error('💥 Manual session refresh failed:', error);
      updateSessionState({
        error: error as Error,
        isLoading: false
      });
    }
  }, [updateSessionState]);

  // Validate current session
  const validateSession = useCallback(async (): Promise<boolean> => {
    try {
      const { session, error } = await validateAndRefreshSession();
      
      if (session && !error) {
        updateSessionState({
          session,
          user: session.user,
          error: null,
          lastRefresh: new Date()
        });
        return true;
      } else {
        updateSessionState({
          session: null,
          user: null,
          error: error || new Error('Session validation failed')
        });
        return false;
      }
    } catch (error) {
      console.error('💥 Session validation failed:', error);
      updateSessionState({
        error: error as Error
      });
      return false;
    }
  }, [updateSessionState]);

  // Get session health status
  const getSessionHealth = useCallback(() => {
    if (sessionMonitorRef.current) {
      const health = sessionMonitorRef.current.getSessionHealth();
      updateSessionState({
        isHealthy: health.isHealthy,
        healthIssues: health.issues
      });
      return health;
    }
    return { isHealthy: false, issues: ['Session monitor not available'] };
  }, [updateSessionState]);

  // Force logout
  const forceLogout = useCallback(() => {
    if (sessionMonitorRef.current) {
      sessionMonitorRef.current.forceLogout();
    }
    updateSessionState({
      session: null,
      user: null,
      error: null,
      isLoading: false
    });
  }, [updateSessionState]);

  // Initialize session on mount
  useEffect(() => {
    const initializeSession = async () => {
      try {
        updateSessionState({ isLoading: true });
        
        const isValid = await validateSession();
        
        if (isValid && sessionState.session && sessionMonitorRef.current) {
          sessionMonitorRef.current.startMonitoring(sessionState.session);
        }
      } catch (error) {
        console.error('💥 Session initialization failed:', error);
        updateSessionState({
          error: error as Error,
          isLoading: false
        });
      }
    };

    initializeSession();
  }, []); // Only run on mount

  // Start monitoring when session becomes available
  useEffect(() => {
    if (sessionState.session && sessionMonitorRef.current) {
      sessionMonitorRef.current.startMonitoring(sessionState.session);
    } else if (!sessionState.session && sessionMonitorRef.current) {
      sessionMonitorRef.current.stopMonitoring();
    }
  }, [sessionState.session]);

  // Update health status periodically
  useEffect(() => {
    const healthCheckInterval = setInterval(() => {
      getSessionHealth();
    }, 60000); // Check every minute

    return () => clearInterval(healthCheckInterval);
  }, [getSessionHealth]);

  return {
    ...sessionState,
    refreshSession,
    validateSession,
    getSessionHealth,
    forceLogout
  };
};
