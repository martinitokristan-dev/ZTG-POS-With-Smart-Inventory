import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

/**
 * Helper: Determine default permitted landing page based on role and granular module permissions.
 */
export const getFirstPermittedRoute = (user) => {
    if (!user) return '/login';
    const role = user.role || '';
    if (role === 'Admin' || role === 'Administrator') return '/dashboard';

    const perms = user.permissions || {};
    
    // Check modules in prioritized sequence
    if (perms.dashboard?.has_access) return '/dashboard';
    if (perms.system_status?.has_access) return '/system-status';
    if (perms.pos?.has_access) return '/pos';
    if (perms.inventory?.has_access) return '/inventory';
    if (perms.products?.has_access) return '/product-management';
    if (perms.reservations?.has_access) return '/reservations';
    if (perms.sales_log?.has_access) return '/sales-log';
    if (perms.reports?.has_access) return '/reports';
    if (perms.history_logs?.has_access) return '/history-logs';
    if (perms.user_management?.has_access) return '/user-management';
    if (perms.settings?.has_access) return '/settings';

    // Role-based fallbacks for standard system roles
    const normRole = role.toLowerCase();
    if (normRole === 'cashier') return '/pos';
    if (normRole.includes('tech') || normRole === 'technical operations') return '/system-status';
    if (normRole === 'checker') return '/inventory';
    if (normRole === 'supervisor') return '/dashboard';

    return '/settings';
};

/**
 * PrivateRoute — Guards routes based on:
 * 1. Authentication token & user session presence.
 * 2. Granular Module Permission (`requiredModule` & `action`).
 * 3. Role allowlist (`allowedRoles`), with bypass if user possesses dynamic module permission.
 *
 * If unauthorized, immediately redirects the user to 403 / unpermitted landing page.
 */
function PrivateRoute({ children, allowedRoles, requiredModule, action = 'can_view' }) {
    const token = (sessionStorage.getItem('auth_token') ?? localStorage.getItem('auth_token'));
    const userStr = (sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'));

    if (!token || !userStr) {
        return <Navigate to="/login" replace />;
    }

    let user;
    try {
        user = JSON.parse(userStr);
    } catch {
        return <Navigate to="/login" replace />;
    }

    const isAdmin = user.role === 'Admin' || user.role === 'Administrator';

    // 1. Role allowlist check (Non-Admin users with granular module permission are granted access)
    if (allowedRoles && allowedRoles.length > 0 && !isAdmin) {
        const normRole = (user.role || '').toLowerCase();
        const matchesRole = allowedRoles.some(r => {
            const nr = r.toLowerCase();
            return nr === normRole || (nr.includes('tech') && normRole.includes('tech'));
        });

        const hasModuleAccess = requiredModule ? Boolean(user.permissions?.[requiredModule]?.has_access) : false;

        if (!matchesRole && !hasModuleAccess) {
            return <Navigate to="/unauthorized" replace />;
        }
    }

    // 2. Granular Module Permission check (Non-Admin users checked against permissions matrix)
    if (requiredModule && !isAdmin) {
        const userPerms = user.permissions || {};
        const modPerm = userPerms[requiredModule];

        // If module is unselected / has_access is false / action is false -> BLOCK ACCESS to 403!
        const hasAccess = Boolean(modPerm && modPerm.has_access);
        const hasAction = action ? Boolean(modPerm && modPerm[action]) : true;

        if (!hasAccess || !hasAction) {
            console.warn(`[Access Denied 403] User '${user.username}' (${user.role}) lacks permission for [${requiredModule}:${action}].`);
            return <Navigate to="/unauthorized" replace />;
        }
    }

    // If used as layout route wrapper (no explicit children), render Outlet
    return children ?? <Outlet />;
}

export default PrivateRoute;
