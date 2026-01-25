import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Button from '../components/ui/Button/Button';
import styles from './Profile.module.css';

const Profile = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await api.get('/auth/profile');
                setUser(response.data.user);
            } catch (err) {
                console.error('Failed to load profile', err);
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, []);

    if (loading) {
        return (
            <div className={styles.container}>
                <h1>User Profile</h1>
                <p>Loading profile...</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>User Profile</h1>
                <p className={styles.subtitle}>Manage your account settings</p>
            </header>

            {user ? (
                <div className={styles.profileCard}>
                    <div className={styles.avatarSection}>
                        <div className={styles.avatar}>
                            {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <h2 className={styles.username}>{user.username || 'User'}</h2>
                    </div>

                    <div className={styles.infoSection}>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Email</span>
                            <span className={styles.infoValue}>{user.email || 'Not provided'}</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Account Type</span>
                            <span className={styles.infoValue}>Standard</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Member Since</span>
                            <span className={styles.infoValue}>
                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                            </span>
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <Button variant="secondary">Edit Profile</Button>
                        <Button variant="secondary">Change Password</Button>
                    </div>
                </div>
            ) : (
                <div className={styles.errorState}>
                    <p>Unable to load profile information.</p>
                </div>
            )}
        </div>
    );
};

export default Profile;
