
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { detectStorageCapabilities, getBestStorage, cleanupAllAuthStorage } from './storageUtils';

interface SessionMonitorConfig {
  refreshBufferMinutes: number;
  heartbeatIntervalSeconds: number;
  maxRetryAttempts: number;
  retryBaseDelay: number;
}

const DEFAULT_CONFIG: SessionMonitorConfig = {
  refreshBufferMinutes: 3,
  heartbeatIntervalSeconds: 30,
  maxRetryAttempts: 3,
  retryBaseDelay: 1000
};

export class SessionMonitor {
  private config: SessionMonitorConfig;
  private refreshTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isRefreshing = false;
  private refreshQueue: Array<() => void> = [];
  private broadcastChannel: BroadcastChannel | null = null;
  private isOnline = navigator.onLine;

  constructor(config: Partial<SessionMonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupBroadcastChannel();
    this.setupNetworkListeners();
  }

  private setupBroadcastChannel() {
    try {
      this.broadcastChannel = new BroadcastChannel('supabase-auth-sync');
      this.broadcastChannel.addEventListener('message', this.handleBroadcastMessage.bind(this));
      console.log('🔄 Session broadcast channel established');
    } catch (error) {
      console.warn('⚠️ BroadcastChannel not available:', error);
    }
  }

  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('🌐 Network back online - checking session');
      this.isOnline = true;
      this.checkAndRefreshSession();
    });

    window.addEventListener('offline', () => {
      console.log('🌐 Network offline - pausing session monitoring');
      this.isOnline = false;
      this.stopMonitoring();
    });
  }

  private handleBroadcastMessage(event: MessageEvent) {
    const { type, data } = event.data;
    
    switch (type) {
      case 'session_refreshed':
        console.log('📡 Session refreshed in another tab');
        break;
      case 'session_invalidated':
        console.log('📡 Session invalidated in another tab');
        this.broadcastSessionEvent('session_sync_required');
        break;
      case 'logout':
        console.log('📡 Logout detected in another tab');
        cleanupAllAuthStorage();
        window.location.reload();
        break;
    }
  }

  private broadcastSessionEvent(type: string, data?: any) {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type, data, timestamp: Date.now() });
      } catch (error) {
        console.warn('⚠️ Failed to broadcast session event:', error);
      }
    }
  }

  public startMonitoring(session: Session | null) {
    if (!session || !this.isOnline) {
      console.log('⏸️ Session monitoring paused - no session or offline');
      return;
    }

    console.log('▶️ Starting session monitoring');
    this.scheduleRefresh(session);
    this.startHeartbeat();
  }

  public stopMonitoring() {
    console.log('⏹️ Stopping session monitoring');
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleRefresh(session: Session) {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    const refreshTime = expiresAt - (this.config.refreshBufferMinutes * 60 * 1000);
    const timeUntilRefresh = refreshTime - Date.now();

    if (timeUntilRefresh > 0) {
      console.log(`⏰ Session refresh scheduled in ${Math.round(timeUntilRefresh / 1000 / 60)} minutes`);
      
      this.refreshTimer = setTimeout(() => {
        this.checkAndRefreshSession();
      }, timeUntilRefresh);
    } else {
      console.log('⚡ Session needs immediate refresh');
      this.checkAndRefreshSession();
    }
  }

  private startHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.isOnline && document.visibilityState === 'visible') {
        this.performHealthCheck();
      }
    }, this.config.heartbeatIntervalSeconds * 1000);
  }

  private async performHealthCheck() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn('💓 Session health check failed:', error);
        this.broadcastSessionEvent('session_health_failed', { error: error.message });
        return;
      }

      if (!session) {
        console.log('💓 No session found during health check');
        this.broadcastSessionEvent('session_lost');
        return;
      }

      // Check if session is close to expiry
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const timeUntilExpiry = expiresAt - Date.now();
      const refreshBuffer = this.config.refreshBufferMinutes * 60 * 1000;

      if (timeUntilExpiry <= refreshBuffer) {
        console.log('💓 Session expiry detected during health check');
        this.checkAndRefreshSession();
      }
    } catch (error) {
      console.error('💓 Health check error:', error);
    }
  }

  public async checkAndRefreshSession(): Promise<{ session: Session | null; error: Error | null }> {
    if (this.isRefreshing) {
      console.log('🔄 Session refresh already in progress, queuing...');
      return new Promise((resolve) => {
        this.refreshQueue.push(() => {
          supabase.auth.getSession().then(({ data, error }) => {
            resolve({ session: data.session, error });
          });
        });
      });
    }

    try {
      this.isRefreshing = true;
      console.log('🔄 Starting session refresh with retry logic...');

      const result = await this.refreshWithRetry();
      
      if (result.session) {
        console.log('✅ Session refresh successful');
        this.scheduleRefresh(result.session);
        this.broadcastSessionEvent('session_refreshed', { 
          userId: result.session.user.id,
          expiresAt: result.session.expires_at 
        });
      } else {
        console.log('❌ Session refresh failed');
        this.broadcastSessionEvent('session_invalidated');
      }

      // Process queued refresh requests
      this.refreshQueue.forEach(callback => callback());
      this.refreshQueue = [];

      return result;
    } finally {
      this.isRefreshing = false;
    }
  }

  private async refreshWithRetry(): Promise<{ session: Session | null; error: Error | null }> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetryAttempts; attempt++) {
      try {
        console.log(`🔄 Session refresh attempt ${attempt}/${this.config.maxRetryAttempts}`);
        
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error) throw error;
        
        if (data.session) {
          console.log(`✅ Session refresh succeeded on attempt ${attempt}`);
          return { session: data.session, error: null };
        }
        
        throw new Error('No session returned from refresh');
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ Session refresh attempt ${attempt} failed:`, error);

        if (attempt < this.config.maxRetryAttempts) {
          const delay = this.config.retryBaseDelay * Math.pow(2, attempt - 1);
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    return { session: null, error: lastError };
  }

  public forceLogout() {
    console.log('🚪 Forcing logout across all tabs');
    this.broadcastSessionEvent('logout');
    this.stopMonitoring();
    cleanupAllAuthStorage();
  }

  public getSessionHealth(): { isHealthy: boolean; issues: string[] } {
    const issues: string[] = [];
    const capabilities = detectStorageCapabilities();

    if (!this.isOnline) {
      issues.push('Device is offline');
    }

    if (!capabilities.localStorage && !capabilities.sessionStorage) {
      issues.push('No storage mechanisms available');
    }

    if (this.isRefreshing) {
      issues.push('Session refresh in progress');
    }

    return {
      isHealthy: issues.length === 0,
      issues
    };
  }

  public destroy() {
    console.log('🧹 Destroying session monitor');
    this.stopMonitoring();
    
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }
    
    window.removeEventListener('online', this.setupNetworkListeners);
    window.removeEventListener('offline', this.setupNetworkListeners);
  }
}
