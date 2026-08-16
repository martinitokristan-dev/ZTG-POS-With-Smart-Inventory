import React, { useState, useMemo } from 'react';
import FormattedProductName from '../../../../shared/components/FormattedProductName';
import IOSSelect from '../../../../shared/components/IOSSelect';

export default function CartSidebar({ 
    cart, 
    updateCartQty, 
    setCartItemQty,
    removeFromCart, 
    updateCartItemPriceTier,
    clearCart, 
    cartTotals, 
    posError,
    setPosError,
    
    existingCustomerSearch, setExistingCustomerSearch,
    newCustomerName, setNewCustomerName,
    customerPhone, setCustomerPhone,
    customerTin, setCustomerTin,
    customerAddress, setCustomerAddress,
    
    selectedCustomer, setSelectedCustomer,
    
    customersList,
    
    checkers,
    selectedChecker, setSelectedChecker,
    
    setShowCheckoutModal,
    fmt
}) {
    const [error, setError] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Filter existing customers for the dropdown
    const filteredCustomers = useMemo(() => {
        const query = existingCustomerSearch.toLowerCase().trim();
        return customersList
            .filter(c => (c.name || '').toLowerCase().includes(query))
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [customersList, existingCustomerSearch]);

    const customersToDisplay = existingCustomerSearch.trim() === ''
        ? [...customersList].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        : filteredCustomers;

    return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px', height: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px' }}>
            <div style={{ flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>Product List</h3>
                    <button 
                        onClick={clearCart}
                        style={{ color: 'var(--danger)', fontSize: '12px', fontWeight: '600', textDecoration: 'none', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                    >
                        Clear All
                    </button>
                </div>

                {posError && (
                    <div style={{ 
                        padding: '10px 14px', 
                        background: '#FEF2F2', 
                        border: '1px solid #FCA5A5', 
                        borderRadius: '8px', 
                        color: '#991B1B', 
                        fontSize: '12px', 
                        fontWeight: '600', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        marginBottom: '12px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                            <span>{posError}</span>
                        </div>
                        <button onClick={() => setPosError && setPosError(null)} style={{ background: 'none', border: 'none', color: '#991B1B', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>✕</button>
                    </div>
                )}

                {/* Customer Information Section — Compact 2-Column POS Layout */}
                <div className="cart-customer-section" style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '10px' }}>
                    <div className="form-group" style={{ position: 'relative' }}>
                        <label className="form-label" htmlFor="existingCustomerSearch">Existing Customer</label>
                        <input 
                            type="text" 
                            id="existingCustomerSearch"
                            className="form-control" 
                            placeholder="Search existing customer..." 
                            value={existingCustomerSearch}
                            onFocus={() => setIsDropdownOpen(true)}
                            onChange={(e) => {
                                setExistingCustomerSearch(e.target.value);
                                setIsDropdownOpen(true);
                                if (e.target.value) setNewCustomerName('');
                            }}
                        />
                        {isDropdownOpen && customersToDisplay.length > 0 && (
                            <div style={{ 
                                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, 
                                backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', 
                                maxHeight: '150px', overflowY: 'auto', boxShadow: 'var(--shadow-md)', marginTop: '2px' 
                            }}>
                                {customersToDisplay.map((c, index) => (
                                    <div 
                                        key={c.id || c.customer_id || `cust-${c.name || ''}-${index}`} 
                                        style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid var(--border)' }}
                                        onMouseDown={() => {
                                            setExistingCustomerSearch(c.name);
                                            setSelectedCustomer(c);
                                            setCustomerPhone(c.phone || '');
                                            setCustomerTin(c.tin || '');
                                            setCustomerAddress(c.address || '');
                                            setIsDropdownOpen(false);
                                            setError('');
                                        }}
                                        className="dropdown-item-hover"
                                    >
                                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{c.name}</div>
                                        {c.phone && <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{c.phone}</div>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="newCustomerName">New Customer Name</label>
                        <input 
                            type="text" 
                            id="newCustomerName"
                            className="form-control" 
                            placeholder="Enter new customer name" 
                            value={newCustomerName}
                            onChange={(e) => {
                                setNewCustomerName(e.target.value);
                                if (e.target.value) {
                                    setExistingCustomerSearch('');
                                    setError('');
                                }
                            }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="customerPhone">Contact No.</label>
                            <input 
                                type="tel" 
                                id="customerPhone"
                                className="form-control" 
                                placeholder="0917-000-0000" 
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value.replace(/[^\d+ -]/g, ''))}
                                onKeyDown={(e) => {
                                    if (
                                        !/^[0-9+ -]$/.test(e.key) && 
                                        !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter'].includes(e.key) &&
                                        !e.ctrlKey && !e.metaKey
                                    ) {
                                        e.preventDefault();
                                    }
                                }}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="customerTin">Buyer's TIN</label>
                            <input 
                                type="text" 
                                id="customerTin"
                                className="form-control" 
                                placeholder="123-456-789-000" 
                                value={customerTin}
                                onChange={(e) => setCustomerTin(e.target.value.replace(/[^\d-]/g, ''))}
                                onKeyDown={(e) => {
                                    if (
                                        !/^[0-9-]$/.test(e.key) && 
                                        !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter'].includes(e.key) &&
                                        !e.ctrlKey && !e.metaKey
                                    ) {
                                        e.preventDefault();
                                    }
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="customerAddress">Business Address</label>
                            <input 
                                type="text" 
                                id="customerAddress"
                                className="form-control" 
                                placeholder="Address (Optional)" 
                                value={customerAddress}
                                onChange={(e) => setCustomerAddress(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="warehouseChecker">
                                Checker <span style={{ color: 'var(--danger, #EF4444)' }}>*</span>
                            </label>
                            <select 
                                id="warehouseChecker"
                                className="form-control"
                                value={selectedChecker || ''}
                                onChange={(e) => setSelectedChecker(e.target.value)}
                            >
                                <option value="">Select Checker *</option>
                                {checkers.map((checker, index) => (
                                    <option key={checker.id || `checker-${index}`} value={checker.id}>{checker.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

            </div>

            {/* Product Items List container */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', borderBottom: '1px dashed var(--border)', paddingBottom: '8px', paddingRight: '4px' }}>
                {cart.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '15px', fontSize: '12px' }}>No items selected.</p>
                ) : (
                    cart.map((item, index) => {
                        const price = item.priceTier === 'price2' ? parseFloat(item.price2 || 0) : parseFloat(item.price1 || 0);

                        return (
                            <div key={`${item.id}-${item.priceTier}`} style={{ position: 'relative', zIndex: cart.length - index, display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)', alignItems: 'center' }}>
                                <div style={{ flex: 1, marginRight: '12px' }}>
                                    <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '2px' }}>
                                        <FormattedProductName name={item.name} />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                        <span style={{ fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Price:</span>
                                        <div className="cart-price-select" style={{ display: 'inline-block', width: '135px' }}>
                                            <IOSSelect
                                                 value={item.priceTier || 'price1'}
                                                 onChange={(e) => {
                                                     const selectedTier = typeof e === 'object' && e?.target ? e.target.value : e;
                                                     updateCartItemPriceTier(item.id, item.priceTier || 'price1', selectedTier);
                                                 }}
                                                 options={[
                                                     { value: 'price1', label: `Original (${fmt(item.price1)})` },
                                                     { value: 'price2', label: `Retail (${fmt(item.price2)})` }
                                                 ]}
                                             />
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                    <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>
                                        {fmt(price * item.qty)}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div className="qty-input-group" style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden', background: 'var(--bg-card)' }}>
                                            <button className="qty-adjust-btn" onClick={() => updateCartQty(item.id, item.priceTier, -1)} style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: 'none', borderRight: '1px solid var(--border)', cursor: 'pointer', fontWeight: 'bold' }}>-</button>
                                            <input 
                                                type="number" 
                                                min="1"
                                                max={item.stock}
                                                value={item.qty} 
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    setCartItemQty && setCartItemQty(item.id, item.priceTier, val);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (
                                                        !/^[0-9]$/.test(e.key) && 
                                                        !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter'].includes(e.key) &&
                                                        !e.ctrlKey && !e.metaKey
                                                    ) {
                                                        e.preventDefault();
                                                    }
                                                }}
                                                onFocus={(e) => e.target.select()}
                                                style={{ 
                                                    width: '44px', 
                                                    height: '24px', 
                                                    border: 'none', 
                                                    textAlign: 'center', 
                                                    fontSize: '12px', 
                                                    fontWeight: '600', 
                                                    outline: 'none',
                                                    padding: '0 2px',
                                                    backgroundColor: 'transparent',
                                                    color: 'var(--text-primary)',
                                                    MozAppearance: 'textfield'
                                                }} 
                                             />
                                            <button className="qty-adjust-btn" onClick={() => updateCartQty(item.id, item.priceTier, 1)} style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: 'none', borderLeft: '1px solid var(--border)', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
                                        </div>
                                        <button 
                                            onClick={() => removeFromCart(item.id, item.priceTier)}
                                            style={{ color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            
            <div style={{ flexShrink: 0 }}>
                {/* Totals Box */}
                <div style={{ paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                        <span style={{ fontWeight: '700' }}>{fmt(cartTotals.subtotal)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Tax (12%)</span>
                        <span style={{ fontWeight: '700' }}>{fmt(cartTotals.tax)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '16px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Total</strong>
                        <strong style={{ color: 'var(--text-primary)' }}>{fmt(cartTotals.total)}</strong>
                    </div>
                </div>
                {/* Review & Checkout Action Button */}
                <button 
                    type="button"
                    className="btn-review-checkout"
                    onClick={() => {
                        setError('');
                        if (cart.length === 0) {
                            setError("Cart is empty. Please add items to the cart first.");
                            return;
                        }
                        const hasCustomer = (existingCustomerSearch && existingCustomerSearch.trim() !== '') || (newCustomerName && newCustomerName.trim() !== '');
                        if (!hasCustomer) {
                            setError("Customer name is required. Search for an existing customer or enter a new customer name.");
                            return;
                        }
                        if (!selectedChecker) {
                            setError("Warehouse Checker is required. Please select a checker.");
                            return;
                        }
                        setShowCheckoutModal(true);
                    }}
                    style={{ 
                        width: '100%', minHeight: '44px', padding: '12px', fontSize: '14.5px', fontWeight: '700', borderRadius: '8px', 
                        background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', color: '#FFFFFF', border: 'none', 
                        boxShadow: '0 4px 12px rgba(37,99,235,0.2)', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' 
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 6px 16px rgba(37,99,235,0.3)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 4px 12px rgba(37,99,235,0.2)'; }}
                >
                    <span style={{ color: '#FFFFFF', fontWeight: '700' }}>Review & Checkout</span>
                </button>
                {error && (
                    <div style={{ 
                        marginTop: '12px', 
                        padding: '10px 14px', 
                        background: '#FEF2F2', 
                        border: '1.5px solid #FCA5A5', 
                        borderRadius: '8px', 
                        color: '#9B1C1C', 
                        fontSize: '12px', 
                        fontWeight: '600', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px'
                    }}>
                        <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', fill: 'none', stroke: '#9B1C1C', strokeWidth: '2.5', flexShrink: 0 }}>
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <span>{error}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
