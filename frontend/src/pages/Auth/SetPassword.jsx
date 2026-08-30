import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../../shared/api';
import { applyGlobalTheme } from '../../shared/hooks/useTheme';
import PasswordRequirementDetector from '../../shared/components/PasswordRequirementDetector';

export default function SetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userInfo, setUserInfo] = useState(null);

    // Form inputs
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');

    // Toggle password visibility
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // Validation errors & states
    const [fieldErrors, setFieldErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.classList.remove('dark-theme');
        document.body.classList.remove('dark-theme');

        return () => {
            applyGlobalTheme();
        };
    }, []);

    useEffect(() => {
        if (!token) {
            setError({
                title: 'Invalid or Missing Link',
                message: 'No activation token was found. Please click the full activation link sent to your email address.',
            });
            setLoading(false);
            return;
        }

        const fetchAccountInfo = async () => {
            try {
                const res = await api.get(`/auth/set-password?token=${encodeURIComponent(token)}`);
                if (res.data?.success && res.data?.user) {
                    setUserInfo(res.data.user);
                } else {
                    setError({
                        title: 'Unable to Verify Link',
                        message: res.data?.message || 'We could not verify your activation link.',
                    });
                }
            } catch (err) {
                const data = err.response?.data;
                if (err.response?.status === 410) {
                    setError({
                        title: 'Link Expired',
                        message: data?.message || 'This activation link has expired. Please contact your system administrator to request a new invite.',
                    });
                } else if (err.response?.status === 404) {
                    setError({
                        title: 'Link Already Used or Invalid',
                        message: data?.message || 'This activation link is invalid or has already been used to activate an account.',
                    });
                } else {
                    setError({
                        title: 'Activation Error',
                        message: data?.message || 'An unexpected error occurred while verifying your link. Please contact your administrator.',
                    });
                }
            } finally {
                setLoading(false);
            }
        };

        fetchAccountInfo();
    }, [token]);

    const clearFieldError = (field) => {
        if (fieldErrors[field]) {
            const updated = { ...fieldErrors };
            delete updated[field];
            setFieldErrors(updated);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFieldErrors({});

        // Client-side validation checks
        const errors = {};
        if (!password) {
            errors.password = 'Please enter your new password.';
        } else if (password.length < 6) {
            errors.password = 'Password must be at least 6 characters long.';
        } else if (!/[A-Z]/.test(password)) {
            errors.password = 'Password must contain at least one uppercase letter.';
        } else if (!/[\W_]/.test(password)) {
            errors.password = 'Password must contain at least one special character.';
        }

        if (!passwordConfirmation) {
            errors.password_confirmation = 'Please confirm your new password.';
        } else if (password !== passwordConfirmation) {
            errors.password_confirmation = 'The password confirmation does not match.';
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        setSubmitting(true);

        try {
            const res = await api.post('/auth/set-password', {
                token,
                password,
                password_confirmation: passwordConfirmation,
            });

            if (res.data?.success) {
                setSuccess(true);
            }
        } catch (err) {
            if (err.response?.status === 422 && err.response?.data?.errors) {
                const backendErrors = {};
                for (const key of Object.keys(err.response.data.errors)) {
                    backendErrors[key] = err.response.data.errors[key][0];
                }
                setFieldErrors(backendErrors);
            } else if (err.response?.status === 410) {
                setError({
                    title: 'Link Expired',
                    message: err.response.data?.message || 'This activation link has expired. Please contact your administrator.',
                });
            } else {
                setFieldErrors({
                    general: err.response?.data?.message || 'Unable to set password. Please try again or contact your administrator.',
                });
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="login-body" style={{
            position: 'fixed',
            inset: 0,
            width: '100%',
            height: '100%',
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 16px',
            boxSizing: 'border-box',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
            {/* Ambient Background Glows */}
            <div className="login-bg-glow-1"></div>
            <div className="login-bg-glow-2"></div>

            <div className="login-card" style={{
                width: '100%',
                maxWidth: '460px',
                padding: 0,
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
                overflow: 'hidden',
                position: 'relative',
                zIndex: 10,
                margin: 'auto'
            }}>
                {/* Header */}
                <div style={{
                    padding: '28px 28px 20px',
                    textAlign: 'center',
                    borderBottom: '1px solid #F1F5F9',
                    background: '#FFFFFF'
                }}>
                    <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #DBEAFE',
                        color: '#2563EB',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '12px',
                        boxShadow: '0 2px 8px rgba(37, 99, 235, 0.08)'
                    }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                    </div>
                    <h1 style={{
                        fontSize: '18px',
                        fontWeight: '800',
                        color: '#0F172A',
                        margin: '0 0 4px',
                        letterSpacing: '-0.02em'
                    }}>
                        {success ? 'Account Activated' : 'Set Your Password'}
                    </h1>
                    <p style={{
                        fontSize: '13px',
                        color: '#64748B',
                        margin: 0,
                        lineHeight: 1.45
                    }}>
                        {success ? 'Your account is ready for use' : 'Create your personal password to activate your staff account'}
                    </p>
                </div>

                {/* Body Content */}
                <div style={{ padding: '24px 28px', background: '#FFFFFF' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '36px 0' }}>
                            <div className="spinner-border text-primary" role="status" style={{ width: '32px', height: '32px', borderWidth: '3px', color: '#2563EB' }}></div>
                            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '16px', marginBottom: 0, fontWeight: '500' }}>
                                Verifying your activation link...
                            </p>
                        </div>
                    ) : error ? (
                        <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                backgroundColor: '#FEF2F2',
                                border: '1px solid #FECACA',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#DC2626',
                                marginBottom: '14px'
                            }}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="8" x2="12" y2="12"></line>
                                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                </svg>
                            </div>
                            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: '0 0 8px' }}>
                                {error.title}
                            </h2>
                            <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.55, margin: '0 0 24px' }}>
                                {error.message}
                            </p>
                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                className="btn btn-primary"
                                style={{
                                    width: '100%',
                                    padding: '11px 16px',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    borderRadius: '8px',
                                    backgroundColor: '#2563EB',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                Return to Sign In
                            </button>
                        </div>
                    ) : success ? (
                        <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
                            <div style={{
                                width: '52px',
                                height: '52px',
                                borderRadius: '50%',
                                backgroundColor: '#F0FDF4',
                                border: '1px solid #BBF7D0',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#16A34A',
                                marginBottom: '16px'
                            }}>
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </div>
                            <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0F172A', margin: '0 0 8px' }}>
                                Account Activated!
                            </h2>
                            <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.55, margin: '0 0 24px' }}>
                                Your password has been set successfully. You can now sign in using your username <strong>@{userInfo?.username}</strong>.
                            </p>
                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                className="btn btn-primary"
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    fontSize: '13.5px',
                                    fontWeight: '700',
                                    borderRadius: '8px',
                                    backgroundColor: '#2563EB',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}
                            >
                                <span>Proceed to Sign In</span>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                    <polyline points="12 5 19 12 12 19"></polyline>
                                </svg>
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} noValidate>
                            {/* User details header pill */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px',
                                padding: '12px 14px',
                                backgroundColor: '#F8FAFC',
                                border: '1px solid #E2E8F0',
                                borderRadius: '10px',
                                marginBottom: '20px'
                            }}>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {userInfo.full_name}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {userInfo.email || 'No email attached'}
                                    </div>
                                </div>
                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: userInfo.role === 'Admin' ? '#FEE2E2' : userInfo.role === 'Supervisor' ? '#EDE9FE' : '#EFF6FF',
                                    color: userInfo.role === 'Admin' ? '#B91C1C' : userInfo.role === 'Supervisor' ? '#6D28D9' : '#1D4ED8',
                                    border: '1px solid rgba(0,0,0,0.06)',
                                    flexShrink: 0
                                }}>
                                    {userInfo.role}
                                </span>
                            </div>

                            {/* General error message */}
                            {fieldErrors.general && (
                                <div style={{
                                    padding: '10px 12px',
                                    backgroundColor: '#FEF2F2',
                                    border: '1px solid #FECACA',
                                    borderRadius: '8px',
                                    color: '#DC2626',
                                    fontSize: '12.5px',
                                    marginBottom: '16px',
                                    fontWeight: '500'
                                }}>
                                    {fieldErrors.general}
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                                {/* Username (Read-only) */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                                        Login Username
                                    </label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={userInfo.username}
                                        style={{
                                            width: '100%',
                                            boxSizing: 'border-box',
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #CBD5E1',
                                            backgroundColor: '#F1F5F9',
                                            color: '#0F172A',
                                            fontSize: '13.5px',
                                            fontWeight: '700',
                                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
                                        }}
                                    />
                                </div>

                                {/* New Password */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                                        New Password <span style={{ color: '#DC2626' }}>*</span>
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type={showNew ? 'text' : 'password'}
                                            placeholder="At least 6 characters"
                                            value={password}
                                            onChange={(e) => {
                                                clearFieldError('password');
                                                setPassword(e.target.value);
                                            }}
                                            style={{
                                                width: '100%',
                                                boxSizing: 'border-box',
                                                padding: '10px 38px 10px 12px',
                                                borderRadius: '8px',
                                                border: `1px solid ${fieldErrors.password ? '#EF4444' : '#CBD5E1'}`,
                                                backgroundColor: fieldErrors.password ? '#FEF2F2' : '#FFFFFF',
                                                color: '#0F172A',
                                                fontSize: '13.5px'
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNew(!showNew)}
                                            style={{
                                                position: 'absolute',
                                                right: '8px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'none',
                                                border: 'none',
                                                color: '#64748B',
                                                cursor: 'pointer',
                                                padding: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                            aria-label={showNew ? 'Hide password' : 'Show password'}
                                        >
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                {showNew ? (
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
                                    {fieldErrors.password && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px', color: '#DC2626', fontSize: '11.5px', fontWeight: '500' }}>
                                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                                <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
                                            </svg>
                                            <span>{fieldErrors.password}</span>
                                        </div>
                                    )}
                                    <PasswordRequirementDetector password={password} showWhenEmpty={true} />
                                </div>

                                {/* Confirm New Password */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                                        Confirm New Password <span style={{ color: '#DC2626' }}>*</span>
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type={showConfirm ? 'text' : 'password'}
                                            placeholder="Re-enter new password"
                                            value={passwordConfirmation}
                                            onChange={(e) => {
                                                clearFieldError('password_confirmation');
                                                setPasswordConfirmation(e.target.value);
                                            }}
                                            style={{
                                                width: '100%',
                                                boxSizing: 'border-box',
                                                padding: '10px 38px 10px 12px',
                                                borderRadius: '8px',
                                                border: `1px solid ${fieldErrors.password_confirmation ? '#EF4444' : '#CBD5E1'}`,
                                                backgroundColor: fieldErrors.password_confirmation ? '#FEF2F2' : '#FFFFFF',
                                                color: '#0F172A',
                                                fontSize: '13.5px'
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirm(!showConfirm)}
                                            style={{
                                                position: 'absolute',
                                                right: '8px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'none',
                                                border: 'none',
                                                color: '#64748B',
                                                cursor: 'pointer',
                                                padding: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                            aria-label={showConfirm ? 'Hide password' : 'Show password'}
                                        >
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                {showConfirm ? (
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
                                    {fieldErrors.password_confirmation && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px', color: '#DC2626', fontSize: '11.5px', fontWeight: '500' }}>
                                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                                <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
                                            </svg>
                                            <span>{fieldErrors.password_confirmation}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={submitting}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    fontSize: '13.5px',
                                    fontWeight: '700',
                                    borderRadius: '8px',
                                    backgroundColor: '#2563EB',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    cursor: submitting ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                                    opacity: submitting ? 0.75 : 1,
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                {submitting ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></span>
                                        <span>Activating Account...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Set Password & Activate Account</span>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                            <polyline points="12 5 19 12 12 19"></polyline>
                                        </svg>
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '14px 28px',
                    backgroundColor: '#F8FAFC',
                    borderTop: '1px solid #F1F5F9',
                    textAlign: 'center'
                }}>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>
                        Need assistance? Contact your administrator or return to <Link to="/login" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: '700' }}>Sign In</Link>.
                    </p>
                </div>
            </div>
        </div>
    );
}
