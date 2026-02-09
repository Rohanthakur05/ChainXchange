import React, { useEffect, useState, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, SkipForward } from 'lucide-react';
import { useOnboarding } from '../../../context/OnboardingContext';
import { TOUR_CONFIG } from '../../../config/tourConfig';
import Button from '../../ui/Button/Button';
import styles from './OnboardingTour.module.css';

/**
 * OnboardingTour - Guided tour component for first-time users
 * 
 * Features:
 * - Modal and spotlight step types
 * - Progress indicators
 * - Skip and navigation controls
 * - Smooth animations
 */
const OnboardingTour = () => {
    const {
        isOnboardingActive,
        currentStep,
        totalSteps,
        currentStepData,
        nextStep,
        prevStep,
        skipOnboarding,
    } = useOnboarding();

    const [spotlightPosition, setSpotlightPosition] = useState(null);
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
    const tooltipRef = useRef(null);

    // Calculate spotlight position for target element
    useEffect(() => {
        if (!isOnboardingActive || !currentStepData) return;

        if (currentStepData.type === 'spotlight' && currentStepData.target) {
            const targetEl = document.querySelector(currentStepData.target);
            if (targetEl) {
                const rect = targetEl.getBoundingClientRect();
                const padding = TOUR_CONFIG.spotlightPadding;

                setSpotlightPosition({
                    top: rect.top - padding,
                    left: rect.left - padding,
                    width: rect.width + padding * 2,
                    height: rect.height + padding * 2,
                });

                // Position tooltip based on step position preference
                const pos = currentStepData.position || 'bottom';
                let tooltipTop = 0;
                let tooltipLeft = 0;

                switch (pos) {
                    case 'bottom':
                        tooltipTop = rect.bottom + padding + 16;
                        tooltipLeft = rect.left + rect.width / 2;
                        break;
                    case 'top':
                        tooltipTop = rect.top - padding - 16;
                        tooltipLeft = rect.left + rect.width / 2;
                        break;
                    case 'left':
                        tooltipTop = rect.top + rect.height / 2;
                        tooltipLeft = rect.left - padding - 16;
                        break;
                    case 'right':
                        tooltipTop = rect.top + rect.height / 2;
                        tooltipLeft = rect.right + padding + 16;
                        break;
                    default:
                        tooltipTop = rect.bottom + padding + 16;
                        tooltipLeft = rect.left + rect.width / 2;
                }

                setTooltipPosition({ top: tooltipTop, left: tooltipLeft, position: pos });
            } else {
                // Fallback to modal if target not found
                setSpotlightPosition(null);
            }
        } else {
            setSpotlightPosition(null);
        }
    }, [isOnboardingActive, currentStepData]);

    // Lock body scroll when tour is active
    useEffect(() => {
        if (isOnboardingActive) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOnboardingActive]);

    if (!isOnboardingActive || !currentStepData) return null;

    const isModal = currentStepData.type === 'modal' || !spotlightPosition;
    const isLastStep = currentStep === totalSteps - 1;
    const isFirstStep = currentStep === 0;

    return (
        <div className={styles.overlay}>
            {/* Spotlight cutout for targeted elements */}
            {spotlightPosition && (
                <div
                    className={styles.spotlight}
                    style={{
                        top: spotlightPosition.top,
                        left: spotlightPosition.left,
                        width: spotlightPosition.width,
                        height: spotlightPosition.height,
                    }}
                />
            )}

            {/* Tooltip/Modal content */}
            <div
                ref={tooltipRef}
                className={`${styles.tooltip} ${isModal ? styles.modal : ''} ${styles[tooltipPosition.position] || ''}`}
                style={!isModal ? {
                    top: tooltipPosition.top,
                    left: tooltipPosition.left
                } : {}}
            >
                {/* Close/Skip button */}
                <button
                    className={styles.closeBtn}
                    onClick={skipOnboarding}
                    aria-label="Skip tour"
                >
                    <X size={18} />
                </button>

                {/* Content */}
                <div className={styles.content}>
                    <h3 className={styles.title}>{currentStepData.title}</h3>
                    <p className={styles.description}>{currentStepData.content}</p>

                    {currentStepData.shortcut && (
                        <div className={styles.shortcutHint}>
                            <span className={styles.keyBadge}>{currentStepData.shortcut}</span>
                        </div>
                    )}
                </div>

                {/* Footer with progress and navigation */}
                <div className={styles.footer}>
                    {/* Progress dots */}
                    <div className={styles.progress}>
                        {Array.from({ length: totalSteps }).map((_, i) => (
                            <span
                                key={i}
                                className={`${styles.dot} ${i === currentStep ? styles.activeDot : ''} ${i < currentStep ? styles.completedDot : ''}`}
                            />
                        ))}
                    </div>

                    {/* Navigation buttons */}
                    <div className={styles.nav}>
                        {!isFirstStep && (
                            <button className={styles.navBtn} onClick={prevStep}>
                                <ChevronLeft size={16} />
                                Back
                            </button>
                        )}

                        {!isLastStep && (
                            <button className={styles.skipBtn} onClick={skipOnboarding}>
                                <SkipForward size={14} />
                                Skip
                            </button>
                        )}

                        <Button
                            variant="primary"
                            size="sm"
                            onClick={nextStep}
                        >
                            {isLastStep ? "Get Started" : "Next"}
                            {!isLastStep && <ChevronRight size={16} />}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OnboardingTour;
