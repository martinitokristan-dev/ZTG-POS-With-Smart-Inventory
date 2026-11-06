import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../../../../shared/components/LoadingSpinner';
import { printUnifiedReceipt } from '../../../../utils/printReceipt';
import StatusBadge from '../../../../shared/components/StatusBadge';
import api from '../../../../shared/api';
import CopyableText from '../../../../shared/components/CopyableText';

export default function HistoryTable({ 
    loading, transactions, fmt, fmtDate, 
    handleOpenRefund, handleOpenVoid, handleOpenView, handleOpenPay,
    permissions = {},
    highlightedId = null,
}) {
    const canEdit = permissions.canEdit ?? true;
    // Same row menu as Product Management: it hangs under the ⋮ button (right edges aligned),
    // the last two rows open it upward, and the table card keeps empty space below the rows
    // so the menu never makes the table scroll (that scrollbar was the "blinking").
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

    // Close the menu on a click anywhere else, or Esc
    useEffect(() => {
        const closeAll = () => setOpenDropdownId(null);
        const onKey = (e) => { if (e.key === 'Escape') closeAll(); };
        document.addEventListener('click', closeAll);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('click', closeAll);
            document.removeEventListener('keydown', onKey);
        };
    }, []);

    const toggleDropdown = (id, e) => {
        e.stopPropagation();
        setOpenDropdownId((current) => (current === id ? null : id));
    };

    const closeDropdown = () => setOpenDropdownId(null);

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
            // A reprint is a copy of the original invoice: use the frozen sale total, not the
            // net left after later refunds (that is shown on the refund's own OR).
            total: tx.original_amount ?? tx.total_amount ?? tx.amount,
            // Every peso discount on the invoice: order discount plus each line's item discount.
            discountAmount: Number(tx.discount_amount || 0)
                + (tx.items || []).reduce((sum, item) => sum + Number(item.discount || 0), 0),
            payment: tx.payment_method || 'Cash',
            tendered: tx.amount_tendered || 0,
            change: tx.change || Math.max(0, (tx.amount_tendered || 0) - Number(tx.original_amount ?? tx.total_amount ?? tx.amount ?? 0)),
            servedBy: tx.checker?.name || tx.cashier?.name || 'Cashier',
            docType: docType,
            businessInfo: tx.business_snapshot || {},
            logoUrl: logoUrl,
        });
        closeDropdown();
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
        <div className="card table-card" style={{ overflow: 'visible', paddingBottom: '120px' }}>
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
                            {/* Same as Product Management: centered in a fixed-width column, so the buttons keep a margin from the right edge */}
                            <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'center', whiteSpace: 'nowrap', width: '120px', minWidth: '120px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody style={{ fontSize: '15px' }}>
                        {transactions.map((tx, idx) => {
                            // Date formatting
                            const fullDate = fmtDate(tx.date || tx.created_at) || '';
                            const [displayDate, ...timeParts] = fullDate.split(', ');
                            const displayTime = timeParts.join(', ');

                            // Same rule as Product Management: the last two rows open the menu upward.
                            const isBottomRow = idx >= transactions.length - 2 && transactions.length > 2;

                            const isRestock = tx.status === 'RESTOCKED' || tx.status === 'Restocked' || tx.type === 'inventory' || tx.type === 'restock' || (tx.si_no && tx.si_no.startsWith('INV-RESTOCK'));
                            const customerVal = isRestock ? '—' : (tx.customer?.name || tx.customer_name || 'Walk-in');
                            const paymentVal = (isRestock || tx.payment_method === 'N/A') ? '—' : (tx.payment_method ? String(tx.payment_method).replace(/\s*\([^)]*\)/g, '').trim() : '—');
                            const reasonVal = isRestock 
                                ? (tx.refund_reason || tx.notes || 'Restocking item(s)') 
                                : (tx.reason || tx.refund_reason || tx.void_reason || tx.internal_notes || '—');

                            const isPartialRefund = tx.is_partial_refund === true || (Number(tx.refunded_amount || 0) > 0 && Number(tx.amount || 0) > 0);
                            const isFullRefund = (tx.status === 'Refund' || tx.status === 'Return') && !isPartialRefund;

                            let rowStatus = tx.status || 'Completed';
                            if (isPartialRefund) {
                                rowStatus = tx.status === 'Return' ? 'Partial Return' : 'Partial Refund';
                            } else if (tx.status === 'Return') {
                                rowStatus = 'Return';
                            } else if (tx.status === 'Refund') {
                                rowStatus = 'Refund';
                            } else if (tx.status === 'Void') {
                                rowStatus = 'Void';
                            }

                            const isHighlighted = highlightedId === tx.id;
                            
                            return (
                                <tr 
                                    key={tx.id} 
                                    data-transaction-id={tx.id}
                                    style={{ 
                                        borderBottom: '1px solid var(--table-border-subtle)', 
                                        minHeight: '48px',
                                        backgroundColor: isHighlighted ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                                        transition: 'background-color 0.3s ease',
                                        animation: isHighlighted ? 'highlightPulse 1s ease-in-out' : 'none'
                                    }}
                                >
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
                                    <td style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', width: '120px', minWidth: '120px' }}>
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                                            <button 
                                                className="action-trigger-btn" 
                                                data-tooltip="View Transaction"
                                                onClick={() => {
                                                    closeDropdown();
                                                    handleOpenView(tx);
                                                }}
                                            >
                                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                    <circle cx="12" cy="12" r="3"></circle>
                                                </svg>
                                            </button>
                                            <div className="actions-dropdown-container">
                                                <button 
                                                    type="button"
                                                    className="action-trigger-btn" 
                                                    data-tooltip={openDropdownId === tx.id ? undefined : 'More actions'}
                                                    data-tooltip-align="right"
                                                    aria-label="More actions"
                                                    aria-haspopup="true"
                                                    aria-expanded={openDropdownId === tx.id ? 'true' : 'false'}
                                                    onClick={(e) => toggleDropdown(tx.id, e)}
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                        <circle cx="12" cy="5" r="2"></circle>
                                                        <circle cx="12" cy="12" r="2"></circle>
                                                        <circle cx="12" cy="19" r="2"></circle>
                                                    </svg>
                                                </button>
                                                {openDropdownId === tx.id && (
                                                    <div
                                                        className="actions-dropdown-menu show"
                                                        role="menu"
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{
                                                            position: 'absolute',
                                                            right: 0,
                                                            ...(isBottomRow ? { bottom: 'calc(100% + 6px)', top: 'auto' } : { top: 'calc(100% + 6px)', bottom: 'auto' }),
                                                            zIndex: 9999,
                                                            background: 'var(--bg-card)',
                                                            border: '1px solid var(--border)',
                                                            borderRadius: '8px',
                                                            boxShadow: 'var(--shadow-lg)',
                                                            padding: '6px',
                                                            minWidth: '160px',
                                                        }}
                                                    >
                                                        {canEdit && tx.status === 'Pending' && (
                                                            <>
                                                                <button type="button" role="menuitem" className="actions-dropdown-item success" onClick={() => { closeDropdown(); handleOpenPay(tx); }}>
                                                                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                                                                    Pay P.O.
                                                                </button>
                                                                <div className="actions-dropdown-divider" role="separator" style={{ margin: '4px 0', borderTop: '1px solid var(--border)' }}></div>
                                                            </>
                                                        )}
                                                        <button type="button" role="menuitem" className="actions-dropdown-item" onClick={() => handleReprint(tx)}>
                                                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                                                            Reprint SI
                                                        </button>
                                                        {canEdit && (tx.status === 'Completed' || tx.status === 'Pending') && (
                                                            <>
                                                                <div className="actions-dropdown-divider" role="separator" style={{ margin: '4px 0', borderTop: '1px solid var(--border)' }}></div>
                                                                <button type="button" role="menuitem" className="actions-dropdown-item danger" onClick={() => { closeDropdown(); handleOpenVoid(tx); }}>
                                                                    {tx.status === 'Pending' ? (
                                                                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                                                                    ) : (
                                                                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                                                                    )}
                                                                    {tx.status === 'Pending' ? 'Cancel P.O.' : 'Void Transaction'}
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
