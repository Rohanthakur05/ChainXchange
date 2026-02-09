import React, { memo } from 'react';
import usePriceFlash from '../../../hooks/usePriceFlash';
import styles from './PriceCell.module.css';

/**
 * PriceCell - Animating price display with flash effect on change
 * 
 * Features:
 * - Green flash on price increase
 * - Red flash on price decrease
 * - Respects prefers-reduced-motion
 * - Optimized with React.memo
 * 
 * @param {number} price - Current price value
 * @param {string} coinId - Unique identifier for tracking
 * @param {string} className - Additional CSS classes
 */
const PriceCell = memo(({ price, coinId, className = '' }) => {
    const flashClass = usePriceFlash(price, coinId);

    return (
        <span
            className={`${styles.priceCell} ${flashClass ? styles[flashClass] : ''} ${className}`.trim()}
        >
            ${price?.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: price >= 1 ? 2 : 6
            })}
        </span>
    );
});

PriceCell.displayName = 'PriceCell';

export default PriceCell;
