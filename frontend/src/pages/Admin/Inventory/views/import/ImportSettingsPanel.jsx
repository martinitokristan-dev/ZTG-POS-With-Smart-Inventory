import React, { useState } from 'react';
import { IMPORT_VARIANT_TYPES } from '../../hooks/importConstants';

const same = (a, b) => (a || '').toLowerCase() === (b || '').toLowerCase();

/**
 * Everything the import will add to Settings, next to what it reuses.
 * Click a NEW item to correct it; corrections re-check the file.
 */
export default function ImportSettingsPanel({ entities, decisions, onToggle, busy }) {
    const { brands = [], categories = [], options = [], units = [] } = entities;
    const [active, setActive] = useState(null); // { kind, item }
    const [rename, setRename] = useState('');
    const [extraBrand, setExtraBrand] = useState('');

    const pick = (kind, item) => {
        const isSame = active && active.kind === kind && same(active.item.name ?? active.item.value, item.name ?? item.value) && same(active.item.type, item.type);
        setActive(isSame ? null : { kind, item });
        setRename(item.name || '');
    };
    const close = () => setActive(null);

    const rejectBrand = (name) => onToggle('rejected_brands', name, (i) => same(i, name));
    const rejectOption = (o) => onToggle('rejected_options', { type: o.type, value: o.value }, (i) => same(i.type, o.type) && same(i.value, o.value));
    const moveOption = (o, toType) => onToggle('moved_options', { type: o.type, value: o.value, to_type: toType }, (i) => same(i.type, o.type) && same(i.value, o.value));
    const renameCategory = (from, to) => onToggle('category_renames', { from, to }, (i) => same(i.from, from));

    const byType = options.reduce((acc, o) => { (acc[o.type] = acc[o.type] || []).push(o); return acc; }, {});
    const isActive = (kind, item) => active?.kind === kind && same(active.item.name ?? active.item.value, item.name ?? item.value) && same(active.item.type, item.type);

    return (
        <div className="imp-groups">
            <Group title="Brands" items={brands}>
                <Chips items={brands} kind="brand" onPick={pick} isActive={isActive} busy={busy} />
                {active?.kind === 'brand' && (
                    <div className="imp-popover">
                        <span style={{ fontSize: 12.5 }}>Is <strong>{active.item.name}</strong> not a brand?</span>
                        <button type="button" className="btn btn-sm btn-danger-outline" disabled={busy} onClick={() => { rejectBrand(active.item.name); close(); }}>Not a brand</button>
                        <button type="button" className="imp-link" onClick={close}>Cancel</button>
                    </div>
                )}
                <form className="imp-inline-form" onSubmit={(e) => { e.preventDefault(); const v = extraBrand.trim(); if (v) { onToggle('extra_brands', v, (i) => same(i, v)); setExtraBrand(''); } }}>
                    <input className="imp-input" placeholder="Brand that was missed, e.g. SINOTRUK" value={extraBrand} maxLength={100}
                        onChange={(e) => setExtraBrand(e.target.value)} aria-label="Brand name to detect" />
                    <button type="submit" className="btn btn-sm btn-secondary" disabled={busy || !extraBrand.trim()}>Find it</button>
                </form>
                <Changes items={decisions.rejected_brands.map(n => ({ label: `${n} is not a brand`, undo: () => rejectBrand(n) }))} busy={busy} />
            </Group>

            <Group title="Categories" items={categories}>
                <Chips items={categories} kind="category" onPick={pick} isActive={isActive} busy={busy} />
                {active?.kind === 'category' && (
                    <form className="imp-popover" onSubmit={(e) => { e.preventDefault(); const to = rename.trim(); if (to && to !== active.item.name) renameCategory(active.item.name, to); close(); }}>
                        <span style={{ fontSize: 12.5 }}>Rename to</span>
                        <input className="imp-input" style={{ flex: 1, minWidth: 160 }} value={rename} maxLength={100} autoFocus
                            onChange={(e) => setRename(e.target.value)} aria-label={`New name for ${active.item.name}`} />
                        <button type="submit" className="btn btn-sm btn-primary" disabled={busy}>Rename</button>
                        <button type="button" className="imp-link" onClick={close}>Cancel</button>
                    </form>
                )}
                <Changes items={decisions.category_renames.map(r => ({ label: `${r.from} renamed to ${r.to}`, undo: () => renameCategory(r.from, r.to) }))} busy={busy} />
            </Group>

            <Group title="Variant options" items={options}>
                {Object.entries(byType).map(([type, list]) => (
                    <div key={type}>
                        <div className="imp-subhead">{type}{list[0]?.type_is_new && <span className="imp-pill is-new" style={{ marginLeft: 6 }}>New type</span>}</div>
                        <Chips items={list} kind="option" onPick={pick} isActive={isActive} busy={busy} />
                    </div>
                ))}
                {active?.kind === 'option' && (
                    <div className="imp-popover">
                        <span style={{ fontSize: 12.5 }}><strong>{active.item.value}</strong> is a {active.item.type}.</span>
                        <button type="button" className="btn btn-sm btn-danger-outline" disabled={busy} onClick={() => { rejectOption(active.item); close(); }}>Not a variant</button>
                        {IMPORT_VARIANT_TYPES.filter(t => !same(t, active.item.type)).map(t => (
                            <button key={t} type="button" className="btn btn-sm btn-secondary" disabled={busy} onClick={() => { moveOption(active.item, t); close(); }}>It is a {t}</button>
                        ))}
                        <button type="button" className="imp-link" onClick={close}>Cancel</button>
                    </div>
                )}
                <Changes items={[
                    ...decisions.rejected_options.map(o => ({ label: `${o.value} is not a variant`, undo: () => rejectOption(o) })),
                    ...decisions.moved_options.map(o => ({ label: `${o.value} moved to ${o.to_type}`, undo: () => moveOption(o, o.to_type) })),
                ]} busy={busy} />
            </Group>

            <Group title="Units of measure" items={units} hint="Read from the stock column, for example 2 ROLLS.">
                <Chips items={units} kind="unit" busy={busy} />
            </Group>
        </div>
    );
}

