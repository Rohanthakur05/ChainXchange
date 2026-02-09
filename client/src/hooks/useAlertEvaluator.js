import { useEffect, useRef, useCallback } from 'react';
import { useAlerts, ALERT_CONFIG } from '../context/AlertContext';

/**
 * useAlertEvaluator - Monitors prices and triggers alerts
 * 
 * Features:
 * - Evaluates all active alerts against current prices
 * - Debounces rapid triggers
 * - Handles recurring vs one-time logic
 * - Respects daily notification limits
 * - Uses buffer zone to prevent ping-pong triggers
 * 
 * @param {Object} priceMap - Map of coinId to current price
 * @param {Function} onAlertTriggered - Callback when alert triggers
 */
export const useAlertEvaluator = (priceMap, onAlertTriggered) => {
    const {
        getActiveAlerts,
        recordTrigger,
        canTriggerNotification
    } = useAlerts();

    // Track previous prices for direction detection
    const prevPricesRef = useRef({});
    // Track last evaluation to debounce
    const lastEvalRef = useRef({});

    /**
     * Check if alert condition is met with buffer zone
     */
    const isConditionMet = useCallback((alert, currentPrice, prevPrice) => {
        const { condition, targetPrice } = alert;
        const buffer = targetPrice * ALERT_CONFIG.THRESHOLD_BUFFER_PCT;

        if (condition === 'above') {
            // Price crossed above target (was below, now above + buffer)
            const wasBelow = prevPrice < targetPrice;
            const isAbove = currentPrice >= targetPrice + buffer;
            return wasBelow && isAbove;
        } else if (condition === 'below') {
            // Price crossed below target (was above, now below - buffer)
            const wasAbove = prevPrice > targetPrice;
            const isBelow = currentPrice <= targetPrice - buffer;
            return wasAbove && isBelow;
        }
        return false;
    }, []);

    /**
     * Check if alert is within cooldown period
     */
    const isInCooldown = useCallback((alert) => {
        if (!alert.lastTriggeredAt) return false;

        const elapsed = Date.now() - alert.lastTriggeredAt;

        // Use longer cooldown for recurring alerts
        const cooldown = alert.alertMode === 'recurring'
            ? ALERT_CONFIG.RECURRING_COOLDOWN_MS
            : ALERT_CONFIG.MIN_DEBOUNCE_MS;

        return elapsed < cooldown;
    }, []);

    /**
     * Evaluate all active alerts against current prices
     */
    const evaluateAlerts = useCallback(() => {
        if (!priceMap || Object.keys(priceMap).length === 0) return;
        if (!canTriggerNotification()) return;

        const activeAlerts = getActiveAlerts();
        const triggeredAlerts = [];

        activeAlerts.forEach(alert => {
            const currentPrice = priceMap[alert.coinId];
            const prevPrice = prevPricesRef.current[alert.coinId];

            // Skip if no price data
            if (currentPrice === undefined || prevPrice === undefined) return;

            // Skip if in cooldown
            if (isInCooldown(alert)) return;

            // Check if condition is met
            if (isConditionMet(alert, currentPrice, prevPrice)) {
                triggeredAlerts.push({
                    alert,
                    currentPrice,
                    prevPrice,
                });
            }
        });

        // Process triggered alerts
        triggeredAlerts.forEach(({ alert, currentPrice }) => {
            // Record the trigger
            recordTrigger(alert.id);

            // Notify via callback
            if (onAlertTriggered) {
                onAlertTriggered({
                    ...alert,
                    triggeredPrice: currentPrice,
                    triggeredAt: Date.now(),
                });
            }
        });

        // Update previous prices
        prevPricesRef.current = { ...priceMap };
    }, [priceMap, getActiveAlerts, recordTrigger, canTriggerNotification, isConditionMet, isInCooldown, onAlertTriggered]);

    // Run evaluation whenever prices change
    useEffect(() => {
        // Debounce evaluation to prevent excessive checks
        const now = Date.now();
        const lastEval = lastEvalRef.current.timestamp || 0;

        if (now - lastEval < 1000) return; // Max once per second

        lastEvalRef.current.timestamp = now;
        evaluateAlerts();
    }, [priceMap, evaluateAlerts]);

    // Initialize previous prices on first price data
    useEffect(() => {
        if (Object.keys(prevPricesRef.current).length === 0 && priceMap) {
            prevPricesRef.current = { ...priceMap };
        }
    }, [priceMap]);

    return {
        evaluateAlerts,
    };
};

/**
 * Format alert trigger message (calm, professional copy)
 */
export const formatAlertMessage = (triggeredAlert) => {
    const { coinSymbol, condition, targetPrice, triggeredPrice, triggerCount } = triggeredAlert;

    const priceStr = `$${triggeredPrice?.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: triggeredPrice >= 1 ? 2 : 6
    })}`;

    const targetStr = `$${targetPrice?.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: targetPrice >= 1 ? 2 : 6
    })}`;

    // Calm, professional messaging
    let message, description;

    if (condition === 'above') {
        message = `${coinSymbol.toUpperCase()} reached ${priceStr}`;
        description = `Your target of ${targetStr} was crossed`;
    } else {
        message = `${coinSymbol.toUpperCase()} dropped to ${priceStr}`;
        description = `Your target of ${targetStr} was reached`;
    }

    // Add trigger count for recurring
    if (triggerCount > 1) {
        description += ` · Triggered ${triggerCount} times`;
    }

    return { message, description };
};

export default useAlertEvaluator;
