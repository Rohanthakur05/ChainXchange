/**
 * Centralized keyboard shortcuts configuration
 * Used by KeyboardShortcutContext, ShortcutHintModal, and ShortcutBadge
 */

// Core shortcut definitions
export const SHORTCUTS = {
    search: {
        key: '/',
        label: 'Search',
        description: 'Open global search',
        context: 'global'
    },
    help: {
        key: '?',
        label: 'Help',
        description: 'Show keyboard shortcuts',
        context: 'global'
    },
    buy: {
        key: 'B',
        label: 'Buy',
        description: 'Open buy modal',
        context: 'coin-page'
    },
    sell: {
        key: 'S',
        label: 'Sell',
        description: 'Open sell modal',
        context: 'coin-page'
    },
    watchlist: {
        key: 'W',
        label: 'Watchlist',
        description: 'Toggle watchlist',
        context: 'coin-page'
    },
    escape: {
        key: 'ESC',
        label: 'Close',
        description: 'Close modal / overlay',
        context: 'modal'
    },
};

// Map UI element identifiers to shortcuts for badge display
export const UI_SHORTCUT_MAP = {
    'buy-button': SHORTCUTS.buy,
    'sell-button': SHORTCUTS.sell,
    'watchlist-button': SHORTCUTS.watchlist,
    'search-trigger': SHORTCUTS.search,
};

// Grouped shortcuts for hint modal display
export const SHORTCUT_GROUPS = [
    {
        section: 'Navigation',
        items: [
            { ...SHORTCUTS.search, icon: 'Search' },
            { ...SHORTCUTS.help, icon: 'Keyboard' },
        ]
    },
    {
        section: 'Trading (on coin page)',
        items: [
            { ...SHORTCUTS.buy, icon: 'ShoppingCart' },
            { ...SHORTCUTS.sell, icon: 'Tag' },
            { ...SHORTCUTS.watchlist, icon: 'Star' },
        ]
    },
    {
        section: 'General',
        items: [
            { ...SHORTCUTS.escape, icon: 'XCircle' },
        ]
    }
];

export default SHORTCUTS;
