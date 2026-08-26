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
                title: 'Invalid or Missing Link',
                message: 'No verification token was found. Please open the full link sent to your email address.',
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
                        title: 'Unable to Verify',
                        message: res.data?.message || 'We could not retrieve your account credentials.',
                    });
                }
            } catch (err) {
                const data = err.response?.data;
                if (err.response?.status === 410) {
                    setError({
                        title: 'Link Expired',
                        message: data?.message || 'This credential link has already been viewed and is no longer active.',
                    });
                } else if (err.response?.status === 404) {
                    setError({
                        title: 'Link Not Found',
                        message: data?.message || 'This verification link is invalid or has been removed.',
                    });
                } else {
                    setError({
                        title: 'Verification Error',
                        message: data?.message || 'An unexpected error occurred. Please contact your system administrator.',
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
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleCopyAll = () => {
        if (!credentials) return;
        const portalUrl = window.location.origin + '/login';
        const formatted = [
            `ZTG Heavy Parts — Staff Credentials`,
            `Name:     ${credentials.full_name}`,
            `Role:     ${credentials.role}`,
            `Username: ${credentials.username}`,
            `Password: ${credentials.password}`,
            `Portal:   ${portalUrl}`,
        ].join('\n');

        navigator.clipboard.writeText(formatted);
        setCopiedField('all');
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleSendBackupEmail = async () => {
        if (!token || sendingBackup || backupSent) return;
        setSendingBackup(true);
        setBackupMessage('');

        try {
            const res = await api.post('/auth/send-credential-backup', { token });
            if (res.data?.success) {
                setBackupSent(true);
                setBackupMessage('A copy of your credentials has been sent to your email.');
            } else {
                setBackupMessage('Unable to send email copy. Please copy your details manually.');
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Unable to send email copy. Please copy your details manually.';
            setBackupMessage(msg);
        } finally {
            setSendingBackup(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            width: '100vw',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 16px',
            backgroundColor: 'var(--bg-primary, #0B132B)',
            boxSizing: 'border-box',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '460px',
                backgroundColor: 'var(--bg-card, #151F38)',
                borderRadius: '16px',
                border: '1px solid var(--border, #263354)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
                overflow: 'hidden',
                margin: 'auto'
            }}>
                {/* Header */}
                <div style={{
                    padding: '28px 28px 20px',
                    textAlign: 'center',
                    borderBottom: '1px solid var(--border, #263354)'
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(59, 130, 246, 0.12)',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                        color: '#60A5FA',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '12px'
                    }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                    </div>
                    <h1 style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: 'var(--text-primary, #FFFFFF)',
                        margin: '0 0 6px',
                        letterSpacing: '-0.01em'
                    }}>
                        Staff Account Access
                    </h1>
                    <p style={{
                        fontSize: '13px',
                        color: 'var(--text-secondary, #94A3B8)',
                        margin: 0,
                        lineHeight: 1.45
                    }}>
                        ZTG Heavy Parts POS & Inventory System
                    </p>
                </div>

                {/* Body Content */}
                <div style={{ padding: '24px 28px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '36px 0' }}>
                            <div className="spinner-border text-primary" role="status" style={{ width: '32px', height: '32px', borderWidth: '3px' }}></div>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary, #94A3B8)', marginTop: '16px', marginBottom: 0 }}>
                                Verifying link...
                            </p>
                        </div>
                    ) : error ? (
                        <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#F87171',
                                marginBottom: '14px'
                            }}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="8" x2="12" y2="12"></line>
                                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                </svg>
                            </div>
                            <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary, #FFFFFF)', margin: '0 0 8px' }}>
                                {error.title}
                            </h2>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary, #94A3B8)', lineHeight: 1.55, margin: '0 0 24px' }}>
                                {error.message}
                            </p>
                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                className="btn btn-primary"
                                style={{
                                    width: '100%',
                                    padding: '10px 16px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    borderRadius: '8px'
                                }}
                            >
                                Return to Sign In
                            </button>
                        </div>
                    ) : (
                        <div>
                            {/* User details header pill */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px',
                                padding: '12px 14px',
                                backgroundColor: 'var(--bg-secondary, #0F172A)',
                                border: '1px solid var(--border, #263354)',
                                borderRadius: '10px',
                                marginBottom: '20px'
                            }}>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary, #FFFFFF)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {credentials.full_name}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748B)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {credentials.email || 'No email attached'}
                                    </div>
                                </div>
                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                                    color: '#60A5FA',
                                    border: '1px solid rgba(59, 130, 246, 0.25)',
                                    flexShrink: 0
                                }}>
                                    {credentials.role}
                                </span>
                            </div>

                            {/* Credentials Block */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                                {/* Username */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary, #94A3B8)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                                        Username
                                    </label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type="text"
                                            readOnly
                                            value={credentials.username}
                                            style={{
                                                flex: 1,
                                                padding: '9px 12px',
                                                borderRadius: '8px',
                                                border: '1px solid var(--border, #263354)',
                                                backgroundColor: 'var(--bg-secondary, #0F172A)',
                                                color: 'var(--text-primary, #FFFFFF)',
                                                fontSize: '13.5px',
                                                fontWeight: '600',
                                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleCopy(credentials.username, 'username')}
                                            className="btn btn-secondary btn-sm"
                                            style={{
                                                padding: '0 14px',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                minWidth: '68px'
                                            }}
                                        >
                                            {copiedField === 'username' ? 'Copied' : 'Copy'}
                                        </button>
                                    </div>
                                </div>

                                {/* Password */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary, #94A3B8)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                                        Temporary Password
                                    </label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <div style={{ position: 'relative', flex: 1 }}>
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                readOnly
                                                value={credentials.password}
                                                style={{
                                                    width: '100%',
                                                    boxSizing: 'border-box',
                                                    padding: '9px 36px 9px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--border, #263354)',
                                                    backgroundColor: 'var(--bg-secondary, #0F172A)',
                                                    color: 'var(--text-primary, #FFFFFF)',
                                                    fontSize: '13.5px',
                                                    fontWeight: '600',
                                                    fontFamily: showPassword ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' : 'inherit'
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                style={{
                                                    position: 'absolute',
                                                    right: '6px',
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    background: 'none',
                                                    border: 'none',
                                                    color: 'var(--text-muted, #64748B)',
                                                    cursor: 'pointer',
                                                    padding: '4px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                            >
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                                            className="btn btn-secondary btn-sm"
                                            style={{
                                                padding: '0 14px',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                minWidth: '68px'
                                            }}
                                        >
                                            {copiedField === 'password' ? 'Copied' : 'Copy'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Minimalist Security Notice */}
                            <div style={{
                                padding: '10px 12px',
                                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                                border: '1px solid rgba(245, 158, 11, 0.2)',
                                borderRadius: '8px',
                                marginBottom: '20px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '8px'
                            }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="8" x2="12" y2="12"></line>
                                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                </svg>
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary, #94A3B8)', lineHeight: 1.45 }}>
                                    This link is for one-time use. Make sure to record your password or send a backup copy to your email before continuing.
                                </span>
                            </div>

                            {/* Secondary Actions */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                                <button
                                    type="button"
                                    onClick={handleCopyAll}
                                    className="btn btn-secondary btn-sm"
                                    style={{
                                        padding: '9px 12px',
                                        fontSize: '12.5px',
                                        fontWeight: '600',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                    {copiedField === 'all' ? 'Copied' : 'Copy All'}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleSendBackupEmail}
                                    disabled={sendingBackup || backupSent}
                                    className="btn btn-secondary btn-sm"
                                    style={{
                                        padding: '9px 12px',
                                        fontSize: '12.5px',
                                        fontWeight: '600',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    {sendingBackup ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: '12px', height: '12px', borderWidth: '2px' }}></span>
                                            Sending...
                                        </>
                                    ) : backupSent ? (
                                        <>✓ Sent</>
                                    ) : (
                                        <>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                                <polyline points="22,6 12,13 2,6"></polyline>
                                            </svg>
                                            Email Me a Copy
                                        </>
                                    )}
                                </button>
                            </div>

                            {backupMessage && (
                                <p style={{
                                    margin: '0 0 12px',
                                    fontSize: '12px',
                                    color: backupSent ? '#34D399' : '#F87171',
                                    textAlign: 'center',
                                    fontWeight: '500'
                                }}>
                                    {backupMessage}
                                </p>
                            )}

                            {/* Primary Action Button */}
                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                className="btn btn-primary"
                                style={{
                                    width: '100%',
                                    padding: '11px 16px',
                                    fontSize: '13.5px',
                                    fontWeight: '600',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}
                            >
                                <span>Continue to Sign In</span>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                    <polyline points="12 5 19 12 12 19"></polyline>
                                </svg>
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '14px 28px',
                    backgroundColor: 'var(--bg-secondary, #0F172A)',
                    borderTop: '1px solid var(--border, #263354)',
                    textAlign: 'center'
                }}>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted, #64748B)' }}>
                        Need assistance? Contact your administrator or return to <Link to="/login" style={{ color: '#60A5FA', textDecoration: 'none', fontWeight: '600' }}>Sign In</Link>.
                    </p>
                </div>
            </div>
        </div>
    );
}
