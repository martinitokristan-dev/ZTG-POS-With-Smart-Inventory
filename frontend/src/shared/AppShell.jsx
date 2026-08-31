import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationsDropdown from './NotificationsDropdown';
import ThemeToggleButton from './ThemeToggleButton';

/**
 * AppShell — persistent authenticated layout.
 *
 * Sidebar and NotificationsDropdown live here and mount ONCE for the
 * lifetime of the authenticated session. They never remount on route
 * changes, so the badge CSS animation no longer restarts on navigation.
 *
 * Each page renders only its own content (title, top-bar actions, body).
 * The bell icon is positioned as a fixed top-right overlay so every page
 * gets the same consistent placement without needing to include it.
 */
// Helper function to replace legacy localhost or blocked r2.dev image URLs with backend proxy paths
const fixImageUrl = (url) => {
    if (!url) return null;
    if (typeof url !== 'string') return url;
    let cleanUrl = url.trim();
    if (cleanUrl.includes('localhost') || cleanUrl.includes('127.0.0.1')) {
        if (cleanUrl.includes('/storage/')) {
            cleanUrl = '/storage/' + cleanUrl.split('/storage/')[1];
        }
    }
    if (cleanUrl.includes('r2.dev/') || cleanUrl.includes('cloudflarestorage.com/')) {
        const match = cleanUrl.match(/(avatars|logos|products)\/.+$/);
        if (match) {
            const mediaPath = match[0];
            const backendBase = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : '';
            cleanUrl = `${backendBase}/api/media/${mediaPath}`;
        }
    }
    return cleanUrl;
};

export default function AppShell() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const [isMobile, setIsMobile] = React.useState(() => window.innerWidth < 768);

    React.useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (!mobile) {
                setIsMobileMenuOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const rawLogo = localStorage.getItem('cached_sidebar_logo') || localStorage.getItem('cached_business_logo');
    const cachedLogo = fixImageUrl(rawLogo) || null;
    const cachedName = localStorage.getItem('cached_business_name') || "";
    const currentUser = (() => {
        try {
            return JSON.parse(sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'));
        } catch {
            return null;
        }
    })();
    const showNotifications = currentUser?.role === 'Admin' || 
        currentUser?.role === 'Administrator' || 
        currentUser?.role === 'Supervisor' ||
        Boolean(currentUser?.permissions?.dashboard?.has_access || currentUser?.permissions?.system_status?.has_access);

    return (
        <div className="app-container" style={{ flexDirection: isMobile ? 'column' : 'row' }}>
            {/* Mobile Header Bar (< 768px) */}
            {isMobile && (
                <header className="mobile-header-bar" style={{
                    height: '56px',
                    backgroundColor: '#1E293B',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 12px 0 16px',
                    zIndex: 90,
                    position: 'sticky',
                    top: 0,
                    flexShrink: 0,
                    width: '100%',
                    boxSizing: 'border-box'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                        <button
                            type="button"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#FFFFFF',
                                cursor: 'pointer',
                                padding: '6px',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}
                            aria-label="Toggle Navigation Menu"
                        >
                            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="3" y1="6" x2="21" y2="6"></line>
                                <line x1="3" y1="12" x2="21" y2="12"></line>
                                <line x1="3" y1="18" x2="21" y2="18"></line>
                            </svg>
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                            {cachedLogo ? (
                                <img 
                                    src={cachedLogo} 
                                    alt="Store Logo" 
                                    style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', backgroundColor: '#FFF', flexShrink: 0 }} 
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                            ) : (
                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', flexShrink: 0, fontSize: 13, fontWeight: 800 }}>
                                    {cachedName ? cachedName.charAt(0).toUpperCase() : 'P'}
                                </div>
                            )}
                            <span style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {cachedName || 'POS System'}
                            </span>
                        </div>
                    </div>
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                        <ThemeToggleButton />
                        {showNotifications && <NotificationsDropdown />}
                    </div>
                </header>
            )}

            {/* Sidebar — mounts once, persists across all routes */}
            <Sidebar
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                isMobile={isMobile}
            />

            {/* Theme toggle & Notification bell — fixed top-right on desktop */}
            {!isMobile && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    zIndex: 100,
                    padding: '17px 24px',
                    pointerEvents: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <ThemeToggleButton />
                    {showNotifications && <NotificationsDropdown />}
                </div>
            )}

            {/* Page content — changes on every navigation, shell stays mounted */}
            <div className="main-workspace">
                <Outlet />
            </div>
        </div>
    );
}
