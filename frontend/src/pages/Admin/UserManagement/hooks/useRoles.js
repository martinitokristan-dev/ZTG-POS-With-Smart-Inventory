import React, { useState } from 'react';
import api from '../../../../shared/api';
import { showToast } from '../../../../utils/toast';

export function useRoles() {
    const [roles, setRoles] = React.useState([]);
    const [modules, setModules] = React.useState({});
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    // Modal state for viewing a role (read-only)
    const [showRoleViewModal, setShowRoleViewModal] = React.useState(false);
    const [selectedRoleForView, setSelectedRoleForView] = React.useState(null);

    // Modal state for creating / editing a role
    const [showRoleModal, setShowRoleModal] = React.useState(false);
    const [editingRole, setEditingRole] = React.useState(null);
    const [roleForm, setRoleForm] = React.useState({
        name: '',
        description: '',
        permissions: {},
    });
    const [formErrors, setFormErrors] = React.useState({});
    const [isSaving, setIsSaving] = React.useState(false);

    // Modal state for viewing users assigned to a role
    const [showUsersModal, setShowUsersModal] = React.useState(false);
    const [selectedRoleForUsers, setSelectedRoleForUsers] = React.useState(null);
    const [assignedUsers, setAssignedUsers] = React.useState([]);
    const [loadingUsers, setLoadingUsers] = React.useState(false);
    const [roleUsersCache, setRoleUsersCache] = React.useState({});

    // Delete confirmation state
    const [deletingRoleId, setDeletingRoleId] = React.useState(null);

    const fetchRoles = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/roles');
            const fetchedRoles = res.data.roles || [];
            setRoles(fetchedRoles);
            setModules(res.data.modules || {});

            // Seed roleUsersCache with preloaded users from listRoles()
            setRoleUsersCache((prev) => {
                const updated = { ...prev };
                fetchedRoles.forEach((r) => {
                    if (Array.isArray(r.users)) {
                        updated[r.id] = r.users;
                    }
                });
                return updated;
            });
        } catch (err) {
            console.error('Failed to fetch roles:', err);
            setError(err.response?.data?.message || 'Failed to load roles and permissions.');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        fetchRoles();
    }, [fetchRoles]);

    const openCreateRoleModal = () => {
        setEditingRole(null);
        // Initialize default empty matrix with all modules
        const initialPerms = {};
        Object.keys(modules).forEach((modKey) => {
            initialPerms[modKey] = {
                has_access: false,
                can_view: false,
                can_create: false,
                can_edit: false,
                can_delete: false,
            };
        });

        setRoleForm({
            name: '',
            description: '',
            permissions: initialPerms,
        });
        setFormErrors({});
        setShowRoleModal(true);
    };

    const openEditRoleModal = (role) => {
        setEditingRole(role);
        // Build permissions object from role.permissions
        const permsObj = {};
        const rolePermsMap = {};
        (role.permissions || []).forEach((p) => {
            rolePermsMap[p.module] = p;
        });

        Object.keys(modules).forEach((modKey) => {
            const existing = rolePermsMap[modKey];
            permsObj[modKey] = {
                has_access: Boolean(existing?.has_access),
                can_view: Boolean(existing?.can_view),
                can_create: Boolean(existing?.can_create),
                can_edit: Boolean(existing?.can_edit),
                can_delete: Boolean(existing?.can_delete),
            };
        });

        setRoleForm({
            name: role.name || '',
            description: role.description || '',
            permissions: permsObj,
        });
        setFormErrors({});
        setShowRoleModal(true);
    };

    const handleSaveRole = async (e) => {
        if (e) e.preventDefault();
        setFormErrors({});
        setIsSaving(true);

        try {
            if (editingRole) {
                await api.put(`/roles/${editingRole.id}`, roleForm);
            } else {
                await api.post('/roles', roleForm);
            }
            setShowRoleModal(false);
            fetchRoles();
            
            // Refresh current session permissions
            try {
                const userRes = await api.get('/user');
                if (userRes.data?.user) {
                    localStorage.setItem('auth_user', JSON.stringify(userRes.data.user));
                    sessionStorage.setItem('auth_user', JSON.stringify(userRes.data.user));
                }
            } catch (e) {
                console.warn('Could not refresh auth_user session:', e);
            }

            // Dispatch event for settings / sidebar updates
            window.dispatchEvent(new Event('auth_user_updated'));
        } catch (err) {
            console.error('Failed to save role:', err);
            if (err.response?.data?.errors) {
                setFormErrors(err.response.data.errors);
            } else {
                setFormErrors({ general: err.response?.data?.message || 'Failed to save role.' });
            }
        } finally {
            setIsSaving(false);
        }
    };

    const [roleToDelete, setRoleToDelete] = useState(null);

    const requestDeleteRole = (role) => {
        if (role.is_system || ['admin', 'cashier', 'technical operations', 'tech operations'].includes(role.name?.toLowerCase())) {
            showToast('System roles cannot be deleted.', 'error');
            return;
        }

        if (role.users_count > 0) {
            showToast(`Cannot delete role "${role.name}" because ${role.users_count} user(s) are assigned to it. Please reassign them first.`, 'error');
            return;
        }

        setRoleToDelete(role);
    };

    const confirmDeleteRole = async () => {
        if (!roleToDelete) return;
        setDeletingRoleId(roleToDelete.id);
        try {
            await api.delete(`/roles/${roleToDelete.id}`);
            fetchRoles();
            showToast(`Role "${roleToDelete.name}" deleted successfully.`, 'success');
            setRoleToDelete(null);
        } catch (err) {
            console.error('Failed to delete role:', err);
            showToast(err.response?.data?.message || 'Failed to delete role.', 'error');
        } finally {
            setDeletingRoleId(null);
        }
    };

    const handleDeleteRole = requestDeleteRole;

    const openViewUsersModal = async (role) => {
        setSelectedRoleForUsers(role);
        setShowUsersModal(true);

        // Check if we already have users in cache or on the role object
        const cachedUsers = roleUsersCache[role.id] ?? role.users;

        if (Array.isArray(cachedUsers)) {
            // INSTANT RENDER (0ms latency, zero flicker/blank state!)
            setAssignedUsers(cachedUsers);
            setLoadingUsers(false);
        } else {
            // Not in cache yet: show loading state
            setAssignedUsers([]);
            setLoadingUsers(true);
        }

        // Silent background refresh to guarantee fresh data
        try {
            const res = await api.get(`/roles/${role.id}/users`);
            const freshUsers = res.data.users || [];
            setAssignedUsers(freshUsers);
            setRoleUsersCache((prev) => ({ ...prev, [role.id]: freshUsers }));
        } catch (err) {
            console.error('Failed to fetch users for role:', err);
            if (!Array.isArray(cachedUsers)) {
                setAssignedUsers([]);
            }
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleAssignUserToRole = async (roleId, userId) => {
        try {
            const res = await api.post(`/roles/${roleId}/assign-user`, { user_id: userId });
            const updatedUsers = res.data.role?.users || [];
            setAssignedUsers(updatedUsers);
            setRoleUsersCache((prev) => ({ ...prev, [roleId]: updatedUsers }));
            fetchRoles();
            return res.data;
        } catch (err) {
            console.error('Failed to assign user to role:', err);
            throw err;
        }
    };

    const handleRemoveUserFromRole = async (roleId, userId, targetRole = '') => {
        try {
            const res = await api.post(`/roles/${roleId}/remove-user`, { user_id: userId, target_role: targetRole });
            const updatedUsers = res.data.role?.users || [];
            setAssignedUsers(updatedUsers);
            setRoleUsersCache((prev) => ({ ...prev, [roleId]: updatedUsers }));
            fetchRoles();
            return res.data;
        } catch (err) {
            console.error('Failed to reassign user from role:', err);
            throw err;
        }
    };

    const openViewRoleModal = (role) => {
        setSelectedRoleForView(role);
        setShowRoleViewModal(true);
    };

    return {
        roles,
        modules,
        loading,
        error,
        fetchRoles,
        showRoleViewModal,
        setShowRoleViewModal,
        selectedRoleForView,
        openViewRoleModal,
        showRoleModal,
        setShowRoleModal,
        editingRole,
        roleForm,
        setRoleForm,
        formErrors,
        isSaving,
        openCreateRoleModal,
        openEditRoleModal,
        handleSaveRole,
        handleDeleteRole,
        roleToDelete,
        setRoleToDelete,
        confirmDeleteRole,
        deletingRoleId,
        showUsersModal,
        setShowUsersModal,
        selectedRoleForUsers,
        assignedUsers,
        loadingUsers,
        openViewUsersModal,
        handleAssignUserToRole,
        handleRemoveUserFromRole,
    };
}
