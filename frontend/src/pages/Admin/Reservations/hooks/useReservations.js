import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../../../shared/api';
import { useProducts } from '../../../../contexts/ProductContext';
import { fetchReservations, resetReservationsCache } from '../../../../shared/hooks/useReservationsCache';
import echo from '../../../../lib/echo';

const fmt = (n) => `₱${Number(n || 0).toLocaleString('en-US')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export default function useReservations() {
    const { products } = useProducts();

    /* ── User Session ── */
    const user = (() => { try { return JSON.parse(localStorage.getItem('auth_user')); } catch { return null; } })();
    const userName = user?.real_name || user?.name || 'Staff';

    /* ── List State ── */
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ currentPage: 1, lastPage: 1, total: 0 });

    /* ── Reset page when search or statusFilter changes ── */
    const handleSearchChange = (val) => {
        setSearch(val);
        setPage(1);
    };

    const handleStatusChange = (val) => {
        setStatusFilter(val);
        setPage(1);
    };

    /* ── Modal Visibility ── */
    const [showAddModal, setShowAddModal] = useState(false);
    const [showFulfillModal, setShowFulfillModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    /* ── Selected reservation (for fulfill / cancel) ── */
    const [selected, setSelected] = useState(null);
    const [successData, setSuccessData] = useState(null);

    /* ── Add-Order form state ── */
    const [custName, setCustName] = useState('');
    const [custPhone, setCustPhone] = useState('');
    const [custEmail, setCustEmail] = useState('');
    const [pickupDate, setPickupDate] = useState('');
    const [pickupTime, setPickupTime] = useState('');
    const [notes, setNotes] = useState('');
    const [paymentType, setPaymentType] = useState('deposit50');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [cartItems, setCartItems] = useState([]);
    const [productSearch, setProductSearch] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [addError, setAddError] = useState('');
    const [addLoading, setAddLoading] = useState(false);

    /* ── Fulfill form state ── */
    const [ffPaymentMethod, setFfPaymentMethod] = useState('Cash');
    const [ffAmountReceived, setFfAmountReceived] = useState('');
    const [ffDocType, setFfDocType] = useState('S.I.');
    const [ffNotes, setFfNotes] = useState('');
    const [ffError, setFfError] = useState('');
    const [ffLoading, setFfLoading] = useState(false);

    /* ── Cancel form state ── */
    const [cancelReason, setCancelReason] = useState('');
    const [cancelLoading, setCancelLoading] = useState(false);

    /* ──────────────────────────────────────────────── */
    /* DATA LOADING                                      */
    /* ──────────────────────────────────────────────── */
    const loadReservations = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetchReservations(search, statusFilter, page);
            if (res && res.data) {
                setReservations(res.data);
                setPagination({
                    currentPage: res.currentPage || 1,
                    lastPage: res.lastPage || 1,
                    total: res.total || 0
                });
            } else {
                setReservations(Array.isArray(res) ? res : []);
            }
        } catch (e) {
            console.error('Failed to load reservations:', e);
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter, page]);

    useEffect(() => { loadReservations(); }, [loadReservations]);

    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        const userStr = localStorage.getItem('auth_user');
        let channel = null;

        if (token && userStr) {
            const user = JSON.parse(userStr);
            if (['Admin', 'Supervisor', 'Cashier'].includes(user.role)) {
                channel = echo.private('reservations')
                    .listen('.ReservationUpdated', (e) => {
                        resetReservationsCache();
                        loadReservations();
                    });
            }
        }

        return () => {
            if (channel) {
                echo.leaveChannel('private-reservations');
            }
        };
    }, [loadReservations]);

    /* ──────────────────────────────────────────────── */
    /* PRODUCT SEARCH (for Add modal)                   */
    /* ──────────────────────────────────────────────── */
    const searchTimeout = useRef(null);
    const handleProductSearch = (val) => {
        setProductSearch(val);
        clearTimeout(searchTimeout.current);
        if (!val.trim()) { setSuggestions([]); return; }
        searchTimeout.current = setTimeout(() => {
            const q = val.toLowerCase();
            
            // Flatten products to include parent products (if no variants, or if base product itself has stock) and child variants
            const searchableItems = [];
            products.forEach(p => {
                if (!p.parent_product_id) {
                    // Base product: add if no variants OR if parent's own stock > 0
                    if (!p.variants || p.variants.length === 0 || p.stock > 0) {
                        searchableItems.push({
                            id: p.id,
                            name: p.name,
                            part_no: p.part_no || p.partNo || 'N/A',
                            stock: p.stock,
                            price1: p.price1,
                            price2: p.price2 || p.price1,
                        });
                    }
                } else {
                    // Variant product: add directly (since it is already flat in products list)
                    const optionValues = Array.isArray(p.variant_options)
                        ? p.variant_options.map(opt => opt.value).join(', ')
                        : (Array.isArray(p.variantOptions) ? p.variantOptions.map(opt => opt.value).join(', ') : '');
                    
                    const displayName = optionValues && !p.name.includes(`(${optionValues})`)
                        ? `${p.name} (${optionValues})`
                        : p.name;

                    searchableItems.push({
                        id: p.id,
                        name: displayName,
                        part_no: p.part_no || p.partNo || 'N/A',
                        stock: p.stock,
                        price1: p.price1,
                        price2: p.price2 || p.price1,
                    });
                }
            });

            const results = searchableItems.filter(p => 
                (p.name || '').toLowerCase().includes(q) ||
                (p.part_no || p.partNo || '').toLowerCase().includes(q)
            ).slice(0, 10); // Limit to 10 suggestions
            setSuggestions(results);
        }, 150);
    };

    const addToCart = (product, priceTier = 'price2') => {
        setCartItems(prev => {
            const exists = prev.find(c => c.product_id === product.id && (c.priceTier || 'price2') === priceTier);
            if (exists) return prev.map(c => (c.product_id === product.id && (c.priceTier || 'price2') === priceTier) ? { ...c, qty: c.qty + 1 } : c);
            
            const price = priceTier === 'price1' ? parseFloat(product.price1 || 0) : parseFloat(product.price2 || product.price1 || 0);
            return [...prev, { 
                product_id: product.id, 
                name: product.name, 
                part_no: product.part_no, 
                price: price, 
                qty: 1, 
                stock: product.stock,
                priceTier: priceTier,
                price1: product.price1,
                price2: product.price2
            }];
        });
        setProductSearch('');
        setSuggestions([]);
    };

    const updateCartItemPriceTier = (productId, oldTier, newTier) => {
        setCartItems(prev => {
            const index = prev.findIndex(item => item.product_id === productId && (item.priceTier || 'price2') === oldTier);
            if (index === -1) return prev;

            const next = [...prev];
            const item = next[index];
            const matchIndex = next.findIndex((c, i) => i !== index && c.product_id === productId && (c.priceTier || 'price2') === newTier);

            const matchingProduct = products.find(p => p.id === productId);
            const price = newTier === 'price1' ? parseFloat(matchingProduct?.price1 || 0) : parseFloat(matchingProduct?.price2 || matchingProduct?.price1 || 0);

            if (matchIndex !== -1) {
                const targetItem = next[matchIndex];
                next[matchIndex] = { ...targetItem, qty: targetItem.qty + item.qty };
                next.splice(index, 1);
            } else {
                next[index] = { ...item, priceTier: newTier, price: price };
            }
            return next;
        });
    };

    const removeFromCart = (product_id) => setCartItems(prev => prev.filter(c => c.product_id !== product_id));
    const updateQty = (product_id, qty) => setCartItems(prev => prev.map(c => c.product_id === product_id ? { ...c, qty: Math.max(1, parseInt(qty) || 1) } : c));

    /* ── Cart Calculations ── */
    const vatInclusiveTotal = Math.round(cartItems.reduce((s, c) => s + c.price * c.qty, 0) * 100) / 100;
    const subtotal = Math.round((vatInclusiveTotal / 1.12) * 100) / 100;
    const tax = Math.round((vatInclusiveTotal - subtotal) * 100) / 100;
    const total = vatInclusiveTotal;
    const depositAmt = paymentType === 'full' ? total : total * 0.5;
    const balance = total - depositAmt;

    /* ──────────────────────────────────────────────── */
    /* SUBMIT: Create Reservation                        */
    /* ──────────────────────────────────────────────── */
    const resetAddForm = () => {
        setCustName(''); setCustPhone(''); setCustEmail('');
        setPickupDate(''); setPickupTime(''); setNotes('');
        setPaymentType('deposit50'); setPaymentMethod('Cash');
        setCartItems([]); setProductSearch(''); setSuggestions([]);
        setAddError('');
    };

    const handleAddReservation = async (e) => {
        e.preventDefault();
        setAddError('');
        if (cartItems.length === 0) { setAddError('Please add at least one item to the order.'); return; }
        setAddLoading(true);
        try {
            const payload = {
                customer_name: custName,
                customer_phone: custPhone,
                customer_email: custEmail,
                pickup_date: pickupDate,
                pickup_time: pickupTime,
                notes,
                payment_type: paymentType,
                payment_method: paymentMethod,
                deposit_amount: depositAmt,
                items: cartItems.map(c => ({ product_id: c.product_id, qty: c.qty, price: c.price })),
            };
            const res = await api.post('/reservations', payload);
            setSuccessData(res.data.reservation);
            setShowAddModal(false);
            setShowSuccessModal(true);
            resetAddForm();
            resetReservationsCache();
            loadReservations();
        } catch (err) {
            setAddError(err.response?.data?.message || 'Failed to create reservation.');
        } finally {
            setAddLoading(false);
        }
    };

    /* ──────────────────────────────────────────────── */
    /* FULFILL                                           */
    /* ──────────────────────────────────────────────── */
    const openFulfill = (r) => {
        setSelected(r);
        setFfPaymentMethod('Cash');
        setFfAmountReceived('');
        setFfDocType('S.I.');
        setFfNotes('');
        setFfError('');
        setShowFulfillModal(true);
    };

    const handleFulfill = async () => {
        setFfError('');
        const balanceDue = Number(selected?.total || 0) - Number(selected?.deposit || 0);
        if (!ffAmountReceived || parseFloat(ffAmountReceived) < 0) {
            setFfError('Please enter the amount received.'); return;
        }
        setFfLoading(true);
        try {
            const res = await api.post(`/reservations/${selected.id}/fulfill`, {
                balance_payment: parseFloat(ffAmountReceived),
                payment_method: ffPaymentMethod,
                doc_type: ffDocType,
                notes: ffNotes,
            });
            setSuccessData(res.data.reservation);
            setShowFulfillModal(false);
            setShowSuccessModal(true);
            resetReservationsCache();
            loadReservations();
        } catch (err) {
            console.error("Fulfill error:", err.response?.data);
            const errMsg = err.response?.data?.errors 
                ? Object.values(err.response.data.errors).flat().join(' ')
                : (err.response?.data?.message || 'Failed to fulfill reservation.');
            setFfError(errMsg);
        } finally {
            setFfLoading(false);
        }
    };

    /* ──────────────────────────────────────────────── */
    /* CANCEL                                            */
    /* ──────────────────────────────────────────────── */
    const openCancel = (r) => { setSelected(r); setCancelReason(''); setShowCancelModal(true); };

    const handleCancel = async () => {
        setCancelLoading(true);
        try {
            await api.post(`/reservations/${selected.id}/cancel`, { reason: cancelReason });
            setShowCancelModal(false);
            resetReservationsCache();
            loadReservations();
        } catch (err) {
            console.error('Failed to cancel:', err);
        } finally {
            setCancelLoading(false);
        }
    };

    /* ──────────────────────────────────────────────── */
    /* FULFILL modal balance due calculation             */
    /* ──────────────────────────────────────────────── */
    const ffBalanceDue = selected ? (Number(selected.total || 0) - Number(selected.deposit || 0)) : 0;
    const ffChange = Math.max(0, (parseFloat(ffAmountReceived) || 0) - ffBalanceDue);

    return {
        // Data & Session
        reservations, loading, userName,
        
        // Formating
        fmt, fmtDate,

        // Filters & Pagination
        search, setSearch, handleSearchChange,
        statusFilter, setStatusFilter, handleStatusChange,
        page, setPage, pagination,

        // Modal Controls
        showAddModal, setShowAddModal,
        showFulfillModal, setShowFulfillModal,
        showCancelModal, setShowCancelModal,
        showSuccessModal, setShowSuccessModal,

        // Selection
        selected, successData,

        // Add Modal State & Handlers
        custName, setCustName, custPhone, setCustPhone, custEmail, setCustEmail,
        pickupDate, setPickupDate, pickupTime, setPickupTime, notes, setNotes,
        paymentType, setPaymentType, paymentMethod, setPaymentMethod,
        cartItems, productSearch, suggestions, addError, addLoading,
        handleProductSearch, addToCart, removeFromCart, updateQty, updateCartItemPriceTier,
        resetAddForm, handleAddReservation,
        subtotal, tax, total, depositAmt, balance,

        // Fulfill Modal State & Handlers
        ffPaymentMethod, setFfPaymentMethod, ffAmountReceived, setFfAmountReceived,
        ffDocType, setFfDocType, ffNotes, setFfNotes, ffError, ffLoading,
        openFulfill, handleFulfill, ffBalanceDue, ffChange,

        // Cancel Modal State & Handlers
        cancelReason, setCancelReason, cancelLoading, openCancel, handleCancel
    };
}
