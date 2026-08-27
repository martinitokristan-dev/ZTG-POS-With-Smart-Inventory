import React, { useState } from 'react';

// Clean integer Y-axis scale calculator (e.g. 10, 8, 6, 4, 2, 0 or 20, 15, 10, 5, 0)
function getCleanYAxis(maxVal) {
    if (!maxVal || maxVal <= 4) return { upperBound: 4, ticks: [4, 3, 2, 1, 0] };
    if (maxVal <= 10) return { upperBound: 10, ticks: [10, 8, 6, 4, 2, 0] };
    if (maxVal <= 20) return { upperBound: 20, ticks: [20, 15, 10, 5, 0] };
    if (maxVal <= 50) return { upperBound: 50, ticks: [50, 40, 30, 20, 10, 0] };
    if (maxVal <= 100) return { upperBound: 100, ticks: [100, 75, 50, 25, 0] };
    
    // For large numbers (e.g. 500, 1000, 5000, 10000)
    const factor = Math.pow(10, Math.floor(Math.log10(maxVal)));
    const stepMultiple = Math.ceil(maxVal / (factor * 4)) * factor;
    const upperBound = stepMultiple * 4;
    return {
        upperBound,
        ticks: [upperBound, upperBound - stepMultiple, upperBound - stepMultiple * 2, upperBound - stepMultiple * 3, 0]
    };
}

