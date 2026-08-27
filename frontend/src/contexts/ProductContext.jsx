import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../shared/api';
import echo from '../lib/echo';

const ProductContext = createContext();

export const useProducts = () => useContext(ProductContext);

export const ProductProvider = ({ children }) => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [initialLoading, setInitialLoading] = useState(true);
    
    // Tracks { [id]: { time: number, action: 'update' | 'delete' } }
    const optimisticTimestamps = useRef({});
    const categoryOptimisticTimestamps = useRef({});
    const pollTimer = useRef(null);

    const fetchData = useCallback(async () => {
        const token = (sessionStorage.getItem('auth_token') ?? localStorage.getItem('auth_token'));
        if (!token) {
            setInitialLoading(false);
            return;
        }

        setInitialLoading(true);
        const fetchStart = Date.now();
        try {
            const [prodRes, catRes] = await Promise.all([
                api.get('/products?limit=25'),
                api.get('/categories')
            ]);
            
            const fetchedProductsRaw = Array.isArray(prodRes.data) ? prodRes.data : (prodRes.data?.data || []);
            const fetchedProducts = fetchedProductsRaw.map(p => ({
                ...p,
                price: parseFloat(p.price1 || 0),
                retail_price: parseFloat(p.price1 || 0)
            }));
            const fetchedCategories = Array.isArray(catRes.data) ? catRes.data : (catRes.data?.data || []);

            setCategories(prev => {
                const newMap = new Map(fetchedCategories.map(c => [c.id, c]));
                
                prev.forEach(existing => {
                    const opt = categoryOptimisticTimestamps.current[existing.id];
                    if (opt && opt.time > fetchStart) {
                        if (opt.action === 'update') {
                            newMap.set(existing.id, existing);
                        }
                    }
                });

                Object.keys(categoryOptimisticTimestamps.current).forEach(id => {
                    const opt = categoryOptimisticTimestamps.current[id];
                    if (opt && opt.time > fetchStart && opt.action === 'delete') {
                        newMap.delete(parseInt(id, 10) || id);
                    }
                });

                return Array.from(newMap.values()).sort((a, b) => a.name.localeCompare(b.name));
            });

            setProducts(prev => {
                const newMap = new Map(fetchedProducts.map(p => [p.id, p]));
                
                // Keep local optimistic state if it's newer
                prev.forEach(existing => {
                    const opt = optimisticTimestamps.current[existing.id];
                    if (opt && opt.time > fetchStart) {
                        if (opt.action === 'update') {
                            newMap.set(existing.id, existing);
                        }
                    }
                });

                // Ensure optimistically deleted items are not resurrected
                Object.keys(optimisticTimestamps.current).forEach(id => {
                    const opt = optimisticTimestamps.current[id];
                    if (opt && opt.time > fetchStart && opt.action === 'delete') {
                        // id is string in Object.keys
                        newMap.delete(parseInt(id, 10) || id);
                    }
                });

                return Array.from(newMap.values());
            });
        } catch (err) {
            console.error("Failed to load products/categories:", err);
        } finally {
            setInitialLoading(false);
        }
    }, []);

    const schedulePoll = useCallback((delay = 300000) => { // 5 minutes fallback
        if (pollTimer.current) clearTimeout(pollTimer.current);
        pollTimer.current = setTimeout(() => {
            fetchData().finally(() => schedulePoll());
        }, delay);
    }, [fetchData]);

    useEffect(() => {
        const token = (sessionStorage.getItem('auth_token') ?? localStorage.getItem('auth_token'));
        if (token) {
            fetchData().finally(() => schedulePoll(300000));
        } else {
            setInitialLoading(false);
        }

        const handleAuthChange = () => {
            const currentToken = (sessionStorage.getItem('auth_token') ?? localStorage.getItem('auth_token'));
            if (currentToken) {
                fetchData();
            }
        };

        window.addEventListener('storage', handleAuthChange);
        window.addEventListener('auth-change', handleAuthChange);

        const userStr = (sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'));
        let productChannel = null;
        let inventoryChannel = null;

        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);
                if (['Admin', 'Supervisor', 'Cashier'].includes(user.role)) {
                    productChannel = echo.private('products')
                        .listen('.ProductUpdated', (e) => {
                            setProducts(prev => prev.map(p => {
                                if (p.id === e.productId) {
                                    const newStatus = e.changedFields.status ?? p.status;
                                    const newVariants = p.variants ? p.variants.map(v => ({
                                        ...v,
                                        status: newStatus === 'Disabled' ? 'Disabled' : (v.status === 'Disabled' ? 'Active' : v.status)
                                    })) : p.variants;
                                    return {
                                        ...p,
                                        ...e.changedFields,
                                        status: newStatus,
                                        variants: newVariants,
                                        price: parseFloat(e.changedFields.price1 ?? p.price1 ?? p.price),
                                        retail_price: parseFloat(e.changedFields.price1 ?? p.price1 ?? p.retail_price)
                                    };
                                }
                                return p;
                            }));
                        });

                    inventoryChannel = echo.private('inventory')
                        .listen('.InventoryUpdated', (e) => {
                            const updateProductRecursively = (productsList) => {
                                return productsList.map(p => {
                                    let updated = p;
                                    if (p.id === e.productId) {
                                        updated = { ...updated, stock: e.newQuantity };
                                    }
                                    if (p.variants && p.variants.length > 0) {
                                        updated = { ...updated, variants: updateProductRecursively(p.variants) };
                                    }
                                    return updated;
                                });
                            };
                            setProducts(prev => updateProductRecursively(prev));
                        });
                }
            } catch (err) {
                console.error("Failed to parse auth_user for Echo subscription:", err);
            }
        }

        return () => {
            window.removeEventListener('storage', handleAuthChange);
            window.removeEventListener('auth-change', handleAuthChange);
            if (pollTimer.current) clearTimeout(pollTimer.current);
            if (productChannel) {
                echo.leaveChannel('private-products');
            }
            if (inventoryChannel) {
                echo.leaveChannel('private-inventory');
            }
        };
    }, [fetchData, schedulePoll]);

    const debouncePoll = () => {
        schedulePoll(5000);
    };

    /**
     * Search products from server for POS instant search.
     * Returns flat product + variant list matching the query.
     */
    const searchPosProducts = useCallback(async (searchQuery, categoryId = null) => {
        const token = (sessionStorage.getItem('auth_token') ?? localStorage.getItem('auth_token'));
        if (!token) return [];
        try {
            const params = new URLSearchParams();
            if (searchQuery && searchQuery.trim()) params.set('search', searchQuery.trim());
            if (categoryId) params.set('category_id', categoryId);
            params.set('limit', '25');
            const res = await api.get(`/products?${params.toString()}`);
            const raw = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            return raw.map(p => ({
                ...p,
                price: parseFloat(p.price1 || 0),
                retail_price: parseFloat(p.price1 || 0)
            }));
        } catch (err) {
            console.error('POS product search failed:', err);
            return [];
        }
    }, []);

    const optimisticUpdateProduct = (id, newProductData) => {
        const now = Date.now();
        optimisticTimestamps.current[id] = { time: now, action: 'update' };
        
        let previousState = null;
        
        setProducts(prev => {
            const exists = prev.find(p => p.id === id);
            if (exists) {
                previousState = { ...exists };
                const merged = { ...exists, ...newProductData };
                if (newProductData.price1 !== undefined) {
                    merged.price = parseFloat(newProductData.price1 || 0);
                    merged.retail_price = parseFloat(newProductData.price1 || 0);
                }
                return prev.map(p => p.id === id ? merged : p);
            } else {
                const merged = { id, ...newProductData };
                merged.price = parseFloat(newProductData.price1 || 0);
                merged.retail_price = parseFloat(newProductData.price1 || 0);
                return [merged, ...prev]; // Push to front
            }
        });
        
        return {
            commit: () => debouncePoll(),
            rollback: () => {
                setProducts(prev => {
                    if (previousState) {
                        return prev.map(p => p.id === id ? previousState : p);
                    } else {
                        return prev.filter(p => p.id !== id);
                    }
                });
                delete optimisticTimestamps.current[id];
            }
        };
    };

    const optimisticDeleteProduct = (id) => {
        const now = Date.now();
        optimisticTimestamps.current[id] = { time: now, action: 'delete' };
        
        let previousState = null;
        
        setProducts(prev => {
            previousState = prev.find(p => p.id === id);
            return prev.filter(p => p.id !== id);
        });
        
        return {
            commit: () => debouncePoll(),
            rollback: () => {
                if (previousState) {
                    setProducts(prev => [...prev, previousState]);
                }
                delete optimisticTimestamps.current[id];
            }
        };
    };

    const optimisticUpdateCategory = (id, newCategoryData) => {
        const now = Date.now();
        categoryOptimisticTimestamps.current[id] = { time: now, action: 'update' };
        
        let previousState = null;
        
        setCategories(prev => {
            const exists = prev.find(c => c.id === id);
            let next;
            if (exists) {
                previousState = { ...exists };
                next = prev.map(c => c.id === id ? { ...c, ...newCategoryData } : c);
            } else {
                next = [{ id, ...newCategoryData }, ...prev];
            }
            return next.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        });
        
        return {
            commit: () => debouncePoll(),
            rollback: () => {
                setCategories(prev => {
                    if (previousState) {
                        return prev.map(c => c.id === id ? previousState : c);
                    } else {
                        return prev.filter(c => c.id !== id);
                    }
                });
                delete categoryOptimisticTimestamps.current[id];
            }
        };
    };

    const optimisticDeleteCategory = (id) => {
        const now = Date.now();
        categoryOptimisticTimestamps.current[id] = { time: now, action: 'delete' };
        
        let previousState = null;
        
        setCategories(prev => {
            previousState = prev.find(c => c.id === id);
            return prev.filter(c => c.id !== id);
        });
        
        return {
            commit: () => debouncePoll(),
            rollback: () => {
                if (previousState) {
                    setCategories(prev => [...prev, previousState]);
                }
                delete categoryOptimisticTimestamps.current[id];
            }
        };
    };

    return (
        <ProductContext.Provider value={{ 
            products, 
            categories, 
            initialLoading,
            optimisticUpdateProduct, 
            optimisticDeleteProduct, 
            optimisticUpdateCategory,
            optimisticDeleteCategory,
            refetch: fetchData,
            searchPosProducts
        }}>
            {children}
        </ProductContext.Provider>
    );
};
