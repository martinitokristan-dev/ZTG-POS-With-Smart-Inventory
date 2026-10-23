import React, { useEffect, useState } from 'react';
import api from '../../../../shared/api';

/**
 * Settings > General: Invoice & Receipt Numbering, read-only.
 *
 * Manual booklet is the default. System-generated numbers need a BIR permit for the POS, so
 * only Technical Operations can turn them on or change the numbers (System Status page);
 * the Admin only sees the current setup and who to contact.
 */

const LockIcon = ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
);

const SERIES = [
    { docType: 'S.I.', counterKey: 'si_counter_si', label: 'S.I. next number' },
    { docType: 'D.R.', counterKey: 'si_counter_dr', label: 'D.R. next number' },
    { docType: 'C.R.', counterKey: 'si_counter_cr', label: 'C.R. next number' },
];

const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
};

const cardStyle = (selected, accent) => ({
    border: selected ? `2px solid ${accent}` : '1px solid var(--border)',
    borderRadius: '12px',
    padding: '14px 16px',
    backgroundColor: selected ? 'var(--bg-card)' : 'var(--bg-secondary)',
});

export default function InvoiceNumberingSection({ settings }) {
    const isAuto = settings.si_numbering_mode === 'auto';
    const digits = parseInt(settings.si_auto_digits || 6, 10) || 6;
    const [liveNext, setLiveNext] = useState(null);

    // The preview skips numbers already used, so it is more accurate than the stored counters.
    useEffect(() => {
        if (!isAuto) return undefined;
        let active = true;
        api.get('/settings/si-preview')
            .then((res) => { if (active) setLiveNext(res.data?.next || null); })
            .catch(() => { if (active) setLiveNext(null); });
        return () => { active = false; };
    }, [isAuto]);

    const nextNumber = ({ docType, counterKey }) =>
        liveNext?.[docType] || String(parseInt(settings[counterKey] || '1', 10) || 1).padStart(digits, '0');

    return (
        <div className="settings-section" style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }} aria-hidden="true">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                        Invoice & Receipt Numbering
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                        How S.I., D.R. and C.R. numbers are issued at checkout.
                    </p>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px', backgroundColor: isAuto ? 'rgba(16, 185, 129, 0.12)' : 'rgba(59, 130, 246, 0.12)', color: isAuto ? '#059669' : '#2563EB', fontSize: '11px', fontWeight: '700' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'currentColor' }} />
                    {isAuto ? 'System-Generated (Auto) Active' : 'Manual Booklet Active'}
                </div>
            </div>

            {!isAuto && (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                        <div style={cardStyle(true, '#3B82F6')}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <path d="M12 20h9" />
                                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                        </svg>
                                    </div>
                                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Manual Pre-Printed Booklet</span>
                                </div>
                                <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#2563EB', backgroundColor: 'rgba(59, 130, 246, 0.12)', borderRadius: '6px', padding: '3px 8px' }}>In use</span>
                            </div>
                            <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '0 0 0 36px', lineHeight: 1.45 }}>
                                The cashier types the number from the BIR-registered paper booklet for each sale, so paper and system stay the same.
                            </p>
                        </div>

                        <div style={cardStyle(false)}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                                        <LockIcon size={15} />
                                    </div>
                                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>System-Generated (Automatic)</span>
                                </div>
                                <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-secondary)', backgroundColor: 'var(--border)', borderRadius: '6px', padding: '3px 8px', whiteSpace: 'nowrap' }}>Needs BIR approval</span>
                            </div>
                            <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '0 0 0 36px', lineHeight: 1.45 }}>
                                The system numbers every sale in order. This needs a BIR permit for the POS, so only Technical Operations can turn it on.
                            </p>
                        </div>
                    </div>

                    <div style={{ marginTop: '14px', border: '1px solid rgba(59, 130, 246, 0.35)', backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', padding: '14px 16px', fontSize: '12px', color: 'var(--text-primary)' }}>
                        <strong>Want system-generated numbers?</strong> Contact Technical Operations with:
                        <ol style={{ margin: '8px 0 0 18px', padding: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            <li>Your BIR permit / accreditation number for this POS</li>
                            <li>The first S.I., D.R. and C.R. numbers approved by BIR</li>
                        </ol>
                    </div>
                </>
            )}

            {isAuto && (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                        {SERIES.map((series) => (
                            <div key={series.docType}>
                                <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                    {series.label}
                                </div>
                                <div
                                    aria-label={`${series.label} (read-only)`}
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', padding: '9px 12px', fontFamily: 'monospace', fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}
                                >
                                    {nextNumber(series)}
                                    <LockIcon color="var(--text-muted)" />
                                </div>
                            </div>
                        ))}
                    </div>
                    <p style={{ marginTop: '14px', marginBottom: 0, paddingTop: '10px', borderTop: '1px dashed var(--border)', fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {settings.si_bir_permit_no ? <>BIR permit: <strong style={{ color: 'var(--text-primary)' }}>{settings.si_bir_permit_no}</strong> · </> : null}
                        {settings.si_numbering_updated_at
                            ? `Turned on by ${settings.si_numbering_updated_by || 'Technical Operations'} on ${formatDate(settings.si_numbering_updated_at)} · `
                            : null}
                        {digits} digits · To change anything here, contact Technical Operations.
                    </p>
                </>
            )}
        </div>
    );
}
