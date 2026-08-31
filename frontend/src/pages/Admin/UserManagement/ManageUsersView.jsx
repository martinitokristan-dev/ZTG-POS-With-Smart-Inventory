import React, { useState, useEffect } from 'react';
import TablePagination from '../../../shared/components/TablePagination';

/**
 * ManageUsersView — Clean, minimalist table for staff management with no data icons and 3-dots actions menu.
 */
export default function ManageUsersView({
    users = [],
    loading = false,
    searchQuery = '',
    onSearchChange,
    onViewUser,
    onAddStaff,
    onEditStaff,
    onToggleStaff,
    onResendVerification,
    onDeleteStaff,
    resendingId,
    permissions = {},
}) {
    const canCreate = permissions.canCreate ?? true;
    const canEdit = permissions.canEdit ?? true;
    const canDelete = permissions.canDelete ?? true;
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

    const filteredUsers = React.useMemo(() => {
        if (!searchQuery.trim()) return users;
        const q = searchQuery.toLowerCase();
        return users.filter(
            (u) =>
                (u.full_name || u.name || '').toLowerCase().includes(q) ||
                (u.username || '').toLowerCase().includes(q) ||
                (u.email || '').toLowerCase().includes(q) ||
                (u.role || '').toLowerCase().includes(q) ||
                (u.phone_number || '').toLowerCase().includes(q)
        );
    }, [users, searchQuery]);

    const paginatedUsers = React.useMemo(() => {
        if (perPage === 'All') return filteredUsers;
        const num = Number(perPage) || 10;
        const start = (currentPage - 1) * num;
        return filteredUsers.slice(start, start + num);
    }, [filteredUsers, currentPage, perPage]);

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
                            placeholder="Search staff by name, username, email, role..."
                            value={searchQuery}
                            onChange={(e) => {
                                onSearchChange(e.target.value);
                                setCurrentPage(1);
                            }}
                            style={{ paddingLeft: '44px' }}
                        />
                    </div>

                    {/* Register Staff Button (Guarded by canCreate) */}
                    {canCreate && (
                        <button
                            type="button"
                            onClick={onAddStaff}
                            className="btn btn-primary"
                        >
                            <span>Register New Staff</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Table Card */}
            <div className="card table-card" style={{ overflow: 'visible', paddingBottom: '80px' }}>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table className="data-table" style={{ width: '100%', minWidth: '780px', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', borderBottom: '2px solid var(--table-border)', background: 'var(--table-header-bg)' }}>
                            <tr>
                                <th style={{ padding: '12px 16px', fontWeight: '600', width: '22%' }}>Staff Member</th>
                                <th style={{ padding: '12px 16px', fontWeight: '600', width: '22%' }}>Email Address</th>
                                <th style={{ padding: '12px 16px', fontWeight: '600', width: '16%' }}>Phone Number</th>
                                <th style={{ padding: '12px 16px', fontWeight: '600', width: '16%' }}>Assigned Role</th>
                                <th style={{ padding: '12px 16px', fontWeight: '600', width: '14%' }}>Status</th>
                                <th style={{ padding: '12px 16px', fontWeight: '600', width: '10%', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        Loading staff members...
                                    </td>
                                </tr>
                            ) : paginatedUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No staff accounts found.
                                    </td>
                                </tr>
                            ) : (
                                paginatedUsers.map((u, idx) => {
                                    const isDefaultAdmin = u.id === 1 || u.username === 'admin' || u.employee_id === 'EMP-000';
                                    const isBottomRow = idx >= paginatedUsers.length - 2 && paginatedUsers.length > 2;

                                    return (
                                        <tr
                                            key={u.id}
                                            style={{
                                                borderBottom: '1px solid var(--table-border-subtle, var(--border))',
                                                transition: 'background-color 0.15s ease',
                                                minHeight: '48px',
                                            }}
                                            className="hover:bg-slate-50"
                                        >
                                            {/* Staff Member (Clean Text, NO initial circle avatar) */}
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '13.5px' }}>
                                                    {u.full_name || u.name || u.username}
                                                </div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                    @{u.username}
                                                </div>
                                            </td>

                                            {/* Email */}
                                            <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                                {u.email || u.user_profile?.email || '—'}
                                            </td>

                                            {/* Phone Number */}
                                            <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                                {u.phone_number || '—'}
                                            </td>

                                            {/* Assigned Role */}
                                            <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                                                {!u.role || u.role.trim() === '' ? (
                                                    <span style={{ display: 'inline-block', fontSize: '11.5px', fontWeight: '600', padding: '3px 8px', borderRadius: '6px', backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A' }}>
                                                        Unassigned
                                                    </span>
                                                ) : (
                                                    <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{u.role}</span>
                                                )}
                                            </td>

                                            {/* Account Status (Clean text badge, NO status dot circle) */}
                                            <td style={{ padding: '12px 16px' }}>
                                                {!u.email_verified_at && !isDefaultAdmin ? (
                                                    <span
                                                        style={{
                                                            display: 'inline-block',
                                                            fontSize: '11.5px',
                                                            fontWeight: '600',
                                                            padding: '3px 8px',
                                                            borderRadius: '6px',
                                                            backgroundColor: '#FEF3C7',
                                                            color: '#B45309',
                                                            border: '1px solid #FDE68A',
                                                        }}
                                                    >
                                                        Unverified
                                                    </span>
                                                ) : (
                                                    <span
                                                        style={{
                                                            display: 'inline-block',
                                                            fontSize: '11.5px',
                                                            fontWeight: '600',
                                                            padding: '3px 8px',
                                                            borderRadius: '6px',
                                                            backgroundColor: u.status === 'Active' ? '#DCFCE7' : '#FEE2E2',
                                                            color: u.status === 'Active' ? '#166534' : '#DC2626',
                                                            border: `1px solid ${u.status === 'Active' ? '#86EFAC' : '#FCA5A5'}`,
                                                        }}
                                                    >
                                                        {u.status || 'Active'}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                <div className="actions-cell-wrapper actions-collapse-wide">
                                                    {/* Inline Action Buttons (Visible when ample space) */}
                                                    <div className="actions-inline-group">
                                                        {/* 1. View User Details */}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (onViewUser) onViewUser(u);
                                                            }}
                                                            className="action-trigger-btn"
                                                            data-tooltip="View Details"
                                                            aria-label="View Details"
                                                        >
                                                            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                                <circle cx="12" cy="12" r="3" />
                                                            </svg>
                                                        </button>

                                                        {/* 2. Edit Staff */}
                                                        <button
                                                            type="button"
                                                            onClick={() => onEditStaff(u)}
                                                            className="action-trigger-btn"
                                                            data-tooltip="Edit Staff"
                                                            aria-label="Edit Staff"
                                                        >
                                                            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                            </svg>
                                                        </button>

                                                        {/* 3. Resend Verification (unverified only) */}
                                                        {!u.email_verified_at && !isDefaultAdmin && (
                                                            <button
                                                                type="button"
                                                                onClick={() => onResendVerification(u)}
                                                                disabled={resendingId === u.id}
                                                                className="action-trigger-btn"
                                                                data-tooltip={resendingId === u.id ? "Sending..." : "Resend Verification"}
                                                                aria-label="Resend Verification"
                                                                style={{ color: '#D97706', cursor: resendingId === u.id ? 'wait' : 'pointer' }}
                                                            >
                                                                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <polyline points="23 4 23 10 17 10"></polyline>
                                                                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                                                                </svg>
                                                            </button>
                                                        )}

                                                        {/* 4. Activate / Deactivate (non-default admin) */}
                                                        {!isDefaultAdmin && (
                                                            <button
                                                                type="button"
                                                                onClick={() => onToggleStaff(u)}
                                                                className="action-trigger-btn"
                                                                data-tooltip={u.status === 'Active' ? "Deactivate Staff" : "Activate Staff"}
                                                                aria-label={u.status === 'Active' ? "Deactivate Staff" : "Activate Staff"}
                                                                style={{ color: u.status === 'Active' ? '#DC2626' : '#16A34A' }}
                                                            >
                                                                {u.status === 'Active' ? (
                                                                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                        <circle cx="12" cy="12" r="10"></circle>
                                                                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                                                                    </svg>
                                                                ) : (
                                                                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                                                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                                                    </svg>
                                                                )}
                                                            </button>
                                                        )}

                                                        {/* 6. Delete Staff (non-default admin) */}
                                                        {!isDefaultAdmin && (
                                                            <button
                                                                type="button"
                                                                onClick={() => onDeleteStaff(u)}
                                                                className="action-trigger-btn"
                                                                data-tooltip="Delete Staff"
                                                                aria-label="Delete Staff"
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
                                                                setOpenDropdownId(openDropdownId === u.id ? null : u.id);
                                                            }}
                                                            className="action-trigger-btn"
                                                            aria-label="Staff options"
                                                            data-tooltip="Staff options"
                                                        >
                                                            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                                                                <circle cx="12" cy="5" r="2"></circle>
                                                                <circle cx="12" cy="12" r="2"></circle>
                                                                <circle cx="12" cy="19" r="2"></circle>
                                                            </svg>
                                                        </button>

                                                        {openDropdownId === u.id && (
                                                            <div
                                                                className="actions-dropdown-menu show"
                                                                style={{
                                                                    position: 'absolute',
                                                                    right: 0,
                                                                    ...(isBottomRow ? { bottom: 'calc(100% + 6px)', top: 'auto' } : { top: 'calc(100% + 6px)', bottom: 'auto' }),
                                                                    zIndex: 99999,
                                                                    minWidth: '165px',
                                                                }}
                                                            >
                                                                {/* 1. View Details */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setOpenDropdownId(null);
                                                                        if (onViewUser) onViewUser(u);
                                                                    }}
                                                                    className="actions-dropdown-item"
                                                                >
                                                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                                        <circle cx="12" cy="12" r="3" />
                                                                    </svg>
                                                                    <span>View Details</span>
                                                                </button>

                                                                {/* 2. Edit Staff */}
                                                                {canEdit && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setOpenDropdownId(null);
                                                                            onEditStaff(u);
                                                                        }}
                                                                        className="actions-dropdown-item"
                                                                    >
                                                                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                                            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                                        </svg>
                                                                        <span>Edit Staff</span>
                                                                    </button>
                                                                )}

                                                                {/* 4. Resend Verification */}
                                                                {canEdit && !u.email_verified_at && !isDefaultAdmin && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setOpenDropdownId(null);
                                                                            onResendVerification(u);
                                                                        }}
                                                                        disabled={resendingId === u.id}
                                                                        className="actions-dropdown-item"
                                                                        style={{ color: '#D97706' }}
                                                                    >
                                                                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                                                                            <polyline points="23 4 23 10 17 10"></polyline>
                                                                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                                                                        </svg>
                                                                        <span>{resendingId === u.id ? 'Sending...' : 'Resend Verification'}</span>
                                                                    </button>
                                                                )}

                                                                {/* 5. Activate / Deactivate */}
                                                                {canEdit && !isDefaultAdmin && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setOpenDropdownId(null);
                                                                            onToggleStaff(u);
                                                                        }}
                                                                        className={`actions-dropdown-item ${u.status === 'Active' ? 'disable' : 'enable'}`}
                                                                        style={{ color: u.status === 'Active' ? '#DC2626' : '#16A34A' }}
                                                                    >
                                                                        {u.status === 'Active' ? (
                                                                            <>
                                                                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                                                                                    <circle cx="12" cy="12" r="10"></circle>
                                                                                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                                                                                </svg>
                                                                                <span>Deactivate</span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                                                                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                                                                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                                                                </svg>
                                                                                <span>Activate</span>
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                )}

                                                                {/* 6. Delete Staff */}
                                                                {canDelete && !isDefaultAdmin && (
                                                                    <>
                                                                        <div className="actions-dropdown-divider" style={{ margin: '4px 0', borderTop: '1px solid var(--border)' }} />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setOpenDropdownId(null);
                                                                                onDeleteStaff(u);
                                                                            }}
                                                                            className="actions-dropdown-item disable"
                                                                        >
                                                                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                                                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                                            </svg>
                                                                            <span>Delete Staff</span>
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
                totalItems={filteredUsers.length}
                perPage={perPage}
                onPageChange={setCurrentPage}
                onPerPageChange={(val) => {
                    setPerPage(val);
                    setCurrentPage(1);
                }}
                label="staff"
            />
        </>
    );
}
