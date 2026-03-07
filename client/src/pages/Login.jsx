import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, ShieldCheck, LockKeyhole } from 'lucide-react';
import api from '../utils/api';
import Logo from '../components/ui/Logo/Logo';
import styles from './Auth.module.css';

const Login = ({ onLoginSuccess }) => {
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await api.post('/auth/login', formData);
            // Trigger auth re-check in App.jsx instead of full reload
            if (onLoginSuccess) {
                await onLoginSuccess();
            }
            navigate('/markets', { replace: true });
        } catch (err) {
            setError(err.userMessage || err.response?.data?.error || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.authSplit}>
            {/* Left Branding Side */}
            <div className={styles.authBranding}>
                <Logo size="md" className={styles.brandLogo} />
                <div className={styles.brandContent}>
                    <h1 className={styles.brandTitle}>Trade Crypto Smarter</h1>
                    <p className={styles.brandDesc}>
                        Access real-time market data and trade cryptocurrencies instantly on our secure, lightning-fast platform.
                    </p>
                </div>
            </div>

            {/* Right Form Side */}
            <div className={styles.authFormContainer}>
                <div className={styles.authCard}>
                    <h2 className={styles.title}>Welcome Back</h2>
                    <p className={styles.subtitle}>Log in to your ChainXchange account</p>

                    {error && <div className={styles.errorMessage}>{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Username</label>
                            <div className={styles.inputWrapper}>
                                <User className={styles.inputIcon} size={18} />
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="Enter your username"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Password</label>
                            <div className={styles.inputWrapper}>
                                <Lock className={styles.inputIcon} size={18} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className={styles.input}
                                    placeholder="Enter your password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                                <button
                                    type="button"
                                    className={styles.passwordToggle}
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex="-1"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className={styles.submitBtn} disabled={loading}>
                            {loading ? 'Logging in...' : 'Log In'}
                        </button>
                    </form>

                    <p className={styles.footerText}>
                        Don't have an account? <Link to="/signup" className={styles.link}>Sign up</Link>
                    </p>

                    {/* Trust Elements */}
                    <div className={styles.trustElements}>
                        <div className={styles.trustItem}>
                            <ShieldCheck size={16} /> Secure authentication
                        </div>
                        <div className={styles.trustItem}>
                            <LockKeyhole size={16} /> Encrypted data protection
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
