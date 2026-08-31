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

                                {/* Dashboard */}
                                <Route path="/dashboard" element={
                                    <PrivateRoute requiredModule="dashboard">
                                        <Dashboard />
                                    </PrivateRoute>
                                } />

                                {/* User Management */}
                                <Route path="/user-management" element={
                                    <PrivateRoute requiredModule="user_management">
                                        <UserManagement />
                                    </PrivateRoute>
                                } />
                                <Route path="/user-management/roles" element={
                                    <PrivateRoute requiredModule="user_management">
                                        <UserManagement />
                                    </PrivateRoute>
                                } />
                                <Route path="/user-management/checkers" element={
                                    <PrivateRoute requiredModule="user_management">
                                        <UserManagement />
                                    </PrivateRoute>
                                } />

                                {/* Product Management */}
                                <Route path="/product-management" element={
                                    <PrivateRoute requiredModule="products">
                                        <ProductManagement />
                                    </PrivateRoute>
                                } />

                                {/* Inventory */}
                                <Route path="/inventory" element={
                                    <PrivateRoute requiredModule="inventory">
                                        <Inventory />
                                    </PrivateRoute>
                                } />

                                {/* History Logs */}
                                <Route path="/history-logs" element={
                                    <PrivateRoute requiredModule="history_logs">
                                        <HistoryLogs />
                                    </PrivateRoute>
                                } />

                                <Route path="/activity-logs" element={<Navigate to="/settings?tab=activity" replace />} />

                                {/* Sales Log */}
                                <Route path="/sales-log" element={
                                    <PrivateRoute requiredModule="sales_log">
                                        <SalesLog />
                                    </PrivateRoute>
                                } />

                                {/* Reports */}
                                <Route path="/reports" element={
                                    <PrivateRoute requiredModule="reports">
                                        <Reports />
                                    </PrivateRoute>
                                } />

                                {/* Order-Based / Reservations */}
                                <Route path="/reservations" element={
                                    <PrivateRoute requiredModule="reservations">
                                        <Reservations />
                                    </PrivateRoute>
                                } />

                                {/* System Settings (Available to all authenticated users) */}
                                <Route path="/settings" element={
                                    <PrivateRoute>
                                        <Settings />
                                    </PrivateRoute>
                                } />

                                {/* System Status (Diagnostics) */}
                                <Route path="/system-status" element={
                                    <PrivateRoute requiredModule="system_status">
                                        <SystemStatus />
                                    </PrivateRoute>
                                } />

                                {/* Point of Sale (POS) */}
                                <Route path="/pos" element={
                                    <PrivateRoute requiredModule="pos">
                                        <POS />
                                    </PrivateRoute>
                                } />

                                <Route path="/daily-sales" element={
                                    <PrivateRoute requiredModule="sales_log">
                                        <DailySales />
                                    </PrivateRoute>
                                } />

                                <Route path="/customer-log" element={
                                    <PrivateRoute requiredModule="pos">
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
