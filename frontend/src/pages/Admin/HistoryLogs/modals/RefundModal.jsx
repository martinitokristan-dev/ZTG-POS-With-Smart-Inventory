import React, { useState, useEffect } from 'react';
import api from '../../../../shared/api';
import useMobileSheet from '../../../../shared/useMobileSheet';
import IOSSelect from '../../../../shared/components/IOSSelect';
import { resetReportsCache } from '../../../../shared/hooks/useReportsCache';

export default function RefundModal({ isOpen, onClose, onSubmit, transaction, fmtDate, fmt, onSearchTransaction }) {
    // Read the actual logged-in user from localStorage
    const currentUser = (() => { try { return JSON.parse(localStorage.getItem('auth_user')); } catch { return null; } })();
    const currentUserName = currentUser?.real_name || currentUser?.name || 'Current User';
    const { sheetRef, dragHandleProps } = useMobileSheet({ onClose });
    const [actionType, setActionType] = useState('Refund');
    const [reason, setReason] = useState('Defective / Damaged Item');
    const [notes, setNotes] = useState('');
    const [restoreStock, setRestoreStock] = useState(true);
    const [markDamaged, setMarkDamaged] = useState(false);
    const [refundMethod, setRefundMethod] = useState('Cash Return');
    const [approver, setApprover] = useState('Manager');
    const [approvalCode, setApprovalCode] = useState('');
    const [internalNotes, setInternalNotes] = useState('');
    const [selectedItems, setSelectedItems] = useState({});
    
    const [searchSiNo, setSearchSiNo] = useState('');
    const [loadedTx, setLoadedTx] = useState(transaction);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (isOpen) {
            setLoadedTx(transaction);
            setSearchSiNo('');
            setActionType('Refund');
            setReason('Defective / Damaged Item');
            setNotes('');
            setRestoreStock(true);
            setMarkDamaged(false);
            setRefundMethod('Cash Return');
            setApprover('Manager');
            setApprovalCode('');
            setInternalNotes('');
            setIsSubmitting(false);
            setErrorMessage('');
            
            if (transaction && transaction.items) {
                const initialSelected = {};
                const txItems = Array.isArray(transaction.items) ? transaction.items : [];
                txItems.forEach(item => {
                    const rawQty = Number(item.qty || 0);
                    const refundedQty = Number(item.refunded_qty || 0);
                    const availableQty = item.net_qty != null ? Number(item.net_qty) : Math.max(0, rawQty - refundedQty);

                    if (availableQty > 0) {
                        initialSelected[item.id] = { selected: true, qty: availableQty, maxQty: availableQty };
                    } else {
                        initialSelected[item.id] = { selected: false, qty: 0, maxQty: 0 };
                    }
                });
                setSelectedItems(initialSelected);
            } else {
                setSelectedItems({});
            }
        }
    }, [isOpen, transaction]);

    if (!isOpen) return null;

    const txToUse = loadedTx;
    const txItems = txToUse && Array.isArray(txToUse.items) ? txToUse.items : [];
    
    const totalRemainingQty = txItems.reduce((sum, item) => {
        const rawQty = Number(item.qty || 0);
        const refundedQty = Number(item.refunded_qty || 0);
        const availableQty = item.net_qty != null ? Number(item.net_qty) : Math.max(0, rawQty - refundedQty);
        return sum + availableQty;
    }, 0);

    const isVoided = txToUse && ['Void', 'Voided'].includes(txToUse.status);
    const isFullyRefunded = txToUse && txItems.length > 0 && totalRemainingQty <= 0;
    const isAlreadyProcessed = isVoided || isFullyRefunded;

    const displayError = errorMessage || (
        isVoided 
            ? `Transaction ${txToUse.si_no || ''} has been voided and cannot be processed.`
            : (isFullyRefunded ? `Transaction ${txToUse.si_no || ''} has already been fully refunded/returned (0 items remaining).` : '')
    );

    const handleSearch = async () => {
        if (!searchSiNo.trim()) return;
        setErrorMessage('');
        try {
            if (onSearchTransaction) {
                const found = await onSearchTransaction(searchSiNo);
                if (found) {
                    setLoadedTx(found);
                    const initialSelected = {};
                    const foundItems = Array.isArray(found.items) ? found.items : [];
                    let foundRemainingQty = 0;
                    foundItems.forEach(item => {
                        const rawQty = Number(item.qty || 0);
                        const refundedQty = Number(item.refunded_qty || 0);
                        const availableQty = item.net_qty != null ? Number(item.net_qty) : Math.max(0, rawQty - refundedQty);
                        foundRemainingQty += availableQty;

                        if (availableQty > 0) {
                            initialSelected[item.id] = { selected: true, qty: availableQty, maxQty: availableQty };
                        } else {
                            initialSelected[item.id] = { selected: false, qty: 0, maxQty: 0 };
                        }
                    });
                    setSelectedItems(initialSelected);

                    if (['Void', 'Voided'].includes(found.status)) {
                        setErrorMessage(`Transaction ${found.si_no || searchSiNo} has been voided and cannot be processed.`);
                    } else if (foundItems.length > 0 && foundRemainingQty <= 0) {
                        setErrorMessage(`Transaction ${found.si_no || searchSiNo} has already been fully refunded/returned (0 items remaining).`);
                    }
                } else {
                    setErrorMessage("Transaction not found.");
                }
            } else {
                setErrorMessage("Search functionality not wired up.");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleItemToggle = (itemId) => {
        setSelectedItems(prev => ({
            ...prev,
            [itemId]: { ...prev[itemId], selected: !prev[itemId].selected }
        }));
    };

    const handleQtyChange = (itemId, val, maxQty) => {
        const parsed = parseInt(val, 10);
        const newQty = isNaN(parsed) ? 1 : Math.max(1, Math.min(maxQty, parsed));
        setSelectedItems(prev => ({
            ...prev,
            [itemId]: { ...prev[itemId], qty: newQty }
        }));
    };

    const handleActionTypeSelect = (type) => {
        setActionType(type);
        if (type === 'Refund') {
            setRestoreStock(true);
            setMarkDamaged(false);
        } else {
            setRestoreStock(false);
            setMarkDamaged(true);
        }
    };

    let subtotal = 0;
    txItems.forEach(item => {
        if (selectedItems[item.id]?.selected) {
            subtotal += item.price * selectedItems[item.id].qty;
        }
    });
    
    const totalRefund = subtotal;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');

        if (!txToUse) {
            setErrorMessage("No transaction selected.");
            return;
        }

        if (isAlreadyProcessed) {
            setErrorMessage(`Transaction ${txToUse.si_no || ''} has already been ${txToUse.status}ed and cannot be processed again.`);
            return;
        }
        
        const itemsToRefund = Object.keys(selectedItems)
            .filter(id => selectedItems[id].selected)
            .map(id => ({
                item_id: parseInt(id),
                qty: selectedItems[id].qty
            }));

        if (itemsToRefund.length === 0) {
            setErrorMessage("Please select at least one item to process.");
            return;
        }

        const approverId = currentUser?.id || 1;

        const payload = {
            transaction_id: txToUse.id,
            type: actionType.toLowerCase(),
            reason: reason,
            notes: notes,
            restore_stock: restoreStock,
            mark_damaged: markDamaged,
            refund_method: refundMethod,
            approver_id: approverId,
            approval_pin: approvalCode,
            internal_notes: internalNotes,
            items: itemsToRefund
        };
        
        setIsSubmitting(true);
        try {
            await onSubmit(payload);
            resetReportsCache();
        } catch (err) {
            const serverMsg = err.response?.data?.message || err.response?.data?.error || err.message || "Failed to process refund.";
            setErrorMessage(serverMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 999 }}>
            <div ref={sheetRef} className="modal-card modal-card-lg" style={{ maxWidth: '1000px', width: '95%', backgroundColor: 'var(--bg-card)', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3), 0 10px 10px -5px rgba(0,0,0,0.15)', border: '1px solid var(--border)' }}>
                <form onSubmit={handleSubmit}>
                    <div {...dragHandleProps} className="modal-header" style={{ backgroundColor: 'var(--danger-light)', borderBottom: '1px solid rgba(239,68,68,0.2)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', touchAction: 'none' }}>
                        <h3 className="modal-title" style={{ color: 'var(--danger)', fontSize: '16px', fontWeight: '700', margin: 0 }}>Process Refund / Return</h3>
                        <button type="button" onClick={onClose} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                            <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' }}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>

                    <div className="modal-body">
                        {displayError && (
                            <div style={{ backgroundColor: 'var(--danger-light)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: 'none', stroke: 'var(--danger)', strokeWidth: 2, flexShrink: 0 }}>
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <span>{displayError}</span>
                            </div>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '32px' }}>
                            {/* Left Column */}
                            <div className="refund-column" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                
                                {/* Original Transaction */}
                                <div>
                                    <h4 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>Original Transaction</h4>
                                    
                                    <div className="form-group" style={{ marginBottom: '16px' }}>
                                        <label className="form-label" style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '6px', display: 'block' }}>Search Transaction <span style={{ color: 'var(--danger)' }}>*</span></label>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                            <input type="text" className="form-control" style={{ borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', padding: '10px 12px', paddingRight: '36px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }} placeholder="Enter S.I. / C.R. Number..." value={searchSiNo} onChange={e => setSearchSiNo(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleSearch(); } }} />
                                            <button type="button" onClick={handleSearch} style={{ position: 'absolute', right: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', stroke: 'var(--text-muted)', fill: 'none', strokeWidth: '2' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="info-box" style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '0', background: 'var(--bg-card)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>Receipt Number</span>
                                            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{txToUse ? (txToUse.si_no || txToUse.receipt_number || '—') : '-'}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>Transaction Date</span>
                                            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{txToUse ? fmtDate(txToUse.date || txToUse.created_at) : '-'}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>Customer</span>
                                            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{txToUse ? (txToUse.customer?.name || 'Walk-in') : '-'}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>Served By</span>
                                            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{txToUse ? (txToUse.checker?.real_name || txToUse.checker?.name || txToUse.cashier?.real_name || txToUse.cashier?.name || '—') : '-'}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>Original Amount</span>
                                            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{txToUse ? fmt(txToUse.amount || txToUse.total) : '-'}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', fontSize: '13px' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>Payment Method</span>
                                            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{txToUse ? (txToUse.payment_method || '—') : '-'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Select Type */}
                                <div>
                                    <h4 style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>Select Type</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div onClick={() => handleActionTypeSelect('Refund')} style={{ border: actionType === 'Refund' ? '2px solid var(--primary)' : '1px solid var(--border)', borderRadius: '10px', padding: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '8px', transition: 'all 0.2s', backgroundColor: actionType === 'Refund' ? 'var(--primary-light)' : 'var(--bg-card)', boxShadow: actionType === 'Refund' ? '0 4px 14px rgba(59,130,246,0.25)' : 'none' }}>
                                            <div style={{ fontSize: '24px', color: actionType === 'Refund' ? 'var(--primary)' : 'var(--text-secondary)', marginBottom: '4px' }}>
                                                <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                                            </div>
                                            <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>Refund</span>
                                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>Full money back</span>
                                        </div>
                                        <div onClick={() => handleActionTypeSelect('Return')} style={{ border: actionType === 'Return' ? '2px solid var(--primary)' : '1px solid var(--border)', borderRadius: '10px', padding: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '8px', transition: 'all 0.2s', backgroundColor: actionType === 'Return' ? 'var(--primary-light)' : 'var(--bg-card)', boxShadow: actionType === 'Return' ? '0 4px 14px rgba(59,130,246,0.25)' : 'none' }}>
                                            <div style={{ fontSize: '24px', color: actionType === 'Return' ? 'var(--primary)' : 'var(--text-secondary)', marginBottom: '4px' }}>
                                                <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline></svg>
                                            </div>
                                            <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>Return</span>
                                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>Exchange or credit</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Refund Reason */}
                                <div>
                                    <h4 style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>Refund/Return Reason <span style={{ color: 'var(--danger)' }}>*</span></h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg-card)' }}>
                                        {['Defective / Damaged Item', 'Wrong Item Dispensed', 'Customer Changed Mind', 'Other'].map((r, i) => (
                                            <label key={r} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)', borderBottom: i < 3 ? `1px solid var(--border)` : 'none', background: reason === r ? 'var(--primary-light)' : 'transparent', fontWeight: reason === r ? '700' : '500', transition: 'all 0.2s' }}>
                                                <input type="radio" checked={reason === r} onChange={() => setReason(r)} style={{ accentColor: 'var(--primary)', width: '16px', height: '16px', margin: 0 }} />
                                                <span style={{ color: 'var(--text-primary)' }}>{r}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <textarea className="form-control" rows="2" placeholder="Additional details (optional)..." value={notes} onChange={(e) => setNotes(e.target.value)} style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', borderRadius: '6px', padding: '12px', fontSize: '13px', width: '100%', resize: 'none' }}></textarea>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="refund-column" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', maxHeight: '200px', overflowY: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 10 }}>
                                            <tr>
                                                <th style={{ padding: '12px 8px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Select</th>
                                                <th style={{ padding: '12px 8px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Item</th>
                                                <th style={{ padding: '12px 8px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>Qty</th>
                                                <th style={{ padding: '12px 8px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>Price</th>
                                                <th style={{ padding: '12px 8px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>Total</th>
                                            </tr>
                                        </thead>
                                        <tbody id="refundItemsTableBody">
                                            {txItems.length === 0 ? (
                                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: '#6B7280', fontSize: '13px' }}>Enter a transaction number to load items</td></tr>
                                            ) : txItems.map((item, index) => {
                                                const partNo = item.product?.part_no || item.part_no || item.partNo || item.product?.partNo || item.sku || '—';
                                                const name = item.product?.name || item.name || 'Unknown Part';
                                                const price = item.price || 0;

                                                const rawQty = Number(item.qty || 0);
                                                const refundedQty = Number(item.refunded_qty || 0);
                                                const maxRefundableQty = item.net_qty != null ? Number(item.net_qty) : Math.max(0, rawQty - refundedQty);
                                                const isItemFullyRefunded = maxRefundableQty <= 0;

                                                const sel = selectedItems[item.id] || { selected: false, qty: 0 };
                                                const total = sel.qty * price;

                                                return (
                                                    <tr key={index} style={{ borderBottom: '1px solid var(--border)', opacity: isItemFullyRefunded ? 0.6 : 1 }}>
                                                        <td style={{ padding: '12px 8px', verticalAlign: 'middle' }}>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={sel.selected && !isItemFullyRefunded} 
                                                                disabled={isItemFullyRefunded}
                                                                onChange={() => handleItemToggle(item.id)} 
                                                                style={{ accentColor: 'var(--primary)', width: '16px', height: '16px', margin: 0, cursor: isItemFullyRefunded ? 'not-allowed' : 'pointer' }} 
                                                            />
                                                        </td>
                                                        <td style={{ padding: '12px 8px' }}>
                                                            <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{name}</strong>
                                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Part #: {partNo}</div>
                                                        </td>
                                                        <td style={{ padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                            {isItemFullyRefunded ? (
                                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Fully Refunded</span>
                                                            ) : (
                                                                <>
                                                                    <input 
                                                                        type="number"
                                                                        min="1"
                                                                        max={maxRefundableQty}
                                                                        value={sel.qty}
                                                                        disabled={!sel.selected}
                                                                        onChange={(e) => handleQtyChange(item.id, e.target.value, maxRefundableQty)}
                                                                        style={{
                                                                            width: '58px',
                                                                            padding: '4px 6px',
                                                                            borderRadius: '6px',
                                                                            border: '1px solid var(--border)',
                                                                            textAlign: 'center',
                                                                            fontSize: '13px',
                                                                            fontWeight: '600',
                                                                            backgroundColor: sel.selected ? 'var(--bg-card)' : 'var(--bg-secondary)',
                                                                            color: sel.selected ? 'var(--text-primary)' : 'var(--text-muted)'
                                                                        }}
                                                                    />
                                                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>max {maxRefundableQty}</div>
                                                                </>
                                                            )}
                                                        </td>
                                                        <td style={{ textAlign: 'right', padding: '12px 8px', verticalAlign: 'middle' }}>
                                                            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{fmt(price)}</span>
                                                        </td>
                                                        <td style={{ textAlign: 'right', padding: '12px 8px', verticalAlign: 'middle' }}>
                                                            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{fmt(total)}</span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                <div>
                                    <h4 style={{ fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>Stock Restoration</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '13px', cursor: 'pointer', color: '#374151' }}>
                                            <input type="checkbox" checked={restoreStock} onChange={(e) => setRestoreStock(e.target.checked)} style={{ marginTop: '3px', accentColor: '#3B82F6', width: '16px', height: '16px' }} />
                                            <span>Restore items to inventory (add back to stock)</span>
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '13px', cursor: 'pointer', color: '#374151' }}>
                                            <input type="checkbox" checked={markDamaged} onChange={(e) => setMarkDamaged(e.target.checked)} style={{ marginTop: '3px', accentColor: '#3B82F6', width: '16px', height: '16px' }} />
                                            <span>Mark items as damaged (add to damaged count, not available for sale)</span>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <h4 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Refund Amount</h4>
                                    <div style={{ backgroundColor: 'var(--danger-light)', borderRadius: '6px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid rgba(239,68,68,0.2)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: '700', color: 'var(--danger)' }}>
                                            <span>Total Refund Amount</span>
                                            <span>{fmt(totalRefund)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Refund Method</label>
                                        <IOSSelect
                                            value={refundMethod}
                                            onChange={(e) => setRefundMethod(e.target.value)}
                                            options={[
                                                { value: 'Cash Return', label: 'Cash Return' },
                                                { value: 'GCash', label: 'GCash' },
                                                { value: 'Bank Transfer', label: 'Bank Transfer' },
                                                { value: 'Store Credit', label: 'Store Credit' }
                                            ]}
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div>
                                            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Processed By</label>
                                            <IOSSelect
                                                value={approver}
                                                onChange={(e) => setApprover(e.target.value)}
                                                options={[
                                                    { value: 'Manager', label: `${currentUserName} (Current User)` },
                                                    { value: 'Supervisor', label: 'Supervisor' }
                                                ]}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Approval Code (Optional)</label>
                                            <input type="text" className="form-control" placeholder="Enter supervisor approval code if required" value={approvalCode} onChange={(e) => setApprovalCode(e.target.value)} style={{ border: '1px solid #E5E7EB', borderRadius: '6px', padding: '10px 12px', fontSize: '13px', width: '100%' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', color: '#4B5563', marginBottom: '4px', display: 'block', visibility: 'hidden' }}>Internal Notes</label>
                                        <input type="text" className="form-control" placeholder="Internal Notes" value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} style={{ border: '1px solid #E5E7EB', borderRadius: '6px', padding: '10px 12px', fontSize: '13px', width: '100%', marginTop: '-16px' }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
                        <button type="button" className="btn" onClick={onClose} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)', padding: '10px 24px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting || isAlreadyProcessed} 
                            className="btn" 
                            style={{ 
                                backgroundColor: isAlreadyProcessed ? '#9CA3AF' : '#DC2626', 
                                color: '#FFFFFF', 
                                border: 'none', 
                                padding: '10px 24px', 
                                borderRadius: '6px', 
                                fontSize: '14px', 
                                fontWeight: '600', 
                                cursor: (isSubmitting || isAlreadyProcessed) ? 'not-allowed' : 'pointer',
                                opacity: (isSubmitting || isAlreadyProcessed) ? 0.7 : 1,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            {isSubmitting ? (
                                <>
                                    <span style={{ width: '14px', height: '14px', border: '2px solid #FFF', borderRightColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.75s linear infinite' }}></span>
                                    Processing Refund...
                                </>
                            ) : (
                                'Process Refund'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
