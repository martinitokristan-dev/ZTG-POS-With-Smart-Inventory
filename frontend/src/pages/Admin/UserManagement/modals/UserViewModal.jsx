import React from 'react';
import api from '../../../../shared/api';

/**
 * UserViewModal — Clean read-only inspection modal for a staff user profile & effective permissions.
 * Dynamically fetches live effective permissions from the database and matches RoleViewModal with 100% precision.
 */
export default function UserViewModal({
    isOpen,
    onClose,
    user,
    modules = {},
    roles = [],
    onEdit,
    onCustomizePermissions,
}) {
    const [livePerms, setLivePerms] = React.useState(null);
    const [loadingPerms, setLoadingPerms] = React.useState(false);

    // Fetch live user permissions summary from the backend whenever the modal is opened
    React.useEffect(() => {
        if (isOpen && user?.id) {
            setLoadingPerms(true);
            api.get(`/users/${user.id}/permissions`)
                .then((res) => {
                    setLivePerms(res.data.effective_permissions || {});
                })
                .catch((err) => {
                    console.error('Failed to load user effective permissions:', err);
                })
                .finally(() => {
                    setLoadingPerms(false);
                });
        } else {
            setLivePerms(null);
        }
    }, [isOpen, user?.id]);

    if (!isOpen || !user) return null;

    // Instant fallback: resolve from active roles list in memory
    const baseRole = roles.find((r) => r.name === user.role);
    const baseRolePermsMap = {};
    if (baseRole && Array.isArray(baseRole.permissions)) {
        baseRole.permissions.forEach((p) => {
            baseRolePermsMap[p.module] = p;
        });
    }

    // Effective permissions dictionary
    const userPerms = livePerms || (user.permissions && typeof user.permissions === 'object' && !Array.isArray(user.permissions) ? user.permissions : baseRolePermsMap);

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
                    maxWidth: '840px',
                    maxHeight: '88vh',
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
                        padding: '18px 24px',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                            {user.full_name || user.name || user.username}
                        </h3>
                        <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                            @{user.username} • {user.role}
                        </p>
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
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>
                    {/* User Details Grid */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '14px',
                            padding: '16px',
                            backgroundColor: 'var(--bg-secondary, #F8FAFC)',
                            borderRadius: '12px',
                            border: '1px solid var(--border)',
                            marginBottom: '20px',
                        }}
                    >
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Email Address
                            </div>
                            <div style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--text-primary)', marginTop: '3px' }}>
                                {user.email || user.user_profile?.email || '—'}
                            </div>
                        </div>

                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Phone Number
                            </div>
                            <div style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--text-primary)', marginTop: '3px' }}>
                                {user.phone_number || '—'}
                            </div>
                        </div>

                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Assigned Role
                            </div>
                            <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#2563EB', marginTop: '3px' }}>
                                {user.role}
                            </div>
                        </div>

                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Account Status
                            </div>
                            <div style={{ fontSize: '13.5px', fontWeight: '600', marginTop: '3px', color: user.status === 'Active' ? '#16A34A' : (!user.email_verified_at ? '#D97706' : '#DC2626') }}>
                                {!user.email_verified_at ? 'Unverified' : (user.status || 'Active')}
                            </div>
                        </div>
                    </div>

                    {/* Permissions Overview */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                            Module Permissions Summary
                        </div>
                        {loadingPerms && (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                Updating live permissions...
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                        {Object.keys(modules).map((modKey) => {
                            const modObj = modules[modKey];
                            const modLabel = typeof modObj === 'object' && modObj !== null ? (modObj.label || modKey) : (modObj || modKey);
                            const perm = userPerms[modKey];
                            const hasAccess = user.role === 'Admin' || Boolean(perm?.has_access);

                            const actions = [];
                            if (user.role === 'Admin') {
                                actions.push('Full Access');
                            } else if (hasAccess && perm) {
                                if (perm.can_view) actions.push('View');
                                if (perm.can_create) actions.push('Create');
                                if (perm.can_edit) actions.push('Edit');
                                if (perm.can_delete) actions.push('Delete');
                            }

                            return (
                                <div
                                    key={modKey}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '12px 14px',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: hasAccess ? 'var(--bg-card, #FFFFFF)' : 'var(--bg-secondary, #F8FAFC)',
                                        minHeight: '52px',
                                    }}
                                >
                                    <div style={{ minWidth: 0, flex: 1, paddingRight: '10px' }}>
                                        <div style={{ fontWeight: '600', fontSize: '13.5px', color: hasAccess ? 'var(--text-primary)' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {modLabel}
                                        </div>
                                        {hasAccess && actions.length > 0 && (
                                            <div style={{ fontSize: '11.5px', color: '#2563EB', marginTop: '3px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {actions.join(' • ')}
                                            </div>
                                        )}
                                    </div>

                                    <span
                                        style={{
                                            fontSize: '11.5px',
                                            fontWeight: '600',
                                            padding: '3px 8px',
                                            borderRadius: '6px',
                                            backgroundColor: hasAccess ? '#F1F5F9' : 'transparent',
                                            color: hasAccess ? 'var(--text-primary)' : 'var(--text-muted)',
                                            border: hasAccess ? '1px solid var(--border)' : 'none',
                                            whiteSpace: 'nowrap',
                                            flexShrink: 0,
                                        }}
                                    >
                                        {hasAccess ? (user.role === 'Admin' ? 'Full Access' : 'Allowed') : 'No Access'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer — Edit Profile aligned to the right */}
                {onEdit && (
                    <div
                        style={{
                            padding: '14px 24px',
                            borderTop: '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: '10px',
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                onEdit(user);
                            }}
                            style={{
                                padding: '8px 18px',
                                fontSize: '13px',
                                fontWeight: '600',
                                borderRadius: '8px',
                                border: '1px solid #DBEAFE',
                                backgroundColor: '#EFF6FF',
                                color: '#2563EB',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            Edit Profile
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
