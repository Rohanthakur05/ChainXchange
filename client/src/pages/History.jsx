import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import Badge from '../components/ui/Badge/Badge';
import styles from './History.module.css';

const History = () => {
    const [data, setData] = useState({ transactions: [] });
    const [loading, setLoading] = useState(true);

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
            <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', color: '#fff' }}>Transaction History</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Review your trading activity</p>

            {data.transactions.length === 0 ? (
                <div style={{ marginTop: '2rem', padding: '2rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                    No transactions found.
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
                            {data.transactions.map((tx) => (
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
