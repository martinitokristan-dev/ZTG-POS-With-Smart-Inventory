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
        const token = localStorage.getItem('auth_token');
        if (!token) return;

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
        fetchData().finally(() => schedulePoll(300000));

        const token = localStorage.getItem('auth_token');
        const userStr = localStorage.getItem('auth_user');
        let productChannel = null;
        let inventoryChannel = null;

        if (token && userStr) {
            const user = JSON.parse(userStr);
            if (['Admin', 'Supervisor', 'Cashier'].includes(user.role)) {
                productChannel = echo.private('products')
                    .listen('.ProductUpdated', (e) => {
                        console.log('[Echo Debug] ProductUpdated event received:', e);
                        setProducts(prev => prev.map(p => {
                            if (p.id === e.productId) {
                                return {
                                    ...p,
                                    ...e.changedFields,
                                    price: parseFloat(e.changedFields.price1 ?? p.price1 ?? p.price),
                                    retail_price: parseFloat(e.changedFields.price1 ?? p.price1 ?? p.retail_price)
                                };
                            }
                            return p;
                        }));
                    });

                inventoryChannel = echo.private('inventory')
                    .listen('.InventoryUpdated', (e) => {
                        console.log('[Echo Debug] ProductContext InventoryUpdated event received:', e);
                        setProducts(prev => prev.map(p => {
                            if (p.id === e.productId) {
                                return {
                                    ...p,
                                    stock: e.newQuantity
                                };
                            }
                            return p;
                        }));
                    });
            }
        }

        return () => {
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
        const token = localStorage.getItem('auth_token');
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
            if (exists) {
                previousState = { ...exists };
                return prev.map(c => c.id === id ? { ...c, ...newCategoryData } : c);
            } else {
                return [{ id, ...newCategoryData }, ...prev];
            }
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
