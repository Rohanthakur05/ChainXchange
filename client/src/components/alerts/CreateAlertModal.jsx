import React, { useState } from 'react';
import { X, Bell, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import api from '../../utils/api';
import Button from '../ui/Button/Button';
import styles from './CreateAlertModal.module.css';

const ALERT_TYPES = [
    { id: 'price_above', label: 'Price Above', icon: ArrowUpRight, description: 'Alert when price goes above target' },
    { id: 'price_below', label: 'Price Below', icon: ArrowDownRight, description: 'Alert when price goes below target' },
    { id: 'pct_increase', label: '% Increase', icon: TrendingUp, description: 'Alert when price increases by %' },
    { id: 'pct_decrease', label: '% Decrease', icon: TrendingDown, description: 'Alert when price decreases by %' },
];

const CreateAlertModal = ({ coin, currentPrice, onClose, onCreated }) => {
    const [alertType, setAlertType] = useState('price_above');
    const [targetPrice, setTargetPrice] = useState('');
    const [percentage, setPercentage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const payload = {
                coinId: coin.id,
                coinSymbol: coin.symbol,
                coinName: coin.name,
                type: alertType,
                referencePrice: currentPrice
            };

            if (alertType === 'price_above' || alertType === 'price_below') {
                if (!targetPrice || isNaN(parseFloat(targetPrice))) {
                    setError('Please enter a valid target price');
                    setLoading(false);
                    return;
                }
                payload.targetPrice = parseFloat(targetPrice);

                // Validate price distance
                const priceDiff = Math.abs(payload.targetPrice - currentPrice) / currentPrice;
                if (priceDiff < 0.005) {
                    setError('Target price must be at least 0.5% away from current price');
                    setLoading(false);
                    return;
                }
            } else {
                if (!percentage || isNaN(parseFloat(percentage)) || parseFloat(percentage) <= 0) {
                    setError('Please enter a valid percentage');
                    setLoading(false);
                    return;
                }
                payload.percentageThreshold = parseFloat(percentage);
            }

            await api.post('/alerts', payload);
            onCreated?.();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create alert');
        } finally {
            setLoading(false);
        }
    };

    const isPriceType = alertType === 'price_above' || alertType === 'price_below';

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.headerTitle}>
                        <Bell size={20} />
                        <span>Create Price Alert</span>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
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
                    <div className={styles.typeSelector}>
                        {ALERT_TYPES.map((type) => {
                            const Icon = type.icon;
                            return (
                                <button
                                    key={type.id}
                                    type="button"
                                    className={`${styles.typeBtn} ${alertType === type.id ? styles.active : ''}`}
                                    onClick={() => setAlertType(type.id)}
                                >
                                    <Icon size={16} />
                                    <span>{type.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className={styles.inputGroup}>
                        {isPriceType ? (
                            <>
                                <label className={styles.label}>Target Price ($)</label>
                                <input
                                    type="number"
                                    className={styles.input}
                                    value={targetPrice}
                                    onChange={(e) => setTargetPrice(e.target.value)}
                                    placeholder={`e.g. ${alertType === 'price_above' ? Math.round(currentPrice * 1.1) : Math.round(currentPrice * 0.9)}`}
                                    step="any"
                                />
                                <span className={styles.hint}>
                                    Current: ${currentPrice?.toLocaleString()}
                                </span>
                            </>
                        ) : (
                            <>
                                <label className={styles.label}>Percentage (%)</label>
                                <input
                                    type="number"
                                    className={styles.input}
                                    value={percentage}
                                    onChange={(e) => setPercentage(e.target.value)}
                                    placeholder="e.g. 5"
                                    min="1"
                                    max="50"
                                    step="0.1"
                                />
                                <span className={styles.hint}>
                                    Alert triggers when price changes by this amount
                                </span>
                            </>
                        )}
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
