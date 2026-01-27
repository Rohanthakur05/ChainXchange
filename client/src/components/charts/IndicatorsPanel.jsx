import React, { useState, useMemo } from 'react';
import { X, Search, TrendingUp, BarChart3, Activity, Plus, Check } from 'lucide-react';
import styles from './IndicatorsPanel.module.css';

const INDICATORS = [
    // Trend
    { id: 'ma20', name: 'Moving Average (20)', shortName: 'MA 20', category: 'trend', color: '#F7931A' },
    { id: 'ma50', name: 'Moving Average (50)', shortName: 'MA 50', category: 'trend', color: '#627EEA' },
    { id: 'ma200', name: 'Moving Average (200)', shortName: 'MA 200', category: 'trend', color: '#16C784' },
    { id: 'ema', name: 'Exponential MA (12)', shortName: 'EMA 12', category: 'trend', color: '#8247E5' },
    { id: 'bb', name: 'Bollinger Bands', shortName: 'BB', category: 'trend', color: '#00D4AA' },

    // Momentum
    { id: 'rsi', name: 'Relative Strength Index', shortName: 'RSI', category: 'momentum', color: '#EA3943' },
    { id: 'macd', name: 'MACD', shortName: 'MACD', category: 'momentum', color: '#3861FB' },
    { id: 'stoch', name: 'Stochastic Oscillator', shortName: 'Stoch', category: 'momentum', color: '#F0B90B' },

    // Volume
    { id: 'volume', name: 'Volume', shortName: 'Vol', category: 'volume', color: '#8B949E' },
    { id: 'obv', name: 'On-Balance Volume', shortName: 'OBV', category: 'volume', color: '#58A6FF' },
];

const CATEGORY_ICONS = {
    trend: TrendingUp,
    momentum: Activity,
    volume: BarChart3
};

const CATEGORY_LABELS = {
    trend: 'Trend',
    momentum: 'Momentum',
    volume: 'Volume'
};

const IndicatorsPanel = ({ isOpen, onClose, activeIndicators, onToggleIndicator }) => {
    const [search, setSearch] = useState('');

    const filteredIndicators = useMemo(() => {
        if (!search.trim()) return INDICATORS;
        const query = search.toLowerCase();
        return INDICATORS.filter(ind =>
            ind.name.toLowerCase().includes(query) ||
            ind.shortName.toLowerCase().includes(query)
        );
    }, [search]);

    const groupedIndicators = useMemo(() => {
        const groups = { trend: [], momentum: [], volume: [] };
        filteredIndicators.forEach(ind => {
            if (groups[ind.category]) {
                groups[ind.category].push(ind);
            }
        });
        return groups;
    }, [filteredIndicators]);

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.panel} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h3>Indicators</h3>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <div className={styles.searchWrapper}>
                    <Search size={16} className={styles.searchIcon} />
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Search indicators..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className={styles.activeSection}>
                    <span className={styles.activeLabel}>Active:</span>
                    {activeIndicators.length === 0 ? (
                        <span className={styles.noActive}>None</span>
                    ) : (
                        <div className={styles.activeTags}>
                            {activeIndicators.map(id => {
                                const ind = INDICATORS.find(i => i.id === id);
                                return ind ? (
                                    <span
                                        key={id}
                                        className={styles.activeTag}
                                        style={{ borderColor: ind.color }}
                                        onClick={() => onToggleIndicator(id)}
                                    >
                                        {ind.shortName}
                                        <X size={12} />
                                    </span>
                                ) : null;
                            })}
                        </div>
                    )}
                </div>

                <div className={styles.indicatorsList}>
                    {Object.entries(groupedIndicators).map(([category, indicators]) => {
                        if (indicators.length === 0) return null;
                        const Icon = CATEGORY_ICONS[category];

                        return (
                            <div key={category} className={styles.categoryGroup}>
                                <div className={styles.categoryHeader}>
                                    <Icon size={14} />
                                    <span>{CATEGORY_LABELS[category]}</span>
                                </div>
                                {indicators.map(ind => {
                                    const isActive = activeIndicators.includes(ind.id);
                                    return (
                                        <button
                                            key={ind.id}
                                            className={`${styles.indicatorItem} ${isActive ? styles.active : ''}`}
                                            onClick={() => onToggleIndicator(ind.id)}
                                        >
                                            <span
                                                className={styles.indicatorDot}
                                                style={{ background: ind.color }}
                                            />
                                            <span className={styles.indicatorName}>{ind.name}</span>
                                            <span className={styles.indicatorAction}>
                                                {isActive ? <Check size={14} /> : <Plus size={14} />}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export { INDICATORS };
export default IndicatorsPanel;