export default function PaymentMethodsCharts({ methods = [], totalRev = 0, fmt }) {
    const [hoveredDonutIdx, setHoveredDonutIdx] = useState(null);
    const [hoveredLineIdx, setHoveredLineIdx] = useState(null);

    const totalTransactions = methods.reduce((sum, m) => sum + (m.count || 0), 0);

    const getPaymentTheme = (name) => {
        const lower = (name || '').toLowerCase();
        if (lower.includes('cash')) return { color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' };
        if (lower.includes('gcash')) return { color: '#2563EB', bg: '#EFF6FF', border: '#DBEAFE' };
        if (lower.includes('bank') || lower.includes('transfer')) return { color: '#8B5CF6', bg: '#FAF5FF', border: '#E9D5FF' };
        if (lower.includes('cheque') || lower.includes('check')) return { color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' };
        return { color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' };
    };

    if (methods.length === 0) {
        return (
            <div className="section-card" style={{ padding: '56px 24px', textAlign: 'center', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#F1F5F9', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                        <line x1="1" y1="10" x2="23" y2="10"></line>
                    </svg>
                </div>
                <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>No Payment Data Recorded</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>There are no payment records for the selected date range and cashier.</p>
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
    const donutSegments = methods.map((m, i) => {
        const pct = totalRev > 0 ? (m.amount / totalRev) * 100 : 0;
        const offset = CIRCUMFERENCE - (cumulativePct / 100) * CIRCUMFERENCE;
        const dash = (pct / 100) * CIRCUMFERENCE;
        const theme = getPaymentTheme(m.name);
        const seg = { ...m, percentage: pct, dashOffset: offset, dashArray: dash, index: i, color: theme.color };
        cumulativePct += pct;
        return seg;
    });

    const activeHoveredMethod = hoveredDonutIdx !== null ? donutSegments[hoveredDonutIdx] : null;

    // ── Line Chart Parameters (Matching Dashboard SalesTrendChart) ───────
    const width = 560;
    const height = 210;
    const paddingY = 24;
    const startX = 40;
    const endX = width - 16;
    const plotWidth = endX - startX;
    const plotHeight = height - 2 * paddingY;

    const maxCount = Math.max(...methods.map(m => m.count || 0), 1);
    const { upperBound, ticks: yTicks } = getCleanYAxis(maxCount);

    const actualCount = methods.length;
    const stepX = actualCount > 1 ? plotWidth / (actualCount - 1) : plotWidth;

    const linePoints = methods.map((m, i) => {
        const x = actualCount === 1 ? startX + plotWidth / 2 : startX + i * stepX;
        const y = (height - paddingY) - ((m.count || 0) / upperBound) * plotHeight;
        return { x, y, m, i };
    });

    let linePath = '';
    let areaPath = '';
    if (linePoints.length > 0) {
        linePath = `M ${linePoints[0].x} ${linePoints[0].y}`;
        for (let i = 0; i < linePoints.length - 1; i++) {
            const curr = linePoints[i];
            const next = linePoints[i + 1];
            const cpX1 = curr.x + (next.x - curr.x) / 2;
            const cpY1 = curr.y;
            const cpX2 = curr.x + (next.x - curr.x) / 2;
            const cpY2 = next.y;
            linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`;
        }
        areaPath = `${linePath} L ${linePoints[linePoints.length - 1].x} ${height - paddingY} L ${linePoints[0].x} ${height - paddingY} Z`;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Top Row: Donut / Pie Chart & Transaction Volume Spline */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                
                {/* ── 1. Sleek Donut / Pie Chart (Revenue by Payment Method) ── */}
                <div className="section-card" style={{ margin: 0, padding: '20px', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div>
                            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                                Revenue by Payment Method
                            </h3>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                                Total sales revenue distribution by payment channel
                            </p>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: '#ECFDF5', color: '#059669' }}>
                            {methods.length} Channels
                        </span>
                    </div>

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
                                        strokeWidth={hoveredDonutIdx === seg.index ? STROKE + 4 : STROKE}
                                        strokeDasharray={`${seg.dashArray} ${CIRCUMFERENCE - seg.dashArray}`}
                                        strokeDashoffset={seg.dashOffset}
                                        style={{
                                            transition: 'stroke-width 0.2s ease',
                                            cursor: 'pointer'
                                        }}
                                        onMouseEnter={() => setHoveredDonutIdx(seg.index)}
                                        onMouseLeave={() => setHoveredDonutIdx(null)}
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
                                <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
                                    {activeHoveredMethod ? fmt(activeHoveredMethod.amount) : fmt(totalRev)}
                                </span>
                                <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '2px' }}>
                                    {activeHoveredMethod ? `${activeHoveredMethod.percentage.toFixed(1)}%` : 'Total Sales'}
                                </span>
                            </div>
                        </div>

                        {/* Minimalist Legend */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '150px' }}>
                            {donutSegments.map((m, i) => {
                                const isHovered = hoveredDonutIdx === i;
                                return (
                                    <div
                                        key={i}
                                        onMouseEnter={() => setHoveredDonutIdx(i)}
                                        onMouseLeave={() => setHoveredDonutIdx(null)}
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
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: m.color, flexShrink: 0 }} />
                                            <span style={{ fontSize: '12px', fontWeight: isHovered ? 700 : 500, color: 'var(--text-primary)' }}>
                                                {m.name}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
                                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                                                {fmt(m.amount)}
                                            </span>
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                color: m.color,
                                                backgroundColor: `${m.color}15`,
                                                padding: '2px 8px',
                                                borderRadius: '6px',
                                                minWidth: '48px',
                                                textAlign: 'center',
                                                display: 'inline-block'
                                            }}>
                                                {m.percentage.toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ── 2. Smooth Line Graph (Transactions by Payment Method) ── */}
                <div className="section-card" style={{ margin: 0, padding: '20px', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', minHeight: '300px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div>
                            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                                Transactions by Payment Method
                            </h3>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                                Completed transaction count across payment channels
                            </p>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: '#EFF6FF', color: '#2563EB' }}>
                            {totalTransactions} Total Transactions
                        </span>
                    </div>

                    <div style={{ position: 'relative', width: '100%', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '190px' }}>
                            <svg
                                width="100%"
                                height="100%"
                                viewBox={`0 0 ${width} ${height}`}
                                preserveAspectRatio="none"
                                style={{ overflow: 'visible' }}
                            >
                                <defs>
                                    <linearGradient id="paymentAreaGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                                        <stop offset="100%" stopColor="#10B981" stopOpacity="0.00" />
                                    </linearGradient>
                                </defs>

                                {/* Y-Axis Grid Lines & Tick Labels */}
                                {yTicks.map((tickVal, i) => {
                                    const yPos = (height - paddingY) - ((tickVal / upperBound) * plotHeight);
                                    const isBaseline = i === yTicks.length - 1;
                                    return (
                                        <g key={i}>
                                            <line
                                                x1={startX}
                                                y1={yPos}
                                                x2={endX}
                                                y2={yPos}
                                                stroke="var(--border, #E2E8F0)"
                                                strokeWidth="1"
                                                strokeOpacity={isBaseline ? '0.35' : '0.18'}
                                            />
                                            <text
                                                x={startX - 6}
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

                                {/* Area Gradient Fill */}
                                {areaPath && <path d={areaPath} fill="url(#paymentAreaGradient)" />}

                                {/* Smooth Curve Line */}
                                {linePath && (
                                    <path
                                        d={linePath}
                                        fill="none"
                                        stroke="#10B981"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                )}

                                {/* Hover vertical dashed guide line */}
                                {hoveredLineIdx !== null && linePoints[hoveredLineIdx] && (
                                    <line
                                        x1={linePoints[hoveredLineIdx].x}
                                        y1={paddingY}
                                        x2={linePoints[hoveredLineIdx].x}
                                        y2={height - paddingY}
                                        stroke="#10B981"
                                        strokeWidth="1.5"
                                        strokeDasharray="4 4"
                                    />
                                )}

                                {/* Plot Points & Column Hover Hitboxes */}
                                {linePoints.map((pt, i) => {
                                    const theme = getPaymentTheme(pt.m.name);
                                    return (
                                        <g key={i}>
                                            <circle
                                                cx={pt.x}
                                                cy={pt.y}
                                                r={hoveredLineIdx === i ? 6 : 0}
                                                fill={theme.color}
                                                stroke="#FFFFFF"
                                                strokeWidth="3"
                                                style={{ transition: 'r 0.1s ease' }}
                                            />
                                            {/* Column Hover Hit Area */}
                                            <rect
                                                x={pt.x - stepX / 2}
                                                y={paddingY}
                                                width={stepX}
                                                height={plotHeight}
                                                fill="transparent"
                                                style={{ cursor: 'pointer' }}
                                                onMouseEnter={() => setHoveredLineIdx(i)}
                                                onMouseLeave={() => setHoveredLineIdx(null)}
                                            />
                                        </g>
                                    );
                                })}
                            </svg>

                            {/* Dashboard-Style Floating Tooltip */}
                            {hoveredLineIdx !== null && linePoints[hoveredLineIdx] && (() => {
                                const pctX = (linePoints[hoveredLineIdx].x / width) * 100;
                                const alignRight = pctX > 70;
                                const pm = linePoints[hoveredLineIdx].m;

                                return (
                                    <div style={{
                                        position: 'absolute',
                                        left: `${pctX}%`,
                                        top: Math.max(10, linePoints[hoveredLineIdx].y - 58),
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
                                        <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, marginBottom: 3 }}>
                                            {pm.name}
                                        </div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>{pm.count} {pm.count === 1 ? 'transaction' : 'transactions'}</span>
                                            <span style={{ fontSize: 11, color: '#A7F3D0', fontWeight: 600 }}>({fmt(pm.amount)})</span>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Minimalist X-Axis Labels */}
                        <div style={{ position: 'relative', width: '100%', height: 20, marginTop: 10 }}>
                            {linePoints.map((p, idx) => {
                                const pctX = (p.x / width) * 100;
                                let transformStr = 'translateX(-50%)';
                                if (idx === 0) transformStr = 'translateX(0)';
                                if (idx === linePoints.length - 1) transformStr = 'translateX(-100%)';
                                const isHovered = hoveredLineIdx === idx;
                                const theme = getPaymentTheme(p.m.name);

                                return (
                                    <span
                                        key={idx}
                                        style={{
                                            position: 'absolute',
                                            left: `${pctX}%`,
                                            transform: transformStr,
                                            fontSize: 10,
                                            color: isHovered ? theme.color : '#94A3B8',
                                            fontWeight: isHovered ? 700 : 500,
                                            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                                            whiteSpace: 'nowrap',
                                            transition: 'color 0.15s ease'
                                        }}
                                    >
                                        {p.m.name}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Minimalist Average Ticket Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                {methods.map((m, idx) => {
                    const avg = m.count > 0 ? (m.amount / m.count) : 0;
                    const theme = getPaymentTheme(m.name);

                    return (
                        <div key={idx} className="section-card" style={{ margin: 0, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
                                    Avg. Transaction Amount
                                </span>
                                <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', backgroundColor: theme.bg, color: theme.color }}>
                                    {m.name}
                                </span>
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                                {fmt(avg)}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                {m.count} completed {m.count === 1 ? 'transaction' : 'transactions'}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
