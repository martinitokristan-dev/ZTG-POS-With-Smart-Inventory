import React, { useState, useEffect } from 'react';
import usePOS from './hooks/usePOS';
import ProductGrid from './views/ProductGrid';
import CartSidebar from './views/CartSidebar';
import CheckoutModal from './modals/CheckoutModal';

export default function POS() {
    const pos = usePOS();
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);
    const [activeTab, setActiveTab] = useState('catalogue');

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 900;
            setIsMobile(mobile);
            if (!mobile) {
                setActiveTab('catalogue');
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const cartItemCount = pos.cartTotals?.itemCount || 0;
    const cartGrandTotal = pos.cartTotals?.grandTotal || 0;

    return (
        <div className="main-workspace-outer">
            <div className="main-workspace">
                <div className="top-bar" style={{ borderBottom: '1px solid var(--border)', padding: isMobile ? '16px' : '24px 140px 24px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: 'var(--bg-card)', height: 'auto' }}>
                    <div>
                        <h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '700', marginBottom: '4px', fontFamily: '"Outfit", sans-serif', color: 'var(--text-primary)' }}>Point of Sale (POS)</h1>
                        <div className="page-description" style={{ marginTop: '0', fontSize: '13px', color: 'var(--text-secondary)' }}>Process cashier sales immediately. Verify inventory and process change calculations.</div>
                    </div>
                </div>

                {/* Mobile View Switcher (< 900px) */}
                {isMobile && (
                    <div style={{ display: 'flex', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '8px 16px', gap: '8px', flexShrink: 0 }}>
                        <button
                            type="button"
                            onClick={() => setActiveTab('catalogue')}
                            style={{
                                flex: 1,
                                height: '44px',
                                minHeight: '44px',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                border: 'none',
                                fontWeight: '700',
                                fontSize: '13px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                backgroundColor: activeTab === 'catalogue' ? 'var(--primary)' : 'var(--bg-secondary)',
                                color: activeTab === 'catalogue' ? '#FFFFFF' : 'var(--text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            Product Catalogue
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('cart')}
                            style={{
                                flex: 1,
                                height: '44px',
                                minHeight: '44px',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                border: 'none',
                                fontWeight: '700',
                                fontSize: '13px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                backgroundColor: activeTab === 'cart' ? '#10B981' : 'var(--bg-secondary)',
                                color: activeTab === 'cart' ? '#FFFFFF' : 'var(--text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                            }}
                        >
                            Cart ({cartItemCount})
                        </button>
                    </div>
                )}

                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{
                        display: isMobile ? 'flex' : 'grid',
                        flexDirection: 'column',
                        gridTemplateColumns: isMobile ? 'none' : '1fr 480px',
                        gap: '20px',
                        flex: 1,
                        minHeight: 0,
                        overflow: 'hidden',
                        padding: isMobile ? '12px' : '20px',
                        background: 'var(--bg-canvas)'
                    }}>
                        {/* Catalogue View */}
                        {(!isMobile || activeTab === 'catalogue') && (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
                                <ProductGrid 
                                    products={pos.products}
                                    loading={pos.loadingProducts}
                                    searchLoading={pos.searchLoading}
                                    categories={pos.categories}
                                    searchQuery={pos.searchQuery}
                                    setSearchQuery={pos.setSearchQuery}
                                    categoryFilter={pos.categoryFilter}
                                    setCategoryFilter={pos.setCategoryFilter}
                                    addToCart={pos.addToCart}
                                    fmt={pos.fmt}
                                />
                            </div>
                        )}

                        {/* Cart View */}
                        {(!isMobile || activeTab === 'cart') && (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
                                <CartSidebar 
                                    cart={pos.cart}
                                    updateCartQty={pos.updateCartQty}
                                    removeFromCart={pos.removeFromCart}
                                    updateCartItemPriceTier={pos.updateCartItemPriceTier}
                                    clearCart={pos.clearCart}
                                    cartTotals={pos.cartTotals}
                                    
                                    existingCustomerSearch={pos.existingCustomerSearch}
                                    setExistingCustomerSearch={pos.setExistingCustomerSearch}
                                    newCustomerName={pos.newCustomerName}
                                    setNewCustomerName={pos.setNewCustomerName}
                                    customerPhone={pos.customerPhone}
                                    setCustomerPhone={pos.setCustomerPhone}
                                    customerTin={pos.customerTin}
                                    setCustomerTin={pos.setCustomerTin}
                                    customerAddress={pos.customerAddress}
                                    setCustomerAddress={pos.setCustomerAddress}
                                    
                                    selectedCustomer={pos.selectedCustomer}
                                    setSelectedCustomer={pos.setSelectedCustomer}
                                    
                                    customersList={pos.customersList}
                                    
                                    checkers={pos.checkers}
                                    selectedChecker={pos.selectedChecker}
                                    setSelectedChecker={pos.setSelectedChecker}
                                    
                                    setCartItemQty={pos.setCartItemQty}
                                    posError={pos.posError}
                                    setPosError={pos.setPosError}
                                    setShowCheckoutModal={pos.setShowCheckoutModal}
                                    fmt={pos.fmt}
                                />
                            </div>
                        )}
                    </div>
                </div>


            </div>

            <CheckoutModal 
                isOpen={pos.showCheckoutModal}
                onClose={() => pos.setShowCheckoutModal(false)}
                cart={pos.cart}
                cartTotals={pos.cartTotals}
                setItemDiscount={pos.setItemDiscount}
                orderDiscountType={pos.orderDiscountType}
                setOrderDiscountType={pos.setOrderDiscountType}
                orderDiscountVal={pos.orderDiscountVal}
                setOrderDiscountVal={pos.setOrderDiscountVal}
                processCheckout={pos.processCheckout}
                fmt={pos.fmt}
            />
        </div>
    );
}
