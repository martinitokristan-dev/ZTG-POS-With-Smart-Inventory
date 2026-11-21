import React from 'react';

export default function StatCards({ stats = {}, currentTimeRange = 'Today', criticalItems = [] }) {
    const revenueLabel = currentTimeRange === 'Today' ? "Today's Revenue" : `${currentTimeRange}'s Revenue`;
    const criticalCount = criticalItems.length;
    const outOfStockCount = criticalItems.filter(i => i.isOut).length;

    return (
        <>
            <style>
                {`
                .stat-strip {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    background-color: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 16px;
                    padding: 24px 0;
                    box-sizing: border-box;
                }
                .stat-strip-col {
                    padding: 0 24px;
                    border-right: 1px solid var(--border);
                    display: flex;
                    flex-direction: column;
                    min-width: 0;
                }
                .stat-strip-col:last-child {
                    border-right: none;
                }
                @media (max-width: 1024px) {
                    .stat-strip {
                        grid-template-columns: repeat(2, 1fr);
                        padding: 20px 0;
                        row-gap: 20px;
                    }
                    .stat-strip-col:nth-child(2) {
                        border-right: none;
                    }
                    .stat-strip-col:nth-child(3),
                    .stat-strip-col:nth-child(4) {
                        border-top: 1px solid var(--border);
                        padding-top: 20px;
                    }
                    .stat-strip-col:nth-child(4) {
                        border-right: none;
                    }
                }
                @media (max-width: 640px) {
                    .stat-strip {
                        grid-template-columns: 1fr;
                        padding: 16px 0;
                        row-gap: 16px;
                    }
                    .stat-strip-col {
                        border-right: none !important;
                        border-top: 1px solid var(--border);
                        padding: 16px 20px 0 20px;
                    }
                    .stat-strip-col:first-child {
                        border-top: none;
                        padding-top: 0;
                    }
                }
                `}
            </style>

            <div className="stat-strip">
                {/* 1. Revenue */}
                <div className="stat-strip-col">
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {revenueLabel}
                    </span>
                    <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginTop: 8, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
                        ₱{(stats.todayRevenue || 0).toLocaleString()}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginTop: 8 }}>
                        Real-time sales total
                    </span>
                </div>

                {/* 2. Needs restocking */}
                <div className="stat-strip-col">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--danger, #EF4444)', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Needs restocking
                        </span>
                    </div>
                    <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginTop: 8, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
                        {criticalCount.toLocaleString()} {criticalCount === 1 ? 'item' : 'items'}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginTop: 8 }}>
                        {outOfStockCount} out of stock
                    </span>
                </div>

                {/* 3. Total stock */}
                <div className="stat-strip-col">
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Total stock
                    </span>
                    <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginTop: 8, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
                        {(stats.totalStock || 0).toLocaleString()}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginTop: 8 }}>
                        Units on hand
                    </span>
                </div>

                {/* 4. Products */}
                <div className="stat-strip-col">
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Products
                    </span>
                    <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginTop: 8, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
                        {(stats.productCount || 0).toLocaleString()}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginTop: 8 }}>
                        {(stats.variantCount || 0).toLocaleString()} variants
                    </span>
                </div>
            </div>
        </>
    );
}
