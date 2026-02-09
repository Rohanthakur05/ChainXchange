import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import Badge from '../components/ui/Badge/Badge';
import HistoryFilters from '../components/history/HistoryFilters';
import ExportButton from '../components/ui/ExportButton';
import useHistoryFilters from '../hooks/useHistoryFilters';
import { exportToCSV, HISTORY_COLUMNS } from '../utils/exportUtils';
import styles from './History.module.css';

const History = () => {
    const [data, setData] = useState({ transactions: [] });
    const [loading, setLoading] = useState(true);

    // Use filter hook for client-side filtering
    const {
        filters,
        setFilters,
        clearFilters,
        filteredData,
        hasActiveFilters,
        uniqueCoins
    } = useHistoryFilters(data.transactions);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await api.get('/crypto/history');
                setData(response.data);
            } catch (err) {
                console.error("Error fetching history", err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    if (loading) return <div style={{ padding: '2rem' }}>Loading history...</div>;

    return (
        <div className={styles.historyContainer}>
            <div className={styles.header}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', color: '#fff' }}>Transaction History</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Review your trading activity</p>
                </div>
                <ExportButton
                    onExport={() => {
                        const timestamp = new Date().toISOString().split('T')[0];
                        exportToCSV(filteredData, HISTORY_COLUMNS, `trade_history_${timestamp}`);
                    }}
                    disabled={filteredData.length === 0}
                    label="Export CSV"
                />
            </div>

            {/* Filters */}
            <HistoryFilters
                filters={filters}
                onFilterChange={setFilters}
                onClear={clearFilters}
                coins={uniqueCoins}
                hasActiveFilters={hasActiveFilters}
            />

            {/* Results count when filtering */}
            {hasActiveFilters && (
                <div className={styles.resultsCount}>
                    Showing {filteredData.length} of {data.transactions.length} transactions
                </div>
            )}

            {filteredData.length === 0 ? (
                <div style={{ marginTop: '1rem', padding: '2rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                    {hasActiveFilters
                        ? 'No transactions match your filters.'
                        : 'No transactions found.'}
                </div>
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Asset</th>
                                <th>Date</th>
                                <th>Quantity</th>
                                <th>Price</th>
                                <th>Total Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((tx) => (
                                <tr key={tx._id}>
                                    <td>
                                        <Badge variant={tx.type === 'buy' ? 'success' : 'danger'}>
                                            {tx.type.toUpperCase()}
                                        </Badge>
                                    </td>
                                    <td>
                                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {tx.coinName}
                                        </span>
                                        <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                            {tx.coinId.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className={styles.date}>
                                        {new Date(tx.timestamp).toLocaleString(undefined, {
                                            year: 'numeric', month: 'short', day: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </td>
                                    <td>{tx.quantity}</td>
                                    <td>${tx.price.toLocaleString()}</td>
                                    <td className={styles.total}>
                                        ${(tx.totalCost || tx.sellValue || (tx.quantity * tx.price)).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default History;
