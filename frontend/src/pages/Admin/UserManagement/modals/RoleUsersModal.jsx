import React from 'react';

/**
 * RoleUsersModal — View and manage list of staff users currently assigned to a role.
 */
export default function RoleUsersModal({
    isOpen,
    onClose,
    role,
    users = [],
    loading = false,
    onAddStaffForRole,
}) {
    if (!isOpen || !role) return null;

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
                    borderRadius: '14px',
                    width: '100%',
                    maxWidth: '560px',
                    maxHeight: '80vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    border: '1px solid var(--border)',
                    overflow: 'hidden',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                            style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '8px',
                                backgroundColor: '#EFF6FF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#2563EB',
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                Users with Role: {role.name}
                            </h3>
                            <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-muted)' }}>
                                {users.length} staff member(s) assigned
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
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '16px 20px', flex: 1, overflowY: 'auto' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                            Loading assigned users...
                        </div>
                    ) : users.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>
                            No users currently assigned to this role.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {users.map((u) => (
                                <div
                                    key={u.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--bg-secondary)',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div
                                            style={{
                                                width: '30px',
                                                height: '30px',
                                                borderRadius: '50%',
                                                backgroundColor: '#EFF6FF',
                                                color: '#2563EB',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: '700',
                                                fontSize: '11px',
                                                flexShrink: 0,
                                            }}
                                        >
                                            {(u.full_name || u.name || u.username || 'U').charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '600', fontSize: '13.5px', color: 'var(--text-primary)' }}>
                                                {u.full_name || u.name || u.username}
                                            </div>
                                            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', gap: '10px', marginTop: '2px' }}>
                                                <span>@{u.username}</span>
                                                {u.email && <span>• {u.email}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <span
                                        style={{
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            padding: '3px 8px',
                                            borderRadius: '6px',
                                            backgroundColor: u.status === 'Active' ? '#DCFCE7' : '#F1F5F9',
                                            color: u.status === 'Active' ? '#166534' : '#64748B',
                                        }}
                                    >
                                        {u.status || 'Active'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div
                    style={{
                        padding: '12px 20px',
                        borderTop: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    {onAddStaffForRole ? (
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                if (onAddStaffForRole) onAddStaffForRole(role);
                            }}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '7px 14px',
                                fontSize: '12.5px',
                                fontWeight: '600',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: '#2563EB',
                                color: '#FFFFFF',
                                cursor: 'pointer',
                            }}
                        >
                            <span>Register Staff with this Role</span>
                        </button>
                    ) : <div />}

                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: '7px 16px',
                            fontSize: '13px',
                            fontWeight: '600',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--bg-card)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
