import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './GlobalSearchModal.module.css';

const SearchResultItem = ({ coin, onClick }) => {
    const navigate = useNavigate();

    const handleClick = () => {
        navigate(`/markets/${coin.id}`);
        onClick?.();
    };

    return (
        <button className={styles.resultItem} onClick={handleClick}>
            <img
                src={coin.image}
                alt={coin.name}
                className={styles.coinIcon}
            />
            <div className={styles.coinInfo}>
                <span className={styles.coinName}>{coin.name}</span>
                <span className={styles.coinSymbol}>{coin.symbol.toUpperCase()}</span>
            </div>
            <span className={styles.assetType}>Crypto</span>
        </button>
    );
};

export default SearchResultItem;
