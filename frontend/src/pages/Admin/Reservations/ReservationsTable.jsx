import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import StatusBadge from '../../../shared/components/StatusBadge';
import IOSSelect from '../../../shared/components/IOSSelect';
import FormattedProductName from '../../../shared/components/FormattedProductName';
import TablePagination from '../../../shared/components/TablePagination';

export default function ReservationsTable({
    reservations, loading,
    search, setSearch, handleSearchChange,
    statusFilter, setStatusFilter, handleStatusChange,
    dateFilter = 'today', setDateFilter, handleDateFilterChange,
    page, setPage, pagination,
    fmt, fmtDate,
    openFulfill, openCancel, openDetails, onReprintCR, onReprintDepositCR, onReprintBalanceCR,
    onUpdateStatus,
    activeTab = 'deposit',
    permissions = {},
}) {
    const canEdit = permissions.canEdit ?? true;
    const [openDropdownId, setOpenDropdownId] = useState(null);
    const [dropdownPos, setDropdownPos] = useState(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.actions-dropdown-container') && !e.target.closest('.actions-dropdown-menu')) {
                setOpenDropdownId(null);
                setDropdownPos(null);
            }
        };
        const handleScroll = () => {
            setOpenDropdownId(null);
            setDropdownPos(null);
        };
        document.addEventListener('click', handleClickOutside);
        window.addEventListener('scroll', handleScroll, true);
        return () => {
            document.removeEventListener('click', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, []);
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
                                <th style={{ textAlign: 'left', maxWidth: '170px' }}>Description / Part Name</th>
                                <th style={{ textAlign: 'left' }}>Engine Plate No.</th>
                                <th style={{ textAlign: 'center' }}>Qty. Ordered</th>
                                <th style={{ textAlign: 'left' }}>Customer Name</th>
                                <th style={{ textAlign: 'right' }}>Price</th>
                                <th style={{ textAlign: 'right' }}>Total Amount</th>
                                <th style={{ textAlign: 'right' }}>Deposit</th>
                                <th style={{ textAlign: 'right' }}>Payment</th>
                                {activeTab === 'completed' && <th style={{ textAlign: 'left' }}>Date Get</th>}
                                <th style={{ textAlign: 'center' }}>Status</th>
                                <th style={{ textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody style={{ fontSize: '13px' }}>
                            {(() => {
                                const displayList = reservations.filter(r => {
                                    const rawStatus = (r.status?.value || r.status || '').toLowerCase();
                                    if (activeTab === 'deposit') {
                                        return rawStatus !== 'completed' && rawStatus !== 'cancelled';
                                    } else {
                                        return rawStatus === 'completed';
                                    }
                                }).sort((a, b) => {
                                    if (activeTab === 'completed') {
                                        const dateA = new Date(a.date_get || a.date || a.created_at).getTime();
                                        const dateB = new Date(b.date_get || b.date || b.created_at).getTime();
                                        if (dateA !== dateB) return dateA - dateB;
                                        const updatedA = new Date(a.updated_at || 0).getTime();
                                        const updatedB = new Date(b.updated_at || 0).getTime();
                                        if (updatedA !== updatedB) return updatedA - updatedB;
                                        return (a.id || 0) - (b.id || 0);
                                    } else {
                                        const dateA = new Date(a.date || a.created_at).getTime();
                                        const dateB = new Date(b.date || b.created_at).getTime();
                                        if (dateA !== dateB) return dateA - dateB;
                                        const createdA = new Date(a.created_at || 0).getTime();
                                        const createdB = new Date(b.created_at || 0).getTime();
                                        if (createdA !== createdB) return createdA - createdB;
                                        return (a.id || 0) - (b.id || 0);
                                    }
                                });

                                if (loading) {
                                    return (
                                        <tr>
                                            <td colSpan={activeTab === 'completed' ? 13 : 12} style={{ padding: '32px' }}>
                                                <LoadingSpinner text={activeTab === 'deposit' ? "Loading orders in China..." : "Loading claimed & paid orders..."} minHeight="100px" />
                                            </td>
                                        </tr>
                                    );
                                }

                                if (displayList.length === 0) {
                                    return (
                                        <tr>
                                            <td colSpan={activeTab === 'completed' ? 13 : 12} style={{ textAlign: 'center', padding: '32px', color: 'var(--table-text-muted)', fontSize: '14px' }}>
                                                {activeTab === 'deposit' ? 'No pending orders in China found.' : 'No claimed & paid orders found.'}
                                            </td>
                                        </tr>
                                    );
                                }

                                return displayList.map((r, index) => {
                                    const rawStatus = (r.status?.value || r.status || '').toLowerCase();
                                    const isPending = rawStatus === 'pending';
                                    const isCancelled = rawStatus === 'cancelled';
                                    const isCompleted = rawStatus === 'completed';
                                    const isDepositOnly = activeTab === 'deposit' && isPending;
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
                                            <td style={{ fontSize: '13px', color: 'var(--table-text-primary)', verticalAlign: 'middle', maxWidth: '170px', overflow: 'hidden' }}>
                                                {itemsList.length > 1 ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '100%', overflow: 'hidden' }}>
                                                        {itemsList.map((it, iIdx) => {
                                                            const pName = it.product?.name || it.item_name || it.name || '—';
                                                            const isMatch = queryStr && (
                                                                pName.toLowerCase().includes(queryStr) ||
                                                                (it.part_no || it.product?.part_no || '').toLowerCase().includes(queryStr)
                                                            );
                                                            return (
                                                                <div key={iIdx} style={{
                                                                    color: isMatch ? 'var(--primary)' : 'var(--table-text-primary)',
                                                                    fontWeight: isMatch ? 600 : 400,
                                                                    maxWidth: '100%',
                                                                    overflow: 'hidden'
                                                                }}>
                                                                    <FormattedProductName name={pName} blockVariant={true} />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div style={{ maxWidth: '100%', overflow: 'hidden' }}>
                                                        <FormattedProductName name={itemsList[0]?.product?.name || itemsList[0]?.item_name || r.product_name || '—'} blockVariant={true} />
                                                    </div>
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

                                            {/* Status Column */}
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                                <StatusBadge status={(() => {
                                                    const s = r.status?.value || r.status || '';
                                                    if (activeTab === 'completed' || s.toLowerCase() === 'completed') return 'Fulfilled';
                                                    if (s.toLowerCase() === 'order received') return 'Order Received';
                                                    return 'Pending';
                                                })()} />
                                            </td>

                                            {/* Actions Column with 3-Dots Dropdown */}
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                {(() => {
                                                    const isBottomRow = displayList.length <= 2 || index >= displayList.length - 2;
                                                    return (
                                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                                                            {/* 1-Click Quick View Details Button */}
                                                            <button 
                                                                className="action-trigger-btn" 
                                                                aria-label="View Details" 
                                                                data-tooltip="View Details" 
                                                                onClick={() => {
                                                                    setOpenDropdownId(null);
                                                                    setDropdownPos(null);
                                                                    openDetails && openDetails(r);
                                                                }}
                                                            >
                                                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                                    <circle cx="12" cy="12" r="3"></circle>
                                                                </svg>
                                                            </button>

                                                            {/* 3-Dots Dropdown Menu */}
                                                            <div className="actions-dropdown-container" style={{ position: 'relative' }}>
                                                                <button 
                                                                    type="button"
                                                                    className="action-trigger-btn" 
                                                                    data-tooltip="Actions"
                                                                    aria-label="Actions"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (openDropdownId === r.id) {
                                                                            setOpenDropdownId(null);
                                                                            setDropdownPos(null);
                                                                        } else {
                                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                                            setOpenDropdownId(r.id);
                                                                            setDropdownPos({
                                                                                isBottom: isBottomRow,
                                                                                bottom: window.innerHeight - rect.top + 6,
                                                                                top: rect.bottom + 6,
                                                                                right: window.innerWidth - rect.right,
                                                                            });
                                                                        }
                                                                    }}
                                                                >
                                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                                        <circle cx="12" cy="5" r="2"></circle>
                                                                        <circle cx="12" cy="12" r="2"></circle>
                                                                        <circle cx="12" cy="19" r="2"></circle>
                                                                    </svg>
                                                                </button>

                                                                {openDropdownId === r.id && (
                                                                    <div 
                                                                        className="actions-dropdown-menu show"
                                                                        style={{
                                                                            position: 'fixed', 
                                                                            right: dropdownPos ? `${dropdownPos.right}px` : '16px',
                                                                            ...(isBottomRow 
                                                                                ? { bottom: dropdownPos ? `${dropdownPos.bottom}px` : 'calc(100% + 6px)', top: 'auto' } 
                                                                                : { top: dropdownPos ? `${dropdownPos.top}px` : 'calc(100% + 6px)', bottom: 'auto' }
                                                                            ),
                                                                            zIndex: 99999,
                                                                            background: 'var(--bg-card, #FFFFFF)', 
                                                                            border: '1px solid var(--border)', 
                                                                            borderRadius: '8px',
                                                                            boxShadow: 'var(--shadow-lg, 0 10px 15px -3px rgba(0,0,0,0.1))', 
                                                                            padding: '6px', 
                                                                            minWidth: '175px'
                                                                        }}
                                                                    >
                                                                        {/* Mark as Order Received (if currently Pending) */}
                                                                        {canEdit && activeTab === 'deposit' && (rawStatus === 'pending' || !rawStatus) && (
                                                                            <button 
                                                                                type="button"
                                                                                className="actions-dropdown-item"
                                                                                style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', color: '#D97706', borderRadius: '4px', fontWeight: '600' }}
                                                                                onClick={() => {
                                                                                    setOpenDropdownId(null);
                                                                                    setDropdownPos(null);
                                                                                    onUpdateStatus && onUpdateStatus(r.id, 'Order Received');
                                                                                }}
                                                                                onMouseOver={e => e.currentTarget.style.backgroundColor = '#FEF3C7'}
                                                                                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                            >
                                                                                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                                                                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                                                                                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                                                                                </svg>
                                                                                <span>Order Received</span>
                                                                            </button>
                                                                        )}

                                                                        {/* Fulfill Order (ONLY visible when item has been received from China) */}
                                                                        {canEdit && activeTab === 'deposit' && rawStatus === 'order received' && (
                                                                            <button 
                                                                                type="button"
                                                                                className="actions-dropdown-item"
                                                                                style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success, #16A34A)', borderRadius: '4px', fontWeight: '600' }}
                                                                                onClick={() => {
                                                                                    setOpenDropdownId(null);
                                                                                    setDropdownPos(null);
                                                                                    openFulfill && openFulfill(r);
                                                                                }}
                                                                                onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--success-light, #DCFCE7)'}
                                                                                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                            >
                                                                                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                                                </svg>
                                                                                <span>Fulfill Order</span>
                                                                            </button>
                                                                        )}

                                                                        {/* Reprint Final Collection Receipt (Completed) */}
                                                                        {(activeTab === 'completed' || isCompleted) && (
                                                                            <button 
                                                                                type="button"
                                                                                className="actions-dropdown-item"
                                                                                style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', borderRadius: '4px' }}
                                                                                onClick={() => {
                                                                                    setOpenDropdownId(null);
                                                                                    setDropdownPos(null);
                                                                                    onReprintBalanceCR ? onReprintBalanceCR(r) : (onReprintCR && onReprintCR(r));
                                                                                }}
                                                                                onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #F1F5F9)'}
                                                                                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                            >
                                                                                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                                                                                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                                                                                    <rect x="6" y="14" width="12" height="8"></rect>
                                                                                </svg>
                                                                                <span>Reprint Final C.R.</span>
                                                                            </button>
                                                                        )}

                                                                        {/* Reprint Deposit Collection Receipt (Active Deposit) */}
                                                                        {activeTab === 'deposit' && (
                                                                            <button 
                                                                                type="button"
                                                                                className="actions-dropdown-item"
                                                                                style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', borderRadius: '4px' }}
                                                                                onClick={() => {
                                                                                    setOpenDropdownId(null);
                                                                                    setDropdownPos(null);
                                                                                    onReprintDepositCR ? onReprintDepositCR(r) : (onReprintCR && onReprintCR(r));
                                                                                }}
                                                                                onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #F1F5F9)'}
                                                                                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                            >
                                                                                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                                                                                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                                                                                    <rect x="6" y="14" width="12" height="8"></rect>
                                                                                </svg>
                                                                                <span>Reprint Deposit C.R.</span>
                                                                            </button>
                                                                        )}

                                                                        {/* Cancel Order */}
                                                                        {canEdit && activeTab === 'deposit' && (rawStatus !== 'completed' && rawStatus !== 'cancelled') && (
                                                                            <>
                                                                                <div style={{ margin: '4px 0', borderTop: '1px solid var(--border)' }}></div>
                                                                                <button 
                                                                                    type="button"
                                                                                    className="actions-dropdown-item disable"
                                                                                    style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', color: '#DC2626', borderRadius: '4px' }}
                                                                                    onClick={() => {
                                                                                        setOpenDropdownId(null);
                                                                                        setDropdownPos(null);
                                                                                        openCancel && openCancel(r);
                                                                                    }}
                                                                                    onMouseOver={e => e.currentTarget.style.backgroundColor = '#FEE2E2'}
                                                                                    onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                                >
                                                                                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                                        <circle cx="12" cy="12" r="10"></circle>
                                                                                        <line x1="15" y1="9" x2="9" y2="15"></line>
                                                                                        <line x1="9" y1="9" x2="15" y2="15"></line>
                                                                                    </svg>
                                                                                    <span>Cancel Order</span>
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                        </tr>
                                    );
                                });
                            })()}
                        </tbody>
                    </table>
                </div>

                {/* Standardized Pagination Controls */}
                {pagination && (
                    <TablePagination
                        currentPage={pagination.currentPage || 1}
                        totalItems={pagination.total || 0}
                        perPage={20}
                        onPageChange={(newPage) => setPage && setPage(newPage)}
                        label="orders"
                    />
                )}
            </div>
        </>
    );
}
