import './bootstrap';
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';

import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyCredentials from './pages/Auth/VerifyCredentials';
import PrivateRoute from './shared/PrivateRoute';
import AppShell from './shared/AppShell';

import Dashboard from './pages/Admin/Dashboard/index.jsx';
import ProductManagement from './pages/Admin/ProductManagement/index.jsx';
import Settings from './pages/Admin/Settings/index.jsx';
import Inventory from './pages/Admin/Inventory/index.jsx';
import Reservations from './pages/Admin/Reservations/index.jsx';
import HistoryLogs from './pages/Admin/HistoryLogs/index.jsx';
import SalesLog from './pages/Admin/SalesLog/index.jsx';
import Reports from './pages/Admin/Reports/index.jsx';
import POS from './pages/Cashier/POS/index.jsx';
import DailySales from './pages/Cashier/DailySales/index.jsx';
import CustomerLog from './pages/Cashier/CustomerLog/index.jsx';
import SystemStatus from './pages/Admin/SystemStatus/index.jsx';
import ActivityLogs from './pages/Admin/ActivityLogs/index.jsx';

import { NotificationProvider } from './contexts/NotificationContext';
import { ProductProvider } from './contexts/ProductContext';
import { InventoryProvider } from './contexts/InventoryContext';

/**
 * AuthLayout — wraps AppShell with PrivateRoute auth check.
 * allowedRoles is passed per-route child; here we just ensure authenticated.
 * Individual pages handle their own role restriction via nested PrivateRoute.
 */
function AuthLayout({ allowedRoles }) {
    return (
        <PrivateRoute allowedRoles={allowedRoles}>
            <Outlet />
        </PrivateRoute>
    );
}

function App() {
    return (
        <NotificationProvider>
            <ProductProvider>
                <InventoryProvider>
                    <BrowserRouter>
                        <Routes>
                            {/* Public Routes */}
                            <Route path="/login" element={<Login />} />
                            <Route path="/forgot-password" element={<ForgotPassword />} />
                            <Route path="/reset-password" element={<ResetPassword />} />
                            <Route path="/verify-credentials" element={<VerifyCredentials />} />

                            {/*
                             * All authenticated routes share AppShell as a
                             * persistent layout. Sidebar and NotificationsDropdown
                             * mount ONCE here and never remount on navigation.
                             */}
                            <Route element={<PrivateRoute><AppShell /></PrivateRoute>}>

                                {/* Admin + Supervisor */}
                                <Route path="/dashboard" element={
                                    <PrivateRoute allowedRoles={['Admin', 'Supervisor']}>
                                        <Dashboard />
                                    </PrivateRoute>
                                } />

                                {/* Admin only */}
                                <Route path="/product-management" element={
                                    <PrivateRoute allowedRoles={['Admin']}>
                                        <ProductManagement />
                                    </PrivateRoute>
                                } />

                                <Route path="/inventory" element={
                                    <PrivateRoute allowedRoles={['Admin']}>
                                        <Inventory />
                                    </PrivateRoute>
                                } />

                                <Route path="/history-logs" element={
                                    <PrivateRoute allowedRoles={['Admin']}>
                                        <HistoryLogs />
                                    </PrivateRoute>
                                } />

                                <Route path="/activity-logs" element={<Navigate to="/settings?tab=activity" replace />} />

                                <Route path="/sales-log" element={
                                    <PrivateRoute allowedRoles={['Admin']}>
                                        <SalesLog />
                                    </PrivateRoute>
                                } />

                                <Route path="/reports" element={
                                    <PrivateRoute allowedRoles={['Admin']}>
                                        <Reports />
                                    </PrivateRoute>
                                } />

                                {/* Admin + Cashier */}
                                <Route path="/reservations" element={
                                    <PrivateRoute allowedRoles={['Admin', 'Cashier']}>
                                        <Reservations />
                                    </PrivateRoute>
                                } />

                                {/* Admin + Cashier + Supervisor */}
                                <Route path="/settings" element={
                                    <PrivateRoute allowedRoles={['Admin', 'Cashier', 'Supervisor']}>
                                        <Settings />
                                    </PrivateRoute>
                                } />

                                {/* Secret Isolated System Status Route (Admin only, not in Sidebar) */}
                                <Route path="/system-status" element={
                                    <PrivateRoute allowedRoles={['Admin']}>
                                        <SystemStatus />
                                    </PrivateRoute>
                                } />

                                {/* Cashier only */}
                                <Route path="/pos" element={
                                    <PrivateRoute allowedRoles={['Admin', 'Cashier']}>
                                        <POS />
                                    </PrivateRoute>
                                } />

                                <Route path="/daily-sales" element={
                                    <PrivateRoute allowedRoles={['Cashier']}>
                                        <DailySales />
                                    </PrivateRoute>
                                } />

                                <Route path="/customer-log" element={
                                    <PrivateRoute allowedRoles={['Cashier']}>
                                        <CustomerLog />
                                    </PrivateRoute>
                                } />

                            </Route>

                            {/* Catch-all */}
                            <Route path="*" element={<Navigate to="/login" replace />} />
                        </Routes>
                    </BrowserRouter>
                </InventoryProvider>
            </ProductProvider>
        </NotificationProvider>
    );
}

export default App;
