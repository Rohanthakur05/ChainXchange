/**
 * Tour configuration for first-time user onboarding
 * Defines the steps, targets, and content for the guided tour
 */

export const TOUR_STEPS = [
    {
        id: 'welcome',
        type: 'modal', // 'modal' | 'spotlight'
        title: 'Welcome to ChainXchange! 🚀',
        content: 'Your professional crypto trading platform. Let us show you the key features.',
        position: 'center',
    },
    {
        id: 'search',
        type: 'spotlight',
        target: '[data-tour="search-trigger"]',
        title: 'Quick Search',
        content: 'Press "/" to instantly search any coin. Try it anytime!',
        position: 'bottom',
        shortcut: '/',
    },
    {
        id: 'shortcuts',
        type: 'modal',
        title: 'Keyboard Shortcuts ⌨️',
        content: 'Press "?" to see all shortcuts. Use "B" to buy, "S" to sell, and "W" for watchlist on any coin page.',
        position: 'center',
        shortcut: '?',
    },
    {
        id: 'markets',
        type: 'spotlight',
        target: '[data-tour="markets-link"]',
        title: 'Markets',
        content: 'Browse all available cryptocurrencies, filter by category, and track your watchlists.',
        position: 'right',
    },
    {
        id: 'complete',
        type: 'modal',
        title: "You're All Set! 🎉",
        content: 'You can restart this tour anytime from your Profile page.',
        position: 'center',
    },
];

export const TOUR_CONFIG = {
    showSkipButton: true,
    showProgressDots: true,
    backdropOpacity: 0.75,
    spotlightPadding: 8,
    animationDuration: 300,
    zIndex: 10000,
    storageKey: 'chainx_onboarding_complete',
};

export default { TOUR_STEPS, TOUR_CONFIG };
