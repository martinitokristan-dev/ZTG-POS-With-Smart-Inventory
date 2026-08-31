import { useMemo } from 'react';

/**
 * Universal hook to evaluate granular module permissions for the active authenticated user.
 * 
 * @param {string} moduleKey - The key of the module (e.g. 'products', 'inventory', 'pos', 'user_management', 'history_logs', 'sales_log', 'reports', 'settings', 'system_status', 'reservations')
 * @returns {{
 *   hasAccess: boolean,
 *   canView: boolean,
 *   canCreate: boolean,
 *   canEdit: boolean,
 *   canDelete: boolean,
 *   isReadOnly: boolean,
 *   isAdmin: boolean
 * }}
 */
export function useModulePermission(moduleKey) {
    const user = useMemo(() => {
        try {
            return JSON.parse(sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'));
        } catch {
            return null;
        }
    }, []);

    const isAdmin = user?.role === 'Admin' || user?.role === 'Administrator';

    if (!user) {
        return {
            hasAccess: false,
            canView: false,
            canCreate: false,
            canEdit: false,
            canDelete: false,
            isReadOnly: true,
            isAdmin: false,
        };
    }

    // System Admins have unrestricted full access to all system actions
    if (isAdmin) {
        return {
            hasAccess: true,
            canView: true,
            canCreate: true,
            canEdit: true,
            canDelete: true,
            isReadOnly: false,
            isAdmin: true,
        };
    }

    const perms = user.permissions?.[moduleKey] || {};
    const hasAccess = Boolean(perms.has_access);
    const canView = hasAccess && Boolean(perms.can_view ?? true);
    const canCreate = hasAccess && Boolean(perms.can_create);
    const canEdit = hasAccess && Boolean(perms.can_edit);
    const canDelete = hasAccess && Boolean(perms.can_delete);
    const isReadOnly = hasAccess && canView && !canCreate && !canEdit && !canDelete;

    return {
        hasAccess,
        canView,
        canCreate,
        canEdit,
        canDelete,
        isReadOnly,
        isAdmin: false,
    };
}
