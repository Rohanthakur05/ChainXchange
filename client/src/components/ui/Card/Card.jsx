import React from 'react';
import styles from './Card.module.css';
import clsx from 'clsx';

const Card = ({ children, className, noPadding = false, ...props }) => {
    return (
        <div
            className={clsx(styles.card, noPadding && styles.noPadding, className)}
            {...props}
        >
            {children}
        </div>
    );
};

export default Card;
