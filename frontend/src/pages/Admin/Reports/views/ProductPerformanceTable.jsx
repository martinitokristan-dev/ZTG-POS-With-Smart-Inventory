import React from 'react';
import FormattedProductName from '../../../../shared/components/FormattedProductName';

export default function ProductPerformanceTable({ productPerformance, fmt }) {
    if (!productPerformance) return null;

    const { top_sellers = [], revenue_per_product = [], dead_stock = [] } = productPerformance;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
            
            {/* Fast Moving / Top Sellers */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>Top Selling Products</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Highest unit sales volume</p>
                </div>
                <div style={{ padding: '0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: '#F8FAFC', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                            <tr>
                                <th style={{ padding: '12px 20px', fontWeight: '600' }}>Product</th>
                                <th style={{ padding: '12px 20px', fontWeight: '600', textAlign: 'right' }}>Units Sold</th>
                                <th style={{ padding: '12px 20px', fontWeight: '600', textAlign: 'right' }}>Current Stock</th>
                            </tr>
                        </thead>
                        <tbody style={{ fontSize: '13px' }}>
                            {top_sellers.length === 0 ? (
                                <tr><td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#64748B' }}>No sales data available</td></tr>
                            ) : top_sellers.map((p, i) => (
                                <tr key={p.id} style={{ borderBottom: i === top_sellers.length - 1 ? 'none' : '1px solid var(--border)' }}>
                                    <td style={{ padding: '12px 20px' }}>
                                        <div style={{ color: 'var(--text-primary)' }}><FormattedProductName name={p.name} /></div>
                                        {p.chinese_name && <div style={{ fontSize: '11px', color: '#94A3B8' }}>{p.chinese_name}</div>}
                                        <div style={{ fontSize: '11px', color: '#64748B' }}>{p.part_no}</div>
                                    </td>
                                    <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: '700', color: '#10B981' }}>{p.sales_count}</td>
                                    <td style={{ padding: '12px 20px', textAlign: 'right' }}>{p.stock}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Top Revenue Generators */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>Top Revenue Generators</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Highest gross revenue</p>
                </div>
                <div style={{ padding: '0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: '#F8FAFC', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                            <tr>
                                <th style={{ padding: '12px 20px', fontWeight: '600' }}>Product</th>
                                <th style={{ padding: '12px 20px', fontWeight: '600', textAlign: 'right' }}>Revenue Generated</th>
                            </tr>
                        </thead>
                        <tbody style={{ fontSize: '13px' }}>
                            {revenue_per_product.length === 0 ? (
                                <tr><td colSpan="2" style={{ padding: '20px', textAlign: 'center', color: '#64748B' }}>No revenue data available</td></tr>
                            ) : revenue_per_product.slice(0, 10).map((p, i) => (
                                <tr key={p.product_id} style={{ borderBottom: i === Math.min(revenue_per_product.length, 10) - 1 ? 'none' : '1px solid var(--border)' }}>
                                    <td style={{ padding: '12px 20px' }}>
                                        <div style={{ color: 'var(--text-primary)' }}><FormattedProductName name={p.name} /></div>
                                        {p.chinese_name && <div style={{ fontSize: '11px', color: '#94A3B8' }}>{p.chinese_name}</div>}
                                        <div style={{ fontSize: '11px', color: '#64748B' }}>{p.part_no}</div>
                                    </td>
                                    <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: '700', color: 'var(--primary)' }}>{fmt(p.revenue)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Dead Stock */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gridColumn: '1 / -1' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', background: '#FEF2F2' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: '#DC2626' }}>Dead Stock Alert</h3>
                    <p style={{ fontSize: '12px', color: '#B91C1C', margin: '4px 0 0 0' }}>Items with 0 sales in the last 30 days</p>
                </div>
                <div style={{ padding: '0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: '#F8FAFC', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                            <tr>
                                <th style={{ padding: '12px 20px', fontWeight: '600' }}>Product</th>
                                <th style={{ padding: '12px 20px', fontWeight: '600', textAlign: 'right' }}>Stock Stagnating</th>
                            </tr>
                        </thead>
                        <tbody style={{ fontSize: '13px' }}>
                            {dead_stock.length === 0 ? (
                                <tr><td colSpan="2" style={{ padding: '20px', textAlign: 'center', color: '#64748B' }}>No dead stock detected!</td></tr>
                            ) : dead_stock.slice(0, 5).map((p, i) => (
                                <tr key={p.id} style={{ borderBottom: i === Math.min(dead_stock.length, 5) - 1 ? 'none' : '1px solid var(--border)' }}>
                                    <td style={{ padding: '12px 20px' }}>
                                        <div style={{ color: 'var(--text-primary)' }}><FormattedProductName name={p.name} /></div>
                                        {p.chinese_name && <div style={{ fontSize: '11px', color: '#94A3B8' }}>{p.chinese_name}</div>}
                                        <div style={{ fontSize: '11px', color: '#64748B' }}>{p.part_no}</div>
                                    </td>
                                    <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: '700', color: '#DC2626' }}>{p.stock} units</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}
