import React, { useEffect, useState } from 'react';
import { Newspaper, ExternalLink, RefreshCw, Clock, AlertCircle } from 'lucide-react';
import styles from './NewsWidget.module.css';

const NEWS_API_URL = 'https://cryptopanic.com/api/v1/posts/?auth_token=DEMO&public=true&kind=news';

// Fallback sample data in case API fails
const FALLBACK_NEWS = [
    {
        id: 1,
        title: 'Bitcoin Approaches New Heights as Institutional Interest Grows',
        source: { title: 'CryptoNews' },
        published_at: new Date().toISOString(),
        url: '#'
    },
    {
        id: 2,
        title: 'Ethereum 2.0 Staking Rewards See Significant Increase',
        source: { title: 'CoinDesk' },
        published_at: new Date().toISOString(),
        url: '#'
    },
    {
        id: 3,
        title: 'Major DeFi Protocol Announces Security Upgrade',
        source: { title: 'The Block' },
        published_at: new Date().toISOString(),
        url: '#'
    },
    {
        id: 4,
        title: 'Central Banks Explore Digital Currency Frameworks',
        source: { title: 'Reuters' },
        published_at: new Date().toISOString(),
        url: '#'
    },
    {
        id: 5,
        title: 'NFT Market Shows Signs of Recovery Amid New Projects',
        source: { title: 'CryptoSlate' },
        published_at: new Date().toISOString(),
        url: '#'
    }
];

const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
};

const NewsWidget = () => {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchNews = async () => {
        setLoading(true);
        setError(null);
        try {
            // Try fetching from CryptoPanic API
            const response = await fetch(NEWS_API_URL);

            if (!response.ok) {
                throw new Error('API request failed');
            }

            const data = await response.json();

            if (data.results && data.results.length > 0) {
                setNews(data.results.slice(0, 5));
            } else {
                // Use fallback data
                setNews(FALLBACK_NEWS);
            }
        } catch (err) {
            console.error('Failed to fetch news:', err);
            // Use fallback data on error
            setNews(FALLBACK_NEWS);
            setError('Using cached data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNews();
        // Refresh every 5 minutes
        const interval = setInterval(fetchNews, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className={styles.widget}>
                <div className={styles.header}>
                    <div className={styles.titleGroup}>
                        <Newspaper size={16} className={styles.icon} />
                        <h3 className={styles.title}>Crypto News</h3>
                    </div>
                </div>
                <div className={styles.loadingState}>
                    <div className={styles.spinner}></div>
                    <span>Loading news...</span>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.widget}>
            <div className={styles.header}>
                <div className={styles.titleGroup}>
                    <Newspaper size={16} className={styles.icon} />
                    <h3 className={styles.title}>Crypto News</h3>
                </div>
                <button onClick={fetchNews} className={styles.refreshBtn} title="Refresh">
                    <RefreshCw size={14} />
                </button>
            </div>

            {error && (
                <div className={styles.errorBanner}>
                    <AlertCircle size={12} />
                    <span>{error}</span>
                </div>
            )}

            <div className={styles.newsList}>
                {news.map((item, index) => (
                    <a
                        key={item.id || index}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.newsItem}
                    >
                        <div className={styles.newsContent}>
                            <h4 className={styles.newsTitle}>{item.title}</h4>
                            <div className={styles.newsMeta}>
                                <span className={styles.source}>
                                    {item.source?.title || 'Unknown'}
                                </span>
                                <span className={styles.time}>
                                    <Clock size={10} />
                                    {formatTimeAgo(item.published_at)}
                                </span>
                            </div>
                        </div>
                        <ExternalLink size={14} className={styles.linkIcon} />
                    </a>
                ))}
            </div>

            <a
                href="https://cryptopanic.com"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.viewAll}
            >
                View All News
                <ExternalLink size={12} />
            </a>
        </div>
    );
};

export default NewsWidget;
