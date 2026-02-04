import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import styles from './FearGreedWidget.module.css';

const SENTIMENT_LABELS = {
    extremeFear: { label: 'Extreme Fear', color: '#ea3943', icon: TrendingDown },
    fear: { label: 'Fear', color: '#f5a623', icon: TrendingDown },
    neutral: { label: 'Neutral', color: '#808080', icon: Minus },
    greed: { label: 'Greed', color: '#83bf6e', icon: TrendingUp },
    extremeGreed: { label: 'Extreme Greed', color: '#00c853', icon: TrendingUp }
};

const getSentiment = (value) => {
    if (value <= 20) return SENTIMENT_LABELS.extremeFear;
    if (value <= 40) return SENTIMENT_LABELS.fear;
    if (value <= 60) return SENTIMENT_LABELS.neutral;
    if (value <= 80) return SENTIMENT_LABELS.greed;
    return SENTIMENT_LABELS.extremeGreed;
};

const FearGreedWidget = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchFearGreedIndex = async () => {
        setLoading(true);
        setError(null);
        try {
            // Alternative.me Fear & Greed API
            const response = await fetch('https://api.alternative.me/fng/?limit=1');
            const result = await response.json();

            if (result.data && result.data[0]) {
                setData({
                    value: parseInt(result.data[0].value),
                    valueClassification: result.data[0].value_classification,
                    timestamp: new Date(result.data[0].timestamp * 1000),
                    timeUntilUpdate: result.data[0].time_until_update
                });
            }
        } catch (err) {
            console.error('Failed to fetch Fear & Greed Index:', err);
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFearGreedIndex();
        // Refresh every 30 minutes
        const interval = setInterval(fetchFearGreedIndex, 30 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className={styles.widget}>
                <div className={styles.header}>
                    <h3 className={styles.title}>Fear & Greed Index</h3>
                </div>
                <div className={styles.loadingState}>
                    <div className={styles.spinner}></div>
                    <span>Loading sentiment...</span>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className={styles.widget}>
                <div className={styles.header}>
                    <h3 className={styles.title}>Fear & Greed Index</h3>
                    <button onClick={fetchFearGreedIndex} className={styles.refreshBtn}>
                        <RefreshCw size={14} />
                    </button>
                </div>
                <div className={styles.errorState}>
                    <span>{error || 'No data available'}</span>
                </div>
            </div>
        );
    }

    const sentiment = getSentiment(data.value);
    const SentimentIcon = sentiment.icon;
    const rotation = (data.value / 100) * 180 - 90; // -90 to 90 degrees

    return (
        <div className={styles.widget}>
            <div className={styles.header}>
                <h3 className={styles.title}>Fear & Greed Index</h3>
                <button onClick={fetchFearGreedIndex} className={styles.refreshBtn} title="Refresh">
                    <RefreshCw size={14} />
                </button>
            </div>

            <div className={styles.gaugeContainer}>
                {/* Gauge Background */}
                <div className={styles.gauge}>
                    <div className={styles.gaugeTrack}></div>
                    <div
                        className={styles.gaugeNeedle}
                        style={{
                            transform: `rotate(${rotation}deg)`,
                            '--needle-color': sentiment.color
                        }}
                    ></div>
                    <div className={styles.gaugeCenter}>
                        <span
                            className={styles.gaugeValue}
                            style={{ color: sentiment.color }}
                        >
                            {data.value}
                        </span>
                    </div>
                </div>

                {/* Gauge Labels */}
                <div className={styles.gaugeLabels}>
                    <span className={styles.labelFear}>Fear</span>
                    <span className={styles.labelGreed}>Greed</span>
                </div>
            </div>

            <div className={styles.sentimentInfo}>
                <div
                    className={styles.sentimentBadge}
                    style={{
                        backgroundColor: `${sentiment.color}20`,
                        color: sentiment.color,
                        borderColor: sentiment.color
                    }}
                >
                    <SentimentIcon size={14} />
                    <span>{sentiment.label}</span>
                </div>
                <span className={styles.timestamp}>
                    Updated: {data.timestamp.toLocaleDateString()}
                </span>
            </div>
        </div>
    );
};

export default FearGreedWidget;
