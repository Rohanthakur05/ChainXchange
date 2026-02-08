import { useState, useEffect, useCallback } from 'react';

/**
 * useNetworkStatus - Hook to detect online/offline status
 * 
 * Returns:
 * - isOnline: boolean
 * - isOffline: boolean
 * - wasOffline: boolean (was recently offline, for showing reconnection message)
 */
const useNetworkStatus = () => {
    const [isOnline, setIsOnline] = useState(() =>
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );
    const [wasOffline, setWasOffline] = useState(false);

    const handleOnline = useCallback(() => {
        setIsOnline(true);
        // Show "back online" briefly if we were offline
        setWasOffline(true);
        setTimeout(() => setWasOffline(false), 3000);
    }, []);

    const handleOffline = useCallback(() => {
        setIsOnline(false);
        setWasOffline(false);
    }, []);

    useEffect(() => {
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [handleOnline, handleOffline]);

    return {
        isOnline,
        isOffline: !isOnline,
        wasOffline,
    };
};

export default useNetworkStatus;
