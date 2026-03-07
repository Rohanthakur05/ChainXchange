import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, ShieldCheck, LockKeyhole } from 'lucide-react';
import api from '../utils/api';
import Logo from '../components/ui/Logo/Logo';
import styles from './Auth.module.css';

const Signup = ({ onSignupSuccess }) => {
    const [formData, setFormData] = useState({ username: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await api.post('/auth/signup', formData);
            if (onSignupSuccess) {
                await onSignupSuccess();
            }
            navigate('/markets', { replace: true });
        } catch (err) {
            setError(err.userMessage || err.response?.data?.error || 'Signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Calculate password strength
    const calculateStrength = (pass) => {
        let score = 0;
        if (pass.length > 0) score += 10;
        if (pass.length >= 8) score += 25;
        if (/[A-Z]/.test(pass)) score += 25;
        if (/[0-9]/.test(pass)) score += 20;
        if (/[^A-Za-z0-9]/.test(pass)) score += 20;
        return Math.min(100, score);
    };

    const strength = calculateStrength(formData.password);

    // Determine strength color
    const getStrengthColor = () => {
        if (strength === 0) return 'transparent';
        if (strength < 40) return '#ef4444'; // Red
        if (strength < 80) return '#eab308'; // Yellow
        return '#22c55e'; // Green
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
                    <h2 className={styles.title}>Create Account</h2>
                    <p className={styles.subtitle}>Join thousands of traders on ChainXchange</p>

                    {error && <div className={styles.errorMessage}>{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Username</label>
                            <div className={styles.inputWrapper}>
                                <User className={styles.inputIcon} size={18} />
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="Choose a username"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Email address</label>
                            <div className={styles.inputWrapper}>
                                <Mail className={styles.inputIcon} size={18} />
                                <input
                                    type="email"
                                    className={styles.input}
                                    placeholder="Enter your email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                                    placeholder="Create a password"
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

                            {/* Password Strength Indicator */}
                            <div className={styles.passwordHints}>
                                <div className={styles.strengthBar}>
                                    <div
                                        className={styles.strengthFill}
                                        style={{
                                            width: `${strength}%`,
                                            backgroundColor: getStrengthColor()
                                        }}
                                    />
                                </div>
                                <div className={styles.hintText}>
                                    <ShieldCheck className={styles.hintIcon} size={12} />
                                    Password must be at least 8 characters
                                </div>
                            </div>
                        </div>

                        <button type="submit" className={styles.submitBtn} disabled={loading || (formData.password?.length > 0 && formData.password.length < 8)}>
                            {loading ? 'Creating Account...' : 'Sign Up'}
                        </button>
                    </form>

                    <p className={styles.footerText}>
                        Already have an account? <Link to="/login" className={styles.link}>Log in</Link>
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

export default Signup;
