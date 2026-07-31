import React from 'react';

/**
 * Renders product name with variant highlighted in blue (#3B82F6),
 * matching the design system established in Product Management.
 */
export default function FormattedProductName({ name, variantOption, blockVariant = false, style = {}, className = '' }) {
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

    if (cleanVar) {
        if (blockVariant) {
            return (
                <span style={{ display: 'inline-block', ...style }} className={className}>
                    <span style={{ display: 'block', fontWeight: '600', color: 'var(--table-text-primary)' }}>{baseName}</span>
                    <span style={{ display: 'block', color: '#3B82F6', fontWeight: '500', fontSize: '11px', marginTop: '2px' }}>({cleanVar})</span>
                </span>
            );
        }
        return (
            <span style={{ fontWeight: '600', ...style }} className={className}>
                {baseName} <span style={{ color: '#3B82F6', fontWeight: '500' }}>({cleanVar})</span>
            </span>
        );
    }

    return <span style={{ fontWeight: '600', ...style }} className={className}>{rawName}</span>;
}
