import React from 'react';
import styles from './Input.module.css';
import clsx from 'clsx';

const Input = ({ label, icon, className, ...props }) => {
    return (
        <div className={clsx(styles.container, className)}>
            {label && <label className={styles.label}>{label}</label>}
            <div className={styles.inputWrapper}>
                {icon && <span className={styles.icon}>{icon}</span>}
                <input
                    className={clsx(styles.input, icon && styles.inputWithIcon)}
                    {...props}
                />
            </div>
        </div>
    );
};

export default Input;
