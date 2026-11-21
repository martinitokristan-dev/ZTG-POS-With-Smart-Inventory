import React, { useState } from 'react';

/**
 * TopCategoriesCard
 * Pure UI component. Receives topCategories via props.
 * - Card title "Top categories" at top-left.
 * - Centered SVG Donut Chart (max-width: 180px, ring thickness 15% of diameter, clockwise from 12 o'clock).
 * - Legend list (<ul> with <li> rows, 12px round dot, 14px font-weight 600 category name, right-aligned percentage with color-mix, 1px hairline dividers).
 * - Empty state with matching gray ring and centered "No category sales yet" text.
 */
export default function TopCategoriesCard({ topCategories = [] }) {
    const [hoveredIndex, setHoveredIndex] = useState(null);

    const isEmpty = !topCategories || topCategories.length === 0;

    // ── Donut chart constants ────────────────────────────────────────────
    const SIZE = 180;
    const STROKE = 27; // Exactly 15% of 180px diameter
    const R = (SIZE - STROKE) / 2; // 76.5px
    const CIRCUMFERENCE = 2 * Math.PI * R; // ~480.66px
    const CENTER = SIZE / 2; // 90px

    // Build arc segments from percentages clockwise from 12 o'clock
    let cumulativeDash = 0;
    const segments = (isEmpty ? [] : topCategories).map((cat, i) => {
        const dash = (cat.percentage / 100) * CIRCUMFERENCE;
        const offset = -cumulativeDash;
        const seg = {
            ...cat,
            dashOffset: offset,
            dashArray: dash,
            index: i
        };
        cumulativeDash += dash;
        return seg;
    });

    const hoveredCat = hoveredIndex !== null ? topCategories[hoveredIndex] : null;

    const ariaLabel = isEmpty
        ? 'Top categories: No category sales'
        : `Top categories: ${topCategories.map(c => `${c.name} ${c.percentage}%`).join(', ')}`;

    const cardStyle = {
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 24,
        boxSizing: 'border-box',
        minWidth: 0,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        height: '100%',
    };

    return (
        <div style={cardStyle}>
            <style>{`
                .top-cat-legend-list {
                    list-style: none;
                    margin: 20px 0 0 0;
                    padding: 0;
                    width: 100%;
                    box-sizing: border-box;
                }
                .top-cat-legend-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 14px 4px;
                    border-bottom: 1px solid var(--table-border-subtle, var(--border));
                    cursor: pointer;
                    transition: background-color 0.15s ease;
                    border-radius: 6px;
                    box-sizing: border-box;
                }
                .top-cat-legend-row:last-child {
                    border-bottom: none;
                }
                .top-cat-legend-row:hover {
                    background-color: var(--bg-secondary);
                }
            `}</style>

            {/* 1. Card Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    Top categories
                </h3>
            </div>

            {isEmpty ? (
                /* 2. Empty State: Centered gray ring with text below */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 0', width: '100%', flex: 1 }}>
                    <div style={{ width: '100%', maxWidth: SIZE, aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg
                            role="img"
                            aria-label="Top categories: No category sales"
                            width="100%"
                            height="100%"
                            viewBox={`0 0 ${SIZE} ${SIZE}`}
                            style={{ display: 'block', overflow: 'visible' }}
                        >
                            <circle
                                cx={CENTER}
                                cy={CENTER}
                                r={R}
                                fill="none"
                                stroke="var(--border)"
                                strokeWidth={STROKE}
                            />
                        </svg>
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, marginTop: 16, textAlign: 'center' }}>
                        No category sales yet
                    </span>
                </div>
            ) : (
                /* 3. Donut Chart + Legend Stack */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    {/* Donut Chart (max-width 180px, aspect-ratio 1, centered) */}
                    <div
                        style={{
                            width: '100%',
                            maxWidth: SIZE,
                            aspectRatio: '1',
                            margin: '0 auto',
                            position: 'relative',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            flexShrink: 0
                        }}
                        onMouseLeave={() => setHoveredIndex(null)}
                    >
                        <svg
                            role="img"
                            aria-label={ariaLabel}
                            width="100%"
                            height="100%"
                            viewBox={`0 0 ${SIZE} ${SIZE}`}
                            style={{ display: 'block', overflow: 'visible' }}
                        >
                            {/* Base track */}
                            <circle
                                cx={CENTER}
                                cy={CENTER}
                                r={R}
                                fill="none"
                                stroke="var(--border)"
                                strokeWidth={STROKE}
                            />
                            {/* Clockwise segments starting at 12 o'clock */}
                            <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
                                {segments.map((seg) => (
                                    <circle
                                        key={seg.index}
                                        cx={CENTER}
                                        cy={CENTER}
                                        r={R}
                                        fill="none"
                                        stroke={seg.color}
                                        strokeWidth={hoveredIndex === seg.index ? STROKE + 4 : STROKE}
                                        strokeDasharray={`${seg.dashArray} ${CIRCUMFERENCE - seg.dashArray}`}
                                        strokeDashoffset={seg.dashOffset}
                                        strokeLinecap="butt"
                                        style={{ transition: 'stroke-width 0.15s ease', cursor: 'pointer' }}
                                        onMouseEnter={() => setHoveredIndex(seg.index)}
                                    />
                                ))}
                            </g>
                        </svg>

                        {/* Floating Tooltip Box */}
                        {hoveredCat && (
                            <div style={{
                                position: 'absolute',
                                bottom: '102%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                backgroundColor: '#0F172A',
                                color: '#FFFFFF',
                                padding: '6px 12px',
                                borderRadius: 8,
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
                                zIndex: 50,
                                pointerEvents: 'none',
                                whiteSpace: 'nowrap',
                                fontSize: 11,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 2,
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                transition: 'all 0.15s ease-in-out',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#94A3B8', fontSize: 10 }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: hoveredCat.color }} />
                                    {hoveredCat.name}
                                </div>
                                <div style={{ fontWeight: 700, color: '#F8FAFC', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                                    ₱{Number(hoveredCat.revenue || 0).toLocaleString()} <span style={{ fontSize: 10, color: '#CBD5E1', fontWeight: 500 }}>({hoveredCat.percentage}%)</span>
                                </div>
                                {/* Tooltip Arrow */}
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: 0,
                                    height: 0,
                                    borderLeft: '5px solid transparent',
                                    borderRight: '5px solid transparent',
                                    borderTop: '5px solid #0F172A',
                                }} />
                            </div>
                        )}
                    </div>

                    {/* Below Donut: Legend List (<ul> with <li> rows) */}
                    <ul className="top-cat-legend-list">
                        {topCategories.map((cat, i) => {
                            const isHovered = hoveredIndex === i;
                            const pctColor = `color-mix(in srgb, ${cat.color} 70%, var(--text-primary))`;
                            return (
                                <li
                                    key={i}
                                    className="top-cat-legend-row"
                                    style={{
                                        backgroundColor: isHovered ? 'var(--bg-secondary)' : 'transparent',
                                    }}
                                    onMouseEnter={() => setHoveredIndex(i)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                >
                                    {/* 12px round dot in segment color */}
                                    <span
                                        style={{
                                            width: 12,
                                            height: 12,
                                            borderRadius: '50%',
                                            backgroundColor: cat.color,
                                            flexShrink: 0,
                                            transform: isHovered ? 'scale(1.2)' : 'scale(1)',
                                            transition: 'transform 0.15s ease',
                                        }}
                                    />

                                    {/* Category name: 14px, font-weight 600, var(--text-primary), one line, truncate with ellipsis + title */}
                                    <span
                                        title={cat.name}
                                        style={{
                                            fontSize: 14,
                                            fontWeight: 600,
                                            color: 'var(--text-primary)',
                                            flex: 1,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            margin: '0 12px',
                                        }}
                                    >
                                        {cat.name}
                                    </span>

                                    {/* Percentage: 14px, font-weight 700, tabular-nums, right-aligned, color-mix */}
                                    <span
                                        style={{
                                            fontSize: 14,
                                            fontWeight: 700,
                                            color: pctColor,
                                            flexShrink: 0,
                                            fontVariantNumeric: 'tabular-nums',
                                            textAlign: 'right',
                                        }}
                                    >
                                        {cat.percentage}%
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}
