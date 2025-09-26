// Phase 3: Comprehensive Error Handling and Recovery
// React Error Boundary with automatic recovery and user reporting

import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: string[];
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
}

interface ErrorReport {
  id: string;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  errorInfo: {
    componentStack: string;
  };
  timestamp: Date;
  userAgent: string;
  retryCount: number;
  appVersion: string;
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeouts: NodeJS.Timeout[] = [];
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // Log error for debugging
    console.error('React Error Boundary caught an error:', error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Store error report for later analysis
    this.storeErrorReport(error, errorInfo);

    // Attempt automatic recovery for certain error types
    this.attemptAutomaticRecovery(error);
  }

  componentDidUpdate(prevProps: Props) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    // Reset error boundary when specified props change
    if (hasError && resetOnPropsChange) {
      if (resetKeys) {
        const hasResetKeyChanged = resetKeys.some(
          key => prevProps[key as keyof Props] !== this.props[key as keyof Props]
        );
        if (hasResetKeyChanged) {
          this.resetErrorBoundary();
        }
      }
    }
  }

  componentWillUnmount() {
    // Clear any pending retry timeouts
    this.resetTimeouts.forEach(timeout => clearTimeout(timeout));
  }

  private async storeErrorReport(error: Error, errorInfo: React.ErrorInfo): Promise<void> {
    try {
      const report: ErrorReport = {
        id: this.state.errorId || `error_${Date.now()}`,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        errorInfo: {
          componentStack: errorInfo.componentStack
        },
        timestamp: new Date(),
        userAgent: 'React Native',
        retryCount: this.state.retryCount,
        appVersion: '1.0.0' // TODO: Get from app config
      };

      // Store locally for later upload
      const existingReports = await this.getStoredErrorReports();
      existingReports.push(report);

      // Keep only last 20 reports
      const trimmedReports = existingReports.slice(-20);
      await AsyncStorage.setItem('error_reports', JSON.stringify(trimmedReports));

    } catch (storageError) {
      console.error('Failed to store error report:', storageError);
    }
  }

  private async getStoredErrorReports(): Promise<ErrorReport[]> {
    try {
      const reportsJson = await AsyncStorage.getItem('error_reports');
      return reportsJson ? JSON.parse(reportsJson) : [];
    } catch (error) {
      console.error('Failed to get stored error reports:', error);
      return [];
    }
  }

  private attemptAutomaticRecovery(error: Error): void {
    const { retryCount } = this.state;

    // Only attempt automatic recovery for certain recoverable errors
    const isRecoverable = this.isRecoverableError(error);

    if (isRecoverable && retryCount < this.maxRetries) {
      console.log(`Attempting automatic recovery (attempt ${retryCount + 1}/${this.maxRetries})`);

      const timeout = setTimeout(() => {
        this.setState(prevState => ({
          hasError: false,
          error: null,
          errorInfo: null,
          errorId: null,
          retryCount: prevState.retryCount + 1
        }));
      }, this.retryDelay * (retryCount + 1)); // Exponential backoff

      this.resetTimeouts.push(timeout);
    }
  }

  private isRecoverableError(error: Error): boolean {
    const recoverableErrors = [
      'ChunkLoadError',          // Webpack chunk loading
      'TypeError: Failed to fetch', // Network errors
      'NetworkError',            // Generic network errors
      'TimeoutError'             // Request timeouts
    ];

    return recoverableErrors.some(errorType =>
      error.name.includes(errorType) || error.message.includes(errorType)
    );
  }

  private resetErrorBoundary = (): void => {
    // Clear any pending retries
    this.resetTimeouts.forEach(timeout => clearTimeout(timeout));
    this.resetTimeouts = [];

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    });
  };

  private handleManualRetry = (): void => {
    this.resetErrorBoundary();
  };

  private handleReportError = async (): Promise<void> => {
    const { error, errorInfo, errorId } = this.state;

    if (!error || !errorInfo) return;

    try {
      // In production, this would send to error reporting service
      const errorDetails = {
        errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      };

      Alert.alert(
        'Error Report',
        `Error details have been logged. ID: ${errorId?.slice(-8)}`,
        [
          { text: 'OK', style: 'default' },
          {
            text: 'Copy Details',
            onPress: () => {
              // In a real app, you might copy to clipboard or share
              console.log('Error Details:', JSON.stringify(errorDetails, null, 2));
            }
          }
        ]
      );
    } catch (reportError) {
      console.error('Failed to report error:', reportError);
      Alert.alert('Error', 'Failed to report error. Please try again.');
    }
  };

  private renderErrorUI(): ReactNode {
    const { error, errorInfo, retryCount } = this.state;

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="warning-outline" size={64} color="#FF6B6B" />
          </View>

          <Text style={styles.title}>Something went wrong</Text>

          <Text style={styles.description}>
            We're sorry, but something unexpected happened. The error has been logged
            and we'll work on fixing it.
          </Text>

          {retryCount > 0 && (
            <Text style={styles.retryInfo}>
              Retry attempts: {retryCount}/{this.maxRetries}
            </Text>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={this.handleManualRetry}
            >
              <Ionicons name="refresh-outline" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={this.handleReportError}
            >
              <Ionicons name="bug-outline" size={20} color="#007AFF" />
              <Text style={styles.secondaryButtonText}>Report Issue</Text>
            </TouchableOpacity>
          </View>

          {__DEV__ && error && (
            <View style={styles.debugContainer}>
              <Text style={styles.debugTitle}>Debug Information:</Text>
              <Text style={styles.debugText}>
                {error.name}: {error.message}
              </Text>
              {error.stack && (
                <Text style={styles.debugStack}>
                  {error.stack}
                </Text>
              )}
              {errorInfo && (
                <Text style={styles.debugStack}>
                  Component Stack: {errorInfo.componentStack}
                </Text>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  render() {
    if (this.state.hasError) {
      // Return custom fallback UI if provided, otherwise default error UI
      return this.props.fallback || this.renderErrorUI();
    }

    return this.props.children;
  }
}

// Higher-order component for easy wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryInfo: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  debugContainer: {
    width: '100%',
    marginTop: 32,
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  debugText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  debugStack: {
    fontSize: 12,
    color: '#888',
    fontFamily: 'monospace',
    marginTop: 8,
  },
});

export default ErrorBoundary;