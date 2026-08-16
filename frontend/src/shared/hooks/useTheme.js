import { useState, useEffect } from 'react';

/**
 * Gets user-specific theme storage key
 */
export function getThemeStorageKey() {
    try {
        const userStr = (sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'));
        if (userStr) {
            const user = JSON.parse(userStr);
            if (user?.id) return `ztg_theme_user_${user.id}`;
        }
    } catch (e) {
        console.error("Error reading auth_user for theme storage:", e);
    }
    return 'ztg_theme_guest';
}

/**
 * Gets user's saved theme preference (defaults to 'light' for cashiers/new users)
 */
export function getUserThemePreference() {
    const key = getThemeStorageKey();
    const saved = localStorage.getItem(key);
    if (saved) return saved;

    return 'light'; // Default to light mode for each user unless explicitly enabled
}

/**
 * Applies theme to DOM root and body
 */
export function applyGlobalTheme(explicitThemeMode) {
    // Login page always stays in light mode — dark theme is only for the app interface
    const isLoginPage = window.location.pathname === '/login' || window.location.pathname === '/';
    if (isLoginPage) {
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.classList.remove('dark-theme');
        document.body.classList.remove('dark-theme');
        return 'light';
    }

    const mode = explicitThemeMode || getUserThemePreference();
    let resolvedTheme = mode;

    if (mode === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        resolvedTheme = prefersDark ? 'dark' : 'light';
    }

    document.documentElement.setAttribute('data-theme', resolvedTheme);
    
    if (resolvedTheme === 'dark') {
        document.documentElement.classList.add('dark-theme');
        document.body.classList.add('dark-theme');
    } else {
        document.documentElement.classList.remove('dark-theme');
        document.body.classList.remove('dark-theme');
    }

    return resolvedTheme;
}

/**
 * useTheme hook for components
 */
export default function useTheme() {
    const [theme, setThemeState] = useState(() => {
        return getUserThemePreference();
    });

    const [resolvedTheme, setResolvedTheme] = useState(() => {
        return applyGlobalTheme(theme);
    });

    const setTheme = (newTheme) => {
        const key = getThemeStorageKey();
        localStorage.setItem(key, newTheme);
        localStorage.setItem('ztg_theme', newTheme);
        setThemeState(newTheme);
        const resolved = applyGlobalTheme(newTheme);
        setResolvedTheme(resolved);
        window.dispatchEvent(new CustomEvent('ztg_theme_changed', { detail: { theme: newTheme, resolved } }));
    };

    useEffect(() => {
        const handleThemeChange = () => {
            const currentSetting = getUserThemePreference();
            setThemeState(currentSetting);
            const resolved = applyGlobalTheme(currentSetting);
            setResolvedTheme(resolved);
        };

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleSystemChange = () => {
            if (getUserThemePreference() === 'system') {
                handleThemeChange();
            }
        };

        window.addEventListener('ztg_theme_changed', handleThemeChange);
        window.addEventListener('auth_user_updated', handleThemeChange);
        mediaQuery.addEventListener('change', handleSystemChange);

        // Apply immediately on mount
        handleThemeChange();

        return () => {
            window.removeEventListener('ztg_theme_changed', handleThemeChange);
            window.removeEventListener('auth_user_updated', handleThemeChange);
            mediaQuery.removeEventListener('change', handleSystemChange);
        };
    }, []);

    return {
        theme,
        resolvedTheme,
        isDark: resolvedTheme === 'dark',
        setTheme,
        toggleTheme: () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
    };
}

