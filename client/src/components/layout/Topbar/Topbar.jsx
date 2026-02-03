import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Bell, Wallet, ChevronDown, User, Settings, LogOut, Plus } from 'lucide-react';
import { useGlobalSearch } from '../../../context/GlobalSearchContext';
import { useWallet } from '../../../context/WalletContext';
import AddMoneyModal from '../../wallet/AddMoneyModal';
import api from '../../../utils/api';
import styles from './Topbar.module.css';

const Topbar = () => {
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

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

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

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
        window.location.reload();
    };

    const formattedBalance = walletLoading
        ? 'Loading...'
        : `$${wallet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <>
            <header className={styles.topbar}>
                <button
                    className={styles.searchTrigger}
                    onClick={openSearch}
                    type="button"
                >
                    <Search size={16} />
                    <span>Search cryptocurrencies...</span>
                </button>

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
                            <Plus size={14} />
                        </button>
                    </div>

                    {/* Divider */}
                    <div className={styles.divider} />

                    {/* Controls Zone */}
                    <div className={styles.controls} ref={controlsRef}>
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
                                    <User size={18} />
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
