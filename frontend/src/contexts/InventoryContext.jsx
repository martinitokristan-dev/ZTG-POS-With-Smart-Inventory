import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../shared/api';
import echo from '../lib/echo';
import { INVENTORY_POLL_INTERVAL_MS, REALTIME_DEBOUNCE_POLL_MS, INVENTORY_FRESH_MS } from '../config/constants';

const InventoryContext = createContext();

export const useInventory = () => useContext(InventoryContext);

export const InventoryProvider = ({ children }) => {
    const [inventoryData, setInventoryData] = useState({ summary: {}, products: [] });
    
    // Tracks { [id]: { time: number, action: 'update', newStock: number } }
    const optimisticTimestamps = useRef({});
    const pollTimer = useRef(null);
    const inFlight = useRef(null);       // The request currently running, shared by all callers
    const rerunAfter = useRef(false);    // A forced refresh arrived while a request was running
    const lastFetchedAt = useRef(0);     // When the last successful load finished

    const loadInventory = useCallback(async () => {
        const token = (sessionStorage.getItem('auth_token') ?? localStorage.getItem('auth_token'));
        const userStr = (sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'));
        if (!token || !userStr) return;

        try {
            const user = JSON.parse(userStr);
            if (user.role !== 'Admin') {
                return; // Silence 403/Forbidden console error for non-admins
            }
            
            const fetchStart = Date.now();
            // view=stock: only the fields this app-wide list needs (counts and stock alerts).
            const res = await api.get('/inventory', { params: { view: 'stock' } });
            const data = res.data || { summary: {}, products: [] };
            lastFetchedAt.current = Date.now();
            
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

    /** Start a load, or join the one already running so the same data is never downloaded twice at once. */
    const runLoad = useCallback(() => {
        if (!inFlight.current) {
            inFlight.current = loadInventory().finally(() => {
                inFlight.current = null;
                if (rerunAfter.current) {
                    // Data may have changed after the running request started (e.g. a sale just completed).
                    rerunAfter.current = false;
                    runLoad();
                }
            });
        }
        return inFlight.current;
    }, [loadInventory]);

    /**
     * Forced refresh (used after sales, imports and polls).
     * If a load is already running, a fresh load is queued to start right after it, so the
     * data always ends up newer than this call. The returned promise settles when the load
     * that is running now finishes; the queued reload follows on its own.
     */
    const fetchInventory = useCallback(() => {
        if (inFlight.current) {
            rerunAfter.current = true;
            return inFlight.current;
        }
        return runLoad();
    }, [runLoad]);

    /** Refresh only when the data is older than maxAgeMs; otherwise reuse it (or join a running load). */
    const refreshIfStale = useCallback((maxAgeMs = INVENTORY_FRESH_MS) => {
        if (inFlight.current) return inFlight.current;
        if (Date.now() - lastFetchedAt.current < maxAgeMs) return Promise.resolve();
        return runLoad();
    }, [runLoad]);

    const schedulePoll = useCallback((delay = INVENTORY_POLL_INTERVAL_MS) => { // 5 minutes fallback
        if (pollTimer.current) clearTimeout(pollTimer.current);
        pollTimer.current = setTimeout(() => {
            fetchInventory().finally(() => schedulePoll());
        }, delay);
    }, [fetchInventory]);

    useEffect(() => {
        // refreshIfStale: a remount (e.g. React StrictMode in dev) joins the first load instead of repeating it.
        refreshIfStale().finally(() => schedulePoll(INVENTORY_POLL_INTERVAL_MS));

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
    }, [refreshIfStale, schedulePoll]);

    const debouncePoll = () => {
        schedulePoll(REALTIME_DEBOUNCE_POLL_MS);
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
            refetch: fetchInventory,
            refreshIfStale
        }}>
            {children}
        </InventoryContext.Provider>
    );
};
