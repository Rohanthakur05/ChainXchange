import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, LineChart, CandlestickChart, Wallet, User, Settings, LogOut } from 'lucide-react';
import styles from './Sidebar.module.css';
import clsx from 'clsx';

const Sidebar = () => {
    const navItems = [
        { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/dashboard' },
        { icon: <LineChart size={20} />, label: 'Markets', path: '/markets' },
        { icon: <CandlestickChart size={20} />, label: 'Trade', path: '/trade' },
        { icon: <Wallet size={20} />, label: 'Portfolio', path: '/portfolio' },
        { icon: <User size={20} />, label: 'Profile', path: '/profile' },
    ];

    return (
        <aside className={styles.sidebar}>
            <Link to="/dashboard" className={styles.logo}>
                <span>ChainXchange</span>
            </Link>

            <nav className={styles.nav}>
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => clsx(styles.navItem, isActive && styles.active)}
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className={styles.footer}>
                <NavLink to="/login" className={styles.navItem}>
                    <LogOut size={20} />
                    <span>Logout</span>
                </NavLink>
            </div>
        </aside>
    );
};

export default Sidebar;
