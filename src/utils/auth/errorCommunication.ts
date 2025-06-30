
/**
 * User-friendly error communication system
 * Provides contextual help and progressive disclosure
 */

import { ClassifiedError, ErrorCategory, ErrorSeverity } from './errorClassification';

export interface ErrorPresentation {
  title: string;
  message: string;
  icon: string;
  actionLabel: string;
  helpText?: string;
  troubleshootingSteps?: string[];
  preventionTips?: string[];
  relatedLinks?: Array<{ label: string; url: string }>;
}

/**
 * Generate user-friendly error presentation
 */
export function createErrorPresentation(classifiedError: ClassifiedError): ErrorPresentation {
  const basePresentation = getBasePresentationForCategory(classifiedError.category);
  
  return {
    ...basePresentation,
    title: getTitleForError(classifiedError),
    message: classifiedError.userMessage,
    icon: getIconForError(classifiedError),
    actionLabel: getActionLabelForError(classifiedError),
    helpText: getHelpTextForError(classifiedError),
    troubleshootingSteps: getTroubleshootingSteps(classifiedError),
    preventionTips: getPreventionTips(classifiedError),
    relatedLinks: getRelatedLinks(classifiedError)
  };
}

function getTitleForError(error: ClassifiedError): string {
  switch (error.category) {
    case ErrorCategory.NETWORK:
      return error.severity === ErrorSeverity.CRITICAL 
        ? 'Connection Lost' 
        : 'Connection Issue';
        
    case ErrorCategory.SESSION:
      return error.severity === ErrorSeverity.CRITICAL 
        ? 'Session Expired' 
        : 'Authentication Refresh Needed';
        
    case ErrorCategory.STORAGE:
      return 'Storage Limitation';
      
    case ErrorCategory.AUTHENTICATION:
      return 'Login Issue';
      
    case ErrorCategory.AUTHORIZATION:
      return 'Access Denied';
      
    case ErrorCategory.VALIDATION:
      return 'Input Error';
      
    default:
      return 'Unexpected Issue';
  }
}

function getIconForError(error: ClassifiedError): string {
  if (error.severity === ErrorSeverity.CRITICAL) return '🚨';
  if (error.isRecoverable) return '🔄';
  
  switch (error.category) {
    case ErrorCategory.NETWORK: return '🌐';
    case ErrorCategory.SESSION: return '🔑';
    case ErrorCategory.STORAGE: return '💾';
    case ErrorCategory.AUTHENTICATION: return '🔐';
    case ErrorCategory.AUTHORIZATION: return '🚫';
    case ErrorCategory.VALIDATION: return '⚠️';
    default: return '❌';
  }
}

function getActionLabelForError(error: ClassifiedError): string {
  if (error.isRecoverable) {
    switch (error.category) {
      case ErrorCategory.NETWORK: return 'Retry Connection';
      case ErrorCategory.SESSION: return 'Refresh Session';
      case ErrorCategory.STORAGE: return 'Continue Anyway';
      default: return 'Try Again';
    }
  }
  
  switch (error.category) {
    case ErrorCategory.AUTHENTICATION: return 'Fix Login Details';
    case ErrorCategory.AUTHORIZATION: return 'Contact Administrator';
    default: return 'Get Help';
  }
}

function getHelpTextForError(error: ClassifiedError): string {
  switch (error.category) {
    case ErrorCategory.NETWORK:
      return error.severity === ErrorSeverity.CRITICAL
        ? 'Your internet connection appears to be offline. The app will automatically retry once connection is restored.'
        : 'There\'s a temporary connection issue. This usually resolves itself within a few moments.';
        
    case ErrorCategory.SESSION:
      return 'Your login session needs to be refreshed for security. This happens automatically in the background.';
      
    case ErrorCategory.STORAGE:
      return 'Your browser\'s storage settings are limiting some features. The app will use alternative methods, but some data may not persist between sessions.';
      
    case ErrorCategory.AUTHENTICATION:
      return 'Please check your login credentials. If you\'ve forgotten your password, you can reset it using the link below.';
      
    case ErrorCategory.AUTHORIZATION:
      return 'You don\'t have permission to access this feature. Contact your administrator if you believe this is an error.';
      
    case ErrorCategory.VALIDATION:
      return 'Please check the information you\'ve entered and make sure all required fields are filled out correctly.';
      
    default:
      return 'An unexpected issue occurred. Our team has been notified and is working on a fix.';
  }
}

