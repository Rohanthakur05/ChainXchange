import React, { useEffect } from 'react';
import { X, Keyboard, Search, ShoppingCart, Tag, Star, XCircle } from 'lucide-react';
import styles from './ShortcutHintModal.module.css';

const SHORTCUTS = [
    {
        section: 'Navigation',
        items: [
            { key: '/', label: 'Open search', icon: Search },
            { key: '?', label: 'Show keyboard shortcuts', icon: Keyboard },
        ]
    },
    {
        section: 'Trading (on coin page)',
        items: [
            { key: 'B', label: 'Open buy modal', icon: ShoppingCart },
            { key: 'S', label: 'Open sell modal', icon: Tag },
            { key: 'W', label: 'Toggle watchlist', icon: Star },
        ]
    },
    {
        section: 'General',
        items: [
            { key: 'ESC', label: 'Close modal / overlay', icon: XCircle },
        ]
    }
];

const ShortcutHintModal = ({ isOpen, onClose }) => {
    // Handle ESC to close
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div
                className={styles.modal}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="shortcuts-title"
            >
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerTitle} id="shortcuts-title">
                        <Keyboard size={20} />
                        <span>Keyboard Shortcuts</span>
                    </div>
                    <button
                        className={styles.closeBtn}
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className={styles.content}>
                    {SHORTCUTS.map((section, idx) => (
                        <div key={section.section} className={idx > 0 ? styles.section : ''}>
                            <div className={styles.sectionTitle}>{section.section}</div>
                            <div className={styles.shortcutList}>
                                {section.items.map((shortcut) => {
                                    const Icon = shortcut.icon;
                                    return (
                                        <div key={shortcut.key} className={styles.shortcutItem}>
                                            <span className={styles.shortcutLabel}>
                                                <Icon size={16} />
                                                {shortcut.label}
                                            </span>
                                            <span className={styles.keyBadge}>{shortcut.key}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <span className={styles.footerHint}>
                        Press <span className={styles.keyBadge}>ESC</span> to close
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ShortcutHintModal;
