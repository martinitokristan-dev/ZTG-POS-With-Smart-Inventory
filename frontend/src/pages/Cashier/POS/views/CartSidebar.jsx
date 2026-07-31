import React, { useState, useMemo } from 'react';
import FormattedProductName from '../../../../shared/components/FormattedProductName';

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
        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px', height: '100%', background: '#FFFFFF', border: '1px solid var(--border)', borderRadius: '10px' }}>
            <div style={{ flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', fontFamily: '"Outfit", sans-serif', margin: 0, color: 'var(--text-primary)' }}>Product List</h3>
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

                {/* Customer Fields at Top */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '10px', marginBottom: '2px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Existing Customer / Already Exist</label>
                        <div style={{ position: 'relative' }}>
                            <input 
                                type="text" 
                                className="form-control form-control-sm" 
                                placeholder="Search existing customer..." 
                                style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid var(--border)', outline: 'none', textAlign: 'left' }}
                                value={existingCustomerSearch}
                                onFocus={() => setIsDropdownOpen(true)}
                                onBlur={() => setIsDropdownOpen(false)}
                                onChange={(e) => {
                                    setExistingCustomerSearch(e.target.value);
                                    if (selectedCustomer && selectedCustomer.name !== e.target.value) {
                                        setSelectedCustomer(null);
                                    }
                                    if (e.target.value) setError('');
                                }}
                            />
                            {/* Simple dropdown if search has results and is focused (mockup style) */}
                            {isDropdownOpen && customersToDisplay.length > 0 && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#FFFFFF', border: '1px solid var(--border)', borderRadius: '8px', zIndex: 1000, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginTop: '4px', padding: '4px 0' }}>
                                    {customersToDisplay.slice(0, 20).map(c => (
                                        <div 
                                            key={c.id || c.name} 
                                            style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', textAlign: 'left', color: 'var(--text-primary)', transition: 'background 0.1s' }}
                                            onMouseDown={(e) => {
                                                // Prevent input blur from triggering before selection registers
                                                e.preventDefault();
                                                setSelectedCustomer(c);
                                                setExistingCustomerSearch(c.name);
                                                setCustomerPhone(c.contact || c.contact_number || c.phone || '');
                                                setCustomerTin(c.tin || '');
                                                setCustomerAddress(c.address || '');
                                                setNewCustomerName('');
                                                setError('');
                                                setIsDropdownOpen(false);
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#F1F5F9'}
                                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            {c.name} {c.contact || c.phone ? `(${c.contact || c.phone})` : ''}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '10px', marginBottom: '2px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>New Customer / First Time</label>
                        <input 
                            type="text" 
                            className="form-control form-control-sm" 
                            placeholder="Enter new customer name" 
                            style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid var(--border)', outline: 'none' }}
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
                    <div>
                        <input 
                            type="text" 
                            className="form-control form-control-sm" 
                            placeholder="Contact Number (Optional)" 
                            style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid var(--border)', outline: 'none' }}
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                        />
                    </div>
                    <div>
                        <input 
                            type="text" 
                            className="form-control form-control-sm" 
                            placeholder="Buyer's TIN (e.g. 123-456-789-000) — Required for B2B" 
                            style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid var(--border)', outline: 'none' }}
                            value={customerTin}
                            onChange={(e) => setCustomerTin(e.target.value)}
                        />
                    </div>
                    <div>
                        <input 
                            type="text" 
                            className="form-control form-control-sm" 
                            placeholder="Buyer's Business Address (Optional for walk-in)" 
                            style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid var(--border)', outline: 'none' }}
                            value={customerAddress}
                            onChange={(e) => setCustomerAddress(e.target.value)}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '10px', marginBottom: '2px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Warehouse Checker <span style={{ color: 'var(--danger)' }}>*</span></label>
                        <select 
                            className="form-select form-select-sm"
                            style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid var(--border)', outline: 'none' }}
                            value={selectedChecker || ''}
                            onChange={(e) => setSelectedChecker(e.target.value)}
                        >
                            <option value="" hidden>Select Checker *</option>
                            {checkers.map(checker => (
                                <option key={checker.id} value={checker.id}>{checker.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Product Items List container */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', borderBottom: '1px dashed var(--border)', paddingBottom: '12px' }}>
                {cart.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '15px', fontSize: '12px' }}>No items selected.</p>
                ) : (
                    cart.map(item => {
                        const price = item.priceTier === 'price2' ? parseFloat(item.price2 || 0) : parseFloat(item.price1 || 0);
                        const tierColor = item.priceTier === 'price2' ? '#7C3AED' : '#2563EB';

                        return (
                            <div key={`${item.id}-${item.priceTier}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid var(--border)', alignItems: 'center' }}>
                                <div style={{ flex: 1, marginRight: '12px' }}>
                                    <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '2px' }}>
                                        <FormattedProductName name={item.name} />
                                    </div>
                                    {item.chinese_name && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>{item.chinese_name}</div>}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                        <span style={{ fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Price:</span>
                                        <select 
                                            value={item.priceTier || 'price1'} 
                                            onChange={(e) => updateCartItemPriceTier(item.id, item.priceTier || 'price1', e.target.value)}
                                            style={{ border: 'none', background: 'transparent', fontSize: '11px', fontWeight: '700', color: tierColor, outline: 'none', cursor: 'pointer', padding: 0 }}
                                        >
                                            <option value="price1" style={{ color: '#64748B' }}>Original ({fmt(item.price1)})</option>
                                            <option value="price2" style={{ color: '#1E293B' }}>Retail ({fmt(item.price2)})</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                    <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>
                                        {fmt(price * item.qty)}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div className="qty-input-group" style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden', background: '#FFFFFF' }}>
                                            <button className="qty-adjust-btn" onClick={() => updateCartQty(item.id, item.priceTier, -1)} style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', border: 'none', borderRight: '1px solid var(--border)', cursor: 'pointer', fontWeight: 'bold' }}>-</button>
                                            <input 
                                                type="number" 
                                                min="1"
                                                max={item.stock}
                                                value={item.qty} 
                                                onChange={(e) => setCartItemQty && setCartItemQty(item.id, item.priceTier, e.target.value)}
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
                                                    MozAppearance: 'textfield'
                                                }} 
                                             />
                                            <button className="qty-adjust-btn" onClick={() => updateCartQty(item.id, item.priceTier, 1)} style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', border: 'none', borderLeft: '1px solid var(--border)', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
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
                        background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', color: '#fff', border: 'none', 
                        boxShadow: '0 4px 12px rgba(37,99,235,0.2)', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' 
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 6px 16px rgba(37,99,235,0.3)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 4px 12px rgba(37,99,235,0.2)'; }}
                >
                    Review & Checkout
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
