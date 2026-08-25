import React, { useState } from 'react';
import IOSSelect from '../../../../shared/components/IOSSelect';

export default function VoidModal({ isOpen, onClose, transaction, onSubmit, fmtDate, fmt }) {
    const [reason, setReason] = useState('Wrong Transaction / Input Error');
    const [restoreStock, setRestoreStock] = useState(true);
    const [adminName, setAdminName] = useState('Administrator');
    const [adminPin, setAdminPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    if (!isOpen || !transaction) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');

        if (!adminPin || adminPin.length !== 4) {
            setErrorMessage('Please enter a valid 4-digit admin PIN.');
            return;
        }

        setIsSubmitting(true);
        try {
            const currentUser = (() => { try { return JSON.parse((sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'))); } catch { return null; } })();
            await onSubmit({
                transaction_id: transaction.id,
                void_reason: reason,
                reason,
                restore_stock: restoreStock,
                admin_name: adminName,
                admin_id: currentUser?.role === 'Admin' ? currentUser.id : undefined,
                admin_pin: adminPin
            });
        } catch (err) {
            setErrorMessage(err.response?.data?.message || err.message || 'Failed to void transaction.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 999 }}>
            <div className="modal-card" style={{ maxWidth: '580px', width: '95%', background: 'var(--bg-card)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}>
                <form onSubmit={handleSubmit}>
                    <div className="modal-header" style={{ position: 'relative', background: 'var(--danger-light)', borderBottom: '1px solid rgba(239,68,68,0.2)', padding: '20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '8px' }}>
                        <button type="button" style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }} onClick={onClose}>
                            <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'none', stroke: 'currentColor', strokeWidth: '2' }}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>

                        <div style={{
                            width: '42px', height: '42px',
                            background: 'rgba(239,68,68,0.1)',
                            borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1.5px solid var(--danger)',
                            flexShrink: 0
                        }}>
                            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" strokeWidth="2.5" style={{ color: 'var(--danger)' }}><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                        </div>
                        <div>
                            <h3 style={{ color: 'var(--danger)', fontSize: '18px', fontWeight: '700', margin: '0 0 2px 0' }}>
                                Void Transaction
                            </h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>Admin authorization required — Cashier must physically request this action</p>
                        </div>
                    </div>
    
                    <div className="modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '75vh', overflowY: 'auto', background: 'var(--bg-card)' }}>
                        {errorMessage && (
                            <div style={{ backgroundColor: 'var(--danger-light)', borderLeft: '4px solid var(--danger)', color: 'var(--danger)', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: 'none', stroke: 'currentColor', strokeWidth: 2, flexShrink: 0 }}>
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <span>{errorMessage}</span>
                            </div>
                        )}
    
                        {/* Warning Banner */}
                        <div style={{ background: 'var(--danger-light)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '12px 16px', fontSize: '12.5px', color: 'var(--danger)' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: '1px' }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                <span><strong>This action cannot be undone.</strong> Voiding cancels the sale and generates an Official Receipt (OR-VOID) as proof. Only proceed after the cashier's physical request.</span>
                            </div>
                        </div>
    
                        {/* Original Transaction Info */}
                        <div>
                            <h4 style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' }}>Original Transaction</h4>
                            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px 24px' }}>
                                <div>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '2px' }}>Invoice No.</span>
                                    <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '14px' }}>{transaction.si_no || transaction.receipt_number || '—'}</span>
                                </div>
                                <div>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '2px' }}>Date & Time</span>
                                    <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '13.5px' }}>{fmtDate(transaction.date || transaction.created_at)}</span>
                                </div>
                                <div>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '2px' }}>Customer</span>
                                    <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '13.5px' }}>{transaction.customer?.name || 'Walk-in'}</span>
                                </div>
                                <div>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '2px' }}>Served By</span>
                                    <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '13.5px' }}>{transaction.checker?.name || transaction.cashier?.full_name || transaction.cashier?.name || '—'}</span>
                                </div>
                                <div style={{ gridColumn: 'span 2', borderTop: '1px dashed var(--border)', paddingTop: '12px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount to Void</span>
                                    <span style={{ fontWeight: '800', color: 'var(--danger)', fontSize: '18px' }}>{fmt(transaction.amount || transaction.total)}</span>
                                </div>
                            </div>
                        </div>
    
                        {/* Void Reason */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>Void Reason <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <IOSSelect
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                options={[
                                    { value: 'Wrong Transaction / Input Error', label: 'Wrong Transaction / Input Error' },
                                    { value: 'Duplicate Entry', label: 'Duplicate Entry' },
                                    { value: 'System Error', label: 'System Error' },
                                    { value: 'Price Discrepancy', label: 'Price Discrepancy' },
                                    { value: 'Other', label: 'Other' }
                                ]}
                            />
                        </div>
    
                        {/* Stock Restoration */}
                        <div>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: '500', userSelect: 'none' }}>
                                <input type="checkbox" checked={restoreStock} onChange={(e) => setRestoreStock(e.target.checked)} style={{ accentColor: 'var(--danger)', width: '16px', height: '16px', margin: 0, cursor: 'pointer' }} />
                                <span>Restore items to inventory (recommended)</span>
                            </label>
                        </div>
    
                        {/* Admin Authorization Box */}
                        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <h4 style={{ fontSize: '11px', fontWeight: '700', color: 'var(--warning)', textTransform: 'uppercase', margin: 0, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2.5" style={{ flexShrink: 0 }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Admin Authorization
                            </h4>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>Admin Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                                <IOSSelect
                                    value={adminName}
                                    onChange={(e) => setAdminName(e.target.value)}
                                    options={[
                                        { value: 'Administrator', label: 'Administrator (Default)' },
                                        { value: 'Manager', label: 'Manager' }
                                    ]}
                                />
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>4-Digit Admin PIN <span style={{ color: 'var(--danger)' }}>*</span></label>
                                <div style={{ position: 'relative', width: '100%' }}>
                                    <input type={showPin ? "text" : "password"} className="form-control" maxLength="4" pattern="\d{4}" required placeholder="••••" value={adminPin} onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, ''))} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 40px 12px 40px', fontSize: '20px', width: '100%', letterSpacing: '10px', textAlign: 'center', background: 'var(--bg-card)', color: 'var(--text-primary)', boxSizing: 'border-box', outline: 'none' }} />
                                    <button type="button" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: '4px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }} onClick={() => setShowPin(!showPin)}>
                                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                                            {showPin ? (
                                                <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></>
                                            ) : (
                                                <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></>
                                            )}
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
    
                    <div className="modal-footer" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose} style={{ borderRadius: '8px', fontWeight: '600', fontSize: '13.5px', height: '38px', padding: '0 20px', cursor: 'pointer' }}>Cancel</button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting} 
                            className="btn btn-danger" 
                            style={{ 
                                borderRadius: '8px', 
                                fontWeight: '700', 
                                fontSize: '13.5px', 
                                height: '38px', 
                                padding: '0 24px',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                opacity: isSubmitting ? 0.7 : 1
                            }}
                        >
                            {isSubmitting ? 'Voiding Transaction...' : 'Confirm & Void Transaction'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
