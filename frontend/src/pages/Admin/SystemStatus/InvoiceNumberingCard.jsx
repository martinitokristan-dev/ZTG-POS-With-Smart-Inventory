import React, { useEffect, useState } from 'react';
import api from '../../../shared/api';
import { showToast } from '../../../utils/toast';

/**
 * Technical Operations only: how S.I. / D.R. / C.R. numbers are issued.
 *
 * Manual booklet is the default (the cashier types the BIR-registered paper number).
 * System-generated numbers need the store's BIR permit for the POS, the first number of each
 * series and the digit length. Saving asks for the TechOps password; the backend checks it,
 * refuses a starting number that is not higher than the last one used, and logs the change.
 */

const SERIES = [
    { field: 'si', docType: 'S.I.', label: 'S.I.', name: 'Sales Invoice' },
    { field: 'dr', docType: 'D.R.', label: 'D.R.', name: 'Delivery Receipt' },
    { field: 'cr', docType: 'C.R.', label: 'C.R.', name: 'Collection Receipt' },
];

const DIGITS_MIN = 4;
const DIGITS_MAX = 10;

const labelStyle = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', color: '#64748B', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', gap: '8px' };
const inputStyle = (hasError) => ({
    width: '100%',
    boxSizing: 'border-box',
    padding: '9px 12px',
    fontSize: '13px',
    borderRadius: '8px',
    border: `1px solid ${hasError ? '#F87171' : '#CBD5E1'}`,
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    outline: 'none',
});
const monoStyle = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontWeight: 700 };
const hintStyle = { fontSize: '11px', color: '#64748B', marginTop: '4px' };
const errorStyle = { fontSize: '11px', color: '#DC2626', marginTop: '4px' };

/** Next free number of a series: the saved counter, or one past the last used number. */
const suggestStart = (status, docType) => {
    const next = parseInt(status?.next?.[docType] || '1', 10) || 1;
    const last = parseInt(status?.last_used?.[docType] || '0', 10) || 0;
    return String(Math.max(next, last + 1));
};

const pad = (value, digits) => (value ? String(parseInt(value, 10) || 0).padStart(digits, '0') : '');

