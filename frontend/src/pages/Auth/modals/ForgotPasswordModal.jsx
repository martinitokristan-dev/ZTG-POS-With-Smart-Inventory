import React, { useState, useEffect } from 'react';
import api from '../../../shared/api';
import PasswordRequirementDetector from '../../../shared/components/PasswordRequirementDetector';

export default function ForgotPasswordModal({ isOpen, onClose, onPasswordResetSuccess }) {
    const [step, setStep] = useState(1); // 1: Email, 2: Code & New Password, 3: Success
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [countdown, setCountdown] = useState(0);

    useEffect(() => {
        if (!isOpen) {
            // Reset state when modal is closed
            setStep(1);
            setEmail('');
            setCode('');
            setPassword('');
            setPasswordConfirmation('');
            setError('');
            setSuccessMessage('');
            setLoading(false);
            setCountdown(0);
        }
    }, [isOpen]);

    useEffect(() => {
        let timer = null;
        if (countdown > 0) {
            timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [countdown]);

    if (!isOpen) return null;

    // STEP 1: Request 6-digit OTP
    const handleSendCode = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await api.post('/forgot-password', {
                email: email.trim()
            });

            setSuccessMessage(res.data.message || 'Verification code sent to your email.');
            setStep(2);
            setCountdown(60); // 60 seconds cooldown for resending
        } catch (err) {
            const errData = err.response?.data;
            if (errData?.errors?.email) {
                setError(errData.errors.email[0]);
            } else if (errData?.message) {
                setError(errData.message);
            } else {
                setError('Failed to send verification code. Please check your internet connection.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Resend code trigger in Step 2
    const handleResendCode = async () => {
        if (countdown > 0 || loading) return;
        setError('');
        setLoading(true);

        try {
            const res = await api.post('/forgot-password', {
                email: email.trim()
            });
            setSuccessMessage(res.data.message || 'A fresh verification code has been sent.');
            setCountdown(60);
        } catch (err) {
            const errData = err.response?.data;
            setError(errData?.message || 'Failed to resend code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // STEP 2: Submit Code & New Password
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== passwordConfirmation) {
            setError('New password and confirmation password do not match.');
            return;
        }

        // Basic client-side complexity check ahead of backend validation
        if (password.length < 6 || !/[A-Z]/.test(password) || !/[\W_]/.test(password)) {
            setError('Password must be at least 6 characters with 1 uppercase letter (A-Z) and 1 special symbol (e.g. *, !, @, #).');
            return;
        }

        setLoading(true);

        try {
            const res = await api.post('/reset-password', {
                email: email.trim(),
                code: code.trim(),
                password: password,
                password_confirmation: passwordConfirmation
            });

            setSuccessMessage(res.data.message || 'Password reset successfully!');
            setStep(3);
            if (onPasswordResetSuccess) {
                onPasswordResetSuccess(email.trim());
            }
        } catch (err) {
            const errData = err.response?.data;
            if (errData?.errors) {
                const firstKey = Object.keys(errData.errors)[0];
                setError(errData.errors[firstKey]?.[0] || 'Password reset failed.');
            } else if (errData?.message) {
                setError(errData.message);
            } else {
                setError('Failed to reset password. Please check your code or try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', position: 'fixed', inset: 0, padding: '16px' }}>
            <div className="modal-card" style={{ maxWidth: '440px', width: '100%', backgroundColor: '#FFFFFF', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #E2E8F0', animation: 'modalSlideIn 0.2s ease-out' }}>
                
                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg viewBox="0 0 24 24" width="19" height="19" stroke="#2563EB" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                            {step === 3 ? 'Password Updated' : 'Reset Password'}
                        </h3>
                        <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                            {step === 1 && 'Enter your registered email to receive a reset code'}
                            {step === 2 && 'Verify code and create a new password'}
                            {step === 3 && 'Your credentials have been securely updated'}
                        </p>
                    </div>
                    <button 
                        type="button" 
                        onClick={onClose} 
                        style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Error Banner */}
                {error && (
                    <div style={{ margin: '16px 24px 0 24px', backgroundColor: '#FEF2F2', color: '#991B1B', padding: '10px 14px', borderRadius: '8px', border: '1px solid #FECACA', fontSize: '12.5px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="#DC2626" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <span>{error}</span>
                    </div>
                )}

                {/* Body Content */}
                <div style={{ padding: '20px 24px' }}>
                    {/* STEP 1: Enter Email */}
                    {step === 1 && (
                        <form onSubmit={handleSendCode} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px', display: 'block' }}>
                                    Email Address <span style={{ color: '#EF4444' }}>*</span>
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <svg viewBox="0 0 24 24" width="17" height="17" stroke="#94A3B8" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                        <polyline points="22,6 12,13 2,6"></polyline>
                                    </svg>
                                    <input 
                                        type="email" 
                                        required 
                                        placeholder="e.g. admin@ztg.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={loading}
                                        className="form-control"
                                        style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <small style={{ color: '#64748B', fontSize: '11px', marginTop: '5px', display: 'block' }}>
                                    We will send a 6-digit authentication code to this email.
                                </small>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                                <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '9px 16px', fontSize: '13px', borderRadius: '8px' }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={loading || !email.trim()} style={{ padding: '9px 20px', fontSize: '13px', borderRadius: '8px' }}>
                                    {loading ? 'Sending Code...' : 'Send Reset Code'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* STEP 2: Enter Code & New Password */}
                    {step === 2 && (
                        <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#1E40AF', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span>Code sent to <strong>{email}</strong></span>
                                <button 
                                    type="button" 
                                    onClick={() => { setStep(1); setError(''); }}
                                    style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '11.5px', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                                >
                                    Change
                                </button>
                            </div>

                            {/* 6-digit Code Input */}
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px', display: 'block' }}>
                                    6-Digit Verification Code <span style={{ color: '#EF4444' }}>*</span>
                                </label>
                                <input 
                                    type="text" 
                                    required 
                                    maxLength="6"
                                    placeholder="Enter 6-digit code"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                                    disabled={loading}
                                    className="form-control"
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '15px', fontWeight: '700', letterSpacing: '4px', textAlign: 'center', boxSizing: 'border-box' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                    <small style={{ color: '#64748B', fontSize: '11px' }}>
                                        Check your inbox or spam folder.
                                    </small>
                                    <button 
                                        type="button"
                                        onClick={handleResendCode}
                                        disabled={countdown > 0 || loading}
                                        style={{ background: 'none', border: 'none', color: countdown > 0 ? '#94A3B8' : '#2563EB', fontSize: '11.5px', fontWeight: '600', cursor: countdown > 0 ? 'default' : 'pointer', padding: 0 }}
                                    >
                                        {countdown > 0 ? `Resend code (${countdown}s)` : 'Resend code'}
                                    </button>
                                </div>
                            </div>

                            {/* New Password */}
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px', display: 'block' }}>
                                    New Password <span style={{ color: '#EF4444' }}>*</span>
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        required 
                                        placeholder="Enter new password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={loading}
                                        className="form-control"
                                        style={{ width: '100%', padding: '10px 40px 10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: '4px', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                    >
                                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                            {showPassword ? (
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                            ) : (
                                                <>
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                    <circle cx="12" cy="12" r="3"></circle>
                                                </>
                                            )}
                                        </svg>
                                    </button>
                                </div>
                                <PasswordRequirementDetector password={password} showWhenEmpty={true} />
                            </div>

                            {/* Confirm Password */}
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px', display: 'block' }}>
                                    Confirm New Password <span style={{ color: '#EF4444' }}>*</span>
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input 
                                        type={showConfirmPassword ? "text" : "password"} 
                                        required 
                                        placeholder="Confirm new password"
                                        value={passwordConfirmation}
                                        onChange={(e) => setPasswordConfirmation(e.target.value)}
                                        disabled={loading}
                                        className="form-control"
                                        style={{ width: '100%', padding: '10px 40px 10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: '4px', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                    >
                                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                            {showConfirmPassword ? (
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
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

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '9px 16px', fontSize: '13px', borderRadius: '8px' }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={loading || !code || !password || !passwordConfirmation} style={{ padding: '9px 20px', fontSize: '13px', borderRadius: '8px' }}>
                                    {loading ? 'Resetting...' : 'Reset Password'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* STEP 3: Success Screen */}
                    {step === 3 && (
                        <div style={{ textAlign: 'center', padding: '12px 0' }}>
                            <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                                <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </div>
                            <h4 style={{ margin: '0 0 8px 0', color: '#0F172A', fontSize: '17px', fontWeight: '700' }}>
                                Password Reset Successful!
                            </h4>
                            <p style={{ margin: '0 0 24px 0', color: '#64748B', fontSize: '13px', lineHeight: '1.5' }}>
                                Your password and manager PIN have been updated. You can now sign in using your new credentials.
                            </p>
                            <button 
                                type="button" 
                                onClick={onClose} 
                                className="btn btn-primary" 
                                style={{ width: '100%', padding: '10px 0', fontSize: '14px', borderRadius: '8px' }}
                            >
                                Back to Sign In
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
