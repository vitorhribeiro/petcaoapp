import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground">
          <div className="max-w-md w-full bg-card border border-border rounded-3xl p-6 shadow-xl text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-xl font-bold">Ops! Algo deu errado</h1>
            <p className="text-sm text-muted-foreground">
              Ocorreu um erro de execução ao renderizar o painel do cliente. Detalhes:
            </p>
            <div className="p-3 bg-muted rounded-2xl text-left text-xs font-mono overflow-auto max-h-40 border border-border/50 text-destructive dark:text-red-400">
              {this.state.error?.toString()}
              {this.state.errorInfo?.componentStack}
            </div>
            <Button
              className="w-full gap-2 rounded-xl"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-4 h-4" /> Recarregar Página
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
