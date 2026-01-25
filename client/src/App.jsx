import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import api from './utils/api';
import DashboardLayout from './layouts/DashboardLayout';

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

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check auth status on mount
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await api.get('/auth/profile');
                setUser(response.data.user);
            } catch (error) {
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
        checkAuth();
    }, []);

    if (loading) {
        return <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            backgroundColor: '#0E1117',
            color: '#C9D1D9'
        }}>Loading...</div>;
    }

    return (
        <Router>
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={!user ? <Login /> : <Navigate to="/markets" />} />
                <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/markets" />} />

                {/* Dashboard Routes - Protected */}
                <Route element={user ? <DashboardLayout /> : <Navigate to="/login" />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/markets" element={<Markets />} />
                    <Route path="/markets/:id" element={<CryptoDetail />} />
                    <Route path="/trade" element={<Trade />} />
                    <Route path="/portfolio" element={<Portfolio />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="*" element={<Navigate to="/markets" replace />} />
                </Route>
            </Routes>
        </Router>
    );
}

export default App;
