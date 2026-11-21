import React from 'react';
import { translate } from '../lib/i18n';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/** Catches render errors so a single bug doesn't blank the whole app. */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[SkellyTalk] Render error:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
          background: '#090F0C',
          color: '#e6f4ea',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: 22, margin: 0 }}>{translate('error.title')}</h1>
        <p style={{ maxWidth: 420, opacity: 0.75, margin: 0 }}>
          {translate('error.body')}
        </p>
        <pre
          style={{
            maxWidth: 520,
            maxHeight: 120,
            overflow: 'auto',
            fontSize: 12,
            opacity: 0.6,
            userSelect: 'text',
            whiteSpace: 'pre-wrap',
          }}
        >
          {this.state.error.message}
        </pre>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            borderRadius: 12,
            border: '1px solid rgba(34,197,94,0.5)',
            background: 'rgba(34,197,94,0.15)',
            color: '#86efac',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          {translate('error.reload')}
        </button>
      </div>
    );
  }
}
