import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../shared/api';
import { applyGlobalTheme } from '../shared/hooks/useTheme';

const fixImageUrl = (url) => {
    if (!url) return null;
    if (typeof url !== 'string') return url;
    let cleanUrl = url.trim();

    // Automatically upgrade http to https for production URLs to avoid Mixed Content errors
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

function Login() {
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [logoUrl, setLogoUrl] = useState(() => {
        return fixImageUrl(localStorage.getItem('cached_business_logo')) || null;
    });
    const [businessName, setBusinessName] = useState(() => {
        return localStorage.getItem('cached_business_name') || '';
    });
    const navigate = useNavigate();

    React.useEffect(() => {
        // Force light mode on the login page — dark theme only applies inside the app
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.classList.remove('dark-theme');
        document.body.classList.remove('dark-theme');

        return () => {
            // Re-apply the saved theme when navigating away from login into the app
            applyGlobalTheme();
        };
    }, []);

    React.useEffect(() => {
        const fetchSettings = async () => {
            const token = (sessionStorage.getItem('auth_token') ?? localStorage.getItem('auth_token'));
            if (!token) return; // Unauthenticated guest on login screen uses cached logo
            try {
                const res = await api.get('/settings');
                if (res.data) {
                    const newLogo = res.data.business_logo || null;
                    const newName = res.data.business_name || '';
                    setLogoUrl(newLogo);
                    setBusinessName(newName);
                    if (newLogo) {
                        localStorage.setItem('cached_business_logo', newLogo);
                    } else {
                        localStorage.removeItem('cached_business_logo');
                    }
                    if (newName) {
                        localStorage.setItem('cached_business_name', newName);
                    }
                }
            } catch (e) {
                // Silently ignore 401 on login page
            }
        };
        fetchSettings();
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/login', {
                login_id: loginId.trim(),
                password: password
            });

            const { token, user } = response.data;
            
            sessionStorage.setItem('auth_token', token); localStorage.removeItem('auth_token');
            sessionStorage.setItem('auth_user', JSON.stringify(user)); localStorage.removeItem('auth_user');
            window.dispatchEvent(new Event('auth_user_updated'));

            // Auto-redirect user based on their assigned role
            if (user.role === 'Admin' || user.role === 'Supervisor') {
                navigate('/dashboard');
            } else if (user.role === 'Cashier') {
                navigate('/pos');
            } else if (user.role === 'Checker') {
                navigate('/inventory');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            console.error(err);
            if (err.response && err.response.data && err.response.data.errors) {
                const errors = err.response.data.errors;
                const firstKey = Object.keys(errors)[0];
                setError(errors[firstKey]?.[0] || 'Invalid username, email, or password.');
            } else if (err.response && err.response.data && err.response.data.message) {
                setError(err.response.data.message);
            } else {
                setError('Unable to connect to the authentication server. Please check your network or try again.');
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

            <div className="login-card">
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '-15px', marginBottom: '0px' }}>
                    <img 
                        src={fixImageUrl(logoUrl) || "/ztg-logo.png"} 
                        alt={businessName || "ZTG Heavy Equipment Parts"} 
                        onError={(e) => {
                            if (!e.currentTarget.dataset.failed) {
                                e.currentTarget.dataset.failed = "true";
                                e.currentTarget.src = "/ztg-logo.png";
                            }
                        }}
                        style={{ 
                            height: '175px', 
                            maxWidth: '100%',
                            objectFit: 'contain'
                        }} 
                    />
                </div>
                <p className="login-subtitle" style={{ marginTop: '4px', marginBottom: '24px' }}>
                    Sign in to access your account
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

                <form id="loginForm" onSubmit={handleLogin}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="username">Username, Email, or Phone</label>
                        <div className="input-wrapper" style={{ position: 'relative' }}>
                            <svg className="input-icon" viewBox="0 0 24 24" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', stroke: 'var(--text-muted)', fill: 'none', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', transition: 'all 0.2s ease', zIndex: 5 }}>
                                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/>
                            </svg>
                            <input 
                                type="text" 
                                id="username" 
                                className="form-control" 
                                placeholder="Enter username, email, or phone" 
                                autoComplete="username"
                                value={loginId}
                                onChange={(e) => setLoginId(e.target.value)}
                                required 
                                disabled={loading}
                                style={{ paddingLeft: '46px' }}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label className="form-label" htmlFor="password" style={{ marginBottom: 0 }}>Password</label>
                            <Link 
                                to="/forgot-password"
                                style={{ 
                                    color: 'var(--primary, #3B82F6)', 
                                    fontSize: '12.5px', 
                                    fontWeight: '600', 
                                    textDecoration: 'none',
                                    transition: 'color 0.2s ease'
                                }}
                            >
                                Forgot password?
                            </Link>
                        </div>
                        <div className="input-wrapper" style={{ position: 'relative' }}>
                            <svg className="input-icon" viewBox="0 0 24 24" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', stroke: 'var(--text-muted)', fill: 'none', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', transition: 'all 0.2s ease', zIndex: 5 }}>
                                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4"/>
                            </svg>
                            <input 
                                type={showPassword ? "text" : "password"} 
                                id="password" 
                                className="form-control" 
                                placeholder="Enter password" 
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required 
                                disabled={loading}
                                style={{ paddingLeft: '46px', paddingRight: '40px' }} 
                            />
                            <button 
                                type="button" 
                                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: '4px', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }} 
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={loading}
                            >
                                {showPassword ? (
                                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                            type="checkbox" 
                            id="rememberMe" 
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            disabled={loading}
                        />
                        <label className="form-label" htmlFor="rememberMe" style={{ marginBottom: 0, cursor: 'pointer', userSelect: 'none' }}>Remember me on this device</label>
                    </div>

                    <button type="submit" className="btn login-btn" style={{ width: '100%', marginTop: '14px' }} disabled={loading}>
                        {loading ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>
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

export default Login;
