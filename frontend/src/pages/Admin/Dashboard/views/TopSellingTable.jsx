import React from 'react';
import { useNavigate } from 'react-router-dom';
import FormattedProductName from '../../../../shared/components/FormattedProductName';

export default function TopSellingTable({ topProducts }) {
    const navigate = useNavigate();

    return (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 24, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Top Selling Products</h3>
                <button
                    onClick={() => navigate('/reports')}
                    style={{ padding: '6px 16px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#64748B', backgroundColor: '#FFFFFF', cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                >
                    View Full Reports
                </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--table-border)', background: 'var(--table-header-bg)' }}>
                            <th style={{ fontSize: 13, letterSpacing: '0.02em', color: 'var(--table-text-secondary)', fontWeight: 600, padding: '12px 16px', textAlign: 'left' }}>Rank</th>
                            <th style={{ fontSize: 13, letterSpacing: '0.02em', color: 'var(--table-text-secondary)', fontWeight: 600, padding: '12px 16px', textAlign: 'left' }}>Product</th>
                            <th style={{ fontSize: 13, letterSpacing: '0.02em', color: 'var(--table-text-secondary)', fontWeight: 600, padding: '12px 16px', textAlign: 'left' }}>Part Number</th>
                            <th style={{ fontSize: 13, letterSpacing: '0.02em', color: 'var(--table-text-secondary)', fontWeight: 600, padding: '12px 16px', textAlign: 'left' }}>Category</th>
                            <th style={{ fontSize: 13, letterSpacing: '0.02em', color: 'var(--table-text-secondary)', fontWeight: 600, padding: '12px 16px', textAlign: 'right' }}>Units Sold</th>
                            <th style={{ fontSize: 13, letterSpacing: '0.02em', color: 'var(--table-text-secondary)', fontWeight: 600, padding: '12px 16px', textAlign: 'right' }}>Revenue</th>
                            <th style={{ fontSize: 13, letterSpacing: '0.02em', color: 'var(--table-text-secondary)', fontWeight: 600, padding: '12px 16px', textAlign: 'right' }}>Sales Performance</th>
                        </tr>
                    </thead>
                    <tbody style={{ fontSize: 15 }}>
                        {topProducts.map((p) => (
                            <tr key={p.rank} style={{ borderBottom: '1px solid var(--table-border-subtle)', minHeight: '48px' }}>
                                <td style={{ padding: '12px 16px', fontSize: 15, fontWeight: 600, color: 'var(--table-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>#{p.rank}</td>
                                <td style={{ padding: '12px 16px', fontSize: 15, color: 'var(--table-text-primary)' }}>
                                    <FormattedProductName name={p.name} />
                                </td>
                                <td style={{ padding: '12px 16px', fontSize: 15, color: 'var(--table-text-primary)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{p.partNo}</td>
                                <td style={{ padding: '12px 16px', fontSize: 15, color: 'var(--table-text-secondary)', fontWeight: 500 }}>{p.category}</td>
                                <td style={{ padding: '12px 16px', fontSize: 15, color: 'var(--table-text-primary)', fontWeight: 600, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{p.unitsSold}</td>
                                <td style={{ padding: '12px 16px', fontSize: 15, color: 'var(--table-text-primary)', fontWeight: 600, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>₱{p.revenue.toLocaleString()}</td>
                                <td style={{ padding: '12px 16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 200, marginLeft: 'auto' }}>
                                        <div style={{ flex: 1, height: 6, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                                            <div style={{ width: `${p.percentage}%`, height: '100%', backgroundColor: '#3B82F6', borderRadius: 4, transition: 'width 0.4s ease' }} />
                                        </div>
                                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--table-text-secondary)', minWidth: '36px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                            {p.percentage}%
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
