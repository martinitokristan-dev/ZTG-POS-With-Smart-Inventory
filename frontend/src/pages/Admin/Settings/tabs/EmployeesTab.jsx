import React from 'react';

export default function EmployeesTab({
    employees, openEditEmployee, handleToggleEmployee, openAddEmployee,
    setSelectedEmployee, setEmployeeForm, setShowEmployeeModal
}) {
    return (
        <div className="card table-card">
            <div style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '16px', color: 'var(--text-primary)' }}>
                    Staff & Role Management
                </h3>
                
                <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
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
                                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                                                <button 
                                                    onClick={() => openEditEmployee(emp)}
                                                    className="btn btn-secondary btn-sm"
                                                >
                                                    Edit
                                                </button>
                                                <button 
                                                    onClick={() => handleToggleEmployee(emp)}
                                                    disabled={isDefaultAdmin}
                                                    className="btn btn-danger btn-sm"
                                                    style={isDefaultAdmin ? { opacity: 0.5, cursor: 'not-allowed' } : { background: 'transparent', color: '#dc2626', borderColor: '#fca5a5' }}
                                                >
                                                    {emp.status === 'Active' ? 'Deactivate' : 'Activate'}
                                                </button>
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

