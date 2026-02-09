import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { TOUR_STEPS, TOUR_CONFIG } from '../config/tourConfig';

const OnboardingContext = createContext(null);

/**
 * Hook to access onboarding state and actions
 */
export const useOnboarding = () => {
    const context = useContext(OnboardingContext);
    if (!context) {
        throw new Error('useOnboarding must be used within OnboardingProvider');
    }
    return context;
};

/**
 * OnboardingProvider - Manages first-time user tour state
 * 
 * Features:
 * - Persists completion to localStorage
 * - Allows skip and restart
 * - Exposes step navigation
 */
export const OnboardingProvider = ({ children }) => {
    const [isOnboardingComplete, setIsOnboardingComplete] = useState(true); // Default true to prevent flash
    const [isOnboardingActive, setIsOnboardingActive] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    // Check localStorage on mount
    useEffect(() => {
        const completed = localStorage.getItem(TOUR_CONFIG.storageKey);
        if (completed === 'true') {
            setIsOnboardingComplete(true);
        } else {
            setIsOnboardingComplete(false);
        }
    }, []);

    // Start onboarding (for first-time users or restart)
    const startOnboarding = useCallback(() => {
        setCurrentStep(0);
        setIsOnboardingActive(true);
    }, []);

    // Skip the tour
    const skipOnboarding = useCallback(() => {
        setIsOnboardingActive(false);
        setIsOnboardingComplete(true);
        localStorage.setItem(TOUR_CONFIG.storageKey, 'true');
    }, []);

    // Go to next step
    const nextStep = useCallback(() => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            // Complete the tour
            setIsOnboardingActive(false);
            setIsOnboardingComplete(true);
            localStorage.setItem(TOUR_CONFIG.storageKey, 'true');
        }
    }, [currentStep]);

    // Go to previous step
    const prevStep = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    }, [currentStep]);

    // Restart tour (from settings)
    const restartOnboarding = useCallback(() => {
        localStorage.removeItem(TOUR_CONFIG.storageKey);
        setIsOnboardingComplete(false);
        startOnboarding();
    }, [startOnboarding]);

    // Auto-start for first-time users after a short delay
    useEffect(() => {
        if (!isOnboardingComplete && !isOnboardingActive) {
            const timer = setTimeout(() => {
                startOnboarding();
            }, 1000); // 1 second delay for page to settle
            return () => clearTimeout(timer);
        }
    }, [isOnboardingComplete, isOnboardingActive, startOnboarding]);

    const value = {
        // State
        isOnboardingComplete,
        isOnboardingActive,
        currentStep,
        totalSteps: TOUR_STEPS.length,
        currentStepData: TOUR_STEPS[currentStep],

        // Actions
        startOnboarding,
        skipOnboarding,
        nextStep,
        prevStep,
        restartOnboarding,
    };

    return (
        <OnboardingContext.Provider value={value}>
            {children}
        </OnboardingContext.Provider>
    );
};

export default OnboardingContext;
