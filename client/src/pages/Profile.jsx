import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    User, Mail, Calendar, Shield, Key, Lock, Smartphone,
    Monitor, TrendingUp, Wallet, BarChart3, DollarSign,
    CheckCircle2, Clock, Activity, Edit, ArrowUpRight,
    ArrowDownRight, ChevronRight
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import api from '../utils/api';
import styles from './Profile.module.css';

const Profile = () => {
    const navigate = useNavigate();
    const { wallet } = useWallet();
    const [user, setUser] = useState(null);
    const [portfolioData, setPortfolioData] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [recentPayments, setRecentPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [twoFAEnabled, setTwoFAEnabled] = useState(false);

    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                // Fetch all data in parallel
                const [profileRes, portfolioRes, txRes] = await Promise.all([
                    api.get('/auth/profile'),
                    api.get('/crypto/portfolio').catch(() => ({ data: {} })),
                    api.get('/crypto/history').catch(() => ({ data: { transactions: [] } }))
                ]);

                setUser(profileRes.data.user);
                setPortfolioData(portfolioRes.data);

                // Get recent transactions (last 5)
                const allTx = txRes.data?.transactions || [];
                setTransactions(allTx.slice(0, 5));
            } catch (err) {
                console.error('Failed to load profile data', err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfileData();
    }, []);

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.skeletonHeader} />
                <div className={styles.skeletonGrid}>
                    <div className={styles.skeletonCard} />
                    <div className={styles.skeletonCard} />
                    <div className={styles.skeletonCard} />
                    <div className={styles.skeletonCard} />
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className={styles.container}>
                <div className={styles.errorState}>
                    <p>Unable to load profile information.</p>
                </div>
            </div>
        );
    }

    const memberDate = user.createdAt
        ? new Date(user.createdAt).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        })
        : 'N/A';

    const portfolioValue = portfolioData?.portfolioValue ?? 0;
    const totalPL = portfolioData?.totalProfitLoss ?? 0;
    const totalPLPercent = portfolioData?.totalProfitLossPercentage ?? 0;
    const holdingsCount = portfolioData?.holdings?.length ?? 0;
    const totalTrades = transactions.length > 0 ? transactions.length : 0;

    // Build recent activity feed from trades + payments
    const activityFeed = [
        ...transactions.map(tx => ({
            date: new Date(tx.timestamp),
            type: tx.type === 'buy' ? 'Bought' : 'Sold',
            detail: `${tx.coinId?.toUpperCase() || 'Crypto'}`,
            amount: tx.type === 'buy'
                ? -Math.abs(tx.totalCost || tx.price * tx.quantity)
                : Math.abs(tx.sellValue || tx.price * tx.quantity),
            status: 'completed',
            dotClass: tx.type === 'buy' ? styles.activityDotBlue : styles.activityDotOrange
        }))
    ].sort((a, b) => b.date - a.date).slice(0, 6);

    return (
        <div className={styles.container}>
            {/* ─── Section 1: Profile Header ─── */}
            <div className={styles.profileHeader}>
                <div className={styles.headerContent}>
                    <div className={styles.avatarWrapper}>
                        <div className={styles.avatar}>
                            {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className={styles.onlineIndicator} />
                    </div>

                    <div className={styles.headerInfo}>
                        <div className={styles.nameRow}>
                            <h1 className={styles.username}>{user.username || 'User'}</h1>
                            <span className={styles.verifiedBadge}>
                                <CheckCircle2 size={11} /> Verified
                            </span>
                            <span className={styles.tierBadge}>
                                <Shield size={11} /> Standard
                            </span>
                        </div>
                        <p className={styles.email}>{user.email || 'Not provided'}</p>
                        <p className={styles.memberSince}>
                            <Calendar size={13} />
                            Member since {memberDate}
                        </p>
                    </div>

                    <div className={styles.headerActions}>
                        <button className={styles.actionBtnPrimary}>
                            <Edit size={15} />
                            Edit Profile
                        </button>
                        <button className={styles.actionBtn}>
                            <Shield size={15} />
                            Security
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── Section 2: Portfolio / Account Overview ─── */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statCardHeader}>
                        <span className={styles.statLabel}>Portfolio Value</span>
                        <div className={styles.statIconBlue}>
                            <TrendingUp size={18} />
                        </div>
                    </div>
                    <div className={styles.statValue}>
                        ${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className={totalPL >= 0 ? styles.statChangeUp : styles.statChangeDown}>
                        {totalPL >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                        {totalPL >= 0 ? '+' : ''}{totalPLPercent.toFixed(2)}% all time
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statCardHeader}>
                        <span className={styles.statLabel}>Wallet Balance</span>
                        <div className={styles.statIconGreen}>
                            <Wallet size={18} />
                        </div>
                    </div>
                    <div className={styles.statValue}>
                        ${(wallet || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className={styles.statChangeUp}>
                        <DollarSign size={13} /> Available for trading
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statCardHeader}>
                        <span className={styles.statLabel}>Total Trades</span>
                        <div className={styles.statIconPurple}>
                            <BarChart3 size={18} />
                        </div>
                    </div>
                    <div className={styles.statValue}>
                        {totalTrades}
                    </div>
                    <div className={styles.statChange} style={{ color: 'var(--text-muted)' }}>
                        <Activity size={13} /> {holdingsCount} active positions
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statCardHeader}>
                        <span className={styles.statLabel}>Profit / Loss</span>
                        <div className={styles.statIconOrange}>
                            <DollarSign size={18} />
                        </div>
                    </div>
                    <div className={totalPL >= 0 ? styles.statValueGreen : styles.statValueRed}>
                        {totalPL >= 0 ? '+' : ''}${Math.abs(totalPL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className={totalPL >= 0 ? styles.statChangeUp : styles.statChangeDown}>
                        {totalPL >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                        {totalPL >= 0 ? '+' : ''}{totalPLPercent.toFixed(2)}%
                    </div>
                </div>
            </div>

            {/* ─── Section 3: Account Details + Security ─── */}
            <div className={styles.twoColumnGrid}>
                {/* Left: Account Information */}
                <div className={styles.card}>
                    <div className={styles.cardTitle}>
                        <div className={styles.cardTitleIcon}>
                            <User size={15} />
                        </div>
                        Account Information
                    </div>
                    <div className={styles.infoList}>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>
                                <Mail size={14} /> Email
                            </span>
                            <span className={styles.infoValue}>{user.email || 'Not provided'}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>
                                <User size={14} /> Username
                            </span>
                            <span className={styles.infoValue}>{user.username || 'User'}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>
                                <Shield size={14} /> Account Type
                            </span>
                            <span className={styles.infoValue}>Standard</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>
                                <Calendar size={14} /> Member Since
                            </span>
                            <span className={styles.infoValue}>{memberDate}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>
                                <Wallet size={14} /> Watchlist
                            </span>
                            <span className={styles.infoValue}>
                                {user.watchlist?.length || 0} coins
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right: Security Settings */}
                <div className={styles.card}>
                    <div className={styles.cardTitle}>
                        <div className={styles.cardTitleIcon}>
                            <Shield size={15} />
                        </div>
                        Security Settings
                    </div>
                    <div className={styles.infoList}>
                        <div className={styles.securityItem}>
                            <div className={styles.securityInfo}>
                                <div className={styles.securityIcon}>
                                    <Key size={15} />
                                </div>
                                <div>
                                    <div className={styles.securityLabel}>Change Password</div>
                                    <div className={styles.securityDesc}>Update your account password</div>
                                </div>
                            </div>
                            <button className={styles.toggleBtn}>
                                <ChevronRight size={14} />
                            </button>
                        </div>

                        <div className={styles.securityItem}>
                            <div className={styles.securityInfo}>
                                <div className={styles.securityIcon}>
                                    <Smartphone size={15} />
                                </div>
                                <div>
                                    <div className={styles.securityLabel}>Two-Factor Authentication</div>
                                    <div className={styles.securityDesc}>
                                        {twoFAEnabled ? 'Enabled — extra protection active' : 'Not enabled — recommended'}
                                    </div>
                                </div>
                            </div>
                            <button
                                className={twoFAEnabled ? styles.toggleSwitchOn : styles.toggleSwitch}
                                onClick={() => setTwoFAEnabled(!twoFAEnabled)}
                                aria-label="Toggle two-factor authentication"
                            />
                        </div>

                        <div className={styles.securityItem}>
                            <div className={styles.securityInfo}>
                                <div className={styles.securityIcon}>
                                    <Clock size={15} />
                                </div>
                                <div>
                                    <div className={styles.securityLabel}>Login Activity</div>
                                    <div className={styles.securityDesc}>View recent login sessions</div>
                                </div>
                            </div>
                            <button className={styles.toggleBtn}>
                                <ChevronRight size={14} />
                            </button>
                        </div>

                        <div className={styles.securityItem}>
                            <div className={styles.securityInfo}>
                                <div className={styles.securityIcon}>
                                    <Monitor size={15} />
                                </div>
                                <div>
                                    <div className={styles.securityLabel}>Connected Devices</div>
                                    <div className={styles.securityDesc}>Manage active sessions</div>
                                </div>
                            </div>
                            <button className={styles.toggleBtn}>
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Section 4: Recent Activity ─── */}
            <div className={styles.activityCard}>
                <div className={styles.cardTitle}>
                    <div className={styles.cardTitleIcon}>
                        <Activity size={15} />
                    </div>
                    Recent Activity
                </div>

                {activityFeed.length > 0 ? (
                    <table className={styles.activityTable}>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Activity</th>
                                <th>Detail</th>
                                <th>Amount</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activityFeed.map((entry, i) => (
                                <tr key={i}>
                                    <td data-label="Date">
                                        {entry.date.toLocaleDateString('en-US', {
                                            month: 'short', day: 'numeric', year: 'numeric'
                                        })}
                                    </td>
                                    <td data-label="Activity">
                                        <span className={styles.activityType}>
                                            <span className={entry.dotClass} />
                                            {entry.type}
                                        </span>
                                    </td>
                                    <td data-label="Detail">
                                        {entry.detail}
                                    </td>
                                    <td data-label="Amount">
                                        <span className={
                                            entry.amount >= 0
                                                ? styles.activityAmountPositive
                                                : styles.activityAmountNegative
                                        }>
                                            {entry.amount >= 0 ? '+' : '-'}$
                                            {Math.abs(entry.amount).toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2
                                            })}
                                        </span>
                                    </td>
                                    <td data-label="Status">
                                        <span className={
                                            entry.status === 'completed'
                                                ? styles.statusCompleted
                                                : styles.statusPending
                                        }>
                                            {entry.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className={styles.emptyActivity}>
                        <div className={styles.emptyIcon}>
                            <Activity size={40} />
                        </div>
                        <p>No recent activity yet. Start trading to see your history here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;
