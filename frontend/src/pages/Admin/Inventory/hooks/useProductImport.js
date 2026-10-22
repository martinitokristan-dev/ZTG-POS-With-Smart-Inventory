import { useState, useCallback, useRef } from 'react';
import api from '../../../../shared/api';
import { confirmDialog } from '../../../../shared/utils/confirmDialog';
import { showToast } from '../../../../utils/toast';
import { useImportReview, isSelected } from './useImportReview';
import { IMPORT_CHUNK_SIZE, IMPORT_MAX_FILE_MB, EMPTY_DECISIONS, importErrorMessage } from './importConstants';

/**
 * Smart Excel import flow: upload -> review (products / new in Settings / columns) -> importing -> done.
 * Also loads the import history and handles undo.
 *
 * @param {{ onImported?: () => void }} options Called after products were saved or an import was undone.
 */
export default function useProductImport({ onImported } = {}) {
    const review = useImportReview();
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState('upload');
    const [reviewTab, setReviewTab] = useState('products');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [preview, setPreview] = useState(null);
    const [sheetChoices, setSheetChoices] = useState([]);
    const [decisions, setDecisions] = useState(EMPTY_DECISIONS);
    const [progress, setProgress] = useState(null);
    const [history, setHistory] = useState([]);
    const [viewBatch, setViewBatch] = useState(null); // past import opened from Recent imports
    const [uploadedFile, setUploadedFile] = useState(null); // Remember the file for re-upload
    const cancelRequested = useRef(false);

    const choicesFrom = (data) => (data?.sheets || []).map(s => ({ index: s.index, enabled: s.enabled, header_row: s.header_row, fields: { ...s.mapping } }));

    const applyPreview = useCallback((data) => {
        setPreview(data);
        setSheetChoices(choicesFrom(data));
        review.loadFamilies(data.plan?.families || []);
    }, [review.loadFamilies]);

    const loadHistory = useCallback(async () => {
        try {
            const res = await api.get('/product-imports/batches');
            setHistory(res.data.batches || []);
        } catch {
            setHistory([]);
        }
    }, []);

    const reset = useCallback(() => {
        setStep('upload'); setReviewTab('products'); setError(''); setPreview(null); setSheetChoices([]); setViewBatch(null);
        setDecisions(EMPTY_DECISIONS); setProgress(null); setUploadedFile(null); review.loadFamilies([]);
    }, [review.loadFamilies]);

    const discardUpload = useCallback(() => {
        if (preview?.token && step !== 'done') api.delete(`/product-imports/uploads/${preview.token}`).catch(() => {});
    }, [preview, step]);

    const openImport = useCallback(() => { reset(); setIsOpen(true); loadHistory(); }, [reset, loadHistory]);

    const closeImport = useCallback(async () => {
        if (step === 'importing') return;
        if (step === 'review' && !(await confirmDialog({ title: 'Close without importing?', message: 'Nothing has been saved yet. The uploaded file and your changes will be discarded.', confirmText: 'Discard', variant: 'warning' }))) return;
        discardUpload();
        setIsOpen(false);
        reset();
    }, [step, discardUpload, reset]);

    const startOver = useCallback(async () => {
        if (step === 'review' && review.hasEdits && !(await confirmDialog({ title: 'Choose another file?', message: 'Your changes to this file will be discarded.', confirmText: 'Discard', variant: 'warning' }))) return;
        discardUpload();
        reset();
        loadHistory();
    }, [step, review.hasEdits, discardUpload, reset, loadHistory]);

    const uploadFile = useCallback(async (file) => {
        if (!file) return;
        if (file.size > IMPORT_MAX_FILE_MB * 1024 * 1024) { setError(`This file is larger than ${IMPORT_MAX_FILE_MB} MB.`); return; }
        setBusy(true); setError('');
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await api.post('/product-imports/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            applyPreview(res.data);
            setUploadedFile(file); // Remember for re-upload
            setReviewTab('products');
            setStep('review');
        } catch (err) {
            setError(importErrorMessage(err, 'The file could not be read.'));
        } finally {
            setBusy(false);
        }
    }, [applyPreview]);

    // Rebuild the preview on the server with new column choices or review decisions.
    const reanalyze = useCallback(async (nextChoices, nextDecisions) => {
        if (review.hasEdits && !(await confirmDialog({ title: 'Update the list?', message: 'The list is rebuilt from the file, so edits you made to individual products will be lost.', confirmText: 'Update', variant: 'warning' }))) return false;
        setBusy(true); setError('');
        try {
            const res = await api.post('/product-imports/analyze', { token: preview.token, sheets: nextChoices, decisions: nextDecisions });
            applyPreview(res.data);
            setDecisions(nextDecisions);
            return true;
        } catch (err) {
            setError(importErrorMessage(err));
            return false;
        } finally {
            setBusy(false);
        }
    }, [preview, review.hasEdits, applyPreview]);

    const columnsChanged = JSON.stringify(sheetChoices) !== JSON.stringify(choicesFrom(preview));

    const applyColumns = useCallback(async () => {
        if (await reanalyze(sheetChoices, decisions)) {
            setReviewTab('products');
            showToast('Columns updated.');
        }
    }, [sheetChoices, decisions, reanalyze]);

    const resetColumns = useCallback(() => setSheetChoices(choicesFrom(preview)), [preview]);

    const updateSheetChoice = useCallback((index, changes) => {
        setSheetChoices(prev => prev.map(s => (s.index === index ? { ...s, ...changes } : s)));
    }, []);

    const toggleDecision = useCallback((listName, item, matches) => {
        const list = decisions[listName] || [];
        const exists = list.some(matches);
        const next = { ...decisions, [listName]: exists ? list.filter(i => !matches(i)) : [...list.filter(i => !matches(i)), item] };
        reanalyze(sheetChoices, next);
    }, [decisions, sheetChoices, reanalyze]);

    const runImport = useCallback(async () => {
        // Rows already in the system are never sent (the server would skip them anyway).
        const toSave = review.families
            .filter(isSelected)
            .map(f => ({ ...f, variants: f.variants.filter(v => v.include && !v.exists) }))
            .filter(f => f.variants.length > 0);
        if (toSave.length === 0) { setError('Select at least one product to import.'); return; }
        if (!(await confirmDialog({ title: `Import ${toSave.length} products?`, message: 'Brands, categories, variant options and units that do not exist yet will be added to Settings. You can undo this import later as long as none of its products has been sold or restocked.', confirmText: 'Import', variant: 'primary' }))) return;

        setError(''); setStep('importing'); cancelRequested.current = false;
        const state = { total: toSave.length, done: 0, created: 0, variants: 0, failed: [], warnings: [], stopped: false, batchId: null };
        setProgress({ ...state });
        try {
            state.batchId = (await api.post('/product-imports/batches', { token: preview.token })).data.batch.id;
        } catch (err) {
            setError(importErrorMessage(err)); setStep('review'); return;
        }
        for (let i = 0; i < toSave.length; i += IMPORT_CHUNK_SIZE) {
            if (cancelRequested.current) { state.stopped = true; break; }
            const chunk = toSave.slice(i, i + IMPORT_CHUNK_SIZE);
            try {
                const res = await postChunk(state.batchId, chunk.map(toPayload));
                state.created += res.created; state.variants += res.variants;
                state.failed.push(...res.failed); state.warnings.push(...res.warnings);
            } catch (err) {
                const message = importErrorMessage(err, 'This group could not be saved.');
                state.failed.push(...chunk.map(f => ({ key: f.key, name: f.name, message })));
            }
            state.done = Math.min(toSave.length, i + chunk.length);
            setProgress({ ...state });
        }
        try {
            // The server counts what was really saved, so its totals win over the running count.
            const batch = (await api.post(`/product-imports/batches/${state.batchId}/finish`)).data?.batch;
            if (batch) { state.created = batch.products_created; state.variants = batch.variants_created; }
        } catch { /* products are saved; the batch stays open */ }
        setProgress({ ...state });
        setStep('done');
        loadHistory();
        if (state.created > 0) onImported?.();
    }, [review.families, preview, loadHistory, onImported]);

    const undoBatch = useCallback(async (batch) => {
        if (!(await confirmDialog({ title: 'Undo this import?', message: `The ${batch.products_created} products from "${batch.file_name}" will be deleted, together with the brands, categories and variant options it added that nothing else uses.`, confirmText: 'Undo import', variant: 'danger' }))) return false;
        setBusy(true);
        try {
            await api.post(`/product-imports/batches/${batch.id}/undo`);
            showToast('Import undone.');
            loadHistory();
            onImported?.();
            return true;
        } catch (err) {
            showToast(importErrorMessage(err, 'The import could not be undone.'), 'error');
            return false;
        } finally {
            setBusy(false);
        }
    }, [loadHistory, onImported]);

    // Open / close a past import from the Recent imports list.
    const openBatch = useCallback((batch) => { setError(''); setViewBatch(batch); setStep('details'); }, []);
    const closeBatch = useCallback(() => { setViewBatch(null); setStep('upload'); loadHistory(); }, [loadHistory]);
    const undoViewed = useCallback(async () => {
        if (viewBatch && await undoBatch(viewBatch)) closeBatch();
    }, [viewBatch, undoBatch, closeBatch]);

    // Undo the import that just finished (from the Done screen).
    const undoLast = useCallback(async () => {
        if (!progress?.batchId) return;
        const ok = await undoBatch({ id: progress.batchId, products_created: progress.created, file_name: preview?.file_name || 'this file' });
        if (ok) reset();
    }, [progress, preview, undoBatch, reset]);

    const uploadAgain = useCallback(async () => {
        if (!uploadedFile) return;
        discardUpload(); // Discard the previous upload token
        await uploadFile(uploadedFile); // Re-upload the same file (reads latest from disk)
    }, [uploadedFile, uploadFile, discardUpload]);

    return {
        isOpen, openImport, closeImport, step, busy, error, preview,
        reviewTab, setReviewTab,
        uploadFile, uploadAgain, canUploadAgain: !!uploadedFile,
        sheetChoices, updateSheetChoice, columnsChanged, applyColumns, resetColumns,
        decisions, toggleDecision,
        review, runImport, stopImport: () => { cancelRequested.current = true; },
        progress, history, undoBatch, undoLast, startOver,
        viewBatch, openBatch, closeBatch, undoViewed,
    };
}