const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export default function InvoiceNumberingCard() {
    const [status, setStatus] = useState(null);
    const [loadError, setLoadError] = useState('');
    const [mode, setMode] = useState('manual');
    const [permit, setPermit] = useState('');
    const [digits, setDigits] = useState('6');
    const [counters, setCounters] = useState({ si: '', dr: '', cr: '' });
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const fillForm = (data) => {
        setStatus(data);
        setMode(data.mode);
        setPermit(data.bir_permit_no || '');
        setDigits(String(data.digits || 6));
        setCounters({
            si: suggestStart(data, 'S.I.'),
            dr: suggestStart(data, 'D.R.'),
            cr: suggestStart(data, 'C.R.'),
        });
    };

    useEffect(() => {
        api.get('/system/invoice-numbering')
            .then((res) => fillForm(res.data))
            .catch(() => setLoadError('Could not load the invoice numbering setup. Refresh the page to try again.'));
    }, []);

    const digitCount = Math.min(DIGITS_MAX, Math.max(DIGITS_MIN, parseInt(digits, 10) || 6));
    const isAuto = mode === 'auto';
    const changed = status && (
        mode !== status.mode
        || (isAuto && (
            permit.trim() !== (status.bir_permit_no || '')
            || digitCount !== status.digits
            || SERIES.some(({ field, docType }) => pad(counters[field], digitCount) !== status.next?.[docType])
        ))
    );

    const fieldError = (key) => errors[key]?.[0];

    const handleSave = async (e) => {
        e.preventDefault();
        if (saving) return;

        const localErrors = {};
        if (!password) localErrors.password = ['Enter your password to confirm.'];
        if (isAuto && !permit.trim()) localErrors.bir_permit_no = ['Enter the BIR permit / accreditation number.'];
        if (Object.keys(localErrors).length) {
            setErrors(localErrors);
            return;
        }

        setSaving(true);
        setErrors({});
        try {
            const payload = isAuto
                ? { mode, password, bir_permit_no: permit.trim(), digits: digitCount, counters }
                : { mode, password };
            const res = await api.put('/system/invoice-numbering', payload);
            fillForm(res.data.status);
            setPassword('');
            showToast(res.data.message || 'Invoice numbering saved.', 'success');
        } catch (err) {
            if (err.response?.status === 422 && err.response.data?.errors) {
                setErrors(err.response.data.errors);
            } else if (err.response?.status === 429) {
                setErrors({ password: ['Too many attempts. Wait a minute and try again.'] });
            } else {
                showToast(err.response?.data?.message || 'Could not save the invoice numbering.', 'error');
            }
        } finally {
            setSaving(false);
        }
    };

    const modeButton = (value, label) => {
        const active = mode === value;
        return (
            <button
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => { setMode(value); setErrors({}); }}
                style={{
                    padding: '8px 16px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: active ? '#2563EB' : '#FFFFFF',
                    color: active ? '#FFFFFF' : '#475569',
                    transition: 'background-color 0.15s ease',
                }}
            >
                {label}
            </button>
        );
    };

    const currentIsAuto = status?.mode === 'auto';

    return (
        <section className="status-white-card" aria-labelledby="invoice-numbering-title" style={{ borderRadius: '16px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap', borderBottom: '1px solid #E2E8F0', paddingBottom: '14px', marginBottom: '18px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                    </div>
                    <div>
                        <h2 id="invoice-numbering-title" className="status-text-dark" style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                            Invoice Numbering (BIR)
                        </h2>
                        <p className="status-text-muted" style={{ fontSize: '12px', margin: '2px 0 0', maxWidth: '620px', lineHeight: 1.45 }}>
                            Only Technical Operations can change this. Turn on system-generated numbers only after the store has a BIR permit for this POS. Every change is saved in the Activity Logs.
                        </p>
                    </div>
                </div>
                {status && (
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700,
                        backgroundColor: currentIsAuto ? 'rgba(16, 185, 129, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                        color: currentIsAuto ? '#059669' : '#2563EB',
                    }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'currentColor' }} />
                        Currently: {currentIsAuto ? 'System-generated' : 'Manual booklet'}
                    </span>
                )}
            </div>

            {loadError && <p style={{ ...errorStyle, fontSize: '12.5px', margin: 0 }} role="alert">{loadError}</p>}
            {!status && !loadError && <p className="status-text-muted" style={{ fontSize: '12.5px', margin: 0 }}>Loading...</p>}

            {status && (
                <form onSubmit={handleSave} noValidate>
                    <div style={{ marginBottom: '18px' }}>
                        <div style={labelStyle} id="numbering-mode-label"><span>Numbering method</span></div>
                        <div role="radiogroup" aria-labelledby="numbering-mode-label" style={{ display: 'inline-flex', border: '1px solid #CBD5E1', borderRadius: '10px', overflow: 'hidden' }}>
                            {modeButton('manual', 'Manual booklet')}
                            {modeButton('auto', 'System-generated')}
                        </div>
                        <div style={hintStyle}>
                            {isAuto
                                ? 'The system gives each sale the next number. The cashier can still type a number from the paper receipt if needed.'
                                : 'The cashier types the number from the BIR-registered paper booklet for every sale.'}
                        </div>
                    </div>

                    {isAuto && (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                                <div>
                                    <label htmlFor="bir-permit-no" style={labelStyle}>
                                        <span>BIR permit / accreditation no.</span>
                                        <span style={{ color: '#DC2626' }}>Required</span>
                                    </label>
                                    <input
                                        id="bir-permit-no"
                                        type="text"
                                        value={permit}
                                        maxLength={100}
                                        onChange={(e) => setPermit(e.target.value)}
                                        aria-invalid={Boolean(fieldError('bir_permit_no'))}
                                        aria-describedby={fieldError('bir_permit_no') ? 'bir-permit-no-error' : undefined}
                                        placeholder="e.g. FP012026-123-0004567"
                                        style={inputStyle(fieldError('bir_permit_no'))}
                                    />
                                    {fieldError('bir_permit_no') && <div id="bir-permit-no-error" style={errorStyle}>{fieldError('bir_permit_no')}</div>}
                                </div>
                                <div>
                                    <label htmlFor="numbering-digits" style={labelStyle}><span>Digit length</span></label>
                                    <input
                                        id="numbering-digits"
                                        type="number"
                                        min={DIGITS_MIN}
                                        max={DIGITS_MAX}
                                        value={digits}
                                        onChange={(e) => setDigits(e.target.value)}
                                        aria-invalid={Boolean(fieldError('digits'))}
                                        aria-describedby="numbering-digits-hint"
                                        style={{ ...inputStyle(fieldError('digits')), width: '90px', textAlign: 'center', fontWeight: 700 }}
                                    />
                                    <div id="numbering-digits-hint" style={fieldError('digits') ? errorStyle : hintStyle}>
                                        {fieldError('digits') || `${DIGITS_MIN} to ${DIGITS_MAX} digits. ${digitCount} digits = ${'1'.padStart(digitCount, '0')}`}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '18px' }}>
                                {SERIES.map(({ field, docType, label, name }) => {
                                    const key = `counters.${field}`;
                                    const err = fieldError(key);
                                    const last = status.last_used?.[docType];
                                    return (
                                        <div key={field}>
                                            <label htmlFor={`counter-${field}`} style={labelStyle}>
                                                <span>{label} starts at</span>
                                                <span style={{ textTransform: 'none', fontWeight: 600 }}>{name}</span>
                                            </label>
                                            <input
                                                id={`counter-${field}`}
                                                type="text"
                                                inputMode="numeric"
                                                value={counters[field]}
                                                onChange={(e) => setCounters((prev) => ({ ...prev, [field]: e.target.value.replace(/\D/g, '').slice(0, DIGITS_MAX) }))}
                                                aria-invalid={Boolean(err)}
                                                aria-describedby={`counter-${field}-hint`}
                                                style={{ ...inputStyle(err), ...monoStyle }}
                                            />
                                            <div id={`counter-${field}-hint`} style={err ? errorStyle : hintStyle}>
                                                {err || (
                                                    <>
                                                        Prints as <span style={monoStyle}>{pad(counters[field], digitCount) || '-'}</span>
                                                        {' · '}Last used: <span style={monoStyle}>{last || 'none'}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', borderTop: '1px dashed #E2E8F0', paddingTop: '16px' }}>
                        <div style={{ minWidth: '240px', flex: '0 1 320px' }}>
                            <label htmlFor="numbering-password" style={labelStyle}><span>Your password (to confirm)</span></label>
                            <input
                                id="numbering-password"
                                type="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                aria-invalid={Boolean(fieldError('password'))}
                                aria-describedby={fieldError('password') ? 'numbering-password-error' : undefined}
                                style={inputStyle(fieldError('password'))}
                            />
                            {fieldError('password') && <div id="numbering-password-error" style={errorStyle}>{fieldError('password')}</div>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            {status.updated_at && (
                                <span className="status-text-muted" style={{ fontSize: '11.5px' }}>
                                    Last changed by {status.updated_by || 'Technical Operations'} on {formatDate(status.updated_at)}
                                </span>
                            )}
                            <button
                                type="submit"
                                disabled={saving || !changed}
                                style={{
                                    padding: '9px 16px',
                                    fontSize: '12.5px',
                                    fontWeight: 700,
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: saving || !changed ? '#94A3B8' : '#2563EB',
                                    color: '#FFFFFF',
                                    cursor: saving || !changed ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {saving
                                    ? 'Saving...'
                                    : isAuto
                                        ? (currentIsAuto ? 'Save numbering' : 'Turn on system numbering')
                                        : (currentIsAuto ? 'Switch to manual booklet' : 'No changes')}
                            </button>
                        </div>
                    </div>
                </form>
            )}
        </section>
    );
}
