import React, { useState, useMemo } from 'react';
import { VARIANT_GENERATOR_MAX_COMBINATIONS } from '../../../../config/constants';

// Stable key for a set of option ids, order-independent ("3|7|12").
export const optionSetKey = (ids = []) => [...ids].map(Number).sort((a, b) => a - b).join('|');

// Cartesian product of the picked option ids, one list per variant type.
// Types with nothing picked are skipped, so picking only Sizes gives one row per size.
export const buildCombinations = (pickedLists) => {
    const lists = pickedLists.filter(list => list.length > 0);
    if (lists.length === 0) return [];
    return lists.reduce(
        (acc, list) => acc.flatMap(combo => list.map(id => [...combo, id])),
        [[]]
    );
};

const chipStyle = (active) => ({
    padding: '4px 10px',
    borderRadius: '999px',
    border: active ? '1px solid var(--primary)' : '1px solid var(--border)',
    backgroundColor: active ? 'var(--primary-light, rgba(37, 99, 235, 0.1))' : 'var(--bg-card)',
    color: active ? 'var(--primary)' : 'var(--text-primary)',
    fontSize: '12px',
    fontWeight: active ? 700 : 500,
    cursor: 'pointer',
});

// A price must be a number >= 0; stock and alert level must be whole numbers >= 0. Blank is "not filled".
const isFilledNumber = (v) => v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v)) && Number(v) >= 0;
const isFilledWhole = (v) => isFilledNumber(v) && Number.isInteger(Number(v));

// The product form listens for Enter on the whole window and submits itself. Inside this panel Enter must do nothing.
const ignoreEnter = (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
    }
};

/**
 * "Generate combinations" for the Product Variants section.
 *
 * 1. Pick the options to combine (Size, Quality, ...).
 * 2. Every NEW combination gets its own row with its own price, stock and alert level
 *    (variants differ, so nothing is copied between them).
 * 3. "Add" stays disabled until every required field (*) of every row is filled.
 *
 * Pure UI. The parent owns formData and receives the finished rows through onGenerate(rows), where each row is
 * { option_ids, price1, price2, stock, alert_limit } with numbers already parsed.
 */
