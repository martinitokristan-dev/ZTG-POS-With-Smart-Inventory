import React from 'react';
import { IconCheck, IconAlert, IconSpinner } from './ImportIcons';
import ImportBatchDetails from '../../../../../shared/components/ImportBatchDetails';

/**
 * Step 3: saving progress, then exactly what was imported (searchable list with variants).
 */
export default function ImportProgressStep({ step, progress, onUploadAgain, canUploadAgain }) {
    if (!progress) return null;
    const done = step === 'done';
    const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
    const hasProblems = progress.failed.length > 0;

    // Format elapsed time
    const elapsed = progress.elapsed || 0; // seconds
    const elapsedMin = Math.floor(elapsed / 60);
    const elapsedSec = elapsed % 60;
    const elapsedText = elapsed > 0 ? `${elapsedMin}:${elapsedSec.toString().padStart(2, '0')}` : '0:00';
    
    // Calculate estimated time remaining (smoothed)
    // Use exponential moving average of rate to prevent blinking
    const smoothedRate = progress.smoothedRate || 0;
    const remaining = smoothedRate > 0 && !done && progress.done > 0 ? Math.ceil((progress.total - progress.done) * smoothedRate) : 0;
    const remainingMin = Math.floor(remaining / 60);
    const remainingSec = remaining % 60;
    const remainingText = remaining > 0 && progress.done >= Math.ceil(progress.total * 0.05) ? `Est. ${remainingMin}:${remainingSec.toString().padStart(2, '0')} left` : '';

    let icon = <IconSpinner size={28} />;
    let tone = 'is-busy';
    let title = `Importing products... ${percent}%`;
    let text = `${progress.done} of ${progress.total} saved. Please keep this window open.`;
    if (done) {
        tone = hasProblems || progress.stopped ? 'is-warn' : 'is-ok';
        icon = hasProblems || progress.stopped ? <IconAlert size={28} /> : <IconCheck size={28} />;
        title = progress.stopped ? 'Import stopped' : `${progress.created} products imported`;
        text = progress.stopped
            ? `${progress.created} products were saved before stopping. You can undo them below.`
            : `${progress.variants} variants included. It is also recorded in History Logs.${hasProblems ? ` ${progress.failed.length} could not be saved.` : ''}`;
    }

    return (
        <>
            <div className="imp-center" aria-live="polite">
                <div className={`imp-badge-icon ${tone}`}>{icon}</div>
                <h4>{title}</h4>
                <p>{text}</p>
                {!done && (
                    <>
                        <div className="imp-progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                            <div style={{ width: `${percent}%` }} />
                        </div>
                        <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: '#666' }}>
                            <span>Elapsed: <strong>{elapsedText}</strong></span>
                            {remainingText && <span style={{ marginLeft: '1.5rem', color: '#10b981' }}><strong>{remainingText}</strong></span>}
                        </div>
                    </>
                )}
                {done && elapsed > 0 && (
                    <div style={{ 
                        marginTop: '0.75rem', 
                        display: 'inline-block',
                        padding: '0.5rem 1rem',
                        backgroundColor: '#10b981',
                        color: 'white',
                        borderRadius: '0.5rem',
                        fontSize: '0.95rem',
                        fontWeight: '500'
                    }}>
                        Completed in {elapsedText}
                    </div>
                )}
            </div>

            {!done && <Report title="Could not be saved" items={progress.failed} />}
            {done && progress.batchId && progress.created > 0 && (
                <div>
                    <p className="imp-section-title">What was imported</p>
                    <ImportBatchDetails batchId={progress.batchId} />
                </div>
            )}
            {done && progress.created === 0 && <Report title="Could not be saved" items={progress.failed} />}
            {done && <Report title="Saved with a note" items={progress.warnings} />}
            {done && progress.failed.length > 0 && canUploadAgain && (
                <div className="imp-center" style={{ marginTop: '1.5rem' }}>
                    <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                        💡 <strong>Tip:</strong> Fix the failed products in your Excel file and click "Upload This File Again" below.
                        Products already in the system will be skipped automatically.
                    </p>
                    <button type="button" className="btn btn-primary" onClick={onUploadAgain} style={{ marginRight: '0.5rem' }}>
                        Upload This File Again
                    </button>
                </div>
            )}
        </>
    );
}

function Report({ title, items }) {
    if (!items?.length) return null;
    return (
        <div className="imp-report">
            <div className="imp-report-head">{title} ({items.length})</div>
            <div className="imp-report-list">
                {items.map((item, i) => (
                    <div key={`${item.key}-${i}`} className="imp-report-item"><strong>{item.name}</strong>: {item.message}</div>
                ))}
            </div>
        </div>
    );
}
