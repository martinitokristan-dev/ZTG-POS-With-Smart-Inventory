import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../shared/api';
import { applyGlobalTheme } from '../shared/hooks/useTheme';

const fixImageUrl = (url) => {
    if (!url) return null;
    if (typeof url !== 'string') return url;
    let cleanUrl = url.trim();

    if (cleanUrl.startsWith('http://') && !cleanUrl.includes('localhost') && !cleanUrl.includes('127.0.0.1')) {
        cleanUrl = cleanUrl.replace(/^http:\/\//i, 'https://');
    }

    if (cleanUrl.includes('localhost') || cleanUrl.includes('127.0.0.1')) {
        if (cleanUrl.includes('/api/media/')) {
            const mediaPath = cleanUrl.split('/api/media/')[1];
            const backendBase = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : '';
            return `${backendBase}/api/media/${mediaPath}`;
        }
        if (cleanUrl.includes('/storage/')) {
            return '/storage/' + cleanUrl.split('/storage/')[1];
        }
    }
    if (cleanUrl.includes('r2.dev/') || cleanUrl.includes('cloudflarestorage.com/')) {
        const match = cleanUrl.match(/(avatars|logos|products)\/.+$/);
        if (match) {
            const mediaPath = match[0];
            const backendBase = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : '';
            return `${backendBase}/api/media/${mediaPath}`;
        }
    }
    return cleanUrl;
};

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);
    const [countdown, setCountdown] = useState(0);

    const [logoUrl, setLogoUrl] = useState(() => {
        return fixImageUrl(localStorage.getItem('cached_business_logo')) || null;
    });
    const [businessName, setBusinessName] = useState(() => {
        return localStorage.getItem('cached_business_name') || '';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.classList.remove('dark-theme');
        document.body.classList.remove('dark-theme');

        return () => {
            applyGlobalTheme();
        };
    }, []);

    useEffect(() => {
        let timer = null;
        if (countdown > 0) {
            timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [countdown]);

    const handleSendResetLink = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await api.post('/forgot-password', {
                email: email.trim()
            });

            setSent(true);
            setCountdown(60);
        } catch (err) {
            const errData = err.response?.data;
            if (errData?.errors?.email) {
                setError(errData.errors.email[0]);
            } else if (errData?.message) {
                setError(errData.message);
            } else {
                setError('Failed to send reset email. Please verify your connection.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-body">
            {/* Ambient Background glows */}
            <div className="login-bg-glow-1"></div>
            <div className="login-bg-glow-2"></div>

            <div className="login-card" style={{ maxWidth: '440px' }}>
                {/* Logo Header */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '-10px', marginBottom: '12px' }}>
                    {logoUrl ? (
                        <img 
                            src={fixImageUrl(logoUrl)} 
                            alt={businessName || "Store Logo"} 
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                            style={{ 
                                height: '130px', 
                                maxWidth: '100%',
                                objectFit: 'contain'
                            }} 
                        />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '12px 0 6px 0' }}>
                            <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', boxShadow: '0 6px 16px rgba(59, 130, 246, 0.25)' }}>
                                <svg style={{ width: '24px', height: '24px', fill: 'none', stroke: '#FFFFFF', strokeWidth: 2 }} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                    <polyline strokeLinecap="round" strokeLinejoin="round" points="9 22 9 12 15 12 15 22"></polyline>
                                </svg>
                            </div>
                            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                                {businessName || "POS & Inventory System"}
                            </h2>
                        </div>
                    )}
                </div>

                {!sent ? (
                    <>
                        <h2 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: '700', color: '#0F172A', textAlign: 'center' }}>
                            Reset your password
                        </h2>
                        <p className="login-subtitle" style={{ marginTop: '0px', marginBottom: '22px', textAlign: 'center', fontSize: '13px', lineHeight: '1.5' }}>
                            Enter your registered email and we’ll send you a secure link to reset your password.
                        </p>

                        {error && (
                            <div style={{ 
                                backgroundColor: '#FEF2F2', 
                                color: '#991B1B', 
                                padding: '12px 16px', 
                                fontSize: '13px', 
                                fontWeight: '500', 
                                borderRadius: '10px', 
                                marginBottom: '20px', 
                                border: '1px solid #FCA5A5',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                lineHeight: '1.4'
                            }}>
                                <svg style={{ width: '18px', height: '18px', flexShrink: 0, color: '#DC2626' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="8" x2="12" y2="12"></line>
                                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                </svg>
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSendResetLink}>
                            <div className="form-group">
                                <label className="form-label" htmlFor="email">Email Address</label>
                                <div className="input-wrapper" style={{ position: 'relative' }}>
                                    <svg className="input-icon" viewBox="0 0 24 24" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', stroke: 'var(--text-muted)', fill: 'none', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', transition: 'all 0.2s ease', zIndex: 5 }}>
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                        <polyline points="22,6 12,13 2,6"></polyline>
                                    </svg>
                                    <input 
                                        type="email" 
                                        id="email" 
                                        className="form-control" 
                                        placeholder="Enter your registered email" 
                                        autoComplete="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required 
                                        disabled={loading}
                                        style={{ paddingLeft: '46px' }}
                                    />
                                </div>
                            </div>

                            <button type="submit" className="btn login-btn" style={{ width: '100%', marginTop: '10px' }} disabled={loading || !email.trim()}>
                                {loading ? 'Sending Reset Link...' : 'Send Password Reset Link'}
                            </button>

                            <div style={{ textAlign: 'center', marginTop: '20px' }}>
                                <Link to="/login" style={{ color: 'var(--primary, #3B82F6)', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
                                    Back to Sign In
                                </Link>
                            </div>
                        </form>
                    </>
                ) : (
                    /* Link Sent Confirmation Screen */
                    <div style={{ textAlign: 'center', padding: '10px 0' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px auto' }}>
                            <svg viewBox="0 0 24 24" width="30" height="30" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                <polyline points="22,6 12,13 2,6"></polyline>
                            </svg>
                        </div>
                        <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '700', color: '#0F172A' }}>
                            Check your email
                        </h2>
                        <p style={{ color: '#64748B', fontSize: '13.5px', lineHeight: '1.6', margin: '0 0 20px 0' }}>
                            We sent a password reset link to <strong style={{ color: '#0F172A' }}>{email}</strong>. Open the link in the email to choose your new password.
                        </p>

                        <div style={{ marginBottom: '22px' }}>
                            <button 
                                type="button"
                                onClick={() => handleSendResetLink(null)}
                                disabled={countdown > 0 || loading}
                                style={{ background: 'none', border: 'none', color: countdown > 0 ? '#94A3B8' : '#2563EB', fontSize: '12.5px', fontWeight: '600', cursor: countdown > 0 ? 'default' : 'pointer' }}
                            >
                                {countdown > 0 ? `Resend email in ${countdown}s` : 'Didn’t receive email? Resend'}
                            </button>
                        </div>

                        <Link to="/login" className="btn login-btn" style={{ display: 'block', width: '100%', textDecoration: 'none', textAlign: 'center', boxSizing: 'border-box' }}>
                            Return to Sign In
                        </Link>
                    </div>
                )}
            </div>

            <style>{`
                .input-wrapper:focus-within .input-icon {
                    stroke: var(--primary) !important;
                    transform: translateY(-50%) scale(1.05) !important;
                }
            `}</style>
        </div>
    );
}
