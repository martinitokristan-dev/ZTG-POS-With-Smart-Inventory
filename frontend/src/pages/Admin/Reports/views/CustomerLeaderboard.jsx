import React from 'react';

export default function CustomerLeaderboard({ customerLog, fmt, fmtDate }) {
    if (!customerLog || customerLog.length === 0) return null;

    return (
        <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>Customer Leaderboard</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Highest total purchase value</p>
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'var(--table-header-bg)', fontSize: '13px', color: 'var(--table-text-secondary)', borderBottom: '2px solid var(--table-border)' }}>
                        <tr>
                            <th style={{ padding: '12px 20px', fontWeight: '600', letterSpacing: '0.02em' }}>Rank</th>
                            <th style={{ padding: '12px 20px', fontWeight: '600', letterSpacing: '0.02em' }}>Customer</th>
                            <th style={{ padding: '12px 20px', fontWeight: '600', letterSpacing: '0.02em', textAlign: 'right' }}>Total Transactions</th>
                            <th style={{ padding: '12px 20px', fontWeight: '600', letterSpacing: '0.02em' }}>Last Purchase</th>
                            <th style={{ padding: '12px 20px', fontWeight: '600', letterSpacing: '0.02em', textAlign: 'right' }}>Lifetime Value</th>
                        </tr>
                    </thead>
                    <tbody style={{ fontSize: '15px' }}>
                        {customerLog.slice(0, 10).map((c, i) => (
                            <tr key={c.customer_id} style={{ borderBottom: i === Math.min(customerLog.length, 10) - 1 ? 'none' : '1px solid var(--table-border-subtle)', minHeight: '48px' }}>
                                <td style={{ padding: '12px 20px', fontWeight: '600', color: i < 3 ? 'var(--primary)' : 'var(--table-text-secondary)', fontVariantNumeric: 'tabular-nums', fontSize: '15px' }}>
                                    #{i + 1}
                                </td>
                                <td style={{ padding: '12px 20px' }}>
                                    <div style={{ fontWeight: '600', color: 'var(--table-text-primary)', fontSize: '15px' }}>{c.name}</div>
                                    <div style={{ fontSize: '13px', color: 'var(--table-text-secondary)', fontWeight: '500', fontVariantNumeric: 'tabular-nums' }}>{c.phone || 'No phone'}</div>
                                </td>
                                <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: '600', fontSize: '15px', fontVariantNumeric: 'tabular-nums' }}>{c.tx_count}</td>
                                <td style={{ padding: '12px 20px', color: 'var(--table-text-secondary)', fontWeight: '500', fontSize: '15px' }}>{fmtDate(c.last_transaction)}</td>
                                <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: '600', color: 'var(--primary)', fontSize: '15px', fontVariantNumeric: 'tabular-nums' }}>{fmt(c.total_spent)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
