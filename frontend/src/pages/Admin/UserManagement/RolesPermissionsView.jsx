import React, { useState, useEffect } from 'react';
import TablePagination from '../../../shared/components/TablePagination';

/**
 * RolesPermissionsView — Sleek, clean table of roles and permissions with 3-dots actions menu and no data icons.
 */
export default function RolesPermissionsView({
    roles = [],
    modules = {},
    loading = false,
    onViewRole,
    onEditRole,
    onDeleteRole,
    onViewUsers,
    onCreateRole,
}) {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [currentPage, setCurrentPage] = React.useState(1);
    const [perPage, setPerPage] = React.useState(10);
    const [openDropdownId, setOpenDropdownId] = useState(null);

    // Close actions dropdown on outside click
    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (!e.target.closest('.actions-dropdown-container')) {
                setOpenDropdownId(null);
            }
        };
        document.addEventListener('click', handleOutsideClick);
        return () => document.removeEventListener('click', handleOutsideClick);
    }, []);

    const filteredRoles = React.useMemo(() => {
        if (!searchQuery.trim()) return roles;
        const q = searchQuery.toLowerCase();
        return roles.filter(
            (r) =>
                r.name.toLowerCase().includes(q) ||
                (r.description && r.description.toLowerCase().includes(q))
        );
    }, [roles, searchQuery]);

    const paginatedRoles = React.useMemo(() => {
        if (perPage === 'All') return filteredRoles;
        const num = Number(perPage) || 10;
        const start = (currentPage - 1) * num;
        return filteredRoles.slice(start, start + num);
    }, [filteredRoles, currentPage, perPage]);

    return (
        <>
            {/* Toolbar Filter Card */}
            <div className="card" style={{ marginBottom: '16px' }}>
                <div className="table-filters" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                    {/* Search */}
                    <div style={{ flex: 1, minWidth: '240px', maxWidth: '420px', position: 'relative' }}>
                        <svg
                            style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: '#94A3B8' }}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                        >
                            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                        <input
                            type="text"
                            className="form-control table-search-input"
                            placeholder="Search roles..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            style={{ paddingLeft: '44px' }}
                        />
                    </div>

                    {/* Create Role Button */}
                    <button
                        type="button"
                        onClick={onCreateRole}
                        className="btn btn-primary"
                    >
                        <span>Create New Role</span>
                    </button>
                </div>
            </div>

            {/* Table Card */}
            <div className="card table-card" style={{ overflow: 'visible', paddingBottom: '80px' }}>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table className="data-table" style={{ width: '100%', minWidth: '780px', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', borderBottom: '2px solid var(--table-border)', background: 'var(--table-header-bg)' }}>
                            <tr>
                                <th style={{ padding: '12px 16px', fontWeight: '600', width: '20%' }}>Role Name</th>
                                <th style={{ padding: '12px 16px', fontWeight: '600', width: '30%' }}>Description</th>
                                <th style={{ padding: '12px 16px', fontWeight: '600', width: '15%' }}>Users Assigned</th>
                                <th style={{ padding: '12px 16px', fontWeight: '600', width: '25%' }}>Permissions</th>
                                <th style={{ padding: '12px 16px', fontWeight: '600', width: '10%', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        Loading roles...
                                    </td>
                                </tr>
                            ) : paginatedRoles.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No roles found.
                                    </td>
                                </tr>
                            ) : (
                                paginatedRoles.map((role, idx) => {
                                    const accessibleModules = (role.permissions || [])
                                        .filter((p) => p.has_access)
                                        .map((p) => {
                                            const mod = modules[p.module];
                                            if (typeof mod === 'object' && mod !== null) {
                                                return mod.label || p.module;
                                            }
                                            return mod || p.module;
                                        });
                                    
                                    const isSuperAdmin = role.name === 'Admin';
                                    const isBottomRow = idx >= paginatedRoles.length - 2 && paginatedRoles.length > 2;

                                    return (
                                        <tr
                                            key={role.id}
                                            style={{
                                                borderBottom: '1px solid var(--table-border-subtle, var(--border))',
                                                transition: 'background-color 0.15s ease',
                                                minHeight: '48px',
                                            }}
                                            className="hover:bg-slate-50"
                                        >
                                            {/* Role Name */}
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                                                        {role.name}
                                                    </span>
                                                    {role.is_system && (
                                                        <span
                                                            style={{
                                                                fontSize: '10.5px',
                                                                fontWeight: '700',
                                                                padding: '2px 6px',
                                                                borderRadius: '4px',
                                                                backgroundColor: '#F1F5F9',
                                                                color: '#64748B',
                                                                letterSpacing: '0.04em',
                                                            }}
                                                        >
                                                            SYSTEM
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Description */}
                                            <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.4 }}>
                                                {role.description || '—'}
                                            </td>

                                            {/* Users Assigned (Plain static icon with count) */}
                                            <td style={{ padding: '12px 16px' }}>
                                                <div
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        color: 'var(--text-primary)',
                                                        fontSize: '13px',
                                                        fontWeight: '500',
                                                    }}
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                                        <circle cx="9" cy="7" r="4" />
                                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                                    </svg>
                                                    <span>{role.users_count || 0} user{role.users_count === 1 ? '' : 's'}</span>
                                                </div>
                                            </td>

                                            {/* Permissions Summary (Plain text with commas, no blue/green pills) */}
                                            <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.45 }}>
                                                {isSuperAdmin ? (
                                                    <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                                                        All Modules
                                                    </span>
                                                ) : accessibleModules.length === 0 ? (
                                                    <span style={{ color: 'var(--text-muted)' }}>
                                                        —
                                                    </span>
                                                ) : (
                                                    <span>
                                                        {accessibleModules.join(', ')}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                <div className="actions-cell-wrapper actions-collapse-compact">
                                                    {/* Inline Action Buttons (Visible when ample space) */}
                                                    <div className="actions-inline-group">
                                                        {/* 1. View Role Permissions */}
                                                        <button
                                                            type="button"
                                                            onClick={() => onViewRole(role)}
                                                            className="action-trigger-btn"
                                                            data-tooltip="View Permissions"
                                                            aria-label="View Permissions"
                                                        >
                                                            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                                <circle cx="12" cy="12" r="3" />
                                                            </svg>
                                                        </button>

                                                        {/* 2. Manage Assigned Users */}
                                                        <button
                                                            type="button"
                                                            onClick={() => onViewUsers(role)}
                                                            className="action-trigger-btn"
                                                            data-tooltip={`Assigned Staff (${role.users_count || 0})`}
                                                            aria-label="Assigned Staff"
                                                            style={{ color: '#2563EB' }}
                                                        >
                                                            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                                                <circle cx="9" cy="7" r="4" />
                                                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                                            </svg>
                                                        </button>

                                                        {/* 3. Edit Role (if not default SuperAdmin) */}
                                                        {!isSuperAdmin && (
                                                            <button
                                                                type="button"
                                                                onClick={() => onEditRole(role)}
                                                                className="action-trigger-btn"
                                                                data-tooltip="Edit Role"
                                                                aria-label="Edit Role"
                                                            >
                                                                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                                </svg>
                                                            </button>
                                                        )}

                                                        {/* 4. Delete Role (non-system only) */}
                                                        {!role.is_system && (
                                                            <button
                                                                type="button"
                                                                onClick={() => onDeleteRole(role)}
                                                                className="action-trigger-btn"
                                                                data-tooltip="Delete Role"
                                                                aria-label="Delete Role"
                                                                style={{ color: '#DC2626' }}
                                                            >
                                                                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <polyline points="3 6 5 6 21 6"></polyline>
                                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* 3-Dots Dropdown (Transformed when zoomed in / tighter space) */}
                                                    <div className="actions-dropdown-group actions-dropdown-container">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOpenDropdownId(openDropdownId === role.id ? null : role.id);
                                                            }}
                                                            className="action-trigger-btn"
                                                            aria-label="More actions"
                                                            data-tooltip="More actions"
                                                        >
                                                            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <circle cx="12" cy="12" r="1.5"></circle>
                                                                <circle cx="12" cy="5" r="1.5"></circle>
                                                                <circle cx="12" cy="19" r="1.5"></circle>
                                                            </svg>
                                                        </button>

                                                        {openDropdownId === role.id && (
                                                            <div
                                                                className="actions-dropdown-menu show"
                                                                style={{
                                                                    position: 'absolute',
                                                                    right: 0,
                                                                    ...(isBottomRow ? { bottom: 'calc(100% + 6px)', top: 'auto' } : { top: 'calc(100% + 6px)', bottom: 'auto' }),
                                                                    zIndex: 99999,
                                                                    minWidth: '155px',
                                                                }}
                                                            >
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setOpenDropdownId(null);
                                                                        onViewRole(role);
                                                                    }}
                                                                    className="actions-dropdown-item"
                                                                >
                                                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                                        <circle cx="12" cy="12" r="3" />
                                                                    </svg>
                                                                    <span>View Permissions</span>
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setOpenDropdownId(null);
                                                                        onViewUsers(role);
                                                                    }}
                                                                    className="actions-dropdown-item"
                                                                    style={{ color: '#2563EB' }}
                                                                >
                                                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                                                        <circle cx="9" cy="7" r="4" />
                                                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                                                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                                                    </svg>
                                                                    <span>Assigned Staff ({role.users_count || 0})</span>
                                                                </button>

                                                                {!isSuperAdmin && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setOpenDropdownId(null);
                                                                            onEditRole(role);
                                                                        }}
                                                                        className="actions-dropdown-item"
                                                                    >
                                                                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                                            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                                        </svg>
                                                                        <span>Edit Role</span>
                                                                    </button>
                                                                )}

                                                                {!role.is_system && (
                                                                    <>
                                                                        <div className="actions-dropdown-divider" style={{ margin: '4px 0', borderTop: '1px solid var(--border)' }} />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setOpenDropdownId(null);
                                                                                onDeleteRole(role);
                                                                            }}
                                                                            className="actions-dropdown-item disable"
                                                                        >
                                                                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                                                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                                            </svg>
                                                                            <span>Delete Role</span>
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            <TablePagination
                currentPage={currentPage}
                totalItems={filteredRoles.length}
                perPage={perPage}
                onPageChange={setCurrentPage}
                onPerPageChange={(val) => {
                    setPerPage(val);
                    setCurrentPage(1);
                }}
            />
        </>
    );
}
