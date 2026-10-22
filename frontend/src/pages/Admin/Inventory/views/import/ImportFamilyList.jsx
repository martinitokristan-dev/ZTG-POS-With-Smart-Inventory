import React from 'react';
import ImportFamilyRow from './ImportFamilyRow';
import { IconSearch } from './ImportIcons';
import { canImport, isSelected } from '../../hooks/useImportReview';

/**
 * Searchable, filterable, paged list of products found in the file.
 */
export default function ImportFamilyList({ review, thumbnails, categoryNames, priceLabels }) {
    const { visibleFamilies, filtered, filter, setFilter, query, setQuery, page, setPage, pageCount, totals, setShownIncluded } = review;

    const filters = [
        ['all', 'All', totals.all],
        ['variants', 'With variants', totals.withVariants],
        ['attention', 'Need a look', totals.attention],
        ['existing', 'Already in system', totals.existing],
    ].filter(([key, , count]) => key === 'all' || count > 0 || filter === key);

    const selectable = filtered.filter(canImport);
    const shownKeys = selectable.map(f => f.key);
    const allShownSelected = selectable.length > 0 && selectable.every(isSelected);

    return (
        <>
            <div className="imp-toolbar">
                <div className="imp-search">
                    <IconSearch />
                    <input className="imp-input" placeholder="Search name, brand, category or part no." value={query}
                        onChange={(e) => setQuery(e.target.value)} aria-label="Search products" />
                </div>
                <div className="imp-seg" role="group" aria-label="Filter products">
                    {filters.map(([key, label, count]) => (
                        <button key={key} type="button" aria-pressed={filter === key} className={filter === key ? 'is-active' : ''} onClick={() => setFilter(key)}>
                            {label}{key !== 'all' ? ` (${count})` : ''}
                        </button>
                    ))}
                </div>
            </div>

            <div className="imp-list">
                <div className="imp-list-head">
                    <input type="checkbox" className="imp-check" checked={allShownSelected} disabled={!selectable.length}
                        onChange={(e) => setShownIncluded(shownKeys, e.target.checked)}
                        aria-label={allShownSelected ? 'Unselect all shown products' : 'Select all shown products'} />
                    <span />
                    <span>Product</span>
                    <span>Part no.</span>
                    <span className="is-right">Stock</span>
                    <span className="is-right">{priceLabels.price1}</span>
                    <span>Status</span>
                    <span />
                </div>
                {visibleFamilies.length === 0 && <div className="imp-empty">No products match your search.</div>}
                {visibleFamilies.map(family => (
                    <ImportFamilyRow key={family.key} family={family} review={review} categoryNames={categoryNames} priceLabels={priceLabels}
                        thumbnail={family.image ? thumbnails?.[family.image] : null} />
                ))}
            </div>

            {pageCount > 1 && (
                <div className="imp-pager">
                    <button type="button" className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
                    <span>Page {page} of {pageCount}</span>
                    <button type="button" className="btn btn-sm btn-secondary" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>Next</button>
                </div>
            )}
        </>
    );
}
