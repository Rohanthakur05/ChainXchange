import React, { useState, useRef, useEffect } from 'react';
import { Star, Plus, Check, X, Loader2 } from 'lucide-react';
import { useWatchlist } from '../../../context/WatchlistContext';
import styles from './AddToWatchlistPopover.module.css';

/**
 * AddToWatchlistPopover - Popover for adding coins to watchlists
 * Anchored to the star button, shows list of watchlists + create option
 */
const AddToWatchlistPopover = ({ coin, onClose, anchorRect }) => {
    const { watchlists, addCoinToWatchlist, createWatchlist, isCoinInWatchlist } = useWatchlist();
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newWatchlistName, setNewWatchlistName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const popoverRef = useRef(null);
    const inputRef = useRef(null);

    // Focus input when create form shows
    useEffect(() => {
        if (showCreateForm && inputRef.current) {
            inputRef.current.focus();
        }
    }, [showCreateForm]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                onClose();
            }
        };

        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    // Handle adding to existing watchlist
    const handleAddToWatchlist = async (watchlistId, watchlistName) => {
        if (isCoinInWatchlist(coin.id, watchlistId)) return;

        setIsSubmitting(true);
        setError(null);

        const result = await addCoinToWatchlist(watchlistId, coin.id);

        if (result.success) {
            setSuccessMessage(`Added to ${watchlistName}`);
            setTimeout(() => onClose(), 800);
        } else {
            setError(result.error);
        }
        setIsSubmitting(false);
    };

    // Handle creating new watchlist
    const handleCreateWatchlist = async (e) => {
        e.preventDefault();
        const trimmedName = newWatchlistName.trim();

        if (!trimmedName) {
            setError('Please enter a name');
            return;
        }

        // Check for duplicate name
        if (watchlists.some(w => w.name.toLowerCase() === trimmedName.toLowerCase())) {
            setError('Watchlist already exists');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        const result = await createWatchlist(trimmedName, coin.id);

        if (result.success) {
            setSuccessMessage(`Created "${trimmedName}" with ${coin.symbol?.toUpperCase()}`);
            setTimeout(() => onClose(), 800);
        } else {
            setError(result.error);
        }
        setIsSubmitting(false);
    };

    // Calculate position
    const getPosition = () => {
        if (!anchorRect) return {};
        return {
            top: anchorRect.bottom + 8,
            left: Math.max(8, anchorRect.left - 100)
        };
    };

    const position = getPosition();
    const hasWatchlists = watchlists.length > 0;

    return (
        <div
            ref={popoverRef}
            className={styles.popover}
            style={{ top: position.top, left: position.left }}
        >
            {/* Header */}
            <div className={styles.header}>
                <Star size={16} className={styles.headerIcon} />
                <span>Add to Watchlist</span>
            </div>

            {/* Success State */}
            {successMessage && (
                <div className={styles.successState}>
                    <Check size={18} className={styles.successIcon} />
                    <span>{successMessage}</span>
                </div>
            )}

            {/* Error State */}
            {error && !successMessage && (
                <div className={styles.errorState}>
                    <span>{error}</span>
                </div>
            )}

            {/* Content */}
            {!successMessage && (
                <>
                    {/* Watchlist Options */}
                    {hasWatchlists && !showCreateForm && (
                        <div className={styles.watchlistList}>
                            {watchlists.map(watchlist => {
                                const alreadyAdded = isCoinInWatchlist(coin.id, watchlist._id);
                                return (
                                    <button
                                        key={watchlist._id}
                                        className={`${styles.watchlistOption} ${alreadyAdded ? styles.disabled : ''}`}
                                        onClick={() => handleAddToWatchlist(watchlist._id, watchlist.name)}
                                        disabled={alreadyAdded || isSubmitting}
                                    >
                                        <div className={styles.watchlistInfo}>
                                            <span className={styles.watchlistName}>{watchlist.name}</span>
                                            <span className={styles.coinCount}>
                                                {watchlist.coins?.length || 0} coins
                                            </span>
                                        </div>
                                        {alreadyAdded ? (
                                            <Check size={16} className={styles.checkIcon} />
                                        ) : isSubmitting ? (
                                            <Loader2 size={16} className={styles.spinner} />
                                        ) : (
                                            <Plus size={16} className={styles.addIcon} />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Create Form */}
                    {showCreateForm ? (
                        <form onSubmit={handleCreateWatchlist} className={styles.createForm}>
                            <input
                                ref={inputRef}
                                type="text"
                                value={newWatchlistName}
                                onChange={(e) => setNewWatchlistName(e.target.value)}
                                placeholder="Watchlist name"
                                className={styles.input}
                                maxLength={50}
                                disabled={isSubmitting}
                            />
                            <div className={styles.formActions}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateForm(false);
                                        setNewWatchlistName('');
                                        setError(null);
                                    }}
                                    className={styles.cancelBtn}
                                    disabled={isSubmitting}
                                >
                                    <X size={14} />
                                </button>
                                <button
                                    type="submit"
                                    className={styles.submitBtn}
                                    disabled={!newWatchlistName.trim() || isSubmitting}
                                >
                                    {isSubmitting ? <Loader2 size={14} className={styles.spinner} /> : <Check size={14} />}
                                </button>
                            </div>
                        </form>
                    ) : (
                        /* Create New Button */
                        <button
                            className={styles.createNewBtn}
                            onClick={() => setShowCreateForm(true)}
                        >
                            <Plus size={16} />
                            <span>{hasWatchlists ? 'Create new watchlist' : 'Create your first watchlist'}</span>
                        </button>
                    )}
                </>
            )}
        </div>
    );
};

export default AddToWatchlistPopover;
