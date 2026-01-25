import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Bell } from 'lucide-react';
import Input from '../../ui/Input/Input';
import styles from './Topbar.module.css';

const Topbar = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const searchQuery = searchParams.get('search') || '';

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchParams(prev => {
            if (value) {
                prev.set('search', value);
            } else {
                prev.delete('search');
            }
            return prev;
        }, { replace: true });
    };

    return (
        <header className={styles.topbar}>
            <div className={styles.search}>
                <Input
                    placeholder="Search stocks, crypto..."
                    icon={<Search size={16} />}
                    value={searchQuery}
                    onChange={handleSearchChange}
                />
            </div>

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
