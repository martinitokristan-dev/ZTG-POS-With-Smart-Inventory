import { useState, useMemo, useEffect, useRef } from 'react';
import { POS_SEARCH_DEBOUNCE_MS, POS_TOP_CATEGORIES_LIMIT } from '../../../../config/constants';
import { useProducts } from '../../../../contexts/ProductContext';
import api from '../../../../shared/api';

export function usePOSProducts() {
    const { products: contextProducts, categories: backendCategories, searchPosProducts, initialLoading: contextLoading, refetch: refreshProducts } = useProducts();

    // Explicit loading state — NOT tied to products.length which caused infinite spinner
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [searchLoading, setSearchLoading] = useState(false);
    const [posProducts, setPosProducts] = useState([]);
    const searchTimerRef = useRef(null);
    const isInitialLoad = useRef(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');

    // If initial login context is empty, trigger product fetch immediately on mount
    useEffect(() => {
        const token = (sessionStorage.getItem('auth_token') ?? localStorage.getItem('auth_token'));
        if (token && contextProducts.length === 0 && !contextLoading && refreshProducts) {
            refreshProducts();
        }
    }, [contextProducts.length, contextLoading, refreshProducts]);

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
        }, POS_SEARCH_DEBOUNCE_MS);

        return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
    }, [searchQuery, categoryFilter, contextProducts, backendCategories, searchPosProducts]);

    // Flat products including variants from posProducts
    const flatProducts = useMemo(() => {
        const flat = [];
        posProducts.forEach(p => {
            // If the parent product is Disabled, hide the entire product family from POS
            if (p.status === 'Disabled') {
                return;
            }

            const hasVariants = p.variants && p.variants.length > 0;

            // Push base product if it has no variants or has sellable stock
            if (!hasVariants) {
                flat.push(p);
            } else if (p.stock > 0) {
                flat.push(p);
            }

            // Push active child variants (exclude any individually disabled variant)
            if (hasVariants) {
                p.variants.forEach(v => {
                    if (v.status === 'Disabled') return;
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
        if (categoryFilter === 'No Name / Part No' || categoryFilter === 'Photo Only') {
            list = list.filter(p => !p.name || !p.part_no || p.name.trim() === '' || p.part_no.trim() === '');
        } else if (categoryFilter !== 'All') {
            list = list.filter(p => p.category === categoryFilter || p.category?.name === categoryFilter);
        }
        return list;
    }, [flatProducts, categoryFilter]);

    // Top-selling category pills — fetched from API on POS boot (sorted by total units sold)
    const [topCategories, setTopCategories] = useState([]);
    useEffect(() => {
        const loadTopCategories = async () => {
            try {
                const res = await api.get(`/categories?top_selling=${POS_TOP_CATEGORIES_LIMIT}`);
                setTopCategories(res.data || []);
            } catch (err) {
                console.error('Failed to load top categories:', err);
                // Fallback: use backendCategories slice
                setTopCategories((backendCategories || []).slice(0, POS_TOP_CATEGORIES_LIMIT));
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
            return ['All', ...backendCategories.slice(0, POS_TOP_CATEGORIES_LIMIT).map(c => c.name).filter(Boolean)];
        }
        return ['All'];
    }, [topCategories, backendCategories]);

    return {
        products: filteredProducts,
        loadingProducts,
        searchLoading,
        categories,
        searchQuery,
        setSearchQuery,
        categoryFilter,
        setCategoryFilter,
    };
}
