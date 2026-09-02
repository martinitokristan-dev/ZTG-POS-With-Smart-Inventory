import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirstPermittedRoute } from '../../shared/PrivateRoute';

/**
 * Forbidden (403 No Permission)
 * Displays when the user is authenticated but lacks required role permissions to access a resource.
 */
export default function Forbidden() {
    const navigate = useNavigate();

    const authUser = React.useMemo(() => {
        const stored = (sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'));
        return stored ? JSON.parse(stored) : null;
    }, []);

    const destination = React.useMemo(() => {
        const path = getFirstPermittedRoute(authUser);
        let label = 'Back to Home';
        if (path === '/dashboard') label = 'Back to Dashboard';
        else if (path === '/system-status') label = 'Back to System Status';
        else if (path === '/pos') label = 'Back to POS';
        else if (path === '/inventory') label = 'Back to Inventory';
        else if (path === '/product-management') label = 'Back to Products';
        else if (path === '/reservations') label = 'Back to Order Based';
        else if (path === '/sales-log' || path === '/daily-sales') label = 'Back to Sales Log';
        else if (path === '/reports') label = 'Back to Reports';
        else if (path === '/settings') label = 'Back to Settings';
        return { label, path };
    }, [authUser]);

    const handleGoBack = () => {
        navigate(destination.path);
    };

    const handleSwitchAccount = () => {
        sessionStorage.clear();
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        window.dispatchEvent(new Event('auth_user_updated'));
        navigate('/login');
    };

    return (
        <div
            style={{
                minHeight: '100vh',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--bg-main, #F8FAFC)',
                padding: '40px 24px',
                boxSizing: 'border-box',
                fontFamily: "var(--font-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: '820px',
                    backgroundColor: 'var(--bg-card, #FFFFFF)',
                    borderRadius: '20px',
                    border: '1px solid var(--border, #E2E8F0)',
                    boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)',
                    padding: '60px 56px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    boxSizing: 'border-box',
                }}
            >
                {/* Big Bold 403 Typography */}
                <div
                    style={{
                        fontSize: '84px',
                        fontWeight: '900',
                        lineHeight: '1',
                        letterSpacing: '-0.04em',
                        color: '#DC2626',
                        marginBottom: '12px',
                        userSelect: 'none',
                    }}
                >
                    403
                </div>

                {/* Status Badge */}
                <div
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        backgroundColor: '#FEF2F2',
                        border: '1px solid #FEE2E2',
                        color: '#B91C1C',
                        fontSize: '12px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '16px',
                    }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                    </svg>
                    <span>No Permission</span>
                </div>

                {/* Title */}
                <h1
                    style={{
                        margin: '0 0 12px 0',
                        fontSize: '28px',
                        fontWeight: '700',
                        color: 'var(--text-primary, #0F172A)',
                        letterSpacing: '-0.02em',
                    }}
                >
                    403 Forbidden — Access Denied
                </h1>

                {/* Subtitle / Description */}
                <p
                    style={{
                        margin: '0 0 36px 0',
                        fontSize: '15px',
                        lineHeight: '1.6',
                        color: 'var(--text-secondary, #64748B)',
                        maxWidth: '580px',
                    }}
                >
                    You do not have permission to access this resource. Your account is authenticated, but your assigned role lacks the required permissions. If you need access, please contact your system administrator.
                </p>

                {/* Actions Container - Horizontal Row */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        width: '100%',
                        flexWrap: 'wrap',
                    }}
                >
                    {/* Return to origin page/module */}
                    <button
                        type="button"
                        onClick={handleGoBack}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '10px 22px',
                            height: '42px',
                            fontSize: '14px',
                            fontWeight: '600',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: '#2563EB',
                            color: '#FFFFFF',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'background-color 0.15s ease',
                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1D4ED8')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2563EB')}
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                        <span>{destination.label}</span>
                    </button>

                    {/* Switch account */}
                    <button
                        type="button"
                        onClick={handleSwitchAccount}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '10px 22px',
                            height: '42px',
                            fontSize: '14px',
                            fontWeight: '500',
                            borderRadius: '8px',
                            border: '1px solid var(--border, #E2E8F0)',
                            backgroundColor: 'var(--bg-card, #FFFFFF)',
                            color: 'var(--text-primary, #1E293B)',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #F1F5F9)';
                            e.currentTarget.style.borderColor = '#CBD5E1';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--bg-card, #FFFFFF)';
                            e.currentTarget.style.borderColor = 'var(--border, #E2E8F0)';
                        }}
                    >
                        <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <rect x="2" y="4" width="20" height="16" rx="2" />
                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                        </svg>
                        <span>Sign in with a different account</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
