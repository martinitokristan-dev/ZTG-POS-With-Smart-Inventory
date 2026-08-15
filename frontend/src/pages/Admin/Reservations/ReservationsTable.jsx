import React from 'react';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import StatusBadge from '../../../shared/components/StatusBadge';
import IOSSelect from '../../../shared/components/IOSSelect';
import FormattedProductName from '../../../shared/components/FormattedProductName';

export default function ReservationsTable({
    reservations, loading,
    search, setSearch, handleSearchChange,
    statusFilter, setStatusFilter, handleStatusChange,
    dateFilter = 'today', setDateFilter, handleDateFilterChange,
    page, setPage, pagination,
    fmt, fmtDate,
    openFulfill, openCancel, openDetails, onReprintCR,
    activeTab = 'deposit'
}) {
    return (
        <>
            {/* Filters */}
            <div className="card" style={{ marginBottom: '16px' }}>
                <div className="table-filters" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <input
                            type="text"
                            className="form-control"
                            style={{ padding: '8px 12px', fontSize: '13px' }}
                            placeholder={activeTab === 'deposit' ? "Search for order in china by customer, phone, part no..." : "Search claimed & paid orders by customer, phone, part no..."}
                            value={search}
                            onChange={(e) => handleSearchChange ? handleSearchChange(e.target.value) : setSearch(e.target.value)}
                        />
                    </div>
                    {activeTab === 'completed' && (
                        <div style={{ width: '160px' }}>
                            <IOSSelect
                                value={dateFilter}
                                onChange={(e) => handleDateFilterChange ? handleDateFilterChange(e.target.value) : (setDateFilter && setDateFilter(e.target.value))}
                                options={[
                                    { value: 'today', label: 'Today' },
                                    { value: 'this_week', label: 'This Week' },
                                    { value: 'this_month', label: 'This Month' },
                                    { value: 'this_year', label: 'This Year' },
                                    { value: 'all', label: 'All Time' }
                                ]}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Reservations Table */}
            <div className="card table-card">
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table className="data-table" style={{ minWidth: '950px', width: '100%' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left' }}>Date Order</th>
                                <th style={{ textAlign: 'left' }}>Part Number</th>
                                <th style={{ textAlign: 'left' }}>Description / Part Name</th>
                                <th style={{ textAlign: 'left' }}>Engine Plate No.</th>
                                <th style={{ textAlign: 'center' }}>Qty. Ordered</th>
                                <th style={{ textAlign: 'left' }}>Customer Name</th>
                                <th style={{ textAlign: 'right' }}>Price</th>
                                <th style={{ textAlign: 'right' }}>Total Amount</th>
                                <th style={{ textAlign: 'right' }}>Deposit</th>
                                <th style={{ textAlign: 'right' }}>Payment</th>
                                {activeTab === 'completed' && <th style={{ textAlign: 'left' }}>Date Get</th>}
                                <th style={{ textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody style={{ fontSize: '13px' }}>
                            {(() => {
                                const displayList = reservations.filter(r => {
                                    const rawStatus = (r.status?.value || r.status || '').toLowerCase();
                                    if (activeTab === 'deposit') {
                                        return rawStatus === 'pending';
                                    } else {
                                        return rawStatus === 'completed';
                                    }
                                });

                                if (loading) {
                                    return (
                                        <tr>
                                            <td colSpan={activeTab === 'completed' ? 12 : 11} style={{ padding: '32px' }}>
                                                <LoadingSpinner text={activeTab === 'deposit' ? "Loading orders in China..." : "Loading claimed & paid orders..."} minHeight="100px" />
                                            </td>
                                        </tr>
                                    );
                                }

                                if (displayList.length === 0) {
                                    return (
                                        <tr>
                                            <td colSpan={activeTab === 'completed' ? 12 : 11} style={{ textAlign: 'center', padding: '32px', color: 'var(--table-text-muted)', fontSize: '14px' }}>
                                                {activeTab === 'deposit' ? 'No pending orders in China found.' : 'No claimed & paid orders found.'}
                                            </td>
                                        </tr>
                                    );
                                }

                                return displayList.map(r => {
                                    const rawStatus = (r.status?.value || r.status || '').toLowerCase();
                                    const isPending = rawStatus === 'pending';
                                    const itemsList = Array.isArray(r.items) && r.items.length > 0 ? r.items : [{
                                        product: { part_no: '—', name: r.product_name || '—' },
                                        part_no: '—',
                                        item_name: r.product_name || '—',
                                        qty: r.qty || 1,
                                        price: r.total || 0,
                                        engine_plate_number: r.engine_plate_number || ''
                                    }];

                                    const totalQty = itemsList.reduce((s, i) => s + Number(i.qty || 0), 0) || r.qty || 1;
                                    const unitPrice = itemsList.length === 1 ? Number(itemsList[0].price || 0) : (Number(r.total || 0) / (totalQty || 1));

                                    const depositVal = Number(r.deposit || 0);
                                    const totalVal = Number(r.total || 0);
                                    const balanceVal = Math.max(0, totalVal - depositVal);
                                    const paidVal = balanceVal > 0 ? balancePaid(r, totalVal, depositVal) : totalVal;

                                    function balancePaid(resObj, tot, dep) {
                                        return Math.max(0, tot - dep) || tot;
                                    }

                                    const queryStr = (search || '').trim().toLowerCase();

                                    return (
                                        <tr key={r.id} style={{ minHeight: '48px' }}>
                                            <td style={{ fontSize: '13px', fontWeight: 500, color: 'var(--table-text-secondary)', verticalAlign: 'middle' }}>
                                                {fmtDate(r.date || r.created_at)}
                                            </td>

                                            {/* Part Number Column */}
                                            <td style={{ verticalAlign: 'middle' }}>
                                                {itemsList.length > 1 ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        {itemsList.map((it, iIdx) => {
                                                            const rawPNo = it.product?.part_no || it.part_no;
                                                            const pNo = (!rawPNo || String(rawPNo).trim().toUpperCase() === 'N/A' || String(rawPNo).trim() === '') ? '—' : String(rawPNo).trim();
                                                            const isDash = pNo === '—';
                                                            const isMatch = queryStr && !isDash && (
                                                                pNo.toLowerCase().includes(queryStr) ||
                                                                (it.item_name || it.product?.name || '').toLowerCase().includes(queryStr)
                                                            );
                                                            return (
                                                                <div key={iIdx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                    <span style={{
                                                                        fontWeight: isDash ? 500 : 600,
                                                                        fontSize: '13px',
                                                                        color: isMatch ? '#2563EB' : (isDash ? 'var(--table-text-secondary)' : 'var(--primary)'),
                                                                        backgroundColor: isMatch ? 'rgba(37, 99, 235, 0.12)' : 'transparent',
                                                                        padding: isMatch ? '1px 5px' : '0',
                                                                        borderRadius: '4px',
                                                                        border: isMatch ? '1px solid rgba(37, 99, 235, 0.3)' : 'none'
                                                                    }}>
                                                                        {pNo}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    (() => {
                                                        const rawSingle = itemsList[0]?.product?.part_no || itemsList[0]?.part_no;
                                                        const singlePNo = (!rawSingle || String(rawSingle).trim().toUpperCase() === 'N/A' || String(rawSingle).trim() === '') ? '—' : String(rawSingle).trim();
                                                        const isSingleDash = singlePNo === '—';
                                                        return (
                                                            <span style={{ fontWeight: isSingleDash ? 500 : 600, fontSize: '13px', color: isSingleDash ? 'var(--table-text-secondary)' : 'var(--primary)' }}>
                                                                {singlePNo}
                                                            </span>
                                                        );
                                                    })()
                                                )}
                                            </td>

                                            {/* Description / Part Name Column */}
                                            <td style={{ fontSize: '13px', color: 'var(--table-text-primary)', verticalAlign: 'middle' }}>
                                                {itemsList.length > 1 ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        {itemsList.map((it, iIdx) => {
                                                            const pName = it.product?.name || it.item_name || it.name || '—';
                                                            const isMatch = queryStr && (
                                                                pName.toLowerCase().includes(queryStr) ||
                                                                (it.part_no || it.product?.part_no || '').toLowerCase().includes(queryStr)
                                                            );
                                                            return (
                                                                <div key={iIdx} style={{
                                                                    color: isMatch ? 'var(--primary)' : 'var(--table-text-primary)',
                                                                    fontWeight: isMatch ? 600 : 400
                                                                }}>
                                                                    <FormattedProductName name={pName} blockVariant={true} />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <FormattedProductName name={itemsList[0]?.product?.name || itemsList[0]?.item_name || r.product_name || '—'} blockVariant={true} />
                                                )}
                                            </td>

                                            {/* Engine Plate Column */}
                                            <td style={{ fontSize: '13px', color: 'var(--table-text-secondary)', fontWeight: 500, verticalAlign: 'middle' }}>
                                                {itemsList.length > 1 ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        {itemsList.map((it, iIdx) => (
                                                            <div key={iIdx}>
                                                                {it.engine_plate_number || r.engine_plate_number || '—'}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    r.engine_plate_number || itemsList[0]?.engine_plate_number || '—'
                                                )}
                                            </td>

                                            {/* Qty Column */}
                                            <td style={{ fontSize: '13px', fontWeight: 700, textAlign: 'center', fontVariantNumeric: 'tabular-nums', verticalAlign: 'middle' }}>
                                                {itemsList.length > 1 ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        {itemsList.map((it, iIdx) => (
                                                            <div key={iIdx}>{it.qty || 1}</div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    totalQty
                                                )}
                                            </td>

                                            <td style={{ fontWeight: 600, fontSize: '13px', color: 'var(--table-text-primary)', verticalAlign: 'middle' }}>
                                                {r.customer?.name || r.customer_name || '—'}
                                            </td>
                                            <td style={{ fontWeight: 500, fontSize: '13px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', verticalAlign: 'middle' }}>
                                                {itemsList.length > 1 ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        {itemsList.map((it, iIdx) => (
                                                            <div key={iIdx}>{fmt(it.price || 0)}</div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    fmt(unitPrice)
                                                )}
                                            </td>
                                            <td style={{ fontWeight: 700, fontSize: '13px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', verticalAlign: 'middle' }}>
                                                {fmt(totalVal)}
                                            </td>
                                            <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                                                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}>
                                                    {fmt(depositVal)}
                                                </div>
                                                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--table-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', marginTop: '2px' }}>
                                                    {(() => {
                                                        if (!r.payment_method) return 'CASH';
                                                        const m = String(r.payment_method).trim().toUpperCase();
                                                        if (m === 'GCASH' || m === 'G-CASH') return 'G-CASH';
                                                        if (m === 'BANK' || m === 'BANK TRANSFER') return 'BANK';
                                                        if (m === 'CHEQUE' || m === 'CHECK') {
                                                            return r.cheque_number ? `CHEQUE #${r.cheque_number}` : 'CHEQUE';
                                                        }
                                                        return m;
                                                    })()}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                                                <div style={{
                                                    fontWeight: 700,
                                                    fontSize: '13px',
                                                    color: activeTab === 'completed' ? '#059669' : '#DC2626',
                                                    fontVariantNumeric: 'tabular-nums'
                                                }}>
                                                    {fmt(activeTab === 'completed' ? paidVal : balanceVal)}
                                                </div>
                                                <div style={{
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    color: activeTab === 'completed' ? '#059669' : '#DC2626',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.4px',
                                                    marginTop: '2px'
                                                }}>
                                                    {activeTab === 'completed' ? 'PAID' : (balanceVal === 0 ? 'PAID' : 'BALANCE')}
                                                </div>
                                            </td>
                                            {activeTab === 'completed' && (
                                                <td style={{ fontSize: '13px', fontWeight: 600, color: 'var(--table-text-primary)' }}>
                                                    {r.date_get ? fmtDate(r.date_get) : fmtDate(r.updated_at)}
                                                </td>
                                            )}
                                            <td style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                                                    <button 
                                                        className="action-trigger-btn" 
                                                        aria-label="View Details" 
                                                        data-tooltip="View Details" 
                                                        onClick={() => openDetails && openDetails(r)}
                                                    >
                                                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                            <circle cx="12" cy="12" r="3"></circle>
                                                        </svg>
                                                    </button>
                                                    {(activeTab === 'completed' || !isPending) && (
                                                        <button 
                                                            className="action-trigger-btn" 
                                                            aria-label="Reprint Collection Receipt" 
                                                            data-tooltip="Reprint C.R." 
                                                            onClick={() => onReprintCR && onReprintCR(r)}
                                                            style={{ color: '#059669' }}
                                                        >
                                                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                                                                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                                                                <rect x="6" y="14" width="12" height="8"></rect>
                                                            </svg>
                                                        </button>
                                                    )}
                                                    {activeTab === 'deposit' && isPending && (
                                                        <button className="btn btn-success btn-sm" onClick={() => openFulfill(r)}>Fulfill</button>
                                                    )}
                                                    {activeTab === 'deposit' && isPending && (
                                                        <button className="btn btn-danger-outline btn-sm" onClick={() => openCancel(r)}>Cancel</button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                });
                            })()}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {pagination && pagination.lastPage > 1 && (
                    <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            Showing page <strong>{pagination.currentPage}</strong> of <strong>{pagination.lastPage}</strong> ({pagination.total ? pagination.total.toLocaleString() : 0} total orders)
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                disabled={pagination.currentPage <= 1}
                                onClick={() => setPage && setPage(prev => Math.max(1, prev - 1))}
                                style={{ minHeight: '44px', padding: '0 16px', fontWeight: '600' }}
                            >
                                Previous
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                disabled={pagination.currentPage >= pagination.lastPage}
                                onClick={() => setPage && setPage(prev => Math.min(pagination.lastPage, prev + 1))}
                                style={{ minHeight: '44px', padding: '0 16px', fontWeight: '600' }}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
