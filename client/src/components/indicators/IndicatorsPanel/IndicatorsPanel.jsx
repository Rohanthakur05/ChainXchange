import React, { useState, useMemo, useCallback } from 'react';
import { X, Search, Check, TrendingUp, Activity, BarChart2, Zap } from 'lucide-react';
import { INDICATORS, INDICATOR_CATEGORIES, searchIndicators, getIndicatorById } from '../../../config/INDICATORS_CONFIG';
import styles from './IndicatorsPanel.module.css';

/**
 * IndicatorsPanel - Floating modal for browsing and adding indicators
 * 
 * Features:
 * - Search input for filtering
 * - Category tabs (All, Overlays, Momentum, Volume, Volatility)
 * - Scrollable indicator list with descriptions
 * - Checkmarks for active indicators
 * - One-click add/remove
 */
const IndicatorsPanel = ({ isOpen, onClose, activeIndicators = [], onToggleIndicator }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState(INDICATOR_CATEGORIES.ALL);

    // Filter indicators based on search and category
    const filteredIndicators = useMemo(() => {
        return searchIndicators(searchQuery, activeCategory);
    }, [searchQuery, activeCategory]);

    // Check if indicator is active
    const isActive = useCallback((indicatorId) => {
        return activeIndicators.includes(indicatorId);
    }, [activeIndicators]);

    // Handle indicator click
    const handleIndicatorClick = (indicator) => {
        onToggleIndicator(indicator.id);
    };

    // Category config
    const categories = [
        { id: INDICATOR_CATEGORIES.ALL, label: 'All', icon: null },
        { id: INDICATOR_CATEGORIES.OVERLAYS, label: 'Overlays', icon: TrendingUp },
        { id: INDICATOR_CATEGORIES.MOMENTUM, label: 'Momentum', icon: Activity },
        { id: INDICATOR_CATEGORIES.VOLUME, label: 'Volume', icon: BarChart2 },
        { id: INDICATOR_CATEGORIES.VOLATILITY, label: 'Volatility', icon: Zap }
    ];

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <h2 className={styles.title}>Indicators</h2>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Search */}
                <div className={styles.searchContainer}>
                    <Search size={16} className={styles.searchIcon} />
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Search indicators..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                </div>

                {/* Category Tabs */}
                <div className={styles.categories}>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            className={`${styles.categoryTab} ${activeCategory === cat.id ? styles.active : ''}`}
                            onClick={() => setActiveCategory(cat.id)}
                        >
                            {cat.icon && <cat.icon size={14} />}
                            <span>{cat.label}</span>
                        </button>
                    ))}
                </div>

                {/* Indicator List */}
                <div className={styles.indicatorList}>
                    {filteredIndicators.length === 0 ? (
                        <div className={styles.emptyState}>
                            No indicators match your search
                        </div>
                    ) : (
                        filteredIndicators.map(indicator => (
                            <button
                                key={indicator.id}
                                className={`${styles.indicatorItem} ${isActive(indicator.id) ? styles.activeIndicator : ''}`}
                                onClick={() => handleIndicatorClick(indicator)}
                            >
                                <div className={styles.indicatorInfo}>
                                    <span className={styles.indicatorName}>{indicator.name}</span>
                                    <span className={styles.indicatorDesc}>{indicator.description}</span>
                                </div>
                                {isActive(indicator.id) && (
                                    <div className={styles.checkmark}>
                                        <Check size={16} />
                                    </div>
                                )}
                            </button>
                        ))
                    )}
                </div>

                {/* Active Count Footer */}
                {activeIndicators.length > 0 && (
                    <div className={styles.footer}>
                        <span>{activeIndicators.length} indicator{activeIndicators.length !== 1 ? 's' : ''} active</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default IndicatorsPanel;
