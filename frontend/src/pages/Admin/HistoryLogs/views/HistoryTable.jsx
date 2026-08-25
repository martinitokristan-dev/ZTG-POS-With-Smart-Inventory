import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../../../../shared/components/LoadingSpinner';
import { printUnifiedReceipt } from '../../../../utils/printReceipt';
import StatusBadge from '../../../../shared/components/StatusBadge';
import api from '../../../../shared/api';
import CopyableText from '../../../../shared/components/CopyableText';

export default function HistoryTable({ 
    loading, transactions, fmt, fmtDate, 
    handleOpenRefund, handleOpenVoid, handleOpenView, handleOpenPay 
}) {
    const [openDropdownId, setOpenDropdownId] = useState(null);
    // Live logo URL — always current, never frozen per BIR spec
    const [logoUrl, setLogoUrl] = useState(null);

    useEffect(() => {
        api.get('/settings')
            .then(res => {
                const data = res.data || {};
                const logo = data.business_logo || null;
                if (logo) setLogoUrl(logo);
                localStorage.setItem('cached_business_info', JSON.stringify(data));
            })
            .catch(() => { /* logo silently absent */ });
    }, []);

    // Close dropdowns on click outside or when interacting elsewhere
    useEffect(() => {
        const closeAll = () => setOpenDropdownId(null);
        document.addEventListener('click', closeAll);
        return () => document.removeEventListener('click', closeAll);
    }, []);

    const toggleDropdown = (id, e) => {
        e.stopPropagation();
        setOpenDropdownId(openDropdownId === id ? null : id);
    };

    const handleReprint = (tx) => {
        const docType = tx.doc_type || (tx.si_no?.startsWith('DR') ? 'D.R.' : tx.si_no?.startsWith('CR') ? 'C.R.' : 'S.I.');

        printUnifiedReceipt({
            type: 'Sales',
            invoiceNo: tx.si_no || tx.receipt_number,
            date: new Date(tx.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }),
            customer: tx.customer?.name || 'Walk-in',
            phone: tx.customer?.phone || '',
            buyerTin: tx.customer?.tin || '',
            buyerAddress: tx.customer?.address || '',
            items: tx.items || [],
            total: tx.total_amount || tx.amount,
            discountAmount: Number(tx.discount_amount || tx.discount || 0),
            payment: tx.payment_method || 'Cash',
            tendered: tx.amount_tendered || 0,
            change: tx.change || Math.max(0, (tx.amount_tendered || 0) - (tx.total_amount || tx.amount || 0)),
            servedBy: tx.checker?.name || tx.cashier?.name || 'Cashier',
            docType: docType,
            businessInfo: tx.business_snapshot || {},
            logoUrl: logoUrl,
        });
        setOpenDropdownId(null);
    };

    if (loading) return <LoadingSpinner text="Loading history..." minHeight="200px" />;

    if (transactions.length === 0) {
        return (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748B' }}>
                No history logs found for the selected filters.
            </div>
        );
    }

    return (
        <div className="card table-card">
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table className="data-table" style={{ width: '100%', minWidth: '780px', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ borderBottom: '2px solid var(--table-border)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', background: 'var(--table-header-bg)' }}>
                        <tr>
                            <th style={{ padding: '12px 16px', fontWeight: '600' }}>Transaction Date & Time</th>
                            <th style={{ padding: '12px 16px', fontWeight: '600' }}>Receipt/Invoice</th>
                            <th style={{ padding: '12px 16px', fontWeight: '600' }}>Customer Name</th>
                            <th style={{ padding: '12px 16px', fontWeight: '600' }}>Served By</th>
                            <th style={{ padding: '12px 16px', fontWeight: '600' }}>Payment Method</th>
                            <th style={{ padding: '12px 16px', fontWeight: '600' }}>Status</th>
                            <th style={{ padding: '12px 16px', fontWeight: '600' }}>Reason</th>
                            <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody style={{ fontSize: '15px' }}>
                        {transactions.map((tx, idx) => {
                            // Date formatting
                            const fullDate = fmtDate(tx.date || tx.created_at) || '';
                            const [displayDate, ...timeParts] = fullDate.split(', ');
                            const displayTime = timeParts.join(', ');

                            const isBottomRow = idx >= transactions.length - 2 && transactions.length > 2;

                            const isRestock = tx.status === 'RESTOCKED' || tx.status === 'Restocked' || tx.type === 'inventory' || tx.type === 'restock' || (tx.si_no && tx.si_no.startsWith('INV-RESTOCK'));
                            const customerVal = isRestock ? '—' : (tx.customer?.name || tx.customer_name || 'Walk-in');
                            const paymentVal = (isRestock || tx.payment_method === 'N/A') ? '—' : (tx.payment_method ? String(tx.payment_method).replace(/\s*\([^)]*\)/g, '').trim() : '—');
                            const reasonVal = isRestock 
                                ? (tx.refund_reason || tx.notes || 'Restocking item(s)') 
                                : (tx.status === 'Refund' || tx.status === 'Return' ? (tx.refund_reason || '—') : tx.status === 'Void' ? (tx.void_reason || '—') : '—');

                            const isPartialRefund = tx.is_partial_refund === true || (Number(tx.refunded_amount || 0) > 0 && Number(tx.amount || 0) > 0);
                            const isFullRefund = (tx.status === 'Refund' || tx.status === 'Return') && !isPartialRefund;

                            let rowStatus = tx.status || 'Completed';
                            if (isPartialRefund) {
                                rowStatus = 'Partial Refund';
                            } else if (isFullRefund || (Number(tx.refunded_amount || 0) > 0 && Number(tx.amount || 0) === 0)) {
                                rowStatus = 'Refund';
                            }

                            return (
                                <tr key={tx.id} style={{ borderBottom: '1px solid var(--table-border-subtle)', minHeight: '48px' }}>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{ display: 'block', color: 'var(--table-text-primary)', fontSize: '15px', fontWeight: '500' }}>{displayDate}</span>
                                        {displayTime && <span style={{ display: 'block', fontSize: '13px', color: 'var(--table-text-secondary)', fontWeight: '500' }}>{displayTime}</span>}
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <CopyableText 
                                            text={tx.si_no || tx.receipt_number || 'N/A'} 
                                            label="Receipt/Invoice No." 
                                            codeStyle={{ fontSize: '15px', color: 'var(--table-text-primary)', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }} 
                                        />
                                    </td>
                                    <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{customerVal}</td>
                                    <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{tx.checker?.name || tx.cashier?.name || '—'}</td>
                                    <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{paymentVal}</td>
                                    <td style={{ padding: '16px' }}>
                                        <StatusBadge status={rowStatus} />
                                    </td>
                                    <td style={{ padding: '16px', color: '#64748B', fontSize: '12px' }}>
                                        {reasonVal}
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'center', verticalAlign: 'middle' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                                            <button 
                                                className="action-trigger-btn" 
                                                data-tooltip="View Transaction"
                                                onClick={() => {
                                                    setOpenDropdownId(null);
                                                    handleOpenView(tx);
                                                }}
                                            >
                                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                    <circle cx="12" cy="12" r="3"></circle>
                                                </svg>
                                            </button>
                                            <div className="actions-dropdown-container" style={{ position: 'relative' }}>
                                                <button 
                                                    className="action-trigger-btn" 
                                                    data-tooltip="More actions"
                                                    onClick={(e) => toggleDropdown(tx.id, e)}
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                        <circle cx="12" cy="5" r="2"></circle>
                                                        <circle cx="12" cy="12" r="2"></circle>
                                                        <circle cx="12" cy="19" r="2"></circle>
                                                    </svg>
                                                </button>
                                                {openDropdownId === tx.id && (
                                                    <div style={{
                                                        position: 'absolute', right: 0,
                                                        ...(isBottomRow ? { bottom: 'calc(100% + 6px)' } : { top: 'calc(100% + 6px)' }),
                                                        zIndex: 9999,
                                                        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px',
                                                        boxShadow: 'var(--shadow-lg)', padding: '6px', minWidth: '160px'
                                                    }}>
                                                        {tx.status === 'Pending' && (
                                                            <>
                                                                <button style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', borderRadius: '4px', fontWeight: '600' }} onClick={() => { handleOpenPay(tx); setOpenDropdownId(null); }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--success-light)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                                                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                                                                    Pay P.O.
                                                                </button>
                                                                <div style={{ margin: '4px 0', borderTop: '1px solid var(--border)' }}></div>
                                                            </>
                                                        )}
                                                        <button style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', borderRadius: '4px' }} onClick={() => handleReprint(tx)} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                                                            Reprint SI
                                                        </button>
                                                        {tx.status === 'Completed' && (
                                                            <>
                                                                <div style={{ margin: '4px 0', borderTop: '1px solid var(--border)' }}></div>
                                                                <button style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)', borderRadius: '4px' }} onClick={() => { handleOpenVoid(tx); setOpenDropdownId(null); }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--danger-light)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                                                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                                                                    Void Transaction
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
