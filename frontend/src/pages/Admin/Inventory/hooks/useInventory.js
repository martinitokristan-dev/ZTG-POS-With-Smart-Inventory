import { useState, useMemo, useEffect } from 'react';
import api from '../../../../shared/api';
import { useInventory as useGlobalInventory } from '../../../../contexts/InventoryContext';
import { useProducts as useGlobalProducts } from '../../../../contexts/ProductContext';
import { flattenToSellableSKUs } from '../../../../shared/utils/skuHelpers';
import echo from '../../../../lib/echo';

// Module-level cache — survives component unmount/remount on route changes
let _cachedInventoryProducts = [];
let _cachedInventoryPagination = null;

export function useInventory() {
    // Read from global contexts (zero-fetch page load/filtering)
    const { inventory: globalProducts } = useGlobalInventory();
    const { categories } = useGlobalProducts();

    // Local paginated state — seeded from module cache so revisits are instant
    const [paginatedProducts, setPaginatedProducts] = useState(_cachedInventoryProducts);
    // Only show spinner on very first load (cache empty)
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(null);

    // Filters state
    const [search, setSearch] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('today'); // 'today', 'this_week', 'this_month', 'this_year'

    // Modal state
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showViewModal, setShowViewModal] = useState(false);

    // 1. Fetch Paginated Data for the Table (includes dynamic sales_count)
    useEffect(() => {
        const loadPaginatedInventory = async () => {
            try {
                // Only show spinner on very first load (module cache is empty)
                if (_cachedInventoryProducts.length === 0) setLoading(true);
                const queryParams = [`paginate=1`, `page=${page}`];
                if (search) queryParams.push(`search=${encodeURIComponent(search)}`);
                if (categoryId) queryParams.push(`category_id=${categoryId}`);
                if (statusFilter && statusFilter !== 'All') queryParams.push(`status=${statusFilter}`);
                if (dateFilter) queryParams.push(`date_filter=${dateFilter}`);
                const res = await api.get(`/inventory?${queryParams.join('&')}`);
                const freshProducts = res.data.products?.data || [];
                const freshPagination = {
                    current_page: res.data.products?.current_page,
                    last_page: res.data.products?.last_page,
                    total: res.data.products?.total,
                    per_page: res.data.products?.per_page
                };
                // Update module cache for next visit
                _cachedInventoryProducts = freshProducts;
                _cachedInventoryPagination = freshPagination;
                setPaginatedProducts(freshProducts);
                setPagination(freshPagination);
            } catch (err) {
                console.error("Failed to fetch paginated inventory:", err);
            } finally {
                setLoading(false);
            }
        };

        // Debounce search slightly
        const timer = setTimeout(() => {
            loadPaginatedInventory();
        }, 300);

        return () => clearTimeout(timer);
    }, [search, categoryId, statusFilter, dateFilter, page]);

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [search, categoryId, statusFilter, dateFilter]);

    // Listen for real-time inventory updates on active page dataset
    useEffect(() => {
        const token = (sessionStorage.getItem('auth_token') ?? localStorage.getItem('auth_token'));
        const userStr = (sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'));
        let productChannel = null;
        let inventoryChannel = null;

        if (token && userStr) {
            const user = JSON.parse(userStr);
            if (['Admin', 'Supervisor', 'Cashier', 'Checker'].includes(user.role)) {
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
                        setPaginatedProducts(prev => updateProductRecursively(prev));
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
                        setPaginatedProducts(prev => updateProductRecursively(prev));
                    });
            }
        }

        return () => {
            if (productChannel) {
                productChannel.stopListening('.ProductUpdated');
            }
            if (inventoryChannel) {
                inventoryChannel.stopListening('.InventoryUpdated');
            }
        };
    }, []);

    // 2. Client-side filtering of globalProducts for STATS only
    // This allows the top dashboard cards to instantly reflect the total filtered amounts
    // across the entire catalog without needing heavy backend aggregation.
    const filteredProductsForStats = useMemo(() => {
        let list = globalProducts || [];

        if (categoryId) {
            list = list.filter(p => p.category_id === parseInt(categoryId, 10));
        }

        if (statusFilter && statusFilter !== 'All') {
            if (statusFilter === 'Dead Stock') {
                list = list.filter(p => p.is_dead_stock);
            } else {
                list = list.filter(p => p.status?.toLowerCase() === statusFilter.toLowerCase());
            }
        }

        if (search.trim() !== '') {
            const q = search.toLowerCase();
            list = list.filter(p =>
                (p.name || '').toLowerCase().includes(q) ||
                (p.part_no || p.partNo || '').toLowerCase().includes(q) ||
                (p.chinese_name || '').toLowerCase().includes(q)
            );
        }

        return list;
    }, [globalProducts, search, categoryId, statusFilter]);

    // View Product details
    const handleViewProduct = async (product) => {
        try {
            // Find locally first to populate immediately
            const local = paginatedProducts.find(p => p.id === product.id) || globalProducts.find(p => p.id === product.id);
            if (local) setSelectedProduct(local);

            // Fetch detail from backend to get fresh database state (now includes sales_count!)
            const res = await api.get(`/products/${product.id}`);
            setSelectedProduct(res.data);
            setShowViewModal(true);
        } catch (err) {
            console.error('Failed to fetch product details:', err);
        }
    };

    const filteredSKUs = useMemo(() => {
        return flattenToSellableSKUs(filteredProductsForStats, statusFilter);
    }, [filteredProductsForStats, statusFilter]);

    const totalItems = filteredSKUs.length;
    const categoriesCount = new Set(filteredSKUs.map(p => p.category_id)).size;
    const outOfStockCount = filteredSKUs.filter(p => p.stock === 0).length;
    const lowStockCount = filteredSKUs.filter(p => p.stock > 0 && p.stock <= (p.alert_limit || 5)).length;

    return {
        products: paginatedProducts,
        pagination,
        page, setPage,
        categories,
        loading,
        search, setSearch,
        categoryId, setCategoryId,
        statusFilter, setStatusFilter,
        selectedProduct, setSelectedProduct,
        showViewModal, setShowViewModal,
        handleViewProduct,
        totalItems,
        categoriesCount,
        outOfStockCount,
        lowStockCount,
        dateFilter, setDateFilter
    };
}
