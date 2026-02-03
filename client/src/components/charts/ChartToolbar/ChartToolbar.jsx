import React from 'react';
import { Activity, X } from 'lucide-react';
import { getIndicatorById } from '../../../config/INDICATORS_CONFIG';
import styles from './ChartToolbar.module.css';

/**
 * ChartToolbar - Toolbar above the chart
 * 
 * Features:
 * - Timeframe selector buttons
 * - Indicators button with count badge
 * - Active indicator chips with remove button
 */
const ChartToolbar = ({
    timeframe = 'D',
    onTimeframeChange,
    activeIndicators = [],
    onOpenIndicators,
    onRemoveIndicator
}) => {
    const timeframes = [
        { value: '1', label: '1m' },
        { value: '5', label: '5m' },
        { value: '15', label: '15m' },
        { value: '60', label: '1h' },
        { value: '240', label: '4h' },
        { value: 'D', label: '1D' },
        { value: 'W', label: '1W' }
    ];

    return (
        <div className={styles.toolbar}>
            {/* Left: Timeframes */}
            <div className={styles.timeframes}>
                {timeframes.map(tf => (
                    <button
                        key={tf.value}
                        className={`${styles.timeframeBtn} ${timeframe === tf.value ? styles.active : ''}`}
                        onClick={() => onTimeframeChange(tf.value)}
                    >
                        {tf.label}
                    </button>
                ))}
            </div>

            {/* Center: Active Indicator Chips */}
            {activeIndicators.length > 0 && (
                <div className={styles.activeChips}>
                    {activeIndicators.map(indicatorId => {
                        const indicator = getIndicatorById(indicatorId);
                        if (!indicator) return null;
                        return (
                            <div key={indicatorId} className={styles.chip}>
                                <span>{indicator.shortName}</span>
                                <button
                                    className={styles.chipRemove}
                                    onClick={() => onRemoveIndicator(indicatorId)}
                                    title={`Remove ${indicator.name}`}
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Right: Indicators Button */}
            <button className={styles.indicatorsBtn} onClick={onOpenIndicators}>
                <Activity size={16} />
                <span>Indicators</span>
                {activeIndicators.length > 0 && (
                    <span className={styles.badge}>{activeIndicators.length}</span>
                )}
            </button>
        </div>
    );
};

export default ChartToolbar;
