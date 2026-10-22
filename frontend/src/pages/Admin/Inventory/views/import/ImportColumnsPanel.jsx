import React from 'react';
import { IMPORT_FIELD_LABELS } from '../../hooks/importConstants';

/**
 * Which Excel column feeds which product field, per sheet. Filled in automatically;
 * only needed when a column was matched wrongly or a sheet should be skipped.
 */
export default function ImportColumnsPanel({ flow }) {
    const { preview, sheetChoices, updateSheetChoice, columnsChanged, applyColumns, resetColumns, busy } = flow;
    const fields = preview?.fields || Object.keys(IMPORT_FIELD_LABELS);

    return (
        <>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                Columns were matched automatically. Change one only if it is wrong. Columns that are not used (for example P.O PRICE) are ignored.
            </p>

            {(preview?.sheets || []).map(sheet => {
                const choice = sheetChoices.find(c => c.index === sheet.index) || {};
                const byIndex = Object.fromEntries(sheet.columns.map(c => [c.index, c]));
                const canEnable = sheet.detected || !!choice.header_row;

                return (
                    <section key={sheet.index} className="imp-sheet">
                        <div className="imp-sheet-head">
                            <label>
                                <input type="checkbox" className="imp-check" checked={!!choice.enabled} disabled={!canEnable}
                                    onChange={(e) => updateSheetChoice(sheet.index, { enabled: e.target.checked })} />
                                {sheet.name}
                            </label>
                            <div className="imp-sheet-meta">
                                {sheet.is_sales_log && <span className="imp-pill is-warn">Sales log: stock starts at 0</span>}
                                <span>{sheet.data_rows} rows</span>
                                <label htmlFor={`imp-hdr-${sheet.index}`} style={{ fontSize: 12, fontWeight: 500 }}>Header row</label>
                                <input id={`imp-hdr-${sheet.index}`} type="number" min="1" className="imp-input" style={{ width: 64 }}
                                    value={choice.header_row ?? ''}
                                    onChange={(e) => updateSheetChoice(sheet.index, { header_row: e.target.value ? parseInt(e.target.value, 10) : null, enabled: !!e.target.value })} />
                            </div>
                        </div>

                        {!canEnable && (
                            <div style={{ padding: '10px 14px', fontSize: 12.5, color: 'var(--text-secondary)' }}>
                                No product columns were found on this sheet, so it is skipped. Type its header row number to include it.
                            </div>
                        )}

                        {choice.enabled && (
                            <table className="imp-map">
                                <tbody>
                                    {fields.map(field => {
                                        const col = choice.fields?.[field];
                                        const sample = col !== undefined && col !== null ? byIndex[col]?.samples?.[0] : null;
                                        return (
                                            <tr key={field}>
                                                <td>{IMPORT_FIELD_LABELS[field] || field}</td>
                                                <td>
                                                    <select className="imp-select" value={col ?? ''} aria-label={`Column for ${IMPORT_FIELD_LABELS[field] || field}`}
                                                        onChange={(e) => updateSheetChoice(sheet.index, { fields: { ...choice.fields, [field]: e.target.value === '' ? null : parseInt(e.target.value, 10) } })}>
                                                        <option value="">Not in this file</option>
                                                        {sheet.columns.map(c => (
                                                            <option key={c.index} value={c.index}>{columnLetter(c.index)} · {c.label || '(no header)'}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td title={sample || ''}>{sample ? `e.g. ${sample}` : ''}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </section>
                );
            })}

            {columnsChanged && (
                <div className="imp-alert is-info" style={{ alignItems: 'center' }}>
                    <span style={{ flex: 1 }}>You changed the columns. Update the list to see the result.</span>
                    <button type="button" className="btn btn-sm btn-secondary" disabled={busy} onClick={resetColumns}>Reset</button>
                    <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={applyColumns}>{busy ? 'Updating...' : 'Update list'}</button>
                </div>
            )}
        </>
    );
}

// 0 -> A, 25 -> Z, 26 -> AA.
function columnLetter(index) {
    let n = index + 1;
    let s = '';
    while (n > 0) {
        const r = (n - 1) % 26;
        s = String.fromCharCode(65 + r) + s;
        n = Math.floor((n - 1) / 26);
    }
    return s;
}
