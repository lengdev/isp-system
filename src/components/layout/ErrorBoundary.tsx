import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 stroke-[2]" />
          </div>
          <h2 className="text-lg font-bold text-[var(--text)] mb-1">
            Unable to display this view
          </h2>
          <p className="text-sm text-[var(--text-muted)] max-w-md mb-6">
            Something unexpected occurred while rendering this page. You can reload to restore the workspace.
          </p>
          <Button variant="primary" size="sm" onClick={this.handleReset} className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Page</span>
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