/** Wait between automatic retries of a chunk (ms). */
const CHUNK_RETRY_DELAYS_MS = [2000, 5000];

/** Network errors, timeouts and server hiccups are worth one more try; validation errors are not. */
const isRetryable = (err) => {
    const status = err?.response?.status;
    return !status || status === 408 || status === 429 || status >= 500;
};

/**
 * Save one chunk, retrying after a lost connection or a server error. Safe to repeat: the
 * server skips families this import already saved, so a retry never creates duplicates.
 */
async function postChunk(batchId, families) {
    for (let attempt = 0; ; attempt++) {
        try {
            return (await api.post(`/product-imports/batches/${batchId}/chunks`, { families })).data;
        } catch (err) {
            if (attempt >= CHUNK_RETRY_DELAYS_MS.length || !isRetryable(err)) throw err;
            await new Promise(resolve => setTimeout(resolve, CHUNK_RETRY_DELAYS_MS[attempt]));
        }
    }
}

// Only the fields the backend accepts.
function toPayload(f) {
    return {
        key: f.key, name: f.name, chinese_name: f.chinese_name || null, category: f.category, brand: f.brand || null,
        uom: f.uom || null, address: f.address || null, image: f.image || null, is_simple: !!f.is_simple,
        variants: f.variants.map(v => ({
            include: true, name: v.name || null, part_no: v.part_no || null, chinese_name: v.chinese_name || null,
            stock: Math.max(0, parseInt(v.stock, 10) || 0), price1: Math.max(0, Number(v.price1) || 0), price2: Math.max(0, Number(v.price2) || 0),
            uom: v.uom || null, address: v.address || null, notes: v.notes || null,
            options: (v.options || []).filter(o => o.value && o.type),
        })),
    };
}
