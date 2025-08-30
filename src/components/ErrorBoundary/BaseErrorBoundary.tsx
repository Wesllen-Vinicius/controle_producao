import React, { Component, ReactNode } from 'react';
import { getLoggingService } from '../../services/loggingService';

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export interface BaseErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  level?: 'screen' | 'section' | 'component';
}

export abstract class BaseErrorBoundary extends Component<
  BaseErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: BaseErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false, // eslint-disable-line react/no-unused-state
      error: null, // eslint-disable-line react/no-unused-state
      errorInfo: null, // eslint-disable-line react/no-unused-state
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error
    getLoggingService().error(
      `Error Boundary (${this.props.level ?? 'unknown'})`,
      'ErrorBoundary',
      {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
        errorInfo: {
          componentStack: errorInfo.componentStack,
        },
        timestamp: new Date().toISOString(),
      }
    );

    // Update state
    this.setState({
      error, // eslint-disable-line react/no-unused-state
      errorInfo, // eslint-disable-line react/no-unused-state
    });

    // Call custom error handler
    this.props.onError?.(error, errorInfo);
  }

  protected resetError = () => {
    this.setState({
      hasError: false, // eslint-disable-line react/no-unused-state
      error: null, // eslint-disable-line react/no-unused-state
      errorInfo: null, // eslint-disable-line react/no-unused-state
    });
  };

  abstract override render(): ReactNode;
}

export default BaseErrorBoundary;
