/**
 * Export utilities for portfolio and trade history data
 */

/**
 * Generate and download CSV from array of objects
 * @param {Array} data - Data to export
 * @param {Array} columns - Column definitions [{key, label, type?}]
 * @param {string} filename - Output filename (without extension)
 */
export const exportToCSV = (data, columns, filename) => {
    if (!data || data.length === 0) {
        console.warn('No data to export');
        return;
    }

    // Header row
    const headers = columns.map(col => `"${col.label}"`).join(',');

    // Data rows
    const rows = data.map(item => {
        return columns.map(col => {
            let value = item[col.key];

            // Format based on type
            if (col.type === 'date' && value) {
                value = new Date(value).toLocaleString();
            }
            if (col.type === 'currency' && typeof value === 'number') {
                value = value.toFixed(2);
            }
            if (col.type === 'percentage' && typeof value === 'number') {
                value = value.toFixed(2) + '%';
            }

            // Handle null/undefined
            if (value === null || value === undefined) {
                return '';
            }

            // Escape quotes and wrap in quotes if string
            if (typeof value === 'string') {
                return `"${value.replace(/"/g, '""')}"`;
            }

            return value;
        }).join(',');
    }).join('\n');

    const csv = `${headers}\n${rows}`;
    downloadFile(csv, `${filename}.csv`, 'text/csv');
};

/**
 * Helper to trigger file download
 */
const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Column definitions for trade history export
 */
export const HISTORY_COLUMNS = [
    { key: 'type', label: 'Type' },
    { key: 'coinName', label: 'Asset' },
    { key: 'coinId', label: 'Symbol' },
    { key: 'timestamp', label: 'Date', type: 'date' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'price', label: 'Price (USD)', type: 'currency' },
    { key: 'totalCost', label: 'Total Value', type: 'currency' },
];

/**
 * Column definitions for portfolio export
 */
export const PORTFOLIO_COLUMNS = [
    { key: 'crypto', label: 'Asset' },
    { key: 'symbol', label: 'Symbol' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'currentValue', label: 'Current Value (USD)', type: 'currency' },
    { key: 'profitLoss', label: 'Profit/Loss (USD)', type: 'currency' },
    { key: 'profitLossPercentage', label: 'Change (%)', type: 'percentage' },
];

export default { exportToCSV, HISTORY_COLUMNS, PORTFOLIO_COLUMNS };
