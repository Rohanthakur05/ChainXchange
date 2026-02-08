import React, { useEffect, useState } from 'react';
import styles from './SuccessAnimation.module.css';

// Confetti colors
const CONFETTI_COLORS = ['#00C853', '#2962FF', '#FFB300', '#FF5252', '#00BCD4', '#E040FB'];

/**
 * SuccessAnimation - Shows a celebratory animation after successful actions
 * 
 * Props:
 * - isVisible: boolean - Show/hide the animation
 * - onComplete: function - Called when animation finishes
 * - title: string - Success title (default: "Success!")
 * - message: string - Success message
 * - showConfetti: boolean - Whether to show confetti (default: true)
 * - duration: number - Auto-dismiss duration in ms (default: 2000)
 */
const SuccessAnimation = ({
    isVisible,
    onComplete,
    title = 'Success!',
    message = 'Your action was completed successfully.',
    showConfetti = true,
    duration = 2000,
}) => {
    const [confettiPieces, setConfettiPieces] = useState([]);

    // Generate confetti pieces
    useEffect(() => {
        if (isVisible && showConfetti) {
            const pieces = Array.from({ length: 50 }).map((_, i) => ({
                id: i,
                left: `${Math.random() * 100}%`,
                color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
                delay: `${Math.random() * 0.5}s`,
                size: 6 + Math.random() * 8,
            }));
            setConfettiPieces(pieces);
        }
    }, [isVisible, showConfetti]);

    // Auto-dismiss after duration
    useEffect(() => {
        if (isVisible && duration > 0) {
            const timer = setTimeout(() => {
                onComplete?.();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onComplete]);

    if (!isVisible) return null;

    return (
        <>
            {/* Confetti layer */}
            {showConfetti && (
                <div className={styles.confettiContainer} aria-hidden="true">
                    {confettiPieces.map((piece) => (
                        <div
                            key={piece.id}
                            className={styles.confetti}
                            style={{
                                left: piece.left,
                                backgroundColor: piece.color,
                                animationDelay: piece.delay,
                                width: piece.size,
                                height: piece.size,
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Success modal */}
            <div
                className={styles.overlay}
                onClick={onComplete}
                role="dialog"
                aria-modal="true"
                aria-labelledby="success-title"
            >
                <div className={styles.container} onClick={(e) => e.stopPropagation()}>
                    {/* Animated checkmark */}
                    <div className={styles.checkmarkCircle}>
                        <svg className={styles.checkmark} viewBox="0 0 40 40">
                            <path
                                className={styles.checkmarkPath}
                                d="M10 20 L17 27 L30 14"
                            />
                        </svg>
                    </div>

                    {/* Success text */}
                    <div className={styles.text}>
                        <h2 id="success-title" className={styles.title}>{title}</h2>
                        <p className={styles.message}>{message}</p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SuccessAnimation;
