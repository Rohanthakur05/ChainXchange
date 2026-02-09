import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, Info, CheckCircle, AlertTriangle, AlertCircle, Bell } from 'lucide-react';
import styles from './Toast.module.css';

// Toast Context
const ToastContext = createContext(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
};

// Toast Item Component
const ToastItem = ({ id, type = 'info', message, description, onClose }) => {
    const [exiting, setExiting] = useState(false);

    const handleClose = useCallback(() => {
        setExiting(true);
        setTimeout(() => onClose(id), 150);
    }, [id, onClose]);

    // Auto-dismiss (longer for alerts)
    React.useEffect(() => {
        const duration = type === 'alert' ? 5000 : 3000;
        const timer = setTimeout(handleClose, duration);
        return () => clearTimeout(timer);
    }, [handleClose, type]);

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle size={20} />;
            case 'warning': return <AlertTriangle size={20} />;
            case 'error': return <AlertCircle size={20} />;
            case 'alert': return <Bell size={20} />;
            default: return <Info size={20} />;
        }
    };

    return (
        <div className={`${styles.toast} ${styles[type]} ${exiting ? styles.exiting : ''}`}>
            <span className={styles.icon}>{getIcon()}</span>
            <div className={styles.content}>
                <div className={styles.message}>{message}</div>
                {description && <div className={styles.description}>{description}</div>}
            </div>
            <button className={styles.closeBtn} onClick={handleClose} aria-label="Close">
                <X size={16} />
            </button>
        </div>
    );
};

// Toast Provider with Container
export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((toast) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, ...toast }]);
        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // Convenience methods
    const toast = {
        info: (message, description) => addToast({ type: 'info', message, description }),
        success: (message, description) => addToast({ type: 'success', message, description }),
        warning: (message, description) => addToast({ type: 'warning', message, description }),
        error: (message, description) => addToast({ type: 'error', message, description }),
        alert: (message, description) => addToast({ type: 'alert', message, description }),
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className={styles.toastContainer}>
                {toasts.map(t => (
                    <ToastItem
                        key={t.id}
                        {...t}
                        onClose={removeToast}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export default ToastProvider;
