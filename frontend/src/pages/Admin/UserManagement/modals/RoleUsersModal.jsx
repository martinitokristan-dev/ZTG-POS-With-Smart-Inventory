import React, { useState } from 'react';
import IOSSelect from '../../../../shared/components/IOSSelect';

/**
 * RoleUsersModal — View and manage list of staff users currently assigned to a role.
 * Allows quick assignment of existing staff and removing/reassigning.
 */
export default function RoleUsersModal({
    isOpen,
    onClose,
    role,
    users = [],
    allUsers = [],
    loading = false,
    onAssignUser,
    onRemoveUser,
    onAddStaffForRole,
}) {
    const [selectedUserId, setSelectedUserId] = useState('');
    const [isAssigning, setIsAssigning] = useState(false);
    const [actionLoadingId, setActionLoadingId] = useState(null);

    if (!isOpen || !role) return null;

    // Filter staff members who are NOT currently assigned to this role
    const availableUsersToAssign = (allUsers || []).filter(
        (u) => (u.role || '').toLowerCase() !== (role.name || '').toLowerCase()
    );

    const userOptions = availableUsersToAssign.map((u) => ({
        value: String(u.id),
        label: `${u.full_name || u.name || u.username} (@${u.username})`,
    }));

    const handleAssign = async () => {
        if (!selectedUserId || !onAssignUser) return;
        setIsAssigning(true);
        try {
            await onAssignUser(role.id, parseInt(selectedUserId, 10));
            setSelectedUserId('');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to assign staff member.');
        } finally {
            setIsAssigning(false);
        }
    };

    const handleRemove = async (user) => {
        if (user.username === 'admin') {
            alert('The default system administrator cannot be removed from the Admin role.');
            return;
        }

        const targetRole = role.name === 'Cashier' ? 'Admin' : 'Cashier';
        if (!window.confirm(`Reassign @${user.username} from "${role.name}" to "${targetRole}"?`)) {
            return;
        }

        setActionLoadingId(user.id);
        try {
            if (onRemoveUser) {
                await onRemoveUser(role.id, user.id, targetRole);
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to reassign staff member.');
        } finally {
            setActionLoadingId(null);
        }
    };

    return (
        <div
            className="modal-overlay"
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 99999,
                padding: '20px',
            }}
        >
            <div
                className="modal-card"
                onClick={(e) => e.stopPropagation()}
                style={{
                    backgroundColor: 'var(--bg-card, #FFFFFF)',
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '840px',
                    maxHeight: '88vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    border: '1px solid var(--border)',
                    overflow: 'hidden',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        padding: '18px 24px',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                            style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '10px',
                                backgroundColor: '#EFF6FF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#2563EB',
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                Staff Assigned to {role.name}
                            </h3>
                            <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                                {users.length} staff member{users.length === 1 ? '' : 's'} assigned to this role
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            padding: '6px',
                            borderRadius: '6px',
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>
                    {/* Quick Assign Existing Staff Bar */}
                    {onAssignUser && availableUsersToAssign.length > 0 && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '14px 16px',
                                backgroundColor: 'var(--bg-secondary, #F8FAFC)',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                marginBottom: '20px',
                                flexWrap: 'wrap',
                            }}
                        >
                            <div style={{ flex: 1, minWidth: '240px' }}>
                                <IOSSelect
                                    value={selectedUserId}
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                    options={userOptions}
                                    placeholder="Select an existing staff member to assign..."
                                />
                            </div>

                            <button
                                type="button"
                                onClick={handleAssign}
                                disabled={!selectedUserId || isAssigning}
                                style={{
                                    height: '38px',
                                    padding: '0 18px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: selectedUserId ? '#2563EB' : '#94A3B8',
                                    color: '#FFFFFF',
                                    cursor: selectedUserId && !isAssigning ? 'pointer' : 'not-allowed',
                                    transition: 'all 0.15s ease',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {isAssigning ? 'Assigning...' : 'Assign to Role'}
                            </button>
                        </div>
                    )}

                    {/* Assigned Staff Members List */}
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
                        Current Members ({users.length})
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)', fontSize: '13px' }}>
                            Loading assigned staff...
                        </div>
                    ) : users.length === 0 ? (
                        <div
                            style={{
                                textAlign: 'center',
                                padding: '40px 20px',
                                backgroundColor: 'var(--bg-secondary, #F8FAFC)',
                                borderRadius: '12px',
                                border: '1px dashed var(--border)',
                                color: 'var(--text-muted)',
                                fontSize: '13px',
                            }}
                        >
                            No staff members are currently assigned to this role.
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                            {users.map((u) => {
                                const isDefaultAdmin = u.username === 'admin';
                                const isWorking = actionLoadingId === u.id;

                                return (
                                    <div
                                        key={u.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '12px 16px',
                                            borderRadius: '10px',
                                            border: '1px solid var(--border)',
                                            backgroundColor: 'var(--bg-card, #FFFFFF)',
                                            gap: '12px',
                                            flexWrap: 'wrap',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px' }}>
                                            <div
                                                style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '50%',
                                                    backgroundColor: '#EFF6FF',
                                                    color: '#2563EB',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: '700',
                                                    fontSize: '13px',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {(u.full_name || u.name || u.username || 'U').charAt(0).toUpperCase()}
                                            </div>

                                            <div>
                                                <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)' }}>
                                                    {u.full_name || u.name || u.username}
                                                </div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '10px', marginTop: '2px', flexWrap: 'wrap' }}>
                                                    <span>@{u.username}</span>
                                                    {u.email && <span>• {u.email}</span>}
                                                    {u.phone_number && <span>• {u.phone_number}</span>}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span
                                                style={{
                                                    fontSize: '11.5px',
                                                    fontWeight: '600',
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    backgroundColor: u.status === 'Active' ? '#DCFCE7' : '#F1F5F9',
                                                    color: u.status === 'Active' ? '#166534' : '#64748B',
                                                    border: u.status === 'Active' ? '1px solid #BBF7D0' : '1px solid var(--border)',
                                                }}
                                            >
                                                {u.status || 'Active'}
                                            </span>

                                            {/* Action: Remove / Reassign (non-default admin) */}
                                            {!isDefaultAdmin && onRemoveUser && (
                                                <button
                                                    type="button"
                                                    disabled={isWorking}
                                                    onClick={() => handleRemove(u)}
                                                    style={{
                                                        padding: '6px 14px',
                                                        fontSize: '12px',
                                                        fontWeight: '600',
                                                        borderRadius: '6px',
                                                        border: '1px solid #FEE2E2',
                                                        backgroundColor: '#FEF2F2',
                                                        color: '#DC2626',
                                                        cursor: isWorking ? 'wait' : 'pointer',
                                                        transition: 'all 0.15s ease',
                                                    }}
                                                >
                                                    {isWorking ? 'Removing...' : 'Remove / Reassign'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer — Register New Staff with this Role aligned to the right */}
                {onAddStaffForRole && (
                    <div
                        style={{
                            padding: '14px 24px',
                            borderTop: '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: '10px',
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                onAddStaffForRole({ role: role.name });
                            }}
                            style={{
                                padding: '8px 18px',
                                fontSize: '13px',
                                fontWeight: '600',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: '#2563EB',
                                color: '#FFFFFF',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            Register New Staff with this Role
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
