import React from 'react';

export default function ActivityDetailsModal({ isOpen, onClose, log }) {
    if (!isOpen || !log) return null;

    const user = log.user;
    const userName = user ? (user.profile?.full_name || user.username) : 'System / Unauthenticated';
    const userRole = user?.role || 'Guest';

    return (
        <div className="modal-overlay" style={{ zIndex: 1050 }}>
            <div className="modal-content" style={{ maxWidth: '560px', padding: '0', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                {/* Header */}
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: log.severity === 'critical' ? '#FEE2E2' : log.severity === 'warning' ? '#FEF3C7' : '#EFF6FF', color: log.severity === 'critical' ? '#DC2626' : log.severity === 'warning' ? '#D97706' : '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="16" x2="12" y2="12"></line>
                                <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                        </div>
                        <div>
                            <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>Activity Event Log #{log.id}</h3>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '20px 24px', maxHeight: '65vh', overflowY: 'auto' }}>
                    {/* Description Alert */}
                    <div style={{ padding: '14px 16px', borderRadius: '12px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', marginBottom: '18px' }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Event Summary</div>
                        <div style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                            {log.description}
                        </div>
                    </div>

                    {/* Metadata Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
                        <div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', display: 'block', marginBottom: '3px' }}>USER</span>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{userName}</span>
                            <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', display: 'block' }}>Role: {userRole}</span>
                        </div>

                        <div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', display: 'block', marginBottom: '3px' }}>ACTION / MODULE</span>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{log.action}</span>
                            <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', display: 'block' }}>Module: {log.module}</span>
                        </div>

                        <div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', display: 'block', marginBottom: '3px' }}>IP ADDRESS</span>
                            <span style={{ fontSize: '12.5px', fontFamily: 'monospace', fontWeight: '700', color: 'var(--text-primary)' }}>{log.ip_address || '—'}</span>
                        </div>

                        <div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', display: 'block', marginBottom: '3px' }}>STATUS / SEVERITY</span>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', backgroundColor: log.status === 'Success' ? '#ECFDF5' : log.status === 'Abnormal' ? '#FEF2F2' : '#FFFBEB', color: log.status === 'Success' ? '#059669' : log.status === 'Abnormal' ? '#DC2626' : '#D97706' }}>
                                    {log.status}
                                </span>
                                <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', backgroundColor: log.severity === 'critical' ? '#FEE2E2' : '#F1F5F9', color: log.severity === 'critical' ? '#DC2626' : '#475569' }}>
                                    {log.severity}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Device & User Agent */}
                    <div style={{ marginBottom: '18px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>DEVICE & BROWSER</span>
                        <div style={{ padding: '8px 12px', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-primary)', fontWeight: '600' }}>
                            {log.device || 'Unknown Device'}
                        </div>
                        {log.user_agent && (
                            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '4px', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                                {log.user_agent}
                            </div>
                        )}
                    </div>

                    {/* JSON Context Metadata */}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>EVENT METADATA (PAYLOAD)</span>
                            <pre style={{ margin: 0, padding: '12px', borderRadius: '8px', backgroundColor: '#0F172A', color: '#38BDF8', fontSize: '11px', fontFamily: 'monospace', overflowX: 'auto', lineHeight: '1.4' }}>
                                {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', background: 'var(--bg-secondary)' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} style={{ padding: '6px 16px', fontWeight: '600' }}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
