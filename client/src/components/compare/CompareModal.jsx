import React, { useEffect } from 'react';
import { X, GitCompare } from 'lucide-react';
import { useCompare } from '../../context/CompareContext';
import CompareTable from './CompareTable';
import CoinSelector from './CoinSelector';
import styles from './CompareModal.module.css';

/**
 * CompareModal - Full comparison modal with selector and table
 */
const CompareModal = () => {
    const { isModalOpen, closeCompare, selectedCoinIds, clearAll } = useCompare();

    // Close on Escape
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') closeCompare();
        };

        if (isModalOpen) {
            document.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = '';
        };
    }, [isModalOpen, closeCompare]);

    if (!isModalOpen) return null;

    return (
        <div className={styles.overlay} onClick={closeCompare}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerTitle}>
                        <GitCompare size={20} />
                        <span>Compare Coins</span>
                    </div>
                    <div className={styles.headerActions}>
                        {selectedCoinIds.length > 0 && (
                            <button className={styles.clearBtn} onClick={clearAll}>
                                Clear All
                            </button>
                        )}
                        <button className={styles.closeBtn} onClick={closeCompare} aria-label="Close">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Coin selector */}
                <CoinSelector />

                {/* Comparison table */}
                <div className={styles.content}>
                    <CompareTable />
                </div>
            </div>
        </div>
    );
};

export default CompareModal;