function Group({ title, items, hint, children }) {
    const fresh = items.filter(i => i.is_new).length;
    return (
        <section className="imp-group">
            <div className="imp-group-head">
                <strong>{title}</strong>
                <span>{fresh} new · {items.length - fresh} already in Settings</span>
            </div>
            {hint && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{hint}</div>}
            {children}
        </section>
    );
}

// New items (amber) are clickable to correct; existing ones are shown for reference.
function Chips({ items, kind, onPick, isActive, busy }) {
    if (!items.length) return <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>None in this file.</div>;
    const sorted = [...items].sort((a, b) => Number(b.is_new) - Number(a.is_new));
    return (
        <div className="imp-chips">
            {sorted.map(item => {
                const label = item.name ?? item.value;
                const clickable = item.is_new && onPick && !busy;
                return (
                    <button key={`${item.type || ''}${label}`} type="button" disabled={!clickable}
                        className={`imp-chip${item.is_new ? ' is-new' : ''}`} aria-pressed={isActive ? isActive(kind, item) : undefined}
                        title={item.is_new ? 'Will be added. Click to correct.' : 'Already in Settings'}
                        onClick={() => clickable && onPick(kind, item)}>
                        {label}
                        {item.is_new && <span className="imp-pill is-new" style={{ padding: '0 6px' }}>NEW</span>}
                        <span className="imp-chip-count">{item.count}</span>
                    </button>
                );
            })}
        </div>
    );
}

function Changes({ items, busy }) {
    if (!items.length) return null;
    return (
        <div className="imp-changes">
            {items.map(c => (
                <span key={c.label}>{c.label} <button type="button" className="imp-link" disabled={busy} onClick={c.undo}>Undo</button></span>
            ))}
        </div>
    );
}
