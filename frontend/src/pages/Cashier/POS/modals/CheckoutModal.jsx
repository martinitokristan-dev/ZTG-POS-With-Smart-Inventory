import React, { useState, useEffect } from 'react';
import FormattedProductName from '../../../../shared/components/FormattedProductName';
import { printUnifiedReceipt } from '../../../../utils/printReceipt';
import api from '../../../../shared/api';

export default function CheckoutModal({ 
    isOpen, 
    onClose, 
    cart, 
    cartTotals, 
    setItemDiscount,
    orderDiscountType,
    setOrderDiscountType,
    orderDiscountVal,
    setOrderDiscountVal,
    processCheckout, 
    fmt 
}) {
    const [docType, setDocType] = useState('S.I.');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    
    // Cash Fields
    const [amountTendered, setAmountTendered] = useState('');
    
    // Split Fields
    const [splitMethod1, setSplitMethod1] = useState('GCash');
    const [splitAmount1, setSplitAmount1] = useState('');
    const [splitMethod2, setSplitMethod2] = useState('Cash');
    const [splitAmount2, setSplitAmount2] = useState('');

    // Success & Error State
    const [checkoutSuccess, setCheckoutSuccess] = useState(false);
    const [completedTx, setCompletedTx] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    // Live logo URL — always reflects current logo (never frozen per spec)
    const [logoUrl, setLogoUrl] = useState(null);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (isOpen && !checkoutSuccess && !isProcessing && e.key === 'Enter') {
                if (document.activeElement && document.activeElement.tagName === 'TEXTAREA') return;
                // prevent default form submission if focused on something else to avoid double firing
                e.preventDefault();
                const btn = document.getElementById('submitCheckoutBtn');
                if (btn) btn.click();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, checkoutSuccess, isProcessing]);

    // Fetch live settings on mount
    useEffect(() => {
        api.get('/settings')
            .then(res => {
                const data = res.data || {};
                const logo = data.business_logo || null;
                if (logo) setLogoUrl(logo);
                localStorage.setItem('cached_business_info', JSON.stringify(data));
            })
            .catch(() => { /* logo silently absent */ });
    }, []);


    if (!isOpen) return null;

    const tenderedVal = parseFloat(amountTendered || 0);
    const changeDue = Math.max(0, tenderedVal - cartTotals.total);
    const isChangeSufficient = paymentMethod === 'Cash' ? (tenderedVal >= cartTotals.total) : true;
    const changeDueColor = isChangeSufficient ? '#10B981' : '#EF4444';
    const changeDueBg = isChangeSufficient ? '#ECFDF5' : '#FEF2F2';

    const handleCheckout = async () => {
        setError(null);
        let paymentData = {};
        
        if (paymentMethod === 'Split') {
            const s1 = parseFloat(splitAmount1 || 0);
            const s2 = parseFloat(splitAmount2 || 0);
            if ((s1 + s2) < cartTotals.total) {
                setError("Split amounts do not cover the total due.");
                return;
            }
            paymentData = {
                method: 'Split',
                split: [
                    { method: splitMethod1, amount: s1 },
                    { method: splitMethod2, amount: s2 }
                ]
            };
        } else if (paymentMethod === 'Cash') {
            if (tenderedVal < cartTotals.total) {
                setError("Cash received is less than the total due.");
                return;
            }
            paymentData = {
                method: 'Cash',
                amount_tendered: tenderedVal,
                change: changeDue
            };
        } else {
            paymentData = { method: paymentMethod };
        }

        setIsProcessing(true);
        try {
            const payload = {
                doc_type: docType,
                payment: paymentData
            };

            const res = await processCheckout(payload);
            if (res.success) {
                setCompletedTx(res.transaction);
                setCheckoutSuccess(true);
            } else {
                setError("Checkout failed: " + res.error);
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePrint = () => {
        if (!completedTx) return;

        let splitDetails = '';
        if (completedTx.payment_method && completedTx.payment_method.startsWith('Split:')) {
            splitDetails += `<tr><td style="padding:3px 0;font-size:11px;color:#374151;">Payment Method:</td><td style="padding:3px 0;font-size:11px;text-align:right;font-weight:600;">Split Payment</td></tr>`;
            const parts = completedTx.payment_method.replace('Split: ', '').split(/\s*[+&]\s*/);
            parts.forEach(p => {
                const match = p.match(/^(.+)\s+₱?([\d,.]+)/);
                if (match) splitDetails += `<tr><td style="padding:2px 0 2px 8px;font-size:11px;color:#374151;">- ${match[1]}:</td><td style="padding:2px 0;font-size:11px;text-align:right;">&#8369;${match[2]}</td></tr>`;
            });
            if (completedTx.amount_tendered && completedTx.amount_tendered > 0) {
                splitDetails += `<tr><td style="padding:3px 0;font-size:11px;color:#374151;">Cash Received:</td><td style="padding:3px 0;font-size:11px;text-align:right;">&#8369;${Number(completedTx.amount_tendered).toLocaleString(undefined,{minimumFractionDigits:2})}</td></tr>`;
                const cd = Math.max(0, completedTx.amount_tendered - completedTx.amount);
                splitDetails += `<tr><td style="padding:3px 0;font-size:11px;color:#374151;">Change:</td><td style="padding:3px 0;font-size:11px;text-align:right;">&#8369;${Number(cd).toLocaleString(undefined,{minimumFractionDigits:2})}</td></tr>`;
            }
        }

        const userStr = localStorage.getItem('auth_user');
        const user = userStr ? JSON.parse(userStr) : {};
        const cashierName = user.real_name || user.name || 'Cashier';

        // Map items structured for printUnifiedReceipt
        const mappedItems = (completedTx.items || []).map(item => ({
            name: item.product?.name || item.name || 'Item',
            partNo: item.product?.part_no || item.partNo || item.part_no || '—',
            qty: item.qty,
            price: item.price,
            unit: item.product?.unit || item.unit || 'pc'
        }));

        printUnifiedReceipt({
            type: 'Sales',
            invoiceNo: completedTx.si_no || completedTx.receipt_number,
            date: new Date(completedTx.created_at || completedTx.date || Date.now()).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }),
            customer: completedTx.customer?.name || 'Walk-in',
            phone: completedTx.customer?.phone || '',
            buyerTin: completedTx.customer?.tin || '',
            buyerAddress: completedTx.customer?.address || '',
            items: mappedItems,
            total: completedTx.amount,
            discountAmount: Number(completedTx.discount_amount || cartTotals.discount || 0),
            payment: completedTx.payment_method,
            tendered: completedTx.amount_tendered || 0,
            change: Math.max(0, (completedTx.amount_tendered || 0) - completedTx.amount),
            servedBy: completedTx.cashier?.name || cashierName,
            docType: completedTx.doc_type || docType,
            splitDetails: splitDetails,
            // BIR compliance: use frozen snapshot from this transaction;
            // fall back to empty object for legacy transactions with no snapshot.
            businessInfo: completedTx.business_snapshot || {},
            // Logo is always the current live logo — never frozen per spec.
            logoUrl: logoUrl,
        });
    };

    const handleCloseSuccess = () => {
        setCheckoutSuccess(false);
        setCompletedTx(null);
        setDocType('S.I.');
        setPaymentMethod('Cash');
        setAmountTendered('');
        onClose();
    };

    if (checkoutSuccess && completedTx) {
        const userStr = localStorage.getItem('auth_user');
        const user = userStr ? JSON.parse(userStr) : {};
        const cashierName = user.real_name || user.name || 'Cashier';
        
        // Format dates
        const dateStr = new Date(completedTx.created_at || completedTx.date || Date.now()).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

        // Calculate VAT details
        const totalVal = parseFloat(completedTx.amount || 0);
        const isSplit = completedTx.payment_method?.startsWith('Split:');

        return (
            <div className="modal-overlay" style={{ display: 'flex', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, alignItems: 'center', justifyContent: 'center' }}>
                <div style={{
                    background: 'white',
                    borderRadius: '20px',
                    width: '100%',
                    maxWidth: '580px',
                    margin: '20px',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.18)',
                    overflow: 'hidden',
                    position: 'relative'
                }}>
                    {/* Success Header Banner */}
                    <div style={{
                        padding: '16px 24px',
                        background: '#F8FAFC',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        flexDirection: 'column',
                        gap: '8px'
                    }}>
                        <div style={{
                            width: '32px', height: '32px',
                            background: '#F0FDF4',
                            borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px solid #22C55E',
                            flexShrink: 0
                        }}>
                            <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: 'none', stroke: '#15803D', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: '"Outfit", sans-serif' }}>Transaction Successful</h3>
                            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                Receipt No: <strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{completedTx.si_no || completedTx.receipt_number}</strong>
                            </p>
                        </div>
                    </div>

                    {/* Receipt Body */}
                    <div style={{ padding: '16px 24px 20px' }}>
                        {/* Receipt Paper */}
                        <div style={{
                            background: '#FAFAFA',
                            border: '1px solid #E8ECF0',
                            borderRadius: '12px',
                            marginBottom: '16px',
                            overflow: 'hidden'
                        }}>
                            {/* Company Header */}
                            <div style={{
                                background: '#F1F5F9',
                                padding: '12px 20px',
                                textAlign: 'center',
                                borderBottom: '1px dashed #CBD5E1'
                            }}>
                                <p style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 2px' }}>ZTG Heavy Equipment Parts</p>
                                <p style={{ fontSize: '11px', color: '#64748B', margin: 0 }}>Official Sales Receipt</p>
                            </div>

                            {/* Receipt Content */}
                            <div style={{ padding: '16px 20px', maxHeight: '320px', overflowY: 'auto' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    <span style={{ fontWeight: '600' }}>Date:</span>
                                    <span style={{ textAlign: 'right', color: 'var(--text-primary)' }}>{dateStr}</span>
                                    
                                    <span style={{ fontWeight: '600' }}>Cashier:</span>
                                    <span style={{ textAlign: 'right', color: 'var(--text-primary)' }}>{completedTx.cashier?.name || cashierName}</span>
                                    
                                    <span style={{ fontWeight: '600' }}>Customer:</span>
                                    <span style={{ textAlign: 'right', color: 'var(--text-primary)' }}>{completedTx.customer?.name || 'Walk-in'}</span>
                                    
                                    <span style={{ fontWeight: '600' }}>Doc Type:</span>
                                    <span style={{ textAlign: 'right', color: 'var(--text-primary)' }}>{completedTx.doc_type || docType}</span>
                                </div>
                                
                                <div style={{ borderTop: '1px dashed var(--border)', margin: '16px 0' }}></div>
                                
                                <div style={{ marginBottom: '16px' }}>
                                    {(completedTx.items || []).map(item => {
                                        const price = parseFloat(item.price || 0);
                                        const itemTotal = price * item.qty;
                                        const tierBadge = item.price_tier === 'price2' ? (
                                            <span key={`${item.id}-badge`} style={{ fontSize: '10px', backgroundColor: '#F5F3FF', color: '#7C3AED', padding: '1px 5px', borderRadius: '8px', fontWeight: '700', marginLeft: '4px' }}>P2</span>
                                        ) : (
                                            <span key={`${item.id}-badge`} style={{ fontSize: '10px', backgroundColor: '#EFF6FF', color: '#2563EB', padding: '1px 5px', borderRadius: '8px', fontWeight: '700', marginLeft: '4px' }}>P1</span>
                                        );
                                        return (
                                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                                                <span style={{ flex: 1, paddingRight: '12px', fontWeight: '500' }}>
                                                    {item.product?.name || item.name || 'Item'}
                                                    {tierBadge}
                                                </span>
                                                <span style={{ color: 'var(--text-secondary)', width: '40px', textAlign: 'center' }}>x{item.qty}</span>
                                                <span style={{ fontWeight: '600', width: '80px', textAlign: 'right' }}>₱{itemTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                
                                <div style={{ borderTop: '1px dashed var(--border)', margin: '16px 0' }}></div>
                                
                                {((completedTx.discount_amount && Number(completedTx.discount_amount) > 0) || cartTotals.discount > 0) && (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                                            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>₱{(totalVal + Number(completedTx.discount_amount || cartTotals.discount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: '#2563EB', fontWeight: '600' }}>
                                            <span>Discount</span>
                                            <span>-₱{Number(completedTx.discount_amount || cartTotals.discount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    </>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '16px', color: completedTx.payment_method === 'P.O. (Pending)' ? 'var(--danger, #EF4444)' : 'var(--primary)' }}>
                                    <span>Grand Total</span>
                                    <span>₱{totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>

                                <div style={{ borderTop: '1px dashed var(--border)', margin: '16px 0' }}></div>

                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span>Payment Method:</span>
                                        <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{completedTx.payment_method}</span>
                                    </div>
                                    {!isSplit ? (
                                        completedTx.payment_method === 'Cash' && (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                    <span>Cash Received:</span>
                                                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>₱{parseFloat(completedTx.amount_tendered || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>Change Due:</span>
                                                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>₱{Math.max(0, parseFloat(completedTx.amount_tendered || 0) - totalVal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            </>
                                        )
                                    ) : (
                                        <>
                                            {completedTx.amount_tendered > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                    <span>Cash Received:</span>
                                                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>₱{parseFloat(completedTx.amount_tendered || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            )}
                                            {completedTx.amount_tendered > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>Change:</span>
                                                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>₱{Math.max(0, parseFloat(completedTx.amount_tendered || 0) - totalVal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="button" onClick={handleCloseSuccess} style={{
                                flex: 1, padding: '10px 16px', borderRadius: '8px',
                                border: '1.5px solid #E2E8F0', background: 'white',
                                fontSize: '13px', fontWeight: '600', color: '#64748B',
                                cursor: 'pointer', transition: 'all 0.2s'
                            }} onMouseOver={e => { e.currentTarget.style.background='#F8FAFC'; e.currentTarget.style.borderColor='#CBD5E1'; }}
                               onMouseOut={e => { e.currentTarget.style.background='white'; e.currentTarget.style.borderColor='#E2E8F0'; }}>
                                Close
                            </button>
                            <button type="button" onClick={handlePrint} style={{
                                flex: 2, padding: '10px 16px', borderRadius: '8px',
                                border: 'none', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                                fontSize: '13px', fontWeight: '700', color: 'white',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                gap: '8px', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(37,99,235,0.25)'
                            }} onMouseOver={e => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 6px 16px rgba(37,99,235,0.35)'; }}
                               onMouseOut={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 4px 12px rgba(37,99,235,0.25)'; }}>
                                <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', fill: 'none', stroke: 'white', strokeWidth: '2.5' }}>
                                    <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z"/>
                                </svg>
                                Print Receipt
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay" style={{ display: 'flex', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, alignItems: 'center', justifyContent: 'center' }}>
            <div className="modal-card" style={{ maxWidth: '1200px', width: '95%', display: 'flex', flexDirection: 'column', borderRadius: '16px', overflow: 'hidden', background: '#FFFFFF', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                {/* Header */}
                <div className="modal-header" style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFAFA' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <svg viewBox="0 0 24 24" style={{ width: '24px', height: '24px', fill: 'none', stroke: 'var(--primary)', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                            <circle cx="9" cy="21" r="1"></circle>
                            <circle cx="20" cy="21" r="1"></circle>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                        </svg>
                        <h3 className="modal-title" style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: '"Outfit", sans-serif' }}>Order Review & Checkout</h3>
                    </div>
                    <button className="modal-close" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '50%' }}>
                        <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' }}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                
                {error && (
                    <div style={{ 
                        margin: '12px 24px 0', 
                        padding: '10px 14px', 
                        background: '#FEF2F2', 
                        border: '1px solid #FCA5A5', 
                        borderRadius: '8px', 
                        color: '#991B1B', 
                        fontSize: '13px', 
                        fontWeight: '600', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between' 
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                            <span>{error}</span>
                        </div>
                        <button type="button" onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#991B1B', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>✕</button>
                    </div>
                )}
                
                {/* Form Wrapper */}
                <form onSubmit={e => { e.preventDefault(); handleCheckout(); }} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                    {/* Body */}
                    <div className="modal-body" style={{ padding: 0, display: 'grid', gridTemplateColumns: '1.2fr 1fr', minHeight: 0, overflow: 'hidden', height: '76vh' }}>
                    {/* Left Pane: Order Review */}
                    <div style={{ padding: '24px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflowY: 'auto', background: '#F8FAFC' }}>
                        <h4 style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 0, marginBottom: '12px', fontFamily: '"Outfit", sans-serif' }}>Items in Cart</h4>
                        
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', overflowY: 'auto', paddingRight: '4px' }}>
                            {cart.map(item => {
                                const origPrice = item.priceTier === 'price2' ? parseFloat(item.price2 || 0) : parseFloat(item.price1 || 0);
                                const itemDisc = parseFloat(item.item_discount || 0);
                                const finalUnitPrice = Math.max(0, origPrice - itemDisc);
                                const lineTotal = finalUnitPrice * item.qty;
                                const origLineTotal = origPrice * item.qty;

                                return (
                                    <div key={`${item.id}-${item.priceTier}`} style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px 12px', background: '#FFFFFF', border: itemDisc > 0 ? '1px solid #3B82F6' : '1px solid var(--border)', borderRadius: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                                                    <FormattedProductName name={item.name} />
                                                    <span style={{ fontSize: '10px', marginLeft: '6px', padding: '2px 6px', borderRadius: '4px', fontWeight: '700', backgroundColor: item.priceTier === 'price2' ? '#F5F3FF' : '#EFF6FF', color: item.priceTier === 'price2' ? '#7C3AED' : '#2563EB' }}>
                                                        {item.priceTier === 'price2' ? 'P2' : 'P1'}
                                                    </span>
                                                </span>
                                                {item.chinese_name && <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{item.chinese_name}</span>}
                                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                    {item.qty} x {itemDisc > 0 ? (
                                                        <>
                                                            <span style={{ textDecoration: 'line-through', color: '#94A3B8', marginRight: '4px' }}>{fmt(origPrice)}</span>
                                                            <strong style={{ color: '#2563EB' }}>{fmt(finalUnitPrice)}</strong>
                                                        </>
                                                    ) : (
                                                        fmt(origPrice)
                                                    )}
                                                </span>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                {itemDisc > 0 ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                        <span style={{ fontSize: '11px', textDecoration: 'line-through', color: '#94A3B8' }}>{fmt(origLineTotal)}</span>
                                                        <span style={{ fontWeight: '700', fontSize: '13px', color: '#2563EB' }}>{fmt(lineTotal)}</span>
                                                    </div>
                                                ) : (
                                                    <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>
                                                        {fmt(lineTotal)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Per-Item Discount Input */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px', borderTop: '1px dashed #F1F5F9' }}>
                                            <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>🏷️ Item Disc:</span>
                                            <input 
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder="₱0.00 off"
                                                value={item.item_discount || ''}
                                                onChange={e => setItemDiscount(item.id, item.priceTier || 'price1', e.target.value)}
                                                style={{ width: '100px', fontSize: '11px', padding: '2px 6px', height: '26px', borderRadius: '4px', border: '1px solid #CBD5E1', textAlign: 'right', fontWeight: '600' }}
                                            />
                                            {itemDisc > 0 && (
                                                <button type="button" onClick={() => setItemDiscount(item.id, item.priceTier || 'price1', 0)} style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '10px', fontWeight: '700', cursor: 'pointer', padding: 0 }}>
                                                    Clear
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        {/* Totals Summary */}
                        <div style={{ background: '#FFFFFF', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                <span>Subtotal</span>
                                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{fmt(cartTotals.rawSubtotal || cartTotals.subtotal)}</span>
                            </div>
                            
                            {(cartTotals.itemDiscountsTotal || 0) > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#2563EB' }}>
                                    <span>Item Discounts</span>
                                    <span style={{ fontWeight: '700' }}>-{fmt(cartTotals.itemDiscountsTotal)}</span>
                                </div>
                            )}

                            {(cartTotals.orderDiscountAmount || 0) > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#16A34A' }}>
                                    <span>Order Discount ({orderDiscountType})</span>
                                    <span style={{ fontWeight: '700' }}>-{fmt(cartTotals.orderDiscountAmount)}</span>
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                <span>Tax (12%)</span>
                                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{fmt(cartTotals.tax)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '700', color: '#FFFFFF', background: paymentMethod === 'P.O. (Pending)' ? 'var(--danger, #EF4444)' : 'var(--primary)', padding: '10px 14px', borderRadius: '8px', marginTop: '4px', alignItems: 'center' }}>
                                <span>Grand Total</span>
                                <span style={{ color: '#FFFFFF' }}>{fmt(cartTotals.total)}</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Right Pane: Checkout Configuration */}
                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', background: '#FFFFFF' }}>
                        <h4 style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 0, marginBottom: '2px', fontFamily: '"Outfit", sans-serif' }}>Payment & Invoice Details</h4>
                        
                        {/* Document Info */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '10px', marginBottom: '4px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Doc Type</label>
                                <select className="form-control form-control-sm" style={{ fontWeight: '600' }} value={docType} onChange={e => setDocType(e.target.value)}>
                                    <option value="S.I.">S.I. (Sales Invoice)</option>
                                    <option value="D.R.">D.R. (Delivery Receipt)</option>
                                    <option value="C.I.">C.I. (Charge Invoice)</option>
                                </select>
                            </div>
                        </div>
                        
                        {/* Payment Info */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: '10px', marginBottom: '4px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Payment Method</label>
                            <select className="form-control form-control-sm" style={{ fontWeight: '600' }} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                                <option value="Cash">Cash</option>
                                <option value="GCash">GCash</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="Split">Split Payment</option>
                                <option value="P.O. (Pending)">P.O. (Pending)</option>
                            </select>
                        </div>

                        {/* Whole-Sale / Order Discount Controls */}
                        <div style={{ background: '#F8FAFC', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Order Discount (Whole Sale)</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {['None', 'CustomAmount', 'CustomPercent'].map(t => (
                                    <button 
                                        type="button"
                                        key={t}
                                        onClick={() => setOrderDiscountType(t)}
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            border: orderDiscountType === t ? '1px solid #2563EB' : '1px solid #CBD5E1',
                                            background: orderDiscountType === t ? '#EFF6FF' : '#FFFFFF',
                                            color: orderDiscountType === t ? '#2563EB' : '#475569'
                                        }}
                                    >
                                        {t === 'None' && 'None'}
                                        {t === 'CustomAmount' && 'Custom ₱'}
                                        {t === 'CustomPercent' && 'Custom %'}
                                    </button>
                                ))}
                            </div>

                            {(orderDiscountType === 'CustomAmount' || orderDiscountType === 'CustomPercent') && (
                                <div style={{ marginTop: '4px' }}>
                                    <input 
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="form-control form-control-sm"
                                        placeholder={orderDiscountType === 'CustomAmount' ? 'Enter discount amount (₱)' : 'Enter discount percentage (%)'}
                                        value={orderDiscountVal}
                                        onChange={e => setOrderDiscountVal(e.target.value)}
                                        style={{ fontSize: '12px', fontWeight: '700' }}
                                    />
                                </div>
                            )}
                        </div>

                        {paymentMethod === 'Split' && (
                            <div style={{ background: '#F8FAFC', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Split Payment Details</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px', alignItems: 'center' }}>
                                    <select className="form-control form-control-sm" style={{ fontWeight: '600' }} value={splitMethod1} onChange={e => setSplitMethod1(e.target.value)}>
                                        <option value="Cash">Cash</option>
                                        <option value="GCash">GCash</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                    </select>
                                    <input type="number" className="form-control form-control-sm" placeholder="Amount 1" style={{ fontWeight: '700', textAlign: 'right' }} value={splitAmount1} onChange={e => setSplitAmount1(e.target.value)} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px', alignItems: 'center' }}>
                                    <select className="form-control form-control-sm" style={{ fontWeight: '600' }} value={splitMethod2} onChange={e => setSplitMethod2(e.target.value)}>
                                        <option value="Cash">Cash</option>
                                        <option value="GCash">GCash</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                    </select>
                                    <input type="number" className="form-control form-control-sm" placeholder="Amount 2" style={{ fontWeight: '700', textAlign: 'right' }} value={splitAmount2} onChange={e => setSplitAmount2(e.target.value)} />
                                </div>
                            </div>
                        )}

                        {paymentMethod === 'Cash' && (
                            <div style={{ background: '#F8FAFC', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: '9px', marginBottom: '4px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Cash Received *</label>
                                        <input type="number" className="form-control form-control-sm" placeholder="₱0.00" style={{ fontSize: '13px', fontWeight: '700', textAlign: 'right' }} value={amountTendered} onChange={e => setAmountTendered(e.target.value)} />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: '9px', marginBottom: '4px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Change Due</label>
                                        <input type="text" className="form-control form-control-sm" placeholder="₱0.00" readOnly style={{ fontSize: '13px', fontWeight: '700', textAlign: 'right', color: changeDueColor, backgroundColor: changeDueBg }} value={fmt(changeDue)} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Footer */}
                <div className="modal-footer" style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', backgroundColor: '#FAFAFA', display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: 0, marginRight: 'auto' }}>Drawer: Admin holds physical drawer. Match transaction details with cash.</p>
                    <button id="submitCheckoutBtn" type="submit" className="btn btn-success" disabled={isProcessing} style={{ padding: '8px 20px', fontSize: '13px', fontWeight: '700', borderRadius: '8px', background: isProcessing ? '#94A3B8' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)', border: 'none', boxShadow: isProcessing ? 'none' : '0 4px 12px rgba(16,185,129,0.2)', cursor: isProcessing ? 'not-allowed' : 'pointer' }}>
                        {isProcessing ? 'Processing...' : 'Complete Checkout'}
                    </button>
                </div>
                </form>
            </div>
        </div>
    );
}
