import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.reload();
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
                    backgroundColor: '#0E1117',
                    color: '#C9D1D9',
                    padding: '2rem',
                    textAlign: 'center'
                }}>
                    <div style={{
                        backgroundColor: '#161B22',
                        padding: '3rem',
                        borderRadius: '12px',
                        border: '1px solid #30363D',
                        maxWidth: '500px'
                    }}>
                        <h1 style={{ color: '#FF5252', marginBottom: '1rem', fontSize: '1.5rem' }}>
                            Something went wrong
                        </h1>
                        <p style={{ color: '#8B949E', marginBottom: '1.5rem' }}>
                            The application encountered an unexpected error. This might be due to a temporary issue.
                        </p>
                        {this.state.error && (
                            <p style={{
                                color: '#6E7681',
                                fontSize: '0.875rem',
                                marginBottom: '1.5rem',
                                fontFamily: 'monospace',
                                backgroundColor: '#0E1117',
                                padding: '0.75rem',
                                borderRadius: '6px'
                            }}>
                                {this.state.error.toString()}
                            </p>
                        )}
                        <button
                            onClick={this.handleRetry}
                            style={{
                                backgroundColor: '#238636',
                                color: 'white',
                                border: 'none',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                fontWeight: '500'
                            }}
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
