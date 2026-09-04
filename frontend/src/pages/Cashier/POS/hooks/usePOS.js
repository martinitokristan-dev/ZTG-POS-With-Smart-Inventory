import { useState } from 'react';
import { useInventory } from '../../../../contexts/InventoryContext';
import { useProducts } from '../../../../contexts/ProductContext';
import { invalidateCachePage } from '../../../../shared/hooks/usePaginatedCache';
import { resetCustomerCache } from '../../../../shared/hooks/useCustomerCache';
import { resetDashboardCache } from '../../../../shared/hooks/useDashboardCache';
import { resetReportsCache } from '../../../../shared/hooks/useReportsCache';
import api from '../../../../shared/api';
import { usePOSProducts } from './usePOSProducts';
import { usePOSCustomer } from './usePOSCustomer';
import { usePOSCart } from './usePOSCart';

const fmt = (n) => `₱${Number(n || 0).toLocaleString('en-US')}`;

export default function usePOS() {
    const { refetch: refreshProducts } = useProducts();
    const { refetch: refetchInventory } = useInventory();

    const productsHook = usePOSProducts();
    const customerHook = usePOSCustomer();
    const cartHook = usePOSCart();

    const [showCheckoutModal, setShowCheckoutModal] = useState(false);

    const processCheckout = async (payload) => {
        try {
            // Map cart items for backend CheckoutRequest validator
            const mappedCart = cartHook.cart.map(item => ({
                product_id: item.id,
                qty: item.qty,
                price_tier: item.priceTier || 'price1',
                item_discount: parseFloat(item.item_discount || 0)
            }));

            const paymentObj = payload.payment || payload;
            const rawMethod = paymentObj.method || payload.method || 'Cash';
            const paymentMethodStr = rawMethod === 'Bank Transfer' ? 'Bank' : rawMethod;
            const docTypeStr = payload.doc_type || payload.docType || 'S.I.';
            const amountTenderedVal = paymentObj.amount_tendered ?? payload.amount_tendered ?? null;

            const res = await api.post('/pos/checkout', {
                cart: mappedCart,
                customer_name: (payload.customerName || customerHook.selectedCustomer?.name || customerHook.newCustomerName || 'Walk-in').trim() || 'Walk-in',
                customer_phone: customerHook.customerPhone || null,
                checker_id: customerHook.selectedChecker ? customerHook.selectedChecker : null,
                si_no: payload.si_no || payload.siNo || null,
                payment_method: paymentMethodStr,
                cheque_number: paymentObj.cheque_number || payload.cheque_number || null,
                doc_type: docTypeStr,
                amount_tendered: amountTenderedVal,
                discount_amount: cartHook.cartTotals.orderDiscountAmount,
                discount_type: cartHook.orderDiscountType !== 'None' ? cartHook.orderDiscountType : null,
                discount_rate: cartHook.cartTotals.discountRate
            });

            if (res.status === 201 || res.status === 200) {
                // Invalidate sales, history, daily-sales, dashboard, and customer caches to force instant data refresh
                invalidateCachePage('/customer-log');
                invalidateCachePage('sales', 1);
                invalidateCachePage('history', 1);
                invalidateCachePage('daily-sales', 1);
                resetDashboardCache();
                resetReportsCache();

                // Only reset customer cache if a new customer was registered
                const registeredNewCustomer = !customerHook.selectedCustomer && customerHook.newCustomerName.trim() !== '';
                if (registeredNewCustomer) { resetCustomerCache(); }

                resetDashboardCache();
                resetReportsCache();
                if (typeof refreshProducts === 'function') refreshProducts();
                if (typeof refetchInventory === 'function') refetchInventory();
                cartHook.clearCart();
                customerHook.setSelectedCustomer(null);
                customerHook.setNewCustomerName('');
                customerHook.setCustomerPhone('');
                customerHook.setCustomerTin('');
                customerHook.setCustomerAddress('');
                customerHook.setExistingCustomerSearch('');
                customerHook.setSelectedChecker('');
                return { success: true, transaction: res.data.transaction };
            }
        } catch (err) {
            console.error("Checkout failed:", err);
            return { success: false, error: err.response?.data?.message || err.message };
        }
    };

    return {
        // Products
        products: productsHook.products,
        loadingProducts: productsHook.loadingProducts,
        searchLoading: productsHook.searchLoading,
        categories: productsHook.categories,
        searchQuery: productsHook.searchQuery,
        setSearchQuery: productsHook.setSearchQuery,
        categoryFilter: productsHook.categoryFilter,
        setCategoryFilter: productsHook.setCategoryFilter,

        // Cart
        cart: cartHook.cart,
        addToCart: cartHook.addToCart,
        updateCartQty: cartHook.updateCartQty,
        setCartItemQty: cartHook.setCartItemQty,
        removeFromCart: cartHook.removeFromCart,
        updateCartItemPriceTier: cartHook.updateCartItemPriceTier,
        setItemDiscount: cartHook.setItemDiscount,
        clearCart: cartHook.clearCart,
        cartTotals: cartHook.cartTotals,
        orderDiscountType: cartHook.orderDiscountType,
        setOrderDiscountType: cartHook.setOrderDiscountType,
        isOrderDiscountActive: cartHook.isOrderDiscountActive,
        orderDiscountVal: cartHook.orderDiscountVal,
        setOrderDiscountVal: cartHook.setOrderDiscountVal,
        posError: cartHook.posError,
        setPosError: cartHook.setPosError,

        // Customer & Checkers
        existingCustomerSearch: customerHook.existingCustomerSearch,
        setExistingCustomerSearch: customerHook.setExistingCustomerSearch,
        selectedCustomer: customerHook.selectedCustomer,
        setSelectedCustomer: customerHook.setSelectedCustomer,
        newCustomerName: customerHook.newCustomerName,
        setNewCustomerName: customerHook.setNewCustomerName,
        customerPhone: customerHook.customerPhone,
        setCustomerPhone: customerHook.setCustomerPhone,
        customerTin: customerHook.customerTin,
        setCustomerTin: customerHook.setCustomerTin,
        customerAddress: customerHook.customerAddress,
        setCustomerAddress: customerHook.setCustomerAddress,
        customersList: customerHook.customersList,
        checkers: customerHook.checkers,
        selectedChecker: customerHook.selectedChecker,
        setSelectedChecker: customerHook.setSelectedChecker,

        // Modal & Checkout
        showCheckoutModal,
        setShowCheckoutModal,
        processCheckout,
        fmt,
    };
}
