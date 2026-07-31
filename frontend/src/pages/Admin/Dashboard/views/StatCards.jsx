import React from 'react';
import FormattedProductName from '../../../../shared/components/FormattedProductName';

// Trending-up icon: zigzag line with arrowhead (like a stock chart going up)
function TrendingUpIcon({ color = '#10B981', size = 16 }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0 }}
        >
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
        </svg>
    );
}

export default function StatCards({ stats, currentTimeRange = 'Today' }) {
    return (
        <div className="stat-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
            {/* Card 1: Total Stock */}
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 24, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', boxSizing: 'border-box', minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Stock</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#0F172A', marginTop: 8 }}>{(stats.totalStock || 0).toLocaleString()}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#10B981', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TrendingUpIcon color="#10B981" size={15} />
                    Total stock units
                </div>
            </div>

            {/* Card 2: Revenue */}
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 24, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', boxSizing: 'border-box', minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {currentTimeRange === 'Today' ? "Today's Revenue" : `${currentTimeRange}'s Revenue`}
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#0F172A', marginTop: 8 }}>₱{(stats.todayRevenue || 0).toLocaleString()}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#10B981', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TrendingUpIcon color="#10B981" size={15} />
                    Real-time sales total
                </div>
            </div>

            {/* Card 3: Products & Variants */}
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 24, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', boxSizing: 'border-box', minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Products</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#0F172A', marginTop: 8 }}>{(stats.productCount || 0).toLocaleString()}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#3B82F6', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TrendingUpIcon color="#3B82F6" size={15} />
                    {(stats.variantCount || 0).toLocaleString()} Total Variants
                </div>
            </div>

            {/* Card 4: Top Product */}
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 24, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', boxSizing: 'border-box', minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Top Product</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginTop: 8 }}>
                    <FormattedProductName name={stats.topProduct?.name} blockVariant={true} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#10B981', marginTop: 8 }}>
                    {stats.topProduct?.qty || 0} units sold
                </div>
            </div>
        </div>
    );
}
