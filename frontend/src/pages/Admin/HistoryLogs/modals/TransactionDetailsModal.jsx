import React from 'react';
import CopyableText from '../../../../shared/components/CopyableText';
import FormattedProductName from '../../../../shared/components/FormattedProductName';
import { getItemDiscountAmount } from '../../../../shared/utils/clientExcelExporter';

export default function TransactionDetailsModal({ isOpen, onClose, transaction, fmtDate, fmt }) {
    if (!isOpen || !transaction) return null;

    const tx = transaction;
    const status = tx.status || 'Unknown';
    const reason = tx.reason || tx.refund_reason || tx.void_reason || tx.internal_notes || '—';
    const chequeNo = tx.cheque_number || (tx.payment_method && tx.payment_method.includes('(#') ? tx.payment_method.match(/\(#([^)]+)\)/)?.[1] : null);

    // Parse restock line items from internal_notes JSON
    let restockEntries = [];
    if (status === 'Restocked' && tx.internal_notes) {
        try {
            const parsed = typeof tx.internal_notes === 'string'
                ? JSON.parse(tx.internal_notes)
                : tx.internal_notes;
            restockEntries = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            restockEntries = [];
        }
    }

    const isPartialRefund = tx.is_partial_refund === true || (Number(tx.refunded_amount || 0) > 0 && Number(tx.amount || 0) > 0);
    const isFullRefund = (status === 'Refund' || status === 'Return') && !isPartialRefund;
    const isVoid = status === 'Void';

    let title = 'Transaction Details';
    let subtitle = tx.si_no || '—';
    let statusColor = '#334155';
    let itemsBlock = null;

    if (status === 'Restocked') {
        title = 'Restock Details';
        subtitle = 'Inventory restock record';
        statusColor = '#059669';
    } else if (isVoid) {
        title = 'Void Transaction Details';
        subtitle = 'Cancelled sale record';
        statusColor = '#DC2626';
    } else if (isPartialRefund) {
        title = status === 'Return' ? 'Partial Return Details' : 'Partial Refund Details';
        subtitle = tx.si_no || '—';
        statusColor = '#D97706';
    } else if (isFullRefund) {
        title = status === 'Return' ? 'Full Return Details' : 'Full Refund Details';
        subtitle = tx.si_no || '—';
        statusColor = '#DC2626';
    } else {
        title = 'Transaction Details';
        subtitle = tx.si_no || '—';
        statusColor = status === 'Completed' ? '#059669' : '#334155';
    }

    const txItems = Array.isArray(tx.items) ? tx.items : [];
    const hasRefundOrReturn = isPartialRefund || isFullRefund || isVoid || status === 'Refund' || status === 'Return' || Number(tx.refunded_amount || 0) > 0 || txItems.some(i => Number(i.refunded_qty || 0) > 0);
    const isReturnAction = status === 'Return' || (tx.type && String(tx.type).toLowerCase().includes('return'));
    const refundReturnColumnHeader = isVoid ? 'Voided Qty' : (isReturnAction ? 'Returned Qty' : 'Returned / Refund');

    // Calculate overall financial totals across transaction items
    let grossSubtotal = 0;
    let itemDiscountsTotal = 0;

    const processedItems = txItems.map(item => {
        const rawQty = Number(item.qty || 1);
        const refundedQty = Number(item.refunded_qty || (isFullRefund || isVoid ? rawQty : 0));
        const displayRemainingQty = isPartialRefund
            ? Number(item.net_qty ?? Math.max(0, rawQty - refundedQty))
            : rawQty;

        let origPrice = Number(item.original_price || item.price || 0);
        let itemDisc = getItemDiscountAmount(item, tx);

        // Fallback for older regular sale records where price was saved as net price instead of orig price
        if (item.original_price && Number(item.original_price) > Number(item.price) && itemDisc === 0) {
            origPrice = Number(item.original_price);
            itemDisc = origPrice - Number(item.price);
        }

        const lineGross = rawQty * origPrice;
        const lineDisc = itemDisc;
        const itemOriginalTotal = Math.max(0, lineGross - lineDisc);
        const lineNet = isPartialRefund 
            ? Math.max(0, (displayRemainingQty * origPrice) - lineDisc)
            : itemOriginalTotal;

        grossSubtotal += lineGross;
        itemDiscountsTotal += lineDisc;

        return {
            ...item,
            qty: rawQty,
            displayQty: rawQty,
            netRemainingQty: displayRemainingQty,
            refundedQty,
            unitPrice: origPrice,
            itemDisc,
            itemOriginalTotal,
            lineNet
        };
    });

    const orderDiscountAmt = Number(tx.discount_amount || 0);
    const totalDiscounts = itemDiscountsTotal + orderDiscountAmt;
    const discountTypeLabel = tx.discount_type ? ` (${tx.discount_type})` : '';

    const totalOriginalAmount = (tx.original_amount != null && Number(tx.original_amount) > 0) 
        ? Number(tx.original_amount) 
        : (grossSubtotal > 0 ? Math.max(0, grossSubtotal - totalDiscounts) : Number(tx.amount || tx.total || 0));

    const totalRefundedAmount = (tx.refunded_amount != null && Number(tx.refunded_amount) > 0)
        ? Number(tx.refunded_amount)
        : (isFullRefund || isVoid ? totalOriginalAmount : 0);

    const netSalesRemaining = Number(tx.amount || 0);

    if (status !== 'Restocked' && status !== 'Damaged' && processedItems.length > 0) {
        itemsBlock = (
            <div className="audit-detail-section" style={{ marginTop: '14px' }}>
                <span className="audit-detail-section-title" style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: '8px', display: 'block', letterSpacing: '0.5px' }}>Items Purchased</span>
                <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflowX: 'hidden', overflowY: 'auto', background: 'var(--bg-card)', maxHeight: '280px' }}>
                    <table className="modal-table data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', tableLayout: 'fixed' }}>
                        <thead style={{ background: 'var(--table-header-bg)', borderBottom: '2px solid var(--table-border)', fontSize: '12px', color: 'var(--table-text-secondary)' }}>
                            <tr>
                                <th style={{ padding: '10px 12px', fontWeight: '600', letterSpacing: '0.02em', width: hasRefundOrReturn ? '120px' : '140px' }}>Part No.</th>
                                <th style={{ padding: '10px 12px', fontWeight: '600', letterSpacing: '0.02em', width: hasRefundOrReturn ? '210px' : '260px' }}>Product</th>
                                <th style={{ padding: '10px 12px', fontWeight: '600', letterSpacing: '0.02em', textAlign: 'center', width: '50px' }}>Qty</th>
                                <th style={{ padding: '10px 12px', fontWeight: '600', letterSpacing: '0.02em', textAlign: 'right', width: '90px' }}>Price</th>
                                <th style={{ padding: '10px 12px', fontWeight: '600', letterSpacing: '0.02em', textAlign: 'right', width: '90px' }}>Discounted</th>
                                {hasRefundOrReturn && (
                                    <th style={{ padding: '10px 12px', fontWeight: '600', letterSpacing: '0.02em', textAlign: 'center', width: '125px' }}>{refundReturnColumnHeader}</th>
                                )}
                                <th style={{ padding: '10px 12px', fontWeight: '600', letterSpacing: '0.02em', textAlign: 'right', width: hasRefundOrReturn ? '100px' : '130px' }}>Total</th>
                            </tr>
                        </thead>
                        <tbody style={{ fontSize: '14px' }}>
                             {processedItems.map((item, index) => {
                                const partNo = item.product?.part_no || item.part_no || '—';
                                const name = item.product?.name || item.name || 'Unknown Part';
                                const itemDiscTotal = item.itemDisc;
                                const refundedQty = item.refundedQty;

                                return (
                                    <tr key={index} style={{ borderBottom: '1px solid var(--table-border-subtle)', minHeight: '44px' }}>
                                        <td style={{ padding: '10px 12px', fontVariantNumeric: 'tabular-nums', fontWeight: '600', overflow: 'hidden' }}>
                                            <CopyableText text={partNo} label="Part No." codeStyle={{ fontSize: '14px', fontWeight: '600' }} />
                                        </td>
                                        <td style={{ padding: '10px 12px', color: 'var(--table-text-primary)', overflow: 'hidden' }}>
                                            <div style={{ fontSize: '14px', overflow: 'hidden' }}><FormattedProductName name={name} /></div>
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--table-text-primary)', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>
                                            {item.qty}
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--table-text-secondary)', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>
                                            {fmt(item.unitPrice)}
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right', color: itemDiscTotal > 0 ? '#2563EB' : 'var(--table-text-muted)', fontWeight: itemDiscTotal > 0 ? '600' : '500', fontVariantNumeric: 'tabular-nums' }}>
                                            {itemDiscTotal > 0 ? `-${fmt(itemDiscTotal)}` : fmt(0)}
                                        </td>
                                        {hasRefundOrReturn && (
                                            <td style={{ padding: '10px 12px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                                                {refundedQty > 0 || isFullRefund || isVoid ? (
                                                    <span className={`status-badge ${isVoid ? 'status-void' : (isReturnAction ? 'status-return' : 'status-refund')}`} style={{ textTransform: 'none' }}>
                                                        {refundedQty > 0 ? `${refundedQty} pcs` : `${item.qty || 1} pcs`}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: 'var(--table-text-muted)' }}>—</span>
                                                )}
                                            </td>
                                        )}
                                        <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--table-text-primary)', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>
                                            {fmt(item.lineNet)}
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

    const auditDetailRow = (label, value, customStyle = {}) => {
        const isCopyable = ['Invoice No.', 'Reference No.', 'OR Number'].includes(label) && value && value !== '—' && value !== 'N/A';
        return (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: '13px', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '500', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>{label}</span>
                <span style={{ color: 'var(--text-primary)', textAlign: 'right', fontWeight: '600', ...customStyle }}>
                    {isCopyable ? <CopyableText text={value} label={label} /> : value}
                </span>
            </div>
        );
    };

    const statusDisplayLabel = isPartialRefund 
        ? (status === 'Return' ? 'Partial Return' : 'Partial Refund') 
        : (isFullRefund ? (status === 'Return' ? 'Full Return' : 'Full Refund') : status);
    
    const resolvedCustomer = tx.customer_name || tx.customer?.name || (tx.customer_id ? `Customer #${tx.customer_id}` : null);

    return (
        <div className="modal-overlay" style={{ zIndex: 999 }}>
            <div className="modal-card audit-detail-card" style={{ maxWidth: '880px', width: '95%', background: 'var(--bg-card)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
                <div className="modal-header audit-detail-header" style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h3 className="modal-title" style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>{title}</h3>
                        <p className="audit-detail-subtitle" style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                            {subtitle} {resolvedCustomer ? `• Customer: ${resolvedCustomer}` : ''}
                        </p>
                    </div>
                    <button type="button" className="modal-close" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'none', stroke: 'currentColor', strokeWidth: '2' }}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div className="modal-body audit-detail-body" style={{ padding: '20px 24px', maxHeight: '70vh', overflowY: 'auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', columnGap: '32px' }}>
                        {status === 'Restocked' && (
                            <>
                                {auditDetailRow('Action', 'Inventory Restock')}
                                {auditDetailRow('Date & Time', fmtDate(tx.date || tx.created_at))}
                                {auditDetailRow('Restocked By', tx.cashier?.full_name || tx.cashier?.name || '—')}
                                {auditDetailRow('Total Qty Added', `+${tx.total_qty || 0}`, { color: '#059669', fontWeight: '700' })}
                                {auditDetailRow('Reason', reason)}
                            </>
                        )}
                        
                        {status === 'Void' && (
                            <>
                                {auditDetailRow('Invoice No.', tx.si_no || '—')}
                                {auditDetailRow('Date & Time', fmtDate(tx.date || tx.created_at))}
                                {auditDetailRow('Customer', tx.customer_name || tx.customer?.name || 'Walk-in')}
                                {auditDetailRow('Served By', tx.checker?.name || tx.cashier?.full_name || tx.cashier?.name || '—')}
                                {auditDetailRow('Original Total', fmt(totalOriginalAmount))}
                                {auditDetailRow('Voided Amount', `-${fmt(totalRefundedAmount)}`, { color: '#DC2626', fontWeight: '700' })}
                                {auditDetailRow('Net Amount', fmt(0), { color: 'var(--text-primary)', fontWeight: '700' })}
                                {auditDetailRow('Processed By', tx.approver?.full_name || tx.approver?.name || '—')}
                                {auditDetailRow('Reason', reason)}
                                {auditDetailRow('OR Number', tx.or_no || 'N/A')}
                            </>
                        )}

                        {(status === 'Deposit' || status === 'Paid') && (
                            <>
                                {auditDetailRow('Reference No.', tx.si_no || '—')}
                                {auditDetailRow('Date & Time', fmtDate(tx.date || tx.created_at))}
                                {auditDetailRow('Customer', tx.customer_name || tx.customer?.name || 'Walk-in')}
                                {auditDetailRow('Payment Method', (tx.payment_method || '—').replace(/\s*\([^)]*\)/g, '').trim())}
                                {chequeNo && auditDetailRow('Cheque Number', chequeNo)}
                                {auditDetailRow('Product Value (Full)', fmt(totalOriginalAmount))}
                                {totalDiscounts > 0 && auditDetailRow(`Total Discounts${discountTypeLabel}`, `-${fmt(totalDiscounts)}`, { color: '#2563EB', fontWeight: '700' })}
                                {auditDetailRow(status === 'Deposit' ? 'Deposit Amount Collected' : 'Payment Collected', fmt(tx.amount || tx.total), { color: 'var(--text-primary)', fontWeight: '700' })}
                                {auditDetailRow('Served By', tx.checker?.name || tx.cashier?.full_name || tx.cashier?.name || '—')}
                                {auditDetailRow('Status', status, { color: statusColor, fontWeight: '700' })}
                            </>
                        )}

                        {status !== 'Restocked' && status !== 'Void' && status !== 'Deposit' && status !== 'Paid' && (
                            <>
                                {auditDetailRow('Invoice No.', tx.si_no || '—')}
                                {auditDetailRow('Date & Time', fmtDate(tx.date || tx.created_at))}
                                {auditDetailRow('Customer', tx.customer_name || tx.customer?.name || (tx.customer_id ? `Customer #${tx.customer_id}` : 'Walk-in'))}
                                {(tx.customer?.phone || tx.customer_phone) && auditDetailRow('Contact Phone', tx.customer?.phone || tx.customer_phone)}
                                {auditDetailRow('Payment Method', (tx.payment_method || 'Cash').replace(/\s*\([^)]*\)/g, '').trim())}
                                {chequeNo && auditDetailRow('Cheque Number', chequeNo)}
                                
                                {isPartialRefund ? (
                                    <>
                                        {auditDetailRow('Original Total', fmt(totalOriginalAmount))}
                                        {auditDetailRow(isReturnAction ? 'Returned Amount' : 'Refunded Amount', `-${fmt(totalRefundedAmount)}`, { color: '#DC2626', fontWeight: '700' })}
                                        {auditDetailRow('Net Sales Remaining', fmt(netSalesRemaining), { color: 'var(--text-primary)', fontWeight: '700', fontSize: '14px' })}
                                    </>
                                ) : isFullRefund ? (
                                    <>
                                        {auditDetailRow('Original Total', fmt(totalOriginalAmount))}
                                        {auditDetailRow(isReturnAction ? 'Returned Amount' : 'Refunded Amount', `-${fmt(totalRefundedAmount)}`, { color: '#DC2626', fontWeight: '700' })}
                                        {auditDetailRow('Net Sales Remaining', fmt(0), { color: 'var(--text-primary)', fontWeight: '700', fontSize: '14px' })}
                                    </>
                                ) : (
                                    <>
                                        {grossSubtotal > 0 && auditDetailRow('Subtotal (Gross)', fmt(grossSubtotal))}
                                        {totalDiscounts > 0 && (
                                            (itemDiscountsTotal > 0 && orderDiscountAmt > 0 && itemDiscountsTotal !== orderDiscountAmt) ? (
                                                <>
                                                    {auditDetailRow('Item Discounts', `-${fmt(itemDiscountsTotal)}`, { color: '#2563EB', fontWeight: '700' })}
                                                    {auditDetailRow(`Order Discount${discountTypeLabel}`, `-${fmt(orderDiscountAmt)}`, { color: '#2563EB', fontWeight: '700' })}
                                                    {auditDetailRow('Total Discounts', `-${fmt(itemDiscountsTotal + orderDiscountAmt)}`, { color: '#2563EB', fontWeight: '700' })}
                                                </>
                                            ) : (
                                                auditDetailRow(`Discount${discountTypeLabel}`, `-${fmt(Math.max(itemDiscountsTotal, orderDiscountAmt))}`, { color: '#2563EB', fontWeight: '700' })
                                            )
                                        )}
                                        {auditDetailRow('Net Amount Paid', fmt(tx.amount || tx.total), { color: 'var(--text-primary)', fontWeight: '700', fontSize: '14px' })}
                                    </>
                                )}

                                {auditDetailRow('Served By', tx.checker?.name || tx.cashier?.full_name || tx.cashier?.name || '—')}
                                {auditDetailRow('Status', statusDisplayLabel, { color: statusColor, fontWeight: '700' })}
                                {(status === 'Refund' || status === 'Return' || isPartialRefund || reason !== '—') && auditDetailRow('Reason', reason)}
                            </>
                        )}
                    </div>

                    {status === 'Restocked' && restockEntries.length > 0 && (
                        <div style={{ marginTop: '16px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '10px' }}>Restocked Items</span>
                            <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflowX: 'auto', overflowY: 'auto', background: 'var(--bg-card)', maxHeight: '300px' }}>
                                <table className="modal-table data-table" style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead style={{ background: 'var(--table-header-bg)', borderBottom: '2px solid var(--table-border)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B' }}>
                                        <tr>
                                            <th style={{ padding: '10px 14px', fontWeight: '600' }}>Part No.</th>
                                            <th style={{ padding: '10px 14px', fontWeight: '600' }}>Product</th>
                                            <th style={{ padding: '10px 14px', fontWeight: '600', textAlign: 'right', width: '90px' }}>Prev. Stock</th>
                                            <th style={{ padding: '10px 14px', fontWeight: '600', textAlign: 'right', width: '80px' }}>Added</th>
                                            <th style={{ padding: '10px 14px', fontWeight: '600', textAlign: 'right', width: '90px' }}>New Stock</th>
                                        </tr>
                                    </thead>
                                    <tbody style={{ fontSize: '14px' }}>
                                        {restockEntries.map((entry, idx) => {
                                            const prevStock = entry.previous_stock ?? (entry.new_stock != null ? entry.new_stock - entry.qty : '—');
                                            return (
                                                <tr key={idx} style={{ borderBottom: '1px solid var(--table-border-subtle)', minHeight: '44px' }}>
                                                    <td style={{ padding: '10px 14px', fontWeight: '600', color: 'var(--table-text-primary)', fontVariantNumeric: 'tabular-nums', fontSize: '14px' }}>
                                                        <CopyableText text={entry.part_no || '—'} label="Part No." codeStyle={{ fontSize: '14px', fontWeight: '600' }} />
                                                    </td>
                                                    <td style={{ padding: '10px 14px', color: 'var(--table-text-primary)' }}>
                                                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{entry.name || '—'}</div>
                                                        {entry.category && <div style={{ fontSize: '12px', color: 'var(--table-text-muted)', marginTop: '2px' }}>{entry.category}{entry.address ? ` · ${entry.address}` : ''}</div>}
                                                    </td>
                                                    <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--table-text-secondary)', fontWeight: '600', fontVariantNumeric: 'tabular-nums', fontSize: '14px' }}>
                                                        {prevStock}
                                                    </td>
                                                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', fontVariantNumeric: 'tabular-nums', fontSize: '14px' }}>
                                                        <span style={{ color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '2px 8px', borderRadius: '12px', fontSize: '13px' }}>
                                                            +{entry.qty || 0}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-primary)', fontWeight: '700', fontVariantNumeric: 'tabular-nums', fontSize: '14px' }}>
                                                        {entry.new_stock || 0}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    {itemsBlock}
                </div>
                <div className="modal-footer audit-detail-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--table-header-bg)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={onClose} style={{ padding: '8px 24px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>Close</button>
                </div>
            </div>
        </div>
    );
}
