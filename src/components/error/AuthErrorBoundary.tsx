
/**
 * Specialized error boundary for authentication scenarios
 * Provides recovery actions and graceful degradation
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { toast } from 'sonner';
import { classifyError, getUserFriendlyMessage, ClassifiedError, ErrorSeverity } from '@/utils/auth/errorClassification';
import { attemptErrorRecovery } from '@/utils/auth/errorRecovery';
import { forceAuthReset } from '@/utils/auth/sessionUtils';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: ClassifiedError) => void;
  enableRecovery?: boolean;
}

interface State {
  hasError: boolean;
  classifiedError?: ClassifiedError;
  isRecovering: boolean;
  recoveryAttempted: boolean;
  showTechnicalDetails: boolean;
}

export class AuthErrorBoundary extends Component<Props, State> {
  private recoveryTimeoutId?: NodeJS.Timeout;

  public state: State = {
    hasError: false,
    isRecovering: false,
    recoveryAttempted: false,
    showTechnicalDetails: false
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    const classifiedError = classifyError(error);
    console.error('🚨 AuthErrorBoundary caught error:', classifiedError);
    
    return {
      hasError: true,
      classifiedError,
      isRecovering: false,
      recoveryAttempted: false
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const classifiedError = classifyError(error, { 
      componentStack: errorInfo.componentStack,
      errorBoundary: 'AuthErrorBoundary'
    });
    
    console.error('🚨 Auth error boundary triggered:', {
      error: classifiedError,
      errorInfo,
      component: 'AuthErrorBoundary'
    });

    // Notify parent component
    this.props.onError?.(classifiedError);

    // Show appropriate toast based on error severity
    this.showErrorToast(classifiedError);

    // Attempt automatic recovery for recoverable errors
    if (this.props.enableRecovery !== false && classifiedError.isRecoverable) {
      this.attemptRecovery(classifiedError);
    }
  }

  private showErrorToast(classifiedError: ClassifiedError) {
    const message = getUserFriendlyMessage(classifiedError);
    
    switch (classifiedError.severity) {
      case ErrorSeverity.WARNING:
        toast.warning(message, {
          description: classifiedError.suggestedActions[0],
          duration: 4000
        });
        break;
      case ErrorSeverity.ERROR:
        toast.error(message, {
          description: classifiedError.suggestedActions[0],
          duration: 6000
        });
        break;
      case ErrorSeverity.CRITICAL:
        toast.error(message, {
          description: 'Please refresh the page or contact support',
          duration: 10000
        });
        break;
    }
  }

  private async attemptRecovery(classifiedError: ClassifiedError) {
    if (this.state.recoveryAttempted) {
      console.log('🔄 Recovery already attempted, skipping');
      return;
    }

    console.log('🔄 Attempting automatic recovery for auth error...');
    this.setState({ isRecovering: true, recoveryAttempted: true });

    try {
      const recovery = await attemptErrorRecovery(
        classifiedError.originalError,
        async () => {
          // Force component remount by clearing error state
          this.setState({ hasError: false, classifiedError: undefined });
          return true;
        },
        {
          maxRetries: classifiedError.maxRetries,
          onProgress: (state) => {
            console.log('🔄 Recovery progress:', state);
          }
        }
      );

      if (recovery.success) {
        console.log('✅ Auth error recovery successful');
        toast.success('Issue resolved', {
          description: 'The authentication issue has been automatically fixed.',
          duration: 3000
        });
        
        // Clear error state after successful recovery
        this.setState({
          hasError: false,
          classifiedError: undefined,
          isRecovering: false
        });
      } else {
        console.log('❌ Auth error recovery failed');
        this.setState({ isRecovering: false });
      }
    } catch (recoveryError) {
      console.error('💥 Recovery attempt failed:', recoveryError);
      this.setState({ isRecovering: false });
    }
  }

  private handleManualRecovery = async () => {
    console.log('🔄 Manual recovery initiated');
    this.setState({ isRecovering: true });

    try {
      // Attempt full auth reset
      await forceAuthReset();
      
      toast.success('Authentication reset', {
        description: 'Please log in again to continue.',
        duration: 4000
      });

      // Reload the page for a clean state
      window.location.reload();
    } catch (error) {
      console.error('💥 Manual recovery failed:', error);
      toast.error('Recovery failed', {
        description: 'Please refresh the page manually.',
        duration: 5000
      });
      this.setState({ isRecovering: false });
    }
  };

  private handleRetry = () => {
    console.log('🔄 User initiated retry');
    this.setState({
      hasError: false,
      classifiedError: undefined,
      isRecovering: false,
      recoveryAttempted: false,
      showTechnicalDetails: false
    });
  };

  private toggleTechnicalDetails = () => {
    this.setState(prev => ({
      showTechnicalDetails: !prev.showTechnicalDetails
    }));
  };

  public componentWillUnmount() {
    if (this.recoveryTimeoutId) {
      clearTimeout(this.recoveryTimeoutId);
    }
  }

  public render() {
    if (this.state.hasError) {
      const { classifiedError, isRecovering, showTechnicalDetails } = this.state;
      
      if (!classifiedError) {
        return this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h1>
              <button
                onClick={() => window.location.reload()}
                className="bg-brandPurple-600 text-white px-4 py-2 rounded hover:bg-brandPurple-700"
              >
                Refresh Page
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            {/* Error Icon and Title */}
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                {classifiedError.severity === ErrorSeverity.CRITICAL ? (
                  <span className="text-2xl">🚨</span>
                ) : classifiedError.isRecoverable ? (
                  <span className="text-2xl">🔄</span>
                ) : (
                  <span className="text-2xl">❌</span>
                )}
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                {classifiedError.severity === ErrorSeverity.CRITICAL 
                  ? 'Critical Error'
                  : classifiedError.isRecoverable 
                    ? 'Temporary Issue'
                    : 'Authentication Error'
                }
              </h1>
              <p className="text-gray-600">
                {getUserFriendlyMessage(classifiedError)}
              </p>
            </div>

            {/* Recovery Status */}
            {isRecovering && (
              <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded">
                <div className="flex items-center">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2" />
                  <span className="text-blue-700 text-sm">
                    Attempting to fix the issue automatically...
                  </span>
                </div>
              </div>
            )}

            {/* Suggested Actions */}
            {classifiedError.suggestedActions.length > 0 && (
              <div className="mb-6">
                <h3 className="font-medium text-gray-900 mb-2">Suggested actions:</h3>
                <ul className="space-y-1">
                  {classifiedError.suggestedActions.map((action, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start">
                      <span className="text-gray-400 mr-2">•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {classifiedError.isRecoverable && (
                <button
                  onClick={this.handleRetry}
                  disabled={isRecovering}
                  className="w-full bg-brandPurple-600 text-white py-2 px-4 rounded hover:bg-brandPurple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRecovering ? 'Recovering...' : 'Try Again'}
                </button>
              )}
              
              <button
                onClick={this.handleManualRecovery}
                disabled={isRecovering}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRecovering ? 'Resetting...' : 'Reset Authentication'}
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300"
              >
                Refresh Page
              </button>
            </div>

            {/* Technical Details Toggle */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={this.toggleTechnicalDetails}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                {showTechnicalDetails ? 'Hide' : 'Show'} technical details
              </button>
              
              {showTechnicalDetails && (
                <div className="mt-3 p-3 bg-gray-50 rounded text-xs text-gray-600 font-mono">
                  <div><strong>Category:</strong> {classifiedError.category}</div>
                  <div><strong>Severity:</strong> {classifiedError.severity}</div>
                  <div><strong>Recoverable:</strong> {classifiedError.isRecoverable ? 'Yes' : 'No'}</div>
                  <div><strong>Strategy:</strong> {classifiedError.recoveryStrategy}</div>
                  <div className="mt-2"><strong>Details:</strong></div>
                  <div className="break-words">{classifiedError.technicalDetails}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AuthErrorBoundary;
