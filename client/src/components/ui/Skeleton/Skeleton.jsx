import React from 'react';
import styles from './Skeleton.module.css';

/**
 * Skeleton - Base skeleton loading component
 * 
 * Usage:
 * <Skeleton width={100} height={20} />
 * <Skeleton variant="circle" width={40} height={40} />
 * <Skeleton variant="text" />
 */
const Skeleton = ({
    width,
    height,
    variant = 'default', // 'default' | 'text' | 'textSm' | 'textLg' | 'circle' | 'card'
    className = '',
    style = {},
    ...props
}) => {
    const variantClass = styles[variant] || '';

    return (
        <div
            className={`${styles.skeleton} ${variantClass} ${className}`}
            style={{
                width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
                height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
                ...style,
            }}
            aria-hidden="true"
            {...props}
        />
    );
};

/**
 * SkeletonMarketRow - Skeleton for market/coin list rows
 */
export const SkeletonMarketRow = ({ className = '' }) => (
    <div className={`${styles.marketRow} ${className}`}>
        <div className={`${styles.skeleton} ${styles.coinIcon}`} />
        <div className={styles.coinName}>
            <div className={`${styles.skeleton} ${styles.name}`} />
            <div className={`${styles.skeleton} ${styles.symbol}`} />
        </div>
        <div className={`${styles.skeleton} ${styles.price}`} />
        <div className={`${styles.skeleton} ${styles.change}`} />
        <div className={`${styles.skeleton} ${styles.action}`} />
    </div>
);

/**
 * SkeletonDashboardCard - Skeleton for dashboard stat cards
 */
export const SkeletonDashboardCard = ({ className = '', showChart = false }) => (
    <div className={`${styles.dashboardCard} ${className}`}>
        <div className={styles.header}>
            <div className={`${styles.skeleton} ${styles.title}`} />
            <div className={`${styles.skeleton} ${styles.badge}`} />
        </div>
        <div className={`${styles.skeleton} ${styles.value}`} />
        <div className={`${styles.skeleton} ${styles.subtitle}`} />
        {showChart && <div className={`${styles.skeleton} ${styles.chartSkeleton}`} />}
    </div>
);

/**
 * SkeletonHoldingRow - Skeleton for portfolio holdings
 */
export const SkeletonHoldingRow = ({ className = '' }) => (
    <div className={`${styles.holdingRow} ${className}`}>
        <div className={`${styles.skeleton} ${styles.icon}`} />
        <div className={`${styles.skeleton} ${styles.name}`} />
        <div className={`${styles.skeleton} ${styles.value}`} />
        <div className={`${styles.skeleton} ${styles.value}`} />
        <div className={`${styles.skeleton} ${styles.value}`} />
    </div>
);

/**
 * SkeletonTable - Multiple skeleton rows for tables
 */
export const SkeletonTable = ({ rows = 5, RowComponent = SkeletonMarketRow }) => (
    <>
        {Array.from({ length: rows }).map((_, i) => (
            <RowComponent key={i} />
        ))}
    </>
);

export default Skeleton;
