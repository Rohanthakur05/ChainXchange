import React from 'react';
import styles from './Badge.module.css';
import clsx from 'clsx';

const Badge = ({ children, variant = 'neutral', className }) => {
    return (
        <span className={clsx(styles.badge, styles[variant], className)}>
            {children}
        </span>
    );
};

export default Badge;
