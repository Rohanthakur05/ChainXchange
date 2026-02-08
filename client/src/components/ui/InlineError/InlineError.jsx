import React from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { getErrorMessage, ErrorCode } from '../../../utils/errors';
import styles from './InlineError.module.css';

/**
 * InlineError - Displays contextual error messages inline with forms
 * 
 * Usage:
 * <InlineError code={ErrorCode.TRADE_INSUFFICIENT_BALANCE} />
 * <InlineError error={errorObject} />
 * <InlineError message="Custom error message" severity="warning" />
 */
const InlineError = ({
    code,           // Error code from ErrorCode enum
    error,          // Parsed error object
    message,        // Direct message (bypasses code)
    title,          // Direct title
    suggestion,     // Direct suggestion
    severity = 'error', // 'error' | 'warning' | 'info'
    compact = false,    // Compact mode for tight spaces
    className = '',
}) => {
    // Determine the error info to display
    let displayInfo = { title: '', message: '', suggestion: '', severity };

    if (code) {
        displayInfo = { ...getErrorMessage(code), severity };
    } else if (error?.parsed) {
        displayInfo = error.parsed;
    } else if (error?.userMessage) {
        displayInfo = {
            title: error.userTitle || 'Error',
            message: error.userMessage,
            suggestion: error.suggestion || '',
            severity: error.severity || 'error',
        };
    } else if (message) {
        displayInfo = { title, message, suggestion, severity };
    } else {
        return null; // No error to display
    }

    const getIcon = () => {
        const iconProps = { size: 18, className: styles.icon };
        switch (displayInfo.severity) {
            case 'warning': return <AlertTriangle {...iconProps} />;
            case 'info': return <Info {...iconProps} />;
            default: return <AlertCircle {...iconProps} />;
        }
    };

    return (
        <div
            className={`
                ${styles.inlineError} 
                ${styles[displayInfo.severity]} 
                ${compact ? styles.compact : ''} 
                ${className}
            `}
            role="alert"
            aria-live="polite"
        >
            {getIcon()}
            <div className={styles.content}>
                {displayInfo.title && !compact && (
                    <div className={styles.title}>{displayInfo.title}</div>
                )}
                <div className={styles.message}>{displayInfo.message}</div>
                {displayInfo.suggestion && !compact && (
                    <div className={styles.suggestion}>{displayInfo.suggestion}</div>
                )}
            </div>
        </div>
    );
};

export default InlineError;
