import React, { useState, useEffect } from 'react';
import { X, Star, Trash2, Edit2, Check, AlertTriangle } from 'lucide-react';
import { useWatchlist } from '../../context/WatchlistContext';
import styles from './WatchlistManager.module.css';

/**
 * WatchlistManager - Modal for managing all watchlists
 * 
 * Features:
 * - View all watchlists
 * - Rename inline
 * - Set as default
 * - Delete with confirmation
 */
const WatchlistManager = ({
    isOpen,
    onClose,
    defaultWatchlistId,
    onSetDefault
}) => {
    const { watchlists, deleteWatchlist, loading } = useWatchlist();
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [deletingId, setDeletingId] = useState(null);
    const [renameLoading, setRenameLoading] = useState(false);

    // Close on Escape
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                if (deletingId) {
                    setDeletingId(null);
                } else if (editingId) {
                    setEditingId(null);
                } else {
                    onClose();
                }
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = '';
        };
    }, [isOpen, editingId, deletingId, onClose]);

    if (!isOpen) return null;

    const startEditing = (wl) => {
        setEditingId(wl._id);
        setEditName(wl.name);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditName('');
    };

    const handleRename = async (watchlistId) => {
        if (!editName.trim() || renameLoading) return;

        // Note: WatchlistContext doesn't have rename yet, would need to add it
        // For now just cancel editing
        cancelEditing();
    };

    const handleDelete = async (watchlistId) => {
        const result = await deleteWatchlist(watchlistId);
        if (result.success) {
            setDeletingId(null);
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <h2 className={styles.title}>Manage Watchlists</h2>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className={styles.content}>
                    {watchlists.length === 0 ? (
                        <div className={styles.empty}>
                            <Star size={32} />
                            <p>No watchlists yet</p>
                            <span>Create one from the Markets page</span>
                        </div>
                    ) : (
                        <div className={styles.list}>
                            {watchlists.map(wl => {
                                const isEditing = editingId === wl._id;
                                const isDeleting = deletingId === wl._id;
                                const isDefault = defaultWatchlistId === wl._id;

                                return (
                                    <div
                                        key={wl._id}
                                        className={`${styles.item} ${isDeleting ? styles.deleting : ''}`}
                                    >
                                        {isDeleting ? (
                                            // Delete confirmation
                                            <div className={styles.deleteConfirm}>
                                                <div className={styles.deleteWarning}>
                                                    <AlertTriangle size={16} />
                                                    <span>Delete "{wl.name}"? This cannot be undone.</span>
                                                </div>
                                                <div className={styles.deleteActions}>
                                                    <button
                                                        className={styles.cancelBtn}
                                                        onClick={() => setDeletingId(null)}
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        className={styles.confirmDeleteBtn}
                                                        onClick={() => handleDelete(wl._id)}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ) : isEditing ? (
                                            // Rename form
                                            <div className={styles.editForm}>
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleRename(wl._id);
                                                        if (e.key === 'Escape') cancelEditing();
                                                    }}
                                                    autoFocus
                                                    maxLength={30}
                                                />
                                                <button
                                                    className={styles.saveBtn}
                                                    onClick={() => handleRename(wl._id)}
                                                    disabled={!editName.trim()}
                                                >
                                                    <Check size={16} />
                                                </button>
                                                <button
                                                    className={styles.cancelEditBtn}
                                                    onClick={cancelEditing}
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            // Normal view
                                            <>
                                                <div className={styles.itemInfo}>
                                                    <span className={styles.itemName}>{wl.name}</span>
                                                    <span className={styles.itemCount}>
                                                        {wl.coins?.length || 0} coins
                                                    </span>
                                                    {isDefault && (
                                                        <span className={styles.defaultBadge}>Default</span>
                                                    )}
                                                </div>
                                                <div className={styles.itemActions}>
                                                    {!isDefault && onSetDefault && (
                                                        <button
                                                            className={styles.actionBtn}
                                                            onClick={() => onSetDefault(wl._id)}
                                                            title="Set as default"
                                                        >
                                                            <Star size={16} />
                                                        </button>
                                                    )}
                                                    <button
                                                        className={styles.actionBtn}
                                                        onClick={() => startEditing(wl)}
                                                        title="Rename"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                                        onClick={() => setDeletingId(wl._id)}
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WatchlistManager;
