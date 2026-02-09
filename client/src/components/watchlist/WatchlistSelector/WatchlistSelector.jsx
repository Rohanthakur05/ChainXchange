import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Star, Plus, Settings, Check } from 'lucide-react';
import { useWatchlist } from '../../context/WatchlistContext';
import styles from './WatchlistSelector.module.css';

/**
 * WatchlistSelector - Dropdown for selecting active watchlist
 * 
 * Features:
 * - Shows current watchlist name
 * - Dropdown with all watchlists
 * - Quick create new watchlist
 * - Link to manage watchlists
 */
const WatchlistSelector = ({
    activeWatchlistId,
    onSelect,
    onManage,
    defaultWatchlistId,
    onSetDefault
}) => {
    const { watchlists, createWatchlist, loading } = useWatchlist();
    const [isOpen, setIsOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);

    // Find active watchlist
    const activeWatchlist = watchlists.find(w => w._id === activeWatchlistId);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
                setIsCreating(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Focus input when creating
    useEffect(() => {
        if (isCreating) {
            inputRef.current?.focus();
        }
    }, [isCreating]);

    const handleCreate = async () => {
        if (!newName.trim()) return;

        const result = await createWatchlist(newName.trim());
        if (result.success) {
            setNewName('');
            setIsCreating(false);
            onSelect?.(result.watchlist._id);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleCreate();
        } else if (e.key === 'Escape') {
            setIsCreating(false);
            setNewName('');
        }
    };

    return (
        <div className={styles.container} ref={dropdownRef}>
            <button
                className={styles.trigger}
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <Star size={14} className={styles.starIcon} />
                <span className={styles.selectedName}>
                    {activeWatchlist?.name || 'All Watchlists'}
                </span>
                <ChevronDown
                    size={14}
                    className={`${styles.chevron} ${isOpen ? styles.rotated : ''}`}
                />
            </button>

            {isOpen && (
                <div className={styles.dropdown}>
                    {/* All watchlists option */}
                    <button
                        className={`${styles.option} ${!activeWatchlistId ? styles.active : ''}`}
                        onClick={() => {
                            onSelect?.(null);
                            setIsOpen(false);
                        }}
                    >
                        <span>All Watchlists</span>
                        {!activeWatchlistId && <Check size={14} className={styles.checkIcon} />}
                    </button>

                    {/* Divider */}
                    {watchlists.length > 0 && <div className={styles.divider} />}

                    {/* Watchlist list */}
                    {watchlists.map(wl => (
                        <button
                            key={wl._id}
                            className={`${styles.option} ${activeWatchlistId === wl._id ? styles.active : ''}`}
                            onClick={() => {
                                onSelect?.(wl._id);
                                setIsOpen(false);
                            }}
                        >
                            <span className={styles.optionName}>{wl.name}</span>
                            <div className={styles.optionMeta}>
                                {wl._id === defaultWatchlistId && (
                                    <span className={styles.defaultBadge}>Default</span>
                                )}
                                {wl.coins?.length > 0 && (
                                    <span className={styles.coinCount}>{wl.coins.length}</span>
                                )}
                                {activeWatchlistId === wl._id && (
                                    <Check size={14} className={styles.checkIcon} />
                                )}
                            </div>
                        </button>
                    ))}

                    {/* Create new */}
                    <div className={styles.divider} />

                    {isCreating ? (
                        <div className={styles.createInput}>
                            <input
                                ref={inputRef}
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Watchlist name"
                                maxLength={30}
                            />
                            <button onClick={handleCreate} disabled={!newName.trim()}>
                                Add
                            </button>
                        </div>
                    ) : (
                        <button
                            className={`${styles.option} ${styles.createBtn}`}
                            onClick={() => setIsCreating(true)}
                        >
                            <Plus size={14} />
                            <span>Create Watchlist</span>
                        </button>
                    )}

                    {/* Manage link */}
                    {onManage && (
                        <button
                            className={`${styles.option} ${styles.manageBtn}`}
                            onClick={() => {
                                onManage();
                                setIsOpen(false);
                            }}
                        >
                            <Settings size={14} />
                            <span>Manage Watchlists</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default WatchlistSelector;
