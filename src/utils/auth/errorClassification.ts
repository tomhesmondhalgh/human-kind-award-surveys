
/**
 * Enhanced error classification system for authentication scenarios
 * Provides comprehensive error taxonomy and recovery guidance
 */

export enum ErrorSeverity {
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  NETWORK = 'network',
  SESSION = 'session', 
  STORAGE = 'storage',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown'
}

export enum RecoveryStrategy {
  AUTO_RETRY = 'auto_retry',
  USER_PROMPT = 'user_prompt',
  MANUAL_INTERVENTION = 'manual_intervention',
  FALLBACK = 'fallback',
  ESCALATE = 'escalate'
}

export interface ClassifiedError {
  originalError: Error;
  category: ErrorCategory;
  severity: ErrorSeverity;
  isRecoverable: boolean;
  recoveryStrategy: RecoveryStrategy;
  userMessage: string;
  technicalDetails: string;
  suggestedActions: string[];
  retryable: boolean;
  maxRetries: number;
  context?: Record<string, any>;
}

export interface ErrorPattern {
  pattern: RegExp | string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  isRecoverable: boolean;
  recoveryStrategy: RecoveryStrategy;
  userMessage: string;
  suggestedActions: string[];
  retryable: boolean;
  maxRetries: number;
}

// Comprehensive error patterns for authentication scenarios
const ERROR_PATTERNS: ErrorPattern[] = [
  // Network-related errors
  {
    pattern: /network|fetch|connection|timeout/i,
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.WARNING,
    isRecoverable: true,
    recoveryStrategy: RecoveryStrategy.AUTO_RETRY,
    userMessage: 'Connection issue detected. Trying to reconnect...',
    suggestedActions: ['Check your internet connection', 'Try refreshing the page'],
    retryable: true,
    maxRetries: 3
  },
  
  // Session-related errors
  {
    pattern: /session.*expired|token.*expired|unauthorized/i,
    category: ErrorCategory.SESSION,
    severity: ErrorSeverity.ERROR,
    isRecoverable: true,
    recoveryStrategy: RecoveryStrategy.AUTO_RETRY,
    userMessage: 'Your session has expired. Refreshing your login...',
    suggestedActions: ['Session will be automatically refreshed', 'If issues persist, please log in again'],
    retryable: true,
    maxRetries: 2
  },
  
  // Storage-related errors
  {
    pattern: /storage|localStorage|sessionStorage|quota.*exceed/i,
    category: ErrorCategory.STORAGE,
    severity: ErrorSeverity.WARNING,
    isRecoverable: true,
    recoveryStrategy: RecoveryStrategy.FALLBACK,
    userMessage: 'Browser storage is limited. Using alternative storage method...',
    suggestedActions: ['Clear browser storage if needed', 'Enable cookies and local storage'],
    retryable: false,
    maxRetries: 0
  },
  
  // Authentication errors
  {
    pattern: /invalid.*credentials|wrong.*password|user.*not.*found/i,
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.ERROR,
    isRecoverable: false,
    recoveryStrategy: RecoveryStrategy.USER_PROMPT,
    userMessage: 'Invalid login credentials. Please check your email and password.',
    suggestedActions: ['Verify your email address', 'Check your password', 'Use forgot password if needed'],
    retryable: false,
    maxRetries: 0
  },
  
  // Email confirmation errors
  {
    pattern: /email.*not.*confirmed|email.*confirmation/i,
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.ERROR,
    isRecoverable: false,
    recoveryStrategy: RecoveryStrategy.USER_PROMPT,
    userMessage: 'Please confirm your email address before logging in.',
    suggestedActions: ['Check your inbox for a confirmation email', 'Check spam folder', 'Request a new confirmation email'],
    retryable: false,
    maxRetries: 0
  },
  
  // Authorization errors
  {
    pattern: /forbidden|access.*denied|insufficient.*permissions/i,
    category: ErrorCategory.AUTHORIZATION,
    severity: ErrorSeverity.ERROR,
    isRecoverable: false,
    recoveryStrategy: RecoveryStrategy.MANUAL_INTERVENTION,
    userMessage: 'You don\'t have permission to access this resource.',
    suggestedActions: ['Contact your administrator', 'Verify your account permissions'],
    retryable: false,
    maxRetries: 0
  },
  
  // Rate limiting errors
  {
    pattern: /rate.*limit|too.*many.*requests/i,
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.WARNING,
    isRecoverable: true,
    recoveryStrategy: RecoveryStrategy.AUTO_RETRY,
    userMessage: 'Too many requests. Please wait a moment...',
    suggestedActions: ['Wait before trying again', 'Reduce request frequency'],
    retryable: true,
    maxRetries: 2
  }
];

