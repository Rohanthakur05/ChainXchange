import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Log silently for debugging
        console.error('[ErrorBoundary] Caught error:', error);
        console.error('[ErrorBoundary] Component stack:', errorInfo?.componentStack);
        this.setState({ errorInfo });
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/dashboard';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    backgroundColor: 'var(--bg-primary, #0E1117)',
                    color: 'var(--text-primary, #C9D1D9)',
                    padding: '2rem',
                    textAlign: 'center'
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-card, #161B22)',
                        padding: '2.5rem',
                        borderRadius: '16px',
                        border: '1px solid var(--border-subtle, #30363D)',
                        maxWidth: '480px',
                        width: '100%'
                    }}>
                        {/* Icon */}
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(255, 179, 0, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.5rem'
                        }}>
                            <AlertTriangle size={32} color="#FFB300" />
                        </div>

                        {/* Title */}
                        <h1 style={{
                            color: 'var(--text-primary, #C9D1D9)',
                            marginBottom: '0.75rem',
                            fontSize: '1.5rem',
                            fontWeight: 600
                        }}>
                            We Hit a Snag
                        </h1>

                        {/* Message */}
                        <p style={{
                            color: 'var(--text-secondary, #8B949E)',
                            marginBottom: '1.5rem',
                            fontSize: '0.95rem',
                            lineHeight: 1.5
                        }}>
                            The page encountered an unexpected issue. Don't worry — your data is safe.
                            This is likely a temporary problem.
                        </p>

                        {/* Suggestion */}
                        <p style={{
                            color: 'var(--text-muted, #6E7681)',
                            fontSize: '0.875rem',
                            marginBottom: '2rem',
                            padding: '0.75rem 1rem',
                            backgroundColor: 'var(--bg-secondary, rgba(255,255,255,0.03))',
                            borderRadius: '8px'
                        }}>
                            Try refreshing the page. If the problem persists,
                            our team has been notified and is working on it.
                        </p>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                            <button
                                onClick={this.handleRetry}
                                style={{
                                    backgroundColor: 'var(--color-buy, #00C853)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '0.95rem',
                                    fontWeight: 500,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    transition: 'opacity 0.15s'
                                }}
                                onMouseOver={(e) => e.target.style.opacity = '0.9'}
                                onMouseOut={(e) => e.target.style.opacity = '1'}
                            >
                                <RefreshCw size={18} />
                                Refresh Page
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                style={{
                                    backgroundColor: 'transparent',
                                    color: 'var(--text-secondary, #8B949E)',
                                    border: '1px solid var(--border-default, #30363D)',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '0.95rem',
                                    fontWeight: 500,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    transition: 'all 0.15s'
                                }}
                                onMouseOver={(e) => {
                                    e.target.style.backgroundColor = 'var(--bg-secondary, rgba(255,255,255,0.05))';
                                    e.target.style.color = 'var(--text-primary, #C9D1D9)';
                                }}
                                onMouseOut={(e) => {
                                    e.target.style.backgroundColor = 'transparent';
                                    e.target.style.color = 'var(--text-secondary, #8B949E)';
                                }}
                            >
                                <Home size={18} />
                                Go to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

