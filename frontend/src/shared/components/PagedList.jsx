import React, { useMemo, useState } from 'react';
import TablePagination from './TablePagination';

/** Lists longer than this get a search box and pages. */
const PAGED_FROM = 10;

/**
 * A list with search and pagination once it grows past 10 items, so long Settings lists
 * (brands, categories, variant options, units) stay quick to scan.
 *
 * @param {object}   props
 * @param {Array}    props.items          Items to show.
 * @param {Function} props.renderItem     (item, originalIndex) => node.
 * @param {Function} props.getKey         (item, originalIndex) => React key.
 * @param {Function} props.getSearchText  item => text matched by the search box.
 * @param {string}   props.noun           Plural label for the pager, e.g. "brands".
 * @param {node}     props.empty          Shown when there are no items at all.
 * @param {object}   [props.style]        Style of the list wrapper.
 */
export default function PagedList({ items = [], renderItem, getKey, getSearchText, noun = 'items', empty = null, style }) {
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(PAGED_FROM);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const indexed = items.map((item, index) => ({ item, index }));
        return q ? indexed.filter(({ item }) => String(getSearchText(item) || '').toLowerCase().includes(q)) : indexed;
    }, [items, query, getSearchText]);

    if (items.length === 0) return empty;

    const paged = items.length > PAGED_FROM;
    const isAll = perPage === 'All';
    const lastPage = isAll ? 1 : Math.max(1, Math.ceil(filtered.length / perPage));
    const current = Math.min(page, lastPage);
    const visible = paged && !isAll ? filtered.slice((current - 1) * perPage, current * perPage) : filtered;

    return (
        <div>
            {paged && (
                <div style={{ position: 'relative', marginBottom: '12px' }}>
                    <svg viewBox="0 0 24 24" aria-hidden="true" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', fill: 'none', stroke: 'var(--text-muted)', strokeWidth: 2 }}>
                        <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input type="text" className="form-control" value={query} placeholder={`Search ${items.length.toLocaleString()} ${noun}...`}
                        aria-label={`Search ${noun}`} style={{ paddingLeft: '36px' }}
                        onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
                </div>
            )}

            <div style={style}>
                {visible.map(({ item, index }) => (
                    <React.Fragment key={getKey(item, index)}>{renderItem(item, index)}</React.Fragment>
                ))}
                {visible.length === 0 && (
                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '8px 0' }}>No {noun} match "{query}".</p>
                )}
            </div>

            {paged && filtered.length > 0 && (
                <TablePagination
                    currentPage={current}
                    totalItems={filtered.length}
                    perPage={perPage}
                    onPageChange={setPage}
                    onPerPageChange={(v) => { setPerPage(v); setPage(1); }}
                    perPageOptions={[10, 20, 50, 100, 'All']}
                    label={noun}
                />
            )}
        </div>
    );
}
