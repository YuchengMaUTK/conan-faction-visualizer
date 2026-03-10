import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div style={styles.container}>
          <p style={styles.title}>⚠️ 渲染出错</p>
          <p style={styles.message}>{this.state.error?.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 16,
    margin: 8,
    borderRadius: 12,
    background: '#fef2f2',
    border: '1px solid #fca5a5',
    textAlign: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    color: '#991b1b',
    margin: '0 0 8px',
  },
  message: {
    fontSize: 13,
    color: '#b91c1c',
    margin: 0,
  },
};
