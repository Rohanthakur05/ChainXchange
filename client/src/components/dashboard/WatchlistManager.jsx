import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, Check, X, Star } from 'lucide-react';
import api from '../../utils/api';
import Button from '../ui/Button/Button';
import styles from './WatchlistManager.module.css';

/**
 * WatchlistManager - Component for managing multiple named watchlists
 * Allows users to create, rename, delete watchlists and add/remove coins
 */
const WatchlistManager = ({ coinId = null, coinName = null, onClose }) => {
    const [watchlists, setWatchlists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [actionLoading, setActionLoading] = useState(null);
    const [error, setError] = useState(null);

    // Fetch all watchlists
    const fetchWatchlists = async () => {
        try {
            const response = await api.get('/watchlist');
            setWatchlists(response.data.watchlists || []);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch watchlists', err);
            setError('Failed to load watchlists');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWatchlists();
    }, []);

    // Create a new watchlist
    const handleCreate = async () => {
        if (!newName.trim()) return;

        setActionLoading('create');
        try {
            const response = await api.post('/watchlist', { name: newName.trim() });
            setWatchlists(prev => [...prev, response.data.watchlist]);
            setNewName('');
            setCreating(false);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create watchlist');
        } finally {
            setActionLoading(null);
        }
    };

    // Rename a watchlist
    const handleRename = async (watchlistId) => {
        if (!editName.trim()) return;

        setActionLoading(watchlistId);
        try {
            await api.patch(`/watchlist/${watchlistId}`, { name: editName.trim() });
            setWatchlists(prev => prev.map(w =>
                w._id === watchlistId ? { ...w, name: editName.trim() } : w
            ));
            setEditingId(null);
            setEditName('');
            setError(null);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to rename watchlist');
        } finally {
            setActionLoading(null);
        }
    };

    // Delete a watchlist
    const handleDelete = async (watchlistId) => {
        if (!window.confirm('Delete this watchlist?')) return;

        setActionLoading(watchlistId);
        try {
            await api.delete(`/watchlist/${watchlistId}`);
            setWatchlists(prev => prev.filter(w => w._id !== watchlistId));
            setError(null);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to delete watchlist');
        } finally {
            setActionLoading(null);
        }
    };

    // Add coin to specific watchlist
    const handleAddCoin = async (watchlistId) => {
        if (!coinId) return;

        setActionLoading(watchlistId);
        try {
            const response = await api.post(`/watchlist/${watchlistId}/coins`, { coinId });
            setWatchlists(prev => prev.map(w =>
                w._id === watchlistId ? response.data.watchlist : w
            ));
            setError(null);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add coin');
        } finally {
            setActionLoading(null);
        }
    };

    // Remove coin from specific watchlist
    const handleRemoveCoin = async (watchlistId, removeCoinId) => {
        setActionLoading(`${watchlistId}-${removeCoinId}`);
        try {
            await api.delete(`/watchlist/${watchlistId}/coins/${removeCoinId}`);
            setWatchlists(prev => prev.map(w =>
                w._id === watchlistId
                    ? { ...w, coins: w.coins.filter(c => c !== removeCoinId) }
                    : w
            ));
            setError(null);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to remove coin');
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>Loading watchlists...</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}>
                    <Star size={18} />
                    {coinId ? `Add ${coinName || coinId} to Watchlist` : 'Manage Watchlists'}
                </h3>
                {onClose && (
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={18} />
                    </button>
                )}
            </div>

            {error && (
                <div className={styles.error}>{error}</div>
            )}

            {/* Create new watchlist */}
            <div className={styles.createSection}>
                {creating ? (
                    <div className={styles.createForm}>
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Watchlist name..."
                            className={styles.input}
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        />
                        <button
                            className={styles.iconBtn}
                            onClick={handleCreate}
                            disabled={actionLoading === 'create'}
                        >
                            <Check size={16} />
                        </button>
                        <button
                            className={styles.iconBtn}
                            onClick={() => { setCreating(false); setNewName(''); }}
                        >
                            <X size={16} />
                        </button>
                    </div>
                ) : (
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setCreating(true)}
                    >
                        <Plus size={14} /> New Watchlist
                    </Button>
                )}
            </div>

            {/* List of watchlists */}
            <div className={styles.list}>
                {watchlists.length === 0 ? (
                    <div className={styles.empty}>
                        No watchlists yet. Create one to get started!
                    </div>
                ) : (
                    watchlists.map(watchlist => {
                        const isInWatchlist = coinId && watchlist.coins?.includes(coinId);
                        const isEditing = editingId === watchlist._id;
                        const isLoading = actionLoading === watchlist._id;

                        return (
                            <div key={watchlist._id} className={styles.watchlistItem}>
                                <div className={styles.watchlistHeader}>
                                    {isEditing ? (
                                        <div className={styles.editForm}>
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className={styles.input}
                                                autoFocus
                                                onKeyDown={(e) => e.key === 'Enter' && handleRename(watchlist._id)}
                                            />
                                            <button
                                                className={styles.iconBtn}
                                                onClick={() => handleRename(watchlist._id)}
                                                disabled={isLoading}
                                            >
                                                <Check size={14} />
                                            </button>
                                            <button
                                                className={styles.iconBtn}
                                                onClick={() => { setEditingId(null); setEditName(''); }}
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className={styles.watchlistName}>
                                                {watchlist.name}
                                                <span className={styles.coinCount}>
                                                    ({watchlist.coins?.length || 0} coins)
                                                </span>
                                            </span>
                                            <div className={styles.actions}>
                                                {coinId && (
                                                    <Button
                                                        size="sm"
                                                        variant={isInWatchlist ? 'danger' : 'primary'}
                                                        onClick={() => isInWatchlist
                                                            ? handleRemoveCoin(watchlist._id, coinId)
                                                            : handleAddCoin(watchlist._id)
                                                        }
                                                        disabled={isLoading}
                                                    >
                                                        {isInWatchlist ? 'Remove' : 'Add'}
                                                    </Button>
                                                )}
                                                <button
                                                    className={styles.iconBtn}
                                                    onClick={() => {
                                                        setEditingId(watchlist._id);
                                                        setEditName(watchlist.name);
                                                    }}
                                                    title="Rename"
                                                >
                                                    <Edit3 size={14} />
                                                </button>
                                                <button
                                                    className={styles.iconBtn}
                                                    onClick={() => handleDelete(watchlist._id)}
                                                    disabled={isLoading}
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default WatchlistManager;
