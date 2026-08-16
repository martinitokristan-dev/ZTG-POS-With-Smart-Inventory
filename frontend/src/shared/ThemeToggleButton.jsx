import React, { useState, useEffect } from 'react';
import useTheme from './hooks/useTheme';

export default function ThemeToggleButton({ style = {} }) {
    const { isDark, toggleTheme } = useTheme();
    const [userRole, setUserRole] = useState(() => {
        try {
            const userStr = (sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'));
            if (userStr) {
                const user = JSON.parse(userStr);
                return user?.role || '';
            }
        } catch (e) {
            console.error('Error reading user role for ThemeToggleButton:', e);
        }
        return '';
    });

    useEffect(() => {
        const handleUserUpdate = () => {
            try {
                const userStr = (sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'));
                if (userStr) {
                    const user = JSON.parse(userStr);
                    setUserRole(user?.role || '');
                    return;
                }
            } catch (e) {
                console.error('Error reading user role update:', e);
            }
            setUserRole('');
        };

        window.addEventListener('auth_user_updated', handleUserUpdate);
        return () => window.removeEventListener('auth_user_updated', handleUserUpdate);
    }, []);

    // Theme toggle icon in the top header is only accessible for Cashiers
    // Admin toggles theme via System Settings tab
    if (userRole !== 'Cashier') {
        return null;
    }

    return (
        <button
            type="button"
            id="themeToggleBtn"
            className="notif-btn"
            onClick={toggleTheme}
            data-tooltip={isDark ? "Light Mode" : "Dark Mode"}
            title={isDark ? "Light Mode" : "Dark Mode"}
            aria-label={isDark ? "Light Mode" : "Dark Mode"}
            onTouchEnd={(e) => { e.currentTarget.blur(); }}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                ...style
            }}
        >
            {isDark ? (
                /* Sun Icon (Dark Mode Active) */
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
            ) : (
                /* Moon Icon (Light Mode Active) */
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
            )}
        </button>
    );
}
