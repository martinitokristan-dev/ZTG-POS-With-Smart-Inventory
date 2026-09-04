import React, { useState } from 'react';
import api from '../../../../shared/api';
import { showToast } from '../../../../utils/toast';

export function useUserPermissions() {
    const [users, setUsers] = React.useState([]);
    const [loadingUsers, setLoadingUsers] = React.useState(true);
    const [userSearchQuery, setUserSearchQuery] = React.useState('');

    // --- User View Modal State ---
    const [showUserViewModal, setShowUserViewModal] = React.useState(false);
    const [selectedUserForView, setSelectedUserForView] = React.useState(null);

    // --- Permission Override Modal State ---
    const [showUserOverrideModal, setShowUserOverrideModal] = React.useState(false);
    const [selectedUser, setSelectedUser] = React.useState(null);
    const [userPermissionSummary, setUserPermissionSummary] = React.useState(null);
    const [loadingUserPermissions, setLoadingUserPermissions] = React.useState(false);
    const [userOverridesForm, setUserOverridesForm] = React.useState({});
    const [isSavingOverrides, setIsSavingOverrides] = React.useState(false);
    const [overrideError, setOverrideError] = React.useState(null);

    // --- Staff CRUD Modal State ---
    const [showEmployeeModal, setShowEmployeeModal] = React.useState(false);
    const [selectedEmployee, setSelectedEmployee] = React.useState(null);
    const [employeeForm, setEmployeeForm] = React.useState({
        full_name: '',
        phone_number: '',
        email: '',
        username: '',
        role: 'Cashier',
        pin: '',
        status: 'Active',
    });
    const [employeeErrors, setEmployeeErrors] = React.useState({});
    const [employeeSubmitting, setEmployeeSubmitting] = React.useState(false);
    const [resendingId, setResendingId] = React.useState(null);

    const fetchUsers = React.useCallback(async () => {
        setLoadingUsers(true);
        try {
            const res = await api.get('/employees');
            setUsers(res.data || []);
        } catch (err) {
            console.error('Failed to fetch users:', err);
        } finally {
            setLoadingUsers(false);
        }
    }, []);

    React.useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // --- Staff CRUD Handlers ---
    const openAddEmployee = (initialRole = 'Cashier') => {
        setSelectedEmployee(null);
        setEmployeeForm({
            full_name: '',
            phone_number: '',
            email: '',
            username: '',
            role: typeof initialRole === 'string' ? initialRole : 'Cashier',
            pin: '',
            status: 'Active',
        });
        setEmployeeErrors({});
        setShowEmployeeModal(true);
    };

    const openEditEmployee = (emp) => {
        setSelectedEmployee(emp);
        setEmployeeForm({
            full_name: emp.full_name || emp.name || '',
            phone_number: emp.phone_number || '',
            email: emp.email || emp.user_profile?.email || '',
            username: emp.username || '',
            role: emp.role || 'Cashier',
            pin: emp.pin || '',
            status: emp.status || 'Active',
        });
        setEmployeeErrors({});
        setShowEmployeeModal(true);
    };

    const handleEmployeeSubmit = async (e) => {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        setEmployeeErrors({});
        setEmployeeSubmitting(true);

        try {
            const fullName = (employeeForm.full_name || employeeForm.name || '').trim();
            const payload = {
                ...employeeForm,
                full_name: fullName,
                name: fullName,
                phone_number: employeeForm.phone_number?.trim() || null,
                email: employeeForm.email?.trim() || null,
                username: employeeForm.username?.trim(),
            };

            if (payload.role === 'Cashier') {
                delete payload.pin;
            }

            if (selectedEmployee) {
                if (!payload.password) {
                    delete payload.password;
                }
                const res = await api.put(`/employees/${selectedEmployee.id}`, payload);
                const updated = res.data.employee || res.data;
                setUsers((prev) => prev.map((emp) => (emp.id === selectedEmployee.id ? updated : emp)));
            } else {
                const res = await api.post('/employees', payload);
                const created = res.data.employee || res.data;
                setUsers((prev) => [created, ...prev]);
            }

            setShowEmployeeModal(false);
            fetchUsers();
            window.dispatchEvent(new Event('auth_user_updated'));
        } catch (err) {
            console.error('Failed to save staff:', err);
            const errData = err.response?.data;
            if (errData?.errors) {
                setEmployeeErrors(errData.errors);
            } else if (errData?.message) {
                setEmployeeErrors({ general: errData.message });
            } else {
                setEmployeeErrors({ general: 'Failed to save staff account.' });
            }
        } finally {
            setEmployeeSubmitting(false);
        }
    };

    const handleToggleEmployee = async (emp) => {
        try {
            const res = await api.patch(`/employees/${emp.id}/toggle`);
            const updated = res.data.employee || res.data;
            const newStatus = updated.status || (emp.status === 'Active' ? 'Inactive' : 'Active');
            setUsers((prev) => prev.map((e) => (e.id === emp.id ? { ...e, ...updated, status: newStatus } : e)));
            window.dispatchEvent(new Event('auth_user_updated'));
            showToast(`Employee status set to ${newStatus}.`, 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to toggle employee status.', 'error');
        }
    };

    const handleResendVerification = async (emp) => {
        setResendingId(emp.id);
        try {
            const res = await api.post(`/employees/${emp.id}/resend-verification`);
            showToast(res.data?.message || `Verification email re-sent to ${emp.email}`, 'success');
        } catch (err) {
            console.error('Failed to resend verification:', err);
            showToast(err.response?.data?.message || 'Failed to resend verification email.', 'error');
        } finally {
            setResendingId(null);
        }
    };

    // --- Custom Permissions Override Handlers ---
    const openUserOverrideModal = async (user) => {
        setSelectedUser(user);
        setShowUserOverrideModal(true);
        setLoadingUserPermissions(true);
        setOverrideError(null);

        try {
            const res = await api.get(`/users/${user.id}/permissions`);
            setUserPermissionSummary(res.data);

            const effective = res.data.effective_permissions || {};
            const initialForm = {};

            Object.keys(effective).forEach((modKey) => {
                const eff = effective[modKey] || {};
                initialForm[modKey] = {
                    has_access: Boolean(eff.has_access),
                    can_view: Boolean(eff.can_view),
                    can_create: Boolean(eff.can_create),
                    can_edit: Boolean(eff.can_edit),
                    can_delete: Boolean(eff.can_delete),
                };
            });

            setUserOverridesForm(initialForm);
        } catch (err) {
            console.error('Failed to load user permissions:', err);
            setOverrideError(err.response?.data?.message || 'Failed to load user permissions.');
        } finally {
            setLoadingUserPermissions(false);
        }
    };

    const handleSaveUserOverrides = async (e) => {
        if (e) e.preventDefault();
        if (!selectedUser) return;

        setIsSavingOverrides(true);
        setOverrideError(null);

        try {
            const res = await api.put(`/users/${selectedUser.id}/permissions`, {
                overrides: userOverridesForm,
            });
            setUserPermissionSummary(res.data.data);
            setShowUserOverrideModal(false);
            fetchUsers();

            // Refresh current session permissions if current user was updated
            try {
                const userRes = await api.get('/user');
                if (userRes.data?.user) {
                    localStorage.setItem('auth_user', JSON.stringify(userRes.data.user));
                    sessionStorage.setItem('auth_user', JSON.stringify(userRes.data.user));
                }
            } catch (e) {
                console.warn('Could not refresh auth_user session:', e);
            }

            window.dispatchEvent(new Event('auth_user_updated'));
        } catch (err) {
            console.error('Failed to save user overrides:', err);
            setOverrideError(err.response?.data?.message || 'Failed to save custom permissions.');
        } finally {
            setIsSavingOverrides(false);
        }
    };

    const handleResetUserOverrides = async () => {
        if (!selectedUser) return;
        if (!window.confirm(`Reset permissions for ${selectedUser.full_name || selectedUser.username} back to default ${selectedUser.role} role?`)) {
            return;
        }

        setIsSavingOverrides(true);
        setOverrideError(null);

        try {
            const res = await api.delete(`/users/${selectedUser.id}/permissions`);
            setUserPermissionSummary(res.data.data);
            setShowUserOverrideModal(false);
            fetchUsers();

            // Refresh current session permissions if current user was updated
            try {
                const userRes = await api.get('/user');
                if (userRes.data?.user) {
                    localStorage.setItem('auth_user', JSON.stringify(userRes.data.user));
                    sessionStorage.setItem('auth_user', JSON.stringify(userRes.data.user));
                }
            } catch (e) {
                console.warn('Could not refresh auth_user session:', e);
            }

            window.dispatchEvent(new Event('auth_user_updated'));
        } catch (err) {
            console.error('Failed to reset user overrides:', err);
            setOverrideError(err.response?.data?.message || 'Failed to reset custom permissions.');
        } finally {
            setIsSavingOverrides(false);
        }
    };

    const filteredUsers = React.useMemo(() => {
        if (!userSearchQuery.trim()) return users;
        const q = userSearchQuery.toLowerCase();
        return users.filter((u) => {
            const name = (u.full_name || u.name || '').toLowerCase();
            const username = (u.username || '').toLowerCase();
            const email = (u.email || '').toLowerCase();
            const role = (u.role || '').toLowerCase();
            return name.includes(q) || username.includes(q) || email.includes(q) || role.includes(q);
        });
    }, [users, userSearchQuery]);

    const openViewUserModal = (user) => {
        setSelectedUserForView(user);
        setShowUserViewModal(true);
    };

    return {
        users,
        filteredUsers,
        loadingUsers,
        fetchUsers,
        userSearchQuery,
        setUserSearchQuery,
        // View Modal
        showUserViewModal,
        setShowUserViewModal,
        selectedUserForView,
        openViewUserModal,
        // Override Modal
        showUserOverrideModal,
        setShowUserOverrideModal,
        selectedUser,
        userPermissionSummary,
        loadingUserPermissions,
        userOverridesForm,
        setUserOverridesForm,
        isSavingOverrides,
        overrideError,
        openUserOverrideModal,
        handleSaveUserOverrides,
        handleResetUserOverrides,
        // Staff CRUD
        showEmployeeModal,
        setShowEmployeeModal,
        selectedEmployee,
        employeeForm,
        setEmployeeForm,
        employeeErrors,
        setEmployeeErrors,
        employeeSubmitting,
        resendingId,
        openAddEmployee,
        openEditEmployee,
        handleEmployeeSubmit,
        handleToggleEmployee,
        handleResendVerification,
    };
}
