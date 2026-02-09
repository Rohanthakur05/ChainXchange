import React from 'react';
import useIsTouchDevice from '../../../hooks/useIsTouchDevice';
import styles from './ShortcutBadge.module.css';

/**
 * ShortcutBadge - Displays keyboard shortcut hint on UI elements
 * 
 * Features:
 * - Auto-hides on touch devices
 * - Shows on hover by default (showOnHoverOnly prop)
 * - Consistent styling with design system
 * 
 * @param {string} shortcutKey - The key to display (e.g., "B", "S", "/")
 * @param {boolean} showOnHoverOnly - If true, only visible on parent hover
 * @param {string} className - Additional CSS classes
 */
const ShortcutBadge = ({
    shortcutKey,
    showOnHoverOnly = true,
    className = ''
}) => {
    const isTouchDevice = useIsTouchDevice();

    // Never show on touch devices
    if (isTouchDevice) return null;

    return (
        <span
            className={`
                ${styles.badge} 
                ${showOnHoverOnly ? styles.hoverOnly : ''} 
                ${className}
            `.trim()}
            aria-hidden="true"
            title={`Keyboard shortcut: ${shortcutKey}`}
        >
            {shortcutKey}
        </span>
    );
};

export default ShortcutBadge;
