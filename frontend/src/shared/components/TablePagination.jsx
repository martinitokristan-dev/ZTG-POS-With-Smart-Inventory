import React from 'react';

/**
 * Reusable Enterprise Table Pagination Component
 * 
 * @param {number} currentPage - Current active page (1-based)
 * @param {number} totalItems - Total count of items across all pages
 * @param {number|string} perPage - Number of items displayed per page (e.g. 10, 20, 50, 100, 'All')
 * @param {function} onPageChange - Callback when user navigates to a new page
 * @param {function} onPerPageChange - (Optional) Callback when user changes rows per page
 * @param {string} label - (Optional) Item noun (e.g. "items", "records", "orders", "products")
 * @param {Array<number|string>} perPageOptions - (Optional) Selectable page size options
 */
export default function TablePagination({
    currentPage = 1,
    totalItems = 0,
    perPage = 20,
    onPageChange,
    onPerPageChange,
    label = 'items',
    perPageOptions = [10, 20, 50, 100, 'All']
}) {
    const isAll = perPage === 'All' || perPage === 'all' || perPage >= 999999;
    const numericPerPage = isAll ? Math.max(1, totalItems) : Number(perPage) || 20;
    const lastPage = isAll ? 1 : Math.max(1, Math.ceil(totalItems / numericPerPage));
    const activePage = Math.min(Math.max(1, currentPage), lastPage);

    const startItem = totalItems === 0 ? 0 : isAll ? 1 : ((activePage - 1) * numericPerPage) + 1;
    const endItem = totalItems === 0 ? 0 : isAll ? totalItems : Math.min(activePage * numericPerPage, totalItems);

    // Compute visible page number buttons (strictly 3 sliding roller numbers)
    const getPageNumbers = () => {
        if (lastPage <= 3) {
            return Array.from({ length: lastPage }, (_, i) => i + 1);
        }
        if (activePage <= 2) {
            return [1, 2, 3];
        }
        if (activePage >= lastPage - 1) {
            return [lastPage - 2, lastPage - 1, lastPage];
        }
        return [activePage - 1, activePage, activePage + 1];
    };

    return (
        <div 
            className="table-pagination-container"
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '14px 20px',
                background: '#FFFFFF',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                marginTop: '16px',
                fontSize: '13.5px',
                color: 'var(--text-secondary)'
            }}
        >
            {/* Left: Range and Total count */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: '500' }}>
                    Showing page <strong style={{ color: 'var(--text-primary)', fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>{activePage}</strong> of <strong style={{ color: 'var(--text-primary)', fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>{lastPage}</strong> (<strong style={{ color: 'var(--text-primary)', fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>{totalItems.toLocaleString()}</strong> total {label})
                </span>

                {/* Rows per page selector with visible dropdown chevron */}
                {onPerPageChange && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Rows per page:</span>
                        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                            <select
                                value={perPage}
                                onChange={(e) => {
                                    const val = e.target.value === 'All' ? 'All' : Number(e.target.value);
                                    onPerPageChange(val);
                                }}
                                style={{
                                    appearance: 'none',
                                    WebkitAppearance: 'none',
                                    MozAppearance: 'none',
                                    padding: '5px 28px 5px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border)',
                                    background: '#FFFFFF',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                                }}
                            >
                                {perPageOptions.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                            <svg 
                                width="12" 
                                height="12" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="#64748B" 
                                strokeWidth="2.5" 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                style={{ position: 'absolute', right: '8px', pointerEvents: 'none' }}
                            >
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </div>
                    </div>
                )}
            </div>

            {/* Right: Page Navigation Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', userSelect: 'none' }}>
                {/* Previous Button */}
                <button
                    type="button"
                    disabled={activePage <= 1}
                    onClick={() => onPageChange && onPageChange(activePage - 1)}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        background: activePage <= 1 ? '#F8FAFC' : '#FFFFFF',
                        color: activePage <= 1 ? '#94A3B8' : '#0F172A',
                        fontWeight: '600',
                        fontSize: '13px',
                        cursor: activePage <= 1 ? 'not-allowed' : 'pointer',
                        userSelect: 'none'
                    }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                    <span>Prev</span>
                </button>

                {/* Numbered Page Buttons (Stable slots to prevent DOM unmount flicker) */}
                {!isAll && getPageNumbers().map((p, slotIdx) => {
                    const isActive = p === activePage;
                    return (
                        <button
                            key={`slot-${slotIdx}`}
                            type="button"
                            onClick={() => onPageChange && onPageChange(p)}
                            style={{
                                minWidth: '32px',
                                height: '32px',
                                padding: '0 8px',
                                borderRadius: '6px',
                                border: isActive ? '1px solid #2563EB' : '1px solid var(--border)',
                                background: isActive ? '#2563EB' : '#FFFFFF',
                                color: isActive ? '#FFFFFF' : '#0F172A',
                                fontWeight: isActive ? '700' : '500',
                                fontSize: '13px',
                                cursor: 'pointer',
                                fontVariantNumeric: 'tabular-nums',
                                userSelect: 'none'
                            }}
                        >
                            {p}
                        </button>
                    );
                })}

                {/* Next Button */}
                <button
                    type="button"
                    disabled={activePage >= lastPage || isAll}
                    onClick={() => onPageChange && onPageChange(activePage + 1)}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        background: (activePage >= lastPage || isAll) ? '#F8FAFC' : '#FFFFFF',
                        color: (activePage >= lastPage || isAll) ? '#94A3B8' : '#0F172A',
                        fontWeight: '600',
                        fontSize: '13px',
                        cursor: (activePage >= lastPage || isAll) ? 'not-allowed' : 'pointer',
                        userSelect: 'none'
                    }}
                >
                    <span>Next</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
            </div>
        </div>
    );
}
