import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api';
import { mapNotification } from '../../contexts/NotificationContext';
import { NOTIFICATION_PAGE_SIZE } from '../../config/constants';

export const NOTIF_CATEGORIES = [
    { value: 'all', label: 'All types' },
    { value: 'stock', label: 'Stock' },
    { value: 'dead_stock', label: 'Dead Stock' },
    { value: 'sales', label: 'Sales & P.O.' },
    { value: 'security', label: 'Security' },
    { value: 'other', label: 'Other' },
];

export const NOTIF_PERIODS = [
    { value: 'all', label: 'Any time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'Last 7 days' },
    { value: 'month', label: 'Last 30 days' },
];

const SEARCH_DEBOUNCE_MS = 350;

/**
 * Search and filters for the notification panel.
 *
 * With no filter set, the panel keeps showing the live list from NotificationContext.
 * As soon as a filter is set, results come from the server (GET /notifications with
 * search / category / unread / period), so older notifications that were never loaded
 * are found too. Answers that arrive after the filters changed again are dropped.
 */
export default function useNotificationSearch() {
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [category, setCategory] = useState('all');
    const [unreadOnly, setUnreadOnly] = useState(false);
    const [period, setPeriod] = useState('all');

    const [results, setResults] = useState([]);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState('');
    const nextBeforeId = useRef(null);
    const requestSeq = useRef(0);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(t);
    }, [search]);

    const isFiltering = debouncedSearch !== '' || category !== 'all' || unreadOnly || period !== 'all';

    const params = useCallback((beforeId) => {
        const p = { per_page: NOTIFICATION_PAGE_SIZE };
        if (beforeId) p.before_id = beforeId;
        if (debouncedSearch) p.search = debouncedSearch;
        if (category !== 'all') p.category = category;
        if (unreadOnly) p.unread = 1;
        if (period !== 'all') p.period = period;
        return p;
    }, [debouncedSearch, category, unreadOnly, period]);

    // First page whenever a filter changes.
    useEffect(() => {
        if (!isFiltering) {
            requestSeq.current += 1;
            setResults([]); setHasMore(false); setError(''); setLoading(false);
            return;
        }
        const seq = ++requestSeq.current;
        setLoading(true); setError('');
        api.get('/notifications', { params: params(null) })
            .then((res) => {
                if (seq !== requestSeq.current) return;
                const body = res.data || {};
                setResults((body.data || []).map(mapNotification));
                setHasMore(Boolean(body.has_more));
                nextBeforeId.current = body.next_before_id ?? null;
            })
            .catch((err) => {
                if (seq !== requestSeq.current) return;
                setResults([]); setHasMore(false);
                setError(err.response?.data?.message || err.message);
            })
            .finally(() => { if (seq === requestSeq.current) setLoading(false); });
    }, [isFiltering, params]);

    const loadMore = useCallback(async () => {
        if (!isFiltering || !hasMore || loadingMore || loading || !nextBeforeId.current) return;
        const seq = requestSeq.current;
        setLoadingMore(true);
        try {
            const res = await api.get('/notifications', { params: params(nextBeforeId.current) });
            if (seq !== requestSeq.current) return;
            const body = res.data || {};
            const older = (body.data || []).map(mapNotification);
            setResults((prev) => {
                const ids = new Set(prev.map((n) => n.id));
                return [...prev, ...older.filter((n) => !ids.has(n.id))];
            });
            setHasMore(Boolean(body.has_more));
            nextBeforeId.current = body.next_before_id ?? null;
        } catch (err) {
            if (seq === requestSeq.current) setError(err.response?.data?.message || err.message);
        } finally {
            setLoadingMore(false);
        }
    }, [isFiltering, hasMore, loadingMore, loading, params]);

    /** Keep the result list in step after a notification is opened (marked read). */
    const markLocalRead = useCallback((id) => {
        setResults((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    }, []);

    const markAllLocalRead = useCallback(() => {
        setResults((prev) => (unreadOnly ? [] : prev.map((n) => ({ ...n, read: true }))));
        if (unreadOnly) setHasMore(false);
    }, [unreadOnly]);

    const clearFilters = useCallback(() => {
        setSearch(''); setDebouncedSearch(''); setCategory('all'); setUnreadOnly(false); setPeriod('all');
    }, []);

    return {
        search, setSearch, category, setCategory, unreadOnly, setUnreadOnly, period, setPeriod,
        isFiltering, results, hasMore, loading, loadingMore, error,
        loadMore, markLocalRead, markAllLocalRead, clearFilters,
    };
}
