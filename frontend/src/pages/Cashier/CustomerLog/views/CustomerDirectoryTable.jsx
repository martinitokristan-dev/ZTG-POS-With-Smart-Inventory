import React from 'react';
import LoadingSpinner from '../../../../shared/components/LoadingSpinner';

export default function CustomerDirectoryTable({ loading, customers, fmtDate }) {
    if (loading) return <LoadingSpinner text="Loading customer directory..." minHeight="200px" />;

    if (customers.length === 0) {
        return (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748B' }}>
                No customers found matching the search criteria.
            </div>
        );
    }

    return (
        <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ borderBottom: '2px solid var(--table-border)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', background: 'var(--table-header-bg)' }}>
                    <tr>
                        <th style={{ padding: '12px 24px', fontWeight: '600' }}>Full Name</th>
                        <th style={{ padding: '12px 24px', fontWeight: '600' }}>Contact Number</th>
                        <th style={{ padding: '12px 24px', fontWeight: '600', textAlign: 'right' }}>Total Purchases</th>
                        <th style={{ padding: '12px 24px', fontWeight: '600' }}>First Purchase Date</th>
                        <th style={{ padding: '12px 24px', fontWeight: '600' }}>Last Purchase Date</th>
                    </tr>
                </thead>
                <tbody style={{ fontSize: '15px', color: 'var(--table-text-primary)' }}>
                    {customers.map((c, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--table-border-subtle)', minHeight: '48px' }}>
                            <td style={{ padding: '12px 24px', fontWeight: '600', color: 'var(--table-text-primary)', fontSize: '15px' }}>{c.name}</td>
                            <td style={{ padding: '12px 24px', color: 'var(--table-text-secondary)', fontWeight: '600', fontSize: '15px', fontVariantNumeric: 'tabular-nums' }}>{c.contact || c.contact_number || 'N/A'}</td>
                            <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                                <span style={{ 
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    whiteSpace: 'nowrap',
                                    background: 'var(--primary)', 
                                    color: 'white', 
                                    padding: '5px 12px', 
                                    borderRadius: '20px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    lineHeight: '1.2',
                                    fontVariantNumeric: 'tabular-nums'
                                }}>
                                    {(c.tx_count !== undefined ? c.tx_count : (c.total_purchases || c.totalPurchases || 0))} items
                                </span>
                            </td>
                            <td style={{ padding: '12px 24px', color: 'var(--table-text-secondary)', fontWeight: '500', fontSize: '15px' }}>{fmtDate(c.first_purchase_date || c.firstDate)}</td>
                            <td style={{ padding: '12px 24px', color: 'var(--table-text-secondary)', fontWeight: '500', fontSize: '15px' }}>{fmtDate(c.last_purchase_date || c.lastDate || c.last_transaction)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
