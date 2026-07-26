import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useProducts } from '../../../../contexts/ProductContext';
import { invalidateCachePage } from '../../../../shared/hooks/usePaginatedCache';
import useCustomerCache, { resetCustomerCache } from '../../../../shared/hooks/useCustomerCache';
import { resetDashboardCache } from '../../../../shared/hooks/useDashboardCache';
import { resetReportsCache } from '../../../../shared/hooks/useReportsCache';
import { fetchSettingData } from '../../../../shared/hooks/useSettingsCache';
import api from '../../../../shared/api';

const fmt = (n) => `₱${Number(n || 0).toLocaleString('en-US')}`;

export default function usePOS() {
    const { products: contextProducts, categories: backendCategories, searchPosProducts, initialLoading: contextLoading } = useProducts();
    
    // Explicit loading state — NOT tied to products.length which caused infinite spinner
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [searchLoading, setSearchLoading] = useState(false);
    const [posProducts, setPosProducts] = useState([]);
    const searchTimerRef = useRef(null);
    const isInitialLoad = useRef(true);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');

    // Cart state
    const [cart, setCart] = useState([]);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    
    // Discount state
    const [orderDiscountType, setOrderDiscountType] = useState('None'); // None, Senior, PWD, CustomAmount, CustomPercent
    const [orderDiscountVal, setOrderDiscountVal] = useState('');
    
    // Customer Fields
    const [existingCustomerSearch, setExistingCustomerSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null); // Full customer object if selected
    const [newCustomerName, setNewCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerTin, setCustomerTin] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    // Customer data — sourced from shared cache module (no duplicate /customer-log fetch)
    const { customers: customersList } = useCustomerCache();
    
    // Checkers
    const [checkers, setCheckers] = useState([]);
    const [selectedChecker, setSelectedChecker] = useState('');

    useEffect(() => {
        const loadCheckers = async () => {
            try {
                // Checkers API, we could also use cache or just fetch active_only
                const res = await api.get('/checkers?active_only=1');
                setCheckers(res.data);
            } catch (err) {
                console.error(err);
            }
        };
        loadCheckers();
    }, []);

    // Modals

    // When context finishes initial fetch or updates via real-time Echo, keep posProducts in sync
    useEffect(() => {
        if (!contextLoading) {
            if (isInitialLoad.current) {
                isInitialLoad.current = false;
                setLoadingProducts(false);
            }
            if (!searchQuery.trim() && categoryFilter === 'All') {
                setPosProducts(contextProducts);
            }
        }
    }, [contextProducts, contextLoading, searchQuery, categoryFilter]);

    // Debounced server search — fires 250ms after the cashier stops typing
    useEffect(() => {
        if (isInitialLoad.current) return;
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

        // If query is empty and no category filter — show initial 25 from context
        if (!searchQuery.trim() && categoryFilter === 'All') {
            setPosProducts(contextProducts);
            setSearchLoading(false);
            return;
        }

        setSearchLoading(true);
        searchTimerRef.current = setTimeout(async () => {
            const catId = categoryFilter !== 'All'
                ? backendCategories?.find(c => c.name === categoryFilter)?.id || null
                : null;
            const results = await searchPosProducts(searchQuery, catId);
            setPosProducts(results);
            setSearchLoading(false);
        }, 250);

        return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
    }, [searchQuery, categoryFilter, contextProducts, backendCategories, searchPosProducts]);

    // Flat products including variants from posProducts
    const flatProducts = useMemo(() => {
        const flat = [];
        posProducts.forEach(p => {
            if (!p.variants || p.variants.length === 0) {
                flat.push(p);
            } else {
                // Push the base product itself
                flat.push(p);
                // Push the variants
                p.variants.forEach(v => {
                    const opts = v.variant_options || v.variantOptions;
                    const optLabel = Array.isArray(opts) && opts.length > 0 ? opts.map(o => o.value).join(', ') : null;
                    let vName = v.name || p.name;
                    if (optLabel && !vName.includes(optLabel)) {
                        vName = `${vName} (${optLabel})`;
                    }
                    flat.push({
                        ...v,
                        name: vName,
                        category: p.category,
                        parent_product_name: p.name,
                        chinese_name: v.chinese_name || p.chinese_name
                    });
                });
            }
        });
        return flat;
    }, [posProducts]);

    // Filtered Products — category filter (client-side for server-search results)
    const filteredProducts = useMemo(() => {
        let list = flatProducts.filter(p => 
            !p.parent_product_id ? (!p.variants || p.variants.length === 0 || p.stock > 0) : true
        );
        if (categoryFilter !== 'All') {
            list = list.filter(p => p.category === categoryFilter || p.category?.name === categoryFilter);
        }
        return list;
    }, [flatProducts, categoryFilter]);

    // Top-selling category pills — fetched from API on POS boot (sorted by total units sold)
    const [topCategories, setTopCategories] = useState([]);
    useEffect(() => {
        const loadTopCategories = async () => {
            try {
                const res = await api.get('/categories?top_selling=5');
                setTopCategories(res.data || []);
            } catch (err) {
                console.error('Failed to load top categories:', err);
                // Fallback: use backendCategories slice
                setTopCategories((backendCategories || []).slice(0, 5));
            }
        };
        loadTopCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Build the pill list: 'All' + top 5 selling categories (stable, never disappears on filter)
    const categories = useMemo(() => {
        if (topCategories.length > 0) {
            return ['All', ...topCategories.map(c => c.name).filter(Boolean)];
        }
        // Fallback while loading
        if (backendCategories && backendCategories.length > 0) {
            return ['All', ...backendCategories.slice(0, 5).map(c => c.name).filter(Boolean)];
        }
        return ['All'];
    }, [topCategories, backendCategories]);

    // Error Banner State
    const [posError, setPosError] = useState(null);

    const triggerError = (msg) => {
        setPosError(msg);
        setTimeout(() => {
            setPosError(null);
        }, 4000);
    };

    // Cart Actions
    const addToCart = (product, priceTier = 'price1') => {
        if (product.stock <= 0) {
            triggerError(`This item ('${product.name}') is out of stock!`);
            return;
        }

        setCart(prev => {
            const existing = prev.find(item => item.id == product.id && (item.priceTier || 'price1') === priceTier);
            if (existing) {
                const totalQtyInCart = prev
                    .filter(item => item.id == product.id)
                    .reduce((sum, item) => sum + item.qty, 0);

                if (totalQtyInCart >= product.stock) {
                    triggerError(`Cannot exceed available stock (${product.stock} available).`);
                    return prev;
                }
                return prev.map(item => (item.id == product.id && (item.priceTier || 'price1') === priceTier) ? { ...item, qty: item.qty + 1 } : item);
            } else {
                return [...prev, { ...product, qty: 1, priceTier }];
            }
        });
    };

    const updateCartQty = (productId, priceTier, delta) => {
        setCart(prev => prev.map(item => {
            if (item.id == productId && (item.priceTier || 'price1') === priceTier) {
                const newQty = item.qty + delta;
                if (newQty <= 0) return null;

                const totalQtyInCart = prev
                    .filter(i => i.id == productId && (i.priceTier || 'price1') !== priceTier)
                    .reduce((sum, i) => sum + i.qty, 0) + newQty;

                if (totalQtyInCart > item.stock) {
                    triggerError(`Cannot exceed available stock (${item.stock} available).`);
                    return item;
                }
                return { ...item, qty: newQty };
            }
            return item;
        }).filter(Boolean));
    };

    const setCartItemQty = (productId, priceTier, targetQty) => {
        const parsed = parseInt(targetQty, 10);
        if (isNaN(parsed) || parsed <= 0) {
            setCart(prev => prev.map(item => {
                if (item.id == productId && (item.priceTier || 'price1') === priceTier) {
                    return { ...item, qty: 1 };
                }
                return item;
            }));
            return;
        }

        setCart(prev => prev.map(item => {
            if (item.id == productId && (item.priceTier || 'price1') === priceTier) {
                const otherItemsQty = prev
                    .filter(i => i.id == productId && (i.priceTier || 'price1') !== priceTier)
                    .reduce((sum, i) => sum + i.qty, 0);

                if (otherItemsQty + parsed > item.stock) {
                    triggerError(`Cannot exceed available stock (${item.stock} available).`);
                    const maxAllowed = Math.max(1, item.stock - otherItemsQty);
                    return { ...item, qty: maxAllowed };
                }
                return { ...item, qty: parsed };
            }
            return item;
        }));
    };

    const removeFromCart = (productId, priceTier) => {
        setCart(prev => prev.filter(item => !(item.id == productId && (item.priceTier || 'price1') === priceTier)));
    };

    const updateCartItemPriceTier = (productId, oldTier, newTier) => {
        setCart(prev => {
            const index = prev.findIndex(item => item.id == productId && (item.priceTier || 'price1') === oldTier);
            if (index === -1) return prev;

            const next = [...prev];
            const item = next[index];

            const matchIndex = next.findIndex((c, i) => i !== index && c.id == productId && (c.priceTier || 'price1') === newTier);

            if (matchIndex !== -1) {
                const targetItem = next[matchIndex];
                const totalQtyInCart = next
                    .filter(i => i.id == productId && (i.priceTier || 'price1') !== newTier && (i.priceTier || 'price1') !== oldTier)
                    .reduce((sum, i) => sum + i.qty, 0) + targetItem.qty + item.qty;

                if (totalQtyInCart > item.stock) {
                    triggerError(`Merging would exceed available stock (${item.stock} available).`);
                    return prev;
                }
                
                next[matchIndex] = { ...targetItem, qty: targetItem.qty + item.qty };
                next.splice(index, 1);
            } else {
                next[index] = { ...item, priceTier: newTier };
            }

            return next;
        });
    };

    const setItemDiscount = (productId, priceTier, discountVal) => {
        const parsed = parseFloat(discountVal) || 0;
        setCart(prev => prev.map(item => {
            if (item.id == productId && (item.priceTier || 'price1') === priceTier) {
                return { ...item, item_discount: Math.max(0, parsed) };
            }
            return item;
        }));
    };

    const clearCart = () => {
        setCart([]);
        setOrderDiscountType('None');
        setOrderDiscountVal('');
    };

    // Cart Totals
    const cartTotals = useMemo(() => {
        let rawSubtotal = 0;
        let itemDiscountsTotal = 0;

        cart.forEach(item => {
            const origPrice = item.priceTier === 'price2' ? parseFloat(item.price2 || 0) : parseFloat(item.price1 || 0);
            const itemDisc = parseFloat(item.item_discount || 0);
            rawSubtotal += origPrice * item.qty;
            itemDiscountsTotal += itemDisc * item.qty;
        });

        const afterItemDiscounts = Math.max(0, rawSubtotal - itemDiscountsTotal);

        // Order-wide discount calculation
        let orderDiscountAmount = 0;
        let discountRate = 0;
        const val = parseFloat(orderDiscountVal || 0);

        if (orderDiscountType === 'CustomPercent') {
            discountRate = Math.min(100, Math.max(0, val));
            orderDiscountAmount = Math.round((afterItemDiscounts * (discountRate / 100)) * 100) / 100;
        } else if (orderDiscountType === 'CustomAmount') {
            orderDiscountAmount = Math.min(afterItemDiscounts, Math.max(0, val));
        } else if (orderDiscountType === 'Senior' || orderDiscountType === 'PWD') {
            discountRate = 20;
            orderDiscountAmount = Math.round((afterItemDiscounts * 0.20) * 100) / 100;
        }

        const netPayable = Math.max(0, afterItemDiscounts - orderDiscountAmount);

        // VAT-inclusive logic: The net payable includes 12% tax.
        const preVatSubtotal = Math.round((netPayable / 1.12) * 100) / 100;
        const tax = Math.round((netPayable - preVatSubtotal) * 100) / 100;

        const itemCount = cart.reduce((sum, item) => sum + (parseInt(item.qty, 10) || 0), 0);

        return {
            itemCount,
            rawSubtotal,
            itemDiscountsTotal,
            afterItemDiscounts,
            orderDiscountAmount,
            orderDiscountType,
            discountRate,
            subtotal: preVatSubtotal,
            tax: tax,
            total: netPayable
        };
    }, [cart, orderDiscountType, orderDiscountVal]);

    // Submit Checkout
    const processCheckout = async (payload) => {
        try {
            // Map cart items for backend CheckoutRequest validator
            const mappedCart = cart.map(item => ({
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
                customer_name: (payload.customerName || selectedCustomer?.name || newCustomerName || 'Walk-in').trim() || 'Walk-in',
                customer_phone: customerPhone || null,
                checker_id: selectedChecker ? selectedChecker : null,
                payment_method: paymentMethodStr,
                doc_type: docTypeStr,
                amount_tendered: amountTenderedVal,
                split_method_1: paymentObj.split?.[0]?.method || null,
                split_amount_1: paymentObj.split?.[0]?.amount || null,
                split_method_2: paymentObj.split?.[1]?.method || null,
                split_amount_2: paymentObj.split?.[1]?.amount || null,
                discount_amount: cartTotals.orderDiscountAmount,
                discount_type: orderDiscountType !== 'None' ? orderDiscountType : null,
                discount_rate: cartTotals.discountRate
            });

            if (res.status === 201 || res.status === 200) {
                // Invalidate customer cache page to force fresh data load
                invalidateCachePage('/customer-log');

                // Only reset customer cache if a new customer was registered
                const registeredNewCustomer = !selectedCustomer && newCustomerName.trim() !== '';
                if (registeredNewCustomer) {
                    resetCustomerCache();
                }

                resetDashboardCache();
                resetReportsCache();
                clearCart();
                setSelectedCustomer(null);
                setNewCustomerName('');
                setCustomerPhone('');
                setCustomerTin('');
                setCustomerAddress('');
                setExistingCustomerSearch('');
                setSelectedChecker('');
                return { success: true, transaction: res.data.transaction };
            }
        } catch (err) {
            console.error("Checkout failed:", err);
            return { success: false, error: err.response?.data?.message || err.message };
        }
    };

    return {
        products: filteredProducts,
        loadingProducts,
        searchLoading,
        categories,
        searchQuery, setSearchQuery,
        categoryFilter, setCategoryFilter,
        
        cart,
        addToCart, updateCartQty, setCartItemQty, removeFromCart, updateCartItemPriceTier, setItemDiscount, clearCart,
        cartTotals,
        orderDiscountType, setOrderDiscountType,
        orderDiscountVal, setOrderDiscountVal,
        posError, setPosError,
        
        existingCustomerSearch, setExistingCustomerSearch,
        selectedCustomer, setSelectedCustomer,
        newCustomerName, setNewCustomerName,
        customerPhone, setCustomerPhone,
        customerTin, setCustomerTin,
        customerAddress, setCustomerAddress,
        customersList,
        
        checkers, selectedChecker, setSelectedChecker,
        
        showCheckoutModal, setShowCheckoutModal,
        processCheckout,
        
        fmt
    };
}
