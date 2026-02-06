import React from 'react';
import { useSidebar } from '../../../context/SidebarContext';
import styles from './Overlay.module.css';
import clsx from 'clsx';

const Overlay = () => {
    const { isOpen, closeSidebar } = useSidebar();

    return (
        <div
            className={clsx(styles.overlay, isOpen && styles.visible)}
            onClick={closeSidebar}
            aria-hidden="true"
        />
    );
};

export default Overlay;
