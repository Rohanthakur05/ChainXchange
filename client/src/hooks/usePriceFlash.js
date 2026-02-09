import { useRef, useState, useEffect } from 'react';

/**
 * Hook to detect price changes and return a CSS class for flash animation
 * 
 * @param {number} currentPrice - The current price value
 * @param {string} coinId - Coin identifier for tracking
 * @returns {string} CSS class name: 'flashUp', 'flashDown', or ''
 */
export const usePriceFlash = (currentPrice, coinId) => {
    const prevPriceRef = useRef(currentPrice);
    const [flashClass, setFlashClass] = useState('');
    const prefersReducedMotion = usePrefersReducedMotion();

    useEffect(() => {
        // Skip animation if user prefers reduced motion
        if (prefersReducedMotion) return;

        const prevPrice = prevPriceRef.current;

        // Only flash on actual price change (not initial render)
        if (currentPrice !== prevPrice && prevPrice !== undefined && prevPrice !== null) {
            if (currentPrice > prevPrice) {
                setFlashClass('flashUp');
            } else if (currentPrice < prevPrice) {
                setFlashClass('flashDown');
            }

            // Clear animation class after duration
            const timeout = setTimeout(() => setFlashClass(''), 600);
            prevPriceRef.current = currentPrice;

            return () => clearTimeout(timeout);
        }

        prevPriceRef.current = currentPrice;
    }, [currentPrice, prefersReducedMotion]);

    return flashClass;
};

/**
 * Hook to detect user's reduced motion preference
 * Respects system accessibility settings
 * 
 * @returns {boolean} True if user prefers reduced motion
 */
export const usePrefersReducedMotion = () => {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mediaQuery.matches);

        const handler = (e) => setPrefersReducedMotion(e.matches);
        mediaQuery.addEventListener('change', handler);

        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    return prefersReducedMotion;
};

export default usePriceFlash;
