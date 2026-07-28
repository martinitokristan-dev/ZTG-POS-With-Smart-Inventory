import React from 'react';
import CopyableText from '../../../../shared/components/CopyableText';

export default function TransactionDetailsModal({ isOpen, onClose, transaction, fmtDate, fmt }) {
    if (!isOpen || !transaction) return null;

    const tx = transaction;
    const status = tx.status || 'Unknown';
    const reason = tx.reason || tx.refund_reason || tx.void_reason || '—';

    let title = 'Transaction Details';
    let subtitle = tx.si_no || '—';
    let statusColor = '#334155';
    let itemsBlock = null;

    if (status === 'Restocked') {
        title = 'Restock Details';
        subtitle = 'Inventory restock record';
        statusColor = '#059669';
    } else if (status === 'Void') {
        title = 'Void Transaction Details';
        subtitle = 'Cancelled sale record';
        statusColor = '#DC2626';
    } else if (status === 'Deposit' || status === 'Paid') {
        title = status === 'Deposit' ? 'Reservation Deposit' : 'Full Payment';
        subtitle = tx.order_ref || tx.si_no || '—';
        statusColor = status === 'Deposit' ? '#D97706' : '#059669';
    } else {
        title = 'Transaction Details';
        subtitle = tx.si_no || '—';
        statusColor = status === 'Completed' ? '#059669' : '#334155';
    }

    const txItems = Array.isArray(tx.items) ? tx.items : [];

    // Calculate overall financial totals across transaction items
    let grossSubtotal = 0;
    let itemDiscountsTotal = 0;

    const processedItems = txItems.map(item => {
        const qty = Number(item.qty || 1);
        let origPrice = Number(item.original_price || item.price || 0);
        let itemDisc = Number(item.discount || item.item_discount || 0);

        // Fallback for older records where price was saved as net price instead of orig price
        if (item.original_price && Number(item.original_price) > Number(item.price) && itemDisc === 0) {
            origPrice = Number(item.original_price);
            itemDisc = origPrice - Number(item.price);
        }

        const lineGross = qty * origPrice;
        const lineDisc = qty * itemDisc;
        const lineNet = Math.max(0, lineGross - lineDisc);

        grossSubtotal += lineGross;
        itemDiscountsTotal += lineDisc;

        return {
            ...item,
            qty,
            unitPrice: origPrice,
            itemDisc,
            lineNet
        };
    });

    const orderDiscountAmt = Number(tx.discount_amount || 0);
    const totalDiscounts = itemDiscountsTotal + orderDiscountAmt;
    const discountTypeLabel = tx.discount_type ? ` (${tx.discount_type})` : '';

    if (status !== 'Restocked' && status !== 'Damaged' && processedItems.length > 0) {
        itemsBlock = (
            <div className="audit-detail-section" style={{ marginTop: '14px' }}>
                <span className="audit-detail-section-title" style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: '8px', display: 'block', letterSpacing: '0.5px' }}>Items Purchased</span>
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden', background: '#FFFFFF', maxHeight: '250px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                        <thead style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: '10px', textTransform: 'uppercase', color: '#64748B' }}>
                            <tr>
                                <th style={{ padding: '8px 12px', fontWeight: '600' }}>Part No.</th>
                                <th style={{ padding: '8px 12px', fontWeight: '600' }}>Product</th>
                                <th style={{ padding: '8px 12px', fontWeight: '600', textAlign: 'center', width: '50px' }}>Qty</th>
                                <th style={{ padding: '8px 12px', fontWeight: '600', textAlign: 'right', width: '90px' }}>Price</th>
                                <th style={{ padding: '8px 12px', fontWeight: '600', textAlign: 'center', width: '95px' }}>Discounted</th>
                                <th style={{ padding: '8px 12px', fontWeight: '600', textAlign: 'right', width: '100px' }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                             {processedItems.map((item, index) => {
                                const partNo = item.product?.part_no || item.part_no || '—';
                                const name = item.product?.name || item.name || 'Unknown Part';
                                const chineseName = item.product?.chinese_name || item.chinese_name;
                                const itemDiscTotal = item.itemDisc * item.qty;

                                return (
                                    <tr key={index} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                        <td style={{ padding: '10px 12px' }}>
                                            <CopyableText text={partNo} label="Part No." />
                                        </td>
                                        <td style={{ padding: '10px 12px', color: '#334155' }}>
                                            <div style={{ fontWeight: '600' }}>{name}</div>
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'center', color: '#0F172A', fontWeight: '700' }}>{item.qty}</td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#475569' }}>
                                            {fmt(item.unitPrice)}
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'center', color: itemDiscTotal > 0 ? '#2563EB' : '#94A3B8', fontWeight: itemDiscTotal > 0 ? '700' : '400' }}>
                                            {itemDiscTotal > 0 ? `-${fmt(itemDiscTotal)}` : '—'}
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0F172A', fontWeight: '700' }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F1F5F9', fontSize: '13px', alignItems: 'center' }}>
                <span style={{ color: '#64748B', fontWeight: '500', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>{label}</span>
                <span style={{ color: '#0F172A', textAlign: 'right', fontWeight: '600', ...customStyle }}>
                    {isCopyable ? <CopyableText text={value} label={label} /> : value}
                </span>
            </div>
        );
    };

    const resolvedCustomer = tx.customer_name || tx.customer?.name || (tx.customer_id ? `Customer #${tx.customer_id}` : null);

    return (
        <div className="modal-overlay" style={{ zIndex: 999 }}>
            <div className="modal-card audit-detail-card" style={{ maxWidth: '680px', width: '95%', background: '#FFFFFF', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                <div className="modal-header audit-detail-header" style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h3 className="modal-title" style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#111827' }}>{title}</h3>
                        <p className="audit-detail-subtitle" style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#475569', fontWeight: '600' }}>
                            {subtitle} {resolvedCustomer ? `• Customer: ${resolvedCustomer}` : ''}
                        </p>
                    </div>
                    <button type="button" className="modal-close" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                        <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'none', stroke: 'currentColor', strokeWidth: '2' }}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div className="modal-body audit-detail-body" style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {status === 'Restocked' && (
                            <>
                                {auditDetailRow('Invoice No.', tx.si_no || '—')}
                                {auditDetailRow('Date & Time', fmtDate(tx.date || tx.created_at))}
                                {auditDetailRow('Verified By', tx.cashier?.name || '—')}
                                {auditDetailRow('Source', tx.customer_name || tx.customer?.name || 'SUPPLIER RESTOCK')}
                                {auditDetailRow('Status', status, { color: statusColor, fontWeight: '700' })}
                            </>
                        )}
                        
                        {status === 'Void' && (
                            <>
                                {auditDetailRow('Invoice No.', tx.si_no || '—')}
                                {auditDetailRow('Date & Time', fmtDate(tx.date || tx.created_at))}
                                {auditDetailRow('Customer', tx.customer_name || tx.customer?.name || 'Walk-in')}
                                {auditDetailRow('Served By', tx.checker?.name || tx.cashier?.name || '—')}
                                {auditDetailRow('Subtotal (Gross)', fmt(grossSubtotal > 0 ? grossSubtotal : (tx.amount || tx.total)))}
                                {totalDiscounts > 0 && auditDetailRow(`Total Discounts${discountTypeLabel}`, `-${fmt(totalDiscounts)}`, { color: '#2563EB', fontWeight: '700' })}
                                {auditDetailRow('Amount', fmt(tx.amount || tx.total))}
                                {auditDetailRow('Processed By', tx.approver?.real_name || tx.approver?.name || '—')}
                                {auditDetailRow('Reason', tx.void_reason || '—')}
                                {auditDetailRow('OR Number', tx.or_no || 'N/A')}
                            </>
                        )}

                        {(status === 'Deposit' || status === 'Paid') && (
                            <>
                                {auditDetailRow('Reference No.', tx.si_no || '—')}
                                {auditDetailRow('Date & Time', fmtDate(tx.date || tx.created_at))}
                                {auditDetailRow('Customer', tx.customer_name || tx.customer?.name || 'Walk-in')}
                                {auditDetailRow('Payment Method', tx.payment_method || '—')}
                                {auditDetailRow('Subtotal (Gross)', fmt(grossSubtotal > 0 ? grossSubtotal : (tx.amount || tx.total)))}
                                {totalDiscounts > 0 && auditDetailRow(`Total Discounts${discountTypeLabel}`, `-${fmt(totalDiscounts)}`, { color: '#2563EB', fontWeight: '700' })}
                                {auditDetailRow('Amount', fmt(tx.amount || tx.total))}
                                {auditDetailRow('Served By', tx.checker?.name || tx.cashier?.name || '—')}
                                {auditDetailRow('Status', status, { color: statusColor, fontWeight: '700' })}
                            </>
                        )}

                        {status !== 'Restocked' && status !== 'Void' && status !== 'Deposit' && status !== 'Paid' && (
                            <>
                                {auditDetailRow('Invoice No.', tx.si_no || '—')}
                                {auditDetailRow('Date & Time', fmtDate(tx.date || tx.created_at))}
                                {auditDetailRow('Customer', tx.customer_name || tx.customer?.name || (tx.customer_id ? `Customer #${tx.customer_id}` : 'Walk-in'))}
                                {(tx.customer?.phone || tx.customer_phone) && auditDetailRow('Contact Phone', tx.customer?.phone || tx.customer_phone)}
                                {auditDetailRow('Payment Method', tx.payment_method || 'Cash')}
                                {grossSubtotal > 0 && auditDetailRow('Subtotal (Gross)', fmt(grossSubtotal))}
                                {itemDiscountsTotal > 0 && auditDetailRow('Item Discounts', `-${fmt(itemDiscountsTotal)}`, { color: '#2563EB', fontWeight: '700' })}
                                {orderDiscountAmt > 0 && auditDetailRow(`Order Discount${discountTypeLabel}`, `-${fmt(orderDiscountAmt)}`, { color: '#2563EB', fontWeight: '700' })}
                                {totalDiscounts > 0 && itemDiscountsTotal > 0 && orderDiscountAmt > 0 && auditDetailRow('Total Discounts', `-${fmt(totalDiscounts)}`, { color: '#2563EB', fontWeight: '700' })}
                                {auditDetailRow('Net Amount Paid', fmt(tx.amount || tx.total), { color: '#0F172A', fontWeight: '700', fontSize: '15px' })}
                                {auditDetailRow('Served By', tx.checker?.name || tx.cashier?.name || '—')}
                                {auditDetailRow('Status', status, { color: statusColor, fontWeight: '700' })}
                                {(status === 'Refund' || status === 'Return' || reason !== '—') && auditDetailRow('Reason', reason)}
                            </>
                        )}
                    </div>
                    {itemsBlock}
                </div>
                <div className="modal-footer" style={{ padding: '16px 24px', borderTop: 'none', background: '#FFFFFF', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn" onClick={onClose} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '8px 24px', borderRadius: '6px', fontWeight: '500', color: '#475569', cursor: 'pointer', fontSize: '14px' }}>Close</button>
                </div>
            </div>
        </div>
    );
}
