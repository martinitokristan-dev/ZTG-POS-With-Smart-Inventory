import React from 'react';

/**
 * UserPermissionModal — Customize module & action permissions for a specific user.
 */
export default function UserPermissionModal({
    isOpen,
    onClose,
    onSubmit,
    onReset,
    user,
    userPermissionSummary,
    userOverridesForm,
    setUserOverridesForm,
    modules,
    isSaving,
    overrideError,
    loading,
}) {
    if (!isOpen || !user) return null;

    const moduleKeys = Object.keys(modules || {});
    const baseRole = user.role || 'Cashier';
    const hasCustomOverrides = userPermissionSummary?.has_custom_overrides;

    // Toggle module access
    const handleToggleModuleAccess = (modKey, enabled) => {
        setUserOverridesForm((prev) => {
            const currentMod = prev[modKey] || {};
            return {
                ...prev,
                [modKey]: {
                    ...currentMod,
                    has_access: enabled,
                    can_view: enabled ? (currentMod.can_view ?? true) : false,
                    can_create: enabled ? (currentMod.can_create ?? false) : false,
                    can_edit: enabled ? (currentMod.can_edit ?? false) : false,
                    can_delete: enabled ? (currentMod.can_delete ?? false) : false,
                },
            };
        });
    };

    // Toggle action permission
    const handleToggleAction = (modKey, action, checked) => {
        setUserOverridesForm((prev) => {
            const currentMod = prev[modKey] || {};
            const updatedMod = {
                ...currentMod,
                [action]: checked,
            };

            if (checked) {
                updatedMod.has_access = true;
            }

            return {
                ...prev,
                [modKey]: updatedMod,
            };
        });
    };

    // Toggle Full Access for a module
    const handleToggleFullAccess = (modKey, checked) => {
        setUserOverridesForm((prev) => ({
            ...prev,
            [modKey]: {
                has_access: checked,
                can_view: checked,
                can_create: checked,
                can_edit: checked,
                can_delete: checked,
            },
        }));
    };

    const isAdminUser = baseRole === 'Admin' || baseRole === 'Administrator';

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
                    maxWidth: '920px',
                    maxHeight: '90vh',
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
                        backgroundColor: 'var(--bg-card)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                            style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '8px',
                                backgroundColor: '#EFF6FF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#2563EB',
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                    Permissions: {user.full_name || user.username}
                                </h2>
                                <span
                                    style={{
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        backgroundColor: '#EDE9FE',
                                        color: '#6D28D9',
                                    }}
                                >
                                    Role: {baseRole}
                                </span>
                                {hasCustomOverrides && !isAdminUser && (
                                    <span
                                        style={{
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            backgroundColor: '#FEF3C7',
                                            color: '#92400E',
                                        }}
                                    >
                                        Custom Overrides Active
                                    </span>
                                )}
                            </div>
                            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                                {isAdminUser
                                    ? 'Administrator accounts have permanent superuser access across all modules.'
                                    : 'Tailor this user\'s access. You can grant or revoke specific modules independently of their base role.'}
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

                {/* Body */}
                <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* Admin Banner */}
                        {isAdminUser && (
                            <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                                <span>Administrator accounts possess permanent full access across all system modules and actions. Permissions are locked and cannot be disabled or revoked.</span>
                            </div>
                        )}

                        {overrideError && (
                            <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', fontSize: '13px' }}>
                                {overrideError}
                            </div>
                        )}

                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                Loading user permissions...
                            </div>
                        ) : (
                            <>
                                {/* Info Box */}
                                {!isAdminUser && (
                                    <div
                                        style={{
                                            padding: '12px 16px',
                                            borderRadius: '8px',
                                            backgroundColor: 'var(--bg-secondary)',
                                            border: '1px solid var(--border)',
                                            fontSize: '12.5px',
                                            color: 'var(--text-secondary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                        }}
                                    >
                                        <span>
                                            Editing custom overrides for <strong>{user.full_name || user.username}</strong> (@{user.username}). Unchecked modules will be completely hidden from their sidebar and access will be blocked.
                                        </span>
                                        {hasCustomOverrides && (
                                            <button
                                                type="button"
                                                onClick={onReset}
                                                disabled={isSaving}
                                                style={{
                                                    padding: '4px 10px',
                                                    fontSize: '11.5px',
                                                    fontWeight: '600',
                                                    borderRadius: '6px',
                                                    border: '1px solid #FCA5A5',
                                                    backgroundColor: '#FEF2F2',
                                                    color: '#DC2626',
                                                    cursor: 'pointer',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                Reset to {baseRole} Defaults
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Table Grid */}
                                <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', backgroundColor: 'var(--bg-card)' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                                                <th style={{ padding: '10px 16px', fontWeight: '600', width: '28%' }}>Module</th>
                                                <th style={{ padding: '10px 12px', fontWeight: '600', textAlign: 'center', width: '14%' }}>Module Access</th>
                                                <th style={{ padding: '10px 10px', fontWeight: '600', textAlign: 'center', width: '12%' }}>View (Read)</th>
                                                <th style={{ padding: '10px 10px', fontWeight: '600', textAlign: 'center', width: '12%' }}>Create (Write)</th>
                                                <th style={{ padding: '10px 10px', fontWeight: '600', textAlign: 'center', width: '12%' }}>Edit (Update)</th>
                                                <th style={{ padding: '10px 10px', fontWeight: '600', textAlign: 'center', width: '12%' }}>Delete</th>
                                                <th style={{ padding: '10px 12px', fontWeight: '600', textAlign: 'center', width: '12%' }}>Full Access</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {moduleKeys.map((modKey) => {
                                                const rawMod = modules[modKey];
                                                const modInfo = typeof rawMod === 'object' && rawMod !== null ? rawMod : { label: rawMod || modKey, description: '' };
                                                const perm = userOverridesForm[modKey] || {
                                                    has_access: false,
                                                    can_view: false,
                                                    can_create: false,
                                                    can_edit: false,
                                                    can_delete: false,
                                                };

                                                const isAccessOn = isAdminUser ? true : perm.has_access;
                                                const isAllActionsChecked = isAdminUser ? true : (perm.has_access && perm.can_view && perm.can_create && perm.can_edit && perm.can_delete);

                                                return (
                                                    <tr 
                                                        key={modKey}
                                                        style={{
                                                            borderBottom: '1px solid var(--border)',
                                                            backgroundColor: isAccessOn ? 'transparent' : 'rgba(241, 245, 249, 0.4)',
                                                        }}
                                                    >
                                                        {/* Module Label */}
                                                        <td style={{ padding: '12px 16px' }}>
                                                            <div style={{ fontWeight: '600', color: isAccessOn ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                                                {modInfo.label}
                                                            </div>
                                                            {modInfo.description && (
                                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                                    {modInfo.description}
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* Layer 1: Module Access Switch */}
                                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                                            <input
                                                                type="checkbox"
                                                                disabled={isAdminUser}
                                                                checked={isAdminUser ? true : isAccessOn}
                                                                onChange={(e) => handleToggleModuleAccess(modKey, e.target.checked)}
                                                                style={{
                                                                    width: '18px',
                                                                    height: '18px',
                                                                    accentColor: '#2563EB',
                                                                    cursor: isAdminUser ? 'not-allowed' : 'pointer',
                                                                    opacity: isAdminUser ? 0.7 : 1,
                                                                }}
                                                            />
                                                        </td>

                                                        {/* Layer 2: View */}
                                                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                                            <input
                                                                type="checkbox"
                                                                disabled={isAdminUser || !isAccessOn}
                                                                checked={isAdminUser ? true : Boolean(isAccessOn && perm.can_view)}
                                                                onChange={(e) => handleToggleAction(modKey, 'can_view', e.target.checked)}
                                                                style={{
                                                                    width: '16px',
                                                                    height: '16px',
                                                                    accentColor: '#2563EB',
                                                                    cursor: (isAdminUser || !isAccessOn) ? 'not-allowed' : 'pointer',
                                                                    opacity: isAdminUser ? 0.7 : (isAccessOn ? 1 : 0.4),
                                                                }}
                                                            />
                                                        </td>

                                                        {/* Layer 2: Create */}
                                                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                                            <input
                                                                type="checkbox"
                                                                disabled={isAdminUser || !isAccessOn}
                                                                checked={isAdminUser ? true : Boolean(isAccessOn && perm.can_create)}
                                                                onChange={(e) => handleToggleAction(modKey, 'can_create', e.target.checked)}
                                                                style={{
                                                                    width: '16px',
                                                                    height: '16px',
                                                                    accentColor: '#2563EB',
                                                                    cursor: (isAdminUser || !isAccessOn) ? 'not-allowed' : 'pointer',
                                                                    opacity: isAdminUser ? 0.7 : (isAccessOn ? 1 : 0.4),
                                                                }}
                                                            />
                                                        </td>

                                                        {/* Layer 2: Edit */}
                                                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                                            <input
                                                                type="checkbox"
                                                                disabled={isAdminUser || !isAccessOn}
                                                                checked={isAdminUser ? true : Boolean(isAccessOn && perm.can_edit)}
                                                                onChange={(e) => handleToggleAction(modKey, 'can_edit', e.target.checked)}
                                                                style={{
                                                                    width: '16px',
                                                                    height: '16px',
                                                                    accentColor: '#2563EB',
                                                                    cursor: (isAdminUser || !isAccessOn) ? 'not-allowed' : 'pointer',
                                                                    opacity: isAdminUser ? 0.7 : (isAccessOn ? 1 : 0.4),
                                                                }}
                                                            />
                                                        </td>

                                                        {/* Layer 2: Delete */}
                                                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                                            <input
                                                                type="checkbox"
                                                                disabled={isAdminUser || !isAccessOn}
                                                                checked={isAdminUser ? true : Boolean(isAccessOn && perm.can_delete)}
                                                                onChange={(e) => handleToggleAction(modKey, 'can_delete', e.target.checked)}
                                                                style={{
                                                                    width: '16px',
                                                                    height: '16px',
                                                                    accentColor: '#2563EB',
                                                                    cursor: (isAdminUser || !isAccessOn) ? 'not-allowed' : 'pointer',
                                                                    opacity: isAdminUser ? 0.7 : (isAccessOn ? 1 : 0.4),
                                                                }}
                                                            />
                                                        </td>

                                                        {/* Full Access Column */}
                                                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                                            <input
                                                                type="checkbox"
                                                                disabled={isAdminUser}
                                                                checked={isAdminUser ? true : isAllActionsChecked}
                                                                onChange={(e) => handleToggleFullAccess(modKey, e.target.checked)}
                                                                style={{
                                                                    width: '16px',
                                                                    height: '16px',
                                                                    accentColor: '#16A34A',
                                                                    cursor: isAdminUser ? 'not-allowed' : 'pointer',
                                                                    opacity: isAdminUser ? 0.7 : 1,
                                                                }}
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div
                        style={{
                            padding: '16px 24px',
                            borderTop: '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: '12px',
                            backgroundColor: 'var(--bg-card)',
                        }}
                    >
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-secondary"
                            disabled={isSaving}
                            style={{
                                padding: '8px 16px',
                                fontSize: '13px',
                                fontWeight: '600',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--bg-card)',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                            }}
                        >
                            {isAdminUser ? 'Close' : 'Cancel'}
                        </button>
                        {!isAdminUser && (
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={isSaving}
                                style={{
                                    padding: '8px 20px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: '#2563EB',
                                    color: '#FFFFFF',
                                    cursor: isSaving ? 'wait' : 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                {isSaving && (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
                                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                                        <path d="M12 2a10 10 0 0 1 10 10" />
                                    </svg>
                                )}
                                <span>Save Overrides</span>
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
