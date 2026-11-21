import React from 'react';
import { useNavigate } from 'react-router-dom';
import FormattedProductName from '../../../../shared/components/FormattedProductName';

export default function TopSellingTable({ topProducts = [], timeRange = 'Today' }) {
    const navigate = useNavigate();
    const isEmpty = !topProducts || topProducts.length === 0;

    return (
        <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: 24,
            boxSizing: 'border-box'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    Top selling products
                </h3>
                <button
                    type="button"
                    onClick={() => navigate('/reports')}
                    style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: 'var(--primary, #3B82F6)',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        textDecoration: 'none'
                    }}
                >
                    View full reports
                </button>
            </div>

            {isEmpty ? (
                <div style={{
                    padding: '48px 16px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: 13,
                    fontWeight: 500
                }}>
                    No top sellers yet {timeRange.toLowerCase()}.
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--table-header-bg)' }}>
                                <th style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, padding: '10px 14px', textTransform: 'none' }}>Rank</th>
                                <th style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, padding: '10px 14px', textTransform: 'none' }}>Product</th>
                                <th style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, padding: '10px 14px', textTransform: 'none' }}>Part number</th>
                                <th style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, padding: '10px 14px', textTransform: 'none' }}>Category</th>
                                <th style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, padding: '10px 14px', textAlign: 'right', textTransform: 'none' }}>Qty sold</th>
                                <th style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, padding: '10px 14px', textAlign: 'right', textTransform: 'none' }}>Revenue</th>
                                <th style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, padding: '10px 14px', textAlign: 'right', textTransform: 'none' }}>Sales performance</th>
                            </tr>
                        </thead>
                        <tbody style={{ fontSize: 13 }}>
                            {topProducts.map((p) => (
                                <tr key={p.rank} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                                        #{p.rank}
                                    </td>
                                    <td style={{ padding: '12px 14px', color: 'var(--text-primary)', fontWeight: 500 }}>
                                        <FormattedProductName name={p.name} blockVariant={true} />
                                    </td>
                                    <td style={{ padding: '12px 14px', color: 'var(--text-primary)', fontWeight: 600, fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}>
                                        {p.partNo || '—'}
                                    </td>
                                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                        {p.category}
                                    </td>
                                    <td style={{ padding: '12px 14px', color: 'var(--text-primary)', fontWeight: 600, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                        {p.unitsSold} <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{p.uom ? p.uom.replace(/^.*\/\s*/, '') : 'PCS'}</span>
                                    </td>
                                    <td style={{ padding: '12px 14px', color: 'var(--text-primary)', fontWeight: 600, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                        ₱{(p.revenue || 0).toLocaleString()}
                                    </td>
                                    <td style={{ padding: '12px 14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 180, marginLeft: 'auto' }}>
                                            <div style={{ flex: 1, height: 5, backgroundColor: 'var(--border)', borderRadius: 9999, overflow: 'hidden' }}>
                                                <div style={{ width: `${p.percentage}%`, height: '100%', backgroundColor: 'var(--primary, #3B82F6)', borderRadius: 9999, transition: 'width 0.3s ease' }} />
                                            </div>
                                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', minWidth: '32px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                                {p.percentage}%
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