/**
 * Classify an error based on its message and context
 */
export function classifyError(error: Error, context?: Record<string, any>): ClassifiedError {
  console.log('🔍 Classifying error:', error.message);
  
  const errorMessage = error.message || error.toString();
  
  // Find matching pattern
  const matchedPattern = ERROR_PATTERNS.find(pattern => {
    if (typeof pattern.pattern === 'string') {
      return errorMessage.toLowerCase().includes(pattern.pattern.toLowerCase());
    }
    return pattern.pattern.test(errorMessage);
  });
  
  if (matchedPattern) {
    console.log(`✅ Error classified as: ${matchedPattern.category} (${matchedPattern.severity})`);
    
    return {
      originalError: error,
      category: matchedPattern.category,
      severity: matchedPattern.severity,
      isRecoverable: matchedPattern.isRecoverable,
      recoveryStrategy: matchedPattern.recoveryStrategy,
      userMessage: matchedPattern.userMessage,
      technicalDetails: error.message,
      suggestedActions: matchedPattern.suggestedActions,
      retryable: matchedPattern.retryable,
      maxRetries: matchedPattern.maxRetries,
      context
    };
  }
  
  // Default classification for unknown errors
  console.log('⚠️ Error not matched, using default classification');
  
  return {
    originalError: error,
    category: ErrorCategory.UNKNOWN,
    severity: ErrorSeverity.ERROR,
    isRecoverable: true,
    recoveryStrategy: RecoveryStrategy.USER_PROMPT,
    userMessage: 'An unexpected error occurred. Please try again.',
    technicalDetails: error.message,
    suggestedActions: ['Try refreshing the page', 'If the problem persists, please contact support'],
    retryable: true,
    maxRetries: 1,
    context
  };
}

/**
 * Get user-friendly error message with appropriate tone
 */
export function getUserFriendlyMessage(classifiedError: ClassifiedError): string {
  const { severity, userMessage, isRecoverable } = classifiedError;
  
  let prefix = '';
  switch (severity) {
    case ErrorSeverity.WARNING:
      prefix = isRecoverable ? '⚠️ ' : '⚠️ ';
      break;
    case ErrorSeverity.ERROR:
      prefix = isRecoverable ? '🔄 ' : '❌ ';
      break;
    case ErrorSeverity.CRITICAL:
      prefix = '🚨 ';
      break;
  }
  
  return `${prefix}${userMessage}`;
}

/**
 * Determine if an error should trigger automatic recovery
 */
export function shouldAutoRecover(classifiedError: ClassifiedError): boolean {
  return classifiedError.isRecoverable && 
         classifiedError.recoveryStrategy === RecoveryStrategy.AUTO_RETRY &&
         classifiedError.retryable;
}

/**
 * Get next recovery action based on error classification
 */
export function getRecoveryAction(classifiedError: ClassifiedError): {
  action: 'retry' | 'fallback' | 'prompt' | 'escalate' | 'manual';
  delay?: number;
  message: string;
} {
  switch (classifiedError.recoveryStrategy) {
    case RecoveryStrategy.AUTO_RETRY:
      return {
        action: 'retry',
        delay: classifiedError.category === ErrorCategory.NETWORK ? 2000 : 1000,
        message: 'Automatically retrying...'
      };
      
    case RecoveryStrategy.FALLBACK:
      return {
        action: 'fallback',
        message: 'Switching to alternative method...'
      };
      
    case RecoveryStrategy.USER_PROMPT:
      return {
        action: 'prompt',
        message: 'User action required'
      };
      
    case RecoveryStrategy.ESCALATE:
      return {
        action: 'escalate',
        message: 'Escalating to higher-level error handler'
      };
      
    default:
      return {
        action: 'manual',
        message: 'Manual intervention required'
      };
  }
}
