import React, { useState } from 'react';

export default function SalesTrendChart({ last7Days = [], timeRange = 'Today' }) {
    const [hoveredIndex, setHoveredIndex] = useState(null);

    // Dynamic Date Range string
    let dateRangeStr = '';
    const formatOptions = { month: 'short', day: 'numeric', year: 'numeric' };

    if (timeRange === 'Today') {
        dateRangeStr = new Date().toLocaleDateString('en-US', formatOptions);
    } else if (timeRange === 'This Month') {
        dateRangeStr = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (timeRange === 'This Year') {
        dateRangeStr = new Date().toLocaleDateString('en-US', { year: 'numeric' });
    } else {
        if (last7Days && last7Days.length > 0 && last7Days[0].date && last7Days[last7Days.length - 1].date) {
            const first = new Date(last7Days[0].date);
            const last = new Date(last7Days[last7Days.length - 1].date);
            dateRangeStr = `${first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${last.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        } else {
            const today = new Date();
            const sixDaysAgo = new Date();
            sixDaysAgo.setDate(today.getDate() - 6);
            dateRangeStr = `${sixDaysAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }
    }

    // Chart dimensions
    const width = 600;
    const height = 220;
    const paddingY = 24;
    const startX = 36;
    const endX = width - 6;

    // Format Y-axis count without ₱ symbol (e.g. 500, 1k, 1.5k, 20k, 1.2M)
    const formatYAxisLabel = (val) => {
        if (val === 0) return '0';
        if (val >= 1000000) return `${Number((val / 1000000).toFixed(1))}M`;
        if (val >= 1000) return `${Number((val / 1000).toFixed(1))}k`;
        return `${Math.round(val)}`;
    };

    // Scale ceiling: clean step scaled from the highest point in the real series
    const getCleanUpperBound = (maxVal) => {
        if (!maxVal || maxVal <= 0) return 0;
        const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)));
        const step = [1, 2, 2.5, 5, 10].find(m => m * magnitude >= maxVal) || 10;
        return step * magnitude;
    };

    const isToday = timeRange === 'Today';
    const hourLabel = (h) => (h === 0 ? '12AM' : h < 12 ? `${h}AM` : h === 12 ? '12PM' : `${h - 12}PM`);

    let chartDataset = [];
    if (isToday) {
        chartDataset = Array.from({ length: 24 }, (_, h) => {
            const match = last7Days && last7Days.length > 0
                ? last7Days.find(d => String(d.day || '').replace(/\s+/g, '').toUpperCase() === hourLabel(h))
                : null;
            return {
                label: hourLabel(h),
                revenue: match ? Number(match.revenue || 0) : 0,
                date: match ? match.date : ''
            };
        });
    } else if (last7Days && last7Days.length > 0) {
        chartDataset = last7Days.map(d => ({
            label: d.day,
            revenue: Number(d.revenue || 0),
            date: d.date || ''
        }));
    } else {
        // Real series fallback with NO fake numbers: clean 0 points
        if (timeRange === 'This Week') {
            const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            chartDataset = dayLabels.map(l => ({ label: l, revenue: 0, date: '' }));
        } else if (timeRange === 'This Year') {
            const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            chartDataset = monthLabels.map(l => ({ label: l, revenue: 0, date: '' }));
        } else {
            const dayLabels = ['1', '5', '10', '15', '20', '25', '30'];
            chartDataset = dayLabels.map(l => ({ label: l, revenue: 0, date: '' }));
        }
    }

    const actualNumPoints = chartDataset.length;
    const rawMax = Math.max(...chartDataset.map(d => d.revenue), 0);
    const isAllZeroOrEmpty = rawMax === 0;

    // Scale comes strictly from data: when empty/zero, no 100k scale is rendered
    const upperBound = isAllZeroOrEmpty ? 0 : getCleanUpperBound(rawMax);
    const yTicks = isAllZeroOrEmpty ? [0] : [1.0, 0.8, 0.6, 0.4, 0.2, 0].map(ratio => ratio * upperBound);

    // Calculate SVG coordinates
    const stepX = actualNumPoints > 1 ? (endX - startX) / (actualNumPoints - 1) : (endX - startX);

    const points = chartDataset.map((d, index) => {
        const cx = startX + (index * stepX);
        const cy = isAllZeroOrEmpty || upperBound === 0
            ? height - paddingY
            : (height - paddingY) - ((d.revenue / upperBound) * (height - 2 * paddingY));
        return { x: cx, y: cy, label: d.label, revenue: d.revenue, date: d.date };
    });

    // Helper to generate a smooth Catmull-Rom spline path
    const getBezierCurvePath = (pts) => {
        if (!pts || pts.length === 0) return '';
        if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
        if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;

        let path = `M ${pts[0].x} ${pts[0].y}`;
        const clampY = (y) => Math.max(paddingY, Math.min(height - paddingY, y));

        for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[i === 0 ? 0 : i - 1];
            const p1 = pts[i];
            const p2 = pts[i + 1];
            const p3 = pts[i + 2 === pts.length ? i + 1 : i + 2];

            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = clampY(p1.y + (p2.y - p0.y) / 6);

            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = clampY(p2.y - (p3.y - p1.y) / 6);

            path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
        }
        return path;
    };

    const linePath = isAllZeroOrEmpty ? '' : getBezierCurvePath(points);
    const areaPath = isAllZeroOrEmpty
        ? ''
        : `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

    return (
        <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: 24,
            boxSizing: 'border-box',
            position: 'relative',
            height: '100%',
            minHeight: 350,
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        Sales trend
                    </h3>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '3px 0 0 0', fontWeight: 500 }}>
                        {dateRangeStr}
                    </p>
                </div>
            </div>

            <div style={{ width: '100%', height: height, position: 'relative', flex: 1 }}>
                <svg
                    width="100%"
                    height="100%"
                    viewBox={`0 0 ${width} ${height}`}
                    preserveAspectRatio="none"
                    style={{ overflow: 'visible' }}
                >
                    <defs>
                        <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--primary, #3B82F6)" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="var(--primary, #3B82F6)" stopOpacity="0.00" />
                        </linearGradient>
                    </defs>

                    {/* Y-Axis labels & Grid lines */}
                    {yTicks.map((tickVal, i) => {
                        const yTick = isAllZeroOrEmpty || upperBound === 0
                            ? height - paddingY
                            : (height - paddingY) - ((tickVal / upperBound) * (height - 2 * paddingY));
                        const isBaseline = tickVal === 0;

                        return (
                            <g key={i}>
                                <line
                                    x1={startX}
                                    y1={yTick}
                                    x2={endX}
                                    y2={yTick}
                                    stroke="var(--border)"
                                    strokeWidth="1"
                                    strokeOpacity={isBaseline ? "0.6" : "0.3"}
                                />
                                <text
                                    x={startX - 8}
                                    y={yTick + 3}
                                    textAnchor="end"
                                    fill="var(--text-muted)"
                                    fontSize="10"
                                    fontWeight="600"
                                    fontFamily="Inter, -apple-system, BlinkMacSystemFont, sans-serif"
                                >
                                    {formatYAxisLabel(tickVal)}
                                </text>
                            </g>
                        );
                    })}

                    {/* Filled Area & Line */}
                    {!isAllZeroOrEmpty && areaPath && (
                        <path d={areaPath} fill="url(#chartAreaGradient)" />
                    )}
                    {!isAllZeroOrEmpty && linePath && (
                        <path d={linePath} fill="none" stroke="var(--primary, #2563EB)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    )}

                    {/* Hover vertical guide line */}
                    {!isAllZeroOrEmpty && hoveredIndex !== null && points[hoveredIndex] && (
                        <line
                            x1={points[hoveredIndex].x}
                            y1={paddingY}
                            x2={points[hoveredIndex].x}
                            y2={height - paddingY}
                            stroke="var(--primary, #3B82F6)"
                            strokeWidth="1.5"
                            strokeDasharray="4 4"
                        />
                    )}

                    {/* Plot Points & Hover targets */}
                    {!isAllZeroOrEmpty && points.map((p, i) => (
                        <g key={i}>
                            <circle
                                cx={p.x}
                                cy={p.y}
                                r={hoveredIndex === i ? "6" : "0"}
                                fill="var(--primary, #2563EB)"
                                stroke="var(--bg-card, #FFFFFF)"
                                strokeWidth="3"
                                style={{ transition: 'r 0.1s ease' }}
                            />
                            <rect
                                x={p.x - stepX / 2}
                                y={paddingY}
                                width={stepX}
                                height={height - 2 * paddingY}
                                fill="transparent"
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={() => setHoveredIndex(i)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            />
                        </g>
                    ))}
                </svg>

                {/* Empty state overlay when series is empty or all zeros */}
                {isAllZeroOrEmpty && (
                    <div style={{
                        position: 'absolute',
                        top: paddingY,
                        left: startX,
                        right: 0,
                        bottom: paddingY,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        pointerEvents: 'none',
                        zIndex: 2,
                    }}>
                        <div style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-muted)',
                            marginBottom: 2,
                        }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                            No sales yet {timeRange.toLowerCase()}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            Sales appear here as they're rung up.
                        </div>
                    </div>
                )}

                {/* Interactive Tooltip popup */}
                {!isAllZeroOrEmpty && hoveredIndex !== null && points[hoveredIndex] && (() => {
                    const pctX = (points[hoveredIndex].x / width) * 100;
                    const alignRight = pctX > 75;
                    return (
                        <div style={{
                            position: 'absolute',
                            left: `${pctX}%`,
                            top: points[hoveredIndex].y - 50,
                            backgroundColor: '#0F172A',
                            color: '#FFFFFF',
                            padding: '8px 12px',
                            borderRadius: 8,
                            boxShadow: 'var(--shadow-md, 0 4px 6px -1px rgba(0,0,0,0.1))',
                            zIndex: 10,
                            pointerEvents: 'none',
                            fontFamily: 'Inter, sans-serif',
                            transform: alignRight ? 'translateX(-100%) translateX(-8px)' : 'translateX(8px)',
                            whiteSpace: 'nowrap'
                        }}>
                            <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, marginBottom: 2 }}>
                                {points[hoveredIndex].label}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                                ₱{points[hoveredIndex].revenue.toLocaleString()}
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* Fluid HTML Labels Row below the SVG */}
            <div style={{ position: 'relative', width: '100%', height: 20, marginTop: 12 }}>
                {points.map((p, idx) => {
                    let showLabel = false;
                    if (timeRange === 'Today') {
                        showLabel = idx % 3 === 0; // 12AM, 3AM, 6AM, 9AM, 12PM, 3PM, 6PM, 9PM
                    } else if (timeRange === 'This Month') {
                        showLabel = idx === 0 || idx === 9 || idx === 19 || idx === actualNumPoints - 1;
                    } else if (timeRange === 'This Year') {
                        showLabel = idx % 2 === 0;
                    } else {
                        showLabel = true;
                    }

                    if (!showLabel) return null;

                    const displayLabel = String(p.label || '').replace(/\s+/g, '');
                    const pctX = (p.x / width) * 100;
                    let transformStr = 'translateX(-50%)';
                    if (idx === 0) transformStr = 'translateX(0)';
                    if (idx === actualNumPoints - 1) transformStr = 'translateX(-100%)';

                    return (
                        <span
                            key={idx}
                            style={{
                                position: 'absolute',
                                left: `${pctX}%`,
                                transform: transformStr,
                                fontSize: 10,
                                color: 'var(--text-muted)',
                                fontWeight: 500,
                                fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {displayLabel}
                        </span>
                    );
                })}
            </div>
        </div>
    );
}
