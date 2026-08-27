import React, { useState } from 'react';
import FormattedProductName from '../../../../shared/components/FormattedProductName';

// Clean integer Y-axis scale calculator (e.g. 50, 40, 30, 20, 10, 0 or 20, 15, 10, 5, 0)
function getCleanYAxis(maxVal) {
    if (!maxVal || maxVal <= 4) return { upperBound: 4, ticks: [4, 3, 2, 1, 0] };
    if (maxVal <= 10) return { upperBound: 10, ticks: [10, 8, 6, 4, 2, 0] };
    if (maxVal <= 20) return { upperBound: 20, ticks: [20, 15, 10, 5, 0] };
    if (maxVal <= 50) return { upperBound: 50, ticks: [50, 40, 30, 20, 10, 0] };
    if (maxVal <= 100) return { upperBound: 100, ticks: [100, 75, 50, 25, 0] };
    
    const factor = Math.pow(10, Math.floor(Math.log10(maxVal)));
    const stepMultiple = Math.ceil(maxVal / (factor * 4)) * factor;
    const upperBound = stepMultiple * 4;
    return {
        upperBound,
        ticks: [upperBound, upperBound - stepMultiple, upperBound - stepMultiple * 2, upperBound - stepMultiple * 3, 0]
    };
}

function formatCompactValue(val, isCurrency = false) {
    if (!isCurrency) return val.toLocaleString();
    if (val >= 1000000) return `₱${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `₱${(val / 1000).toFixed(0)}k`;
    return `₱${val.toLocaleString()}`;
}

export default function ProductReportCharts({ topSellers = [], deadStock = [], totals = {} }) {
    const [metricMode, setMetricMode] = useState('qty'); // 'qty' | 'revenue'
    const [hoveredSalesIdx, setHoveredSalesIdx] = useState(null);
    const [hoveredRetIdx, setHoveredRetIdx] = useState(null);
    const [hoveredCatIndex, setHoveredCatIndex] = useState(null);

    const isRevenue = metricMode === 'revenue';

    // Sort items according to active metric
    const sortedProducts = [...topSellers].sort((a, b) => {
        if (isRevenue) {
            return (b.revenue || 0) - (a.revenue || 0);
        }
        return (b.sales_count || 0) - (a.sales_count || 0);
    });

    const salesChartItems = sortedProducts.slice(0, 10);
    const totalSoldQty = topSellers.reduce((sum, p) => sum + (p.sales_count || 0), 0);
    const totalRevenue = topSellers.reduce((sum, p) => sum + (p.revenue || 0), 0);

    // Products with returns or refunds (or top items sorted by returns + refunds)
    const returnItemsRaw = [...topSellers].sort((a, b) => 
        ((b.returns_count || 0) + (b.refunds_count || 0)) - ((a.returns_count || 0) + (a.refunds_count || 0))
    );
    const returnChartItems = returnItemsRaw.slice(0, 8);
    const totalReturns = totals.returns_qty || topSellers.reduce((sum, p) => sum + (p.returns_count || 0), 0);
    const totalRefunds = totals.refunds_qty || topSellers.reduce((sum, p) => sum + (p.refunds_count || 0), 0);

    // Calculate category breakdown for Donut Chart
    const categoryMap = {};
    topSellers.forEach(p => {
        const cat = p.category || 'Uncategorized';
        categoryMap[cat] = (categoryMap[cat] || 0) + (p.sales_count || 0);
    });

    const categoryPalette = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'];
    const categoryList = Object.entries(categoryMap)
        .map(([name, count], i) => ({
            name,
            count,
            color: categoryPalette[i % categoryPalette.length],
            percentage: totalSoldQty > 0 ? (count / totalSoldQty) * 100 : 0
        }))
        .sort((a, b) => b.count - a.count);

    if (topSellers.length === 0 && deadStock.length === 0) {
        return (
            <div className="section-card" style={{ padding: '56px 24px', textAlign: 'center', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#F1F5F9', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
                        <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
                    </svg>
                </div>
                <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>No Product Sales Recorded</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>There are no sales transactions for the selected date range and category.</p>
            </div>
        );
    }

    // ── Donut Chart Parameters ──────────────────────────────────────────
    const DONUT_SIZE = 160;
    const STROKE = 22;
    const R = (DONUT_SIZE - STROKE) / 2;
    const CIRCUMFERENCE = 2 * Math.PI * R;
    const CENTER = DONUT_SIZE / 2;

    let cumulativePct = 0;
    const donutSegments = categoryList.map((cat, i) => {
        const offset = CIRCUMFERENCE - (cumulativePct / 100) * CIRCUMFERENCE;
        const dash = (cat.percentage / 100) * CIRCUMFERENCE;
        const seg = { ...cat, dashOffset: offset, dashArray: dash, index: i };
        cumulativePct += cat.percentage;
        return seg;
    });

    const activeHoveredCat = hoveredCatIndex !== null ? categoryList[hoveredCatIndex] : null;

    // ── 1. Full-Width Top Product Performance Line Geometry ─────────────
    const fullWidth = 1000;
    const fullHeight = 220;
    const fullPaddingY = 24;
    const fullStartX = 55;
    const fullEndX = fullWidth - 25;
    const fullPlotWidth = fullEndX - fullStartX;
    const fullPlotHeight = fullHeight - 2 * fullPaddingY;

    const maxVal = Math.max(
        ...salesChartItems.map(p => (isRevenue ? p.revenue : p.sales_count) || 0),
        1
    );
    const { upperBound: salesUpperBound, ticks: salesYTicks } = getCleanYAxis(maxVal);
    const salesStepX = salesChartItems.length > 1 ? fullPlotWidth / (salesChartItems.length - 1) : fullPlotWidth;

    const activeColor = isRevenue ? '#059669' : '#2563EB';

    const salesPoints = salesChartItems.map((p, i) => {
        const x = salesChartItems.length === 1 ? fullStartX + fullPlotWidth / 2 : fullStartX + i * salesStepX;
        const val = (isRevenue ? p.revenue : p.sales_count) || 0;
        const y = (fullHeight - fullPaddingY) - (val / salesUpperBound) * fullPlotHeight;
        return { x, y, p, i, val };
    });

    let salesLinePath = '';
    let salesAreaPath = '';
    if (salesPoints.length > 0) {
        salesLinePath = `M ${salesPoints[0].x} ${salesPoints[0].y}`;
        for (let i = 0; i < salesPoints.length - 1; i++) {
            const curr = salesPoints[i];
            const next = salesPoints[i + 1];
            const cpX = curr.x + (next.x - curr.x) / 2;
            salesLinePath += ` C ${cpX} ${curr.y}, ${cpX} ${next.y}, ${next.x} ${next.y}`;
        }
        salesAreaPath = `${salesLinePath} L ${salesPoints[salesPoints.length - 1].x} ${fullHeight - fullPaddingY} L ${salesPoints[0].x} ${fullHeight - fullPaddingY} Z`;
    }

    // ── 2. Half-Width Returns & Refunds Line Geometry ────────────────────
    const halfWidth = 560;
    const halfHeight = 210;
    const halfPaddingY = 24;
    const halfStartX = 40;
    const halfEndX = halfWidth - 16;
    const halfPlotWidth = halfEndX - halfStartX;
    const halfPlotHeight = halfHeight - 2 * halfPaddingY;

    const maxReturnOrRefund = Math.max(
        ...returnChartItems.map(p => Math.max(p.returns_count || 0, p.refunds_count || 0)),
        1
    );
    const { upperBound: retUpperBound, ticks: retYTicks } = getCleanYAxis(maxReturnOrRefund);
    const retStepX = returnChartItems.length > 1 ? halfPlotWidth / (returnChartItems.length - 1) : halfPlotWidth;

    const returnPoints = returnChartItems.map((p, i) => {
        const x = returnChartItems.length === 1 ? halfStartX + halfPlotWidth / 2 : halfStartX + i * retStepX;
        const yReturn = (halfHeight - halfPaddingY) - ((p.returns_count || 0) / retUpperBound) * halfPlotHeight;
        const yRefund = (halfHeight - halfPaddingY) - ((p.refunds_count || 0) / retUpperBound) * halfPlotHeight;
        return { x, yReturn, yRefund, p, i };
    });

    let returnsLinePath = '';
    let refundsLinePath = '';
    let returnsAreaPath = '';

    if (returnPoints.length > 0) {
        returnsLinePath = `M ${returnPoints[0].x} ${returnPoints[0].yReturn}`;
        refundsLinePath = `M ${returnPoints[0].x} ${returnPoints[0].yRefund}`;
        for (let i = 0; i < returnPoints.length - 1; i++) {
            const curr = returnPoints[i];
            const next = returnPoints[i + 1];
            const cpX = curr.x + (next.x - curr.x) / 2;
            returnsLinePath += ` C ${cpX} ${curr.yReturn}, ${cpX} ${next.yReturn}, ${next.x} ${next.yReturn}`;
            refundsLinePath += ` C ${cpX} ${curr.yRefund}, ${cpX} ${next.yRefund}, ${next.x} ${next.yRefund}`;
        }
        returnsAreaPath = `${returnsLinePath} L ${returnPoints[returnPoints.length - 1].x} ${halfHeight - halfPaddingY} L ${returnPoints[0].x} ${halfHeight - halfPaddingY} Z`;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* ── Row 1: Full-Width Top Product Performance with Qty / Revenue Toggle ── */}
            <div className="section-card" style={{ margin: 0, padding: '22px 24px', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                            {isRevenue ? 'Top Revenue Generating Products' : 'Top Selling Products by Movement'}
                        </h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                            {isRevenue 
                                ? 'Total sales revenue generated per top performing product' 
                                : 'Quantity sold trend curve across top moving products in selected period'}
                        </p>
                    </div>

                    {/* Metric Switcher Toggle (Qty Sold vs Revenue) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: '8px', padding: '3px', gap: '2px' }}>
                            <button
                                type="button"
                                onClick={() => setMetricMode('qty')}
                                style={{
                                    border: 'none',
                                    background: metricMode === 'qty' ? '#FFFFFF' : 'transparent',
                                    color: metricMode === 'qty' ? '#2563EB' : '#64748B',
                                    boxShadow: metricMode === 'qty' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                    borderRadius: '6px',
                                    padding: '5px 12px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                                </svg>
                                <span>Qty Sold</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setMetricMode('revenue')}
                                style={{
                                    border: 'none',
                                    background: metricMode === 'revenue' ? '#FFFFFF' : 'transparent',
                                    color: metricMode === 'revenue' ? '#059669' : '#64748B',
                                    boxShadow: metricMode === 'revenue' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                    borderRadius: '6px',
                                    padding: '5px 12px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <span style={{ fontSize: '13px', fontWeight: 800 }}>₱</span>
                                <span>Revenue</span>
                            </button>
                        </div>

                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '5px 10px', borderRadius: '6px', background: isRevenue ? '#ECFDF5' : '#EFF6FF', color: activeColor }}>
                            {isRevenue ? `₱${totalRevenue.toLocaleString()} Total Revenue` : `${totalSoldQty.toLocaleString()} Total Qty Sold`}
                        </span>
                    </div>
                </div>

                {salesChartItems.length === 0 ? (
                    <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        No product movement recorded in this period.
                    </div>
                ) : (
                    <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ position: 'relative', width: '100%', height: '220px' }}>
                            <svg
                                width="100%"
                                height="100%"
                                viewBox={`0 0 ${fullWidth} ${fullHeight}`}
                                preserveAspectRatio="none"
                                style={{ overflow: 'visible' }}
                            >
                                <defs>
                                    <linearGradient id="salesAreaGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={activeColor} stopOpacity="0.25" />
                                        <stop offset="100%" stopColor={activeColor} stopOpacity="0.00" />
                                    </linearGradient>
                                </defs>

                                {/* Y-Axis Grid Lines & Tick Labels */}
                                {salesYTicks.map((tickVal, i) => {
                                    const yPos = (fullHeight - fullPaddingY) - ((tickVal / salesUpperBound) * fullPlotHeight);
                                    const isBaseline = i === salesYTicks.length - 1;
                                    return (
                                        <g key={i}>
                                            <line
                                                x1={fullStartX}
                                                y1={yPos}
                                                x2={fullEndX}
                                                y2={yPos}
                                                stroke="var(--border, #E2E8F0)"
                                                strokeWidth="1"
                                                strokeOpacity={isBaseline ? '0.35' : '0.18'}
                                            />
                                            <text
                                                x={fullStartX - 8}
                                                y={yPos + 3}
                                                textAnchor="end"
                                                fill="#64748B"
                                                fontSize="11"
                                                fontWeight="600"
                                                fontFamily="Inter, -apple-system, BlinkMacSystemFont, sans-serif"
                                            >
                                                {formatCompactValue(tickVal, isRevenue)}
                                            </text>
                                        </g>
                                    );
                                })}

                                {/* Area Gradient Fill */}
                                {salesAreaPath && <path d={salesAreaPath} fill="url(#salesAreaGradient)" />}

                                {/* Smooth Curve Line */}
                                {salesLinePath && (
                                    <path
                                        d={salesLinePath}
                                        fill="none"
                                        stroke={activeColor}
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                )}

                                {/* Hover vertical dashed guide line */}
                                {hoveredSalesIdx !== null && salesPoints[hoveredSalesIdx] && (
                                    <line
                                        x1={salesPoints[hoveredSalesIdx].x}
                                        y1={fullPaddingY}
                                        x2={salesPoints[hoveredSalesIdx].x}
                                        y2={fullHeight - fullPaddingY}
                                        stroke={activeColor}
                                        strokeWidth="1.5"
                                        strokeDasharray="4 4"
                                    />
                                )}

                                {/* Plot Points & Column Hover Hitboxes */}
                                {salesPoints.map((pt, i) => (
                                    <g key={i}>
                                        <circle
                                            cx={pt.x}
                                            cy={pt.y}
                                            r={hoveredSalesIdx === i ? 6 : 0}
                                            fill={activeColor}
                                            stroke="#FFFFFF"
                                            strokeWidth="3"
                                            style={{ transition: 'r 0.1s ease' }}
                                        />
                                        <rect
                                            x={pt.x - salesStepX / 2}
                                            y={fullPaddingY}
                                            width={salesStepX}
                                            height={fullPlotHeight}
                                            fill="transparent"
                                            style={{ cursor: 'pointer' }}
                                            onMouseEnter={() => setHoveredSalesIdx(i)}
                                            onMouseLeave={() => setHoveredSalesIdx(null)}
                                        />
                                    </g>
                                ))}
                            </svg>

                            {/* Dashboard-Style Floating Tooltip with UOM Support */}
                            {hoveredSalesIdx !== null && salesPoints[hoveredSalesIdx] && (() => {
                                const pctX = (salesPoints[hoveredSalesIdx].x / fullWidth) * 100;
                                const alignRight = pctX > 75;
                                const prod = salesPoints[hoveredSalesIdx].p;
                                const uomLabel = prod.uom || 'pcs';

                                return (
                                    <div style={{
                                        position: 'absolute',
                                        left: `${pctX}%`,
                                        top: Math.max(10, salesPoints[hoveredSalesIdx].y - 58),
                                        backgroundColor: '#0F172A',
                                        color: '#FFFFFF',
                                        padding: '8px 14px',
                                        borderRadius: 8,
                                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.15), 0 2px 4px -1px rgba(0,0,0,0.1)',
                                        zIndex: 10,
                                        pointerEvents: 'none',
                                        fontFamily: 'Inter, sans-serif',
                                        transform: alignRight ? 'translateX(-100%) translateX(-8px)' : 'translateX(8px)',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, marginBottom: 3, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span>#{hoveredSalesIdx + 1} {prod.part_no || ''}</span>
                                            <span>•</span>
                                            <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prod.name}</span>
                                        </div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {isRevenue ? (
                                                <>
                                                    <span style={{ color: '#6EE7B7' }}>₱{(prod.revenue || 0).toLocaleString()}</span>
                                                    <span style={{ fontSize: 11, color: '#94A3B8' }}>({prod.sales_count} {uomLabel} sold)</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>{prod.sales_count} {uomLabel} sold</span>
                                                    <span style={{ fontSize: 11, color: '#A7F3D0', fontWeight: 600 }}>({prod.stock} {uomLabel} in stock)</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Minimalist X-Axis Labels */}
                        <div style={{ position: 'relative', width: '100%', height: 22, marginTop: 12 }}>
                            {salesPoints.map((p, idx) => {
                                const pctX = (p.x / fullWidth) * 100;
                                let transformStr = 'translateX(-50%)';
                                if (idx === 0) transformStr = 'translateX(0)';
                                if (idx === salesPoints.length - 1) transformStr = 'translateX(-100%)';
                                const isHovered = hoveredSalesIdx === idx;
                                const itemWidth = Math.max(70, Math.floor((fullWidth - 80) / salesPoints.length) - 8);

                                return (
                                    <span
                                        key={idx}
                                        title={p.p.name}
                                        style={{
                                            position: 'absolute',
                                            left: `${pctX}%`,
                                            transform: transformStr,
                                            fontSize: 11,
                                            color: isHovered ? activeColor : '#64748B',
                                            fontWeight: isHovered ? 700 : 500,
                                            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            maxWidth: `${itemWidth}px`,
                                            textAlign: idx === 0 ? 'left' : (idx === salesPoints.length - 1 ? 'right' : 'center'),
                                            transition: 'color 0.15s ease',
                                            cursor: 'default'
                                        }}
                                    >
                                        {p.p.name}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Row 2: Returns & Refunds Trend (Left) & Sales by Category Donut Chart (Right) ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                
                {/* 2. Returns & Refunds Line Curve */}
                <div className="section-card" style={{ margin: 0, padding: '20px', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', minHeight: '300px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div>
                            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                                Returns & Refunds Trend
                            </h3>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                                Product return and refund counts across affected items
                            </p>
                        </div>
                        {/* Legend pills */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: '#FFFBEB', color: '#D97706', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
                                Returns ({totalReturns})
                            </span>
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: '#FEF2F2', color: '#DC2626', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                                Refunds ({totalRefunds})
                            </span>
                        </div>
                    </div>

                    {returnChartItems.length === 0 ? (
                        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                            No returns or refunds recorded in this period.
                        </div>
                    ) : (
                        <div style={{ position: 'relative', width: '100%', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '190px' }}>
                                <svg
                                    width="100%"
                                    height="100%"
                                    viewBox={`0 0 ${halfWidth} ${halfHeight}`}
                                    preserveAspectRatio="none"
                                    style={{ overflow: 'visible' }}
                                >
                                    <defs>
                                        <linearGradient id="returnsAreaGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.20" />
                                            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.00" />
                                        </linearGradient>
                                    </defs>

                                    {/* Y-Axis Grid Lines & Tick Labels */}
                                    {retYTicks.map((tickVal, i) => {
                                        const yPos = (halfHeight - halfPaddingY) - ((tickVal / retUpperBound) * halfPlotHeight);
                                        const isBaseline = i === retYTicks.length - 1;
                                        return (
                                            <g key={i}>
                                                <line
                                                    x1={halfStartX}
                                                    y1={yPos}
                                                    x2={halfEndX}
                                                    y2={yPos}
                                                    stroke="var(--border, #E2E8F0)"
                                                    strokeWidth="1"
                                                    strokeOpacity={isBaseline ? '0.35' : '0.18'}
                                                />
                                                <text
                                                    x={halfStartX - 6}
                                                    y={yPos + 3}
                                                    textAnchor="end"
                                                    fill="#64748B"
                                                    fontSize="10"
                                                    fontWeight="600"
                                                    fontFamily="Inter, -apple-system, BlinkMacSystemFont, sans-serif"
                                                >
                                                    {tickVal}
                                                </text>
                                            </g>
                                        );
                                    })}

                                    {/* Returns Gradient Area Fill */}
                                    {returnsAreaPath && <path d={returnsAreaPath} fill="url(#returnsAreaGradient)" />}

                                    {/* Returns Line (Amber) */}
                                    {returnsLinePath && (
                                        <path
                                            d={returnsLinePath}
                                            fill="none"
                                            stroke="#F59E0B"
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    )}

                                    {/* Refunds Line (Red) */}
                                    {refundsLinePath && (
                                        <path
                                            d={refundsLinePath}
                                            fill="none"
                                            stroke="#EF4444"
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeDasharray="4 2"
                                        />
                                    )}

                                    {/* Hover vertical dashed guide line */}
                                    {hoveredRetIdx !== null && returnPoints[hoveredRetIdx] && (
                                        <line
                                            x1={returnPoints[hoveredRetIdx].x}
                                            y1={halfPaddingY}
                                            x2={returnPoints[hoveredRetIdx].x}
                                            y2={halfHeight - halfPaddingY}
                                            stroke="#F59E0B"
                                            strokeWidth="1.5"
                                            strokeDasharray="4 4"
                                        />
                                    )}

                                    {/* Plot Points & Column Hover Hitboxes */}
                                    {returnPoints.map((pt, i) => (
                                        <g key={i}>
                                            <circle
                                                cx={pt.x}
                                                cy={pt.yReturn}
                                                r={hoveredRetIdx === i ? 6 : 0}
                                                fill="#F59E0B"
                                                stroke="#FFFFFF"
                                                strokeWidth="3"
                                                style={{ transition: 'r 0.1s ease' }}
                                            />
                                            <circle
                                                cx={pt.x}
                                                cy={pt.yRefund}
                                                r={hoveredRetIdx === i ? 5 : 0}
                                                fill="#EF4444"
                                                stroke="#FFFFFF"
                                                strokeWidth="2.5"
                                                style={{ transition: 'r 0.1s ease' }}
                                            />
                                            <rect
                                                x={pt.x - retStepX / 2}
                                                y={halfPaddingY}
                                                width={retStepX}
                                                height={halfPlotHeight}
                                                fill="transparent"
                                                style={{ cursor: 'pointer' }}
                                                onMouseEnter={() => setHoveredRetIdx(i)}
                                                onMouseLeave={() => setHoveredRetIdx(null)}
                                            />
                                        </g>
                                    ))}
                                </svg>

                                {/* Dashboard-Style Floating Tooltip with UOM Support */}
                                {hoveredRetIdx !== null && returnPoints[hoveredRetIdx] && (() => {
                                    const pctX = (returnPoints[hoveredRetIdx].x / halfWidth) * 100;
                                    const alignRight = pctX > 70;
                                    const prod = returnPoints[hoveredRetIdx].p;
                                    const uomLabel = prod.uom || 'pcs';

                                    return (
                                        <div style={{
                                            position: 'absolute',
                                            left: `${pctX}%`,
                                            top: Math.max(10, Math.min(returnPoints[hoveredRetIdx].yReturn, returnPoints[hoveredRetIdx].yRefund) - 62),
                                            backgroundColor: '#0F172A',
                                            color: '#FFFFFF',
                                            padding: '8px 12px',
                                            borderRadius: 8,
                                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.15), 0 2px 4px -1px rgba(0,0,0,0.1)',
                                            zIndex: 10,
                                            pointerEvents: 'none',
                                            fontFamily: 'Inter, sans-serif',
                                            transform: alignRight ? 'translateX(-100%) translateX(-8px)' : 'translateX(8px)',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, marginBottom: 3, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span>#{hoveredRetIdx + 1} {prod.part_no || ''}</span>
                                                <span>•</span>
                                                <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prod.name}</span>
                                            </div>
                                            <div style={{ fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ color: '#FCD34D' }}>{prod.returns_count || 0} {uomLabel} returned</span>
                                                <span style={{ color: '#FCA5A5' }}>{prod.refunds_count || 0} {uomLabel} refunded</span>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Minimalist X-Axis Labels */}
                            <div style={{ position: 'relative', width: '100%', height: 20, marginTop: 10 }}>
                                {returnPoints.map((p, idx) => {
                                    const pctX = (p.x / halfWidth) * 100;
                                    let transformStr = 'translateX(-50%)';
                                    if (idx === 0) transformStr = 'translateX(0)';
                                    if (idx === returnPoints.length - 1) transformStr = 'translateX(-100%)';
                                    const isHovered = hoveredRetIdx === idx;
                                    const itemWidth = Math.max(50, Math.floor((halfWidth - 60) / returnPoints.length) - 6);

                                    return (
                                        <span
                                            key={idx}
                                            title={p.p.name}
                                            style={{
                                                position: 'absolute',
                                                left: `${pctX}%`,
                                                transform: transformStr,
                                                fontSize: 10,
                                                color: isHovered ? '#F59E0B' : '#64748B',
                                                fontWeight: isHovered ? 700 : 500,
                                                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                maxWidth: `${itemWidth}px`,
                                                textAlign: idx === 0 ? 'left' : (idx === returnPoints.length - 1 ? 'right' : 'center'),
                                                transition: 'color 0.15s ease',
                                                cursor: 'default'
                                            }}
                                        >
                                            {p.p.name}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. Sales by Category Donut / Pie Chart */}
                <div className="section-card" style={{ margin: 0, padding: '20px', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', minHeight: '300px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div>
                            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                                Sales by Category
                            </h3>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                                Product volume distribution across categories
                            </p>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: '#ECFDF5', color: '#059669' }}>
                            {categoryList.length} Categories
                        </span>
                    </div>

                    {categoryList.length === 0 ? (
                        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                            No category data available.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', flex: 1, flexWrap: 'wrap' }}>
                            {/* Donut SVG Ring */}
                            <div style={{ position: 'relative', width: DONUT_SIZE, height: DONUT_SIZE, flexShrink: 0 }}>
                                <svg
                                    width={DONUT_SIZE}
                                    height={DONUT_SIZE}
                                    viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
                                    style={{ transform: 'rotate(-90deg)', display: 'block' }}
                                >
                                    <circle
                                        cx={CENTER}
                                        cy={CENTER}
                                        r={R}
                                        fill="none"
                                        stroke="var(--border, #E2E8F0)"
                                        strokeWidth={STROKE}
                                    />
                                    {donutSegments.map(seg => (
                                        <circle
                                            key={seg.index}
                                            cx={CENTER}
                                            cy={CENTER}
                                            r={R}
                                            fill="none"
                                            stroke={seg.color}
                                            strokeWidth={hoveredCatIndex === seg.index ? STROKE + 4 : STROKE}
                                            strokeDasharray={`${seg.dashArray} ${CIRCUMFERENCE - seg.dashArray}`}
                                            strokeDashoffset={seg.dashOffset}
                                            style={{
                                                transition: 'stroke-width 0.2s ease',
                                                cursor: 'pointer'
                                            }}
                                            onMouseEnter={() => setHoveredCatIndex(seg.index)}
                                            onMouseLeave={() => setHoveredCatIndex(null)}
                                        />
                                    ))}
                                </svg>

                                {/* Center Donut Text */}
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    pointerEvents: 'none'
                                }}>
                                    <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
                                        {activeHoveredCat ? `${activeHoveredCat.count}` : `${totalSoldQty.toLocaleString()}`}
                                    </span>
                                    <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '2px' }}>
                                        {activeHoveredCat ? `${activeHoveredCat.percentage.toFixed(0)}%` : 'Total Qty'}
                                    </span>
                                </div>
                            </div>

                            {/* Minimalist Category Legend */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '150px' }}>
                                {categoryList.slice(0, 5).map((cat, i) => {
                                    const isHovered = hoveredCatIndex === i;
                                    return (
                                        <div
                                            key={i}
                                            onMouseEnter={() => setHoveredCatIndex(i)}
                                            onMouseLeave={() => setHoveredCatIndex(null)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                backgroundColor: isHovered ? 'var(--bg-secondary, #F8FAFC)' : 'transparent',
                                                cursor: 'pointer',
                                                transition: 'background-color 0.15s ease'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: cat.color, flexShrink: 0 }} />
                                                <span style={{ fontSize: '12px', fontWeight: isHovered ? 700 : 500, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                    {cat.name}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                                                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                                                    {cat.count}
                                                </span>
                                                <span style={{
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    color: cat.color,
                                                    backgroundColor: `${cat.color}15`,
                                                    padding: '2px 8px',
                                                    borderRadius: '6px',
                                                    minWidth: '42px',
                                                    textAlign: 'center',
                                                    display: 'inline-block'
                                                }}>
                                                    {cat.percentage.toFixed(0)}%
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
