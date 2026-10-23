import { useState, useRef, useCallback, useEffect } from 'react';
import { confirmDialog } from '../../../../shared/utils/confirmDialog';
import { EMPTY_DECISIONS } from './importConstants';

/** Wait after the last click before the file is re-checked, so quick clicks go out as one request (ms). */
const DECISION_DEBOUNCE_MS = 350;

/**
 * Review decisions (typo fixes, "not a brand", renames...) with an instant screen and one server
 * re-check per burst of clicks.
 *
 * - `shown` is what the screen uses: it changes the moment the user clicks.
 * - `decisions` is what the server has confirmed: the plan on screen was built from it.
 * - Quick clicks are collected and sent together. If more clicks arrive while a re-check is running,
 *   its (now outdated) answer is dropped and the latest choices are sent again, so the plan always
 *   matches what the user chose. `syncing` is true until that happens (Import waits for it).
 *
 * @param {{ request: (decisions: object) => Promise<object>, apply: (data: object) => void,
 *           hasEdits: boolean, onError: (err: any) => void }} options
 */
export function useImportDecisions({ request, apply, hasEdits, onError }) {
    const [decisions, setDecisions] = useState(EMPTY_DECISIONS);
    const [shown, setShown] = useState(EMPTY_DECISIONS);
    const [syncing, setSyncing] = useState(false);
    const latest = useRef(EMPTY_DECISIONS);
    const confirmed = useRef(EMPTY_DECISIONS);
    const timer = useRef(null);
    const inFlight = useRef(false);
    const generation = useRef(0); // bumped on reset: answers for an old upload are ignored
    const editsAccepted = useRef(false);
    const deps = useRef({ request, apply, onError });
    deps.current = { request, apply, onError };

    useEffect(() => () => clearTimeout(timer.current), []);

    const flush = useCallback(async () => {
        timer.current = null;
        if (inFlight.current) return; // the running re-check sends the latest choices when it ends
        if (latest.current === confirmed.current) { setSyncing(false); return; } // nothing new to send
        const gen = generation.current;
        inFlight.current = true;
        try {
            for (;;) {
                const snapshot = latest.current;
                let data;
                try {
                    data = await deps.current.request(snapshot);
                } catch (err) {
                    if (gen !== generation.current) return;
                    // The server could not apply the choices: go back to what it last confirmed.
                    latest.current = confirmed.current;
                    setShown(confirmed.current);
                    setSyncing(false);
                    deps.current.onError(err);
                    return;
                }
                if (gen !== generation.current) return;
                if (latest.current !== snapshot) continue; // more clicks meanwhile: this answer is outdated
                deps.current.apply(data);
                confirmed.current = snapshot;
                setDecisions(snapshot);
                editsAccepted.current = false;
                setSyncing(false);
                return;
            }
        } finally {
            if (gen === generation.current) inFlight.current = false;
        }
    }, []);

    const change = useCallback(async (makeNext) => {
        if (hasEdits && !editsAccepted.current) {
            const ok = await confirmDialog({ title: 'Update the list?', message: 'The list is rebuilt from the file, so edits you made to individual products will be lost.', confirmText: 'Update', variant: 'warning' });
            if (!ok) return;
            editsAccepted.current = true;
        }
        const next = makeNext(latest.current);
        latest.current = next;
        setShown(next);
        setSyncing(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(flush, DECISION_DEBOUNCE_MS);
    }, [hasEdits, flush]);

    /**
     * Add an item to a decision list, or remove it when it is already there (Undo).
     *
     * @param {string} listName Decision list, e.g. "brand_renames".
     * @param {any} item Item to add.
     * @param {(i: any) => boolean} matches Finds the same item in the list.
     */
    const toggle = useCallback((listName, item, matches) => change(current => {
        const list = current[listName] || [];
        const exists = list.some(matches);
        return { ...current, [listName]: exists ? list.filter(i => !matches(i)) : [...list.filter(i => !matches(i)), item] };
    }), [change]);

    /**
     * Use the suggested spelling for every possible typo in the given groups.
     *
     * @param {object} entities Plan entities (brands, categories with `suggestion`).
     * @param {string[]} groups "brands" and/or "categories".
     */
    const acceptSuggestions = useCallback((entities, groups = ['brands', 'categories']) => change(current => {
        const lists = { brands: 'brand_renames', categories: 'category_renames' };
        const next = { ...current };
        groups.forEach(group => {
            const listName = lists[group];
            const fixes = (entities[group] || []).filter(e => e.suggestion).map(e => ({ from: e.name, to: e.suggestion.name }));
            const fixed = new Set(fixes.map(f => f.from.toLowerCase()));
            next[listName] = [...(next[listName] || []).filter(r => !fixed.has(String(r.from).toLowerCase())), ...fixes];
        });
        return next;
    }), [change]);

    /** Decisions the server just confirmed through another re-check (e.g. new column choices). */
    const markConfirmed = useCallback((next) => {
        latest.current = next;
        confirmed.current = next;
        setDecisions(next);
        setShown(next);
    }, []);

    /** Forget everything (new file / dialog closed); a running re-check is ignored. */
    const resetDecisions = useCallback(() => {
        generation.current += 1;
        clearTimeout(timer.current);
        timer.current = null;
        inFlight.current = false;
        editsAccepted.current = false;
        markConfirmed(EMPTY_DECISIONS);
        setSyncing(false);
    }, [markConfirmed]);

    return { decisions, shownDecisions: shown, latestDecisions: latest, syncing, toggle, acceptSuggestions, markConfirmed, resetDecisions };
}
