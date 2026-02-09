import React, { useEffect, useState } from 'react';
import { useAlertEvaluator, formatAlertMessage } from '../../hooks/useAlertEvaluator';
import { useToast } from '../ui/Toast/Toast';

/**
 * AlertMonitor - Invisible component that monitors prices and triggers notifications
 * 
 * Place this component inside AlertProvider to enable alert evaluation.
 * It connects to price updates and fires toast notifications when alerts trigger.
 * 
 * @param {Object} priceMap - Map of coinId to current price (from parent)
 */
const AlertMonitor = ({ priceMap }) => {
    const toast = useToast();

    // Handle triggered alerts
    const handleAlertTriggered = (triggeredAlert) => {
        const { message, description } = formatAlertMessage(triggeredAlert);
        toast.alert(message, description);
    };

    // Use the evaluator hook
    useAlertEvaluator(priceMap, handleAlertTriggered);

    // This component renders nothing
    return null;
};

/**
 * Higher-order component that wraps AlertMonitor with price fetching
 * Use this when you want automatic price polling
 */
export const AlertMonitorWithPolling = ({ coinIds = [], pollingInterval = 30000 }) => {
    const [priceMap, setPriceMap] = useState({});
    const toast = useToast();

    // Fetch prices periodically
    useEffect(() => {
        if (!coinIds.length) return;

        const fetchPrices = async () => {
            try {
                // This would typically call your API or CoinGecko
                const response = await fetch(
                    `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(',')}&vs_currencies=usd`
                );
                const data = await response.json();

                const newPriceMap = {};
                Object.entries(data).forEach(([id, prices]) => {
                    newPriceMap[id] = prices.usd;
                });

                setPriceMap(newPriceMap);
            } catch (err) {
                console.warn('Failed to fetch prices for alert monitoring:', err);
            }
        };

        fetchPrices();
        const interval = setInterval(fetchPrices, pollingInterval);

        return () => clearInterval(interval);
    }, [coinIds.join(','), pollingInterval]);

    // Handle triggered alerts
    const handleAlertTriggered = (triggeredAlert) => {
        const { message, description } = formatAlertMessage(triggeredAlert);
        toast.alert(message, description);
    };

    useAlertEvaluator(priceMap, handleAlertTriggered);

    return null;
};

export default AlertMonitor;
