import React from 'react';
import TopCategoriesCard from './TopCategoriesCard';

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
    const cardStyle = {
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 24,
        boxShadow: 'var(--shadow-sm)',
        boxSizing: 'border-box',
        minWidth: 0,
    };

    const labelStyle = {
        fontSize: 12,
        fontWeight: 700,
        color: 'var(--text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    };

    const valueStyle = {
        fontSize: 32,
        fontWeight: 700,
        color: 'var(--text-primary)',
        marginTop: 8,
    };

    return (
        <div className="stat-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
            {/* Card 1: Total Stock */}
            <div style={cardStyle}>
                <div style={labelStyle}>Total Stock</div>
                <div style={valueStyle}>{(stats.totalStock || 0).toLocaleString()}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#10B981', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TrendingUpIcon color="#10B981" size={15} />
                    Total stock units
                </div>
            </div>

            {/* Card 2: Revenue */}
            <div style={cardStyle}>
                <div style={labelStyle}>
                    {currentTimeRange === 'Today' ? "Today's Revenue" : `${currentTimeRange}'s Revenue`}
                </div>
                <div style={valueStyle}>₱{(stats.todayRevenue || 0).toLocaleString()}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#10B981', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TrendingUpIcon color="#10B981" size={15} />
                    Real-time sales total
                </div>
            </div>

            {/* Card 3: Products & Variants */}
            <div style={cardStyle}>
                <div style={labelStyle}>Total Products</div>
                <div style={valueStyle}>{(stats.productCount || 0).toLocaleString()}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#3B82F6', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TrendingUpIcon color="#3B82F6" size={15} />
                    {(stats.variantCount || 0).toLocaleString()} Total Variants
                </div>
            </div>

            {/* Card 4: Top Categories */}
            <TopCategoriesCard topCategories={stats.topCategories || []} />
        </div>
    );
}
