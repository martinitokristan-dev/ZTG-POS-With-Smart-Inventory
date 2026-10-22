import React from 'react';
import ImportFamilyList from './ImportFamilyList';
import ImportSettingsPanel from './ImportSettingsPanel';
import ImportColumnsPanel from './ImportColumnsPanel';
import { IconInfo } from './ImportIcons';

/**
 * Step 2: everything found in the file, before anything is saved.
 * Tabs: Products (edit / untick), New in Settings (brands, categories, options, units), Columns.
 */
export default function ImportReviewStep({ flow, categoryNames, priceLabels }) {
    const { preview, review, reviewTab, setReviewTab } = flow;
    const plan = preview?.plan || {};
    const stats = plan.stats || {};
    const entities = plan.entities || {};
    const newCount = ['brands', 'categories', 'options', 'units']
        .reduce((sum, k) => sum + (entities[k] || []).filter(e => e.is_new).length, 0);
    const sheetsUsed = (preview?.sheets || []).filter(s => s.enabled).length;

    const notes = [
        stats.duplicates_merged > 0 && `${stats.duplicates_merged} repeated ${stats.duplicates_merged === 1 ? 'row was' : 'rows were'} merged.`,
        stats.existing_skipped > 0 && `${stats.existing_skipped} ${stats.existing_skipped === 1 ? 'product is' : 'products are'} already in the system and not selected.`,
        stats.prices_copied > 0 && `${stats.prices_copied} empty price ${stats.prices_copied === 1 ? 'cell was' : 'cells were'} filled with the other price.`,
    ].filter(Boolean);

    const tabs = [
        ['products', 'Products', review.totals.all],
        ['settings', 'New in Settings', newCount],
        ['columns', 'Columns', sheetsUsed],
    ];

    return (
        <>
            <div className="imp-stats">
                <div className="imp-stat">
                    <div className="imp-stat-value">{review.totals.selected}</div>
                    <div className="imp-stat-label">New products to import, from {stats.rows || 0} rows</div>
                </div>
                <div className="imp-stat">
                    <div className="imp-stat-value">{review.totals.variants}</div>
                    <div className="imp-stat-label">Variants (sizes, sides, colours...)</div>
                </div>
                <button type="button" className="imp-stat" onClick={() => setReviewTab('settings')}>
                    <div className="imp-stat-value">{newCount}</div>
                    <div className="imp-stat-label">New items for Settings</div>
                </button>
                <button type="button" className={`imp-stat${review.totals.attention ? ' is-warn' : ''}`}
                    onClick={() => { setReviewTab('products'); review.setFilter('attention'); }}>
                    <div className="imp-stat-value">{review.totals.attention}</div>
                    <div className="imp-stat-label">Need a quick look</div>
                </button>
            </div>

            {review.totals.all > 0 && review.totals.importable === 0 && (
                <div className="imp-alert is-info"><IconInfo />
                    <span>Every part number in this file is already in the system, so nothing new will be added. Stock of existing products is never changed by an import; use Restock for that.</span>
                </div>
            )}
            {notes.length > 0 && (
                <div className="imp-alert is-info"><IconInfo /><span>{notes.join(' ')}</span></div>
            )}

            <div className="imp-tabs" role="tablist" aria-label="Review sections">
                {tabs.map(([key, label, count]) => (
                    <button key={key} type="button" role="tab" aria-selected={reviewTab === key}
                        className={`imp-tab${reviewTab === key ? ' is-active' : ''}`} onClick={() => setReviewTab(key)}>
                        {label}<span className="imp-tab-count">{count}</span>
                    </button>
                ))}
            </div>

            {reviewTab === 'products' && (
                <ImportFamilyList review={review} thumbnails={preview?.thumbnails} categoryNames={categoryNames} priceLabels={priceLabels} />
            )}
            {reviewTab === 'settings' && (
                <ImportSettingsPanel entities={entities} decisions={flow.decisions} onToggle={flow.toggleDecision} busy={flow.busy} />
            )}
            {reviewTab === 'columns' && <ImportColumnsPanel flow={flow} />}
        </>
    );
}
