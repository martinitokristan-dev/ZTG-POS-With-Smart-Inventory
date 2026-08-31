import React from 'react';
import { NavLink as RouterNavLink, useNavigate as useRouterNavigate, useLocation as useRouterLocation } from 'react-router-dom';
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

function SidebarTooltip({ label, top, left, visible }) {
    if (!visible) return null;
    return (
        <div style={{
            position: 'fixed',
            left: left,
            top: top,
            transform: 'translateY(-50%)',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '7px 14px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '700',
            letterSpacing: '0.3px',
            whiteSpace: 'nowrap',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.6), 0 4px 6px -2px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.12)',
            zIndex: 999999,
            pointerEvents: 'none',
            animation: 'fadeInTooltip 0.15s ease-out',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        }}>
            <span>{label}</span>
            <div style={{
                position: 'absolute',
                right: '100%',
                top: '50%',
                transform: 'translateY(-50%)',
                borderWidth: '5px',
                borderStyle: 'solid',
                borderColor: 'transparent #0F172A transparent transparent'
            }} />
        </div>
    );
}

function Sidebar({ isOpen = false, onClose = () => {}, isMobile = false }) {
    const navigate = useRouterNavigate();
    const location = useRouterLocation();
    const [avatarError, setAvatarError] = React.useState(false);
    const [expandedDropdowns, setExpandedDropdowns] = React.useState({
        '/user-management': true,
    });
    const [user, setUser] = React.useState(() => {
        const userStr = (sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'));
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

    const [isCollapsed, setIsCollapsed] = React.useState(() => {
        return localStorage.getItem('ztg_sidebar_collapsed') === 'true';
    });

    const [tooltipData, setTooltipData] = React.useState({
        label: '',
        top: 0,
        left: 0,
        visible: false
    });

    const effectiveCollapsed = !isMobile && isCollapsed;

    const showTooltip = (e, label) => {
        if (!effectiveCollapsed) return;
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltipData({
            label,
            top: rect.top + rect.height / 2,
            left: rect.right + 12,
            visible: true
        });
    };

    const hideTooltip = () => {
        setTooltipData(prev => ({ ...prev, visible: false }));
    };

    const toggleCollapse = () => {
        hideTooltip();
        setIsCollapsed(prev => {
            const next = !prev;
            localStorage.setItem('ztg_sidebar_collapsed', String(next));
            return next;
        });
    };

    React.useEffect(() => {
        const handleUpdate = () => {
            const userStr = (sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'));
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
                    const stored = (sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'));
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        sessionStorage.setItem('auth_user', JSON.stringify({ ...parsed, ...freshUser })); localStorage.removeItem('auth_user');
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
                    } else {
                        localStorage.removeItem('cached_business_name');
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
    const name = user ? user.full_name || user.name : 'User';

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
            window.dispatchEvent(new Event('auth_user_updated'));
            navigate('/login');
        }
    };

    // Master Unified Navigation Sections (Filtered dynamically by active user permissions)
    const masterNavSections = [
        {
            title: 'Main',
            items: [
                { path: '/dashboard', label: 'Dashboard', moduleKey: 'dashboard', icon: (
                    <svg style={{ width: 18, height: 18, stroke: 'currentColor', fill: 'none', strokeWidth: 2, flexShrink: 0 }} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                )},
                { path: '/pos', label: 'Point of Sale (POS)', moduleKey: 'pos', icon: (
                    <svg style={{ width: 18, height: 18, stroke: 'currentColor', fill: 'none', strokeWidth: 2, flexShrink: 0 }} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                )},
                { path: '/product-management', label: 'Product Management', moduleKey: 'products', icon: (
                    <svg style={{ width: 18, height: 18, stroke: 'currentColor', fill: 'none', strokeWidth: 2, flexShrink: 0 }} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                )},
                { path: '/inventory', label: 'Inventory', moduleKey: 'inventory', icon: (
                    <svg style={{ width: 18, height: 18, stroke: 'currentColor', fill: 'none', strokeWidth: 2, flexShrink: 0 }} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                )},
                { path: '/reservations', label: 'Order Based', moduleKey: 'reservations', icon: (
                    <svg style={{ width: 18, height: 18, stroke: 'currentColor', fill: 'none', strokeWidth: 2, flexShrink: 0 }} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                )},
            ]
        },
        {
            title: 'Records',
            items: [
                { path: '/history-logs', label: 'History Logs', moduleKey: 'history_logs', icon: (
                    <svg style={{ width: 18, height: 18, stroke: 'currentColor', fill: 'none', strokeWidth: 2, flexShrink: 0 }} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                )},
                { path: '/sales-log', label: 'Sales Log', moduleKey: 'sales_log', icon: (
                    <svg style={{ width: 18, height: 18, stroke: 'currentColor', fill: 'none', strokeWidth: 2, flexShrink: 0 }} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )},
                { path: '/reports', label: 'Reports', moduleKey: 'reports', icon: (
                    <svg style={{ width: 18, height: 18, stroke: 'currentColor', fill: 'none', strokeWidth: 2, flexShrink: 0 }} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 00-2 2h-2a2 2 0 00-2-2z" />
                    </svg>
                )},
            ]
        },
        {
            title: 'Management',
            items: [
                {
                    path: '/user-management',
                    label: 'User Management',
                    moduleKey: 'user_management',
                    icon: (
                        <svg style={{ width: 18, height: 18, stroke: 'currentColor', fill: 'none', strokeWidth: 2, flexShrink: 0 }} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    ),
                    children: [
                        {
                            path: '/user-management/roles',
                            label: 'Roles & Permissions',
                            icon: (
                                <svg style={{ width: 16, height: 16, stroke: 'currentColor', fill: 'none', strokeWidth: 2, flexShrink: 0 }} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            )
                        },
                        {
                            path: '/user-management/checkers',
                            label: 'Checkers',
                            icon: (
                                <svg style={{ width: 16, height: 16, stroke: 'currentColor', fill: 'none', strokeWidth: 2, flexShrink: 0 }} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                            )
                        },
                    ]
                },
            ]
        },
        {
            title: 'Diagnostics & Config',
            items: [
                { path: '/system-status', label: 'System Status', moduleKey: 'system_status', icon: (
                    <svg style={{ width: 18, height: 18, stroke: 'currentColor', fill: 'none', strokeWidth: 2, flexShrink: 0 }} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                )},
                { path: '/settings', label: 'System Settings', moduleKey: 'settings', icon: (
                    <svg style={{ width: 18, height: 18, stroke: 'currentColor', fill: 'none', strokeWidth: 2, flexShrink: 0 }} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                )},
            ]
        }
    ];

    // Cashier Navigation (Dedicated Cashier Daily Sales & Customer Log UI)
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
                { path: '/settings', label: 'My Account', icon: (
                    <svg style={{ width: 18, height: 18, stroke: 'currentColor', fill: 'none', strokeWidth: 2, flexShrink: 0 }} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                )},
            ]
        }
    ];

    const userPerms = user?.permissions || {};
    const isAdminUser = role === 'Admin' || role === 'Administrator';
    const isCashierUser = role === 'Cashier';
    const isTechOpsUser = role === 'Technical Operations' || (typeof role === 'string' && role.toLowerCase().includes('tech'));

    // Select navigation sections: dedicated UI for Cashier, filtered dynamic navigation for Admin and custom roles
    const navSections = isCashierUser 
        ? cashierNavSections 
        : masterNavSections.map(sec => ({
            ...sec,
            items: sec.items.filter(item => {
                // System Status is exclusively for Technical Operations or users with explicit system_status permission
                if (item.moduleKey === 'system_status') {
                    return Boolean(isTechOpsUser || userPerms.system_status?.has_access);
                }
                // Point of Sale (POS) is strictly for Cashier or roles with explicit pos access (excluded from Admin)
                if (item.moduleKey === 'pos') {
                    return !isAdminUser && Boolean(userPerms.pos?.has_access ?? isCashierUser);
                }
                if (isAdminUser) return true;
                if (!item.moduleKey) return true;
                if (item.moduleKey === 'settings') return true; // My Account / Settings is accessible to all authenticated users
                const p = userPerms[item.moduleKey];
                return Boolean(p && p.has_access);
            })
        })).filter(sec => sec.items.length > 0);

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

            <div 
                className="admin-sidebar"
                style={{
                    width: effectiveCollapsed ? 72 : (isMobile ? '280px' : 260),
                    flexShrink: 0,
                    backgroundColor: 'var(--bg-sidebar, #FFFFFF)',
                    fontFamily: "var(--font-ui)",
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
                    transition: isMobile 
                        ? 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' 
                        : 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    borderRight: '1px solid var(--border)',
                    boxShadow: isMobile && isOpen ? '4px 0 24px rgba(0,0,0,0.15)' : 'none',
                    userSelect: 'none',
                    boxSizing: 'border-box',
                    overflowY: isMobile ? 'auto' : 'visible',
                }}
            >
                {/* Brand Header */}
                <div 
                    className="admin-sidebar-header"
                    style={{
                        padding: effectiveCollapsed ? '16px 0' : (isMobile ? '16px 20px' : '20px 24px'),
                        justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
                        height: '80px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: effectiveCollapsed ? 0 : 14,
                        boxSizing: 'border-box'
                    }}
                >
                    <div 
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            backgroundColor: 'var(--bg-card, #FFFFFF)',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            flexShrink: 0,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                            cursor: effectiveCollapsed ? 'pointer' : 'default'
                        }}
                        onMouseEnter={(e) => showTooltip(e, businessName || "POS & Inventory")}
                        onMouseLeave={hideTooltip}
                    >
                        {(sidebarLogoUrl || logoUrl) ? (
                            <img 
                                src={fixImageUrl(sidebarLogoUrl) || fixImageUrl(logoUrl)} 
                                alt={businessName || "Store Logo"} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                        ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)', color: '#FFFFFF' }}>
                                {businessName ? (
                                    <span style={{ fontSize: 16, fontWeight: 800 }}>{businessName.charAt(0).toUpperCase()}</span>
                                ) : (
                                    <svg style={{ width: 22, height: 22, fill: 'none', stroke: '#FFFFFF', strokeWidth: 2 }} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                        <polyline strokeLinecap="round" strokeLinejoin="round" points="9 22 9 12 15 12 15 22"></polyline>
                                    </svg>
                                )}
                            </div>
                        )}
                    </div>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        opacity: effectiveCollapsed ? 0 : 1,
                        maxWidth: effectiveCollapsed ? 0 : 200,
                        transition: 'opacity 0.2s ease, max-width 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}>
                        {businessName ? (
                            <>
                                <span style={{ color: 'var(--text-primary, #0F172A)', fontSize: isMobile ? 16 : 17, fontWeight: 700, letterSpacing: '0.3px', lineHeight: '1.2' }}>
                                    {businessName.split(' ')[0]}
                                </span>
                                <span style={{ color: 'var(--text-secondary, #64748B)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {businessName.split(' ').slice(1).join(' ') || 'STORE'}
                                </span>
                            </>
                        ) : (
                            <>
                                <span style={{ color: 'var(--text-primary, #0F172A)', fontSize: isMobile ? 16 : 17, fontWeight: 700, letterSpacing: '0.3px', lineHeight: '1.2' }}>
                                    POS System
                                </span>
                                <span style={{ color: 'var(--text-secondary, #64748B)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Smart Inventory
                                </span>
                            </>
                        )}
                    </div>

                    {/* Mobile Close Button */}
                    {isMobile && (
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-secondary, #64748B)',
                                cursor: 'pointer',
                                padding: 6,
                                marginLeft: 'auto',
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
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px' }}>
                    {navSections.map((section) => (
                        <div key={section.title} style={{ marginBottom: 16 }}>
                            <div style={{
                                height: 22,
                                marginBottom: 8,
                                display: 'flex',
                                alignItems: 'center',
                                paddingLeft: effectiveCollapsed ? 0 : 12,
                                justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
                                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                            }}>
                                {effectiveCollapsed ? (
                                    <div style={{ width: 28, height: 1, backgroundColor: 'var(--border, rgba(0,0,0,0.1))' }} />
                                ) : (
                                    <span style={{
                                        color: 'var(--text-secondary, #64748B)',
                                        fontSize: 11,
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: 1,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        transition: 'opacity 0.2s ease'
                                    }}>
                                        {section.title}
                                    </span>
                                )}
                            </div>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {section.items.map((item) => {
                                    const hasChildren = item.children && item.children.length > 0;
                                    const isParentActive = location.pathname.startsWith(item.path);
                                    const isExpanded = expandedDropdowns[item.path] ?? isParentActive;

                                    if (hasChildren) {
                                        return (
                                            <li key={item.path} style={{ marginBottom: 4 }}>
                                                {/* Parent Item */}
                                                <div
                                                    onClick={() => {
                                                        if (effectiveCollapsed) {
                                                            navigate(item.path);
                                                            if (isMobile) onClose();
                                                            return;
                                                        }
                                                        setExpandedDropdowns(prev => ({
                                                            ...prev,
                                                            [item.path]: !isExpanded
                                                        }));
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        showTooltip(e, item.label);
                                                        e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #F1F5F9)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        hideTooltip();
                                                        e.currentTarget.style.backgroundColor = 'transparent';
                                                    }}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: effectiveCollapsed ? 'center' : 'space-between',
                                                        gap: 10,
                                                        padding: '10px 12px',
                                                        width: '100%',
                                                        height: '42px',
                                                        color: 'var(--text-primary, #1E293B)',
                                                        fontSize: 14.5,
                                                        fontWeight: 500,
                                                        borderRadius: 8,
                                                        cursor: 'pointer',
                                                        transition: 'background-color 0.15s ease, color 0.15s ease',
                                                        backgroundColor: 'transparent',
                                                        boxSizing: 'border-box',
                                                        userSelect: 'none',
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                                                        <span style={{ color: 'var(--text-primary, #1E293B)', display: 'flex' }}>
                                                            {item.icon}
                                                        </span>
                                                        <span style={{
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            opacity: effectiveCollapsed ? 0 : 1,
                                                            maxWidth: effectiveCollapsed ? 0 : 160,
                                                            transition: 'opacity 0.2s ease, max-width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                                            display: 'inline-block'
                                                        }}>
                                                            {item.label}
                                                        </span>
                                                    </div>

                                                    {!effectiveCollapsed && (
                                                        <svg
                                                            width="14"
                                                            height="14"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2.5"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            style={{
                                                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                                                transition: 'transform 0.2s ease',
                                                                flexShrink: 0,
                                                                color: 'var(--text-secondary, #64748B)'
                                                            }}
                                                        >
                                                            <polyline points="6 9 12 15 18 9" />
                                                        </svg>
                                                    )}
                                                </div>

                                                {/* Sub-Items Dropdown */}
                                                {!effectiveCollapsed && isExpanded && (
                                                    <ul style={{ listStyle: 'none', padding: '2px 0 0 0', margin: 0 }}>
                                                        {item.children.map((subItem) => {
                                                            const isSubActive = 
                                                                location.pathname === subItem.path || 
                                                                (subItem.path.includes('/roles') && (location.pathname === '/user-management' || location.pathname === '/user-management/roles'));

                                                            return (
                                                                <li key={subItem.path} style={{ marginTop: 2 }}>
                                                                    <RouterNavLink
                                                                        to={subItem.path}
                                                                        onClick={() => {
                                                                            if (isMobile) onClose();
                                                                        }}
                                                                        className={`sidebar-subitem ${isSubActive ? 'active' : ''}`}
                                                                        style={{
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: 10,
                                                                            padding: '8px 12px 8px 24px',
                                                                            width: '100%',
                                                                            height: '38px',
                                                                            fontSize: '13.5px',
                                                                            fontWeight: 500,
                                                                            color: isSubActive ? '#FFFFFF' : '#1E293B',
                                                                            textDecoration: 'none',
                                                                            borderRadius: '8px',
                                                                            backgroundColor: isSubActive ? '#3B82F6' : 'transparent',
                                                                            transition: 'background-color 0.2s ease, color 0.2s ease',
                                                                            boxSizing: 'border-box',
                                                                        }}
                                                                        onMouseEnter={(e) => {
                                                                            const link = e.currentTarget;
                                                                            if (!link.classList.contains('active') && link.getAttribute('aria-current') !== 'page') {
                                                                                link.style.backgroundColor = '#3B82F6';
                                                                                link.style.color = '#FFFFFF';
                                                                                link.querySelectorAll('svg').forEach(s => s.style.stroke = '#FFFFFF');
                                                                            }
                                                                        }}
                                                                        onMouseLeave={(e) => {
                                                                            const link = e.currentTarget;
                                                                            const isActive = link.getAttribute('aria-current') === 'page' || link.classList.contains('active');
                                                                            if (!isActive) {
                                                                                link.style.backgroundColor = 'transparent';
                                                                                link.style.color = '#1E293B';
                                                                                link.querySelectorAll('svg').forEach(s => s.style.stroke = '');
                                                                            }
                                                                        }}
                                                                    >
                                                                        {subItem.icon && (
                                                                            <span style={{ color: isSubActive ? '#FFFFFF' : 'inherit', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                                                                {subItem.icon}
                                                                            </span>
                                                                        )}
                                                                        <span>{subItem.label}</span>
                                                                    </RouterNavLink>
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                )}
                                            </li>
                                        );
                                    }

                                    return (
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
                                                    justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
                                                    gap: 10,
                                                    padding: '10px 12px',
                                                    width: '100%',
                                                    height: '42px',
                                                    color: isActive ? '#FFFFFF' : '#1E293B',
                                                    textDecoration: 'none',
                                                    fontSize: 14.5,
                                                    fontWeight: 500,
                                                    borderRadius: 8,
                                                    transition: 'background-color 0.2s ease, color 0.2s ease',
                                                    backgroundColor: isActive ? '#3B82F6' : 'transparent',
                                                    position: 'relative',
                                                    boxSizing: 'border-box'
                                                })}
                                                onMouseEnter={(e) => {
                                                    showTooltip(e, item.label);
                                                    const link = e.currentTarget;
                                                    if (!link.classList.contains('active') && link.getAttribute('aria-current') !== 'page') {
                                                        link.style.backgroundColor = '#3B82F6';
                                                        link.style.color = '#FFFFFF';
                                                        link.querySelectorAll('svg').forEach(s => s.style.stroke = '#FFFFFF');
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    hideTooltip();
                                                    const link = e.currentTarget;
                                                    const isActive = link.getAttribute('aria-current') === 'page' || link.classList.contains('active');
                                                    if (!isActive) {
                                                        link.style.backgroundColor = '';
                                                        link.style.color = '';
                                                        link.querySelectorAll('svg').forEach(s => s.style.stroke = '');
                                                    }
                                                }}
                                            >
                                                {item.icon}
                                                <span style={{
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    opacity: effectiveCollapsed ? 0 : 1,
                                                    maxWidth: effectiveCollapsed ? 0 : 180,
                                                    transition: 'opacity 0.2s ease, max-width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                                    display: 'inline-block'
                                                }}>
                                                    {item.label}
                                                </span>
                                            </RouterNavLink>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}

                </div>

                {/* Footer / User Profile & Sign Out */}
                <div 
                    className="admin-sidebar-footer"
                    style={{
                        padding: effectiveCollapsed ? '12px 8px 16px 8px' : '12px 14px 16px 14px',
                        backgroundColor: 'transparent',
                        borderTop: '1px solid var(--border)',
                        flexShrink: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        boxSizing: 'border-box'
                    }}
                >
                    <div 
                        style={{
                            display: 'flex',
                            flexDirection: effectiveCollapsed ? 'column' : 'row',
                            alignItems: 'center',
                            justifyContent: effectiveCollapsed ? 'center' : 'space-between',
                            gap: effectiveCollapsed ? 8 : 8,
                            padding: '4px 6px',
                            position: 'relative',
                            width: '100%',
                            boxSizing: 'border-box'
                        }}
                    >
                        {/* Profile Info (Avatar + Text) */}
                        <div 
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                minWidth: 0,
                                flex: effectiveCollapsed ? 'none' : 1,
                                cursor: 'default',
                            }}
                            onMouseEnter={(e) => showTooltip(e, `${name} (${role === 'Admin' ? 'Administrator' : role})`)}
                            onMouseLeave={hideTooltip}
                        >
                            {/* Avatar */}
                            <div style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                backgroundColor: (user?.profile_photo && !avatarError) ? 'transparent' : '#3B82F6',
                                color: '#FFFFFF',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 13,
                                flexShrink: 0,
                                overflow: 'hidden',
                                border: (user?.profile_photo && !avatarError) ? '2px solid var(--border)' : 'none',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
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

                            {!effectiveCollapsed && (
                                <div style={{
                                    flex: 1,
                                    minWidth: 0,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                }}>
                                    <div style={{ color: 'var(--text-primary, #1E293B)', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {name}
                                    </div>
                                    <div style={{ color: 'var(--text-secondary, #64748B)', fontSize: 11, fontWeight: 500, marginTop: '1px' }}>
                                        {role === 'Admin' ? 'Administrator' : role}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Collapse / Expand Chevron Icon Button */}
                        {!isMobile && (
                            <button
                                type="button"
                                onClick={toggleCollapse}
                                title={effectiveCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 32,
                                    height: 32,
                                    borderRadius: 8,
                                    border: '1px solid var(--border, #CBD5E1)',
                                    backgroundColor: 'var(--bg-secondary, #F8FAFC)',
                                    color: 'var(--text-secondary, #475569)',
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                    padding: 0,
                                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                                    transition: 'all 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                    showTooltip(e, effectiveCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar');
                                    e.currentTarget.style.backgroundColor = '#EFF6FF';
                                    e.currentTarget.style.color = '#2563EB';
                                    e.currentTarget.style.borderColor = '#93C5FD';
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                }}
                                onMouseLeave={(e) => {
                                    hideTooltip();
                                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #F8FAFC)';
                                    e.currentTarget.style.color = 'var(--text-secondary, #475569)';
                                    e.currentTarget.style.borderColor = 'var(--border, #CBD5E1)';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                                aria-label={effectiveCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                            >
                                <svg style={{ width: 17, height: 17, stroke: 'currentColor', fill: 'none', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', flexShrink: 0 }} viewBox="0 0 24 24">
                                    {effectiveCollapsed ? (
                                        <>
                                            <polyline points="3 17 8 12 3 7" />
                                            <polyline points="10 17 15 12 10 7" />
                                            <polyline points="17 17 22 12 17 7" />
                                        </>
                                    ) : (
                                        <>
                                            <polyline points="7 17 2 12 7 7" />
                                            <polyline points="14 17 9 12 14 7" />
                                            <polyline points="21 17 16 12 21 7" />
                                        </>
                                    )}
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Sign Out Link / Button matching Reference Style */}
                    <button
                        type="button"
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
                            justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
                            gap: 10,
                            padding: '10px 12px',
                            width: '100%',
                            height: '42px',
                            color: '#1E293B',
                            backgroundColor: 'transparent',
                            border: 'none',
                            borderRadius: 8,
                            cursor: 'pointer',
                            fontSize: 14.5,
                            fontWeight: 500,
                            fontFamily: "var(--font-ui)",
                            transition: 'background-color 0.2s ease, color 0.2s ease',
                            boxSizing: 'border-box'
                        }}
                        onMouseEnter={(e) => {
                            showTooltip(e, 'Sign Out');
                            e.currentTarget.style.backgroundColor = '#3B82F6';
                            e.currentTarget.style.color = '#FFFFFF';
                            e.currentTarget.querySelectorAll('svg').forEach(s => s.style.stroke = '#FFFFFF');
                        }}
                        onMouseLeave={(e) => {
                            hideTooltip();
                            e.currentTarget.style.backgroundColor = '';
                            e.currentTarget.style.color = '';
                            e.currentTarget.querySelectorAll('svg').forEach(s => s.style.stroke = '');
                        }}
                        aria-label="Sign Out"
                    >
                        <svg style={{ width: 18, height: 18, stroke: 'currentColor', fill: 'none', strokeWidth: 2, flexShrink: 0 }} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span style={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            opacity: effectiveCollapsed ? 0 : 1,
                            maxWidth: effectiveCollapsed ? 0 : 140,
                            transition: 'opacity 0.2s ease, max-width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            display: 'inline-block'
                        }}>
                            Sign Out
                        </span>
                    </button>
                </div>
            </div>

            {/* Fixed Floating Tooltip Portal */}
            <SidebarTooltip 
                label={tooltipData.label} 
                top={tooltipData.top} 
                left={tooltipData.left} 
                visible={tooltipData.visible} 
            />
        </>
    );
}

export default Sidebar;
