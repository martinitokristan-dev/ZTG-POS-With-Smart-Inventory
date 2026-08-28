import { useState, useMemo } from 'react';
import { POS_ERROR_DISPLAY_MS } from '../../../../config/constants';

export function usePOSCart() {
    // Cart state
    const [cart, setCart] = useState([]);

    // Discount state
    const [orderDiscountType, setOrderDiscountType] = useState('None'); // None, Senior, PWD, CustomAmount, CustomPercent
    const [orderDiscountVal, setOrderDiscountVal] = useState('');

    // Error Banner State
    const [posError, setPosError] = useState(null);

    const triggerError = (msg) => {
        setPosError(msg);
        setTimeout(() => {
            setPosError(null);
        }, POS_ERROR_DISPLAY_MS);
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
            itemDiscountsTotal += itemDisc;
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

    return {
        cart,
        setCart,
        addToCart,
        updateCartQty,
        setCartItemQty,
        removeFromCart,
        updateCartItemPriceTier,
        setItemDiscount,
        clearCart,
        cartTotals,
        orderDiscountType,
        setOrderDiscountType,
        orderDiscountVal,
        setOrderDiscountVal,
        posError,
        setPosError,
        triggerError,
    };
}
