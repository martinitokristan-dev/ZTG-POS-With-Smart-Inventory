import React from 'react';
import IOSSelect from '../../../../shared/components/IOSSelect';

export default function FulfillOrderModal({
    isOpen, onClose, onSubmit, selected,
    ffPaymentMethod, setFfPaymentMethod,
    ffChequeNumber, setFfChequeNumber,
    ffAmountReceived, setFfAmountReceived,
    ffDocType, setFfDocType,
    ffNotes, setFfNotes,
    ffError, ffLoading,
    ffBalanceDue, ffChange,
    userName, fmt, fmtDate
}) {
    if (!isOpen || !selected) return null;

    return (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal-card" style={{ maxWidth: '1050px' }}>
                <div className="modal-header">
                    <h3 className="modal-title">Fulfill Order — Customer Pickup</h3>
                    <button className="modal-close" onClick={onClose}>
                        <svg viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>

                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '480px' }}>
                    <div style={{
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: '#34D399',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 500,
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', flexShrink: 0, stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        <span>Customer is here to pick up their order. Collect the balance due and complete the transaction to release items from warehouse.</span>
                    </div>

                    {ffError && (
                        <div style={{ background: 'var(--danger-light)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--danger)', padding: '10px 14px', borderRadius: '6px', fontSize: '13px' }}>
                            {ffError}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '24px', flex: 1, flexWrap: 'wrap' }}>
                        {/* LEFT: Order info + items */}
                        <div style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '10px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Order Information</h4>
                                <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                                    <tbody>
                                        {[
                                            ['Customer', selected.customer?.name || selected.customer_name || '—'],
                                            ['Contact', selected.customer?.phone || selected.customer_phone || '—'],
                                            ['Order Date', fmtDate(selected.date || selected.created_at)],
                                            ['Pickup Date', fmtDate(selected.pickup_date)],
                                        ].map(([label, val]) => (
                                            <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                                                <td style={{ padding: '8px 0', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 500 }}>{label}</td>
                                                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>{val}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div>
                                <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '10px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Items to Release</h4>
                                <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px', background: 'var(--bg-card)' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                        <tbody>
                                            {selected.items?.map((item, idx) => (
                                                <tr key={item.id || idx} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-secondary)' }}>
                                                    <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                        <div>{item.product?.name || item.item_name || item.name || '—'}</div>
                                                        {(item.chinese_name || item.product?.chinese_name) && (
                                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal', marginTop: '2px' }}>{item.chinese_name || item.product?.chinese_name}</div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', textAlign: 'center', fontWeight: 600 }}>×{item.qty}</td>
                                                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>{fmt(item.price * item.qty)}</td>
                                                </tr>
                                            )) || <tr><td colSpan="3" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>No items</td></tr>}
                                        </tbody>
                                    </table>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                                    <div style={{
                                        background: 'rgba(245, 158, 11, 0.12)',
                                        borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
                                        padding: '14px 16px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#FBBF24', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Balance Due (to collect now)</span>
                                        <span style={{ fontSize: '18px', fontWeight: 800, color: '#F59E0B', fontVariantNumeric: 'tabular-nums' }}>{fmt(ffBalanceDue)}</span>
                                    </div>
                                    <div style={{
                                        background: 'var(--bg-secondary)',
                                        padding: '14px 16px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px'
                                    }}>
                                        {[
                                            ['Subtotal', fmt(Number(selected.total || 0) / 1.12)],
                                            ['Tax (12%)', fmt(Number(selected.total || 0) - Number(selected.total || 0) / 1.12)],
                                        ].map(([l, v]) => (
                                            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '12px' }}>
                                                <span>{l}</span><span style={{ fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{v}</span>
                                            </div>
                                        ))}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Total Amount</span>
                                            <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}>{fmt(selected.total)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '12px' }}>
                                            <span>Deposit Paid</span><span style={{ fontWeight: 600, color: '#38BDF8', fontVariantNumeric: 'tabular-nums' }}>− {fmt(selected.deposit)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Collect balance + transaction */}
                        <div style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '10px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                                    {ffBalanceDue <= 0 ? 'Payment Status: Pre-paid' : 'Collect Balance Payment'}
                                </h4>
                                {ffBalanceDue <= 0 ? (
                                    <div style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '10px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, marginBottom: '12px' }}>
                                        ✓ This reservation was fully paid upfront. Balance due is ₱0.
                                    </div>
                                ) : (
                                    <>
                                        <div className="form-group" style={{ marginBottom: '12px' }}>
                                            <label className="form-label" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Payment Method <span style={{ color: 'var(--danger)' }}>*</span></label>
                                            <IOSSelect
                                                value={ffPaymentMethod}
                                                onChange={(e) => setFfPaymentMethod(e.target.value)}
                                                options={[
                                                    { value: 'Cash', label: 'Cash' },
                                                    { value: 'GCash', label: 'GCash' },
                                                    { value: 'Bank', label: 'Bank Transfer' },
                                                    { value: 'Cheque', label: 'Cheque' }
                                                ]}
                                            />
                                        </div>
                                        {ffPaymentMethod === 'Cheque' && (
                                            <div className="form-group" style={{ marginBottom: '12px' }}>
                                                <label className="form-label" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Cheque Number <span style={{ color: 'var(--danger)' }}>*</span></label>
                                                <input type="text" className="form-control" required placeholder="e.g. CHK-987654" value={ffChequeNumber} onChange={(e) => setFfChequeNumber(e.target.value)} style={{ fontSize: '13px', fontWeight: 600 }} />
                                            </div>
                                        )}
                                        <div className="form-group" style={{ marginBottom: '12px' }}>
                                            <label className="form-label" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                                                {ffPaymentMethod === 'Cheque' ? 'Cheque Amount' : 'Amount Received'} <span style={{ color: 'var(--danger)' }}>*</span>
                                            </label>
                                            <input type="number" className="form-control" min="0" required placeholder={`Minimum: ${fmt(ffBalanceDue)}`} value={ffAmountReceived} onChange={(e) => setFfAmountReceived(e.target.value)} style={{ fontSize: '14px', fontWeight: 600 }} />
                                        </div>
                                        {ffPaymentMethod === 'Cash' && (
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Change</label>
                                                <input type="text" className="form-control" readOnly value={fmt(ffChange)} style={{ fontSize: '14px', fontWeight: 700, color: '#10B981', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }} />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <div>
                                <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '10px', letterSpacing: '0.5px', textTransform: 'uppercase', marginTop: '4px' }}>Transaction Details</h4>
                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Document Type <span style={{ color: 'var(--danger)' }}>*</span></label>
                                    <IOSSelect
                                        value={ffDocType}
                                        onChange={(e) => setFfDocType(e.target.value)}
                                        options={[
                                            { value: 'S.I.', label: 'S.I. (Sales Invoice)' },
                                            { value: 'C.R.', label: 'C.R. (Collection Receipt)' },
                                            { value: 'D.R.', label: 'D.R. (Delivery Receipt)' }
                                        ]}
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Served By</label>
                                    <input type="text" className="form-control" readOnly value={userName} style={{ fontSize: '13px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                                </div>
                                <div className="form-group" style={{ marginBottom: '16px' }}>
                                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Release Notes (Optional)</label>
                                    <textarea className="form-control" placeholder="Any notes about item condition, delivery instructions..." value={ffNotes} onChange={(e) => setFfNotes(e.target.value)} style={{ fontSize: '13px', minHeight: '70px', resize: 'vertical' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-success" onClick={onSubmit} disabled={ffLoading}>
                        {ffLoading ? 'Processing...' : 'Complete Fulfillment'}
                    </button>
                </div>
            </div>
        </div>
    );
}
