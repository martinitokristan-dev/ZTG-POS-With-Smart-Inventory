import './bootstrap';
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';

import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import SetPassword from './pages/Auth/SetPassword';
import Unauthorized from './pages/Errors/Unauthorized';
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
import UserManagement from './pages/Admin/UserManagement/index.jsx';

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
        <BrowserRouter>
            <NotificationProvider>
                <ProductProvider>
                    <InventoryProvider>
                        <Routes>
                            {/* Public Routes */}
                            <Route path="/login" element={<Login />} />
                            <Route path="/forgot-password" element={<ForgotPassword />} />
                            <Route path="/reset-password" element={<ResetPassword />} />
                            <Route path="/set-password" element={<SetPassword />} />
                            <Route path="/unauthorized" element={<Unauthorized />} />
                            <Route path="/403" element={<Unauthorized />} />

                            {/*
                             * All authenticated routes share AppShell as a
                             * persistent layout. Sidebar and NotificationsDropdown
                             * mount ONCE here and never remount on navigation.
                             */}
                            <Route element={<PrivateRoute><AppShell /></PrivateRoute>}>

                                {/* Admin + Supervisor */}
                                <Route path="/dashboard" element={
                                    <PrivateRoute allowedRoles={['Admin', 'Supervisor']} requiredModule="dashboard">
                                        <Dashboard />
                                    </PrivateRoute>
                                } />

                                {/* Admin only */}
                                <Route path="/user-management" element={
                                    <PrivateRoute allowedRoles={['Admin']} requiredModule="user_management">
                                        <UserManagement />
                                    </PrivateRoute>
                                } />
                                <Route path="/user-management/roles" element={
                                    <PrivateRoute allowedRoles={['Admin']} requiredModule="user_management">
                                        <UserManagement />
                                    </PrivateRoute>
                                } />
                                <Route path="/user-management/checkers" element={
                                    <PrivateRoute allowedRoles={['Admin']} requiredModule="user_management">
                                        <UserManagement />
                                    </PrivateRoute>
                                } />

                                <Route path="/product-management" element={
                                    <PrivateRoute allowedRoles={['Admin']} requiredModule="products">
                                        <ProductManagement />
                                    </PrivateRoute>
                                } />

                                <Route path="/inventory" element={
                                    <PrivateRoute allowedRoles={['Admin']} requiredModule="inventory">
                                        <Inventory />
                                    </PrivateRoute>
                                } />

                                <Route path="/history-logs" element={
                                    <PrivateRoute allowedRoles={['Admin']} requiredModule="history_logs">
                                        <HistoryLogs />
                                    </PrivateRoute>
                                } />

                                <Route path="/activity-logs" element={<Navigate to="/settings?tab=activity" replace />} />

                                <Route path="/sales-log" element={
                                    <PrivateRoute allowedRoles={['Admin']} requiredModule="sales_log">
                                        <SalesLog />
                                    </PrivateRoute>
                                } />

                                <Route path="/reports" element={
                                    <PrivateRoute allowedRoles={['Admin']} requiredModule="reports">
                                        <Reports />
                                    </PrivateRoute>
                                } />

                                {/* Admin + Cashier */}
                                <Route path="/reservations" element={
                                    <PrivateRoute allowedRoles={['Admin', 'Cashier']} requiredModule="reservations">
                                        <Reservations />
                                    </PrivateRoute>
                                } />

                                {/* All authenticated roles */}
                                <Route path="/settings" element={
                                    <PrivateRoute allowedRoles={['Admin', 'Cashier', 'Technical Operations', 'Supervisor']}>
                                        <Settings />
                                    </PrivateRoute>
                                } />

                                {/* System Status (Admin & Technical Operations) */}
                                <Route path="/system-status" element={
                                    <PrivateRoute allowedRoles={['Admin', 'Technical Operations']} requiredModule="system_status">
                                        <SystemStatus />
                                    </PrivateRoute>
                                } />

                                {/* Cashier only / POS */}
                                <Route path="/pos" element={
                                    <PrivateRoute allowedRoles={['Admin', 'Cashier']} requiredModule="pos">
                                        <POS />
                                    </PrivateRoute>
                                } />

                                <Route path="/daily-sales" element={
                                    <PrivateRoute allowedRoles={['Cashier', 'Admin']} requiredModule="sales_log">
                                        <DailySales />
                                    </PrivateRoute>
                                } />

                                <Route path="/customer-log" element={
                                    <PrivateRoute allowedRoles={['Cashier', 'Admin']} requiredModule="pos">
                                        <CustomerLog />
                                    </PrivateRoute>
                                } />

                            </Route>

                            {/* Catch-all */}
                            <Route path="*" element={<Navigate to="/login" replace />} />
                        </Routes>
                    </InventoryProvider>
                </ProductProvider>
            </NotificationProvider>
        </BrowserRouter>
    );
}

export default App;
