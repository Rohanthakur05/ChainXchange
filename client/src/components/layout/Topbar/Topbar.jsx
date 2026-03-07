import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Bell, Wallet, ChevronDown, User, Settings, LogOut, Plus } from 'lucide-react';
import { useGlobalSearch } from '../../../context/GlobalSearchContext';
import { useWallet } from '../../../context/WalletContext';
import HamburgerButton from '../Sidebar/HamburgerButton';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import AddMoneyModal from '../../wallet/AddMoneyModal';
import api from '../../../utils/api';
import styles from './Topbar.module.css';

const Topbar = ({ onLogout }) => {
    const { openSearch } = useGlobalSearch();
    const { wallet, loading: walletLoading } = useWallet();
    const navigate = useNavigate();
    const controlsRef = useRef(null);

    // State
    const [notifOpen, setNotifOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [addMoneyOpen, setAddMoneyOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [user, setUser] = useState(null);

    useEffect(() => {
        fetchNotifications();
        fetchUser();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    const fetchUser = async () => {
        try {
            const response = await api.get('/auth/profile');
            if (response.data?.user) {
                setUser(response.data.user);
            }
        } catch (error) {
            console.error('Failed to fetch user profile', error);
        }
    };

    const fetchNotifications = async () => {
        try {
            const response = await api.get('/alerts');
            if (response.data?.alerts) {
                const triggered = response.data.alerts
                    .filter(a => a.status === 'triggered')
                    .sort((a, b) => new Date(b.triggeredAt) - new Date(a.triggeredAt));

                const notifs = triggered.map(alert => ({
                    id: alert._id,
                    message: `${alert.coinSymbol} triggered: ${formatCondition(alert)}`,
                    time: formatDate(alert.triggeredAt),
                    read: false
                }));

                setNotifications(notifs);
                setUnreadCount(notifs.length);
            }
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    };

    const formatCondition = (alert) => {
        if (alert.type.includes('price')) return `Price hit target`;
        return `Price moved by ${alert.percentageThreshold}%`;
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.round(diffMs / 60000);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return `${Math.round(diffMins / 60)}h ago`;
        return date.toLocaleDateString();
    };

    // Click outside to close dropdowns
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (controlsRef.current && !controlsRef.current.contains(e.target)) {
                setNotifOpen(false);
                setProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleNotifications = () => {
        setNotifOpen(!notifOpen);
        setProfileOpen(false);
    };

    const toggleProfile = () => {
        setProfileOpen(!profileOpen);
        setNotifOpen(false);
    };

    const handleLogout = async () => {
        try {
            // Tell the backend to clear the HttpOnly JWT cookie.
            // The auth cookie is httpOnly so JavaScript cannot remove it directly —
            // only a server response with Set-Cookie: token=; Max-Age=0 can do it.
            await api.get('/auth/logout');
        } catch (err) {
            // Even if the network call fails, we still clear local state
            // so the user isn't stuck in a broken half-logged-in state.
            console.warn('Logout request failed, clearing local state anyway:', err.message);
        } finally {
            // Reset App.jsx authState so protected routes redirect to /login immediately.
            // Without this, React still thinks the user is authenticated and
            // navigate('/login') bounces straight back to /markets.
            if (onLogout) onLogout();
            navigate('/login');
        }
    };

    const formattedBalance = walletLoading
        ? 'Loading...'
        : `$${wallet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const userInitial = user?.username ? user.username.charAt(0).toUpperCase() : <User size={18} />;

    return (
        <>
            <header className={styles.topbar}>
                {/* Left section with hamburger and search */}
                <div className={styles.leftSection}>
                    <HamburgerButton />
                    <button
                        className={styles.searchTrigger}
                        onClick={openSearch}
                        type="button"
                    >
                        <Search size={16} />
                        <span>Search cryptocurrencies...</span>
                    </button>
                </div>

                <div className={styles.actions}>
                    {/* Balance Zone */}
                    <div className={styles.balanceContainer}>
                        <Wallet size={16} className={styles.balanceIcon} />
                        <div className={styles.balance}>
                            <span className={styles.balanceLabel}>Total Balance</span>
                            <span className={styles.balanceValue}>{formattedBalance}</span>
                        </div>
                        <button
                            className={styles.addMoneyBtn}
                            onClick={() => setAddMoneyOpen(true)}
                            title="Add Money"
                        >
                            <Plus size={16} />
                        </button>
                    </div>

                    {/* Divider */}
                    <div className={styles.divider} />

                    {/* Controls Zone */}
                    <div className={styles.controls} ref={controlsRef}>
                        {/* Theme Toggle */}
                        <ThemeToggle />

                        {/* Notification Button */}
                        <div className={styles.dropdownWrapper}>
                            <button
                                className={styles.notificationBtn}
                                aria-label="Notifications"
                                type="button"
                                onClick={toggleNotifications}
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span className={styles.notificationBadge}>
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>
                            {notifOpen && (
                                <div className={styles.dropdown}>
                                    <div className={styles.dropdownHeader}>Notifications</div>
                                    {notifications.length > 0 ? (
                                        notifications.map((notif) => (
                                            <div key={notif.id} className={styles.dropdownItem}>
                                                <span className={styles.notifMessage}>{notif.message}</span>
                                                <span className={styles.notifTime}>{notif.time}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className={styles.dropdownEmpty}>No new notifications</div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Profile Button */}
                        <div className={styles.dropdownWrapper}>
                            <button
                                className={styles.profileBtn}
                                aria-label="User menu"
                                type="button"
                                onClick={toggleProfile}
                            >
                                <div className={styles.avatar}>
                                    {userInitial}
                                </div>
                                <ChevronDown size={14} className={`${styles.chevron} ${profileOpen ? styles.chevronOpen : ''}`} />
                            </button>
                            {profileOpen && (
                                <div className={styles.dropdown}>
                                    <Link to="/profile" className={styles.dropdownItem} onClick={() => setProfileOpen(false)}>
                                        <User size={16} />
                                        <span>Profile</span>
                                    </Link>
                                    <Link to="/profile" className={styles.dropdownItem} onClick={() => setProfileOpen(false)}>
                                        <Settings size={16} />
                                        <span>Settings</span>
                                    </Link>
                                    <div className={styles.dropdownDivider} />
                                    <button className={styles.dropdownItem} onClick={handleLogout}>
                                        <LogOut size={16} />
                                        <span>Logout</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Add Money Modal - New Component */}
            <AddMoneyModal
                isOpen={addMoneyOpen}
                onClose={() => setAddMoneyOpen(false)}
            />
        </>
    );
};

export default Topbar;
