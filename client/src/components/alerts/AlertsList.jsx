import React, { useState, useEffect } from 'react';
import { Bell, Trash2, Pause, Play, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import api from '../../utils/api';
import styles from './AlertsList.module.css';

const ALERT_ICONS = {
    price_above: ArrowUpRight,
    price_below: ArrowDownRight,
    pct_increase: TrendingUp,
    pct_decrease: TrendingDown
};

const ALERT_LABELS = {
    price_above: 'Price Above',
    price_below: 'Price Below',
    pct_increase: '% Increase',
    pct_decrease: '% Decrease'
};

const AlertsList = ({ onClose }) => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAlerts();
    }, []);

    const fetchAlerts = async () => {
        try {
            const response = await api.get('/alerts');
            setAlerts(response.data.alerts);
        } catch (error) {
            console.error('Error fetching alerts:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleAlert = async (alertId, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'paused' : 'active';
        try {
            await api.put(`/alerts/${alertId}`, { status: newStatus });
            setAlerts(alerts.map(a =>
                a._id === alertId ? { ...a, status: newStatus } : a
            ));
        } catch (error) {
            console.error('Error updating alert:', error);
        }
    };

    const deleteAlert = async (alertId) => {
        try {
            await api.delete(`/alerts/${alertId}`);
            setAlerts(alerts.filter(a => a._id !== alertId));
        } catch (error) {
            console.error('Error deleting alert:', error);
        }
    };

    const formatCondition = (alert) => {
        switch (alert.type) {
            case 'price_above':
                return `above $${alert.targetPrice?.toLocaleString()}`;
            case 'price_below':
                return `below $${alert.targetPrice?.toLocaleString()}`;
            case 'pct_increase':
                return `+${alert.percentageThreshold}% from $${alert.referencePrice?.toLocaleString()}`;
            case 'pct_decrease':
                return `-${alert.percentageThreshold}% from $${alert.referencePrice?.toLocaleString()}`;
            default:
                return '';
        }
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return <div className={styles.loading}>Loading alerts...</div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerTitle}>
                    <Bell size={18} />
                    <span>My Price Alerts</span>
                </div>
                <span className={styles.count}>{alerts.filter(a => a.status === 'active').length} active</span>
            </div>

            {alerts.length === 0 ? (
                <div className={styles.empty}>
                    <Bell size={32} />
                    <p>No alerts yet</p>
                    <span>Create alerts from coin pages to get notified</span>
                </div>
            ) : (
                <div className={styles.list}>
                    {alerts.map((alert) => {
                        const Icon = ALERT_ICONS[alert.type] || Bell;
                        const isTriggered = alert.status === 'triggered';
                        const isPaused = alert.status === 'paused';

                        return (
                            <div
                                key={alert._id}
                                className={`${styles.alertItem} ${isTriggered ? styles.triggered : ''} ${isPaused ? styles.paused : ''}`}
                            >
                                <div className={styles.alertIcon}>
                                    <Icon size={16} />
                                </div>
                                <div className={styles.alertContent}>
                                    <div className={styles.alertTitle}>
                                        <span className={styles.coinSymbol}>{alert.coinSymbol}</span>
                                        <span className={styles.alertType}>{ALERT_LABELS[alert.type]}</span>
                                    </div>
                                    <div className={styles.alertCondition}>
                                        {formatCondition(alert)}
                                    </div>
                                    <div className={styles.alertMeta}>
                                        {isTriggered ? (
                                            <span className={styles.triggeredLabel}>
                                                ✓ Triggered {formatDate(alert.triggeredAt)}
                                            </span>
                                        ) : (
                                            <span>Created {formatDate(alert.createdAt)}</span>
                                        )}
                                    </div>
                                </div>
                                <div className={styles.alertActions}>
                                    {!isTriggered && (
                                        <button
                                            className={styles.actionBtn}
                                            onClick={() => toggleAlert(alert._id, alert.status)}
                                            title={isPaused ? 'Resume' : 'Pause'}
                                        >
                                            {isPaused ? <Play size={16} /> : <Pause size={16} />}
                                        </button>
                                    )}
                                    <button
                                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                        onClick={() => deleteAlert(alert._id)}
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AlertsList;
