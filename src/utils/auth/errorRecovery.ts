
/**
 * Smart error recovery mechanisms for authentication
 * Implements progressive recovery strategies and fallback chains
 */

import { classifyError, ClassifiedError, shouldAutoRecover, getRecoveryAction, ErrorCategory, RecoveryStrategy } from './errorClassification';
import { validateAndRefreshSession, forceAuthReset } from './sessionUtils';
import { detectStorageCapabilities, cleanupAllAuthStorage } from './storageUtils';

export interface RecoveryAttempt {
  attempt: number;
  timestamp: Date;
  strategy: string;
  success: boolean;
  error?: Error;
}

export interface RecoveryState {
  errorId: string;
  classifiedError: ClassifiedError;
  attempts: RecoveryAttempt[];
  isRecovering: boolean;
  maxAttemptsReached: boolean;
  lastAttempt?: Date;
  recoverySuccess: boolean;
}

export interface RecoveryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  onProgress?: (state: RecoveryState) => void;
  onSuccess?: (result: any) => void;
  onFailure?: (finalError: ClassifiedError) => void;
}

class ErrorRecoveryManager {
  private recoveryStates = new Map<string, RecoveryState>();
  private recoveryQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;

  /**
   * Attempt to recover from an error using progressive strategies
   */
  async attemptRecovery(
    error: Error,
    operation: () => Promise<any>,
    options: RecoveryOptions = {}
  ): Promise<{ success: boolean; result?: any; finalError?: ClassifiedError }> {
    const errorId = this.generateErrorId(error);
    const classifiedError = classifyError(error);
    
    console.log(`🔄 Starting recovery for error: ${errorId}`, classifiedError.category);

    // Initialize recovery state
    const recoveryState: RecoveryState = {
      errorId,
      classifiedError,
      attempts: [],
      isRecovering: true,
      maxAttemptsReached: false,
      recoverySuccess: false
    };

    this.recoveryStates.set(errorId, recoveryState);

    try {
      // Check if error should be auto-recovered
      if (!shouldAutoRecover(classifiedError)) {
        console.log('❌ Error not suitable for automatic recovery');
        return { success: false, finalError: classifiedError };
      }

      // Execute recovery strategy
      const result = await this.executeRecoveryStrategy(
        classifiedError,
        operation,
        recoveryState,
        options
      );

      recoveryState.isRecovering = false;
      recoveryState.recoverySuccess = result.success;

      if (result.success) {
        console.log(`✅ Recovery successful for error: ${errorId}`);
        options.onSuccess?.(result.result);
      } else {
        console.log(`❌ Recovery failed for error: ${errorId}`);
        options.onFailure?.(result.finalError || classifiedError);
      }

      return result;
    } catch (recoveryError) {
      console.error('💥 Recovery process failed:', recoveryError);
      recoveryState.isRecovering = false;
      
      const finalError = classifyError(recoveryError as Error);
      options.onFailure?.(finalError);
      
      return { success: false, finalError };
    } finally {
      // Clean up recovery state after delay
      setTimeout(() => {
        this.recoveryStates.delete(errorId);
      }, 30000); // Keep for 30 seconds for debugging
    }
  }

  /**
   * Execute recovery strategy based on error classification
   */
  private async executeRecoveryStrategy(
    classifiedError: ClassifiedError,
    operation: () => Promise<any>,
    recoveryState: RecoveryState,
    options: RecoveryOptions
  ): Promise<{ success: boolean; result?: any; finalError?: ClassifiedError }> {
    const maxRetries = options.maxRetries || classifiedError.maxRetries;
    const baseDelay = options.baseDelay || 1000;
    const maxDelay = options.maxDelay || 30000;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      const attemptRecord: RecoveryAttempt = {
        attempt,
        timestamp: new Date(),
        strategy: classifiedError.recoveryStrategy,
        success: false
      };

      recoveryState.attempts.push(attemptRecord);
      recoveryState.lastAttempt = attemptRecord.timestamp;

      try {
        console.log(`🔄 Recovery attempt ${attempt}/${maxRetries + 1} for ${classifiedError.category}`);

        // Execute pre-recovery actions based on error category
        await this.executePreRecoveryActions(classifiedError, attempt);

        // Add delay for retries (except first attempt)
        if (attempt > 1) {
          const delay = Math.min(baseDelay * Math.pow(2, attempt - 2), maxDelay);
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Attempt the original operation
        const result = await operation();
        
        attemptRecord.success = true;
        console.log(`✅ Recovery successful on attempt ${attempt}`);
        
        return { success: true, result };
      } catch (retryError) {
        attemptRecord.error = retryError as Error;
        console.warn(`⚠️ Recovery attempt ${attempt} failed:`, retryError);

        // If this is the last attempt, classify the final error
        if (attempt > maxRetries) {
          const finalError = classifyError(retryError as Error);
          recoveryState.maxAttemptsReached = true;
          
          console.error(`❌ All recovery attempts exhausted for ${classifiedError.category}`);
          return { success: false, finalError };
        }
      }

      // Report progress
      options.onProgress?.(recoveryState);
    }

    return { success: false, finalError: classifiedError };
  }

