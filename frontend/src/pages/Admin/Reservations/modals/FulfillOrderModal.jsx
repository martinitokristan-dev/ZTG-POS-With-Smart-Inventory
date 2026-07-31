import React from 'react';
import IOSSelect from '../../../../shared/components/IOSSelect';

export default function FulfillOrderModal({
    isOpen, onClose, onSubmit, selected,
    ffPaymentMethod, setFfPaymentMethod,
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

                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '24px', minHeight: '500px' }}>
                    <div style={{ background: '#DCFCE7', color: '#166534', padding: '12px 16px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, border: '1px solid #86EFAC' }}>
                        Customer is here to pick up their order. Collect the balance due and complete the transaction to release items from warehouse.
                    </div>

                    {ffError && (
                        <div style={{ background: 'var(--danger-light)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--danger)', padding: '10px 14px', borderRadius: '6px', fontSize: '13px' }}>
                            {ffError}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '24px', flex: 1 }}>
                        {/* LEFT: Order info + items */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '12px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Order Information</h4>
                                <table style={{ width: '100%', fontSize: '13px', color: '#334155' }}>
                                    <tbody>
                                        {[
                                            ['Order Number', selected.order_no || `RS-${String(selected.id).padStart(3, '0')}`],
                                            ['Customer', selected.customer?.name || selected.customer_name || '—'],
                                            ['Contact', selected.customer?.phone || selected.customer_phone || '—'],
                                            ['Order Date', fmtDate(selected.date || selected.created_at)],
                                            ['Pickup Date', fmtDate(selected.pickup_date)],
                                        ].map(([label, val]) => (
                                            <tr key={label}>
                                                <td style={{ padding: '6px 0', color: '#64748B' }}>{label}</td>
                                                <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600, color: '#0F172A' }}>{val}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div>
                                <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '12px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Items to Release</h4>
                                <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                        <tbody>
                                            {selected.items?.map((item, idx) => (
                                                <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9', background: idx % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                                                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                                                        <div>{item.product?.name || item.name || '—'}</div>
                                                        {(item.chinese_name || item.product?.chinese_name) && (
                                                            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 'normal' }}>{item.chinese_name || item.product?.chinese_name}</div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', textAlign: 'center' }}>×{item.qty}</td>
                                                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>{fmt(item.price * item.qty)}</td>
                                                </tr>
                                            )) || <tr><td colSpan="3" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>No items</td></tr>}
                                        </tbody>
                                    </table>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '8px 8px 0 0', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #FCD34D' }}>
                                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#92400E' }}>Balance Due (to collect now)</span>
                                        <span style={{ fontSize: '20px', fontWeight: 800, color: '#B45309' }}>{fmt(ffBalanceDue)}</span>
                                    </div>
                                    <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {[
                                            ['Subtotal', fmt(Number(selected.total || 0) / 1.12)],
                                            ['Tax (12%)', fmt(Number(selected.total || 0) - Number(selected.total || 0) / 1.12)],
                                        ].map(([l, v]) => (
                                            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', color: '#3B82F6', fontSize: '12px' }}>
                                                <span>{l}</span><span>{v}</span>
                                            </div>
                                        ))}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid rgba(59,130,246,0.2)' }}>
                                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E40AF' }}>Total Amount</span>
                                            <span style={{ fontSize: '14px', fontWeight: 800, color: '#1E40AF' }}>{fmt(selected.total)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#3B82F6', fontSize: '12px' }}>
                                            <span>Deposit Paid</span><span>− {fmt(selected.deposit)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Collect balance + transaction */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '12px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                                    {ffBalanceDue <= 0 ? 'Payment Status: Pre-paid' : 'Collect Balance Payment'}
                                </h4>
                                {ffBalanceDue <= 0 ? (
                                    <div style={{ background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', padding: '10px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, marginBottom: '12px' }}>
                                        ✓ This reservation was fully paid upfront. Balance due is ₱0.
                                    </div>
                                ) : (
                                    <>
                                        <div className="form-group" style={{ marginBottom: '12px' }}>
                                            <label className="form-label" style={{ fontSize: '12px', fontWeight: 500, color: '#334155' }}>Payment Method <span style={{ color: 'var(--danger)' }}>*</span></label>
                                            <IOSSelect
                                                value={ffPaymentMethod}
                                                onChange={(e) => setFfPaymentMethod(e.target.value)}
                                                options={[
                                                    { value: 'Cash', label: 'Cash' },
                                                    { value: 'GCash', label: 'GCash' },
                                                    { value: 'Bank', label: 'Bank Transfer' }
                                                ]}
                                            />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: '12px' }}>
                                            <label className="form-label" style={{ fontSize: '12px', fontWeight: 500, color: '#334155' }}>Amount Received <span style={{ color: 'var(--danger)' }}>*</span></label>
                                            <input type="number" className="form-control" min="0" required placeholder={`Minimum: ${fmt(ffBalanceDue)}`} value={ffAmountReceived} onChange={(e) => setFfAmountReceived(e.target.value)} style={{ fontSize: '14px', fontWeight: 600 }} />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label" style={{ fontSize: '12px', fontWeight: 500, color: '#334155' }}>Change</label>
                                            <input type="text" className="form-control" readOnly value={fmt(ffChange)} style={{ fontSize: '14px', fontWeight: 700, color: '#10B981', background: '#F8FAFC' }} />
                                        </div>
                                    </>
                                )}
                            </div>

                            <div>
                                <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '12px', letterSpacing: '0.5px', textTransform: 'uppercase', marginTop: '8px' }}>Transaction Details</h4>
                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 500, color: '#334155' }}>Document Type <span style={{ color: 'var(--danger)' }}>*</span></label>
                                    <IOSSelect
                                        value={ffDocType}
                                        onChange={(e) => setFfDocType(e.target.value)}
                                        options={[
                                            { value: 'S.I.', label: 'S.I. (Sales Invoice)' },
                                            { value: 'C.I.', label: 'C.I. (Cash Invoice)' },
                                            { value: 'D.R.', label: 'D.R. (Delivery Receipt)' }
                                        ]}
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 500, color: '#334155' }}>Served By</label>
                                    <input type="text" className="form-control" readOnly value={userName} style={{ fontSize: '13px', background: '#F8FAFC' }} />
                                </div>
                                <div className="form-group" style={{ marginBottom: '16px' }}>
                                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 500, color: '#334155' }}>Release Notes (Optional)</label>
                                    <textarea className="form-control" placeholder="Any notes about item condition, delivery instructions..." value={ffNotes} onChange={(e) => setFfNotes(e.target.value)} style={{ fontSize: '13px', minHeight: '80px', resize: 'vertical' }} />
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
