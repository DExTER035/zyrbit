import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

/**
 * Zyrbit Global & Route Error Boundary
 * Catches unhandled JavaScript exceptions in child component renders.
 * Prevents screen freezes and blank white screens.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Zyrbit ErrorBoundary caught an unhandled render error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/zenith';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          reset: this.handleReset,
        });
      }

      return (
        <div
          role="alert"
          style={{
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px 20px',
            background: '#0B0D0F',
            color: '#F5F5F5',
            fontFamily: "'Inter', sans-serif",
            textAlign: 'center',
          }}
        >
          <div
            style={{
              maxWidth: '440px',
              width: '100%',
              background: '#15181B',
              border: '1px solid #23272E',
              borderRadius: '20px',
              padding: '32px 24px',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                color: '#EF4444',
              }}
            >
              <AlertTriangle size={24} />
            </div>

            <h2
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#F5F5F5',
                margin: '0 0 8px 0',
                letterSpacing: '-0.02em',
              }}
            >
              Something paused unexpectedly
            </h2>

            <p
              style={{
                fontSize: '13px',
                color: '#9CA3AF',
                margin: '0 0 24px 0',
                lineHeight: 1.5,
              }}
            >
              Zyrbit caught an unexpected UI glitch and safely prevented data loss. Your saved data is intact.
            </p>

            <div
              style={{
                display: 'flex',
                gap: '10px',
                width: '100%',
              }}
            >
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: '#F5F5F5',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                <RotateCcw size={14} />
                <span>Retry</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: '#1FA36F',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: '#0B0D0F',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'opacity 0.15s',
                }}
              >
                <Home size={14} />
                <span>Go to Zenith</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
