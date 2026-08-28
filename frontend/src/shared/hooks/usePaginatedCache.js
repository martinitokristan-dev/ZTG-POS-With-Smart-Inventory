import { useState, useEffect } from 'react';
import api from '../api';
import { PAGINATED_CACHE_MAX_PAGES } from '../../config/constants';

// Import so clearEntireCache can wipe the customer cache on logout too
import { resetCustomerCache } from './useCustomerCache';
import { resetDashboardCache } from './useDashboardCache';
import { resetReservationsCache } from './useReservationsCache';
import { resetSettingsCache } from './useSettingsCache';
import { resetReportsCache } from './useReportsCache';

const MAX_PAGES = 10;
const TTL_MS = 5 * 60 * 1000;

const caches = {
    sales: { pages: {}, lru: [], lastParams: '' },
    history: { pages: {}, lru: [], lastParams: '' },
    'daily-sales': { pages: {}, lru: [], lastParams: '' }
};

export const invalidateCachePage = (storeName, pageNumber) => {
    if (caches[storeName] && caches[storeName].pages[pageNumber]) {
        delete caches[storeName].pages[pageNumber];
        caches[storeName].lru = caches[storeName].lru.filter(p => p !== pageNumber);
    }
};

export const clearEntireCache = () => {
    Object.keys(caches).forEach(k => {
        caches[k] = { pages: {}, lru: [], lastParams: '' };
    });
    resetCustomerCache();
    resetDashboardCache();
    resetReservationsCache();
    resetSettingsCache();
    resetReportsCache();
};

export default function usePaginatedCache(storeName, endpoint, params) {
    const [page, setPage] = useState(1);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [refreshKey, setRefreshKey] = useState(0);

    const paramsStr = JSON.stringify(params);

    const refetch = () => {
        if (caches[storeName] && caches[storeName].pages[page]) {
            delete caches[storeName].pages[page];
            caches[storeName].lru = caches[storeName].lru.filter(p => p !== page);
        }
        setRefreshKey(prev => prev + 1);
    };

    useEffect(() => {
        if (!caches[storeName]) {
            caches[storeName] = { pages: {}, lru: [], lastParams: '' };
        }

        // Wipe cache if search/filter params change
        if (caches[storeName].lastParams !== paramsStr) {
            caches[storeName].pages = {};
            caches[storeName].lru = [];
            caches[storeName].lastParams = paramsStr;
            if (page !== 1) {
                setPage(1);
                return; 
            }
        }

        let isMounted = true;

        const fetchPage = async () => {
            const cached = caches[storeName].pages[page];
            const now = Date.now();
            
            if (cached) {
                if (isMounted) {
                    setData(cached.data);
                    setPagination(cached.pagination);
                }
                
                // Update LRU
                caches[storeName].lru = caches[storeName].lru.filter(p => p !== page);
                caches[storeName].lru.push(page);
                
                // Check TTL
                if (now - cached.ts < TTL_MS) {
                    if (isMounted) setLoading(false);
                    return;
                }
            } else {
                if (isMounted) setLoading(true);
            }

            try {
                const query = new URLSearchParams({ ...params, page });
                const res = await api.get(`${endpoint}?${query.toString()}`);
                
                // It can be a paginated response or just an array (fallback)
                let pageData = [];
                let pageInfo = { current_page: 1, last_page: 1, total: 0 };

                if (res.data && res.data.data) {
                    pageData = res.data.data;
                    let lastPage = res.data.last_page;
                    if (storeName === 'history' || storeName === 'daily-sales') {
                        lastPage = Math.min(lastPage, PAGINATED_CACHE_MAX_PAGES);
                    }
                    pageInfo = {
                        current_page: res.data.current_page,
                        last_page: lastPage,
                        total: res.data.total
                    };
                } else if (Array.isArray(res.data)) {
                    pageData = res.data;
                    pageInfo.total = pageData.length;
                }
                
                if (isMounted) {
                    setData(pageData);
                    setPagination(pageInfo);
                }

                caches[storeName].pages[page] = {
                    data: pageData,
                    pagination: pageInfo,
                    ts: now
                };
                
                caches[storeName].lru = caches[storeName].lru.filter(p => p !== page);
                caches[storeName].lru.push(page);

                if (caches[storeName].lru.length > MAX_PAGES) {
                    const oldestPage = caches[storeName].lru.shift();
                    delete caches[storeName].pages[oldestPage];
                }
            } catch (e) {
                console.error('Paginated fetch error:', e);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchPage();

        return () => { isMounted = false; };
    }, [page, paramsStr, storeName, endpoint, refreshKey]);

    return { data, loading, page, setPage, pagination, refetch };
}
