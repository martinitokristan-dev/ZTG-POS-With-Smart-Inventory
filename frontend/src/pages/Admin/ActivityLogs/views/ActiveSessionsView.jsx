import React from 'react';
import LoadingSpinner from '../../../../shared/components/LoadingSpinner';

export default function ActiveSessionsView({ sessions, loading, onForceLogout, onRefresh }) {
    if (loading) {
        return <LoadingSpinner text="Loading active user sessions..." minHeight="300px" />;
    }

    return (
        <div>
            {/* Header & Refresh Action */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block', boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.25)' }}></span>
                        Currently Logged-In Sessions ({sessions.length})
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                        Monitor and remotely terminate unauthorized or unattended cashier and admin terminals in real time
                    </p>
                </div>
                <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={onRefresh}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 14px' }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                    </svg>
                    <span>Refresh Sessions</span>
                </button>
            </div>

            {/* Table */}
            {sessions.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ margin: '0 auto 12px' }}>
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                        <line x1="8" y1="21" x2="16" y2="21"></line>
                        <line x1="12" y1="17" x2="12" y2="21"></line>
                    </svg>
                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px' }}>No Active Sessions Found</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>There are currently no active user sessions recorded.</p>
                </div>
            ) : (
                <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', margin: 0 }}>
                            <thead>
                                <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                    <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>User / Account</th>
                                    <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>Role</th>
                                    <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>Session Started</th>
                                    <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>Last Active</th>
                                    <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>Session Status</th>
                                    <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sessions.map((sess) => (
                                    <tr key={sess.token_id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.15s ease' }}>
                                        {/* User Info */}
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: sess.role === 'Admin' ? '#EEF2FF' : '#F0FDF4', color: sess.role === 'Admin' ? '#4F46E5' : '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px', overflow: 'hidden', flexShrink: 0 }}>
                                                    {sess.profile_photo ? (
                                                        <img src={sess.profile_photo} alt={sess.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        (sess.full_name || sess.username || 'U')[0].toUpperCase()
                                                    )}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{sess.full_name}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@{sess.username}</div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Role Badge */}
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '12px', backgroundColor: sess.role === 'Admin' ? 'rgba(79, 70, 229, 0.1)' : 'rgba(22, 163, 74, 0.1)', color: sess.role === 'Admin' ? '#4F46E5' : '#16A34A' }}>
                                                {sess.role}
                                            </span>
                                        </td>

                                        {/* Session Started */}
                                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                                            {new Date(sess.session_started_at).toLocaleString()}
                                        </td>

                                        {/* Last Active */}
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                                {sess.last_active_human}
                                            </span>
                                        </td>

                                        {/* Status */}
                                        <td style={{ padding: '12px 16px' }}>
                                            {sess.is_current_session ? (
                                                <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '12px', backgroundColor: '#EFF6FF', color: '#2563EB', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563EB' }}></span>
                                                    Your Current Device
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '12px', backgroundColor: '#ECFDF5', color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }}></span>
                                                    Active Session
                                                </span>
                                            )}
                                        </td>

                                        {/* Action Button */}
                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                            {sess.is_current_session ? (
                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Active session</span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => onForceLogout(sess)}
                                                    className="btn btn-sm"
                                                    style={{ fontSize: '11px', fontWeight: '700', padding: '4px 10px', backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', color: '#DC2626', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                                                        <line x1="12" y1="2" x2="12" y2="12"></line>
                                                    </svg>
                                                    <span>Force Logout</span>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
