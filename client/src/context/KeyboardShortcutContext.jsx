import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../components/ui/Toast';
import { useGlobalSearch } from './GlobalSearchContext';

const KeyboardShortcutContext = createContext(null);

export const useKeyboardShortcuts = () => {
    const context = useContext(KeyboardShortcutContext);
    if (!context) {
        throw new Error('useKeyboardShortcuts must be used within KeyboardShortcutProvider');
    }
    return context;
};

export const KeyboardShortcutProvider = ({ children }) => {
    const toast = useToast();
    const { openSearch, isSearchOpen } = useGlobalSearch();

    // Current coin context (set by coin pages)
    const [currentCoin, setCurrentCoin] = useState(null);

    // Modal states managed by this context
    const [showShortcutHints, setShowShortcutHints] = useState(false);

    // Trade modal handlers (will be set by coin pages)
    const tradeHandlersRef = useRef({
        openBuyModal: null,
        openSellModal: null,
        toggleWatchlist: null,
    });

    // Register trade handlers from coin pages
    const registerTradeHandlers = useCallback((handlers) => {
        tradeHandlersRef.current = { ...tradeHandlersRef.current, ...handlers };
    }, []);

    const unregisterTradeHandlers = useCallback(() => {
        tradeHandlersRef.current = {
            openBuyModal: null,
            openSellModal: null,
            toggleWatchlist: null,
        };
    }, []);

    // Debounce helper
    const lastKeyTime = useRef(0);
    const debounce = (fn, delay = 200) => {
        const now = Date.now();
        if (now - lastKeyTime.current < delay) return false;
        lastKeyTime.current = now;
        fn();
        return true;
    };

    // Check if user is typing in an input
    const isTyping = useCallback((e) => {
        const target = e.target;
        const tagName = target.tagName.toUpperCase();

        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName)) return true;
        if (target.isContentEditable) return true;

        return false;
    }, []);

    // Main keyboard handler
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Always allow ESC to close things
            if (e.key === 'Escape') {
                if (showShortcutHints) {
                    setShowShortcutHints(false);
                    return;
                }
                // Other modals handle their own ESC
                return;
            }

            // Don't trigger shortcuts while typing
            if (isTyping(e)) return;

            // ? or Shift+/ - Show shortcut hints
            if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
                e.preventDefault();
                debounce(() => setShowShortcutHints(true));
                return;
            }

            // / - Open search (only if search not already open)
            if (e.key === '/' && !e.shiftKey && !isSearchOpen) {
                e.preventDefault();
                debounce(() => openSearch());
                return;
            }

            // B - Buy modal
            if (e.key.toLowerCase() === 'b' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                if (!currentCoin) {
                    toast.warning('No coin selected', 'Navigate to a coin page first');
                    return;
                }
                if (tradeHandlersRef.current.openBuyModal) {
                    debounce(() => tradeHandlersRef.current.openBuyModal());
                }
                return;
            }

            // S - Sell modal
            if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                if (!currentCoin) {
                    toast.warning('No coin selected', 'Navigate to a coin page first');
                    return;
                }
                if (tradeHandlersRef.current.openSellModal) {
                    debounce(() => tradeHandlersRef.current.openSellModal());
                }
                return;
            }

            // W - Toggle watchlist
            if (e.key.toLowerCase() === 'w' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                if (!currentCoin) {
                    toast.warning('No coin selected', 'Navigate to a coin page first');
                    return;
                }
                if (tradeHandlersRef.current.toggleWatchlist) {
                    debounce(() => tradeHandlersRef.current.toggleWatchlist());
                }
                return;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isTyping, isSearchOpen, openSearch, currentCoin, showShortcutHints, toast]);

    const value = {
        // Coin context
        currentCoin,
        setCurrentCoin,

        // Shortcut hints modal
        showShortcutHints,
        setShowShortcutHints,

        // Handler registration
        registerTradeHandlers,
        unregisterTradeHandlers,
    };

    return (
        <KeyboardShortcutContext.Provider value={value}>
            {children}
        </KeyboardShortcutContext.Provider>
    );
};

export default KeyboardShortcutContext;
