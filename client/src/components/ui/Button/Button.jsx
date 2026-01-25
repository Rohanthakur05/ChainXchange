import React from 'react';
import styles from './Button.module.css';
import clsx from 'clsx';

const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    className,
    block = false,
    ...props
}) => {
    return (
        <button
            className={clsx(
                styles.button,
                styles[variant],
                styles[size],
                block && styles.block,
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;