  /**
   * Execute pre-recovery actions based on error category
   */
  private async executePreRecoveryActions(
    classifiedError: ClassifiedError,
    attempt: number
  ): Promise<void> {
    switch (classifiedError.category) {
      case ErrorCategory.SESSION:
        if (attempt === 1) {
          console.log('🔄 Attempting session refresh for recovery...');
          try {
            await validateAndRefreshSession();
          } catch (sessionError) {
            console.warn('⚠️ Session refresh failed during recovery:', sessionError);
          }
        } else if (attempt === 2) {
          console.log('🔄 Attempting auth reset for recovery...');
          try {
            await forceAuthReset();
          } catch (resetError) {
            console.warn('⚠️ Auth reset failed during recovery:', resetError);
          }
        }
        break;

      case ErrorCategory.STORAGE:
        if (attempt === 1) {
          console.log('🔄 Checking storage capabilities for recovery...');
          const capabilities = detectStorageCapabilities();
          if (!capabilities.localStorage && !capabilities.sessionStorage) {
            console.log('🧹 Cleaning up storage for recovery...');
            cleanupAllAuthStorage();
          }
        }
        break;

      case ErrorCategory.NETWORK:
        // Network errors don't need pre-recovery actions
        // Just rely on exponential backoff
        break;

      default:
        // For unknown errors, try a gentle session refresh
        if (attempt === 1) {
          try {
            await validateAndRefreshSession();
          } catch (error) {
            // Ignore errors in pre-recovery actions
          }
        }
    }
  }

  /**
   * Get current recovery state for an error
   */
  getRecoveryState(errorId: string): RecoveryState | undefined {
    return this.recoveryStates.get(errorId);
  }

  /**
   * Get all active recovery states
   */
  getActiveRecoveryStates(): RecoveryState[] {
    return Array.from(this.recoveryStates.values()).filter(state => state.isRecovering);
  }

  /**
   * Generate unique error ID for tracking
   */
  private generateErrorId(error: Error): string {
    const timestamp = Date.now();
    const errorHash = this.hashString(error.message + error.stack);
    return `err_${timestamp}_${errorHash}`;
  }

  /**
   * Simple string hash function for error identification
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Clear all recovery states (useful for cleanup)
   */
  clearAllRecoveryStates(): void {
    this.recoveryStates.clear();
  }
}

// Global instance
export const errorRecoveryManager = new ErrorRecoveryManager();

/**
 * Convenience function for attempting recovery
 */
export async function attemptErrorRecovery(
  error: Error,
  operation: () => Promise<any>,
  options: RecoveryOptions = {}
): Promise<{ success: boolean; result?: any; finalError?: ClassifiedError }> {
  return errorRecoveryManager.attemptRecovery(error, operation, options);
}

/**
 * Higher-order function to wrap operations with automatic error recovery
 */
export function withErrorRecovery<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  options: RecoveryOptions = {}
) {
  return async (...args: T): Promise<R> => {
    try {
      return await operation(...args);
    } catch (error) {
      console.log('🔄 Error caught, attempting recovery...');
      
      const recovery = await attemptErrorRecovery(
        error as Error,
        () => operation(...args),
        options
      );

      if (recovery.success) {
        return recovery.result;
      } else {
        // Re-throw the final error
        throw recovery.finalError?.originalError || error;
      }
    }
  };
}
