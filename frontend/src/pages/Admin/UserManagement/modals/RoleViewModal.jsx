import React from 'react';

/**
 * RoleViewModal — Clean read-only inspection modal for a role and its permissions.
 */
export default function RoleViewModal({
    isOpen,
    onClose,
    role,
    modules = {},
    onEdit,
}) {
    if (!isOpen || !role) return null;

    const rolePermsMap = React.useMemo(() => {
        const map = {};
        (role.permissions || []).forEach((p) => {
            map[p.module] = p;
        });
        return map;
    }, [role]);

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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                {role.name}
                            </h3>
                            {role.is_system && (
                                <span
                                    style={{
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        padding: '2.5px 7px',
                                        borderRadius: '4px',
                                        backgroundColor: '#F1F5F9',
                                        color: '#64748B',
                                        letterSpacing: '0.04em',
                                    }}
                                >
                                    SYSTEM
                                </span>
                            )}
                        </div>
                        <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                            {role.description || 'No description provided.'}
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

                {/* Body / Permissions List */}
                <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px' }}>
                        Module Permissions Summary
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                        {Object.keys(modules).map((modKey) => {
                            const modObj = modules[modKey];
                            const modLabel = typeof modObj === 'object' && modObj !== null ? (modObj.label || modKey) : (modObj || modKey);
                            const perm = rolePermsMap[modKey];
                            const isTechRole = role.name === 'Technical Operations' || (typeof role.name === 'string' && role.name.toLowerCase().includes('tech'));
                            const isAdminRole = role.name === 'Admin' || role.name === 'Administrator';

                            // system_status is exclusively reserved for Technical Operations
                            let hasAccess = false;
                            if (modKey === 'system_status') {
                                hasAccess = isTechRole || (!isAdminRole && Boolean(perm?.has_access));
                            } else if (isAdminRole) {
                                hasAccess = true;
                            } else {
                                hasAccess = Boolean(perm?.has_access);
                            }

                            const isFullAccess =
                                (isAdminRole && modKey !== 'system_status') ||
                                (isTechRole && modKey === 'system_status') ||
                                (role.name === 'Cashier' && ['pos', 'reservations', 'sales_log'].includes(modKey)) ||
                                (perm && perm.can_view && perm.can_create && perm.can_edit && perm.can_delete);

                            const actions = [];
                            if (hasAccess) {
                                if (isAdminRole && modKey !== 'system_status') {
                                    actions.push('Full Access');
                                } else if (isTechRole && modKey === 'system_status') {
                                    actions.push('Full Access');
                                } else if (role.name === 'Cashier' && ['pos', 'reservations', 'sales_log'].includes(modKey)) {
                                    actions.push('Full Access');
                                } else if (perm) {
                                    if (perm.can_view) actions.push('View');
                                    if (perm.can_create) actions.push('Create');
                                    if (perm.can_edit) actions.push('Edit');
                                    if (perm.can_delete) actions.push('Delete');
                                }
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
                                        {hasAccess && actions.length > 0 ? (
                                            <div style={{ fontSize: '11.5px', color: '#2563EB', marginTop: '3px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {actions.join(' • ')}
                                            </div>
                                        ) : (
                                            modKey === 'system_status' && !hasAccess && (
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                    Exclusive to Tech Ops
                                                </div>
                                            )
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
                                        {hasAccess ? (isFullAccess ? 'Full Access' : 'Allowed') : 'No Access'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer — Edit Role Permissions only shown for custom non-system roles */}
                {onEdit && !role.is_system && (
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
                                onEdit(role);
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
                            Edit Role Permissions
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
