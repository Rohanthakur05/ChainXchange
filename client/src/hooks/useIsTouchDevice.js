import { useState, useEffect } from 'react';

/**
 * Hook to detect if the user is on a touch device
 * Used to hide keyboard shortcut hints on mobile/tablet
 * 
 * @returns {boolean} True if touch device detected
 */
export const useIsTouchDevice = () => {
    const [isTouchDevice, setIsTouchDevice] = useState(false);

    useEffect(() => {
        const checkTouch = () => {
            const isTouch =
                'ontouchstart' in window ||
                navigator.maxTouchPoints > 0 ||
                window.matchMedia('(pointer: coarse)').matches;

            setIsTouchDevice(isTouch);
        };

        // Initial check
        checkTouch();

        // Re-check on resize (for hybrid devices)
        window.addEventListener('resize', checkTouch);

        return () => window.removeEventListener('resize', checkTouch);
    }, []);

    return isTouchDevice;
};

export default useIsTouchDevice;
