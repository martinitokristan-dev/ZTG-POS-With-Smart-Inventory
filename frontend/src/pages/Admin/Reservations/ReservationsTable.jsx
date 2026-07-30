import React from 'react';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import StatusBadge from '../../../shared/components/StatusBadge';
import IOSSelect from '../../../shared/components/IOSSelect';

export default function ReservationsTable({
    reservations, loading,
    search, setSearch, handleSearchChange,
    statusFilter, setStatusFilter, handleStatusChange,
    page, setPage, pagination,
    fmt, fmtDate,
    openFulfill, openCancel
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
                            placeholder="Search by customer name, phone, or reserved item..."
                            value={search}
                            onChange={(e) => handleSearchChange ? handleSearchChange(e.target.value) : setSearch(e.target.value)}
                        />
                    </div>
                    <div style={{ flex: '1 1 180px', minWidth: '140px' }}>
                        <IOSSelect
                            value={statusFilter}
                            onChange={(e) => handleStatusChange ? handleStatusChange(e.target.value) : setStatusFilter(e.target.value)}
                            options={[
                                { value: 'All', label: 'All Statuses' },
                                { value: 'Pending', label: 'Pending Pickup' },
                                { value: 'Completed', label: 'Completed Pickups' },
                                { value: 'Cancelled', label: 'Cancelled' }
                            ]}
                        />
                    </div>
                </div>
            </div>

            {/* Reservations Table */}
            <div className="card table-card">
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table className="data-table" style={{ minWidth: '850px', width: '100%' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left' }}>Customer Name</th>
                                <th style={{ textAlign: 'left' }}>Contact Phone</th>
                                <th style={{ textAlign: 'left' }}>Product</th>
                                <th style={{ textAlign: 'right' }}>Qty</th>
                                <th style={{ textAlign: 'right' }}>Deposit Amount</th>
                                <th style={{ textAlign: 'right' }}>Total Price</th>
                                <th style={{ textAlign: 'left' }}>Date Placed</th>
                                <th style={{ textAlign: 'left' }}>Expected Pickup</th>
                                <th style={{ textAlign: 'left' }}>Reserved By</th>
                                <th style={{ textAlign: 'left' }}>Status</th>
                                <th style={{ textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody style={{ fontSize: '15px' }}>
                            {loading ? (
                                <tr><td colSpan="11" style={{ padding: '32px' }}><LoadingSpinner text="Loading reservations..." minHeight="100px" /></td></tr>
                            ) : reservations.length === 0 ? (
                                <tr><td colSpan="11" style={{ textAlign: 'center', padding: '32px', color: 'var(--table-text-muted)', fontSize: '15px' }}>No reservations found.</td></tr>
                            ) : reservations.map(r => {
                                const status = (r.status?.value || r.status || '').toLowerCase();
                                const isPending = status === 'pending';
                                const productNames = r.items?.map(i => i.product?.name || i.name || '—').join(', ') || r.product_name || '—';
                                const totalQty = r.items?.reduce((s, i) => s + (i.qty || 0), 0) || r.qty || '—';
                                const fulfilledByName = r.fulfilled_by ? (r.fulfilled_by.real_name || r.fulfilled_by.name) : null;

                                return (
                                    <tr key={r.id} style={{ minHeight: '48px' }}>
                                        <td style={{ fontWeight: 600, fontSize: '15px', color: 'var(--table-text-primary)' }}>{r.customer?.name || r.customer_name || '—'}</td>
                                        <td style={{ fontSize: '15px', color: 'var(--table-text-secondary)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{r.customer?.phone || r.customer_phone || '—'}</td>
                                        <td style={{ fontSize: '15px', color: 'var(--table-text-primary)', fontWeight: 500 }}>{productNames}</td>
                                        <td style={{ fontSize: '15px', fontWeight: 600, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{totalQty}</td>
                                        <td style={{ fontWeight: 600, fontSize: '15px', color: 'var(--primary)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.deposit)}</td>
                                        <td style={{ fontWeight: 600, fontSize: '15px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.total)}</td>
                                        <td style={{ fontSize: '15px', fontWeight: 500, color: 'var(--table-text-secondary)' }}>{fmtDate(r.date || r.created_at)}</td>
                                        <td style={{ fontSize: '15px', fontWeight: 600, color: 'var(--table-text-primary)' }}>{fmtDate(r.pickup_date)}</td>
                                        <td style={{ fontSize: '13px', color: fulfilledByName ? 'var(--success)' : 'var(--table-text-secondary)', fontWeight: 500 }}>
                                            {fulfilledByName ? `Fulfilled by: ${fulfilledByName}` : (r.reserved_by?.real_name || r.reserved_by?.name || '—')}
                                        </td>
                                        <td><StatusBadge status={r.status?.value || r.status || 'Pending'} /></td>
                                        <td style={{ textAlign: 'center' }}>
                                            {isPending ? (
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                    <button className="btn btn-success btn-sm" onClick={() => openFulfill(r)}>Fulfill</button>
                                                    <button className="btn btn-danger-outline btn-sm" onClick={() => openCancel(r)}>Cancel</button>
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: '13px', color: 'var(--table-text-secondary)', fontWeight: 600 }}>
                                                    {status === 'completed' ? 'Fulfilled' : 'Cancelled'}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
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
