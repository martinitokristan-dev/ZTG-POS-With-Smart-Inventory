import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../shared/api';
import { applyGlobalTheme } from '../shared/hooks/useTheme';
import PasswordRequirementDetector from '../shared/components/PasswordRequirementDetector';

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

export default function ResetPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const email = searchParams.get('email') || '';
    const token = searchParams.get('token') || '';

    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

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

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        setError('');

        if (!token || !email) {
            setError('Missing password reset token or email. Please request a new link.');
            return;
        }

        if (password !== passwordConfirmation) {
            setError('New password and confirmation password do not match.');
            return;
        }

        if (password.length < 6 || !/[A-Z]/.test(password) || !/[\W_]/.test(password)) {
            setError('Password must be at least 6 characters with 1 uppercase letter (A-Z) and 1 special symbol (e.g. *, !, @, #).');
            return;
        }

        setLoading(true);

        try {
            await api.post('/reset-password', {
                email: email.trim(),
                token: token.trim(),
                password: password,
                password_confirmation: passwordConfirmation
            });

            setSuccess(true);
        } catch (err) {
            const errData = err.response?.data;
            if (errData?.errors?.token) {
                setError(errData.errors.token[0]);
            } else if (errData?.errors?.password) {
                setError(errData.errors.password[0]);
            } else if (errData?.message) {
                setError(errData.message);
            } else {
                setError('Failed to update password. Your reset link may have expired.');
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

                {!success ? (
                    <>
                        <h2 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: '700', color: '#0F172A', textAlign: 'center' }}>
                            Set New Password
                        </h2>
                        <p className="login-subtitle" style={{ marginTop: '0px', marginBottom: '22px', textAlign: 'center', fontSize: '13px', lineHeight: '1.5' }}>
                            {email ? (
                                <>Create a new password for <strong style={{ color: '#0F172A' }}>{email}</strong></>
                            ) : (
                                'Create a new password for your account'
                            )}
                        </p>

                        {/* Missing Token Warning */}
                        {(!token || !email) && !error && (
                            <div style={{ 
                                backgroundColor: '#FEF2F2', 
                                color: '#991B1B', 
                                padding: '12px 16px', 
                                fontSize: '13px', 
                                fontWeight: '500', 
                                borderRadius: '10px', 
                                marginBottom: '20px', 
                                border: '1px solid #FCA5A5' 
                            }}>
                                Invalid or missing password reset link. Please request a new link from the forgot password page.
                            </div>
                        )}

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

                        <form onSubmit={handleUpdatePassword}>
                            {/* New Password */}
                            <div className="form-group">
                                <label className="form-label" htmlFor="password">New Password</label>
                                <div className="input-wrapper" style={{ position: 'relative' }}>
                                    <svg className="input-icon" viewBox="0 0 24 24" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', stroke: 'var(--text-muted)', fill: 'none', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', transition: 'all 0.2s ease', zIndex: 5 }}>
                                        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4"/>
                                    </svg>
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        id="password" 
                                        className="form-control" 
                                        placeholder="Enter new password" 
                                        autoComplete="new-password"
                                        autoFocus
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required 
                                        disabled={loading || !token}
                                        style={{ paddingLeft: '46px', paddingRight: '40px' }} 
                                    />
                                    <button 
                                        type="button" 
                                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: '4px', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }} 
                                        onClick={() => setShowPassword(!showPassword)}
                                        disabled={loading}
                                    >
                                        {showPassword ? (
                                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                                <line x1="1" y1="1" x2="23" y2="23"></line>
                                            </svg>
                                        ) : (
                                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"></path>
                                                <circle cx="12" cy="12" r="3"></circle>
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                <PasswordRequirementDetector password={password} showWhenEmpty={true} />
                            </div>

                            {/* Confirm Password */}
                            <div className="form-group">
                                <label className="form-label" htmlFor="passwordConfirmation">Confirm New Password</label>
                                <div className="input-wrapper" style={{ position: 'relative' }}>
                                    <svg className="input-icon" viewBox="0 0 24 24" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', stroke: 'var(--text-muted)', fill: 'none', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', transition: 'all 0.2s ease', zIndex: 5 }}>
                                        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4"/>
                                    </svg>
                                    <input 
                                        type={showConfirmPassword ? "text" : "password"} 
                                        id="passwordConfirmation" 
                                        className="form-control" 
                                        placeholder="Confirm new password" 
                                        autoComplete="new-password"
                                        value={passwordConfirmation}
                                        onChange={(e) => setPasswordConfirmation(e.target.value)}
                                        required 
                                        disabled={loading || !token}
                                        style={{ paddingLeft: '46px', paddingRight: '40px' }} 
                                    />
                                    <button 
                                        type="button" 
                                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: '4px', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }} 
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        disabled={loading}
                                    >
                                        {showConfirmPassword ? (
                                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                                <line x1="1" y1="1" x2="23" y2="23"></line>
                                            </svg>
                                        ) : (
                                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"></path>
                                                <circle cx="12" cy="12" r="3"></circle>
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                className="btn login-btn" 
                                style={{ width: '100%', marginTop: '14px' }} 
                                disabled={loading || !token || !password || !passwordConfirmation}
                            >
                                {loading ? 'Updating Password...' : 'Update Password'}
                            </button>

                            <div style={{ textAlign: 'center', marginTop: '20px' }}>
                                <Link to="/login" style={{ color: 'var(--primary, #3B82F6)', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
                                    Back to Sign In
                                </Link>
                            </div>
                        </form>
                    </>
                ) : (
                    /* Password Changed Confirmation Screen */
                    <div style={{ textAlign: 'center', padding: '10px 0' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                            <svg viewBox="0 0 24 24" width="34" height="34" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                        <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '700', color: '#0F172A' }}>
                            Password Updated!
                        </h2>
                        <p style={{ color: '#64748B', fontSize: '13.5px', lineHeight: '1.6', margin: '0 0 24px 0' }}>
                            Your password and manager PIN have been successfully changed. You can now sign in with your new credentials.
                        </p>
                        <button 
                            type="button" 
                            onClick={() => navigate('/login')} 
                            className="btn login-btn" 
                            style={{ width: '100%' }}
                        >
                            Proceed to Sign In
                        </button>
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
