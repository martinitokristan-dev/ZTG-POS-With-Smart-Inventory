import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../shared/api';
import echo from '../lib/echo';

const InventoryContext = createContext();

export const useInventory = () => useContext(InventoryContext);

export const InventoryProvider = ({ children }) => {
    const [inventoryData, setInventoryData] = useState({ summary: {}, products: [] });
    
    // Tracks { [id]: { time: number, action: 'update', newStock: number } }
    const optimisticTimestamps = useRef({});
    const pollTimer = useRef(null);

    const fetchInventory = useCallback(async () => {
        const token = (sessionStorage.getItem('auth_token') ?? localStorage.getItem('auth_token'));
        const userStr = (sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'));
        if (!token || !userStr) return;

        try {
            const user = JSON.parse(userStr);
            if (user.role !== 'Admin') {
                return; // Silence 403/Forbidden console error for non-admins
            }
            
            const fetchStart = Date.now();
            const res = await api.get('/inventory');
            const data = res.data || { summary: {}, products: [] };
            
            setInventoryData(prev => {
                const newProductsMap = new Map(data.products.map(p => [p.id, p]));
                
                // Keep local optimistic stock state if it's newer
                (prev.products || []).forEach(existing => {
                    const opt = optimisticTimestamps.current[existing.id];
                    if (opt && opt.time > fetchStart) {
                        const newP = newProductsMap.get(existing.id);
                        if (newP) {
                            newProductsMap.set(existing.id, { ...newP, stock: opt.newStock });
                        } else {
                            newProductsMap.set(existing.id, { ...existing, stock: opt.newStock });
                        }
                    }
                });

                return {
                    summary: data.summary,
                    products: Array.from(newProductsMap.values())
                };
            });
        } catch (err) {
            console.error("Failed to load inventory:", err);
        }
    }, []);

    const schedulePoll = useCallback((delay = 300000) => { // 5 minutes fallback
        if (pollTimer.current) clearTimeout(pollTimer.current);
        pollTimer.current = setTimeout(() => {
            fetchInventory().finally(() => schedulePoll());
        }, delay);
    }, [fetchInventory]);

    useEffect(() => {
        fetchInventory().finally(() => schedulePoll(300000));

        const token = (sessionStorage.getItem('auth_token') ?? localStorage.getItem('auth_token'));
        const userStr = (sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'));
        let inventoryChannel = null;
        let productChannel = null;

        if (token && userStr) {
            const user = JSON.parse(userStr);
            if (['Admin', 'Supervisor', 'Cashier', 'Checker'].includes(user.role)) {
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
                        setInventoryData(prev => ({
                            ...prev,
                            products: updateProductRecursively(prev.products || [])
                        }));
                    });
            }

            if (['Admin', 'Supervisor', 'Cashier'].includes(user.role)) {
                productChannel = echo.private('products')
                    .listen('.ProductUpdated', (e) => {
                        console.log('[Echo Debug] InventoryContext ProductUpdated event received:', e);
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
                        setInventoryData(prev => ({
                            ...prev,
                            products: updateProductRecursively(prev.products || [])
                        }));
                    });
            }
        }

        return () => {
            if (pollTimer.current) clearTimeout(pollTimer.current);
            if (inventoryChannel) {
                echo.leaveChannel('private-inventory');
            }
            if (productChannel) {
                echo.leaveChannel('private-products');
            }
        };
    }, [fetchInventory, schedulePoll]);

    const debouncePoll = () => {
        schedulePoll(5000);
    };

    const optimisticUpdateStock = (id, newStock) => {
        const now = Date.now();
        optimisticTimestamps.current[id] = { time: now, action: 'update', newStock };
        
        let previousState = null;
        
        setInventoryData(prev => {
            const exists = prev.products.find(p => p.id === id);
            if (exists) {
                previousState = { ...exists };
                const newProducts = prev.products.map(p => p.id === id ? { ...p, stock: newStock } : p);
                return { ...prev, products: newProducts };
            }
            return prev;
        });
        
        return {
            commit: () => debouncePoll(),
            rollback: () => {
                if (previousState) {
                    setInventoryData(prev => ({
                        ...prev,
                        products: prev.products.map(p => p.id === id ? previousState : p)
                    }));
                }
                delete optimisticTimestamps.current[id];
            }
        };
    };

    return (
        <InventoryContext.Provider value={{ 
            inventory: inventoryData.products, 
            inventorySummary: inventoryData.summary,
            optimisticUpdateStock, 
            refetch: fetchInventory 
        }}>
            {children}
        </InventoryContext.Provider>
    );
};
