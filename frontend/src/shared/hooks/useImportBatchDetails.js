import { useEffect, useState } from 'react';
import api from '../api';

/**
 * Loads what one Excel import created (summary + one page of products), with search and paging.
 *
 * @param {number|null} batchId Import batch id; nothing is loaded while it is empty.
 * @returns {{ data: object|null, loading: boolean, error: string, page: number, setPage: Function, search: string, setSearch: Function }}
 */
export default function useImportBatchDetails(batchId) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [search, setSearchState] = useState('');

    useEffect(() => {
        if (!batchId) return undefined;
        let cancelled = false;
        const timer = setTimeout(async () => {
            setLoading(true);
            setError('');
            try {
                const res = await api.get(`/product-imports/batches/${batchId}`, { params: { page, search: search.trim() || undefined } });
                if (!cancelled) setData(res.data);
            } catch (err) {
                if (!cancelled) setError(err?.response?.data?.message || 'The import details could not be loaded.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }, search ? 300 : 0);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [batchId, page, search]);

    return { data, loading, error, page, setPage, search, setSearch: (v) => { setSearchState(v); setPage(1); } };
}
