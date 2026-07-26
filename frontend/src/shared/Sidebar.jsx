import React from 'react';
import { NavLink as RouterNavLink, useNavigate as useRouterNavigate } from 'react-router-dom';
import api from './api';
import { clearEntireCache } from './hooks/usePaginatedCache';

// Helper function to replace legacy localhost or blocked r2.dev image URLs with backend proxy paths
const fixImageUrl = (url) => {
    if (!url) return null;
    if (typeof url !== 'string') return url;
    let cleanUrl = url.trim();

    // Automatically upgrade http to https for production URLs to avoid Mixed Content errors
    if (cleanUrl.startsWith('http://') && !cleanUrl.includes('localhost') && !cleanUrl.includes('127.0.0.1')) {
        cleanUrl = cleanUrl.replace(/^http:\/\//i, 'https://');
    }

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

function Sidebar({ isOpen = false, onClose = () => {}, isMobile = false }) {
    const navigate = useRouterNavigate();
    const [avatarError, setAvatarError] = React.useState(false);
    const [user, setUser] = React.useState(() => {
        const userStr = localStorage.getItem('auth_user');
        return userStr ? JSON.parse(userStr) : null;
    });

    const [logoUrl, setLogoUrl] = React.useState(() => {
        return fixImageUrl(localStorage.getItem('cached_business_logo')) || null;
    });
    const [sidebarLogoUrl, setSidebarLogoUrl] = React.useState(() => {
        return fixImageUrl(localStorage.getItem('cached_sidebar_logo')) || null;
    });
    const [businessName, setBusinessName] = React.useState(() => {
        return localStorage.getItem('cached_business_name') || '';
    });

    React.useEffect(() => {
        const handleUpdate = () => {
            const userStr = localStorage.getItem('auth_user');
            setUser(userStr ? JSON.parse(userStr) : null);
            setAvatarError(false);
        };

        const loadSettings = async () => {
            try {
                const [res, userRes] = await Promise.all([
                    api.get('/settings').catch(() => null),
                    api.get('/user').catch(() => null)
                ]);

                if (userRes?.data?.user) {
                    const freshUser = userRes.data.user;
                    setUser(freshUser);
                    setAvatarError(false);
                    const stored = localStorage.getItem('auth_user');
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        localStorage.setItem('auth_user', JSON.stringify({ ...parsed, ...freshUser }));
                    }
                }

                if (res?.data) {
                    const newLogo = res.data.business_logo || null;
                    const newSidebarLogo = res.data.sidebar_logo || null;
                    const newName = res.data.business_name || '';
                    setLogoUrl(newLogo);
                    setSidebarLogoUrl(newSidebarLogo);
                    setBusinessName(newName);
                    if (newLogo) {
                        localStorage.setItem('cached_business_logo', newLogo);
                    } else {
                        localStorage.removeItem('cached_business_logo');
                    }
                    if (newSidebarLogo) {
                        localStorage.setItem('cached_sidebar_logo', newSidebarLogo);
                    } else {
                        localStorage.removeItem('cached_sidebar_logo');
                    }
                    if (newName) {
                        localStorage.setItem('cached_business_name', newName);
                    }
                }
            } catch (e) {
                console.error('Failed to load settings in Sidebar:', e);
            }
        };

        loadSettings();

        window.addEventListener('auth_user_updated', handleUpdate);
        window.addEventListener('settings_updated', loadSettings);
        return () => {
            window.removeEventListener('auth_user_updated', handleUpdate);
            window.removeEventListener('settings_updated', loadSettings);
        };
    }, []);

    const role = user ? user.role : 'Guest';
    const name = user ? user.real_name || user.name : 'User';

    // Get initials for profile avatar bubble
    const getInitials = (userName) => {
        if (!userName) return 'AD';
        const parts = userName.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return userName.slice(0, 2).toUpperCase();
    };

    const handleLogout = async () => {
        try {
            await api.post('/logout');
        } catch (e) {
            console.error('Logout error: ', e);
        } finally {
            clearEntireCache();
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            navigate('/login');
        }
    };

    // Admin Navigation
    const adminNavSections = [
        {
            title: 'Main',
            items: [
                { path: '/dashboard', label: 'Dashboard', icon: (
                    <svg style={{ width: 18, height: 18, stroke: 'currentColor', fill: 'none', strokeWidth: 2, flexShrink: 0 }} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                )},
                { path: '/product-management', label: 'Product Management', icon: (
                    <svg style={{ width: 18, height: 18, stroke: 'currentColor', fill: 'none', strokeWidth: 2, flexShrink: 0 }} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                )},
                { path: '/inventory', label: 'Inventory', icon: (
                    <svg style={{ width: 18, height: 18, stroke: 'currentColor', fill: 'none', strokeWidth: 2, flexShrink: 0 }} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                )},
                { path: '/reservations', label: 'Order Based', icon: (
                    <svg style={{ width: 18, height: 18, stroke: 'currentColor', fill: 'none', strokeWidth: 2, flexShrink: 0 }} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                )},
            ]
        },
        {
            title: 'Records',
            items: [
                { path: '/history-logs', label: 'History Logs', icon: (
                    <svg style={{ width: 18, height: 18, stroke: 'currentColor', fill: 'none', strokeWidth: 2, flexShrink: 0 }} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                )},
                { path: '/sales-log', label: 'Sales Log', icon: (
                    <svg style={{ width: 18, height: 18, stroke: 'currentColor', fill: 'none', strokeWidth: 2, flexShrink: 0 }} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )},
                { path: '/reports', label: 'Reports', icon: (
                    <svg style={{ width: 18, height: 18, stroke: 'currentColor', fill: 'none', strokeWidth: 2, flexShrink: 0 }} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 00-2 2h-2a2 2 0 00-2-2z" />
                    </svg>
                )},
            ]
        },
        {
            title: 'Config',
            items: [
                { path: '/settings', label: 'System Settings', icon: (
                    <svg style={{ width: 18, height: 18, stroke: 'currentColor', fill: 'none', strokeWidth: 2, flexShrink: 0 }} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                )},
            ]
        }
    ];

    // Cashier Navigation
    const cashierNavSections = [
        {
            title: 'Cashier',
            items: [
                { path: '/pos', label: 'Point of Sale (POS)', icon: (
                    <svg style={{ width: 18, height: 18, stroke: 'currentColor', fill: 'none', strokeWidth: 2, flexShrink: 0 }} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                )},
                { path: '/reservations', label: 'Order Based', icon: (
                    <svg style={{ width: 18, height: 18, stroke: 'currentColor', fill: 'none', strokeWidth: 2, flexShrink: 0 }} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                )},
            ]
        },
        {
            title: 'Records',
            items: [
                { path: '/daily-sales', label: 'Sales Log', icon: (
                    <svg style={{ width: 18, height: 18, stroke: 'currentColor', fill: 'none', strokeWidth: 2, flexShrink: 0 }} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )},
                { path: '/customer-log', label: 'Customer Log', icon: (
                    <svg style={{ width: 18, height: 18, stroke: 'currentColor', fill: 'none', strokeWidth: 2, flexShrink: 0 }} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                )},
            ]
        },
        {
            title: 'Account',
            items: [
                { path: '/settings', label: 'My Profile', icon: (
                    <svg style={{ width: 18, height: 18, stroke: 'currentColor', fill: 'none', strokeWidth: 2, flexShrink: 0 }} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                )},
            ]
        }
    ];

    const navSections = role === 'Cashier' ? cashierNavSections : adminNavSections;

    return (
        <>
            {/* Mobile Backdrop Overlay */}
            {isMobile && isOpen && (
                <div
                    onClick={onClose}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.65)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 999,
                        transition: 'opacity 0.3s ease',
                    }}
                />
            )}

            <div style={{
                width: isMobile ? '280px' : 260,
                flexShrink: 0,
                backgroundColor: '#1E293B',
                display: 'flex',
                flexDirection: 'column',
                height: isMobile ? 'auto' : '100%',
                minHeight: isMobile ? '100%' : 'auto',
                position: isMobile ? 'fixed' : 'relative',
                top: 0,
                bottom: isMobile ? 0 : 'auto',
                left: isMobile ? 0 : 'auto',
                zIndex: isMobile ? 99999 : 'auto',
                transform: isMobile ? (isOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
                transition: isMobile ? 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
                borderRight: '1px solid rgba(255,255,255,0.05)',
                boxShadow: isMobile && isOpen ? '4px 0 24px rgba(0,0,0,0.3)' : 'none',
                userSelect: 'none',
                boxSizing: 'border-box',
                overflowY: isMobile ? 'auto' : 'visible',
            }}>
                {/* Brand Header */}
                <div style={{ padding: isMobile ? '16px 20px' : 24, borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: isMobile ? 44 : 56, height: isMobile ? 44 : 56, borderRadius: '50%', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                            <img 
                                src={fixImageUrl(sidebarLogoUrl) || fixImageUrl(logoUrl) || "/web-browser-logo.png"} 
                                alt="Logo" 
                                style={{ width: '100%', height: '100%', objectFit: (sidebarLogoUrl || logoUrl) ? 'cover' : 'contain', transform: (sidebarLogoUrl || logoUrl) ? 'none' : 'scale(1.45)' }} 
                                onError={(e) => { e.currentTarget.src = "/web-browser-logo.png"; }}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: '#FFFFFF', fontSize: isMobile ? 16 : 18, fontWeight: 800, letterSpacing: '0.5px', lineHeight: '1.2' }}>
                                {businessName ? businessName.split(' ')[0] : 'ZTG'}
                            </span>
                            <span style={{ color: '#94A3B8', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {businessName && !businessName.toLowerCase().includes('heavy parts')
                                    ? businessName.split(' ').slice(1).join(' ')
                                    : 'Heavy Equipment Parts'}
                            </span>
                        </div>
                    </div>

                    {/* Mobile Close Button */}
                    {isMobile && (
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#94A3B8',
                                cursor: 'pointer',
                                padding: 6,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    )}
                </div>

            {/* Nav Menu */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
                {navSections.map((section) => (
                    <div key={section.title} style={{ marginBottom: 24 }}>
                        <div style={{
                            color: '#64748B',
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                            marginBottom: 8,
                            paddingLeft: 12,
                        }}>
                            {section.title}
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {section.items.map((item) => (
                                <li key={item.path} style={{ marginBottom: 4 }}>
                                    <RouterNavLink
                                        to={item.path}
                                        onClick={(e) => {
                                            if (window.__ztg_restock_pending) {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                window.dispatchEvent(new CustomEvent('ztg:attempt-leave-restock', { detail: { targetPath: item.path } }));
                                                if (isMobile) onClose();
                                                return;
                                            }
                                            if (isMobile) onClose();
                                        }}
                                        style={({ isActive }) => ({
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            padding: '10px 12px',
                                            color: isActive ? '#FFFFFF' : '#94A3B8',
                                            textDecoration: 'none',
                                            fontSize: 14,
                                            fontWeight: 500,
                                            borderRadius: 8,
                                            transition: 'all 0.2s ease',
                                            backgroundColor: isActive ? '#3B82F6' : 'transparent',
                                        })}
                                        onMouseEnter={(e) => {
                                            const link = e.currentTarget;
                                            if (!link.classList.contains('active')) {
                                                link.style.backgroundColor = '#334155';
                                                link.style.color = '#FFFFFF';
                                                link.querySelectorAll('svg').forEach(s => s.style.stroke = '#FFFFFF');
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            const link = e.currentTarget;
                                            const isActive = link.getAttribute('aria-current') === 'page';
                                            if (!isActive) {
                                                link.style.backgroundColor = 'transparent';
                                                link.style.color = '#94A3B8';
                                                link.querySelectorAll('svg').forEach(s => s.style.stroke = '#94A3B8');
                                            }
                                        }}
                                    >
                                        {item.icon}
                                        {item.label}
                                    </RouterNavLink>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            {/* Footer / User Profile */}
            <div style={{
                padding: '16px 18px',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 0 }}>
                    {/* Avatar */}
                    <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        backgroundColor: (user?.profile_photo && !avatarError) ? 'transparent' : '#3B82F6',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        flexShrink: 0,
                        overflow: 'hidden',
                        border: (user?.profile_photo && !avatarError) ? '2px solid rgba(255,255,255,0.15)' : 'none',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                    }}>
                        {(user?.profile_photo && !avatarError) ? (
                            <img
                                src={fixImageUrl(user.profile_photo)}
                                alt="User Profile"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    display: 'block'
                                }}
                                onError={() => setAvatarError(true)}
                            />
                        ) : (
                            getInitials(name)
                        )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {name}
                        </div>
                        <div style={{ color: '#94A3B8', fontSize: 11, fontWeight: 500, marginTop: '1px' }}>
                            {role === 'Admin' ? 'Administrator' : role}
                        </div>
                    </div>
                </div>

                {/* Sign Out Button */}
                <button
                    onClick={(e) => {
                        if (window.__ztg_restock_pending) {
                            e.preventDefault();
                            e.stopPropagation();
                            window.dispatchEvent(new CustomEvent('ztg:attempt-leave-restock', { detail: { isLogout: true } }));
                            if (isMobile) onClose();
                            return;
                        }
                        handleLogout();
                    }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        marginTop: 14,
                        padding: '10px 14px',
                        borderRadius: '10px',
                        width: '100%',
                        color: '#F87171',
                        backgroundColor: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        fontSize: 13,
                        fontWeight: 700,
                        letterSpacing: '0.5px',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        minHeight: '42px',
                        boxSizing: 'border-box'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#DC2626';
                        e.currentTarget.style.color = '#FFFFFF';
                        e.currentTarget.style.borderColor = '#DC2626';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)';
                        e.currentTarget.style.color = '#F87171';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
                        e.currentTarget.style.boxShadow = 'none';
                    }}
                >
                    <svg style={{ width: 16, height: 16, stroke: 'currentColor', fill: 'none', strokeWidth: 2.5 }} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>SIGN OUT</span>
                </button>
            </div>
        </div>
        </>
    );
}

export default Sidebar;
