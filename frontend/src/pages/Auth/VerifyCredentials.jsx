import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../../shared/api';

export default function VerifyCredentials() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [credentials, setCredentials] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [copiedField, setCopiedField] = useState(null);
    const [sendingBackup, setSendingBackup] = useState(false);
    const [backupSent, setBackupSent] = useState(false);
    const [backupMessage, setBackupMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setError({
                title: 'Missing Verification Token',
                message: 'No verification token was provided in the link. Please verify you clicked the complete link in your email.',
            });
            setLoading(false);
            return;
        }

        const fetchCredentials = async () => {
            try {
                const res = await api.post('/auth/reveal-credentials', { token });
                if (res.data?.success && res.data?.credentials) {
                    setCredentials(res.data.credentials);
                } else {
                    setError({
                        title: 'Verification Failed',
                        message: res.data?.message || 'Unable to retrieve your credentials.',
                    });
                }
            } catch (err) {
                const data = err.response?.data;
                if (err.response?.status === 410) {
                    setError({
                        title: 'Link Expired or Already Used',
                        message: data?.message || 'This credential link has already been accessed and expired for security reasons.',
                    });
                } else if (err.response?.status === 404) {
                    setError({
                        title: 'Invalid Credential Link',
                        message: data?.message || 'The verification link is invalid or no longer exists.',
                    });
                } else {
                    setError({
                        title: 'Verification Error',
                        message: data?.message || 'An error occurred while validating your credentials. Please contact your administrator.',
                    });
                }
            } finally {
                setLoading(false);
            }
        };

        fetchCredentials();
    }, [token]);

    const handleCopy = (text, fieldName) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2500);
    };

    const handleCopyAll = () => {
        if (!credentials) return;
        const portalUrl = window.location.origin + '/login';
        const formatted = [
            `=========================================`,
            `ZTG HEAVY PARTS - ACCOUNT CREDENTIALS`,
            `=========================================`,
            `Full Name:       ${credentials.full_name}`,
            `Assigned Role:   ${credentials.role}`,
            `Email Address:   ${credentials.email || '—'}`,
            `Login Username:  ${credentials.username}`,
            `Password:        ${credentials.password}`,
            `Login Portal:    ${portalUrl}`,
            `=========================================`,
        ].join('\n');

        navigator.clipboard.writeText(formatted);
        setCopiedField('all');
        setTimeout(() => setCopiedField(null), 2500);
    };

    const handleSendBackupEmail = async () => {
        if (!token || sendingBackup || backupSent) return;
        setSendingBackup(true);
        setBackupMessage('');

        try {
            const res = await api.post('/auth/send-credential-backup', { token });
            if (res.data?.success) {
                setBackupSent(true);
                setBackupMessage(res.data.message || 'Backup copy sent to your email!');
            } else {
                setBackupMessage('Failed to send backup email.');
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to send backup email.';
            setBackupMessage(msg);
        } finally {
            setSendingBackup(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#F1F5F9',
            padding: '24px 16px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '540px',
                background: '#FFFFFF',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)',
                border: '1px solid #E2E8F0'
            }}>
                {/* Header Banner */}
                <div style={{
                    padding: '28px 24px 22px',
                    background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                    textAlign: 'center',
                    color: '#FFFFFF'
                }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        marginBottom: '10px'
                    }}>
                        <svg viewBox="0 0 24 24" width="22" height="22" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                    </div>
                    <h1 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: '800', letterSpacing: '0.5px' }}>
                        ZTG HEAVY PARTS
                    </h1>
                    <p style={{ margin: 0, fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: '600' }}>
                        Staff Account Verification
                    </p>
                </div>

                {/* Content Body */}
                <div style={{ padding: '28px 24px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                            <div className="spinner-border text-primary" role="status" style={{ width: '36px', height: '36px', borderWidth: '3px', color: '#2563EB' }}></div>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1E293B', marginTop: '16px', marginBottom: '4px' }}>
                                Verifying Your Credential Token...
                            </h3>
                            <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
                                Decrypting your one-time staff credentials securely.
                            </p>
                        </div>
                    ) : error ? (
                        <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                            <div style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '50%',
                                background: '#FEF2F2',
                                border: '1px solid #FECACA',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '14px'
                            }}>
                                <svg viewBox="0 0 24 24" width="28" height="28" stroke="#DC2626" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="8" x2="12" y2="12"></line>
                                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                </svg>
                            </div>
                            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A', marginBottom: '8px' }}>
                                {error.title}
                            </h3>
                            <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.6, maxWidth: '420px', margin: '0 auto 24px' }}>
                                {error.message}
                            </p>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => navigate('/login')}
                                    style={{
                                        padding: '10px 20px',
                                        fontSize: '13px',
                                        fontWeight: '700',
                                        borderRadius: '8px',
                                        background: '#2563EB',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Go to Login Page
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => navigate('/forgot-password')}
                                    style={{
                                        padding: '10px 20px',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        borderRadius: '8px',
                                        background: '#F1F5F9',
                                        color: '#475569',
                                        border: '1px solid #CBD5E1',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Forgot Password?
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            {/* Success Badge */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    background: '#DCFCE7',
                                    border: '1px solid #86EFAC',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="#16A34A" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#0F172A', margin: '0 0 2px' }}>
                                        Account Verified Successfully
                                    </h2>
                                    <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                                        Welcome, <strong style={{ color: '#0F172A' }}>{credentials.full_name}</strong>! Below are your login credentials.
                                    </p>
                                </div>
                            </div>

                            {/* Account Details Badges */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                flexWrap: 'wrap',
                                marginBottom: '18px',
                                padding: '10px 14px',
                                background: '#F8FAFC',
                                border: '1px solid #E2E8F0',
                                borderRadius: '10px'
                            }}>
                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    textTransform: 'uppercase',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    background: credentials.role === 'Admin' ? '#FEE2E2' : credentials.role === 'Supervisor' ? '#EDE9FE' : '#EFF6FF',
                                    color: credentials.role === 'Admin' ? '#B91C1C' : credentials.role === 'Supervisor' ? '#6D28D9' : '#1D4ED8',
                                    border: '1px solid rgba(0,0,0,0.06)'
                                }}>
                                    Role: {credentials.role}
                                </span>
                                {credentials.email && (
                                    <span style={{ fontSize: '12px', color: '#475569', fontWeight: '500' }}>
                                        ✉️ {credentials.email}
                                    </span>
                                )}
                            </div>

                            {/* Credentials Card */}
                            <div style={{
                                background: '#FFFFFF',
                                border: '2px solid #E2E8F0',
                                borderRadius: '12px',
                                padding: '18px',
                                marginBottom: '18px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '14px'
                            }}>
                                {/* Username */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                                        Login Username
                                    </label>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <input
                                            type="text"
                                            readOnly
                                            value={credentials.username}
                                            style={{
                                                flex: 1,
                                                padding: '10px 12px',
                                                borderRadius: '8px',
                                                border: '1px solid #CBD5E1',
                                                background: '#F8FAFC',
                                                fontSize: '14px',
                                                fontWeight: '700',
                                                color: '#1E293B',
                                                fontFamily: 'monospace'
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleCopy(credentials.username, 'username')}
                                            style={{
                                                padding: '10px 14px',
                                                borderRadius: '8px',
                                                border: '1px solid #CBD5E1',
                                                background: copiedField === 'username' ? '#DCFCE7' : '#FFFFFF',
                                                color: copiedField === 'username' ? '#16A34A' : '#334155',
                                                fontSize: '12.5px',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {copiedField === 'username' ? '✓ Copied' : 'Copy'}
                                        </button>
                                    </div>
                                </div>

                                {/* Password */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                                        Password
                                    </label>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <div style={{ position: 'relative', flex: 1 }}>
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                readOnly
                                                value={credentials.password}
                                                style={{
                                                    width: '100%',
                                                    boxSizing: 'border-box',
                                                    padding: '10px 38px 10px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #CBD5E1',
                                                    background: '#F8FAFC',
                                                    fontSize: '14px',
                                                    fontWeight: '700',
                                                    color: '#1E293B',
                                                    fontFamily: showPassword ? 'monospace' : 'inherit'
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                title={showPassword ? 'Hide password' : 'Show password'}
                                                style={{
                                                    position: 'absolute',
                                                    right: '8px',
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#64748B',
                                                    cursor: 'pointer',
                                                    padding: '4px'
                                                }}
                                            >
                                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
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
                                        <button
                                            type="button"
                                            onClick={() => handleCopy(credentials.password, 'password')}
                                            style={{
                                                padding: '10px 14px',
                                                borderRadius: '8px',
                                                border: '1px solid #CBD5E1',
                                                background: copiedField === 'password' ? '#DCFCE7' : '#FFFFFF',
                                                color: copiedField === 'password' ? '#16A34A' : '#334155',
                                                fontSize: '12.5px',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {copiedField === 'password' ? '✓ Copied' : 'Copy'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Security Expiry Alert */}
                            <div style={{
                                background: '#FFFBEB',
                                border: '1px solid #FDE68A',
                                borderRadius: '10px',
                                padding: '12px 14px',
                                marginBottom: '20px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px'
                            }}>
                                <svg viewBox="0 0 24 24" width="18" height="18" stroke="#D97706" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                    <line x1="12" y1="9" x2="12" y2="13"/>
                                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                                </svg>
                                <div style={{ fontSize: '12px', color: '#92400E', lineHeight: 1.5 }}>
                                    <strong>One-Time Security Warning:</strong> This credential reveal page is single-use only. Once you navigate away or refresh, this link will expire permanently.
                                </div>
                            </div>

                            {/* Actions Group */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    {/* Copy All Button */}
                                    <button
                                        type="button"
                                        onClick={handleCopyAll}
                                        style={{
                                            padding: '11px 14px',
                                            borderRadius: '8px',
                                            border: '1.5px solid #CBD5E1',
                                            background: copiedField === 'all' ? '#DCFCE7' : '#FFFFFF',
                                            color: copiedField === 'all' ? '#16A34A' : '#1E293B',
                                            fontSize: '13px',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                        </svg>
                                        {copiedField === 'all' ? '✓ Copied All!' : 'Copy All Details'}
                                    </button>

                                    {/* Send Backup to Email Button */}
                                    <button
                                        type="button"
                                        onClick={handleSendBackupEmail}
                                        disabled={sendingBackup || backupSent}
                                        style={{
                                            padding: '11px 14px',
                                            borderRadius: '8px',
                                            border: '1.5px solid #BFDBFE',
                                            background: backupSent ? '#DCFCE7' : '#EFF6FF',
                                            color: backupSent ? '#16A34A' : '#1D4ED8',
                                            fontSize: '13px',
                                            fontWeight: '700',
                                            cursor: (sendingBackup || backupSent) ? 'default' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        {sendingBackup ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: '12px', height: '12px', borderWidth: '2px' }}></span>
                                                Sending...
                                            </>
                                        ) : backupSent ? (
                                            <>✓ Backup Sent</>
                                        ) : (
                                            <>
                                                <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                                    <polyline points="22,6 12,13 2,6"></polyline>
                                                </svg>
                                                Send to My Email
                                            </>
                                        )}
                                    </button>
                                </div>

                                {backupMessage && (
                                    <p style={{
                                        margin: 0,
                                        fontSize: '12px',
                                        color: backupSent ? '#16A34A' : '#DC2626',
                                        textAlign: 'center',
                                        fontWeight: '600'
                                    }}>
                                        {backupMessage}
                                    </p>
                                )}

                                {/* Proceed to Login Button */}
                                <button
                                    type="button"
                                    onClick={() => navigate('/login')}
                                    style={{
                                        marginTop: '6px',
                                        width: '100%',
                                        padding: '12px 20px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                                        color: '#FFFFFF',
                                        fontSize: '14px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    Proceed to Login
                                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                        <polyline points="12 5 19 12 12 19"></polyline>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '14px 24px',
                    background: '#F8FAFC',
                    borderTop: '1px solid #E2E8F0',
                    textAlign: 'center'
                }}>
                    <p style={{ margin: 0, fontSize: '11.5px', color: '#94A3B8' }}>
                        Need help? Contact your System Administrator or visit <Link to="/login" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: '600' }}>Login Portal</Link>.
                    </p>
                </div>
            </div>
        </div>
    );
}
