import React, { useState } from 'react';

/**
 * TopCategoriesCard
 * Pure UI component. Receives topCategories via props.
 * - Left: SVG Donut Chart with interactive segments.
 * - Right: Vertical legend list with color dots, category names, and percentages.
 * - Hovering any donut segment or legend row shows a floating, modern tooltip box
 *   displaying the category name, exact revenue amount (₱), and percentage.
 */
export default function TopCategoriesCard({ topCategories = [] }) {
    const [hoveredIndex, setHoveredIndex] = useState(null);

    const isEmpty = !topCategories || topCategories.length === 0;

    // ── Donut chart constants ────────────────────────────────────────────
    const SIZE = 84;
    const STROKE = 12;
    const R = (SIZE - STROKE) / 2;
    const CIRCUMFERENCE = 2 * Math.PI * R;
    const CENTER = SIZE / 2;

    // Build arc segments from percentages
    let cumulativePct = 0;
    const segments = (isEmpty ? [] : topCategories).map((cat, i) => {
        const offset = CIRCUMFERENCE - (cumulativePct / 100) * CIRCUMFERENCE;
        const dash   = (cat.percentage / 100) * CIRCUMFERENCE;
        const seg    = { ...cat, dashOffset: offset, dashArray: dash, index: i };
        cumulativePct += cat.percentage;
        return seg;
    });

    const hoveredCat = hoveredIndex !== null ? topCategories[hoveredIndex] : null;

    const cardStyle = {
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 24,
        boxShadow: 'var(--shadow-sm)',
        boxSizing: 'border-box',
        minWidth: 0,
        position: 'relative',
    };

    const labelStyle = {
        fontSize: 12,
        fontWeight: 700,
        color: 'var(--text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: 14,
    };

    return (
        <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ ...labelStyle, marginBottom: 0 }}>Top Categories</div>
            </div>

            {isEmpty ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 84 }}>
                    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx={CENTER} cy={CENTER} r={R} fill="none" stroke="var(--border)" strokeWidth={STROKE} />
                    </svg>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                        No category sales
                    </span>
                </div>
            ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative' }}>

                    {/* ── Donut Chart ────────────────────────────────────── */}
                    <div
                        style={{ flexShrink: 0, position: 'relative', width: SIZE, height: SIZE }}
                        onMouseLeave={() => setHoveredIndex(null)}
                    >
                        <svg
                            width={SIZE} height={SIZE}
                            viewBox={`0 0 ${SIZE} ${SIZE}`}
                            style={{ transform: 'rotate(-90deg)', display: 'block' }}
                        >
                            {/* Track ring */}
                            <circle
                                cx={CENTER} cy={CENTER} r={R}
                                fill="none"
                                stroke="var(--border)"
                                strokeWidth={STROKE}
                            />
                            {/* Color segments */}
                            {segments.map((seg) => (
                                <circle
                                    key={seg.index}
                                    cx={CENTER} cy={CENTER} r={R}
                                    fill="none"
                                    stroke={seg.color}
                                    strokeWidth={hoveredIndex === seg.index ? STROKE + 3 : STROKE}
                                    strokeDasharray={`${seg.dashArray} ${CIRCUMFERENCE - seg.dashArray}`}
                                    strokeDashoffset={seg.dashOffset}
                                    strokeLinecap="butt"
                                    style={{ transition: 'stroke-width 0.15s ease', cursor: 'pointer' }}
                                    onMouseEnter={() => setHoveredIndex(seg.index)}
                                />
                            ))}
                        </svg>

                        {/* Floating Tooltip Box */}
                        {hoveredCat && (
                            <div style={{
                                position: 'absolute',
                                bottom: '105%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                backgroundColor: '#0F172A',
                                color: '#FFFFFF',
                                padding: '6px 10px',
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
                                    ₱{hoveredCat.revenue.toLocaleString()} <span style={{ fontSize: 10, color: '#CBD5E1', fontWeight: 500 }}>({hoveredCat.percentage}%)</span>
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

                    {/* ── Vertical Legend List ──────────────────────────── */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                        {topCategories.map((cat, i) => (
                            <div
                                key={i}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 7,
                                    padding: '2px 4px',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    backgroundColor: hoveredIndex === i ? 'var(--bg-secondary)' : 'transparent',
                                    transition: 'background-color 0.15s ease',
                                }}
                                onMouseEnter={() => setHoveredIndex(i)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            >
                                {/* Color dot */}
                                <span style={{
                                    width: 7, height: 7,
                                    borderRadius: '50%',
                                    backgroundColor: cat.color,
                                    flexShrink: 0,
                                    transform: hoveredIndex === i ? 'scale(1.3)' : 'scale(1)',
                                    transition: 'transform 0.15s ease',
                                }} />

                                {/* Category name */}
                                <span style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: hoveredIndex === i ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    flex: 1,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    transition: 'color 0.15s ease',
                                }}>
                                    {cat.name}
                                </span>

                                {/* Percentage */}
                                <span style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: cat.color,
                                    flexShrink: 0,
                                    fontVariantNumeric: 'tabular-nums',
                                }}>
                                    {cat.percentage}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
