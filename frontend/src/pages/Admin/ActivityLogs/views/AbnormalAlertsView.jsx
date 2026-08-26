import React from 'react';
import LoadingSpinner from '../../../../shared/components/LoadingSpinner';

export default function AbnormalAlertsView({ logs, loading, onViewDetails, onRefresh }) {
    // Filter down to abnormal / critical / warning logs
    const abnormalLogs = logs.filter(
        (l) => l.status === 'Abnormal' || l.severity === 'critical' || l.severity === 'warning' || l.status === 'Terminated'
    );

    return (
        <div>
            {/* Header Banner */}
            <div style={{ padding: '16px 20px', borderRadius: '12px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                    </div>
                    <div>
                        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#991B1B', margin: 0 }}>
                            Security Incidents & Abnormal Activities
                        </h3>
                        <p style={{ fontSize: '12px', color: '#B91C1C', margin: '2px 0 0' }}>
                            Automated tracking for rate limit breaches, 1-minute login lockouts, and forced session terminations
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={onRefresh}
                    style={{ fontSize: '12px', padding: '6px 14px' }}
                >
                    Refresh Alerts
                </button>
            </div>

            {/* List */}
            {loading ? (
                <LoadingSpinner text="Scanning security logs..." minHeight="300px" />
            ) : abnormalLogs.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#ECFDF5', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                    <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px' }}>All Clear — No Abnormal Activity Detected</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>There are no rate-limit breaches or brute-force attempts recorded.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {abnormalLogs.map((log) => {
                        const isCritical = log.severity === 'critical' || log.status === 'Abnormal';
                        return (
                            <div
                                key={log.id}
                                style={{
                                    backgroundColor: 'var(--bg-card)',
                                    borderRadius: '12px',
                                    border: isCritical ? '1.5px solid #FCA5A5' : '1px solid var(--border)',
                                    padding: '16px 20px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: '14px',
                                    boxShadow: isCritical ? '0 2px 8px rgba(239, 68, 68, 0.08)' : 'none',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, minWidth: '280px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: isCritical ? '#FEE2E2' : '#FEF3C7', color: isCritical ? '#DC2626' : '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <line x1="12" y1="8" x2="12" y2="12"></line>
                                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                        </svg>
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                {log.action.replace(/_/g, ' ').toUpperCase()}
                                            </span>
                                            <span style={{ fontSize: '10.5px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', backgroundColor: isCritical ? '#FEE2E2' : '#FEF3C7', color: isCritical ? '#DC2626' : '#D97706' }}>
                                                {log.severity.toUpperCase()}
                                            </span>
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                {new Date(log.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.45', fontWeight: '500' }}>
                                            {log.description}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                            Origin: <strong>{log.ip_address === '::1' || log.ip_address === '127.0.0.1' ? '127.0.0.1 (Localhost)' : (log.ip_address || '—')}</strong> ({log.device || 'Unknown device'})
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => onViewDetails(log)}
                                    className="btn btn-secondary btn-sm"
                                    style={{ fontSize: '12px', padding: '6px 14px', fontWeight: '600' }}
                                >
                                    View Details
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
