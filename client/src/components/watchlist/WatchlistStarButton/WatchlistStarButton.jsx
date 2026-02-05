import React, { useState, useRef, useCallback } from 'react';
import { Star } from 'lucide-react';
import { useWatchlist } from '../../../context/WatchlistContext';
import AddToWatchlistPopover from '../AddToWatchlistPopover/AddToWatchlistPopover';
import styles from './WatchlistStarButton.module.css';

/**
 * WatchlistStarButton - Star button that triggers the watchlist popover
 * Props:
 * - coin: { id, name, symbol, image, current_price, ... }
 * - size: icon size in pixels (default 18)
 */
const WatchlistStarButton = ({ coin, size = 18 }) => {
    const [showPopover, setShowPopover] = useState(false);
    const [anchorRect, setAnchorRect] = useState(null);
    const buttonRef = useRef(null);
    const { isCoinInWatchlist } = useWatchlist();

    const isInAnyWatchlist = isCoinInWatchlist(coin.id);

    const handleClick = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();

        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setAnchorRect(rect);
        }
        setShowPopover(true);
    }, []);

    const handleClose = useCallback(() => {
        setShowPopover(false);
        setAnchorRect(null);
    }, []);

    return (
        <>
            <button
                ref={buttonRef}
                className={`${styles.starButton} ${isInAnyWatchlist ? styles.active : ''}`}
                onClick={handleClick}
                title={isInAnyWatchlist ? 'Manage watchlist' : 'Add to watchlist'}
                aria-label={isInAnyWatchlist ? 'Manage watchlist' : 'Add to watchlist'}
            >
                <Star
                    size={size}
                    fill={isInAnyWatchlist ? 'currentColor' : 'none'}
                />
            </button>

            {showPopover && (
                <AddToWatchlistPopover
                    coin={coin}
                    onClose={handleClose}
                    anchorRect={anchorRect}
                />
            )}
        </>
    );
};

export default WatchlistStarButton;
