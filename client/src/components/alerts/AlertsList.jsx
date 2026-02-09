import React, { useState, useEffect } from 'react';
import { Bell, Trash2, Pause, Play, ArrowUpRight, ArrowDownRight, RotateCcw, Zap, RefreshCw } from 'lucide-react';
import { useAlerts } from '../../context/AlertContext';
import api from '../../utils/api';
import styles from './AlertsList.module.css';

const CONDITION_ICONS = {
    above: ArrowUpRight,
    below: ArrowDownRight,
    // Legacy support
    price_above: ArrowUpRight,
    price_below: ArrowDownRight,
};

const AlertsList = ({ onClose }) => {
    const { alerts: localAlerts, toggleAlert: toggleLocalAlert, deleteAlert: deleteLocalAlert, reEnableAlert } = useAlerts();
    const [backendAlerts, setBackendAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch backend alerts on mount
    useEffect(() => {
        fetchBackendAlerts();
    }, []);

    const fetchBackendAlerts = async () => {
        try {
            const response = await api.get('/alerts');
            setBackendAlerts(response.data.alerts || []);
        } catch (error) {
            // Silent fail - local alerts still work
            console.warn('Could not fetch backend alerts:', error);
        } finally {
            setLoading(false);
        }
    };

    // Combine local and backend alerts (prefer local for duplicates)
    const allAlerts = React.useMemo(() => {
        const combined = [...localAlerts];

        // Add backend alerts that aren't in local
        backendAlerts.forEach(ba => {
            const existsLocally = localAlerts.some(la => la.id === ba.localId || la.id === ba._id);
            if (!existsLocally) {
                // Transform backend format to local format
                combined.push({
                    id: ba._id,
                    coinId: ba.coinId,
                    coinName: ba.coinName,
                    coinSymbol: ba.coinSymbol,
                    condition: ba.type?.replace('price_', '') || ba.condition,
                    targetPrice: ba.targetPrice,
                    alertMode: ba.alertMode || 'once',
                    isEnabled: ba.status === 'active',
                    status: ba.status,
                    createdAt: new Date(ba.createdAt).getTime(),
                    lastTriggeredAt: ba.triggeredAt ? new Date(ba.triggeredAt).getTime() : null,
                    triggerCount: ba.triggerCount || 0,
                    isBackend: true, // Mark as backend-only
                });
            }
        });

        return combined.sort((a, b) => b.createdAt - a.createdAt);
    }, [localAlerts, backendAlerts]);

    const handleToggle = async (alert) => {
        if (alert.isBackend) {
            // Backend alert - use API
            try {
                const newStatus = alert.isEnabled ? 'paused' : 'active';
                await api.put(`/alerts/${alert.id}`, { status: newStatus });
                fetchBackendAlerts();
            } catch (err) {
                console.error('Error toggling alert:', err);
            }
        } else {
            // Local alert
            toggleLocalAlert(alert.id);
        }
    };

    const handleDelete = async (alert) => {
        if (alert.isBackend) {
            try {
                await api.delete(`/alerts/${alert.id}`);
                setBackendAlerts(prev => prev.filter(a => a._id !== alert.id));
            } catch (err) {
                console.error('Error deleting alert:', err);
            }
        } else {
            deleteLocalAlert(alert.id);
        }
    };

    const handleReEnable = (alert) => {
        if (!alert.isBackend) {
            reEnableAlert(alert.id);
        }
    };

    const formatCondition = (alert) => {
        const priceStr = `$${alert.targetPrice?.toLocaleString()}`;
        return alert.condition === 'above' || alert.condition === 'price_above'
            ? `above ${priceStr}`
            : `below ${priceStr}`;
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const activeCount = allAlerts.filter(a => a.isEnabled && a.status === 'active').length;

    if (loading) {
        return <div className={styles.loading}>Loading alerts...</div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerTitle}>
                    <Bell size={18} />
                    <span>Price Alerts</span>
                </div>
                <span className={styles.count}>{activeCount} active</span>
            </div>

            {allAlerts.length === 0 ? (
                <div className={styles.empty}>
                    <Bell size={32} />
                    <p>No alerts yet</p>
                    <span>Create alerts from coin pages to get notified</span>
                </div>
            ) : (
                <div className={styles.list}>
                    {allAlerts.map((alert) => {
                        const Icon = CONDITION_ICONS[alert.condition] || Bell;
                        const isTriggered = alert.status === 'triggered_once';
                        const isPaused = !alert.isEnabled;
                        const isRecurring = alert.alertMode === 'recurring';

                        return (
                            <div
                                key={alert.id}
                                className={`${styles.alertItem} ${isTriggered ? styles.triggered : ''} ${isPaused ? styles.paused : ''}`}
                            >
                                <div className={styles.alertIcon}>
                                    <Icon size={16} />
                                </div>
                                <div className={styles.alertContent}>
                                    <div className={styles.alertTitle}>
                                        <span className={styles.coinSymbol}>{alert.coinSymbol?.toUpperCase()}</span>
                                        <span className={styles.alertCondition}>
                                            {formatCondition(alert)}
                                        </span>
                                    </div>
                                    <div className={styles.alertMeta}>
                                        {/* Mode badge */}
                                        <span className={`${styles.modeBadge} ${isRecurring ? styles.recurring : ''}`}>
                                            {isRecurring ? <RotateCcw size={10} /> : <Zap size={10} />}
                                            {isRecurring ? 'Recurring' : 'Once'}
                                        </span>

                                        {/* Trigger info */}
                                        {isTriggered ? (
                                            <span className={styles.triggeredLabel}>
                                                ✓ Triggered {formatDate(alert.lastTriggeredAt)}
                                            </span>
                                        ) : alert.triggerCount > 0 ? (
                                            <span className={styles.triggerCount}>
                                                Triggered {alert.triggerCount}×
                                            </span>
                                        ) : (
                                            <span className={styles.dateLabel}>
                                                Created {formatDate(alert.createdAt)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className={styles.alertActions}>
                                    {/* Re-enable button for triggered one-time alerts */}
                                    {isTriggered && !alert.isBackend && (
                                        <button
                                            className={styles.actionBtn}
                                            onClick={() => handleReEnable(alert)}
                                            title="Re-enable alert"
                                        >
                                            <RefreshCw size={16} />
                                        </button>
                                    )}

                                    {/* Pause/Resume button */}
                                    {!isTriggered && (
                                        <button
                                            className={styles.actionBtn}
                                            onClick={() => handleToggle(alert)}
                                            title={isPaused ? 'Resume' : 'Pause'}
                                        >
                                            {isPaused ? <Play size={16} /> : <Pause size={16} />}
                                        </button>
                                    )}

                                    {/* Delete button */}
                                    <button
                                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                        onClick={() => handleDelete(alert)}
                                        title="Remove alert"
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
