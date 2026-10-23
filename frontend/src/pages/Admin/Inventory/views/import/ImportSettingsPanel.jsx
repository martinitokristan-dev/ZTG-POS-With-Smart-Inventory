import React, { useState } from 'react';
import { IMPORT_VARIANT_TYPES } from '../../hooks/importConstants';
import { IconArrowRight, IconCheck, IconSpellCheck } from './ImportIcons';

const same = (a, b) => (a || '').toLowerCase() === (b || '').toLowerCase();
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/**
 * Everything the import will add to Settings, next to what it reuses.
 * Click a NEW item to correct it; corrections re-check the file.
 * New brands / categories that look misspelled are listed first in their own group, with
 * "Use <suggestion>" / "Keep", and can all be fixed with one click.
 */
export default function ImportSettingsPanel({ entities, decisions, confirmed, onToggle, onFixAll, busy, syncing }) {
    const { brands = [], categories = [], options = [], units = [] } = entities;
    // Names the user already decided on (shown at once, before the server has re-checked the file).
    const decidedBrands = new Set([
        ...decisions.brand_renames.map(r => r.from), ...decisions.kept_brands, ...decisions.rejected_brands,
    ].map(n => String(n).toLowerCase()));
    const decidedCategories = new Set([...decisions.category_renames.map(r => r.from), ...decisions.kept_categories].map(n => String(n).toLowerCase()));
    const open = (list, decided) => list.map(e => (e.suggestion && decided.has(e.name.toLowerCase()) ? { ...e, suggestion: null, pending: true } : e));
    const shownBrands = open(brands, decidedBrands);
    const shownCategories = open(categories, decidedCategories);
    const isConfirmed = (listName, test) => (confirmed?.[listName] || []).some(test);
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
    const renameBrand = (from, to) => onToggle('brand_renames', { from, to }, (i) => same(i.from, from));
    const keepBrand = (name) => onToggle('kept_brands', name, (i) => same(i, name));
    const keepCategory = (name) => onToggle('kept_categories', name, (i) => same(i, name));

    const byType = options.reduce((acc, o) => { (acc[o.type] = acc[o.type] || []).push(o); return acc; }, {});
    const isActive = (kind, item) => active?.kind === kind && same(active.item.name ?? active.item.value, item.name ?? item.value) && same(active.item.type, item.type);
    const typoCount = [...shownBrands, ...shownCategories].filter(e => e.suggestion).length;
    const shownEntities = { ...entities, brands: shownBrands, categories: shownCategories };
    // The bar stays (as "Spelling checked") once typos were decided, so the layout does not jump.
    const hadTypos = typoCount > 0 || decidedBrands.size > 0 || decidedCategories.size > 0;

    return (
        <div className="imp-groups">
            {hadTypos && (
                <div className={`imp-spell${typoCount === 0 ? ' is-done' : ''}`} role="status" aria-live="polite">
                    <span className="imp-spell-icon">{typoCount === 0 ? <IconCheck size={16} /> : <IconSpellCheck />}</span>
                    <div className="imp-spell-text">
                        {typoCount > 0 ? (
                            <>
                                <strong>{plural(typoCount, 'name looks', 'names look')} misspelled</strong>
                                <span>Nothing is changed until you choose. Fix them one by one below, or use every suggested spelling at once.</span>
                            </>
                        ) : (
                            <>
                                <strong>Spelling checked</strong>
                                <span>{syncing ? 'Updating the list with your choices...' : 'Every possible typo has been decided. You can still undo a choice below.'}</span>
                            </>
                        )}
                    </div>
                    {typoCount > 0 && (
                        <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={() => onFixAll(shownEntities)}>
                            Fix all {typoCount}
                        </button>
                    )}
                </div>
            )}

            <Group title="Brands" items={brands}>
                <Typos items={shownBrands} onUse={renameBrand} onKeep={keepBrand} onReject={rejectBrand} onUseAll={() => onFixAll(shownEntities, ['brands'])} busy={busy} />
                <Chips items={shownBrands} kind="brand" onPick={pick} isActive={isActive} busy={busy} />
                {active?.kind === 'brand' && (
                    <form className="imp-popover" onSubmit={(e) => { e.preventDefault(); const to = rename.trim(); if (to && to !== active.item.name) renameBrand(active.item.name, to); close(); }}>
                        <span style={{ fontSize: 12.5 }}>Rename to</span>
                        <input className="imp-input" style={{ flex: 1, minWidth: 160 }} value={rename} maxLength={100} autoFocus
                            onChange={(e) => setRename(e.target.value)} aria-label={`New name for ${active.item.name}`} />
                        <button type="submit" className="btn btn-sm btn-primary" disabled={busy}>Rename</button>
                        <button type="button" className="btn btn-sm btn-danger-outline" disabled={busy} onClick={() => { rejectBrand(active.item.name); close(); }}>Not a brand</button>
                        <button type="button" className="imp-link" onClick={close}>Cancel</button>
                    </form>
                )}
                <form className="imp-inline-form" onSubmit={(e) => { e.preventDefault(); const v = extraBrand.trim(); if (v) { onToggle('extra_brands', v, (i) => same(i, v)); setExtraBrand(''); } }}>
                    <input className="imp-input" placeholder="Brand that was missed, e.g. SINOTRUK" value={extraBrand} maxLength={100}
                        onChange={(e) => setExtraBrand(e.target.value)} aria-label="Brand name to detect" />
                    <button type="submit" className="btn btn-sm btn-secondary" disabled={busy || !extraBrand.trim()}>Find it</button>
                </form>
                <Changes items={[
                    ...decisions.brand_renames.map(r => ({ from: r.from, to: r.to, undo: () => renameBrand(r.from, r.to), pending: !isConfirmed('brand_renames', i => same(i.from, r.from) && same(i.to, r.to)) })),
                    ...decisions.kept_brands.map(n => ({ from: n, note: 'kept as new', undo: () => keepBrand(n), pending: !isConfirmed('kept_brands', i => same(i, n)) })),
                    ...decisions.rejected_brands.map(n => ({ from: n, note: 'is not a brand', undo: () => rejectBrand(n), pending: !isConfirmed('rejected_brands', i => same(i, n)) })),
                ]} busy={busy} />
            </Group>

            <Group title="Categories" items={categories}>
                <Typos items={shownCategories} onUse={renameCategory} onKeep={keepCategory} onUseAll={() => onFixAll(shownEntities, ['categories'])} busy={busy} />
                <Chips items={shownCategories} kind="category" onPick={pick} isActive={isActive} busy={busy} />
                {active?.kind === 'category' && (
                    <form className="imp-popover" onSubmit={(e) => { e.preventDefault(); const to = rename.trim(); if (to && to !== active.item.name) renameCategory(active.item.name, to); close(); }}>
                        <span style={{ fontSize: 12.5 }}>Rename to</span>
                        <input className="imp-input" style={{ flex: 1, minWidth: 160 }} value={rename} maxLength={100} autoFocus
                            onChange={(e) => setRename(e.target.value)} aria-label={`New name for ${active.item.name}`} />
                        <button type="submit" className="btn btn-sm btn-primary" disabled={busy}>Rename</button>
                        <button type="button" className="imp-link" onClick={close}>Cancel</button>
                    </form>
                )}
                <Changes items={[
                    ...decisions.category_renames.map(r => ({ from: r.from, to: r.to, undo: () => renameCategory(r.from, r.to), pending: !isConfirmed('category_renames', i => same(i.from, r.from) && same(i.to, r.to)) })),
                    ...decisions.kept_categories.map(n => ({ from: n, note: 'kept as new', undo: () => keepCategory(n), pending: !isConfirmed('kept_categories', i => same(i, n)) })),
                ]} busy={busy} />
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
                    ...decisions.rejected_options.map(o => ({ from: o.value, note: 'is not a variant', undo: () => rejectOption(o) })),
                    ...decisions.moved_options.map(o => ({ from: o.value, note: `moved to ${o.to_type}`, undo: () => moveOption(o, o.to_type) })),
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

// New items are clickable to correct; existing ones are shown for reference.
function Chips({ items, kind, onPick, isActive, busy }) {
    if (!items.length) return <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>None in this file.</div>;
    const sorted = [...items].sort((a, b) => Number(b.is_new) - Number(a.is_new));
    return (
        <div className="imp-chips">
            {sorted.map(item => {
                const label = item.name ?? item.value;
                const clickable = item.is_new && onPick && !busy;
                return (
                    <button key={`${item.type || ''}${label}`} type="button" disabled={!clickable || item.pending}
                        className={`imp-chip${item.is_new ? ' is-new' : ''}${item.pending ? ' is-pending' : ''}`} aria-pressed={isActive ? isActive(kind, item) : undefined}
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

// Misspelled-looking names: "HOWOO -> HOWO" with Use / Keep. Nothing changes until the user chooses.
// Brands read from the product names (after a dash or in brackets) can also be marked "Not a brand".
function Typos({ items, onUse, onKeep, onReject, onUseAll, busy }) {
    const typos = items.filter(i => i.suggestion);
    if (!typos.length) return null;
    return (
        <div className="imp-typos">
            <div className="imp-typos-head">
                <span>Possible typos <b>{typos.length}</b></span>
                {typos.length > 1 && <button type="button" className="imp-link" disabled={busy} onClick={onUseAll}>Use all suggestions</button>}
            </div>
            <ul className="imp-typo-list">
                {typos.map(item => {
                    const to = item.suggestion.name;
                    return (
                        <li key={item.name} className="imp-typo">
                            <div className="imp-typo-names">
                                <span className="imp-typo-from" title="Spelling in the file">{item.name}</span>
                                <IconArrowRight />
                                <span className="imp-typo-to" title={item.suggestion.existing ? 'Already in Settings' : 'Known name, not in Settings yet'}>{to}</span>
                                <span className="imp-typo-meta">
                                    {plural(item.count, 'product', 'products')}{item.suggestion.existing ? '' : ' · will be added'}
                                </span>
                            </div>
                            <div className="imp-typo-actions">
                                <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={() => onUse(item.name, to)}>Use {to}</button>
                                <button type="button" className="btn btn-sm btn-secondary" disabled={busy} onClick={() => onKeep(item.name)} title={`Add ${item.name} as a new name`}>Keep</button>
                                {onReject && item.learned && (
                                    <button type="button" className="imp-link is-muted" disabled={busy} onClick={() => onReject(item.name)}>Not a brand</button>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

// Corrections already chosen, each with Undo.
function Changes({ items, busy }) {
    if (!items.length) return null;
    return (
        <ul className="imp-changes">
            {items.map(c => (
                <li key={`${c.from}|${c.to || c.note}`} className={c.pending ? 'is-pending' : undefined} title={c.pending ? 'Updating the list...' : undefined}>
                    <span className="imp-changes-icon">{c.pending ? <span className="imp-dot-spin" aria-hidden="true" /> : <IconCheck size={11} />}</span>
                    {c.to ? <><s>{c.from}</s> <IconArrowRight size={12} /> <strong>{c.to}</strong></> : <><strong>{c.from}</strong> {c.note}</>}
                    <button type="button" className="imp-link" disabled={busy} onClick={c.undo}>Undo</button>
                </li>
            ))}
        </ul>
    );
}
