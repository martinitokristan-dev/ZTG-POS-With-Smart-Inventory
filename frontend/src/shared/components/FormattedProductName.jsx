import React from 'react';

/**
 * Renders product name with variant highlighted in blue (#3B82F6),
 * matching the design system established in Product Management.
 */
export default function FormattedProductName({ name, variantOption, style = {}, className = '' }) {
    if (!name) return <span style={style} className={className}>—</span>;

    const rawName = String(name).trim();

    if (variantOption) {
        const cleanVar = String(variantOption).trim();
        const escaped = cleanVar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const baseName = rawName.replace(new RegExp(`\\s*\\(${escaped}\\)`, 'i'), '').trim();
        return (
            <span style={{ fontWeight: '600', ...style }} className={className}>
                {baseName} <span style={{ color: '#3B82F6', fontWeight: '500' }}>({cleanVar})</span>
            </span>
        );
    }

    const match = rawName.match(/^(.*?)\s*\((.*?)\)$/);
    if (match) {
        const [, baseName, varOpt] = match;
        return (
            <span style={{ fontWeight: '600', ...style }} className={className}>
                {baseName} <span style={{ color: '#3B82F6', fontWeight: '500' }}>({varOpt})</span>
            </span>
        );
    }

    return <span style={{ fontWeight: '600', ...style }} className={className}>{rawName}</span>;
}
