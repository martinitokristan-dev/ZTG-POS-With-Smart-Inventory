import React from 'react';
import ImportFamilyList from './ImportFamilyList';
import ImportSettingsPanel from './ImportSettingsPanel';
import ImportColumnsPanel from './ImportColumnsPanel';
import { IconInfo } from './ImportIcons';

/**
 * Step 2: everything found in the file, before anything is saved.
 * Tabs: Products (edit / untick), New Items (brands, categories, options, units), Columns.
 */
export default function ImportReviewStep({ flow, categoryNames, priceLabels }) {
    const { preview, review, reviewTab, setReviewTab } = flow;
    const plan = preview?.plan || {};
    const stats = plan.stats || {};
    const entities = plan.entities || {};
    const newCount = ['brands', 'categories', 'options', 'units']
        .reduce((sum, k) => sum + (entities[k] || []).filter(e => e.is_new).length, 0);
    const sheetsUsed = (preview?.sheets || []).filter(s => s.enabled).length;
    const typoCount = stats.possible_typos || 0;

    const notes = [
        stats.duplicates_merged > 0 && `${stats.duplicates_merged} repeated ${stats.duplicates_merged === 1 ? 'row was' : 'rows were'} merged.`,
        stats.existing_skipped > 0 && `${stats.existing_skipped} ${stats.existing_skipped === 1 ? 'product is' : 'products are'} already in the system and not selected.`,
        // Prices are copied exactly: an empty cell stays empty (shown as —) and is never filled with the other price.
        stats.price1_missing > 0 && `${stats.price1_missing} ${stats.price1_missing === 1 ? 'row has' : 'rows have'} no ${priceLabels.price1}; it stays empty and cannot be sold at that price until you set it.`,
        stats.price2_missing > 0 && `${stats.price2_missing} ${stats.price2_missing === 1 ? 'row has' : 'rows have'} no ${priceLabels.price2}; it stays empty and cannot be sold at that price until you set it.`,
    ].filter(Boolean);

    const tabs = [
        ['products', 'Products', review.totals.all],
        ['settings', 'New Items', newCount],
        ['columns', 'Columns', sheetsUsed],
    ];

    return (
        <>
            <div className={`imp-stats${typoCount ? ' has-typos' : ''}`}>
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
                    <div className="imp-stat-label">New items (brands, categories, options, units)</div>
                </button>
                <button type="button" className={`imp-stat${review.totals.attention ? ' is-warn' : ''}`}
                    onClick={() => { setReviewTab('products'); review.setFilter('attention'); }}>
                    <div className="imp-stat-value">{review.totals.attention}</div>
                    <div className="imp-stat-label">Need a quick look</div>
                </button>
                {typoCount > 0 && (
                    <button type="button" className="imp-stat is-accent" onClick={() => setReviewTab('settings')}>
                        <div className="imp-stat-value">{typoCount}</div>
                        <div className="imp-stat-label">Possible {typoCount === 1 ? 'typo' : 'typos'} in brands or categories</div>
                    </button>
                )}
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
                <ImportSettingsPanel entities={entities} decisions={flow.shownDecisions} confirmed={flow.decisions}
                    onToggle={flow.toggleDecision} onFixAll={flow.acceptSuggestions} busy={flow.busy} syncing={flow.syncing} />
            )}
            {reviewTab === 'columns' && <ImportColumnsPanel flow={flow} />}
        </>
    );
}
