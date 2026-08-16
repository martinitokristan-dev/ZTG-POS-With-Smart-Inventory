import React, { useState, useEffect } from 'react';
import IOSSelect from '../../../../shared/components/IOSSelect';

export default function EmployeeModal({
    showEmployeeModal, setShowEmployeeModal,
    selectedEmployee, employeeForm, setEmployeeForm,
    handleEmployeeSubmit
}) {
    const [showPassword, setShowPassword] = useState(false);
    const [showPin, setShowPin] = useState(false);

    if (!showEmployeeModal) return null;

    return (
        <div className="modal-overlay" style={{ display: 'flex' }}>
            <div className="modal-card" style={{ maxWidth: '460px' }}>
                <form onSubmit={handleEmployeeSubmit}>
                    <div className="modal-header">
                        <h3 className="modal-title">{selectedEmployee ? 'Edit Employee Access' : 'Register New Employee'}</h3>
                        <button type="button" className="modal-close" onClick={() => setShowEmployeeModal(false)}>
                            <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'none', stroke: 'currentColor', strokeWidth: '2' }}>
                                <path d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Full Name <span style={{ color: '#DC2626' }}>*</span></label>
                            <input 
                                type="text" 
                                className="form-control" 
                                required 
                                placeholder="Enter employee's full name"
                                value={employeeForm.real_name || ''}
                                onChange={(e) => setEmployeeForm({...employeeForm, real_name: e.target.value})}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Login Username <span style={{ color: '#DC2626' }}>*</span></label>
                            <input 
                                type="text" 
                                className="form-control" 
                                required
                                placeholder="Enter login username (e.g. cashier1)"
                                value={employeeForm.username || ''}
                                onChange={(e) => setEmployeeForm({...employeeForm, username: e.target.value})}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Employee ID</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                placeholder={selectedEmployee ? '' : 'Auto-generated if left blank (EMP-XXX)'}
                                value={employeeForm.employee_id || ''}
                                onChange={(e) => setEmployeeForm({...employeeForm, employee_id: e.target.value})}
                                readOnly={!!selectedEmployee}
                                style={selectedEmployee ? { backgroundColor: 'var(--bg-canvas)' } : {}}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password {selectedEmployee ? <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 'normal' }}>(Leave blank to keep unchanged)</span> : <span style={{ color: '#DC2626' }}>*</span>}</label>
                            <div style={{ position: 'relative', width: '100%' }}>
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    className="form-control" 
                                    required={!selectedEmployee} 
                                    placeholder={selectedEmployee ? "••••••••" : "Enter login password (min. 4 chars)"} 
                                    style={{ paddingRight: '40px' }}
                                    value={employeeForm.password || ''}
                                    onChange={(e) => setEmployeeForm({...employeeForm, password: e.target.value})}
                                />
                                <button 
                                    type="button" 
                                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: '4px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                                        {showPassword ? (
                                            <>
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                                <line x1="1" y1="1" x2="23" y2="23"></line>
                                            </>
                                        ) : (
                                            <>
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                <circle cx="12" cy="12" r="3"></circle>
                                            </>
                                        )}
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Assigned Role</label>
                            <IOSSelect
                                value={employeeForm.role || 'Cashier'}
                                onChange={(e) => setEmployeeForm({...employeeForm, role: e.target.value})}
                                options={[
                                    { value: 'Cashier', label: 'Cashier' },
                                    { value: 'Supervisor', label: 'Supervisor' },
                                    { value: 'Admin', label: 'Administrator' }
                                ]}
                            />
                        </div>
                        {employeeForm.role !== 'Cashier' && (
                            <div className="form-group" style={{ marginTop: '10px' }}>
                                <label className="form-label">Manager PIN</label>
                                <div style={{ position: 'relative', width: '100%' }}>
                                    <input 
                                        type={showPin ? "text" : "password"} 
                                        className="form-control" 
                                        placeholder="4-digit PIN" 
                                        maxLength="4" 
                                        pattern="[0-9]{4}" 
                                        style={{ paddingRight: '40px' }}
                                        value={employeeForm.pin || ''}
                                        onChange={(e) => setEmployeeForm({...employeeForm, pin: e.target.value.replace(/\D/g, '')})}
                                    />
                                    <button 
                                        type="button" 
                                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: '4px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                                        onClick={() => setShowPin(!showPin)}
                                    >
                                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                                            {showPin ? (
                                                <>
                                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                                    <line x1="1" y1="1" x2="23" y2="23"></line>
                                                </>
                                            ) : (
                                                <>
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                    <circle cx="12" cy="12" r="3"></circle>
                                                </>
                                            )}
                                        </svg>
                                    </button>
                                </div>
                                <small style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Only Admin and Supervisor roles need a PIN.</small>
                            </div>
                        )}
                    </div>
                    <div className="modal-footer" style={{ padding: '12px 20px' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowEmployeeModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary">{selectedEmployee ? 'Save Profile' : 'Save Employee'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
