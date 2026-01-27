import React from 'react';
import { Search, Bell } from 'lucide-react';
import { useGlobalSearch } from '../../../context/GlobalSearchContext';
import styles from './Topbar.module.css';

const Topbar = () => {
    const { openSearch } = useGlobalSearch();

    return (
        <header className={styles.topbar}>
            <button
                className={styles.searchTrigger}
                onClick={openSearch}
                type="button"
            >
                <Search size={16} />
                <span>Search cryptocurrencies...</span>
            </button>

            <div className={styles.actions}>
                <div className={styles.balance}>
                    <span className={styles.balanceLabel}>Total Balance</span>
                    <span className={styles.balanceValue}>$1,420.69</span>
                </div>

                <button className={styles.iconBtn}>
                    <Bell size={20} color="var(--text-secondary)" />
                </button>

                <div className={styles.avatar}>
                    U
                </div>
            </div>
        </header>
    );
};

export default Topbar;

