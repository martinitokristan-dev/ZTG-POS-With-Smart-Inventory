import React from 'react';
import { IconCheck, IconAlert, IconSpinner } from './ImportIcons';
import ImportBatchDetails from '../../../../../shared/components/ImportBatchDetails';

/**
 * Step 3: saving progress, then exactly what was imported (searchable list with variants).
 */
export default function ImportProgressStep({ step, progress }) {
    if (!progress) return null;
    const done = step === 'done';
    const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
    const hasProblems = progress.failed.length > 0;

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
                    <div className="imp-progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                        <div style={{ width: `${percent}%` }} />
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
