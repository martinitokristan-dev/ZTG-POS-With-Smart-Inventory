import React, { useState, useEffect } from 'react';
import IOSDatePicker from '../../../../shared/components/IOSDatePicker';
import IOSTimePicker from '../../../../shared/components/IOSTimePicker';
import IOSSelect from '../../../../shared/components/IOSSelect';
import FormattedProductName from '../../../../shared/components/FormattedProductName';

export default function AddReservationModal({
    isOpen, onClose, onOpen, onSubmit,
    custName, setCustName, custPhone, setCustPhone, custEmail, setCustEmail, enginePlateNumber, setEnginePlateNumber,
    pickupDate, setPickupDate, pickupTime, setPickupTime, notes, setNotes,
    paymentType, setPaymentType, paymentMethod, setPaymentMethod, custChequeNumber, setCustChequeNumber,
    cartItems, productSearch, suggestions, addError, addLoading,
    handleProductSearch, addToCart, addCustomItemToCart, removeFromCart, updateQty, updateCartItemPriceTier,
    subtotal, tax, total, depositAmt, balance, fmt
}) {
    const [customName, setCustomName] = useState('');
    const [customPartNo, setCustomPartNo] = useState('');
    const [customPrice, setCustomPrice] = useState('');
    const [customQty, setCustomQty] = useState('1');

    const handleAddCustom = (e) => {
        if (e) e.preventDefault();
        if (!customName.trim()) return;
        if (addCustomItemToCart) {
            addCustomItemToCart(customName, customPartNo.trim() || '', customPrice || 0, customQty || 1);
        } else {
            addToCart({
                id: `custom-${Date.now()}`,
                name: customName.trim(),
                part_no: customPartNo.trim() || '',
                price1: parseFloat(customPrice) || 0,
                price2: parseFloat(customPrice) || 0,
                stock: 9999
            });
        }
        setCustomName('');
        setCustomPartNo('');
        setCustomPrice('');
        setCustomQty('1');
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (isOpen && e.key === 'Enter') {
                if (document.activeElement && document.activeElement.tagName === 'TEXTAREA') return;
                e.preventDefault();
                const btn = document.getElementById('submitReservationBtn');
                if (btn) btn.click();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && onOpen) onOpen();
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal-card" style={{ maxWidth: '1050px' }}>
                <div className="modal-header">
                    <h3 className="modal-title">New Order-Based</h3>
                    <button className="modal-close" onClick={onClose}>
                        <svg viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>

                <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div className="modal-body" style={{ display: 'flex', gap: '24px', minHeight: '500px' }}>

                        {/* LEFT COLUMN */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '12px 16px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, border: '1px solid rgba(59,130,246,0.2)' }}>
                                Create an order for custom/non-inventory items or special customer requests.
                            </div>

                            {addError && (
                                <div style={{ background: 'var(--danger-light)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--danger)', padding: '10px 14px', borderRadius: '6px', fontSize: '13px' }}>
                                    {addError}
                                </div>
                            )}

                            <div>
                                <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '12px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Customer Information</h4>
                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 500 }}>Customer Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                                    <input type="text" className="form-control" required placeholder="Enter customer name" value={custName} onChange={(e) => setCustName(e.target.value)} style={{ fontSize: '13px' }} />
                                </div>
                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 500 }}>Contact Number <span style={{ color: 'var(--danger)' }}>*</span></label>
                                    <input 
                                        type="tel" 
                                        className="form-control" 
                                        required 
                                        placeholder="09XX-XXX-XXXX" 
                                        value={custPhone} 
                                        onChange={(e) => setCustPhone(e.target.value.replace(/[^\d+ -]/g, ''))} 
                                        onKeyDown={(e) => {
                                            if (
                                                !/^[0-9+ -]$/.test(e.key) && 
                                                !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter'].includes(e.key) &&
                                                !e.ctrlKey && !e.metaKey
                                            ) {
                                                e.preventDefault();
                                            }
                                        }}
                                        style={{ fontSize: '13px' }} 
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 500 }}>Email Address (Optional)</label>
                                    <input type="email" className="form-control" placeholder="customer@example.com" value={custEmail} onChange={(e) => setCustEmail(e.target.value)} style={{ fontSize: '13px' }} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 500 }}>Engine Plate Number (Optional)</label>
                                    <input type="text" className="form-control" placeholder="e.g. ENG-1234 / Plate No." value={enginePlateNumber} onChange={(e) => setEnginePlateNumber(e.target.value)} style={{ fontSize: '13px' }} />
                                </div>
                            </div>

                            <div>
                                <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '12px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Order Details</h4>
                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 500 }}>Pickup Date (Optional)</label>
                                    <IOSDatePicker value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} placeholder="Select pickup date" />
                                </div>
                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 500 }}>Expected Pickup Time (Optional)</label>
                                    <IOSTimePicker value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} placeholder="Select pickup time" />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 500, color: '#334155' }}>Order Notes (Optional)</label>
                                    <textarea className="form-control" placeholder="Special instructions, delivery address, or other notes..." value={notes} onChange={(e) => setNotes(e.target.value)} style={{ fontSize: '13px', minHeight: '80px', resize: 'vertical' }} />
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div style={{ flex: '1.2', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '12px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Items to Order (Non-Inventory / Custom Item Input)</h4>

                                {/* Custom Item Input Section */}
                                <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '16px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 80px', gap: '8px', marginBottom: '10px' }}>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Item Name (Required)"
                                            value={customName}
                                            onChange={(e) => setCustomName(e.target.value)}
                                            style={{ fontSize: '12px' }}
                                        />
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Part No / SKU"
                                            value={customPartNo}
                                            onChange={(e) => setCustomPartNo(e.target.value)}
                                            style={{ fontSize: '12px' }}
                                        />
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="form-control"
                                            placeholder="Price (₱)"
                                            value={customPrice}
                                            onChange={(e) => setCustomPrice(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (
                                                    !/^[0-9.]$/.test(e.key) && 
                                                    !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter'].includes(e.key) &&
                                                    !e.ctrlKey && !e.metaKey
                                                ) {
                                                    e.preventDefault();
                                                }
                                            }}
                                            style={{ fontSize: '12px' }}
                                        />
                                        <input
                                            type="number"
                                            min="1"
                                            className="form-control"
                                            placeholder="Qty"
                                            value={customQty}
                                            onChange={(e) => setCustomQty(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (
                                                    !/^[0-9]$/.test(e.key) && 
                                                    !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter'].includes(e.key) &&
                                                    !e.ctrlKey && !e.metaKey
                                                ) {
                                                    e.preventDefault();
                                                }
                                            }}
                                            style={{ fontSize: '12px', textAlign: 'center' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Type non-inventory order details and click Add.</span>
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            onClick={handleAddCustom}
                                            disabled={!customName.trim()}
                                            style={{ fontWeight: 600, fontSize: '12px', padding: '6px 14px' }}
                                        >
                                            + Add Item
                                        </button>
                                    </div>
                                </div>

                                {/* Cart table */}
                                <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                        <thead style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                                            <tr>
                                                <th style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase' }}>Product</th>
                                                <th style={{ textAlign: 'center', padding: '10px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase' }}>Qty</th>
                                                <th style={{ textAlign: 'right', padding: '10px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase' }}>Price</th>
                                                <th style={{ textAlign: 'right', padding: '10px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase' }}>Total</th>
                                                <th style={{ width: '40px' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cartItems.length === 0 ? (
                                                <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#94A3B8' }}>No items added yet.</td></tr>
                                            ) : cartItems.map((c, idx) => {
                                                const itemId = c.cart_item_id || c.product_id || c.id || idx;
                                                return (
                                                    <tr key={itemId} style={{ borderBottom: '1px solid var(--border)' }}>
                                                        <td style={{ padding: '10px 16px' }}>
                                                            <div style={{ display: 'block', fontSize: '12px' }}>
                                                                <FormattedProductName name={c.name} />
                                                            </div>
                                                            {c.chinese_name && <span style={{ fontSize: '11px', color: '#94A3B8', display: 'block' }}>{c.chinese_name}</span>}
                                                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{c.part_no}</span>
                                                        </td>
                                                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                                            <input type="number" min="1" max={c.stock || 9999} value={c.qty} onChange={(e) => updateQty(itemId, e.target.value)}
                                                                style={{ width: '56px', textAlign: 'center', padding: '4px 6px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }} />
                                                        </td>
                                                        <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                                {c.product_id ? (
                                                                    <select 
                                                                        value={c.priceTier || 'price2'} 
                                                                        onChange={(e) => updateCartItemPriceTier(itemId, c.priceTier || 'price2', e.target.value)}
                                                                        style={{ border: 'none', background: 'transparent', fontSize: '11px', fontWeight: '700', color: (c.priceTier || 'price2') === 'price1' ? '#2563EB' : '#7C3AED', outline: 'none', cursor: 'pointer', padding: 0, direction: 'rtl' }}
                                                                    >
                                                                        <option value="price1">Original ({fmt(c.price1 || 0)})</option>
                                                                        <option value="price2">Retail ({fmt(c.price2 || 0)})</option>
                                                                    </select>
                                                                ) : (
                                                                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{fmt(c.price)}</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>{fmt(c.price * c.qty)}</td>
                                                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                                            <button type="button" onClick={() => removeFromCart(itemId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '4px' }}>
                                                                <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}><path d="M18 6L6 18M6 6l12 12"/></svg>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Totals */}
                                <div style={{ background: 'var(--primary-light)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid rgba(59,130,246,0.2)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)', fontSize: '12px' }}>
                                        <span>Subtotal</span><span>{fmt(subtotal)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)', fontSize: '12px' }}>
                                        <span>Tax (12%)</span><span>{fmt(tax)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid rgba(59,130,246,0.2)' }}>
                                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary)' }}>Total Amount</span>
                                        <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>{fmt(total)}</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '12px', letterSpacing: '0.5px', textTransform: 'uppercase', marginTop: '8px' }}>Payment Details</h4>
                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 500 }}>Payment Type</label>
                                    <IOSSelect
                                        value={paymentType}
                                        onChange={(e) => setPaymentType(e.target.value)}
                                        options={[
                                            { value: 'deposit50', label: '50% Deposit (Balance on Pickup)' },
                                            { value: 'full', label: 'Full Payment (100%)' }
                                        ]}
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 500 }}>
                                        Amount Collected &nbsp;
                                        <span style={{ background: 'var(--warning-light)', color: 'var(--warning)', fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '10px' }}>
                                            {paymentType === 'full' ? '100%' : '50% Required'}
                                        </span>
                                    </label>
                                    <input type="text" className="form-control" readOnly value={fmt(depositAmt)}
                                        style={{ fontSize: '14px', fontWeight: 700, background: 'var(--warning-light)', border: '1px solid rgba(245,158,11,0.3)', color: 'var(--warning)', cursor: 'not-allowed' }} />
                                    <p style={{ fontSize: '10px', color: 'var(--text-secondary)', margin: '4px 0 0', fontWeight: 500 }}>
                                        {paymentType === 'full' ? 'Full payment collected upfront.' : 'Auto-calculated as 50% of total. Balance due on pickup.'}
                                    </p>
                                </div>
                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 500 }}>Payment Method</label>
                                    <IOSSelect
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        options={[
                                            { value: 'Cash', label: 'Cash' },
                                            { value: 'GCash', label: 'GCash' },
                                            { value: 'Bank', label: 'Bank Transfer' },
                                            { value: 'Cheque', label: 'Cheque' }
                                        ]}
                                    />
                                </div>
                                {paymentMethod === 'Cheque' && (
                                    <div className="form-group" style={{ marginBottom: '12px' }}>
                                        <label className="form-label" style={{ fontSize: '12px', fontWeight: 500 }}>Cheque Number <span style={{ color: 'var(--danger)' }}>*</span></label>
                                        <input type="text" className="form-control" required placeholder="e.g. CHK-987654" value={custChequeNumber} onChange={(e) => setCustChequeNumber(e.target.value)} style={{ fontSize: '13px', fontWeight: 600 }} />
                                    </div>
                                )}
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 500 }}>Balance Due</label>
                                    <input type="text" className="form-control" readOnly value={fmt(balance)}
                                        style={{ fontSize: '14px', fontWeight: 700 }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button id="submitReservationBtn" type="submit" className="btn btn-primary" disabled={addLoading}>
                            {addLoading ? 'Creating...' : 'Create Order'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
