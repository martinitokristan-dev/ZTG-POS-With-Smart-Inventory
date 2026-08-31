import React, { useState } from 'react';

/**
 * RoleUsersModal — View staff assigned to a role and manage membership.
 */
export default function RoleUsersModal({
    isOpen,
    onClose,
    role,
    users = [],
    loading = false,
    onRemoveUser,
    onAddStaffForRole,
}) {
    const [actionLoadingId, setActionLoadingId] = useState(null);
    const [removeError, setRemoveError] = useState('');

    if (!isOpen || !role) return null;

    const handleRemove = async (user) => {
        if (user.username === 'admin') {
            setRemoveError('The default system administrator cannot be removed from the Admin role.');
            return;
        }

        if (!window.confirm(`Remove @${user.username} from the "${role.name}" role? They will become unassigned until re-assigned from Manage Users.`)) {
            return;
        }

        setRemoveError('');
        setActionLoadingId(user.id);
        try {
            if (onRemoveUser) {
                await onRemoveUser(role.id, user.id, '');
            }
        } catch (err) {
            setRemoveError(err.response?.data?.message || 'Failed to remove staff member.');
        } finally {
            setActionLoadingId(null);
        }
    };

    return (
        <div
            className="modal-overlay"
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 99999,
                padding: '20px',
            }}
        >
            <div
                className="modal-card"
                onClick={(e) => e.stopPropagation()}
                style={{
                    backgroundColor: 'var(--bg-card, #FFFFFF)',
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '640px',
                    maxHeight: '82vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    border: '1px solid var(--border)',
                    overflow: 'hidden',
                }}
            >
                {/* Header */}
                <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB', flexShrink: 0 }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                {role.name} — Assigned Staff
                            </h3>
                            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                                {loading ? 'Loading staff members...' : `${users.length} staff member${users.length === 1 ? '' : 's'} assigned`}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            padding: '6px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>
                    {removeError && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 14px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', color: '#DC2626', fontSize: '13px', marginBottom: '16px' }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
                                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            {removeError}
                        </div>
                    )}

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>
                            Loading assigned staff...
                        </div>
                    ) : users.length === 0 ? (
                        <div
                            style={{
                                textAlign: 'center',
                                padding: '44px 24px',
                                backgroundColor: 'var(--bg-secondary, #F8FAFC)',
                                borderRadius: '14px',
                                border: '1px dashed var(--border)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '12px',
                            }}
                        >
                            <div
                                style={{
                                    width: '52px',
                                    height: '52px',
                                    borderRadius: '50%',
                                    backgroundColor: '#EFF6FF',
                                    color: '#2563EB',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <line x1="19" y1="8" x2="19" y2="14" />
                                    <line x1="22" y1="11" x2="16" y2="11" />
                                </svg>
                            </div>

                            <div>
                                <div style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>
                                    {role.name === 'Technical Operations' ? 'Reserved System Role' : 'No staff assigned to this role yet'}
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                                    {role.name === 'Technical Operations' 
                                        ? 'Technical Operations is reserved for internal system developers and infrastructure maintenance.'
                                        : 'Add a new staff member to start using this role.'}
                                </div>
                            </div>

                            {onAddStaffForRole && role.name !== 'Technical Operations' && (
                                <button
                                    type="button"
                                    onClick={() => onAddStaffForRole(role.name)}
                                    style={{
                                        marginTop: '6px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '10px 20px',
                                        fontSize: '13.5px',
                                        fontWeight: '600',
                                        borderRadius: '8px',
                                        backgroundColor: '#2563EB',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                                        transition: 'all 0.15s ease',
                                    }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="5" x2="12" y2="19" />
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                    Add Staff to {role.name}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                            {users.map((u) => {
                                const isDefaultAdmin = u.username === 'admin';
                                const isWorking = actionLoadingId === u.id;
                                return (
                                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card, #FFFFFF)', gap: '12px', flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '200px' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '13px', flexShrink: 0 }}>
                                                {(u.full_name || u.name || u.username || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)' }}>{u.full_name || u.name || u.username}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                                                    <span>@{u.username}</span>
                                                    {u.email && <span>• {u.email}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '11.5px', fontWeight: '600', padding: '3px 8px', borderRadius: '6px', backgroundColor: u.status === 'Active' ? '#DCFCE7' : '#F1F5F9', color: u.status === 'Active' ? '#166534' : '#64748B', border: u.status === 'Active' ? '1px solid #BBF7D0' : '1px solid var(--border)' }}>
                                                {u.status || 'Active'}
                                            </span>
                                            {isDefaultAdmin ? (
                                                <span title="System administrator — cannot be removed" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: 'var(--text-muted)', padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                                    </svg>
                                                    Protected
                                                </span>
                                            ) : onRemoveUser ? (
                                                <button type="button" disabled={isWorking} onClick={() => handleRemove(u)} style={{ padding: '6px 14px', fontSize: '12px', fontWeight: '600', borderRadius: '6px', border: '1px solid #FEE2E2', backgroundColor: '#FEF2F2', color: '#DC2626', cursor: isWorking ? 'wait' : 'pointer', transition: 'all 0.15s ease', whiteSpace: 'nowrap' }}>
                                                    {isWorking ? 'Removing...' : 'Remove from Role'}
                                                </button>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer (Only rendered when members exist and role is not Technical Operations) */}
                {users.length > 0 && onAddStaffForRole && role.name !== 'Technical Operations' && (
                    <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', backgroundColor: 'var(--bg-secondary, #F8FAFC)' }}>
                        <button
                            type="button"
                            onClick={() => onAddStaffForRole(role.name)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 18px',
                                fontSize: '13px',
                                fontWeight: '600',
                                borderRadius: '8px',
                                backgroundColor: '#2563EB',
                                color: '#FFFFFF',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Add Staff to {role.name}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
