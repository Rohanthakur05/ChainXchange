import React from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import useNetworkStatus from '../../../hooks/useNetworkStatus';
import styles from './OfflineBanner.module.css';

/**
 * OfflineBanner - Shows a banner when the user is offline
 * Automatically appears/disappears based on network status
 */
const OfflineBanner = () => {
    const { isOffline, wasOffline } = useNetworkStatus();

    // Don't render if online and not recently reconnected
    if (!isOffline && !wasOffline) {
        return null;
    }

    return (
        <div
            className={`
                ${styles.banner} 
                ${isOffline ? styles.offline : styles.online}
                ${!isOffline && wasOffline ? styles.exiting : ''}
            `}
            role="alert"
            aria-live="assertive"
        >
            {isOffline ? (
                <>
                    <WifiOff size={18} className={styles.icon} />
                    <span className={styles.text}>
                        You're offline
                        <span className={styles.pulse} />
                    </span>
                    <span>— Some features may be unavailable</span>
                </>
            ) : (
                <>
                    <Wifi size={18} className={styles.icon} />
                    <span>Back online!</span>
                </>
            )}
        </div>
    );
};

export default OfflineBanner;
