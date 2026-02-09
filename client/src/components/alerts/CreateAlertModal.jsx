import React, { useState, useEffect } from 'react';
import { X, Bell, ArrowUpRight, ArrowDownRight, RotateCcw, Zap } from 'lucide-react';
import { useAlerts } from '../../context/AlertContext';
import api from '../../utils/api';
import Button from '../ui/Button/Button';
import styles from './CreateAlertModal.module.css';

const ALERT_CONDITIONS = [
    { id: 'above', label: 'Price Above', icon: ArrowUpRight, description: 'Notify when price rises above target' },
    { id: 'below', label: 'Price Below', icon: ArrowDownRight, description: 'Notify when price drops below target' },
];

const ALERT_MODES = [
    { id: 'once', label: 'Trigger once', icon: Zap, description: 'Auto-disable after triggered' },
    { id: 'recurring', label: 'Recurring', icon: RotateCcw, description: 'Notify every time condition is met' },
];

const CreateAlertModal = ({ coin, currentPrice, onClose, onCreated }) => {
    const { createAlert } = useAlerts();
    const [condition, setCondition] = useState('above');
    const [targetPrice, setTargetPrice] = useState('');
    const [alertMode, setAlertMode] = useState('once');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Set sensible default target price
    useEffect(() => {
        if (currentPrice && !targetPrice) {
            const defaultTarget = condition === 'above'
                ? Math.round(currentPrice * 1.05 * 100) / 100
                : Math.round(currentPrice * 0.95 * 100) / 100;
            setTargetPrice(defaultTarget.toString());
        }
    }, [currentPrice, condition, targetPrice]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const target = parseFloat(targetPrice);
        if (!targetPrice || isNaN(target) || target <= 0) {
            setError('Please enter a valid target price');
            return;
        }

        // Validate price distance (0.5% minimum)
        const priceDiff = Math.abs(target - currentPrice) / currentPrice;
        if (priceDiff < 0.005) {
            setError('Target must be at least 0.5% away from current price');
            return;
        }

        // Validate direction makes sense
        if (condition === 'above' && target <= currentPrice) {
            setError('Target price must be above current price');
            return;
        }
        if (condition === 'below' && target >= currentPrice) {
            setError('Target price must be below current price');
            return;
        }

        setLoading(true);

        try {
            // Create in local AlertContext
            const newAlert = createAlert({
                coinId: coin.id,
                coinName: coin.name,
                coinSymbol: coin.symbol,
                condition,
                targetPrice: target,
                alertMode,
            });

            // Also try to sync with backend (non-blocking)
            try {
                await api.post('/alerts', {
                    coinId: coin.id,
                    coinSymbol: coin.symbol,
                    coinName: coin.name,
                    type: condition === 'above' ? 'price_above' : 'price_below',
                    targetPrice: target,
                    referencePrice: currentPrice,
                    alertMode,
                    localId: newAlert.id,
                });
            } catch (apiErr) {
                // Silent fail - local alert still works
                console.warn('Backend sync failed, alert stored locally:', apiErr);
            }

            onCreated?.();
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to create alert');
        } finally {
            setLoading(false);
        }
    };

    // Close on Escape
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.headerTitle}>
                        <Bell size={20} />
                        <span>Create Price Alert</span>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.coinInfo}>
                    <img src={coin.image} alt={coin.name} className={styles.coinIcon} />
                    <div>
                        <div className={styles.coinName}>{coin.name}</div>
                        <div className={styles.coinPrice}>${currentPrice?.toLocaleString()}</div>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Condition Selector */}
                    <div className={styles.section}>
                        <label className={styles.sectionLabel}>When price goes</label>
                        <div className={styles.typeSelector}>
                            {ALERT_CONDITIONS.map((type) => {
                                const Icon = type.icon;
                                return (
                                    <button
                                        key={type.id}
                                        type="button"
                                        className={`${styles.typeBtn} ${condition === type.id ? styles.active : ''}`}
                                        onClick={() => setCondition(type.id)}
                                    >
                                        <Icon size={16} />
                                        <span>{type.label.replace('Price ', '')}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Target Price Input */}
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Target Price ($)</label>
                        <input
                            type="number"
                            className={styles.input}
                            value={targetPrice}
                            onChange={(e) => setTargetPrice(e.target.value)}
                            placeholder={`e.g. ${condition === 'above' ? Math.round(currentPrice * 1.1) : Math.round(currentPrice * 0.9)}`}
                            step="any"
                            autoFocus
                        />
                        <span className={styles.hint}>
                            Current: ${currentPrice?.toLocaleString()}
                        </span>
                    </div>

                    {/* Alert Mode Toggle */}
                    <div className={styles.section}>
                        <label className={styles.sectionLabel}>Notification behavior</label>
                        <div className={styles.modeSelector}>
                            {ALERT_MODES.map((mode) => {
                                const Icon = mode.icon;
                                return (
                                    <button
                                        key={mode.id}
                                        type="button"
                                        className={`${styles.modeBtn} ${alertMode === mode.id ? styles.active : ''}`}
                                        onClick={() => setAlertMode(mode.id)}
                                    >
                                        <Icon size={14} />
                                        <div className={styles.modeBtnText}>
                                            <span className={styles.modeBtnLabel}>{mode.label}</span>
                                            <span className={styles.modeBtnDesc}>{mode.description}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {error && <div className={styles.error}>{error}</div>}

                    <Button type="submit" fullWidth disabled={loading}>
                        {loading ? 'Creating...' : 'Create Alert'}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default CreateAlertModal;
