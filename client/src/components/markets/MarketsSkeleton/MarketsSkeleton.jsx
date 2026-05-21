import React from 'react';
import { SkeletonDashboardCard, SkeletonMarketRow } from '../../ui/Skeleton';
import styles from './MarketsSkeleton.module.css';

const MarketsSkeleton = () => (
    <div className={styles.wrap} aria-busy="true" aria-label="Loading markets">
        <div className={styles.header}>
            <div className={styles.titleBar} />
            <div className={styles.subtitleBar} />
        </div>
        <div className={styles.stats}>
            {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonDashboardCard key={i} />
            ))}
        </div>
        <div className={styles.rows}>
            {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonMarketRow key={i} />
            ))}
        </div>
    </div>
);

export default MarketsSkeleton;
