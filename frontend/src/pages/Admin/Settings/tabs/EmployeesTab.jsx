import React, { useState, useEffect } from 'react';

export default function EmployeesTab({
    employees, openEditEmployee, handleToggleEmployee, handleDeleteEmployee, openAddEmployee,
    setSelectedEmployee, setEmployeeForm, setShowEmployeeModal
}) {
    const [openDropdownId, setOpenDropdownId] = useState(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (!e.target.closest('.actions-dropdown-container')) {
                setOpenDropdownId(null);
            }
        };
        document.addEventListener('click', handleOutsideClick);
        return () => document.removeEventListener('click', handleOutsideClick);
    }, []);

    return (
        <div className="card table-card" style={{ overflow: 'visible' }}>
            <div style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '16px', color: 'var(--text-primary)' }}>
                    Staff & Role Management
                </h3>
                
                <div style={{ overflowX: 'visible', marginBottom: '16px' }}>
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ borderBottom: '2px solid var(--table-border)', background: 'var(--table-header-bg)' }}>
                            <tr>
                                <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: 'var(--table-text-secondary)', letterSpacing: '0.02em' }}>Full Name</th>
                                <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: 'var(--table-text-secondary)', letterSpacing: '0.02em' }}>Login Username</th>
                                <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: 'var(--table-text-secondary)', letterSpacing: '0.02em' }}>Email Address</th>
                                <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: 'var(--table-text-secondary)', letterSpacing: '0.02em' }}>Role</th>
                                <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: 'var(--table-text-secondary)', letterSpacing: '0.02em' }}>Phone Number</th>
                                <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: 'var(--table-text-secondary)', letterSpacing: '0.02em' }}>Status</th>
                                <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: 'var(--table-text-secondary)', letterSpacing: '0.02em', textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody style={{ fontSize: '15px' }}>
                            {employees.map(emp => {
                                const isDefaultAdmin = emp.id === 1 || emp.username === 'admin' || emp.employee_id === 'EMP-000';
                                return (
                                    <tr key={emp.id} style={{ borderBottom: '1px solid var(--table-border-subtle)', minHeight: '48px' }}>
                                        <td style={{ padding: '12px 16px', fontSize: '15px', fontWeight: '600', color: 'var(--table-text-primary)' }}>
                                            {emp.full_name || emp.name}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--table-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                                            @{emp.username}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--table-text-secondary)' }}>
                                            {emp.email || emp.user_profile?.email || '—'}
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ fontSize: '12px', background: 'var(--bg-main)', color: 'var(--table-text-secondary)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)', fontWeight: '600' }}>
                                                {emp.role}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--table-text-secondary)' }}>
                                            {emp.phone_number || '—'}
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ 
                                                fontSize: '12px', 
                                                background: emp.status === 'Active' ? '#dcfce7' : '#fee2e2', 
                                                color: emp.status === 'Active' ? '#16a34a' : '#dc2626', 
                                                padding: '2px 8px', 
                                                borderRadius: '4px', 
                                                fontWeight: '600',
                                                border: `1px solid ${emp.status === 'Active' ? '#86efac' : '#fca5a5'}`
                                            }}>
                                                {emp.status === 'Active' ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <div className="actions-dropdown-container" style={{ position: 'relative', display: 'inline-block' }}>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenDropdownId(openDropdownId === emp.id ? null : emp.id);
                                                    }} 
                                                    className="action-trigger-btn" 
                                                    aria-label="More actions" 
                                                    aria-haspopup="true" 
                                                    aria-expanded={openDropdownId === emp.id ? "true" : "false"}
                                                >
                                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                                        <circle cx="12" cy="5" r="2"></circle>
                                                        <circle cx="12" cy="12" r="2"></circle>
                                                        <circle cx="12" cy="19" r="2"></circle>
                                                    </svg>
                                                </button>
                                                <div 
                                                    className={`actions-dropdown-menu ${openDropdownId === emp.id ? 'show' : ''}`} 
                                                    role="menu"
                                                    style={{ minWidth: '150px' }}
                                                >
                                                    {/* 1. Edit */}
                                                    <button 
                                                        onClick={() => {
                                                            setOpenDropdownId(null);
                                                            openEditEmployee(emp);
                                                        }} 
                                                        className="actions-dropdown-item" 
                                                        role="menuitem"
                                                    >
                                                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                        </svg>
                                                        Edit Staff
                                                    </button>

                                                    {/* 2. Deactivate / Activate */}
                                                    {!isDefaultAdmin && (
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOpenDropdownId(null);
                                                                handleToggleEmployee(emp);
                                                            }} 
                                                            className={`actions-dropdown-item ${emp.status === 'Active' ? 'disable' : 'enable'}`} 
                                                            role="menuitem"
                                                            style={{ color: emp.status === 'Active' ? '#dc2626' : '#16a34a' }}
                                                        >
                                                            {emp.status === 'Active' ? (
                                                                <>
                                                                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                        <circle cx="12" cy="12" r="10"></circle>
                                                                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                                                                    </svg>
                                                                    Deactivate
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                                                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                                                    </svg>
                                                                    Activate
                                                                </>
                                                            )}
                                                        </button>
                                                    )}

                                                    {/* 3. Delete / Remove */}
                                                    {!isDefaultAdmin && (
                                                        <>
                                                            <div className="actions-dropdown-divider" style={{ margin: '4px 0', borderTop: '1px solid var(--border)' }}></div>
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setOpenDropdownId(null);
                                                                    handleDeleteEmployee(emp);
                                                                }} 
                                                                className="actions-dropdown-item disable" 
                                                                role="menuitem"
                                                                style={{ color: '#dc2626' }}
                                                            >
                                                                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <polyline points="3 6 5 6 21 6"></polyline>
                                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                                                    <line x1="14" y1="11" x2="14" y2="17"></line>
                                                                </svg>
                                                                Delete Staff
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div>
                    <button 
                        className="btn btn-primary"
                        onClick={openAddEmployee}
                    >
                        + Register New Staff
                    </button>
                </div>
            </div>
        </div>
    );
}
