import React from 'react';
import { Menu } from 'lucide-react';
import { useSidebar } from '../../../context/SidebarContext';
import styles from './HamburgerButton.module.css';

const HamburgerButton = () => {
    const { isOpen, toggleSidebar } = useSidebar();

    return (
        <button
            className={styles.hamburgerBtn}
            onClick={toggleSidebar}
            aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isOpen}
            aria-controls="main-sidebar"
            type="button"
        >
            <Menu size={22} />
        </button>
    );
};

export default HamburgerButton;
