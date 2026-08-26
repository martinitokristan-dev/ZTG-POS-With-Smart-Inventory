import React from 'react';

export default function ForceLogoutModal({ isOpen, onClose, session, onConfirm, isProcessing }) {
    if (!isOpen || !session) return null;

    return (
        <div className="modal-overlay" style={{ zIndex: 1050 }}>
            <div className="modal-content" style={{ maxWidth: '440px', padding: '0', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                {/* Modal Header */}
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                                <line x1="12" y1="2" x2="12" y2="12"></line>
                            </svg>
                        </div>
                        <div>
                            <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>Remote Force Logout</h3>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Session #{session.token_id}</span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isProcessing}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Modal Body */}
                <div style={{ padding: '20px 24px' }}>
                    {/* User Card */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '16px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: session.role === 'Admin' ? '#EEF2FF' : '#F0FDF4', color: session.role === 'Admin' ? '#4F46E5' : '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '16px', overflow: 'hidden' }}>
                            {session.profile_photo ? (
                                <img src={session.profile_photo} alt={session.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                (session.full_name || session.username || 'U')[0].toUpperCase()
                            )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>{session.full_name}</span>
                                <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', backgroundColor: session.role === 'Admin' ? 'rgba(79, 70, 229, 0.1)' : 'rgba(22, 163, 74, 0.1)', color: session.role === 'Admin' ? '#4F46E5' : '#16A34A' }}>
                                    {session.role}
                                </span>
                            </div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                @{session.username} {session.email && `• ${session.email}`}
                            </div>
                        </div>
                    </div>

                    {/* Warning Box */}
                    <div style={{ padding: '12px 14px', backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '10px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        <div style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: '1.45' }}>
                            <strong style={{ color: '#F87171' }}>Immediate Revocation:</strong> This will instantly terminate their access token. Any unsaved cart on their screen will be preserved in recovery, but they will be kicked back to the login page immediately.
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div style={{ padding: '14px 24px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: 'var(--bg-secondary)' }}>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={onClose}
                        disabled={isProcessing}
                        style={{ padding: '8px 16px', fontSize: '13px', fontWeight: '600' }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn btn-danger"
                        onClick={onConfirm}
                        disabled={isProcessing}
                        style={{ padding: '8px 18px', fontSize: '13px', fontWeight: '700', backgroundColor: '#DC2626', borderColor: '#DC2626', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        {isProcessing ? (
                            <span>Terminating…</span>
                        ) : (
                            <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                                    <line x1="12" y1="2" x2="12" y2="12"></line>
                                </svg>
                                <span>Terminate Session</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
