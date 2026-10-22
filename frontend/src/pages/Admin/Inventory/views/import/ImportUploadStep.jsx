import React, { useRef, useState } from 'react';
import { IMPORT_ACCEPT, IMPORT_MAX_FILE_MB } from '../../hooks/importConstants';
import { IconUpload, IconSpinner } from './ImportIcons';
import ImportHistory from './ImportHistory';

const HOW = [
    ['Upload', 'Your Excel file as it is. Every sheet is read.'],
    ['Review', 'Products come out organised: brand, variants, category.'],
    ['Import', 'Missing brands, categories and options are added to Settings.'],
];

/**
 * Step 1: choose or drop the file. Recent imports (with Undo) are listed below.
 */
export default function ImportUploadStep({ busy, onFile, history, onView, onUndo, canUndo }) {
    const inputRef = useRef(null);
    const [over, setOver] = useState(false);

    const open = () => { if (!busy) inputRef.current?.click(); };
    const pick = (files) => { const f = files?.[0]; if (f && !busy) onFile(f); };

    return (
        <>
            <div
                role="button"
                tabIndex={0}
                aria-label="Choose an Excel file to import"
                aria-busy={busy}
                className={`imp-drop${over ? ' is-over' : ''}${busy ? ' is-busy' : ''}`}
                onClick={open}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
                onDragOver={(e) => { e.preventDefault(); setOver(true); }}
                onDragLeave={() => setOver(false)}
                onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files); }}
            >
                <div className="imp-drop-icon">{busy ? <IconSpinner size={24} /> : <IconUpload size={24} />}</div>
                <h4>{busy ? 'Reading your file...' : 'Drag your Excel file here'}</h4>
                <p>{busy ? 'Organising products. This takes a few seconds for big files.' : `.xlsx, .xls or .csv up to ${IMPORT_MAX_FILE_MB} MB`}</p>
                {!busy && <button type="button" className="btn btn-primary" onClick={(e) => { e.stopPropagation(); open(); }}>Choose file</button>}
                <input ref={inputRef} type="file" accept={IMPORT_ACCEPT} hidden onChange={(e) => { pick(e.target.files); e.target.value = ''; }} />
            </div>

            <div className="imp-how">
                {HOW.map(([title, text], i) => (
                    <div key={title} className="imp-how-item">
                        <span className="imp-how-num">{i + 1}</span>
                        <div><strong>{title}</strong><span>{text}</span></div>
                    </div>
                ))}
            </div>

            <ImportHistory history={history} onView={onView} onUndo={onUndo} canUndo={canUndo} busy={busy} />
        </>
    );
}
