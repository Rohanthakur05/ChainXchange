import React, { useState, useEffect } from 'react';
import { Newspaper, AlertCircle, RefreshCw } from 'lucide-react';
import { fetchCoinNews } from '../../services/newsService';
import NewsCard from './NewsCard';
import styles from './CoinNewsFeed.module.css';

/**
 * CoinNewsFeed - News feed for a specific coin
 */
const CoinNewsFeed = ({ coinSymbol, limit = 5 }) => {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadNews = async () => {
        if (!coinSymbol) return;

        setLoading(true);
        setError(null);

        try {
            const articles = await fetchCoinNews(coinSymbol, limit);
            setNews(articles);
        } catch (err) {
            setError('Failed to load news');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNews();
    }, [coinSymbol, limit]);

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <h3><Newspaper size={18} /> Latest News</h3>
                </div>
                <div className={styles.skeletons}>
                    {[1, 2, 3].map(i => (
                        <div key={i} className={styles.skeleton}>
                            <div className={styles.skeletonImage} />
                            <div className={styles.skeletonContent}>
                                <div className={styles.skeletonTitle} />
                                <div className={styles.skeletonMeta} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <h3><Newspaper size={18} /> Latest News</h3>
                </div>
                <div className={styles.error}>
                    <AlertCircle size={24} />
                    <p>{error}</p>
                    <button onClick={loadNews} className={styles.retryBtn}>
                        <RefreshCw size={14} /> Retry
                    </button>
                </div>
            </div>
        );
    }

    if (news.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <h3><Newspaper size={18} /> Latest News</h3>
                </div>
                <div className={styles.empty}>
                    <Newspaper size={32} />
                    <p>No news available for {coinSymbol}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3><Newspaper size={18} /> Latest News</h3>
                <button onClick={loadNews} className={styles.refreshBtn} title="Refresh">
                    <RefreshCw size={14} />
                </button>
            </div>
            <div className={styles.feed}>
                {news.map(article => (
                    <NewsCard key={article.id} article={article} />
                ))}
            </div>
        </div>
    );
};

export default CoinNewsFeed;
