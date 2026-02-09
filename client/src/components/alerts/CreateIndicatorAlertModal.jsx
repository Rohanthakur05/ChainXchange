import React, { useState, useEffect } from 'react';
import { X, Activity, HelpCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { useAlerts } from '../../context/AlertContext';
import { INDICATOR_ALERT_TYPES } from '../../services/indicatorService';
import styles from './CreateIndicatorAlertModal.module.css';

/**
 * CreateIndicatorAlertModal - Modal for creating indicator-based alerts
 * 
 * Supports:
 * - RSI threshold alerts
 * - MACD crossover alerts
 * - MA crossover alerts
 */
const CreateIndicatorAlertModal = ({ isOpen, onClose, coin }) => {
    const { createAlert } = useAlerts();

    // State
    const [indicatorType, setIndicatorType] = useState('rsi');
    const [alertMode, setAlertMode] = useState('once');
    const [config, setConfig] = useState({
        rsi: { threshold: 30, direction: 'below', period: 14 },
        macd: { signal: 'bullish_cross' },
        ma: { fastPeriod: 9, slowPeriod: 21, signal: 'golden', maType: 'ema' }
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setIndicatorType('rsi');
            setAlertMode('once');
            setConfig({
                rsi: { threshold: 30, direction: 'below', period: 14 },
                macd: { signal: 'bullish_cross' },
                ma: { fastPeriod: 9, slowPeriod: 21, signal: 'golden', maType: 'ema' }
            });
        }
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!coin || isSubmitting) return;

        setIsSubmitting(true);

        try {
            createAlert({
                type: 'indicator',
                coinId: coin.id,
                coinName: coin.name,
                coinSymbol: coin.symbol,
                indicatorType,
                config: config[indicatorType === 'ma_crossover' ? 'ma' : indicatorType],
                alertMode
            });
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateConfig = (type, field, value) => {
        setConfig(prev => ({
            ...prev,
            [type]: { ...prev[type], [field]: value }
        }));
    };

    if (!isOpen) return null;

    const currentIndicator = INDICATOR_ALERT_TYPES[indicatorType];

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerTitle}>
                        <Activity size={18} />
                        <span>Create Indicator Alert</span>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Coin info */}
                {coin && (
                    <div className={styles.coinInfo}>
                        <img src={coin.image} alt="" className={styles.coinImage} />
                        <span className={styles.coinName}>{coin.name}</span>
                        <span className={styles.coinSymbol}>{coin.symbol.toUpperCase()}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className={styles.form}>
                    {/* Indicator type selector */}
                    <div className={styles.section}>
                        <label className={styles.label}>Indicator</label>
                        <div className={styles.indicatorTabs}>
                            {Object.values(INDICATOR_ALERT_TYPES).map(ind => (
                                <button
                                    key={ind.id}
                                    type="button"
                                    className={`${styles.indicatorTab} ${indicatorType === ind.id ? styles.active : ''}`}
                                    onClick={() => setIndicatorType(ind.id)}
                                >
                                    {ind.name}
                                </button>
                            ))}
                        </div>
                        <div className={styles.indicatorDescription}>
                            <HelpCircle size={14} />
                            <span>{currentIndicator?.description}</span>
                        </div>
                    </div>

                    {/* RSI config */}
                    {indicatorType === 'rsi' && (
                        <div className={styles.section}>
                            <label className={styles.label}>Alert when RSI</label>
                            <div className={styles.rsiConfig}>
                                <select
                                    value={config.rsi.direction}
                                    onChange={(e) => updateConfig('rsi', 'direction', e.target.value)}
                                    className={styles.select}
                                >
                                    <option value="below">Goes below</option>
                                    <option value="above">Goes above</option>
                                </select>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={config.rsi.threshold}
                                    onChange={(e) => updateConfig('rsi', 'threshold', parseFloat(e.target.value))}
                                    className={styles.numberInput}
                                />
                            </div>
                            <div className={styles.presets}>
                                <span>Quick: </span>
                                <button type="button" onClick={() => updateConfig('rsi', 'threshold', 30)}>
                                    Oversold (30)
                                </button>
                                <button type="button" onClick={() => updateConfig('rsi', 'threshold', 70)}>
                                    Overbought (70)
                                </button>
                            </div>
                        </div>
                    )}

                    {/* MACD config */}
                    {indicatorType === 'macd' && (
                        <div className={styles.section}>
                            <label className={styles.label}>Alert on</label>
                            <div className={styles.signalButtons}>
                                <button
                                    type="button"
                                    className={`${styles.signalBtn} ${config.macd.signal === 'bullish_cross' ? styles.bullish : ''}`}
                                    onClick={() => updateConfig('macd', 'signal', 'bullish_cross')}
                                >
                                    <TrendingUp size={16} />
                                    Bullish Cross
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.signalBtn} ${config.macd.signal === 'bearish_cross' ? styles.bearish : ''}`}
                                    onClick={() => updateConfig('macd', 'signal', 'bearish_cross')}
                                >
                                    <TrendingDown size={16} />
                                    Bearish Cross
                                </button>
                            </div>
                        </div>
                    )}

                    {/* MA Crossover config */}
                    {indicatorType === 'ma_crossover' && (
                        <div className={styles.section}>
                            <label className={styles.label}>Alert on</label>
                            <div className={styles.signalButtons}>
                                <button
                                    type="button"
                                    className={`${styles.signalBtn} ${config.ma.signal === 'golden' ? styles.bullish : ''}`}
                                    onClick={() => updateConfig('ma', 'signal', 'golden')}
                                >
                                    <TrendingUp size={16} />
                                    Golden Cross
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.signalBtn} ${config.ma.signal === 'death' ? styles.bearish : ''}`}
                                    onClick={() => updateConfig('ma', 'signal', 'death')}
                                >
                                    <TrendingDown size={16} />
                                    Death Cross
                                </button>
                            </div>
                            <div className={styles.maPeriods}>
                                <div className={styles.periodInput}>
                                    <label>Fast MA</label>
                                    <input
                                        type="number"
                                        min="2"
                                        max="50"
                                        value={config.ma.fastPeriod}
                                        onChange={(e) => updateConfig('ma', 'fastPeriod', parseInt(e.target.value))}
                                    />
                                </div>
                                <div className={styles.periodInput}>
                                    <label>Slow MA</label>
                                    <input
                                        type="number"
                                        min="5"
                                        max="200"
                                        value={config.ma.slowPeriod}
                                        onChange={(e) => updateConfig('ma', 'slowPeriod', parseInt(e.target.value))}
                                    />
                                </div>
                                <select
                                    value={config.ma.maType}
                                    onChange={(e) => updateConfig('ma', 'maType', e.target.value)}
                                    className={styles.select}
                                >
                                    <option value="ema">EMA</option>
                                    <option value="sma">SMA</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Alert mode */}
                    <div className={styles.section}>
                        <label className={styles.label}>Alert Mode</label>
                        <div className={styles.modeButtons}>
                            <button
                                type="button"
                                className={`${styles.modeBtn} ${alertMode === 'once' ? styles.active : ''}`}
                                onClick={() => setAlertMode('once')}
                            >
                                Once
                            </button>
                            <button
                                type="button"
                                className={`${styles.modeBtn} ${alertMode === 'recurring' ? styles.active : ''}`}
                                onClick={() => setAlertMode('recurring')}
                            >
                                Recurring
                            </button>
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        className={styles.submitBtn}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Creating...' : 'Create Alert'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CreateIndicatorAlertModal;
