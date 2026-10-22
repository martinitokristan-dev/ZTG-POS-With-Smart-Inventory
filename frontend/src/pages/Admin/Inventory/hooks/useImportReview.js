import { useMemo, useState, useCallback } from 'react';
import { IMPORT_PAGE_SIZE } from './importConstants';

/**
 * Review-screen state: the editable list of products, search, filter and paging.
 * Edits stay in the browser until the import starts.
 */
export function useImportReview() {
    const [families, setFamilies] = useState([]);
    const [hasEdits, setHasEdits] = useState(false);
    const [filter, setFilterState] = useState('all');
    const [query, setQueryState] = useState('');
    const [page, setPage] = useState(1);
    const [expandedKey, setExpandedKey] = useState(null);

    const loadFamilies = useCallback((list) => {
        setFamilies(list || []);
        setHasEdits(false);
        setPage(1);
        setExpandedKey(null);
    }, []);

    const updateFamily = useCallback((key, changes) => {
        setFamilies(prev => prev.map(f => (f.key === key ? { ...f, ...changes } : f)));
        setHasEdits(true);
    }, []);

    const updateVariant = useCallback((familyKey, variantKey, changes) => {
        setFamilies(prev => prev.map(f => (f.key !== familyKey ? f : {
            ...f,
            variants: f.variants.map(v => (v.key === variantKey ? { ...v, ...changes } : v)),
        })));
        setHasEdits(true);
    }, []);

    // Select / clear every product currently shown. Products whose rows are all already in the
    // system cannot be selected (there is nothing new to add).
    const setShownIncluded = useCallback((keys, include) => {
        const wanted = new Set(keys);
        setFamilies(prev => prev.map(f => (wanted.has(f.key) && canImport(f) ? { ...f, include } : f)));
        setHasEdits(true);
    }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return families.filter(f => {
            if (filter === 'attention' && !needsAttention(f)) return false;
            if (filter === 'variants' && f.is_simple) return false;
            if (filter === 'existing' && f.status !== 'exists') return false;
            if (!q) return true;
            return [f.name, f.brand, f.category, f.chinese_name, ...f.variants.map(v => v.part_no)]
                .some(text => (text || '').toLowerCase().includes(q));
        });
    }, [families, filter, query]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / IMPORT_PAGE_SIZE));
    const safePage = Math.min(page, pageCount);
    const visible = filtered.slice((safePage - 1) * IMPORT_PAGE_SIZE, safePage * IMPORT_PAGE_SIZE);

    const totals = useMemo(() => {
        const selected = families.filter(isSelected);
        return {
            all: families.length,
            importable: families.filter(canImport).length,
            selected: selected.length,
            variants: selected.reduce((sum, f) => sum + (f.is_simple ? 0 : f.variants.filter(v => v.include && !v.exists).length), 0),
            withVariants: families.filter(f => !f.is_simple).length,
            attention: families.filter(needsAttention).length,
            existing: families.filter(f => f.status === 'exists').length,
        };
    }, [families]);

    return {
        families, hasEdits, loadFamilies, updateFamily, updateVariant,
        filter, setFilter: (v) => { setFilterState(v); setPage(1); },
        query, setQuery: (v) => { setQueryState(v); setPage(1); },
        page: safePage, setPage, pageCount, visibleFamilies: visible, filtered,
        setShownIncluded, expandedKey, setExpandedKey, totals,
    };
}

/**
 * Whether a product has at least one row that is not already in the system.
 *
 * @param {object} family Product family from the plan.
 * @returns {boolean}
 */
export function canImport(family) {
    return family.variants.some(v => !v.exists);
}

/**
 * Whether a product will be imported: ticked, with at least one ticked new row.
 *
 * @param {object} family Product family from the plan.
 * @returns {boolean}
 */
export function isSelected(family) {
    return !!family.include && family.variants.some(v => v.include && !v.exists);
}

/**
 * Whether a product has notes worth reading before importing.
 *
 * @param {object} family Product family from the plan.
 * @returns {boolean}
 */
export function needsAttention(family) {
    if (!canImport(family)) return false; // listed under "Already in system" instead
    return (family.warnings?.length || 0) > 0 || family.variants.some(v => !v.exists && (v.warnings?.length || 0) > 0);
}
