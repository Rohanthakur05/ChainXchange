import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Logo.module.css';

/**
 * Reusable ChainXchange Logo Component
 * 
 * @param {boolean} showText - Whether to show the text "ChainXchange" (default: true)
 * @param {string} size - Size preset: 'sm', 'md' (default), 'lg', 'xl'
 * @param {boolean} linkToHome - Whether the logo should be a clickable link to '/'
 * @param {string} className - Optional additional CSS class
 */
const Logo = ({
    showText = true,
    size = 'md',
    linkToHome = true,
    className = ''
}) => {
    // Generate the internal content
    const content = (
        <>
            <div className={`${styles.iconWrapper} ${styles[size]}`}>
                <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                    className={styles.svgIcon}
                >
                    {/* C — open arc */}
                    <path
                        d="M12 6.5 A6 6 0 1 0 12 17.5"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        fill="none"
                    />
                    {/* X — two diagonals */}
                    <line x1="14.5" y1="7" x2="21.5" y2="17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                    <line x1="21.5" y1="7" x2="14.5" y2="17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
            </div>

            {showText && (
                <div className={`${styles.wordmark} ${styles[`text-${size}`]}`}>
                    <span className={styles.textWhite}>Chain</span>
                    <span className={styles.textAccent}>Xchange</span>
                </div>
            )}
        </>
    );

    const containerClass = `${styles.logoContainer} ${className}`;

    if (linkToHome) {
        return (
            <Link to="/" className={containerClass}>
                {content}
            </Link>
        );
    }

    return (
        <div className={containerClass}>
            {content}
        </div>
    );
};

export default Logo;
