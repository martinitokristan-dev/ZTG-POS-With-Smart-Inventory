import React from 'react';

/**
 * RoleModal — Create / Edit Role with two-layer Module & Action Permissions Matrix.
 */
export default function RoleModal({
    isOpen,
    onClose,
    onSubmit,
    editingRole,
    roleForm,
    setRoleForm,
    modules,
    formErrors,
    isSaving,
}) {
    if (!isOpen) return null;

    const moduleKeys = Object.keys(modules || {});

    // Helper to toggle whole module access (Layer 1)
    const handleToggleModuleAccess = (modKey, enabled) => {
        setRoleForm((prev) => {
            const currentMod = prev.permissions[modKey] || {};
            return {
                ...prev,
                permissions: {
                    ...prev.permissions,
                    [modKey]: {
                        ...currentMod,
                        has_access: enabled,
                        // If turning off access, disable actions
                        can_view: enabled ? (currentMod.can_view ?? true) : false,
                        can_create: enabled ? (currentMod.can_create ?? false) : false,
                        can_edit: enabled ? (currentMod.can_edit ?? false) : false,
                        can_delete: enabled ? (currentMod.can_delete ?? false) : false,
                    },
                },
            };
        });
    };

    // Helper to toggle individual action checkbox (Layer 2)
    const handleToggleAction = (modKey, action, checked) => {
        setRoleForm((prev) => {
            const currentMod = prev.permissions[modKey] || {};
            const updatedMod = {
                ...currentMod,
                [action]: checked,
            };

            // If any action is checked, ensure has_access is true
            if (checked) {
                updatedMod.has_access = true;
            }

            return {
                ...prev,
                permissions: {
                    ...prev.permissions,
                    [modKey]: updatedMod,
                },
            };
        });
    };

    // Helper for "Full Access" master toggle per module
    const handleToggleFullAccess = (modKey, checked) => {
        setRoleForm((prev) => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [modKey]: {
                    has_access: checked,
                    can_view: checked,
                    can_create: checked,
                    can_edit: checked,
                    can_delete: checked,
                },
            },
        }));
    };

    // "Select All Modules (Full System Access)"
    const handleSelectAllAll = () => {
        const fullPerms = {};
        moduleKeys.forEach((modKey) => {
            fullPerms[modKey] = {
                has_access: true,
                can_view: true,
                can_create: true,
                can_edit: true,
                can_delete: true,
            };
        });
        setRoleForm((prev) => ({ ...prev, permissions: fullPerms }));
    };

    // "Clear All Permissions"
    const handleClearAll = () => {
        const clearedPerms = {};
        moduleKeys.forEach((modKey) => {
            clearedPerms[modKey] = {
                has_access: false,
                can_view: false,
                can_create: false,
                can_edit: false,
                can_delete: false,
            };
        });
        setRoleForm((prev) => ({ ...prev, permissions: clearedPerms }));
    };

    const isAdminRole = editingRole?.name === 'Admin' || editingRole?.name === 'Administrator' || roleForm.name === 'Admin';

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
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                backgroundColor: '#EFF6FF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#2563EB',
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            </svg>
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                {editingRole ? `Edit Role: ${editingRole.name}` : 'Create New Role'}
                            </h2>
                            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                                Configure module visibility and granular action permissions for this role.
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
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Form Body (Scrollable) */}
                <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        
                        {/* Admin Notice Banner */}
                        {isAdminRole && (
                            <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                                <span>The <strong>Administrator</strong> system role has permanent full access across all modules and actions. Permissions are locked and cannot be disabled or unchecked.</span>
                            </div>
                        )}

                        {/* Error Alert */}
                        {formErrors.general && (
                            <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', fontSize: '13px' }}>
                                {formErrors.general}
                            </div>
                        )}

                        {/* Basic Role Info Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                            <div>
                                <label className="form-label" style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px', display: 'block' }}>
                                    Role Name <span style={{ color: '#DC2626' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="e.g. Warehouse Staff, Inventory Specialist"
                                    value={roleForm.name}
                                    disabled={editingRole?.is_system}
                                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '9px 12px',
                                        fontSize: '13.5px',
                                        borderRadius: '8px',
                                        border: formErrors.name ? '1px solid #DC2626' : '1px solid var(--border)',
                                        backgroundColor: editingRole?.is_system ? 'var(--bg-secondary)' : 'var(--bg-card)',
                                        color: 'var(--text-primary)',
                                    }}
                                />
                                {formErrors.name && (
                                    <span style={{ color: '#DC2626', fontSize: '11.5px', marginTop: '4px', display: 'block' }}>
                                        {Array.isArray(formErrors.name) ? formErrors.name[0] : formErrors.name}
                                    </span>
                                )}
                                {editingRole?.is_system && (
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                                        System role names are protected and cannot be modified.
                                    </span>
                                )}
                            </div>

                            <div>
                                <label className="form-label" style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px', display: 'block' }}>
                                    Description
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Brief description of the responsibilities and scope of this role"
                                    value={roleForm.description}
                                    onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '9px 12px',
                                        fontSize: '13.5px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--bg-card)',
                                        color: 'var(--text-primary)',
                                    }}
                                />
                            </div>
                        </div>

                        {/* Permissions Matrix Header with Quick-Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                    Module & Action Permissions Matrix
                                </h3>
                                <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-muted)' }}>
                                    {isAdminRole
                                        ? 'Administrator permissions are permanently enabled across all modules.'
                                        : 'Toggle module visibility ON to enable granular action permissions.'}
                                </p>
                            </div>
                            {!isAdminRole && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        type="button"
                                        onClick={handleSelectAllAll}
                                        style={{
                                            padding: '5px 10px',
                                            fontSize: '11.5px',
                                            fontWeight: '600',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border)',
                                            backgroundColor: 'var(--bg-card)',
                                            color: '#2563EB',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Select All Modules
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleClearAll}
                                        style={{
                                            padding: '5px 10px',
                                            fontSize: '11.5px',
                                            fontWeight: '600',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border)',
                                            backgroundColor: 'var(--bg-card)',
                                            color: 'var(--text-muted)',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Clear All
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Permissions Table Grid */}
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
                                        const perm = roleForm.permissions[modKey] || {
                                            has_access: false,
                                            can_view: false,
                                            can_create: false,
                                            can_edit: false,
                                            can_delete: false,
                                        };

                                        const isAccessOn = isAdminRole ? true : perm.has_access;
                                        const isAllActionsChecked = isAdminRole ? true : (perm.has_access && perm.can_view && perm.can_create && perm.can_edit && perm.can_delete);

                                        return (
                                            <tr 
                                                key={modKey}
                                                style={{
                                                    borderBottom: '1px solid var(--border)',
                                                    backgroundColor: isAccessOn ? 'transparent' : 'rgba(241, 245, 249, 0.4)',
                                                    transition: 'background-color 0.15s ease',
                                                }}
                                            >
                                                {/* Module Label & Description */}
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
                                                    <label style={{ display: 'inline-flex', alignItems: 'center', cursor: isAdminRole ? 'not-allowed' : 'pointer' }}>
                                                        <input
                                                            type="checkbox"
                                                            disabled={isAdminRole}
                                                            checked={isAdminRole ? true : isAccessOn}
                                                            onChange={(e) => handleToggleModuleAccess(modKey, e.target.checked)}
                                                            style={{
                                                                width: '18px',
                                                                height: '18px',
                                                                accentColor: '#2563EB',
                                                                cursor: isAdminRole ? 'not-allowed' : 'pointer',
                                                                opacity: isAdminRole ? 0.7 : 1,
                                                            }}
                                                        />
                                                    </label>
                                                </td>

                                                {/* Layer 2: View Checkbox */}
                                                <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                                    <input
                                                        type="checkbox"
                                                        disabled={isAdminRole || !isAccessOn}
                                                        checked={isAdminRole ? true : Boolean(isAccessOn && perm.can_view)}
                                                        onChange={(e) => handleToggleAction(modKey, 'can_view', e.target.checked)}
                                                        style={{
                                                            width: '16px',
                                                            height: '16px',
                                                            accentColor: '#2563EB',
                                                            cursor: (isAdminRole || !isAccessOn) ? 'not-allowed' : 'pointer',
                                                            opacity: isAdminRole ? 0.7 : (isAccessOn ? 1 : 0.4),
                                                        }}
                                                    />
                                                </td>

                                                {/* Layer 2: Create Checkbox */}
                                                <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                                    <input
                                                        type="checkbox"
                                                        disabled={isAdminRole || !isAccessOn}
                                                        checked={isAdminRole ? true : Boolean(isAccessOn && perm.can_create)}
                                                        onChange={(e) => handleToggleAction(modKey, 'can_create', e.target.checked)}
                                                        style={{
                                                            width: '16px',
                                                            height: '16px',
                                                            accentColor: '#2563EB',
                                                            cursor: (isAdminRole || !isAccessOn) ? 'not-allowed' : 'pointer',
                                                            opacity: isAdminRole ? 0.7 : (isAccessOn ? 1 : 0.4),
                                                        }}
                                                    />
                                                </td>

                                                {/* Layer 2: Edit Checkbox */}
                                                <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                                    <input
                                                        type="checkbox"
                                                        disabled={isAdminRole || !isAccessOn}
                                                        checked={isAdminRole ? true : Boolean(isAccessOn && perm.can_edit)}
                                                        onChange={(e) => handleToggleAction(modKey, 'can_edit', e.target.checked)}
                                                        style={{
                                                            width: '16px',
                                                            height: '16px',
                                                            accentColor: '#2563EB',
                                                            cursor: (isAdminRole || !isAccessOn) ? 'not-allowed' : 'pointer',
                                                            opacity: isAdminRole ? 0.7 : (isAccessOn ? 1 : 0.4),
                                                        }}
                                                    />
                                                </td>

                                                {/* Layer 2: Delete Checkbox */}
                                                <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                                    <input
                                                        type="checkbox"
                                                        disabled={isAdminRole || !isAccessOn}
                                                        checked={isAdminRole ? true : Boolean(isAccessOn && perm.can_delete)}
                                                        onChange={(e) => handleToggleAction(modKey, 'can_delete', e.target.checked)}
                                                        style={{
                                                            width: '16px',
                                                            height: '16px',
                                                            accentColor: '#2563EB',
                                                            cursor: (isAdminRole || !isAccessOn) ? 'not-allowed' : 'pointer',
                                                            opacity: isAdminRole ? 0.7 : (isAccessOn ? 1 : 0.4),
                                                        }}
                                                    />
                                                </td>

                                                {/* Full Access Quick Column */}
                                                <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                                    <input
                                                        type="checkbox"
                                                        disabled={isAdminRole}
                                                        checked={isAdminRole ? true : isAllActionsChecked}
                                                        onChange={(e) => handleToggleFullAccess(modKey, e.target.checked)}
                                                        style={{
                                                            width: '16px',
                                                            height: '16px',
                                                            accentColor: '#16A34A',
                                                            cursor: isAdminRole ? 'not-allowed' : 'pointer',
                                                            opacity: isAdminRole ? 0.7 : 1,
                                                        }}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Footer Actions */}
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
                            Cancel
                        </button>
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
                            <span>{editingRole ? 'Save Changes' : 'Create Role'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
