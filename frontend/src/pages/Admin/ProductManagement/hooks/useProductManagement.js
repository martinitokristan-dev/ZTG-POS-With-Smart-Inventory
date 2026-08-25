import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../shared/api';
import { useProducts } from '../../../../contexts/ProductContext';
import { resetDashboardCache } from '../../../../shared/hooks/useDashboardCache';
import { resetReportsCache } from '../../../../shared/hooks/useReportsCache';
import echo from '../../../../lib/echo';

// Module-level cache — survives component unmount/remount on route changes
let _cachedProductList = [];
let _cachedProductPagination = null;

const DEFAULT_PLACEHOLDER_IMAGE = "/ztg-icon.png";

const DEFAULT_FORM = {
    name: '',
    chinese_name: '',
    part_no: '',
    category_id: '',
    address: '',
    aisle: '',
    carrier: '',
    hang: '',
    stock: 0,
    alert_limit: 5,
    price1: 0,
    price2: 0,
    image: '',
    notes: '',
    status: 'Active',
    is_dead_stock: false,
    damaged: 0
};

export default function useProductManagement() {
    // ── User session ────────────────────────────────────────────
    const userStr = (sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'));
    const user = userStr ? JSON.parse(userStr) : null;
    const currentUserName = user ? user.full_name || user.name : 'Administrator';

    // ── Data ────────────────────────────────────────────────────
    const { products: globalProducts, optimisticUpdateProduct, optimisticDeleteProduct, refetch: refetchProducts } = useProducts();
    // Seed from module cache so revisits are instant (no loading flash)
    const [products, setProducts] = useState(_cachedProductList);
    const [categories, setCategories] = useState([]);
    const [variantOptions, setVariantOptions] = useState([]);
    // Only show loading spinner on first visit (when module cache is empty)
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ── View mode: 'list' | 'restock' ──────────────────────────
    const [viewMode, setViewState] = useState('list');

    // ── List filters ────────────────────────────────────────────
    const [search, setSearch] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [sortOption, setSortOption] = useState('name_asc');

    // ── Pagination state ─────────────────────────────────────────
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(null);

    // ── Restock filters ─────────────────────────────────────────
    const [restockSearch, setRestockSearch] = useState('');
    const [restockCategory, setRestockCategory] = useState('');
    const [restockStockLevel, setRestockStockLevel] = useState('All');
    const [restockQuantities, setRestockQuantities] = useState({});
    const [restockDate, setRestockDate] = useState('');
    const [restockTime, setRestockTime] = useState('');
    const [restockVerifiedBy, setRestockVerifiedBy] = useState(currentUserName);

    // ── Modal visibility ─────────────────────────────────────────
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDamageModal, setShowDamageModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showReviewRestockModal, setShowReviewRestockModal] = useState(false);
    const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState(false);

    // ── Form state ───────────────────────────────────────────────
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [formData, setFormData] = useState({ ...DEFAULT_FORM });
    const [damageQty, setDamageQty] = useState(1);
    const [damageReason, setDamageReason] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // ── API Calls ────────────────────────────────────────────────
    const loadProducts = async () => {
        try {
            // Only show spinner when module cache is empty (very first load ever)
            if (_cachedProductList.length === 0) setLoading(true);
            const queryParams = [];
            if (viewMode === 'list') {
                if (search) queryParams.push(`search=${encodeURIComponent(search)}`);
                if (categoryId) queryParams.push(`category_id=${categoryId}`);
                if (statusFilter !== 'All') queryParams.push(`status=${statusFilter}`);
            } else {
                if (restockSearch) queryParams.push(`search=${encodeURIComponent(restockSearch)}`);
                if (restockCategory) queryParams.push(`category_id=${restockCategory}`);
            }
            queryParams.push(`paginate=1`);
            queryParams.push(`per_page=20`);
            queryParams.push(`page=${page}`);
            const queryString = `?${queryParams.join('&')}`;
            const res = await api.get(`/products${queryString}`);
            const productsList = res.data.data || [];
            const freshPagination = {
                current_page: res.data.current_page || 1,
                last_page: res.data.last_page || 1,
                total: res.data.total || productsList.length,
                per_page: res.data.per_page || 20,
                onPageChange: (newPage) => setPage(newPage)
            };
            // Update module cache for next visit
            if (viewMode === 'list' && !search && !categoryId && statusFilter === 'All') {
                _cachedProductList = productsList;
                _cachedProductPagination = freshPagination;
            }
            setProducts(productsList);
            setPagination(freshPagination);

            if (viewMode === 'restock') {
                setRestockQuantities(prev => {
                    const next = { ...prev };
                    productsList.forEach(p => { if (next[p.id] === undefined) next[p.id] = 0; });
                    return next;
                });
            }
        } catch (e) {
            console.error('Failed to load products:', e);
        } finally {
            setLoading(false);
        }
    };

    const loadVariantOptions = async () => {
        try {
            const res = await api.get('/variants');
            setVariantOptions(res.data || []);
        } catch (e) {
            console.error('Failed to load variants:', e);
        }
    };

    const loadCategories = async () => {
        try {
            const res = await api.get('/categories');
            const data = res.data || [];
            setCategories(data);
            if (data.length > 0) {
                setFormData(prev => ({ ...prev, category_id: prev.category_id || data[0].id }));
            }
        } catch (e) {
            console.error('Failed to load categories:', e);
        }
    };

    useEffect(() => { loadCategories(); loadVariantOptions(); }, []);
    useEffect(() => {
        setPage(1);
    }, [search, categoryId, statusFilter, viewMode, restockSearch, restockCategory]);

    useEffect(() => {
        loadCategories();
    }, []);

    useEffect(() => {
        loadProducts();
    }, [search, categoryId, statusFilter, viewMode, restockSearch, restockCategory, page]);

    useEffect(() => {
        const token = (sessionStorage.getItem('auth_token') ?? localStorage.getItem('auth_token'));
        const userStr = (sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'));
        let productChannel = null;
        let inventoryChannel = null;

        if (token && userStr) {
            const user = JSON.parse(userStr);
            if (['Admin', 'Supervisor'].includes(user.role)) {
                 productChannel = echo.private('products')
                    .listen('.ProductUpdated', (e) => {
                        const updateProductRecursively = (products) => {
                            return products.map(p => {
                                if (p.id === e.productId) {
                                    return { ...p, ...e.changedFields };
                                }
                                if (p.variants && p.variants.length > 0) {
                                    return { ...p, variants: updateProductRecursively(p.variants) };
                                }
                                return p;
                            });
                        };
                        setProducts(prev => updateProductRecursively(prev));
                    });

                 inventoryChannel = echo.private('inventory')
                    .listen('.InventoryUpdated', (e) => {
                        const updateProductRecursively = (products) => {
                            return products.map(p => {
                                if (p.id === e.productId) {
                                    return { ...p, stock: e.newQuantity, sales_count: e.salesCount };
                                }
                                if (p.variants && p.variants.length > 0) {
                                    return { ...p, variants: updateProductRecursively(p.variants) };
                                }
                                return p;
                            });
                        };
                        setProducts(prev => updateProductRecursively(prev));
                    });
            }
        }

        return () => {
            // stopListening removes only this hook's callbacks — do NOT call
            // echo.leaveChannel() here, which would destroy the global
            // ProductContext and InventoryContext Pusher subscriptions.
            if (productChannel) {
                productChannel.stopListening('.ProductUpdated');
            }
            if (inventoryChannel) {
                inventoryChannel.stopListening('.InventoryUpdated');
            }
        };
    }, []);

    // ── Helpers ──────────────────────────────────────────────────
    const getFormattedDateTime = () => {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
        let hours = now.getHours();
        const ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12 || 12;
        const timeStr = `${pad(hours)}:${pad(now.getMinutes())} ${ampm}`;
        return { dateStr, timeStr };
    };

    const resetForm = () => {
        setFormData({ ...DEFAULT_FORM, category_id: categories.length > 0 ? categories[0].id : '' });
        setDamageQty(1);
        setDamageReason('');
        setErrorMessage('');
        setSuccessMessage('');
    };

    // ── View switching ───────────────────────────────────────────
    const switchToRestock = () => {
        const { dateStr, timeStr } = getFormattedDateTime();
        setRestockDate(dateStr);
        setRestockTime(timeStr);
        setRestockVerifiedBy(currentUserName);

        const draftStr = localStorage.getItem('ztg_restock_draft');
        let draftObj = {};
        try { if (draftStr) draftObj = JSON.parse(draftStr); } catch (e) { }

        const q = {};
        products.forEach(p => { q[p.id] = draftObj[p.id] !== undefined ? draftObj[p.id] : 0; });
        setRestockQuantities(q);
        setRestockSearch('');
        setRestockCategory('');
        setRestockStockLevel('All');
        setViewState('restock');
    };

    const switchToProductsList = () => {
        setSearch(''); setCategoryId(''); setStatusFilter('');
        setViewState('list');
        resetForm();
    };

    // ── Restock actions ──────────────────────────────────────────
    const getRestockTotals = () => {
        let itemsCount = 0, unitsCount = 0;
        Object.entries(restockQuantities).forEach(([, qty]) => {
            if (qty > 0) { itemsCount++; unitsCount += qty; }
        });
        return { itemsCount, unitsCount };
    };

    const navigate = useNavigate();
    const [pendingNavigation, setPendingNavigation] = useState(null);

    const { itemsCount: restockItemsCount, unitsCount: restockUnitsCount } = getRestockTotals();

    // Flag global window state for restock pending changes
    useEffect(() => {
        if (viewMode === 'restock' && restockUnitsCount > 0) {
            window.__ztg_restock_pending = true;
        } else {
            window.__ztg_restock_pending = false;
        }
        return () => {
            window.__ztg_restock_pending = false;
        };
    }, [viewMode, restockUnitsCount]);

    // Intercept navigation attempts across sidebar / modules
    useEffect(() => {
        const handleAttemptLeave = (e) => {
            if (viewMode === 'restock' && restockUnitsCount > 0) {
                setPendingNavigation(e.detail || null);
                setShowLeaveConfirmModal(true);
            }
        };
        window.addEventListener('ztg:attempt-leave-restock', handleAttemptLeave);
        return () => window.removeEventListener('ztg:attempt-leave-restock', handleAttemptLeave);
    }, [viewMode, restockUnitsCount]);

    // Intercept browser tab close / refresh
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (viewMode === 'restock' && restockUnitsCount > 0) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [viewMode, restockUnitsCount]);

    const updateRestockQty = (productId, val) => {
        const value = val === '' ? '' : Math.max(0, val || 0);
        setRestockQuantities(prev => {
            const next = { ...prev, [productId]: value };
            localStorage.setItem('ztg_restock_draft', JSON.stringify(next));
            return next;
        });
    };

    const handleClearAllRestock = () => {
        setRestockQuantities(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(k => { next[k] = 0; });
            localStorage.removeItem('ztg_restock_draft');
            return next;
        });
    };

    const handleExitRestockAttempt = () => {
        if (restockUnitsCount > 0) {
            setPendingNavigation(null);
            setShowLeaveConfirmModal(true);
        } else {
            switchToProductsList();
        }
    };

    const handleSaveDraftAndExit = () => {
        localStorage.setItem('ztg_restock_draft', JSON.stringify(restockQuantities));
        window.__ztg_restock_pending = false;
        setShowLeaveConfirmModal(false);

        if (pendingNavigation) {
            const nav = pendingNavigation;
            setPendingNavigation(null);
            if (nav.isLogout) {
                localStorage.clear();
                navigate('/login');
            } else if (nav.targetPath) {
                navigate(nav.targetPath);
            } else {
                switchToProductsList();
            }
        } else {
            switchToProductsList();
        }
    };

    const handleDiscardDraftAndExit = () => {
        localStorage.removeItem('ztg_restock_draft');
        setRestockQuantities({});
        window.__ztg_restock_pending = false;
        setShowLeaveConfirmModal(false);

        if (pendingNavigation) {
            const nav = pendingNavigation;
            setPendingNavigation(null);
            if (nav.isLogout) {
                localStorage.clear();
                navigate('/login');
            } else if (nav.targetPath) {
                navigate(nav.targetPath);
            } else {
                switchToProductsList();
            }
        } else {
            switchToProductsList();
        }
    };

    const handleConfirmRestock = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            setErrorMessage('');
            const payload = Object.entries(restockQuantities)
                .filter(([, qty]) => qty > 0)
                .map(([id, qty]) => ({ product_id: parseInt(id), qty }));
            if (payload.length === 0) return;
            
            // Optimistic update
            const rollbacks = [];
            payload.forEach(item => {
                const prod = products.find(p => p.id === item.product_id);
                if (prod) {
                    const { commit, rollback } = optimisticUpdateProduct(prod.id, { stock: prod.stock + item.qty });
                    rollbacks.push(rollback);
                }
            });

            await api.post('/products/restock', { restocks: payload });
            
            resetDashboardCache();
            resetReportsCache();
            localStorage.removeItem('ztg_restock_draft');
            setSuccessMessage(`Restocked ${restockUnitsCount} units across ${restockItemsCount} items successfully!`);
            setShowReviewRestockModal(false);
            switchToProductsList();
            refetchProducts(); // Silent background refetch
        } catch (error) {
            // Rollback all
            rollbacks.forEach(r => r());
            setErrorMessage(error.response?.data?.message || 'Error occurred while saving restock order.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const extractValidationErrorMessage = (error, defaultMsg) => {
        if (error.response?.data?.errors) {
            const errorList = Object.values(error.response.data.errors).flat();
            if (errorList.length > 0) return errorList.join(' ');
        }
        return error.response?.data?.message || defaultMsg;
    };

    // ── Product CRUD ─────────────────────────────────────────────
    const handleAddProduct = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        if (!formData.image || !formData.image.trim()) {
            setErrorMessage('Product image is required. Please upload a photo for the product.');
            return;
        }
        setIsSubmitting(true);
        try {
            setErrorMessage('');
            const res = await api.post('/products', formData);
            const newProd = res.data?.product || formData;
            optimisticUpdateProduct(newProd.id || Date.now(), newProd).commit();
            setSuccessMessage('Product added successfully!');
            setShowAddModal(false);
            resetForm();
            loadProducts(); // We still load to refresh search if needed, but the context is updated
        } catch (error) {
            setErrorMessage(extractValidationErrorMessage(error, 'Error occurred while saving product.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditProduct = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        if (!formData.image || !formData.image.trim()) {
            setErrorMessage('Product image is required. Please upload a photo for the product.');
            return;
        }
        setIsSubmitting(true);
        const { commit, rollback } = optimisticUpdateProduct(selectedProduct.id, formData);
        try {
            setErrorMessage('');
            await api.put(`/products/${selectedProduct.id}`, formData);
            commit();
            setSuccessMessage('Product updated successfully!');
            setShowEditModal(false);
            resetForm();
            loadProducts();
        } catch (error) {
            rollback();
            setErrorMessage(extractValidationErrorMessage(error, 'Error occurred while updating product.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDamageSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        const newStock = Math.max(0, selectedProduct.stock - parseInt(damageQty));
        const { commit, rollback } = optimisticUpdateProduct(selectedProduct.id, { stock: newStock });
        try {
            setErrorMessage('');
            await api.post(`/products/${selectedProduct.id}/damaged`, { qty: parseInt(damageQty), reason: damageReason });
            commit();
            setSuccessMessage('Damaged stock logged successfully!');
            setShowDamageModal(false);
            resetForm();
            loadProducts();
        } catch (error) {
            rollback();
            setErrorMessage(error.response?.data?.message || 'Error logging damaged stock.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteProduct = async (product) => {
        if (!window.confirm(`Are you sure you want to delete ${product.name}?`)) return;
        const { commit, rollback } = optimisticDeleteProduct(product.id);
        try {
            await api.delete(`/products/${product.id}`);
            commit();
            setSuccessMessage('Product deleted successfully!');
            loadProducts();
        } catch (error) {
            rollback();
            alert(error.response?.data?.message || 'Error deleting product.');
        }
    };

    const handleToggleStatus = async (product) => {
        const newStatus = product.status === 'Disabled' ? 'Active' : 'Disabled';
        const opt = optimisticUpdateProduct(product.id, {
            status: newStatus,
            variants: product.variants?.map(v => ({ ...v, status: newStatus }))
        });

        // Also optimistically update local products state in ProductManagement table
        setProducts(prev => prev.map(p => {
            if (p.id === product.id) {
                return {
                    ...p,
                    status: newStatus,
                    variants: p.variants?.map(v => ({ ...v, status: newStatus }))
                };
            }
            return p;
        }));

        try {
            const payload = {
                name: product.name,
                chinese_name: product.chinese_name,
                part_no: product.part_no,
                category_id: product.category_id,
                address: product.address,
                stock: product.stock,
                alert_limit: product.alert_limit || 5,
                price1: product.price1,
                price2: product.price2,
                image: product.image,
                notes: product.notes,
                is_dead_stock: product.is_dead_stock,
                damaged: product.damaged,
                status: newStatus
            };
            await api.put(`/products/${product.id}`, payload);
            opt.commit();
            setSuccessMessage(`Product ${newStatus === 'Active' ? 'enabled' : 'disabled'} successfully!`);
            loadProducts();
        } catch (error) {
            opt.rollback();
            loadProducts();
            alert(error.response?.data?.message || 'Error toggling product status.');
        }
    };

    // ── Form helpers ─────────────────────────────────────────────
    const handleAddressChange = (field, value) => {
        setFormData(prev => {
            const next = { ...prev, [field]: value };
            const parts = [next.aisle?.trim(), next.carrier?.trim(), next.hang?.trim()].filter(Boolean);
            next.address = parts.join('-');
            return next;
        });
    };

    const [uploadingImage, setUploadingImage] = useState(false);
    const [imageProgress, setImageProgress] = useState(0);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('image', file);
        if (formData.image) {
            fd.append('old_image', formData.image);
        }
        try {
            setErrorMessage('');
            setUploadingImage(true);
            setImageProgress(0);
            const res = await api.post('/products/upload-image', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total && progressEvent.total > 0) {
                        const percent = Math.min(100, Math.max(0, Math.round((progressEvent.loaded * 100) / progressEvent.total)));
                        setImageProgress(percent);
                    }
                }
            });
            setFormData(prev => ({ ...prev, image: res.data.url }));
        } catch (err) {
            setErrorMessage(err.response?.data?.message || 'Failed to upload image file.');
        } finally {
            setUploadingImage(false);
            setImageProgress(0);
        }
    };

    const openEdit = (product) => {
        let targetProduct = product;
        if (product.parent_product_id) {
            const parent = products.find(p => p.id === product.parent_product_id);
            if (parent) {
                targetProduct = parent;
            }
        }
        setSelectedProduct(targetProduct);
        const parts = (targetProduct.address || '').split('-');
        setFormData({
            name: targetProduct.name, chinese_name: targetProduct.chinese_name || '',
            part_no: targetProduct.part_no, category_id: targetProduct.category_id,
            address: targetProduct.address || '',
            aisle: parts[0] || '', carrier: parts[1] || '', hang: parts[2] || '',
            stock: targetProduct.stock, alert_limit: targetProduct.alert_limit || 5,
            price1: targetProduct.price1, price2: targetProduct.price2,
            image: targetProduct.image || '', notes: targetProduct.notes || '',
            variants: targetProduct.variants ? targetProduct.variants.map(v => ({...v, option_ids: v.variant_options ? v.variant_options.map(o => o.id) : []})) : [],
            status: targetProduct.status || 'Active',
            is_dead_stock: !!targetProduct.is_dead_stock, damaged: targetProduct.damaged || 0
        });
        setShowEditModal(true);
    };

    const openDamage = (product) => { setSelectedProduct(product); setDamageQty(1); setDamageReason(''); setShowDamageModal(true); };
    const openView = (product) => { setSelectedProduct(product); setShowViewModal(true); };

    // ── Sorting / filtering ──────────────────────────────────────
    const getSortedProducts = () => {
        if (!products || products.length === 0) return [];
        const items = [...products];
        switch (sortOption) {
            case 'Name: A-Z': return items.sort((a, b) => a.name.localeCompare(b.name));
            case 'Name: Z-A': return items.sort((a, b) => b.name.localeCompare(a.name));
            case 'Price: Low to High': return items.sort((a, b) => a.price2 - b.price2);
            case 'Price: High to Low': return items.sort((a, b) => b.price2 - a.price2);
            case 'Stock: Low to High': return items.sort((a, b) => a.stock - b.stock);
            case 'Stock: High to Low': return items.sort((a, b) => b.stock - a.stock);
            default: return items;
        }
    };

    const getFilteredRestockProducts = () => {
        if (!products) return [];
        let list = [...products];
        if (restockStockLevel === 'Low Stock') list = list.filter(p => p.stock > 0 && p.stock <= (p.alert_limit || 5));
        else if (restockStockLevel === 'No Stock') list = list.filter(p => p.stock === 0);
        return list;
    };

    return {
        // Data
        products, categories, variantOptions, loading, isSubmitting,
        DEFAULT_PLACEHOLDER_IMAGE,
        // Derived
        sortedProducts: getSortedProducts(),
        restockProducts: getFilteredRestockProducts(),
        restockItemsCount, restockUnitsCount,
        // View mode
        viewMode, switchToRestock, switchToProductsList,
        categories,
        page, setPage,
        pagination,
        // List filters
        search, setSearch, categoryId, setCategoryId,
        statusFilter, setStatusFilter, sortOption, setSortOption,
        // Restock filters & state
        restockSearch, setRestockSearch, restockCategory, setRestockCategory,
        restockStockLevel, setRestockStockLevel,
        restockQuantities, updateRestockQty, handleClearAllRestock,
        restockDate, setRestockDate, restockTime, setRestockTime, restockVerifiedBy,
        // Restock actions
        handleExitRestockAttempt, handleSaveDraftAndExit, handleDiscardDraftAndExit, handleConfirmRestock,
        // Modals
        showAddModal, setShowAddModal,
        showEditModal, setShowEditModal,
        showDamageModal, setShowDamageModal,
        showViewModal, setShowViewModal,
        showReviewRestockModal, setShowReviewRestockModal,
        showLeaveConfirmModal, setShowLeaveConfirmModal,
        // Form
        selectedProduct, setSelectedProduct,
        formData, setFormData,
        damageQty, setDamageQty,
        damageReason, setDamageReason,
        errorMessage, setErrorMessage,
        successMessage, setSuccessMessage,
        resetForm,
        // Handlers
        handleAddProduct, handleEditProduct, handleDamageSubmit, handleDeleteProduct, handleToggleStatus,
        handleAddressChange, handleImageUpload, uploadingImage, imageProgress,
        openEdit, openDamage, openView,
    };
}



