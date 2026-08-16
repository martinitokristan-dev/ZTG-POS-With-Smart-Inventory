import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

/**
 * PrivateRoute — supports two usage modes:
 *
 * 1. Layout route mode (no children prop): renders <Outlet /> for nested routes.
 *    Used by AppShell wrapper in app.jsx.
 *    e.g. <Route element={<PrivateRoute><AppShell /></PrivateRoute>}>
 *
 * 2. Page wrapper mode (with children): renders children if auth+role passes.
 *    e.g. <PrivateRoute allowedRoles={['Admin']}><Dashboard /></PrivateRoute>
 */
function PrivateRoute({ children, allowedRoles }) {
    const token = (sessionStorage.getItem('auth_token') ?? localStorage.getItem('auth_token'));
    const userStr = (sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'));

    if (!token || !userStr) {
        return <Navigate to="/login" replace />;
    }

    const user = JSON.parse(userStr);

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Redirect to default role-based route if unauthorized
        if (user.role === 'Admin' || user.role === 'Supervisor') {
            return <Navigate to="/dashboard" replace />;
        } else if (user.role === 'Cashier') {
            return <Navigate to="/pos" replace />;
        } else if (user.role === 'Checker') {
            return <Navigate to="/inventory" replace />;
        }
        return <Navigate to="/login" replace />;
    }

    // If used as layout route wrapper (no explicit children), render Outlet
    return children ?? <Outlet />;
}

export default PrivateRoute;