export default function VariantGeneratorPanel({
    variantTypes = [],
    existingVariants = [],
    onGenerate,
    price1Label = 'Orig. Price',
    price2Label = 'Retail Price',
    showPrice2 = true,
    defaultAlertLimit = 5,
}) {
    const [open, setOpen] = useState(false);
    const [picked, setPicked] = useState({});   // { [typeId]: [optionId, ...] }
    const [drafts, setDrafts] = useState({});   // { [comboKey]: { price1, price2, stock, alert_limit } }
    const [removed, setRemoved] = useState([]); // combo keys the user dropped from the list

    const optionValue = useMemo(() => {
        const map = new Map();
        variantTypes.forEach(vt => (vt.options || []).forEach(o => map.set(o.id, o.value)));
        return map;
    }, [variantTypes]);

    const togglePick = (typeId, optionId) => {
        setPicked(prev => {
            const current = prev[typeId] || [];
            const next = current.includes(optionId) ? current.filter(id => id !== optionId) : [...current, optionId];
            return { ...prev, [typeId]: next };
        });
        setRemoved([]); // a new selection starts a fresh list
    };

    const { rows, alreadyExist, totalCombos } = useMemo(() => {
        const all = buildCombinations(variantTypes.map(vt => picked[vt.id] || []));
        const existingKeys = new Set(existingVariants.map(v => optionSetKey(v.option_ids || [])));
        const fresh = all.filter(combo => !existingKeys.has(optionSetKey(combo)) && !removed.includes(optionSetKey(combo)));
        return {
            totalCombos: all.length,
            alreadyExist: all.filter(combo => existingKeys.has(optionSetKey(combo))).length,
            rows: fresh.map(ids => ({
                key: optionSetKey(ids),
                ids,
                label: ids.map(id => optionValue.get(id) ?? '?').join(', '),
            })),
        };
    }, [picked, variantTypes, existingVariants, removed, optionValue]);

    const draftOf = (key) => ({ price1: '', price2: '', stock: '', alert_limit: defaultAlertLimit, ...(drafts[key] || {}) });
    const setField = (key, field, value) => setDrafts(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: value } }));

    const rowComplete = (d) => isFilledNumber(d.price1) && (!showPrice2 || isFilledNumber(d.price2))
        && isFilledWhole(d.stock) && isFilledWhole(d.alert_limit);

    const incomplete = rows.filter(r => !rowComplete(draftOf(r.key))).length;
    const tooMany = rows.length > VARIANT_GENERATOR_MAX_COMBINATIONS;
    const canAdd = rows.length > 0 && incomplete === 0 && !tooMany;

    const reset = () => {
        setPicked({});
        setDrafts({});
        setRemoved([]);
        setOpen(false);
    };

    const handleAdd = () => {
        if (!canAdd) return;
        onGenerate(rows.map(r => {
            const d = draftOf(r.key);
            const price1 = parseFloat(d.price1);
            return {
                option_ids: r.ids,
                price1,
                price2: showPrice2 ? parseFloat(d.price2) : price1,
                stock: parseInt(d.stock, 10),
                alert_limit: parseInt(d.alert_limit, 10),
            };
        }));
        reset();
    };

    const canGenerate = variantTypes.some(vt => (vt.options || []).length > 0);
    if (!canGenerate) return null;

    const field = (rowIndex, key, name, label, props = {}) => (
        <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor={`gen-${rowIndex}-${name}`}>{label} <span style={{ color: 'red' }}>*</span></label>
            <input
                id={`gen-${rowIndex}-${name}`}
                type="number"
                min="0"
                className="form-control"
                value={draftOf(key)[name]}
                onChange={(e) => setField(key, name, e.target.value)}
                onKeyDown={ignoreEnter}
                {...props}
            />
        </div>
    );

    let footerHint = '';
    if (totalCombos === 0) footerHint = 'Pick at least one option above.';
    else if (rows.length === 0) footerHint = alreadyExist > 0 ? 'Every one of these combinations already exists.' : 'No variants left to add.';
    else if (tooMany) footerHint = `That is ${rows.length} variants. Please pick fewer (max ${VARIANT_GENERATOR_MAX_COMBINATIONS} at a time).`;
    else if (incomplete > 0) footerHint = `${incomplete} of ${rows.length} still need all required fields (*) filled in.`;
    else footerHint = 'All set. Review the values, then add.';

    return (
        <div style={{ border: '1px dashed var(--border)', borderRadius: '6px', padding: '10px 12px', backgroundColor: 'var(--bg-card)', marginBottom: '12px' }}>
            <button
                type="button"
                onClick={() => (open ? reset() : setOpen(true))}
                aria-expanded={open}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--primary)', fontSize: '12.5px', fontWeight: 700 }}
            >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                </svg>
                Generate combinations
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {open && (
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Step 1: pick the options to combine. Step 2: fill in the price and stock of each variant, because every variant is different.
                    </div>

                    {variantTypes.map(vt => (
                        <div key={vt.id}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>{vt.name}</div>
                            {(vt.options || []).length === 0 ? (
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No options yet.</div>
                            ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {vt.options.map(opt => {
                                        const active = (picked[vt.id] || []).includes(opt.id);
                                        return (
                                            <button key={opt.id} type="button" aria-pressed={active} onClick={() => togglePick(vt.id, opt.id)} style={chipStyle(active)}>
                                                {opt.value}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}

                    {rows.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                            <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                Variants to add ({rows.length}){alreadyExist > 0 ? ` - ${alreadyExist} already exist and are skipped` : ''}
                            </div>
                            {rows.map((row, i) => (
                                <div key={row.key} style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '10px 12px', backgroundColor: 'var(--bg-secondary)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>{row.label}</span>
                                        <button
                                            type="button"
                                            onClick={() => setRemoved(prev => [...prev, row.key])}
                                            aria-label={`Do not add ${row.label}`}
                                            title="Do not add this one"
                                            style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px' }}>
                                        {field(i, row.key, 'price1', price1Label)}
                                        {showPrice2 && field(i, row.key, 'price2', price2Label)}
                                        {field(i, row.key, 'stock', 'Initial Stock', { step: '1' })}
                                        {field(i, row.key, 'alert_limit', 'Alert Lvl', { step: '1' })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                        <span style={{ fontSize: '12px', color: tooMany ? 'var(--danger, #DC2626)' : 'var(--text-secondary)' }} aria-live="polite">{footerHint}</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={reset} style={{ padding: '5px 12px' }}>Cancel</button>
                            <button type="button" className="btn btn-primary btn-sm" onClick={handleAdd} disabled={!canAdd} style={{ padding: '5px 12px' }}>
                                {rows.length === 1 ? 'Add this variant' : `Add ${rows.length || ''} variants`.replace('  ', ' ')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
