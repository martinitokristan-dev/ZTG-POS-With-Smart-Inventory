import React from 'react';
import { IconChevron, IconImage } from './ImportIcons';
import { canImport, isSelected, needsAttention } from '../../hooks/useImportReview';
import { formatPrice, hasPrice, priceInputValue } from '../../../../../shared/utils/price';
const unitShort = (uom) => (uom ? uom.replace(/^.*\/\s*/, '') : '');

/**
 * One product on the review list. Click the row to see and edit its variants.
 * Rows whose part number is already in the system are shown for reference and cannot be imported.
 */
export default function ImportFamilyRow({ family, review, thumbnail, categoryNames, priceLabels }) {
    const { updateFamily, updateVariant, expandedKey, setExpandedKey } = review;
    const open = expandedKey === family.key;
    const rows = family.variants;
    const importable = canImport(family);
    const selected = isSelected(family);
    // Totals follow the ticked new rows; when none are ticked, show the file's values so nothing reads as 0.
    const counted = rows.filter(v => v.include && !v.exists);
    const shown = counted.length ? counted : rows;
    const warnings = [...new Set([...(family.warnings || []), ...rows.flatMap(v => v.warnings || [])])];
    const stock = shown.reduce((sum, v) => sum + (parseInt(v.stock, 10) || 0), 0);
    // Price column: Price 1 range of the rows that have one ("—" when none has a Price 1).
    const prices = shown.filter(v => hasPrice(v.price1)).map(v => Number(v.price1));
    const low = prices.length ? Math.min(...prices) : null;
    const high = prices.length ? Math.max(...prices) : null;
    const listId = `imp-cats-${family.key}`;
    const toggle = () => setExpandedKey(open ? null : family.key);
    const newRows = rows.filter(v => !v.exists).length;

    let status = <span className="imp-pill is-ok">Ready</span>;
    if (!importable) status = <span className="imp-pill is-muted">In system</span>;
    else if (family.status === 'exists') status = <span className="imp-pill is-warn">Name exists</span>;
    else if (needsAttention(family)) status = <span className="imp-pill is-warn">{warnings.length} {warnings.length === 1 ? 'note' : 'notes'}</span>;

    let partCell = rows[0].part_no || 'No part no.';
    if (!family.is_simple) {
        partCell = newRows === rows.length ? `${rows.length} variants` : `${rows.length} variants (${newRows} new)`;
    }

    return (
        <div className={`imp-row${selected ? '' : ' is-off'}${open ? ' is-open' : ''}`}>
            <div className="imp-row-main" onClick={toggle} role="button" tabIndex={0} aria-expanded={open}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }}>
                <input type="checkbox" className="imp-check" checked={selected} disabled={!importable}
                    aria-label={importable ? `Import ${family.name}` : `${family.name} is already in the system`}
                    title={importable ? undefined : 'Already in the system'}
                    onClick={(e) => e.stopPropagation()} onChange={(e) => updateFamily(family.key, { include: e.target.checked })} />
                <div className="imp-thumb">{thumbnail ? <img src={thumbnail} alt="" /> : <IconImage />}</div>
                <div className="imp-name">
                    <strong title={family.name}>{family.name}</strong>
                    <span>{[family.brand, family.category].filter(Boolean).join(' · ')}</span>
                </div>
                <div className="imp-cell imp-hide-sm">{partCell}</div>
                <div className="imp-num imp-hide-sm">{stock} <span className="imp-sub" style={{ display: 'inline' }}>{unitShort(family.uom)}</span></div>
                <div className="imp-num imp-hide-sm">{low === high ? formatPrice(low) : `${formatPrice(low)} – ${formatPrice(high)}`}</div>
                <div>{status}</div>
                <IconChevron />
            </div>

            {open && (
                <div className="imp-detail">
                    {warnings.length > 0 && <ul className="imp-notes">{warnings.map(w => <li key={w}>{w}</li>)}</ul>}

                    <div className="imp-fields">
                        <Field label="Product name" value={family.name} max={255} disabled={!importable} onChange={(v) => updateFamily(family.key, { name: v })} />
                        <Field label="Brand" value={family.brand || ''} max={100} placeholder="No brand" disabled={!importable} onChange={(v) => updateFamily(family.key, { brand: v })} />
                        <Field label="Category" value={family.category} max={100} list={listId} disabled={!importable} onChange={(v) => updateFamily(family.key, { category: v })} />
                        <Field label="Chinese name" value={family.chinese_name || ''} max={255} disabled={!importable} onChange={(v) => updateFamily(family.key, { chinese_name: v })} />
                        <datalist id={listId}>{categoryNames.map(n => <option key={n} value={n} />)}</datalist>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table className="imp-vtable">
                            <thead>
                                <tr>
                                    {!family.is_simple && <th style={{ width: 30 }} aria-label="Include" />}
                                    <th>{family.is_simple ? 'Details' : 'Variant'}</th>
                                    <th>Part no.</th>
                                    <th className="is-right">Stock</th>
                                    <th className="is-right">{priceLabels.price1}</th>
                                    <th className="is-right">{priceLabels.price2}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(v => (
                                    <VariantRow key={v.key} v={v} family={family} priceLabels={priceLabels}
                                        onChange={(changes) => updateVariant(family.key, v.key, changes)} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

function VariantRow({ v, family, priceLabels, onChange }) {
    const locked = !!v.exists;
    return (
        <tr className={v.include && !locked ? '' : 'is-off'}>
            {!family.is_simple && (
                <td><input type="checkbox" className="imp-check" checked={!!v.include && !locked} disabled={locked}
                    aria-label={`Import row ${v.row}`} onChange={(e) => onChange({ include: e.target.checked })} /></td>
            )}
            <td>
                {v.options?.length
                    ? <div className="imp-tags">{v.options.map(o => <span key={o.type} className="imp-tag" title={o.type}>{o.value}</span>)}</div>
                    : <span style={{ color: 'var(--text-secondary)' }}>{family.is_simple ? 'Single product' : 'No details'}</span>}
                <span className="imp-sub">
                    {v.sheet} row {v.row}
                    {locked && v.existing ? ` · In system as "${v.existing.name}", stock ${v.existing.stock}` : (v.notes ? ` · ${v.notes.split('\n')[0]}` : '')}
                </span>
            </td>
            <td><input className="imp-input" style={{ minWidth: 130 }} value={v.part_no || ''} maxLength={50} placeholder="None" aria-label="Part number"
                disabled={locked} onChange={(e) => onChange({ part_no: e.target.value })} /></td>
            <td className="is-right"><Num value={v.stock} step="1" width={74} label="Stock" disabled={locked} onChange={(val) => onChange({ stock: val })} />
                <span className="imp-sub">{unitShort(v.uom)}</span></td>
            {/* Empty price = not in the file: the box stays blank and is saved empty (never 0). */}
            <td className="is-right"><Num value={priceInputValue(v.price1)} step="0.01" width={96} label={priceLabels.price1} placeholder="—" disabled={locked} onChange={(val) => onChange({ price1: val === '' ? null : val })} /></td>
            <td className="is-right"><Num value={priceInputValue(v.price2)} step="0.01" width={96} label={priceLabels.price2} placeholder="—" disabled={locked} onChange={(val) => onChange({ price2: val === '' ? null : val })} /></td>
        </tr>
    );
}

function Field({ label, value, onChange, max, list, placeholder, disabled }) {
    return (
        <label className="imp-field">
            {label}
            <input className="imp-input" value={value} maxLength={max} list={list} placeholder={placeholder} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
        </label>
    );
}

function Num({ value, onChange, step, width, label, disabled, placeholder }) {
    return (
        <input type="number" min="0" step={step} className="imp-input is-num" style={{ width }} value={value} aria-label={label} placeholder={placeholder}
            disabled={disabled} onChange={(e) => onChange(e.target.value)} />
    );
}
