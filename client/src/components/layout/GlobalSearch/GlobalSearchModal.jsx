import React, { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useGlobalSearch } from '../../../context/GlobalSearchContext';
import SearchResultItem from './SearchResultItem';
import styles from './GlobalSearchModal.module.css';

const GlobalSearchModal = () => {
    const {
        isSearchOpen,
        closeSearch,
        searchQuery,
        setSearchQuery,
        searchResults,
        loading
    } = useGlobalSearch();

    const inputRef = useRef(null);
    const modalRef = useRef(null);

    // Auto-focus input when modal opens
    useEffect(() => {
        if (isSearchOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isSearchOpen]);

    // Handle ESC key to close
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isSearchOpen) {
                closeSearch();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isSearchOpen, closeSearch]);

    // Handle click outside modal to close
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            closeSearch();
        }
    };

    if (!isSearchOpen) {
        return null;
    }

    const hasQuery = searchQuery.trim().length > 0;
    const noResults = hasQuery && searchResults.length === 0;

    return (
        <div className={styles.overlay} onClick={handleOverlayClick}>
            <div className={styles.modal} ref={modalRef}>
                {/* Search Header */}
                <div className={styles.searchHeader}>
                    <Search size={20} className={styles.searchIcon} />
                    <input
                        ref={inputRef}
                        type="text"
                        className={styles.searchInput}
                        placeholder="Search cryptocurrencies..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoComplete="off"
                    />
                    <button className={styles.closeBtn} onClick={closeSearch}>
                        <X size={20} />
                    </button>
                </div>

                {/* Results Section */}
                <div className={styles.resultsContainer}>
                    {loading ? (
                        <div className={styles.stateMessage}>
                            <span>Loading...</span>
                        </div>
                    ) : noResults ? (
                        <div className={styles.stateMessage}>
                            <span>No results found for "{searchQuery}"</span>
                        </div>
                    ) : (
                        <>
                            {!hasQuery && (
                                <div className={styles.sectionLabel}>
                                    Popular Coins
                                </div>
                            )}
                            <div className={styles.resultsList}>
                                {searchResults.map((coin) => (
                                    <SearchResultItem
                                        key={coin.id}
                                        coin={coin}
                                        onClick={closeSearch}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer hint */}
                <div className={styles.footer}>
                    <span><kbd>ESC</kbd> to close</span>
                </div>
            </div>
        </div>
    );
};

export default GlobalSearchModal;
