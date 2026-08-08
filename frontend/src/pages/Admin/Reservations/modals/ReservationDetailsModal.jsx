import React from 'react';
import CopyableText from '../../../../shared/components/CopyableText';
import StatusBadge from '../../../../shared/components/StatusBadge';
import FormattedProductName from '../../../../shared/components/FormattedProductName';

export default function ReservationDetailsModal({ isOpen, onClose, reservation, fmt, fmtDate }) {
    if (!isOpen || !reservation) return null;

    const r = reservation;
    const rawStatus = (r.status?.value || r.status || '').toLowerCase();
    const depositVal = Number(r.deposit || 0);
    const totalVal = Number(r.total || 0);
    const balanceDue = Math.max(0, totalVal - depositVal);
    const isDirectFull = (r.payment_type === 'full' || r.payment_type?.value === 'full') || (depositVal >= totalVal && totalVal > 0);

    let badgeStatus = 'pending';
    if (rawStatus === 'completed') {
        badgeStatus = 'fully paid';
    } else if (rawStatus === 'cancelled') {
        badgeStatus = 'cancelled';
    } else {
        badgeStatus = (depositVal > 0 && depositVal < totalVal) ? 'deposit' : 'fully paid';
    }

    const orderNo = r.order_no || `RS-${String(r.id).padStart(3, '0')}`;
    const custName = r.customer?.name || r.customer_name || '—';
    const custPhone = r.customer?.phone || r.customer_phone || '—';
    const custEmail = r.customer?.email || r.email || '—';
    const reservedByName = r.reserved_by?.real_name || r.reserved_by?.name || '—';
    const fulfilledByName = r.fulfilled_by?.real_name || r.fulfilled_by?.name || null;
    const items = r.items || [];

    const dateReserved = fmtDate(r.date || r.created_at);
    const fullyPaidDate = rawStatus === 'completed'
        ? fmtDate(r.updated_at)
        : (isDirectFull ? dateReserved : null);

    const detailRow = (label, value, customStyle = {}) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F1F5F9', fontSize: '13px', alignItems: 'center' }}>
            <span style={{ color: '#64748B', fontWeight: '500', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>{label}</span>
            <span style={{ color: '#0F172A', textAlign: 'right', fontWeight: '600', ...customStyle }}>{value}</span>
        </div>
    );

    return (
        <div className="modal-overlay" style={{ zIndex: 999 }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal-card" style={{ maxWidth: '680px', width: '95%', background: '#FFFFFF', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                {/* Header */}
                <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                            <h3 className="modal-title" style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#111827' }}>Reservation Details</h3>
                            <StatusBadge status={badgeStatus} />
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', color: '#475569', fontWeight: '600' }}>
                            Order Ref: <CopyableText text={orderNo} label="Order Ref" codeStyle={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary)' }} />
                        </p>
                    </div>
                    <button type="button" className="modal-close" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                        <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'none', stroke: 'currentColor', strokeWidth: '2' }}>
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="modal-body" style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {detailRow('Customer Name', custName)}
                        {detailRow('Contact Phone', custPhone)}
                        {custEmail !== '—' && detailRow('Customer Email', custEmail)}
                        {detailRow('Date Placed / Reserved', dateReserved)}
                        {fullyPaidDate && detailRow('Fully Paid Date', fullyPaidDate, { color: '#059669', fontWeight: '700' })}
                        {detailRow('Expected Pickup', fmtDate(r.pickup_date))}
                        {detailRow('Payment Method', r.payment_method || 'Cash')}
                        {detailRow('Payment Type', isDirectFull ? 'Full Payment (100%)' : '50% Deposit')}
                        {detailRow('Reserved By', reservedByName)}
                        {fulfilledByName && detailRow('Fulfilled By', fulfilledByName, { color: '#059669', fontWeight: '700' })}
                        {r.notes && detailRow('Notes', r.notes)}

                        {/* Financials */}
                        <div style={{ marginTop: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px' }}>
                            {detailRow('Total Order Price', fmt(totalVal), { fontSize: '15px', fontWeight: '700' })}
                            {!isDirectFull && detailRow('Deposit Amount Paid', fmt(depositVal), { color: 'var(--primary)', fontWeight: '700' })}
                            {!isDirectFull && rawStatus === 'completed' && (
                                detailRow('Balance Paid at Pickup', fmt(totalVal - depositVal), { color: 'var(--success)', fontWeight: '700' })
                            )}
                            {!isDirectFull && rawStatus !== 'completed' && balanceDue > 0 && (
                                detailRow('Balance Due at Pickup', fmt(balanceDue), { color: 'var(--danger)', fontWeight: '700', fontSize: '14px' })
                            )}
                            {isDirectFull && (
                                detailRow('Amount Paid Upfront', fmt(totalVal), { color: 'var(--success)', fontWeight: '700' })
                            )}
                        </div>

                        {/* Items Table */}
                        {items.length > 0 && (
                            <div style={{ marginTop: '20px' }}>
                                <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                                    Reserved Items ({items.length})
                                </span>
                                <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden', background: '#FFFFFF' }}>
                                    <table className="modal-table data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                        <thead style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#64748B', fontSize: '12px', textTransform: 'uppercase' }}>
                                            <tr>
                                                <th style={{ padding: '8px 12px', fontWeight: '600' }}>Part No.</th>
                                                <th style={{ padding: '8px 12px', fontWeight: '600' }}>Product</th>
                                                <th style={{ padding: '8px 12px', fontWeight: '600', textAlign: 'center', width: '60px' }}>Qty</th>
                                                <th style={{ padding: '8px 12px', fontWeight: '600', textAlign: 'right', width: '100px' }}>Unit Price</th>
                                                <th style={{ padding: '8px 12px', fontWeight: '600', textAlign: 'right', width: '110px' }}>Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((item, idx) => {
                                                const pNo = item.product?.part_no || item.part_no || '—';
                                                const pName = item.product?.name || item.name || 'Unknown Product';
                                                const unitPrice = Number(item.price || 0);
                                                const qty = Number(item.qty || 1);
                                                const lineTotal = unitPrice * qty;

                                                return (
                                                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                                        <td style={{ padding: '10px 12px', fontWeight: '600' }}>
                                                            <CopyableText text={pNo} label="Part No." codeStyle={{ fontSize: '13px', fontWeight: '600' }} />
                                                        </td>
                                                        <td style={{ padding: '10px 12px', color: '#0F172A' }}>
                                                            <FormattedProductName name={pName} />
                                                        </td>
                                                        <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600' }}>{qty}</td>
                                                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748B' }}>{fmt(unitPrice)}</td>
                                                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: '#0F172A' }}>{fmt(lineTotal)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', background: '#FFFFFF', display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-outline" onClick={onClose} style={{ padding: '8px 24px', borderRadius: '6px', fontWeight: '600' }}>Close</button>
                </div>
            </div>
        </div>
    );
}
