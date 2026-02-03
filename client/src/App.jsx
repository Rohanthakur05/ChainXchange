import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import api from './utils/api';
import DashboardLayout from './layouts/DashboardLayout';
import ErrorBoundary from './components/ErrorBoundary';
import { WalletProvider } from './context/WalletContext';

// Pages
import Home from './pages/Home';
import Markets from './pages/Markets';
import Portfolio from './pages/Portfolio';
import CryptoDetail from './pages/CryptoDetail';
import History from './pages/History';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import Trade from './pages/Trade';
import Terminal from './pages/Terminal';

// Auth states
const AuthState = {
    LOADING: 'loading',
    AUTHENTICATED: 'authenticated',
    UNAUTHENTICATED: 'unauthenticated',
    ERROR: 'error'
};

// Simple wrapper component for authenticated routes
// This allows WalletProvider to wrap all child routes via Outlet
const AuthenticatedRoutes = () => <Outlet />;

function App() {
    const [authState, setAuthState] = useState(AuthState.LOADING);
    const [user, setUser] = useState(null);
    const [error, setError] = useState(null);

    const checkAuth = useCallback(async () => {
        setAuthState(AuthState.LOADING);
        setError(null);
        try {
            const response = await api.get('/auth/profile');
            setUser(response.data.user);
            setAuthState(AuthState.AUTHENTICATED);
        } catch (err) {
            if (err.response?.status === 401) {
                // Explicitly not logged in - this is expected
                setUser(null);
                setAuthState(AuthState.UNAUTHENTICATED);
            } else {
                // Network error, backend down, etc.
                setUser(null);
                setError(err.userMessage || err.message || 'Cannot connect to server');
                setAuthState(AuthState.ERROR);
            }
        }
    }, []);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    // Loading State
    if (authState === AuthState.LOADING) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                backgroundColor: '#0E1117',
                color: '#C9D1D9'
            }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    border: '3px solid #30363D',
                    borderTopColor: '#238636',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />
                <p style={{ marginTop: '1rem', color: '#8B949E' }}>Loading...</p>
                <style>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    // Error State - Backend unavailable
    if (authState === AuthState.ERROR) {
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
                        Connection Error
                    </h1>
                    <p style={{ color: '#8B949E', marginBottom: '1rem' }}>
                        {error}
                    </p>
                    <p style={{ color: '#6E7681', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                        Make sure the backend server is running on port 8000.
                    </p>
                    <button
                        onClick={checkAuth}
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
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // Auth resolved - render routes
    const isAuthenticated = authState === AuthState.AUTHENTICATED;

    return (
        <ErrorBoundary>
            <Router>
                <Routes>
                    {/* Public Routes - No wallet needed */}
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={!isAuthenticated ? <Login onLoginSuccess={checkAuth} /> : <Navigate to="/markets" />} />
                    <Route path="/signup" element={!isAuthenticated ? <Signup onSignupSuccess={checkAuth} /> : <Navigate to="/markets" />} />

                    {/* 
                      Authenticated Routes - ALL wrapped in WalletProvider
                      This ensures useWallet() works in Terminal, Dashboard, Markets, etc.
                    */}
                    {isAuthenticated ? (
                        <Route element={<WalletProvider><AuthenticatedRoutes /></WalletProvider>}>
                            {/* Terminal - Full Screen, No Sidebar */}
                            <Route path="/terminal/:id" element={<Terminal />} />

                            {/* Dashboard Routes - With Sidebar */}
                            <Route element={<DashboardLayout />}>
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/markets" element={<Markets />} />
                                <Route path="/markets/:id" element={<CryptoDetail />} />
                                <Route path="/trade" element={<Trade />} />
                                <Route path="/portfolio" element={<Portfolio />} />
                                <Route path="/history" element={<History />} />
                                <Route path="/profile" element={<Profile />} />
                                <Route path="*" element={<Navigate to="/markets" replace />} />
                            </Route>
                        </Route>
                    ) : (
                        <>
                            <Route path="/terminal/:id" element={<Navigate to="/login" />} />
                            <Route path="/dashboard" element={<Navigate to="/login" />} />
                            <Route path="/markets" element={<Navigate to="/login" />} />
                            <Route path="/markets/:id" element={<Navigate to="/login" />} />
                            <Route path="/trade" element={<Navigate to="/login" />} />
                            <Route path="/portfolio" element={<Navigate to="/login" />} />
                            <Route path="/history" element={<Navigate to="/login" />} />
                            <Route path="/profile" element={<Navigate to="/login" />} />
                            <Route path="*" element={<Navigate to="/login" />} />
                        </>
                    )}
                </Routes>
            </Router>
        </ErrorBoundary>
    );
}

export default App;

