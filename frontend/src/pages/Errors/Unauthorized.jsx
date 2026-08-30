import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Unauthorized (403 Forbidden) — Big rectangular layout with large, bold text number.
 */
export default function Unauthorized() {
    const navigate = useNavigate();

    const authUser = React.useMemo(() => {
        const stored = (sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'));
        return stored ? JSON.parse(stored) : null;
    }, []);

    const userRole = authUser?.role || 'User';

    const getReturnDestination = () => {
        if (userRole === 'Cashier') {
            return { label: 'Back to POS', path: '/pos' };
        }
        if (userRole === 'Technical Operations' || userRole === 'Supervisor') {
            return { label: 'Back to System Status', path: '/system-status' };
        }
        if (userRole === 'Checker') {
            return { label: 'Back to Inventory', path: '/inventory' };
        }
        if (userRole === 'Admin' || userRole === 'Administrator') {
            return { label: 'Back to Dashboard', path: '/dashboard' };
        }
        return { label: 'Back to Dashboard', path: '/dashboard' };
    };

    const destination = getReturnDestination();

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
                {/* Big Bold 403 Typography (No border, No background) */}
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
                    Access Denied
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
                    You do not have permission to access this page. If you believe this is a mistake, please contact your system administrator.
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

                    {/* Switch account / Sign in with different email */}
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
                        <span>Sign in with a different email</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
