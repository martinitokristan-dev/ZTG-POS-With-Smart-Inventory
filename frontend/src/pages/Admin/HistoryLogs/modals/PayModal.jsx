import React, { useState, useEffect } from 'react';
import IOSSelect from '../../../../shared/components/IOSSelect';

export default function PayModal({ isOpen, onClose, onSubmit, transaction, fmtDate, fmt }) {
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [chequeNumber, setChequeNumber] = useState('');
    const [amountTendered, setAmountTendered] = useState('');
    const [adminPin, setAdminPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (isOpen && transaction) {
            setPaymentMethod('Cash');
            setChequeNumber('');
            setAmountTendered('');
            setAdminPin('');
            setShowPin(false);
            setIsSubmitting(false);
            setErrorMessage('');
        }
    }, [isOpen, transaction]);

    if (!isOpen || !transaction) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        if (paymentMethod === 'Cheque' && !chequeNumber.trim()) {
            setErrorMessage('Please enter the Cheque Number.');
            return;
        }

        setErrorMessage('');
        setIsSubmitting(true);
        
        try {
            const user = (() => { try { return JSON.parse(localStorage.getItem('auth_user')); } catch { return null; } })();
            const adminId = user?.id || 1;

            const payload = {
                payment_method: paymentMethod,
                cheque_number: paymentMethod === 'Cheque' ? chequeNumber.trim() : null,
                amount_tendered: Number(amountTendered || transaction.amount),
                admin_id: adminId,
                admin_pin: adminPin
            };

            await onSubmit(transaction.id, payload);
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data?.error || err.message || "Failed to process payment.";
            setErrorMessage(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const tenderedVal = parseFloat(amountTendered || 0);
    const changeDue = Math.max(0, tenderedVal - transaction.amount);
    const isChangeSufficient = tenderedVal >= transaction.amount;

    return (
        <div className="modal-overlay" style={{ zIndex: 999 }}>
            <div className="modal-card" style={{ maxWidth: '500px', width: '95%', background: '#FFFFFF', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.12)', border: '1px solid #E2E8F0' }}>
                <form onSubmit={handleSubmit}>
                    <div className="modal-header" style={{ position: 'relative', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', padding: '20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '8px' }}>
                        <button type="button" style={{ position: 'absolute', top: '16px', right: '16px', color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }} onClick={onClose} disabled={isSubmitting}>
                            <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'none', stroke: 'currentColor', strokeWidth: '2' }}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                        
                        <div style={{
                            width: '42px', height: '42px',
                            background: '#ECFDF5',
                            borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1.5px solid #10B981',
                            flexShrink: 0
                        }}>
                            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" strokeWidth="2.5" style={{ color: '#047857' }}>
                                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                            </svg>
                        </div>
                        <div>
                            <h3 style={{ color: '#047857', fontSize: '18px', fontWeight: '700', margin: '0 0 2px 0' }}>
                                Pay Pending Order
                            </h3>
                            <p style={{ color: '#6B7280', fontSize: '13px', margin: 0 }}>Collect payment for a parked P.O. transaction</p>
                        </div>
                    </div>
    
                    <div className="modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '75vh', overflowY: 'auto' }}>
    
                        {errorMessage && (
                            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '12px 16px', color: '#DC2626', fontSize: '13px', fontWeight: '500' }}>
                                {errorMessage}
                            </div>
                        )}

                        {/* Transaction Summary */}
                        <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '16px', border: '1px solid #E2E8F0' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Transaction / Receipt</div>
                                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#1E293B' }}>{transaction.si_no || transaction.receipt_number}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Customer</div>
                                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#334155' }}>{transaction.customer?.name || 'Guest'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Amount Due</div>
                                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#047857' }}>{fmt(transaction.amount)}</div>
                                </div>
                            </div>
                        </div>
    
                        {/* Form Fields */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Payment Method <span style={{ color: '#EF4444' }}>*</span></label>
                                <IOSSelect
                                    value={paymentMethod}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setPaymentMethod(val);
                                        if (val === 'Cheque' && !amountTendered) {
                                            setAmountTendered(String(transaction.amount));
                                        }
                                    }}
                                    options={[
                                        { value: 'Cash', label: 'Cash' },
                                        { value: 'GCash', label: 'GCash' },
                                        { value: 'Bank', label: 'Bank Transfer' },
                                        { value: 'Cheque', label: 'Cheque' }
                                    ]}
                                    disabled={isSubmitting}
                                />
                            </div>

                            {paymentMethod === 'Cheque' && (
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Cheque Number <span style={{ color: '#EF4444' }}>*</span></label>
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: '600' }}
                                        value={chequeNumber}
                                        onChange={(e) => setChequeNumber(e.target.value)}
                                        placeholder="e.g. CHK-987654"
                                        required
                                        autoFocus
                                        disabled={isSubmitting}
                                    />
                                </div>
                            )}

                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                                    {paymentMethod === 'Cheque' ? 'Cheque Amount' : 'Cash Received'} <span style={{ color: '#EF4444' }}>*</span>
                                </label>
                                <input 
                                    type="number" 
                                    className="form-control" 
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                                    value={amountTendered}
                                    onChange={(e) => setAmountTendered(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (!/^[0-9.]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter'].includes(e.key) && !e.ctrlKey && !e.metaKey) {
                                            e.preventDefault();
                                        }
                                    }}
                                    min={transaction.amount}
                                    step="0.01"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>

                            {amountTendered !== '' && paymentMethod === 'Cash' && (
                                <div style={{ background: isChangeSufficient ? '#ECFDF5' : '#FEF2F2', border: `1px solid ${isChangeSufficient ? '#D1FAE5' : '#FECACA'}`, borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '13px', fontWeight: '600', color: isChangeSufficient ? '#059669' : '#DC2626' }}>Change Due</span>
                                    <span style={{ fontSize: '16px', fontWeight: '800', color: isChangeSufficient ? '#10B981' : '#EF4444' }}>
                                        {fmt(changeDue)}
                                    </span>
                                </div>
                            )}
    
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Admin PIN Verification <span style={{ color: '#EF4444' }}>*</span></label>
                                <div style={{ position: 'relative' }}>
                                    <input 
                                        type={showPin ? "text" : "password"} 
                                        className="form-control" 
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '16px', letterSpacing: showPin ? 'normal' : '4px' }}
                                        value={adminPin}
                                        onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, ''))}
                                        onKeyDown={(e) => {
                                            if (!/^[0-9]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter'].includes(e.key) && !e.ctrlKey && !e.metaKey) {
                                                e.preventDefault();
                                            }
                                        }}
                                        placeholder="Enter PIN"
                                        required
                                        maxLength={6}
                                        autoComplete="new-password"
                                        disabled={isSubmitting}
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowPin(!showPin)}
                                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '4px' }}
                                        disabled={isSubmitting}
                                    >
                                        {showPin ? (
                                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                        ) : (
                                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
    
                    <div className="modal-footer" style={{ padding: '20px 24px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button type="button" className="btn" style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#475569', fontWeight: '600', padding: '10px 20px', borderRadius: '8px' }} onClick={onClose} disabled={isSubmitting}>
                            Cancel
                        </button>
                        <button type="submit" className="btn" style={{ background: '#10B981', color: '#FFFFFF', border: 'none', fontWeight: '600', padding: '10px 24px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)', opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }} disabled={!adminPin || !paymentMethod || (paymentMethod === 'Cheque' && !chequeNumber.trim()) || !amountTendered || isSubmitting}>
                            {isSubmitting ? 'Processing Payment...' : 'Confirm Payment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
