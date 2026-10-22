import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { showToast } from '../../utils/toast';

/** How long the row stays highlighted. */
const HIGHLIGHT_MS = 3000;
/** Stop waiting for the row after this long (e.g. it was deleted meanwhile). */
const GIVE_UP_MS = 10000;

/**
 * Open a paginated list on the page that holds one record, scroll to its row and
 * highlight it. Driven by `?highlight={id}`, which notification "View" buttons set.
 *
 * Flow:
 * 1. Ask the server which page holds the record, with the list's current filters.
 * 2. If it's hidden by those filters, ask again without filters and clear them.
 * 3. Go to that page, wait for its rows, scroll to the row and highlight it for 3 s.
 * 4. Remove `highlight` from the URL, so a refresh doesn't repeat it.
 *
 * @param {Object}   options
 * @param {(id: number, opts: { unfiltered: boolean }) => Promise<{found: boolean, page?: number, base_id?: number}>} options.locate
 *        Calls the module's find-page endpoint. `base_id` is an alternative row to highlight
 *        (a variant's base product, when the variant row itself is not shown).
 * @param {number}   options.page        Current page.
 * @param {(page: number) => void} options.setPage
 * @param {number}   [options.loadedPage] Page the rows on screen belong to (defaults to `page`).
 * @param {number[]} options.rowIds      Ids of the rows currently rendered.
 * @param {boolean}  options.loading
 * @param {(id: number) => string} options.rowSelector CSS selector of a row, for scrolling.
 * @param {() => void} [options.clearFilters] Reset the list filters so the record is visible.
 * @param {() => void} [options.refetch]  Reload the page when cached rows are stale.
 * @param {string}   [options.label]      Record name used in messages, e.g. "transaction".
 * @returns {{ highlightedId: number|null }}
 */
export default function useFindAndHighlight({
    locate, page, setPage, loadedPage, rowIds, loading, rowSelector,
    clearFilters, refetch, label = 'record',
}) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [highlightedId, setHighlightedId] = useState(null);
    const [target, setTarget] = useState(null); // { ids: number[], page: number, refetched: boolean }
    const handledId = useRef(null);
    const timers = useRef([]);
    // Latest callbacks, so the locate step uses the filters on screen when it runs.
    const latest = useRef({});
    latest.current = { locate, clearFilters };

    const param = searchParams.get('highlight');

    /**
     * Remove `?highlight` from the URL.
     * With an id, only removes it while it still points at that record, so a late
     * timer from an earlier highlight never cancels a newer one.
     */
    const clearParam = useCallback((forId) => {
        setSearchParams((prev) => {
            if (forId !== undefined && prev.get('highlight') !== String(forId)) return prev;
            const next = new URLSearchParams(prev);
            next.delete('highlight');
            return next;
        }, { replace: true });
    }, [setSearchParams]);

    const clearTimers = useCallback(() => {
        timers.current.forEach(clearTimeout);
        timers.current = [];
    }, []);

    useEffect(() => clearTimers, [clearTimers]);

    // Steps 1–2: find the page.
    useEffect(() => {
        if (!param) {
            handledId.current = null;
            return undefined;
        }
        const id = Number(param);
        if (!Number.isInteger(id) || id <= 0) {
            clearParam();
            return undefined;
        }
        if (handledId.current === id) return undefined;
        handledId.current = id;
        // A new record replaces any highlight still running for the previous one.
        clearTimers();
        setHighlightedId(null);

        let cancelled = false;
        let done = false;
        (async () => {
            try {
                let result = await latest.current.locate(id, { unfiltered: false });
                let neededUnfiltered = false;
                if (!result?.found && latest.current.clearFilters) {
                    result = await latest.current.locate(id, { unfiltered: true });
                    neededUnfiltered = true;
                }
                if (cancelled) return;
                done = true;

                if (!result?.found) {
                    showToast(`This ${label} is no longer available.`, 'error');
                    clearParam(id);
                    return;
                }
                if (neededUnfiltered && result.found) latest.current.clearFilters();
                setTarget({
                    ids: [id, result.base_id].filter((x) => Number.isInteger(x)),
                    page: result.page,
                    refetched: false,
                });
            } catch {
                if (cancelled) return;
                done = true;
                showToast(`Couldn't open this ${label}. Please try again.`, 'error');
                clearParam(id);
            }
        })();

        return () => {
            cancelled = true;
            // Effect re-run before the lookup finished (React StrictMode): allow a retry.
            if (!done) handledId.current = null;
        };
    }, [param, clearParam, clearTimers, label]);

    // Give up if the row never shows up.
    useEffect(() => {
        if (!target) return undefined;
        const targetId = target.ids[0];
        const timer = setTimeout(() => {
            setTarget(null);
            showToast(`Couldn't show this ${label} in the list.`, 'error');
            clearParam(targetId);
        }, GIVE_UP_MS);
        return () => clearTimeout(timer);
        // Only restart the timer when a new record is targeted.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target?.ids?.[0], target?.page]);

    // Step 3: go to the page, then highlight the row once it is rendered.
    useEffect(() => {
        if (!target) return;
        if (page !== target.page) {
            setPage(target.page);
            return;
        }
        if (loading || (loadedPage ?? page) !== target.page) return;

        const rowId = target.ids.find((x) => rowIds.includes(x));
        if (rowId === undefined) {
            // Cached rows can be older than the server's answer; reload once.
            if (!target.refetched && refetch) {
                setTarget((t) => (t ? { ...t, refetched: true } : t));
                refetch();
            }
            return;
        }

        const requestedId = target.ids[0]; // The id in `?highlight` (rowId may be the base product)
        setTarget(null);
        setHighlightedId(rowId);
        requestAnimationFrame(() => {
            document.querySelector(rowSelector(rowId))?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        // Step 4.
        clearTimers();
        timers.current.push(setTimeout(() => {
            setHighlightedId((current) => (current === rowId ? null : current));
            clearParam(requestedId);
        }, HIGHLIGHT_MS));
    }, [target, page, loadedPage, loading, rowIds, setPage, refetch, rowSelector, clearParam, clearTimers]);

    return { highlightedId };
}
