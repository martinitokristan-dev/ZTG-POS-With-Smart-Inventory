import React from 'react';
import CopyableText from '../../../../shared/components/CopyableText';
import StatusBadge from '../../../../shared/components/StatusBadge';
import FormattedProductName from '../../../../shared/components/FormattedProductName';

export default function ReservationDetailsModal({ isOpen, onClose, reservation, fmt, fmtDate, onPrintCR }) {
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

    const custName = r.customer?.name || r.customer_name || '—';
    const custPhone = r.customer?.phone || r.customer_phone || '—';
    const custEmail = r.customer?.email || r.email || '—';
    const reservedByName = r.reserved_by?.real_name || r.reserved_by?.name || '—';
    const fulfilledByName = r.fulfilled_by?.real_name || r.fulfilled_by?.name || null;
    const items = r.items || [];
    const chequeNo = r.cheque_number || (r.payment_method && r.payment_method.includes('(#') ? r.payment_method.match(/\(#([^)]+)\)/)?.[1] : null);
    const crNo = r.si_no || (rawStatus === 'completed' ? r.order_no : null);

    const dateReserved = fmtDate(r.date || r.created_at);
    const fullyPaidDate = rawStatus === 'completed'
        ? fmtDate(r.date_get || r.updated_at)
        : (isDirectFull ? dateReserved : null);

    const detailRow = (label, value, customStyle = {}) => {
        const isCopyable = ['Order Number', 'C.R. No.', 'Collection Receipt (C.R. No.)'].includes(label) && value && value !== '—';
        return (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: '13px', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '500', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>{label}</span>
                <span style={{ color: 'var(--text-primary)', textAlign: 'right', fontWeight: '600', ...customStyle }}>
                    {isCopyable ? <CopyableText text={value} label={label} /> : value}
                </span>
            </div>
        );
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 999 }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal-card audit-detail-card" style={{ maxWidth: '880px', width: '95%', background: 'var(--bg-card)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}>
                {/* Header */}
                <div className="modal-header audit-detail-header" style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h3 className="modal-title" style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>Reservation Details</h3>
                            <StatusBadge status={badgeStatus} />
                        </div>
                        <p className="audit-detail-subtitle" style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                            Order: {r.order_no} • Customer: {custName}
                        </p>
                    </div>
                    <button type="button" className="modal-close" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'none', stroke: 'currentColor', strokeWidth: '2' }}>
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="modal-body audit-detail-body" style={{ padding: '20px 24px', maxHeight: '70vh', overflowY: 'auto', background: 'var(--bg-card)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', columnGap: '32px' }}>
                        {detailRow('Order Number', r.order_no, { color: 'var(--primary)', fontWeight: '700' })}
                        {crNo && detailRow('Collection Receipt (C.R. No.)', crNo, { color: '#059669', fontWeight: '700' })}
                        {detailRow('Customer Name', custName)}
                        {detailRow('Contact Phone', custPhone)}
                        {custEmail !== '—' && detailRow('Customer Email', custEmail)}
                        {detailRow('Date Placed', dateReserved)}
                        {detailRow('Expected Pickup', fmtDate(r.pickup_date))}
                        {detailRow('Payment Method', (r.payment_method || 'Cash').replace(/\s*\([^)]*\)/g, '').trim())}
                        {chequeNo && detailRow('Cheque Number', chequeNo)}
                        {detailRow('Payment Type', isDirectFull ? 'Full Payment (100%)' : '50% Deposit')}
                        {detailRow('Total Order Price', fmt(totalVal), { fontWeight: '700' })}
                        {!isDirectFull && detailRow('Deposit Amount Paid', fmt(depositVal), { color: 'var(--primary)', fontWeight: '700' })}
                        {!isDirectFull && rawStatus === 'completed' && (
                            detailRow('Balance Paid at Pickup', fmt(totalVal - depositVal), { color: 'var(--success)', fontWeight: '700' })
                        )}
                        {!isDirectFull && rawStatus !== 'completed' && balanceDue > 0 && (
                            detailRow('Balance Due at Pickup', fmt(balanceDue), { color: 'var(--danger)', fontWeight: '700' })
                        )}
                        {detailRow('Reserved By', reservedByName)}
                        {fullyPaidDate && detailRow('Fulfilled / Paid Date', fullyPaidDate, { color: 'var(--success)', fontWeight: '700' })}
                        {fulfilledByName && detailRow('Fulfilled By', fulfilledByName, { color: 'var(--success)', fontWeight: '700' })}
                        {r.notes && detailRow('Notes', r.notes)}
                    </div>

                    {/* Items Table */}
                    {items.length > 0 && (
                        <div className="audit-detail-section" style={{ marginTop: '16px' }}>
                            <span className="audit-detail-section-title" style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                                Reserved Items ({items.length})
                            </span>
                            <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflowX: 'hidden', overflowY: 'auto', background: 'var(--bg-card)', maxHeight: '250px' }}>
                                <table className="modal-table data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', tableLayout: 'fixed' }}>
                                    <thead style={{ background: 'var(--table-header-bg)', borderBottom: '2px solid var(--table-border)', color: 'var(--table-text-secondary)', fontSize: '12px' }}>
                                        <tr>
                                            <th style={{ padding: '10px 12px', fontWeight: '600', letterSpacing: '0.02em', width: '130px' }}>Part No.</th>
                                            <th style={{ padding: '10px 12px', fontWeight: '600', letterSpacing: '0.02em' }}>Product</th>
                                            <th style={{ padding: '10px 12px', fontWeight: '600', letterSpacing: '0.02em', textAlign: 'center', width: '55px' }}>Qty</th>
                                            <th style={{ padding: '10px 12px', fontWeight: '600', letterSpacing: '0.02em', textAlign: 'right', width: '95px' }}>Unit Price</th>
                                            <th style={{ padding: '10px 12px', fontWeight: '600', letterSpacing: '0.02em', textAlign: 'right', width: '100px' }}>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody style={{ fontSize: '14px' }}>
                                        {items.map((item, idx) => {
                                            const rawPNo = item.product?.part_no || item.part_no;
                                            const pNo = (!rawPNo || String(rawPNo).trim().toUpperCase() === 'N/A' || String(rawPNo).trim() === '') ? '—' : String(rawPNo).trim();
                                            const isDash = pNo === '—';
                                            const pName = item.product?.name || item.item_name || item.name || 'Unknown Product';
                                            const unitPrice = Number(item.price || 0);
                                            const qty = Number(item.qty || 1);
                                            const lineTotal = unitPrice * qty;

                                            return (
                                                <tr key={idx} style={{ borderBottom: '1px solid var(--table-border-subtle)', minHeight: '44px' }}>
                                                    <td style={{ padding: '10px 12px', fontWeight: isDash ? '500' : '600', color: isDash ? 'var(--text-secondary)' : 'var(--primary)', fontVariantNumeric: 'tabular-nums', overflow: 'hidden' }}>
                                                        {isDash ? (
                                                            '—'
                                                        ) : (
                                                            <CopyableText text={pNo} label="Part No." codeStyle={{ fontSize: '13px', fontWeight: '600' }} />
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '10px 12px', color: 'var(--table-text-primary)', overflow: 'hidden' }}>
                                                        <div style={{ fontSize: '14px', overflow: 'hidden' }}><FormattedProductName name={pName} /></div>
                                                    </td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', color: 'var(--table-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{qty}</td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--table-text-secondary)', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>{fmt(unitPrice)}</td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: 'var(--table-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{fmt(lineTotal)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="modal-footer audit-detail-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--table-header-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        {rawStatus === 'completed' && onPrintCR && (
                            <button 
                                type="button" 
                                className="btn btn-outline" 
                                onClick={() => onPrintCR(r)}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#059669', borderColor: '#A7F3D0' }}
                            >
                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                                    <rect x="6" y="14" width="12" height="8"></rect>
                                </svg>
                                Reprint Collection Receipt (C.R.)
                            </button>
                        )}
                    </div>
                    <button type="button" className="btn btn-secondary" onClick={onClose} style={{ padding: '8px 24px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>Close</button>
                </div>
            </div>
        </div>
    );
}
