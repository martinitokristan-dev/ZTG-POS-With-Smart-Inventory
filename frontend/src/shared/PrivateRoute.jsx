import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

/**
 * PrivateRoute — Guards routes based on:
 * 1. Authentication token & user session presence.
 * 2. Role allowlist (`allowedRoles`).
 * 3. Granular Module Permission (`requiredModule` & `action`).
 *
 * If unauthorized, immediately redirects the user to their default permitted landing page.
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

    // Helper: Determine fallback landing page for unauthorized redirection
    const getFallbackRoute = () => {
        if (isAdmin) return '/dashboard';
        if (user.role === 'Cashier') return '/pos';
        if (user.role === 'Technical Operations' || user.role === 'Supervisor') return '/system-status';
        if (user.role === 'Checker') return '/inventory';
        return '/login';
    };

    // 1. Role allowlist check
    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return <Navigate to="/unauthorized" replace />;
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
