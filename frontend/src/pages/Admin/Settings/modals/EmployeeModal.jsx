import React, { useState, useEffect } from 'react';
import IOSSelect from '../../../../shared/components/IOSSelect';
import api from '../../../../shared/api';

export default function EmployeeModal({
    isOpen, showEmployeeModal,
    onClose, setShowEmployeeModal,
    selectedEmployee, employeeForm, setEmployeeForm,
    onSubmit, handleEmployeeSubmit,
    submitting, isSubmitting,
    employeeErrors, setEmployeeErrors
}) {
    const [showPassword, setShowPassword] = useState(false);
    const [showPin, setShowPin] = useState(false);
    const [availableRoles, setAvailableRoles] = useState([
        { value: 'Cashier', label: 'Cashier' },
        { value: 'Technical Operations', label: 'Technical Operations' },
        { value: 'Admin', label: 'Administrator' }
    ]);

    useEffect(() => {
        api.get('/roles').then((res) => {
            if (res.data?.roles && res.data.roles.length > 0) {
                const mapped = res.data.roles.map(r => ({
                    value: r.name,
                    label: r.name === 'Admin' ? 'Administrator' : r.name
                }));
                setAvailableRoles(mapped);
            }
        }).catch(() => {});
    }, []);

    const isVisible = isOpen ?? showEmployeeModal;
    const isBusy = Boolean(submitting || isSubmitting);
    const handleClose = () => {
        if (isBusy) return;
        if (onClose) onClose();
        if (setShowEmployeeModal) setShowEmployeeModal(false);
        if (setEmployeeErrors) setEmployeeErrors({});
    };
    const handleSubmit = onSubmit || handleEmployeeSubmit;

    const getFieldError = (field) => {
        if (!employeeErrors || !employeeErrors[field]) return null;
        const err = employeeErrors[field];
        return Array.isArray(err) ? err[0] : err;
    };

    const clearFieldError = (field) => {
        if (setEmployeeErrors && employeeErrors?.[field]) {
            setEmployeeErrors(prev => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    if (!isVisible) return null;

    const fullNameError = getFieldError('full_name');
    const phoneError = getFieldError('phone_number');
    const emailError = getFieldError('email');
    const usernameError = getFieldError('username');
    const passwordError = getFieldError('password');
    const pinError = getFieldError('pin');

    return (
        <div className="modal-overlay" style={{ display: 'flex' }}>
            <div className="modal-card" style={{ maxWidth: '480px' }}>
                <form onSubmit={handleSubmit}>
                    <div className="modal-header">
                        <h3 className="modal-title">{selectedEmployee ? 'Edit Staff Account' : 'Register New Staff'}</h3>
                        <button type="button" className="modal-close" onClick={handleClose}>
                            <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'none', stroke: 'currentColor', strokeWidth: '2' }}>
                                <path d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* Info banner — only shown when creating a new staff */}
                        {!selectedEmployee && (
                            <div style={{
                                display: 'flex',
                                gap: '10px',
                                alignItems: 'flex-start',
                                backgroundColor: '#EFF6FF',
                                border: '1px solid #BFDBFE',
                                borderRadius: '10px',
                                padding: '12px 14px',
                            }}>
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <div>
                                    <p style={{ margin: '0 0 4px 0', fontSize: '12.5px', fontWeight: '700', color: '#1D4ED8' }}>
                                        Staff Invitation & Activation
                                    </p>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#3B82F6', lineHeight: '1.5' }}>
                                        An activation link will be sent to the staff member’s email so they can securely set their password and activate their account.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Full Name */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Full Name <span style={{ color: '#DC2626' }}>*</span></label>
                            <input
                                type="text"
                                className="form-control"
                                required
                                placeholder="Enter staff's full name (e.g. Jane Doe)"
                                style={fullNameError ? { borderColor: '#EF4444', backgroundColor: '#FEF2F2' } : {}}
                                value={employeeForm.full_name || employeeForm.name || ''}
                                onChange={(e) => {
                                    clearFieldError('full_name');
                                    setEmployeeForm({ ...employeeForm, full_name: e.target.value });
                                }}
                            />
                            {fullNameError && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px', color: '#DC2626', fontSize: '11.5px', fontWeight: '500' }}>
                                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                                    </svg>
                                    <span>{fullNameError}</span>
                                </div>
                            )}
                        </div>

                        {/* Phone Number */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Contact / Phone Number</label>
                            <input
                                type="tel"
                                className="form-control"
                                placeholder="09XXXXXXXXX"
                                style={phoneError ? { borderColor: '#EF4444', backgroundColor: '#FEF2F2' } : {}}
                                value={employeeForm.phone_number || ''}
                                maxLength={11}
                                inputMode="numeric"
                                onChange={(e) => {
                                    clearFieldError('phone_number');
                                    setEmployeeForm({ ...employeeForm, phone_number: e.target.value.replace(/\D/g, '').slice(0, 11) });
                                }}
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
                            {phoneError && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px', color: '#DC2626', fontSize: '11.5px', fontWeight: '500' }}>
                                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                                    </svg>
                                    <span>{phoneError}</span>
                                </div>
                            )}
                        </div>

                        {/* Email Address */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Email Address <span style={{ color: '#DC2626' }}>*</span></label>
                            <input
                                type="email"
                                className="form-control"
                                required
                                placeholder="e.g. staff@ztgparts.com"
                                style={emailError ? { borderColor: '#EF4444', backgroundColor: '#FEF2F2' } : {}}
                                value={employeeForm.email || ''}
                                onChange={(e) => {
                                    clearFieldError('email');
                                    setEmployeeForm({ ...employeeForm, email: e.target.value });
                                }}
                            />
                            {emailError ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px', color: '#DC2626', fontSize: '11.5px', fontWeight: '500' }}>
                                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                                    </svg>
                                    <span>{emailError}</span>
                                </div>
                            ) : (
                                !selectedEmployee && (
                                    <small style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                                        The verification link and temporary credentials will be sent here.
                                    </small>
                                )
                            )}
                        </div>

                        {/* Username */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Login Username <span style={{ color: '#DC2626' }}>*</span></label>
                            <input
                                type="text"
                                className="form-control"
                                required
                                placeholder="Enter login username (e.g. cashier1)"
                                style={usernameError ? { borderColor: '#EF4444', backgroundColor: '#FEF2F2' } : {}}
                                value={employeeForm.username || ''}
                                onChange={(e) => {
                                    clearFieldError('username');
                                    setEmployeeForm({ ...employeeForm, username: e.target.value });
                                }}
                            />
                            {usernameError && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px', color: '#DC2626', fontSize: '11.5px', fontWeight: '500' }}>
                                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                                    </svg>
                                    <span>{usernameError}</span>
                                </div>
                            )}
                        </div>

                        {/* Password field — only shown in Edit mode (changing existing password) */}
                        {selectedEmployee && (
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">
                                    New Password <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 'normal' }}>(Leave blank to keep unchanged)</span>
                                </label>
                                <div style={{ position: 'relative', width: '100%' }}>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className="form-control"
                                        placeholder="••••••••"
                                        style={{ paddingRight: '40px', ...(passwordError ? { borderColor: '#EF4444', backgroundColor: '#FEF2F2' } : {}) }}
                                        value={employeeForm.password || ''}
                                        onChange={(e) => {
                                            clearFieldError('password');
                                            setEmployeeForm({ ...employeeForm, password: e.target.value });
                                        }}
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
                                {passwordError && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px', color: '#DC2626', fontSize: '11.5px', fontWeight: '500' }}>
                                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                                        </svg>
                                        <span>{passwordError}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Assigned Role */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Assigned Role</label>
                            <IOSSelect
                                value={employeeForm.role || 'Cashier'}
                                onChange={(e) => setEmployeeForm({ ...employeeForm, role: e.target.value })}
                                options={availableRoles}
                            />
                        </div>

                        {/* Manager PIN */}
                        {employeeForm.role !== 'Cashier' && (
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Manager PIN / Approval Code</label>
                                <div style={{ position: 'relative', width: '100%' }}>
                                    <input
                                        type={showPin ? "text" : "password"}
                                        className="form-control"
                                        placeholder="Custom PIN or Approval Code (Optional)"
                                        style={{ paddingRight: '40px', ...(pinError ? { borderColor: '#EF4444', backgroundColor: '#FEF2F2' } : {}) }}
                                        value={employeeForm.pin || ''}
                                        onChange={(e) => {
                                            clearFieldError('pin');
                                            setEmployeeForm({ ...employeeForm, pin: e.target.value });
                                        }}
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
                                {pinError ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px', color: '#DC2626', fontSize: '11.5px', fontWeight: '500' }}>
                                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                                        </svg>
                                        <span>{pinError}</span>
                                    </div>
                                ) : (
                                    <small style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                                        Optional. If left blank, the employee's login password will automatically serve as their authorization PIN.
                                    </small>
                                )}
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
                                selectedEmployee ? 'Save Profile' : 'Register Staff'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
