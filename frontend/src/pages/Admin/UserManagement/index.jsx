import React from 'react';
import useUserManagement from './hooks/useUserManagement';
import RolesPermissionsView from './RolesPermissionsView';
import ManageUsersView from './ManageUsersView';
import CheckersView from './CheckersView';
import RoleModal from './modals/RoleModal';
import RoleViewModal from './modals/RoleViewModal';
import RoleUsersModal from './modals/RoleUsersModal';
import UserPermissionModal from './modals/UserPermissionModal';
import UserViewModal from './modals/UserViewModal';
import EmployeeModal from '../Settings/modals/EmployeeModal';
import CheckerModal from '../Settings/modals/CheckerModal';
import ConfirmModal from '../../../shared/components/ConfirmModal';
import { useModulePermission } from '../../../shared/hooks/useModulePermission';

export default function UserManagement() {
    const um = useUserManagement();
    const permissions = useModulePermission('user_management');

    return (
        <>
            {/* Checkers Page */}
            {um.isCheckersPage ? (
                <>
                    {/* Top Header */}
                    <div className="top-bar">
                        <div>
                            <h1 style={{ fontSize: '20px', marginBottom: '2px', color: 'var(--text-primary)' }}>
                                Warehouse Checkers
                            </h1>
                            <div className="page-description" style={{ marginTop: 0, fontSize: '12px' }}>
                                Manage warehouse checkers who inspect, verify, and approve incoming and outgoing items.
                            </div>
                        </div>
                    </div>

                    {/* Checkers Content */}
                    <div className="content-body">
                        <CheckersView
                            checkers={um.checkers}
                            loading={um.loadingCheckers}
                            searchQuery={um.checkerSearchQuery}
                            onSearchChange={um.setCheckerSearchQuery}
                            onAddChecker={um.openAddChecker}
                            onEditChecker={um.openEditChecker}
                            onToggleChecker={um.handleToggleChecker}
                            permissions={permissions}
                        />
                    </div>
                </>
            ) : (
                /* Roles & Permissions Page */
                <>
                    {/* Top Header */}
                    <div className="top-bar">
                        <div>
                            <h1 style={{ fontSize: '20px', marginBottom: '2px', color: 'var(--text-primary)' }}>
                                User Management
                            </h1>
                            <div className="page-description" style={{ marginTop: 0, fontSize: '12px' }}>
                                Configure system roles, granular action permissions, and manage staff accounts.
                            </div>
                        </div>

                        {/* View Switcher: Roles vs Staff */}
                        <div className="top-bar-actions">
                            <div
                                style={{
                                    display: 'inline-flex',
                                    padding: '3px',
                                    borderRadius: '8px',
                                    backgroundColor: 'var(--bg-secondary, #F1F5F9)',
                                    border: '1px solid var(--border)',
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() => um.setRoleSubView('roles')}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        padding: '6px 14px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        fontSize: '13px',
                                        fontWeight: um.roleSubView === 'roles' ? '600' : '500',
                                        backgroundColor: um.roleSubView === 'roles' ? '#2563EB' : 'transparent',
                                        color: um.roleSubView === 'roles' ? '#FFFFFF' : 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                    }}
                                >
                                    <span>Roles & Permissions</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => um.setRoleSubView('staff')}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        padding: '6px 14px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        fontSize: '13px',
                                        fontWeight: um.roleSubView === 'staff' ? '600' : '500',
                                        backgroundColor: um.roleSubView === 'staff' ? '#2563EB' : 'transparent',
                                        color: um.roleSubView === 'staff' ? '#FFFFFF' : 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                    }}
                                >
                                    <span>Manage Users</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Roles & Permissions Content */}
                    <div className="content-body">
                        {um.roleSubView === 'roles' ? (
                            <RolesPermissionsView
                                roles={um.roles}
                                modules={um.modules}
                                loading={um.loading}
                                onViewRole={um.openViewRoleModal}
                                onEditRole={um.openEditRoleModal}
                                onDeleteRole={um.handleDeleteRole}
                                onViewUsers={um.openViewUsersModal}
                                onCreateRole={um.openCreateRoleModal}
                                permissions={permissions}
                            />
                        ) : (
                            <ManageUsersView
                                users={um.users}
                                loading={um.loadingUsers}
                                searchQuery={um.userSearchQuery}
                                onSearchChange={um.setUserSearchQuery}
                                onViewUser={um.openViewUserModal}
                                onAddStaff={um.openAddEmployee}
                                onEditStaff={um.openEditEmployee}
                                onToggleStaff={um.handleToggleEmployee}
                                onResendVerification={um.handleResendVerification}
                                resendingId={um.resendingId}
                                permissions={permissions}
                            />
                        )}
                    </div>
                </>
            )}

                {/* Modals */}
                <RoleModal
                    isOpen={um.showRoleModal}
                    onClose={() => um.setShowRoleModal(false)}
                    onSubmit={um.handleSaveRole}
                    editingRole={um.editingRole}
                    roleForm={um.roleForm}
                    setRoleForm={um.setRoleForm}
                    modules={um.modules}
                    formErrors={um.formErrors}
                    isSaving={um.isSaving}
                />

                <RoleViewModal
                    isOpen={um.showRoleViewModal}
                    onClose={() => um.setShowRoleViewModal(false)}
                    role={um.selectedRoleForView}
                    modules={um.modules}
                    onEdit={permissions.canEdit ? um.openEditRoleModal : null}
                />

                <RoleUsersModal
                    isOpen={um.showUsersModal}
                    onClose={() => um.setShowUsersModal(false)}
                    role={um.selectedRoleForUsers}
                    users={um.assignedUsers}
                    loading={um.loadingUsers}
                    onRemoveUser={permissions.canEdit ? um.handleRemoveUserFromRole : null}
                    onAddStaffForRole={(roleName) => {
                        um.setShowUsersModal(false);
                        um.openAddEmployee(roleName);
                    }}
                    permissions={permissions}
                />

                <UserViewModal
                    isOpen={um.showUserViewModal}
                    onClose={() => um.setShowUserViewModal(false)}
                    user={um.selectedUserForView}
                    modules={um.modules}
                    roles={um.roles}
                    onEdit={permissions.canEdit ? um.openEditEmployee : null}
                />

                {/* Staff Create / Edit Modal */}
                <EmployeeModal
                    isOpen={um.showEmployeeModal}
                    onClose={() => um.setShowEmployeeModal(false)}
                    selectedEmployee={um.selectedEmployee}
                    employeeForm={um.employeeForm}
                    setEmployeeForm={um.setEmployeeForm}
                    onSubmit={um.handleEmployeeSubmit}
                    submitting={um.employeeSubmitting}
                    employeeErrors={um.employeeErrors}
                    setEmployeeErrors={um.setEmployeeErrors}
                />

                {/* Checker Add / Edit Modal */}
                <CheckerModal
                    isOpen={um.showCheckerModal}
                    onClose={() => um.setShowCheckerModal(false)}
                    selectedChecker={um.selectedChecker}
                    checkerForm={um.checkerForm}
                    setCheckerForm={um.setCheckerForm}
                    onSubmit={um.handleCheckerSubmit}
                />

                {/* Delete Role Confirmation Dialog */}
                <ConfirmModal
                    isOpen={Boolean(um.roleToDelete)}
                    onClose={() => !um.deletingRoleId && um.setRoleToDelete(null)}
                    onConfirm={um.confirmDeleteRole}
                    title="Delete Role"
                    message={
                        <span>
                            Are you sure you want to delete the role <strong>"{um.roleToDelete?.name}"</strong>? This action cannot be undone.
                        </span>
                    }
                    confirmText="Delete Role"
                    cancelText="Cancel"
                    variant="danger"
                    loading={Boolean(um.deletingRoleId)}
                />
        </>
    );
}
