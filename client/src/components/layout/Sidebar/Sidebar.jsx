import React, { useRef, useEffect, useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, LineChart, CandlestickChart, Wallet, User,
    LogOut, X, Link2, ChevronRight
} from 'lucide-react';
import { useSidebar } from '../../../context/SidebarContext';
import api from '../../../utils/api';
import styles from './Sidebar.module.css';
import clsx from 'clsx';

const NAV_SECTIONS = [
    {
        label: 'Main',
        items: [
            { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
            { icon: LineChart, label: 'Markets', path: '/markets' },
            { icon: CandlestickChart, label: 'Trade', path: '/trade' },
        ]
    },
    {
        label: 'Wallet',
        items: [
            { icon: Wallet, label: 'Portfolio', path: '/portfolio' },
        ]
    },
    {
        label: 'Account',
        items: [
            { icon: User, label: 'Profile', path: '/profile' },
        ]
    }
];

const Sidebar = () => {
    const { isOpen, closeSidebar } = useSidebar();
    const sidebarRef = useRef(null);
    const closeButtonRef = useRef(null);
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    // Fetch user data for the user panel
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await api.get('/auth/profile');
                setUser(res.data.user);
            } catch (err) {
                // Silently ignore — sidebar still works
            }
        };
        fetchUser();
    }, []);

    // Focus management
    useEffect(() => {
        if (isOpen && closeButtonRef.current) {
            closeButtonRef.current.focus();
        }
    }, [isOpen]);

    const handleNavClick = (e, path) => {
        e.preventDefault();
        closeSidebar();
        setTimeout(() => {
            navigate(path);
        }, 150);
    };

    const handleLogout = () => {
        closeSidebar();
        localStorage.removeItem('token');
        navigate('/login');
        window.location.reload();
    };

    const userInitial = user?.username
        ? user.username.charAt(0).toUpperCase()
        : 'U';

    return (
        <aside
            id="main-sidebar"
            ref={sidebarRef}
            className={clsx(styles.sidebar, isOpen && styles.open)}
            role="dialog"
            aria-modal="true"
            aria-label="Main navigation"
            aria-hidden={!isOpen}
        >
            {/* ─── Brand Header ─── */}
            <div className={styles.header}>
                <Link
                    to="/dashboard"
                    className={styles.logo}
                    onClick={(e) => handleNavClick(e, '/dashboard')}
                >
                    <div className={styles.logoIcon}>
                        <Link2 size={16} />
                    </div>
                    <span className={styles.logoText}>ChainXchange</span>
                </Link>
                <button
                    ref={closeButtonRef}
                    className={styles.closeBtn}
                    onClick={closeSidebar}
                    aria-label="Close navigation menu"
                    type="button"
                >
                    <X size={16} />
                </button>
            </div>

            {/* ─── Navigation Sections ─── */}
            <nav className={styles.nav}>
                {NAV_SECTIONS.map((section, sIdx) => (
                    <div key={section.label} className={styles.navSection}>
                        <div className={styles.sectionLabel}>{section.label}</div>
                        {section.items.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={(e) => handleNavClick(e, item.path)}
                                className={({ isActive }) =>
                                    clsx(styles.navItem, isActive && styles.active)
                                }
                            >
                                <span className={styles.navItemIcon}>
                                    <item.icon size={18} />
                                </span>
                                <span className={styles.navItemLabel}>{item.label}</span>
                            </NavLink>
                        ))}
                        {sIdx < NAV_SECTIONS.length - 1 && (
                            <div className={styles.divider} />
                        )}
                    </div>
                ))}
            </nav>

            {/* ─── User Panel ─── */}
            <div className={styles.userPanel}>
                <Link
                    to="/profile"
                    className={styles.userCard}
                    onClick={(e) => handleNavClick(e, '/profile')}
                >
                    <div className={styles.userAvatar}>
                        {userInitial}
                    </div>
                    <div className={styles.userInfo}>
                        <div className={styles.userName}>
                            {user?.username || 'User'}
                        </div>
                        <div className={styles.userTier}>Standard Account</div>
                    </div>
                    <ChevronRight size={14} className={styles.userChevron} />
                </Link>
            </div>

            {/* ─── Logout ─── */}
            <div className={styles.footer}>
                <button className={styles.logoutBtn} onClick={handleLogout}>
                    <span className={styles.logoutIcon}>
                        <LogOut size={17} />
                    </span>
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