function getTroubleshootingSteps(error: ClassifiedError): string[] {
  const baseSteps = error.suggestedActions;
  
  switch (error.category) {
    case ErrorCategory.NETWORK:
      return [
        ...baseSteps,
        'Check your internet connection',
        'Try switching to a different network',
        'Disable VPN if you\'re using one',
        'Clear your browser cache and cookies'
      ];
      
    case ErrorCategory.STORAGE:
      return [
        ...baseSteps,
        'Enable cookies in your browser settings',
        'Allow local storage for this website',
        'Disable strict tracking prevention',
        'Try using an incognito/private window'
      ];
      
    case ErrorCategory.SESSION:
      return [
        ...baseSteps,
        'Wait for automatic session refresh',
        'Log out and log back in',
        'Clear browser storage for this site',
        'Check your system clock is correct'
      ];
      
    default:
      return baseSteps;
  }
}

function getPreventionTips(error: ClassifiedError): string[] {
  switch (error.category) {
    case ErrorCategory.NETWORK:
      return [
        'Ensure you have a stable internet connection',
        'Consider using a wired connection for important work',
        'Keep your browser updated for better connectivity'
      ];
      
    case ErrorCategory.STORAGE:
      return [
        'Keep cookies and local storage enabled for this site',
        'Regularly clear old browser data',
        'Use updated browser versions for better compatibility'
      ];
      
    case ErrorCategory.SESSION:
      return [
        'Stay active in the app to keep your session fresh',
        'Don\'t have too many tabs open simultaneously',
        'Log out when finished to clear your session properly'
      ];
      
    case ErrorCategory.AUTHENTICATION:
      return [
        'Use a password manager for secure credential storage',
        'Keep your account information up to date',
        'Enable two-factor authentication when available'
      ];
      
    default:
      return [
        'Keep your browser updated',
        'Regularly clear cache and cookies',
        'Report persistent issues to support'
      ];
  }
}

function getRelatedLinks(error: ClassifiedError): Array<{ label: string; url: string }> {
  const links: Array<{ label: string; url: string }> = [];
  
  switch (error.category) {
    case ErrorCategory.AUTHENTICATION:
      links.push({ label: 'Reset Password', url: '/reset-password' });
      links.push({ label: 'Contact Support', url: '/support' });
      break;
      
    case ErrorCategory.NETWORK:
      links.push({ label: 'Connection Help', url: '/help/connection' });
      break;
      
    case ErrorCategory.STORAGE:
      links.push({ label: 'Browser Settings Guide', url: '/help/browser-settings' });
      break;
      
    default:
      links.push({ label: 'Help Center', url: '/help' });
      links.push({ label: 'Contact Support', url: '/support' });
  }
  
  return links;
}

function getBasePresentationForCategory(category: ErrorCategory): Partial<ErrorPresentation> {
  return {
    title: 'Issue Detected',
    message: 'Please try again',
    icon: '⚠️',
    actionLabel: 'Try Again'
  };
}

/**
 * Format error for toast notifications
 */
export function formatErrorForToast(classifiedError: ClassifiedError): {
  title: string;
  description: string;
  duration: number;
} {
  const presentation = createErrorPresentation(classifiedError);
  
  let duration = 4000; // Default duration
  
  switch (classifiedError.severity) {
    case ErrorSeverity.WARNING:
      duration = 3000;
      break;
    case ErrorSeverity.ERROR:
      duration = 5000;
      break;
    case ErrorSeverity.CRITICAL:
      duration = 8000;
      break;
  }
  
  return {
    title: presentation.title,
    description: presentation.helpText || classifiedError.suggestedActions[0] || 'Please try again',
    duration
  };
}

/**
 * Generate contextual help content
 */
export function generateContextualHelp(classifiedError: ClassifiedError): {
  quickFix: string;
  explanation: string;
  nextSteps: string[];
} {
  const presentation = createErrorPresentation(classifiedError);
  
  return {
    quickFix: classifiedError.suggestedActions[0] || 'Try refreshing the page',
    explanation: presentation.helpText || 'An unexpected issue occurred',
    nextSteps: presentation.troubleshootingSteps || ['Contact support if the issue persists']
  };
}
