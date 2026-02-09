import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AlertContext = createContext(null);

// Storage key with version for future migrations
const STORAGE_KEY = 'chainx_price_alerts_v1';

// Anti-fatigue configuration
export const ALERT_CONFIG = {
    MIN_DEBOUNCE_MS: 5000,        // 5s between same-alert triggers
    RECURRING_COOLDOWN_MS: 60000, // 1min cooldown for recurring
    DAILY_NOTIFICATION_LIMIT: 20,  // Max notifications per day
    THRESHOLD_BUFFER_PCT: 0.005,   // 0.5% buffer zone
};

/**
 * Generate unique ID for alerts
 */
const generateId = () => `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Hook to access alert state and actions
 */
export const useAlerts = () => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlerts must be used within AlertProvider');
    }
    return context;
};

/**
 * AlertProvider - Centralized alert state management
 * 
 * Features:
 * - CRUD operations for alerts
 * - localStorage persistence
 * - Trigger tracking and debouncing
 * - Daily notification counting
 */
export const AlertProvider = ({ children }) => {
    const [alerts, setAlerts] = useState([]);
    const [dailyTriggerCount, setDailyTriggerCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // Load alerts from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                setAlerts(parsed.alerts || []);

                // Reset daily count if new day
                const storedDate = parsed.lastResetDate;
                const today = new Date().toDateString();
                if (storedDate !== today) {
                    setDailyTriggerCount(0);
                } else {
                    setDailyTriggerCount(parsed.dailyTriggerCount || 0);
                }
            }
        } catch (err) {
            console.error('Failed to load alerts from storage:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Persist to localStorage whenever alerts change
    useEffect(() => {
        if (!isLoading) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({
                    alerts,
                    dailyTriggerCount,
                    lastResetDate: new Date().toDateString(),
                    version: 1,
                }));
            } catch (err) {
                console.error('Failed to save alerts to storage:', err);
            }
        }
    }, [alerts, dailyTriggerCount, isLoading]);

    /**
     * Create a new alert
     */
    const createAlert = useCallback((alertData) => {
        const newAlert = {
            id: generateId(),
            coinId: alertData.coinId,
            coinName: alertData.coinName,
            coinSymbol: alertData.coinSymbol,
            condition: alertData.condition, // 'above' | 'below'
            targetPrice: alertData.targetPrice,
            alertMode: alertData.alertMode || 'once', // 'once' | 'recurring'
            isEnabled: true,
            createdAt: Date.now(),
            lastTriggeredAt: null,
            triggerCount: 0,
            status: 'active',
        };

        setAlerts(prev => [...prev, newAlert]);
        return newAlert;
    }, []);

    /**
     * Update an existing alert
     */
    const updateAlert = useCallback((id, updates) => {
        setAlerts(prev => prev.map(alert =>
            alert.id === id ? { ...alert, ...updates } : alert
        ));
    }, []);

    /**
     * Delete an alert
     */
    const deleteAlert = useCallback((id) => {
        setAlerts(prev => prev.filter(alert => alert.id !== id));
    }, []);

    /**
     * Toggle alert enabled/disabled
     */
    const toggleAlert = useCallback((id) => {
        setAlerts(prev => prev.map(alert =>
            alert.id === id ? { ...alert, isEnabled: !alert.isEnabled } : alert
        ));
    }, []);

    /**
     * Record a trigger event (called by evaluator)
     */
    const recordTrigger = useCallback((id) => {
        const now = Date.now();

        setAlerts(prev => prev.map(alert => {
            if (alert.id !== id) return alert;

            const updated = {
                ...alert,
                lastTriggeredAt: now,
                triggerCount: alert.triggerCount + 1,
            };

            // If one-time alert, mark as triggered
            if (alert.alertMode === 'once') {
                updated.status = 'triggered_once';
                updated.isEnabled = false;
            }

            return updated;
        }));

        setDailyTriggerCount(prev => prev + 1);
    }, []);

    /**
     * Get alerts for a specific coin
     */
    const getAlertsForCoin = useCallback((coinId) => {
        return alerts.filter(alert => alert.coinId === coinId);
    }, [alerts]);

    /**
     * Get all active (enabled) alerts
     */
    const getActiveAlerts = useCallback(() => {
        return alerts.filter(alert => alert.isEnabled && alert.status === 'active');
    }, [alerts]);

    /**
     * Check if within daily notification limit
     */
    const canTriggerNotification = useCallback(() => {
        return dailyTriggerCount < ALERT_CONFIG.DAILY_NOTIFICATION_LIMIT;
    }, [dailyTriggerCount]);

    /**
     * Re-enable a triggered one-time alert
     */
    const reEnableAlert = useCallback((id) => {
        setAlerts(prev => prev.map(alert =>
            alert.id === id ? {
                ...alert,
                isEnabled: true,
                status: 'active',
                lastTriggeredAt: null
            } : alert
        ));
    }, []);

    const value = {
        // State
        alerts,
        isLoading,
        dailyTriggerCount,

        // Actions
        createAlert,
        updateAlert,
        deleteAlert,
        toggleAlert,
        recordTrigger,
        reEnableAlert,

        // Queries
        getAlertsForCoin,
        getActiveAlerts,
        canTriggerNotification,
    };

    return (
        <AlertContext.Provider value={value}>
            {children}
        </AlertContext.Provider>
    );
};

export default AlertContext;
