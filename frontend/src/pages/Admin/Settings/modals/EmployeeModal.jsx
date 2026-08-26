import React, { useState } from 'react';
import IOSSelect from '../../../../shared/components/IOSSelect';
import PasswordRequirementDetector from '../../../../shared/components/PasswordRequirementDetector';

export default function EmployeeModal({
    isOpen, showEmployeeModal,
    onClose, setShowEmployeeModal,
    selectedEmployee, employeeForm, setEmployeeForm,
    onSubmit, handleEmployeeSubmit,
    submitting, isSubmitting
}) {
    const [showPassword, setShowPassword] = useState(false);
    const [showPin, setShowPin] = useState(false);

    const isVisible = isOpen ?? showEmployeeModal;
    const isBusy = Boolean(submitting || isSubmitting);
    const handleClose = () => {
        if (isBusy) return;
        if (onClose) onClose();
        if (setShowEmployeeModal) setShowEmployeeModal(false);
    };
    const handleSubmit = onSubmit || handleEmployeeSubmit;

    if (!isVisible) return null;

    return (
        <div className="modal-overlay" style={{ display: 'flex' }}>
            <div className="modal-card" style={{ maxWidth: '480px' }}>
                <form onSubmit={handleSubmit}>
                    <div className="modal-header">
                        <h3 className="modal-title">{selectedEmployee ? 'Edit Staff Account' : 'Register New Staff'}</h3>
                        <button type="button" className="modal-close" onClick={handleClose}>
                            <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'none', stroke: 'currentColor', strokeWidth: '2' }}>
                                <path d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Full Name <span style={{ color: '#DC2626' }}>*</span></label>
                            <input 
                                type="text" 
                                className="form-control" 
                                required 
                                placeholder="Enter staff's full name (e.g. Jane Doe)"
                                value={employeeForm.full_name || employeeForm.name || ''}
                                onChange={(e) => setEmployeeForm({...employeeForm, full_name: e.target.value})}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Contact / Phone Number</label>
                            <input 
                                type="tel" 
                                className="form-control" 
                                placeholder="09XXXXXXXXX"
                                value={employeeForm.phone_number || ''}
                                maxLength={11}
                                inputMode="numeric"
                                onChange={(e) => setEmployeeForm({...employeeForm, phone_number: e.target.value.replace(/\D/g, '').slice(0, 11)})}
                                onKeyDown={(e) => {
                                    if (
                                        !/^[0-9]$/.test(e.key) && 
                                        !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter'].includes(e.key) &&
                                        !e.ctrlKey && !e.metaKey
                                    ) {
                                        e.preventDefault();
                                    }
                                }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Email Address <span style={{ color: '#DC2626' }}>*</span></label>
                            <input 
                                type="email" 
                                className="form-control" 
                                required 
                                placeholder="e.g. staff@ztgparts.com"
                                value={employeeForm.email || ''}
                                onChange={(e) => setEmployeeForm({...employeeForm, email: e.target.value})}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
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

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">
                                Password {selectedEmployee ? <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 'normal' }}>(Leave blank to keep unchanged)</span> : <span style={{ color: '#DC2626' }}>*</span>}
                            </label>
                            <div style={{ position: 'relative', width: '100%' }}>
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    className="form-control" 
                                    required={!selectedEmployee} 
                                    placeholder={selectedEmployee ? "••••••••" : "e.g. Staff*123"} 
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
                            <PasswordRequirementDetector 
                                password={employeeForm.password || ''} 
                                showWhenEmpty={!selectedEmployee} 
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
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
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Manager PIN / Approval Code</label>
                                <div style={{ position: 'relative', width: '100%' }}>
                                    <input 
                                        type={showPin ? "text" : "password"} 
                                        className="form-control" 
                                        placeholder="Custom PIN or Approval Code (Optional)" 
                                        style={{ paddingRight: '40px' }}
                                        value={employeeForm.pin || ''}
                                        onChange={(e) => setEmployeeForm({...employeeForm, pin: e.target.value})}
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
                                <small style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                                    Optional. If left blank, the employee's login password will automatically serve as their authorization PIN.
                                </small>
                            </div>
                        )}
                    </div>
                    <div className="modal-footer" style={{ padding: '16px 20px', marginTop: '8px' }}>
                        <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={isBusy}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isBusy} style={{ minWidth: '120px' }}>
                            {isBusy ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: '13px', height: '13px', borderWidth: '2px' }}></span>
                                    <span>{selectedEmployee ? 'Saving Profile...' : 'Registering...'}</span>
                                </span>
                            ) : (
                                selectedEmployee ? 'Save Profile' : 'Save Staff'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
