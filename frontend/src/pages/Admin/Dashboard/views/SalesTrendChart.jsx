import React, { useState } from 'react';

export default function SalesTrendChart({ last7Days = [], timeRange = 'Today' }) {
    const [hoveredIndex, setHoveredIndex] = useState(null);

    const hasData = last7Days && last7Days.length > 0;
    const numPoints = hasData ? last7Days.length : 7;
    
    // Dynamic Date Range string
    let dateRangeStr = '';
    const formatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    
    if (hasData) {
        if (timeRange === 'Today') {
            dateRangeStr = new Date().toLocaleDateString('en-US', formatOptions);
        } else if (timeRange === 'This Month') {
            dateRangeStr = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        } else if (timeRange === 'This Year') {
            dateRangeStr = new Date().toLocaleDateString('en-US', { year: 'numeric' });
        } else {
            const first = new Date(last7Days[0].date);
            const last = new Date(last7Days[last7Days.length - 1].date);
            dateRangeStr = `${first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${last.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }
    }

    // Chart dimensions
    const width = 600;
    const height = 220;
    const paddingY = 24;
    const startX = 36; // Pushed further left to give max width to chart
    const endX = width - 6;

    // Format Y-axis count without ₱ symbol (20k, 40k, 60k, 80k, 100k)
    const formatYAxisLabel = (val) => {
        if (val === 0) return '0';
        if (val >= 1000000) return `${(val / 1000000).toFixed(val % 1000000 === 0 ? 0 : 1)}M`;
        if (val >= 1000) return `${Math.round(val / 1000)}k`;
        return `${val}`;
    };

    // Scale ceiling (defaults to 100k scale: 20k, 40k, 60k, 80k, 100k)
    const getCleanUpperBound = (maxVal) => {
        if (!maxVal || maxVal <= 100000) return 100000;
        return Math.ceil(maxVal / 100000) * 100000;
    };

    const todayLabels = ['8AM', '9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM'];
    const isToday = timeRange === 'Today';

    let chartDataset = [];
    if (isToday) {
        // Strictly use 10 hourly points for Today (8AM to 5PM)
        if (hasData && last7Days.length === 10) {
            chartDataset = last7Days.map((d, i) => ({
                label: todayLabels[i] || d.day,
                revenue: d.revenue || 0,
                date: d.date || ''
            }));
        } else {
            chartDataset = todayLabels.map((lbl) => {
                const match = hasData ? last7Days.find(d => String(d.day || '').replace(/\s+/g, '').toUpperCase() === lbl) : null;
                return {
                    label: lbl,
                    revenue: match ? match.revenue : 0,
                    date: match ? match.date : ''
                };
            });
        }
    } else if (hasData) {
        chartDataset = last7Days.map(d => ({
            label: d.day,
            revenue: d.revenue || 0,
            date: d.date || ''
        }));
    } else {
        const dummy = [20, 40, 15, 60, 30, 85, 45];
        const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        chartDataset = dummy.map((val, i) => ({
            label: dayLabels[i],
            revenue: val * 1000,
            date: ''
        }));
    }

    const actualNumPoints = chartDataset.length;
    const rawMax = Math.max(...chartDataset.map(d => d.revenue), 0);
    const upperBound = getCleanUpperBound(rawMax);
    const yTicks = [1.0, 0.8, 0.6, 0.4, 0.2, 0].map(ratio => ratio * upperBound);

    // Calculate SVG coordinates based on chartDataset
    const stepX = actualNumPoints > 1 ? (endX - startX) / (actualNumPoints - 1) : (endX - startX);

    const points = chartDataset.map((d, index) => {
        const cx = startX + (index * stepX);
        const cy = (height - paddingY) - ((d.revenue / upperBound) * (height - 2 * paddingY));
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

    // Smooth spline paths
    const linePath = getBezierCurvePath(points);
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

    return (
        <div style={{ 
            backgroundColor: '#FFFFFF', 
            border: '1px solid #E2E8F0', 
            borderRadius: 12, 
            padding: 24, 
            boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05), 0 1px 2px 0 rgba(0,0,0,0.06)',
            position: 'relative',
            height: 320,
            boxSizing: 'border-box'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: 'Outfit, sans-serif' }}>
                    Sales Trend — {timeRange}
                </h3>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>{dateRangeStr}</span>
            </div>

            <div style={{ width: '100%', height: height, position: 'relative' }}>
                <svg 
                    width="100%" 
                    height="100%" 
                    viewBox={`0 0 ${width} ${height}`} 
                    preserveAspectRatio="none"
                    style={{ overflow: 'visible' }}
                >
                    <defs>
                        <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.00" />
                        </linearGradient>
                    </defs>

                    {/* Y-Axis labels & Grid lines for each level (100k, 80k, 60k, 40k, 20k, 0) */}
                    {yTicks.map((tickVal, i) => {
                        const yTick = (height - paddingY) - ((tickVal / upperBound) * (height - 2 * paddingY));
                        const isBaseline = i === yTicks.length - 1;

                        return (
                            <g key={i}>
                                {/* Crisp, clear horizontal line across the entire chart width */}
                                <line 
                                    x1={startX} 
                                    y1={yTick} 
                                    x2={endX} 
                                    y2={yTick} 
                                    stroke="var(--border, #E2E8F0)" 
                                    strokeWidth="1" 
                                    strokeOpacity={isBaseline ? "0.35" : "0.18"} 
                                    strokeDasharray="none" 
                                />
                                <text 
                                    x={startX - 6} 
                                    y={yTick + 3} 
                                    textAnchor="end" 
                                    fill="#64748B" 
                                    fontSize="10" 
                                    fontWeight="600" 
                                    fontFamily="Inter, -apple-system, BlinkMacSystemFont, sans-serif"
                                >
                                    {formatYAxisLabel(tickVal)}
                                </text>
                            </g>
                        );
                    })}

                    {/* Filled Area */}
                    <path d={areaPath} fill="url(#chartAreaGradient)" />

                    {/* Polyline path */}
                    <path d={linePath} fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Hover vertical guide line */}
                    {hoveredIndex !== null && points[hoveredIndex] && (
                        <line 
                            x1={points[hoveredIndex].x} 
                            y1={paddingY} 
                            x2={points[hoveredIndex].x} 
                            y2={height - paddingY} 
                            stroke="#3B82F6" 
                            strokeWidth="1.5" 
                            strokeDasharray="4 4" 
                        />
                    )}

                    {/* Plot Points */}
                    {points.map((p, i) => (
                        <g key={i}>
                            <circle 
                                cx={p.x} 
                                cy={p.y} 
                                r={hoveredIndex === i ? "6" : "0"} 
                                fill="#2563EB" 
                                stroke="#FFFFFF" 
                                strokeWidth="3"
                                style={{ transition: 'r 0.1s ease' }}
                            />
                            {/* Transparent overlay column for easier hover triggering */}
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

                {/* Interactive Tooltip popup positioned via percentage left */}
                {hoveredIndex !== null && points[hoveredIndex] && (() => {
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
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
                            zIndex: 10,
                            pointerEvents: 'none',
                            fontFamily: 'Inter, sans-serif',
                            transform: alignRight ? 'translateX(-100%) translateX(-8px)' : 'translateX(8px)',
                            whiteSpace: 'nowrap'
                        }}>
                            <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, marginBottom: 2 }}>
                                {points[hoveredIndex].label}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>
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
                        showLabel = idx % 2 === 0 && idx <= 8; // Shows 8AM, 10AM, 12PM, 2PM, 4PM
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
                                color: '#94A3B8', 
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
