import React from 'react';
import { IconFile } from './ImportIcons';

const STATUS = {
    completed: ['is-ok', 'Imported'],
    in_progress: ['is-warn', 'Not finished'],
    undone: ['is-muted', 'Undone'],
};

/**
 * Recent imports. Each can be opened to see what it created; users who may delete products can undo.
 */
export default function ImportHistory({ history, onView, onUndo, canUndo, busy }) {
    if (!history?.length) return null;

    return (
        <div>
            <p className="imp-section-title">Recent imports</p>
            <div className="imp-history">
                {history.slice(0, 5).map(batch => {
                    const [tone, label] = STATUS[batch.status] || ['is-muted', batch.status];
                    return (
                        <div key={batch.id} className="imp-history-row">
                            <span style={{ color: 'var(--text-muted)', display: 'flex' }}><IconFile /></span>
                            <div className="imp-history-file">
                                <strong title={batch.file_name}>{batch.file_name}</strong>
                                <span>
                                    {new Date(batch.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                    {' · '}{batch.products_created} products{batch.variants_created > 0 ? `, ${batch.variants_created} variants` : ''}
                                    {batch.user?.username ? ` · by ${batch.user.username}` : ''}
                                </span>
                            </div>
                            <span className={`imp-pill ${tone}`}>{label}</span>
                            <button type="button" className="btn btn-sm btn-secondary" disabled={busy} onClick={() => onView(batch)}>View</button>
                            {canUndo && batch.status !== 'undone' && batch.products_created > 0 && (
                                <button type="button" className="btn btn-sm btn-secondary" disabled={busy} onClick={() => onUndo(batch)}>Undo</button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
