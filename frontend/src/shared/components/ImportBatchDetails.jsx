import React, { useState } from 'react';
import useImportBatchDetails from '../hooks/useImportBatchDetails';
import useSystemSettings from '../hooks/useSystemSettings';
import { formatPrice } from '../utils/price';
import './ImportBatchDetails.css';

// "₱1,250" or "—" for an empty price (never shown as ₱0).
const peso = (v) => formatPrice(v);
const unitShort = (uom) => (uom ? uom.replace(/^.*\/\s*/, '') : '');

/**
 * Everything one Excel import created: totals, then a searchable, paged product list.
 * Click a product to see its variants.
 *
 * @param {{ batchId: number, showSummary?: boolean }} props
 */
export default function ImportBatchDetails({ batchId, showSummary = true }) {
    const { data, loading, error, page, setPage, search, setSearch } = useImportBatchDetails(batchId);
    const { price1_label, price2_label } = useSystemSettings();
    const [openId, setOpenId] = useState(null);

    if (error) return <div className="ibd-failed" role="alert">{error}</div>;
    if (!data) return <div className="ibd-empty">{loading ? 'Loading imported products...' : ''}</div>;

    const { batch, summary, products } = data;
    const undone = batch.status === 'undone';

    return (
        <div className="ibd">
            {showSummary && (
                <div className="ibd-summary">
                    <Tile value={batch.products_created} label="Products" />
                    <Tile value={batch.variants_created} label="Variants" />
                    <Tile value={summary.stock.toLocaleString()} label="Total stock" />
                    <Tile value={summary.brands} label="New brands" />
                    <Tile value={summary.categories} label="New categories" />
                    <Tile value={summary.options} label="New variant options" />
                </div>
            )}

            {summary.failed?.length > 0 && (
                <div className="ibd-failed">
                    <strong>{summary.failed.length} could not be saved:</strong>{' '}
                    {summary.failed.slice(0, 5).map(f => `${f.name} (${f.message})`).join('; ')}
                    {summary.failed.length > 5 ? ` and ${summary.failed.length - 5} more.` : ''}
                </div>
            )}

            {undone ? (
                <div className="ibd-empty">This import was undone, so its products are no longer in the system.</div>
            ) : (
                <>
                    <div className="ibd-search">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search imported products, part no., brand or category" aria-label="Search imported products" />
                    </div>

                    <div className="ibd-list" aria-busy={loading}>
                        {products.data.length === 0 && <div className="ibd-empty">{loading ? 'Loading...' : 'No products match your search.'}</div>}
                        {products.data.map(p => {
                            const open = openId === p.id;
                            const hasVariants = p.variants.length > 0;
                            return (
                                <div key={p.id} className={`ibd-item${open ? ' is-open' : ''}`}>
                                    <button type="button" className="ibd-main" disabled={!hasVariants} aria-expanded={hasVariants ? open : undefined}
                                        onClick={() => setOpenId(open ? null : p.id)}>
                                        <span className="ibd-thumb">
                                            {p.image
                                                ? <img src={p.image} alt="" />
                                                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>}
                                        </span>
                                        <span className="ibd-name">
                                            <strong>{p.name}</strong>
                                            <span>{[p.brand, p.category].filter(Boolean).join(' · ')}</span>
                                        </span>
                                        <span className="ibd-cell ibd-hide-sm">{hasVariants ? `${p.variants.length} variants` : (p.part_no || '—')}</span>
                                        <span className="ibd-num">{p.stock} <small style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{unitShort(p.uom)}</small></span>
                                        <span className="ibd-num ibd-hide-sm">{hasVariants && p.price1 !== null && p.price1 !== undefined ? `from ${peso(p.price1)}` : peso(p.price1)}</span>
                                        <span className="ibd-chevron" aria-hidden="true">
                                            {hasVariants && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>}
                                        </span>
                                    </button>
                                    {open && (
                                        <table className="ibd-variants">
                                            <thead><tr><th>Variant</th><th>Part no.</th><th className="is-right">Stock</th><th className="is-right">{price1_label || 'Price 1'}</th><th className="is-right">{price2_label || 'Price 2'}</th></tr></thead>
                                            <tbody>
                                                {p.variants.map(v => (
                                                    <tr key={v.id}>
                                                        <td>{v.label}</td>
                                                        <td>{v.part_no || '—'}</td>
                                                        <td className="is-right">{v.stock} {unitShort(v.uom)}</td>
                                                        <td className="is-right">{peso(v.price1)}</td>
                                                        <td className="is-right">{peso(v.price2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {products.last_page > 1 && (
                        <div className="ibd-pager">
                            <span>Page {products.current_page} of {products.last_page} · {products.total.toLocaleString()} products</span>
                            <div>
                                <button type="button" className="btn btn-sm btn-secondary" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>Previous</button>
                                <button type="button" className="btn btn-sm btn-secondary" disabled={page >= products.last_page || loading} onClick={() => setPage(page + 1)}>Next</button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function Tile({ value, label }) {
    return <div className="ibd-tile"><strong>{value}</strong><span>{label}</span></div>;
}
