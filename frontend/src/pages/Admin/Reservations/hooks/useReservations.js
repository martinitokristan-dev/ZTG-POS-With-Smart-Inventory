import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../../../shared/api';
import { useProducts } from '../../../../contexts/ProductContext';
import { fetchReservations, resetReservationsCache } from '../../../../shared/hooks/useReservationsCache';
import { invalidateCachePage } from '../../../../shared/hooks/usePaginatedCache';
import { copyReservationsToClipboard } from '../../../../shared/utils/orderFromChinaExcelExporter';
import { showToast } from '../../../../utils/toast';
import { printCollectionReceipt } from '../../../../utils/printReceipt';
import echo from '../../../../lib/echo';

const fmt = (n) => `₱${Number(n || 0).toLocaleString('en-US')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export default function useReservations() {
    const { products, refetch: refreshProducts, searchPosProducts } = useProducts();

    /* ── User Session ── */
    const user = (() => { try { return JSON.parse((sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'))); } catch { return null; } })();
    const userName = user?.real_name || user?.name || 'Staff';

    /* ── List State ── */
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('Pending');
    const [dateFilter, setDateFilter] = useState('today');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ currentPage: 1, lastPage: 1, total: 0 });

    /* ── Reset page when search or statusFilter or dateFilter changes ── */
    const handleSearchChange = (val) => {
        resetReservationsCache();
        setSearch(val);
        setPage(1);
    };

    const handleStatusChange = (val) => {
        resetReservationsCache();
        setStatusFilter(val);
        setPage(1);
    };

    const handleDateFilterChange = (val) => {
        resetReservationsCache();
        setDateFilter(val);
        setPage(1);
    };

    /* ── Modal Visibility ── */
    const [showAddModal, setShowAddModal] = useState(false);
    const [showFulfillModal, setShowFulfillModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    /* ── Selected reservation (for fulfill / cancel / details) ── */
    const [selected, setSelected] = useState(null);
    const [detailsReservation, setDetailsReservation] = useState(null);
    const [successData, setSuccessData] = useState(null);

    const openDetails = (r) => {
        setDetailsReservation(r);
        setShowDetailsModal(true);
    };

    /* ── Add-Order form state ── */
    const [custName, setCustName] = useState('');
    const [custPhone, setCustPhone] = useState('');
    const [custEmail, setCustEmail] = useState('');
    const [enginePlateNumber, setEnginePlateNumber] = useState('');
    const [pickupDate, setPickupDate] = useState('');
    const [pickupTime, setPickupTime] = useState('');
    const [notes, setNotes] = useState('');
    const [paymentType, setPaymentType] = useState('deposit50');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [custChequeNumber, setCustChequeNumber] = useState('');
    const [cartItems, setCartItems] = useState([]);
    const [productSearch, setProductSearch] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [addError, setAddError] = useState('');
    const [addLoading, setAddLoading] = useState(false);

    /* ── Fulfill form state ── */
    const [ffSiNo, setFfSiNo] = useState('');
    const [ffPaymentMethod, setFfPaymentMethod] = useState('Cash');
    const [ffChequeNumber, setFfChequeNumber] = useState('');
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
            const res = await fetchReservations(search, statusFilter, page, statusFilter === 'Completed' ? dateFilter : '');
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
    }, [search, statusFilter, page, dateFilter]);

    useEffect(() => { loadReservations(); }, [loadReservations]);

    useEffect(() => {
        const token = (sessionStorage.getItem('auth_token') ?? localStorage.getItem('auth_token'));
        const userStr = (sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'));
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
        searchTimeout.current = setTimeout(async () => {
            try {
                // Use server-side search so all 70k+ products are searchable
                const raw = await searchPosProducts(val.trim());
                const results = [];
                raw.forEach(p => {
                    const basePartNo = p.part_no || p.partNo || 'N/A';
                    const opts = p.variant_options || p.variantOptions;
                    const optLabel = Array.isArray(opts) && opts.length > 0 ? opts.map(o => o.value).join(', ') : null;

                    if (!p.variants || p.variants.length === 0) {
                        results.push({
                            id: p.id,
                            name: optLabel && !p.name.includes(optLabel) ? `${p.name} (${optLabel})` : p.name,
                            part_no: basePartNo,
                            stock: p.stock,
                            price1: p.price1,
                            price2: p.price2 || p.price1,
                        });
                    } else {
                        if (p.stock > 0) {
                            results.push({
                                id: p.id,
                                name: p.name,
                                part_no: basePartNo,
                                stock: p.stock,
                                price1: p.price1,
                                price2: p.price2 || p.price1,
                            });
                        }
                        p.variants.forEach(v => {
                            const vOpts = v.variant_options || v.variantOptions;
                            const vOptLabel = Array.isArray(vOpts) && vOpts.length > 0 ? vOpts.map(o => o.value).join(', ') : null;
                            const vName = vOptLabel && !(v.name || p.name).includes(vOptLabel)
                                ? `${v.name || p.name} (${vOptLabel})`
                                : (v.name || p.name);
                            results.push({
                                id: v.id,
                                name: vName,
                                part_no: v.part_no || v.partNo || basePartNo,
                                stock: v.stock,
                                price1: v.price1 || p.price1,
                                price2: v.price2 || p.price2 || p.price1,
                            });
                        });
                    }
                });
                setSuggestions(results.slice(0, 15));
            } catch (err) {
                console.error('Reservation product search failed:', err);
                setSuggestions([]);
            }
        }, 300);
    };

    const addCustomItemToCart = (itemName, partNo = 'N/A', price = 0, qty = 1) => {
        if (!itemName || !itemName.trim()) return;
        const itemId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        const newItem = {
            cart_item_id: itemId,
            product_id: null,
            name: itemName.trim(),
            item_name: itemName.trim(),
            part_no: partNo.trim() || 'N/A',
            price: parseFloat(price) || 0,
            qty: Math.max(1, parseInt(qty) || 1),
            stock: 9999,
            priceTier: 'custom',
            price1: parseFloat(price) || 0,
            price2: parseFloat(price) || 0,
        };
        setCartItems(prev => [...prev, newItem]);
        setProductSearch('');
        setSuggestions([]);
    };

    const addToCart = (product, priceTier = 'price2') => {
        const pId = product.id || product.product_id;
        setCartItems(prev => {
            const exists = prev.find(c => (c.product_id === pId || c.cart_item_id === pId) && (c.priceTier || 'price2') === priceTier);
            if (exists) return prev.map(c => ((c.product_id === pId || c.cart_item_id === pId) && (c.priceTier || 'price2') === priceTier) ? { ...c, qty: c.qty + 1 } : c);
            
            const price = priceTier === 'price1' ? parseFloat(product.price1 || 0) : parseFloat(product.price2 || product.price1 || 0);
            return [...prev, { 
                cart_item_id: pId,
                product_id: pId, 
                name: product.name, 
                part_no: product.part_no || 'N/A', 
                price: price, 
                qty: 1, 
                stock: product.stock || 9999,
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
            const index = prev.findIndex(item => (item.cart_item_id === productId || item.product_id === productId) && (item.priceTier || 'price2') === oldTier);
            if (index === -1) return prev;

            const next = [...prev];
            const item = next[index];
            const matchIndex = next.findIndex((c, i) => i !== index && (c.cart_item_id === productId || c.product_id === productId) && (c.priceTier || 'price2') === newTier);

            const price = newTier === 'price1'
                ? parseFloat(item.price1 || 0)
                : parseFloat(item.price2 || item.price1 || 0);

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

    const removeFromCart = (id) => setCartItems(prev => prev.filter(c => (c.cart_item_id || c.product_id || c.id) !== id));
    const updateQty = (id, qty) => setCartItems(prev => prev.map(c => (c.cart_item_id || c.product_id || c.id) === id ? { ...c, qty: Math.max(1, parseInt(qty) || 1) } : c));

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
        setCustName(''); setCustPhone(''); setCustEmail(''); setEnginePlateNumber('');
        setPickupDate(''); setPickupTime(''); setNotes('');
        setPaymentType('deposit50'); setPaymentMethod('Cash'); setCustChequeNumber('');
        setCartItems([]); setProductSearch(''); setSuggestions([]);
        setAddError('');
    };

    const handleAddReservation = async (e) => {
        e.preventDefault();
        setAddError('');
        if (cartItems.length === 0) { setAddError('Please add at least one item to the order.'); return; }
        if (paymentMethod === 'Cheque' && !custChequeNumber.trim()) {
            setAddError('Please enter the Cheque Number.');
            return;
        }
        setAddLoading(true);
        try {
            const payload = {
                customer_name: custName,
                customer_phone: custPhone,
                customer_email: custEmail,
                engine_plate_number: enginePlateNumber,
                pickup_date: pickupDate,
                pickup_time: pickupTime,
                notes,
                payment_type: paymentType,
                payment_method: paymentMethod,
                cheque_number: paymentMethod === 'Cheque' ? custChequeNumber.trim() : null,
                deposit_amount: depositAmt,
                items: cartItems.map(c => ({
                    product_id: c.product_id || null,
                    item_name: c.item_name || c.name || 'Order Item',
                    part_no: c.part_no || 'N/A',
                    engine_plate_number: c.engine_plate_number || enginePlateNumber || null,
                    qty: c.qty,
                    price: c.price
                })),
            };
            const res = await api.post('/reservations', payload);
            setSuccessData(res.data.reservation);
            setShowAddModal(false);
            setShowSuccessModal(true);
            resetAddForm();
            resetReservationsCache();
            invalidateCachePage('sales', 1);
            invalidateCachePage('history', 1);
            invalidateCachePage('daily-sales', 1);
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
        setFfSiNo('');
        setFfPaymentMethod('Cash');
        setFfChequeNumber('');
        const due = Math.max(0, Number(r?.total || 0) - Number(r?.deposit || 0));
        setFfAmountReceived(due <= 0 ? '0' : '');
        setFfDocType('C.R.');
        setFfNotes('');
        setFfError('');
        setShowFulfillModal(true);
    };

    const handleFulfill = async () => {
        setFfError('');
        const balanceDue = Math.max(0, Number(selected?.total || 0) - Number(selected?.deposit || 0));
        const amountRec = parseFloat(ffAmountReceived) || 0;
        if (balanceDue > 0 && (ffAmountReceived === '' || amountRec < balanceDue)) {
            setFfError(`Please enter the amount received (minimum ${fmt(balanceDue)}).`); return;
        }
        if (!ffSiNo.trim()) {
            setFfError(`Please enter the physical Collection Receipt No. from your paper booklet.`); return;
        }
        if (ffPaymentMethod === 'Cheque' && !ffChequeNumber.trim()) {
            setFfError('Please enter the Cheque Number.'); return;
        }
        setFfLoading(true);
        try {
            const res = await api.post(`/reservations/${selected.id}/fulfill`, {
                balance_payment: balanceDue <= 0 ? 0 : amountRec,
                payment_method: ffPaymentMethod,
                cheque_number: ffPaymentMethod === 'Cheque' ? ffChequeNumber.trim() : null,
                doc_type: 'C.R.',
                si_no: ffSiNo.trim(),
                notes: ffNotes,
            });
            const fulfilledRes = res.data.reservation;
            setSuccessData({
                ...fulfilledRes,
                si_no: ffSiNo.trim(),
                doc_type: 'C.R.',
                balance_payment: balanceDue <= 0 ? 0 : amountRec,
                payment_method: ffPaymentMethod,
                cheque_number: ffPaymentMethod === 'Cheque' ? ffChequeNumber.trim() : null
            });
            setShowFulfillModal(false);
            setShowSuccessModal(true);
            resetReservationsCache();
            invalidateCachePage('sales', 1);
            invalidateCachePage('history', 1);
            invalidateCachePage('daily-sales', 1);
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

    /* ── Reprint Collection Receipt (C.R.) ── */
    const handleReprintCR = (r) => {
        const target = r || successData || selected;
        if (!target) return;

        const totalAmt = Number(target.total || 0);
        const depAmt = Number(target.deposit || 0);
        const balAmt = Math.max(0, totalAmt - depAmt);

        printCollectionReceipt({
            receiptNo: target.si_no || target.order_no || '—',
            orderNo: target.order_no,
            date: target.date_get ? fmtDate(target.date_get) : fmtDate(target.updated_at || target.date || new Date()),
            customer: target.customer?.name || target.customer_name || 'Walk-in Customer',
            address: target.customer?.address || [target.customer_phone || target.customer?.phone, target.engine_plate_number].filter(Boolean).join(' · ') || '—',
            phone: target.customer?.phone || target.customer_phone,
            enginePlate: target.engine_plate_number,
            items: target.items || [],
            total: totalAmt,
            balancePaid: balAmt,
            deposit: depAmt,
            paymentMethod: target.payment_method || 'Cash',
            chequeNumber: target.cheque_number,
            servedBy: target.fulfilledBy?.name || target.fulfilled_by?.name || target.reservedBy?.name || userName || 'Staff',
        });
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
            invalidateCachePage('sales', 1);
            invalidateCachePage('history', 1);
            invalidateCachePage('daily-sales', 1);
            loadReservations();
        } catch (err) {
            console.error('Failed to cancel:', err);
        } finally {
            setCancelLoading(false);
        }
    };

    /* ──────────────────────────────────────────────── */
    /* CLIPBOARD EXPORT FOR EXCEL                       */
    /* ──────────────────────────────────────────────── */
    const [copiedCount, setCopiedCount] = useState(null);

    const handleCopyToClipboard = async (activeTab = 'deposit') => {
        try {
            const res = await api.get('/reservations?per_page=5000');
            const allData = res.data?.data || (Array.isArray(res.data) ? res.data : reservations);
            const result = await copyReservationsToClipboard(allData, activeTab);
            if (result.success) {
                setCopiedCount(result.count);
                showToast(`✓ Copied ${result.count} ${result.count === 1 ? 'row' : 'rows'} for Excel! Paste with Ctrl+V.`);
                setTimeout(() => setCopiedCount(null), 2500);
            } else {
                showToast(result.message, 'error');
            }
        } catch (e) {
            console.error('Failed to copy reservations:', e);
            const result = await copyReservationsToClipboard(reservations, activeTab);
            if (result.success) {
                setCopiedCount(result.count);
                showToast(`✓ Copied ${result.count} ${result.count === 1 ? 'row' : 'rows'} for Excel! Paste with Ctrl+V.`);
                setTimeout(() => setCopiedCount(null), 2500);
            } else {
                showToast(result.message, 'error');
            }
        }
    };

    /* ──────────────────────────────────────────────── */
    /* FULFILL modal balance due calculation             */
    /* ──────────────────────────────────────────────── */
    const ffBalanceDue = selected ? (Number(selected.total || 0) - Number(selected.deposit || 0)) : 0;
    const ffChange = Math.max(0, (parseFloat(ffAmountReceived) || 0) - ffBalanceDue);

    return {
        // Data & Session
        reservations, loading, userName, handleCopyToClipboard, copiedCount,
        
        // Formating
        fmt, fmtDate,

        // Filters & Pagination
        search, setSearch, handleSearchChange,
        statusFilter, setStatusFilter, handleStatusChange,
        dateFilter, setDateFilter, handleDateFilterChange,
        page, setPage, pagination,

        // Modal Controls
        showAddModal, setShowAddModal,
        showFulfillModal, setShowFulfillModal,
        showCancelModal, setShowCancelModal,
        showSuccessModal, setShowSuccessModal,
        showDetailsModal, setShowDetailsModal,

        // Selection
        selected, detailsReservation, openDetails, successData,

        // Add Modal State & Handlers
        custName, setCustName, custPhone, setCustPhone, custEmail, setCustEmail, enginePlateNumber, setEnginePlateNumber,
        pickupDate, setPickupDate, pickupTime, setPickupTime, notes, setNotes,
        paymentType, setPaymentType, paymentMethod, setPaymentMethod, custChequeNumber, setCustChequeNumber,
        cartItems, productSearch, suggestions, addError, addLoading,
        handleProductSearch, addToCart, addCustomItemToCart, removeFromCart, updateQty, updateCartItemPriceTier,
        resetAddForm, handleAddReservation, refreshProducts,
        subtotal, tax, total, depositAmt, balance,

        // Fulfill Modal State & Handlers
        ffSiNo, setFfSiNo,
        ffPaymentMethod, setFfPaymentMethod, ffChequeNumber, setFfChequeNumber, ffAmountReceived, setFfAmountReceived,
        ffDocType, setFfDocType, ffNotes, setFfNotes, ffError, ffLoading,
        openFulfill, handleFulfill, handleReprintCR, ffBalanceDue, ffChange,

        // Cancel Modal State & Handlers
        cancelReason, setCancelReason, cancelLoading, openCancel, handleCancel
    };
}
