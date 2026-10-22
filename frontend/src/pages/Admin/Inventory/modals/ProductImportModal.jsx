import React from 'react';
import useMobileSheet from '../../../../shared/useMobileSheet';
import ImportUploadStep from '../views/import/ImportUploadStep';
import ImportReviewStep from '../views/import/ImportReviewStep';
import ImportProgressStep from '../views/import/ImportProgressStep';
import ImportBatchDetails from '../../../../shared/components/ImportBatchDetails';
import { IconClose, IconAlert, IconCheck } from '../views/import/ImportIcons';
import '../views/import/import.css';

const STEPS = [['upload', 'Upload'], ['review', 'Review'], ['done', 'Import']];

/**
 * Smart Excel import wizard: Upload -> Review -> Import, plus a details view for past imports.
 * All state and API calls live in useProductImport.
 */
export default function ProductImportModal({ isOpen, onClose, flow, categoryNames, priceLabels, canUndo }) {
    const { step, busy, error, preview, review, progress, viewBatch } = flow;
    const { sheetRef, dragHandleProps } = useMobileSheet({ onClose, disabled: step === 'importing' });
    if (!isOpen) return null;

    const isDetails = step === 'details';
    const current = step === 'importing' ? 2 : STEPS.findIndex(([key]) => key === step);
    const subtitle = isDetails ? viewBatch?.file_name : (preview ? preview.file_name : 'Bring a whole price list into the system in one go.');
    const stepDone = (i) => i < current || (step === 'done' && i === current);

    return (
        <div className="modal-overlay" style={{ zIndex: 999 }}>
            <div ref={sheetRef} className="imp-card" role="dialog" aria-modal="true" aria-labelledby="imp-title">
                <header {...dragHandleProps} className="imp-head">
                    <div className="imp-head-title">
                        <h3 id="imp-title">{isDetails ? 'Import details' : 'Import products'}</h3>
                        <p title={subtitle}>{subtitle}</p>
                    </div>
                    {!isDetails && (
                        <ol className="imp-steps" aria-label="Steps">
                            {STEPS.map(([key, label], i) => (
                                <React.Fragment key={key}>
                                    {i > 0 && <li className="imp-step-line" aria-hidden="true" />}
                                    <li className={`imp-step${i === current ? ' is-active' : ''}${stepDone(i) ? ' is-done' : ''}`} aria-current={i === current ? 'step' : undefined}>
                                        <span className="imp-step-dot">{stepDone(i) ? <IconCheck size={12} /> : i + 1}</span>
                                        {label}
                                    </li>
                                </React.Fragment>
                            ))}
                        </ol>
                    )}
                    <button type="button" className="imp-icon-btn" onClick={onClose} disabled={step === 'importing'} aria-label="Close">
                        <IconClose />
                    </button>
                </header>

                <div className="imp-body">
                    {error && <div className="imp-alert is-error" role="alert"><IconAlert /><span>{error}</span></div>}

                    {step === 'upload' && (
                        <ImportUploadStep busy={busy} onFile={flow.uploadFile} history={flow.history} onView={flow.openBatch} onUndo={flow.undoBatch} canUndo={canUndo} />
                    )}
                    {step === 'review' && <ImportReviewStep flow={flow} categoryNames={categoryNames} priceLabels={priceLabels} />}
                    {(step === 'importing' || step === 'done') && <ImportProgressStep step={step} progress={progress} />}
                    {isDetails && viewBatch && <ImportBatchDetails batchId={viewBatch.id} />}
                </div>

                <footer className="imp-foot">
                    {step === 'review' && (
                        <span className="imp-foot-note">
                            {busy ? 'Updating the list...' : `${review.totals.selected} of ${review.totals.importable} new products selected${review.totals.variants ? ` · ${review.totals.variants} variants` : ''}`}
                        </span>
                    )}
                    <div className="imp-foot-actions">
                        {step === 'upload' && <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>}
                        {step === 'review' && (
                            <>
                                <button type="button" className="btn btn-secondary" onClick={flow.startOver} disabled={busy}>Use another file</button>
                                <button type="button" className="btn btn-primary" onClick={flow.runImport} disabled={busy || review.totals.selected === 0}>
                                    {review.totals.selected === 0 ? 'Nothing new to import' : `Import ${review.totals.selected} ${review.totals.selected === 1 ? 'product' : 'products'}`}
                                </button>
                            </>
                        )}
                        {step === 'importing' && <button type="button" className="btn btn-secondary" onClick={flow.stopImport}>Stop after this group</button>}
                        {step === 'done' && (
                            <>
                                {canUndo && progress?.created > 0 && (
                                    <button type="button" className="btn btn-danger-outline" onClick={flow.undoLast} disabled={busy}>Undo this import</button>
                                )}
                                <button type="button" className="btn btn-secondary" onClick={flow.startOver} disabled={busy}>Import another file</button>
                                <button type="button" className="btn btn-primary" onClick={onClose} disabled={busy}>Done</button>
                            </>
                        )}
                        {isDetails && (
                            <>
                                {canUndo && viewBatch?.status !== 'undone' && viewBatch?.products_created > 0 && (
                                    <button type="button" className="btn btn-danger-outline" onClick={flow.undoViewed} disabled={busy}>Undo this import</button>
                                )}
                                <button type="button" className="btn btn-primary" onClick={flow.closeBatch} disabled={busy}>Back</button>
                            </>
                        )}
                    </div>
                </footer>
            </div>
        </div>
    );
}
