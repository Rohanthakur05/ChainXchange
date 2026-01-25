import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import styles from './Auth.module.css';

const Signup = () => {
    const [formData, setFormData] = useState({ username: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await api.post('/auth/signup', formData);
            window.location.href = '/markets'; // Redirect to dashboard
        } catch (err) {
            setError(err.response?.data?.error || 'Signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.authContainer}>
            <div className={styles.authCard}>
                <h2 className={styles.title}>Create Account</h2>

                {error && <div className={styles.errorMessage}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Username</label>
                        <input
                            type="text"
                            className={styles.input}
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Email</label>
                        <input
                            type="email"
                            className={styles.input}
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Password</label>
                        <input
                            type="password"
                            className={styles.input}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                        />
                    </div>

                    <button type="submit" className={styles.submitBtn} disabled={loading}>
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                </form>

                <p className={styles.footerText}>
                    Already have an account? <Link to="/login" className={styles.link}>Log in</Link>
                </p>
            </div>
        </div>
    );
};

export default Signup;
