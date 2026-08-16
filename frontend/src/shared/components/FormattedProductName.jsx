import React, { useState } from 'react';
import ReactDOM from 'react-dom';

/**
 * Renders product name with variant highlighted in blue (#3B82F6),
 * matching the design system established in Product Management.
 * Displays single-line ellipsis truncation with an instant, beautifully styled
 * floating tooltip on hover when text overflows.
 */
export default function FormattedProductName({ name, variantOption, blockVariant = false, style = {}, className = '' }) {
    const [tooltipState, setTooltipState] = useState(null);

    if (!name) return <span style={style} className={className}>—</span>;

    const rawName = String(name).trim();
    let baseName = rawName;
    let cleanVar = variantOption ? String(variantOption).trim() : null;

    if (!cleanVar) {
        const match = rawName.match(/^(.*?)\s*\((.*?)\)$/);
        if (match) {
            baseName = match[1].trim();
            cleanVar = match[2].trim();
        }
    } else {
        const escaped = cleanVar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        baseName = rawName.replace(new RegExp(`\\s*\\(${escaped}\\)`, 'i'), '').trim();
    }

    const fullDisplayName = cleanVar ? `${baseName} (${cleanVar})` : rawName;

    const handleMouseEnter = (e) => {
        const el = e.currentTarget;
        if (el && el.scrollWidth > el.clientWidth) {
            const host = el.closest('td') || el;
            const hostRect = host.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();
            // isAbove: show tooltip above when element is far enough from viewport top
            const isAbove = elRect.bottom > 100;
            const centerX = hostRect.left + (hostRect.width / 2) + 45;
            setTooltipState({
                text: fullDisplayName,
                x: centerX,
                // Anchor to element's BOTTOM so gap is always consistent regardless of row height
                y: isAbove ? elRect.bottom - 4 : elRect.bottom + 8,
                isAbove
            });
        }
    };

    const handleMouseLeave = () => {
        setTooltipState(null);
    };

    const ellipsisStyle = {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    };

    const floatingTooltip = tooltipState && typeof document !== 'undefined' ? ReactDOM.createPortal(
        <div
            style={{
                position: 'fixed',
                left: `${tooltipState.x}px`,
                top: `${tooltipState.y}px`,
                transform: tooltipState.isAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: '600',
                padding: '6px 12px',
                borderRadius: '6px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.2)',
                zIndex: 999999,
                pointerEvents: 'none',
                maxWidth: '420px',
                whiteSpace: 'normal',
                textAlign: 'center',
                lineHeight: 1.4,
                border: '1px solid rgba(255, 255, 255, 0.12)',
            }}
        >
            {tooltipState.text}
            <div
                style={{
                    position: 'absolute',
                    ...(tooltipState.isAbove ? { bottom: '-4px' } : { top: '-4px' }),
                    left: '50%',
                    marginLeft: '-4px',
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#0F172A',
                    transform: 'rotate(45deg)',
                    borderRight: tooltipState.isAbove ? '1px solid rgba(255, 255, 255, 0.12)' : 'none',
                    borderBottom: tooltipState.isAbove ? '1px solid rgba(255, 255, 255, 0.12)' : 'none',
                    borderLeft: !tooltipState.isAbove ? '1px solid rgba(255, 255, 255, 0.12)' : 'none',
                    borderTop: !tooltipState.isAbove ? '1px solid rgba(255, 255, 255, 0.12)' : 'none',
                }}
            />
        </div>,
        document.body
    ) : null;

    if (cleanVar) {
        if (blockVariant) {
            return (
                <>
                    <span 
                        style={{ display: 'block', maxWidth: '100%', cursor: tooltipState ? 'pointer' : 'default', ...style }} 
                        className={className}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                    >
                        <span style={{ display: 'block', fontWeight: '600', color: 'var(--table-text-primary)', ...ellipsisStyle }}>
                            {baseName}
                        </span>
                        <span style={{ display: 'block', color: '#3B82F6', fontWeight: '500', fontSize: '11px', marginTop: '2px', ...ellipsisStyle }}>
                            ({cleanVar})
                        </span>
                    </span>
                    {floatingTooltip}
                </>
            );
        }
        return (
            <>
                <span 
                    style={{ display: 'block', maxWidth: '100%', fontWeight: '600', cursor: tooltipState ? 'pointer' : 'default', ...ellipsisStyle, ...style }} 
                    className={className}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    {baseName} <span style={{ color: '#3B82F6', fontWeight: '500' }}>({cleanVar})</span>
                </span>
                {floatingTooltip}
            </>
        );
    }

    return (
        <>
            <span 
                style={{ display: 'block', maxWidth: '100%', fontWeight: '600', cursor: tooltipState ? 'pointer' : 'default', ...ellipsisStyle, ...style }} 
                className={className}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {rawName}
            </span>
            {floatingTooltip}
        </>
    );
}
