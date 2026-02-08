import React, { useEffect, useRef, useCallback } from 'react';
import { X, AlertTriangle, ShoppingCart, Tag, Trash2, Star } from 'lucide-react';
import Button from '../Button/Button';
import styles from './ConfirmationModal.module.css';

/**
 * ConfirmationModal - Reusable confirmation modal for critical actions
 * 
 * Supports types: 'buy', 'sell', 'watchlist-remove', 'clear-portfolio'
 */
const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    type = 'buy',

    // Trade-specific props (buy/sell)
    coin = null,
    quantity = 0,
    price = 0,
    fee = 0,

    // Watchlist-specific
    coinName = '',

    // Destructive action props
    requireAcknowledgment = false,
    warningMessage = '',

    // State
    loading = false,
    error = '',
}) => {
    const modalRef = useRef(null);
    const confirmBtnRef = useRef(null);
    const [acknowledged, setAcknowledged] = React.useState(false);

    // Calculate totals for trade modals
    const subtotal = quantity * price;
    const total = type === 'buy' ? subtotal + fee : subtotal - fee;

    // Reset acknowledgment when modal closes
    useEffect(() => {
        if (!isOpen) {
            setAcknowledged(false);
        }
    }, [isOpen]);

    // Focus management and keyboard handlers
    useEffect(() => {
        if (!isOpen) return;

        // Focus confirm button when modal opens
        confirmBtnRef.current?.focus();

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                if (!loading) onClose();
            }
            if (e.key === 'Enter' && !e.shiftKey) {
                // Don't trigger if user is in an input or button
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
                e.preventDefault();
                if (!loading && !isConfirmDisabled()) {
                    onConfirm();
                }
            }
        };

        // Prevent background scroll
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = '';
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, loading, onClose, onConfirm]);

    // Check if confirm button should be disabled
    const isConfirmDisabled = useCallback(() => {
        if (loading) return true;
        if (requireAcknowledgment && !acknowledged) return true;
        return false;
    }, [loading, requireAcknowledgment, acknowledged]);

    // Generate title based on type
    const getTitle = () => {
        switch (type) {
            case 'buy': return 'Confirm Purchase';
            case 'sell': return 'Confirm Sale';
            case 'watchlist-remove': return 'Remove from Watchlist';
            case 'clear-portfolio': return 'Clear Portfolio';
            default: return 'Confirm Action';
        }
    };

    // Get icon based on type
    const getIcon = () => {
        switch (type) {
            case 'buy': return <ShoppingCart size={20} />;
            case 'sell': return <Tag size={20} />;
            case 'watchlist-remove': return <Star size={20} />;
            case 'clear-portfolio': return <Trash2 size={20} />;
            default: return null;
        }
    };

    // Get header style class
    const getHeaderClass = () => {
        if (type === 'buy') return styles.headerBuy;
        if (type === 'sell' || type === 'clear-portfolio') return styles.headerDestructive;
        return '';
    };

    // Get confirm button variant
    const getButtonVariant = () => {
        if (type === 'buy') return 'primary';
        return 'danger';
    };

    // Get confirm button text
    const getConfirmText = () => {
        if (loading) return <><span className={styles.spinner} />Processing...</>;
        switch (type) {
            case 'buy': return `Confirm Buy`;
            case 'sell': return `Confirm Sell`;
            case 'watchlist-remove': return 'Remove';
            case 'clear-portfolio': return 'Clear All Holdings';
            default: return 'Confirm';
        }
    };

    // Handle backdrop click
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget && !loading) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={handleBackdropClick}>
            <div
                className={styles.modal}
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`${styles.header} ${getHeaderClass()}`}>
                    <div className={styles.headerTitle} id="modal-title">
                        {getIcon()}
                        <span>{getTitle()}</span>
                    </div>
                    <button
                        className={styles.closeBtn}
                        onClick={onClose}
                        disabled={loading}
                        aria-label="Close modal"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className={styles.body}>
                    {/* Trade Modal Content (Buy/Sell) */}
                    {(type === 'buy' || type === 'sell') && coin && (
                        <>
                            <div className={styles.coinInfo}>
                                {coin.image && (
                                    <img
                                        src={coin.image}
                                        alt={coin.name}
                                        className={styles.coinIcon}
                                    />
                                )}
                                <div className={styles.coinDetails}>
                                    <div className={styles.coinName}>{coin.name}</div>
                                    <div className={styles.coinSymbol}>{coin.symbol}</div>
                                </div>
                            </div>

                            <div className={styles.summaryList}>
                                <div className={styles.summaryRow}>
                                    <span className={styles.summaryLabel}>Quantity</span>
                                    <span className={styles.summaryValue}>
                                        {quantity} {coin.symbol?.toUpperCase()}
                                    </span>
                                </div>
                                <div className={styles.summaryRow}>
                                    <span className={styles.summaryLabel}>Price per coin</span>
                                    <span className={styles.summaryValue}>
                                        ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                                    </span>
                                </div>
                                <div className={styles.summaryRow}>
                                    <span className={styles.summaryLabel}>Subtotal</span>
                                    <span className={styles.summaryValue}>
                                        ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className={styles.summaryRow}>
                                    <span className={styles.summaryLabel}>Trading Fee (0.1%)</span>
                                    <span className={styles.summaryValue}>
                                        ${fee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className={`${styles.summaryRow} ${styles.summaryDivider} ${styles.totalRow}`}>
                                    <span className={styles.summaryLabel}>
                                        {type === 'buy' ? 'Total Payable' : 'You Receive'}
                                    </span>
                                    <span className={`${styles.summaryValue} ${type === 'buy' ? styles.totalBuy : styles.totalSell}`}>
                                        ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Watchlist Remove Content */}
                    {type === 'watchlist-remove' && (
                        <div className={styles.simpleMessage}>
                            <div className={styles.coinName}>{coinName}</div>
                            <p>This coin will be removed from your watchlist.</p>
                        </div>
                    )}

                    {/* Clear Portfolio Content */}
                    {type === 'clear-portfolio' && (
                        <>
                            <div className={styles.warningBox}>
                                <AlertTriangle size={22} />
                                <div className={styles.warningText}>
                                    <strong>This action cannot be undone</strong>
                                    {warningMessage || 'You are about to sell all holdings in your portfolio. This will convert all assets to USD at current market prices.'}
                                </div>
                            </div>

                            {requireAcknowledgment && (
                                <label className={styles.acknowledgment}>
                                    <input
                                        type="checkbox"
                                        checked={acknowledged}
                                        onChange={(e) => setAcknowledged(e.target.checked)}
                                    />
                                    <span>I understand the consequences and want to proceed</span>
                                </label>
                            )}
                        </>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className={styles.error}>
                            <AlertTriangle size={16} />
                            {error}
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className={styles.footer}>
                        <Button
                            ref={confirmBtnRef}
                            onClick={onConfirm}
                            variant={getButtonVariant()}
                            disabled={isConfirmDisabled()}
                            block
                        >
                            {getConfirmText()}
                        </Button>
                        <Button
                            onClick={onClose}
                            variant="secondary"
                            disabled={loading}
                            block
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
