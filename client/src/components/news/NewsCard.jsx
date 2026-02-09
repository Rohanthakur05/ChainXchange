import React from 'react';
import { ExternalLink, Clock } from 'lucide-react';
import { formatTimeAgo } from '../../services/newsService';
import styles from './NewsCard.module.css';

/**
 * NewsCard - Individual news article card
 */
const NewsCard = ({ article }) => {
    const { title, source, publishedAt, url, imageUrl, body } = article;

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.card}
        >
            {imageUrl && (
                <div className={styles.imageWrapper}>
                    <img
                        src={imageUrl}
                        alt=""
                        className={styles.image}
                        loading="lazy"
                        onError={(e) => e.target.style.display = 'none'}
                    />
                </div>
            )}
            <div className={styles.content}>
                <h3 className={styles.title}>{title}</h3>
                {body && <p className={styles.body}>{body}</p>}
                <div className={styles.meta}>
                    <span className={styles.source}>{source}</span>
                    <span className={styles.dot}>•</span>
                    <span className={styles.time}>
                        <Clock size={12} />
                        {formatTimeAgo(new Date(publishedAt))}
                    </span>
                    <ExternalLink size={14} className={styles.linkIcon} />
                </div>
            </div>
        </a>
    );
};

export default NewsCard;
