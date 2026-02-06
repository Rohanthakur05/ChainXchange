import React, { useRef, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LineChart, CandlestickChart, Wallet, User, LogOut, X } from 'lucide-react';
import { useSidebar } from '../../../context/SidebarContext';
import styles from './Sidebar.module.css';
import clsx from 'clsx';

const Sidebar = () => {
    const { isOpen, closeSidebar } = useSidebar();
    const sidebarRef = useRef(null);
    const closeButtonRef = useRef(null);
    const navigate = useNavigate();

    const navItems = [
        { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/dashboard' },
        { icon: <LineChart size={20} />, label: 'Markets', path: '/markets' },
        { icon: <CandlestickChart size={20} />, label: 'Trade', path: '/trade' },
        { icon: <Wallet size={20} />, label: 'Portfolio', path: '/portfolio' },
        { icon: <User size={20} />, label: 'Profile', path: '/profile' },
    ];

    // Focus management - focus close button when sidebar opens
    useEffect(() => {
        if (isOpen && closeButtonRef.current) {
            closeButtonRef.current.focus();
        }
    }, [isOpen]);

    // Handle navigation item click - close sidebar and navigate
    const handleNavClick = (e, path) => {
        e.preventDefault();
        closeSidebar();
        // Small delay to allow animation before navigation
        setTimeout(() => {
            navigate(path);
        }, 150);
    };

    // Handle logout
    const handleLogout = () => {
        closeSidebar();
        localStorage.removeItem('token');
        navigate('/login');
        window.location.reload();
    };

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
            {/* Header with logo and close button */}
            <div className={styles.header}>
                <Link to="/dashboard" className={styles.logo} onClick={(e) => handleNavClick(e, '/dashboard')}>
                    <span>ChainXchange</span>
                </Link>
                <button
                    ref={closeButtonRef}
                    className={styles.closeBtn}
                    onClick={closeSidebar}
                    aria-label="Close navigation menu"
                    type="button"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Navigation items */}
            <nav className={styles.nav}>
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={(e) => handleNavClick(e, item.path)}
                        className={({ isActive }) => clsx(styles.navItem, isActive && styles.active)}
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Footer with logout */}
            <div className={styles.footer}>
                <button className={styles.navItem} onClick={handleLogout}>
                    <LogOut size={20} />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
