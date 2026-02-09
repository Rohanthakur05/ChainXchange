import React from 'react';
import { Download } from 'lucide-react';
import Button from '../Button/Button';
import styles from './ExportButton.module.css';

/**
 * ExportButton - Reusable export button with CSV download functionality
 * 
 * @param {Function} onExport - Export handler function
 * @param {boolean} disabled - Disable state
 * @param {string} label - Button label
 * @param {string} variant - Button variant (secondary by default)
 */
const ExportButton = ({
    onExport,
    disabled = false,
    label = 'Export CSV',
    variant = 'secondary'
}) => {
    return (
        <Button
            variant={variant}
            size="sm"
            onClick={onExport}
            disabled={disabled}
            className={styles.exportBtn}
        >
            <Download size={14} />
            <span>{label}</span>
        </Button>
    );
};

export default ExportButton;
