import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../contexts/NotificationContext';

// Helper: resolve icon properties from notification type/sub_type
function getNotifIcon(n) {
    const subType = n.sub_type || '';
    const title   = n.title || '';

    if (subType === 'Refund' || subType === 'Return' || title.includes('Refund') || title.includes('Return')) {
        return { bg: '#FFFBEB', color: '#F59E0B', svg: '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>' };
    }
    if (subType === 'Void' || subType === 'Damaged' || title.includes('Void') || title.includes('Damaged')) {
        return { bg: '#FEF2F2', color: '#DC2626', svg: '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>' };
    }
    if (subType === 'Restocked' || title.includes('Restocked')) {
        return { bg: '#EFF6FF', color: '#3B82F6', svg: '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>' };
    }
    if (n.type === 'inventory' || subType === 'Low Stock' || subType === 'Out of Stock' || title.includes('Stock')) {
        return { bg: '#FFFBEB', color: '#D97706', svg: '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>' };
    }
    if (subType === 'Paid' || subType === 'Deposit' || title.includes('Reservation') || title.includes('Deposit')) {
        return { bg: '#EEF2FF', color: '#4F46E5', svg: '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>' };
    }
    if (n.type === 'transaction' || subType === 'Completed' || title.includes('Completed')) {
        return { bg: '#ECFDF5', color: '#10B981', svg: '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>' };
    }
    return { bg: '#FEF2F2', color: '#EF4444', svg: '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>' };
}

function timeAgo(timestamp) {
    if (!timestamp) return 'Just now';
    const diffMs = Math.max(0, Date.now() - timestamp);
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared Notification Card (renders identically inside dropdown and bubble toast)
// ─────────────────────────────────────────────────────────────────────────────
function NotificationCard({ n, isBubble, onDismiss }) {
    const icon = getNotifIcon(n);
    const timeStr = timeAgo(n.timestamp);

    return (
        <div style={{ display: 'flex', gap: '16px', padding: '16px 20px', position: 'relative', width: '100%' }}>
            {/* Left Icon */}
            <div
                style={{ width: '40px', height: '40px', background: icon.bg, color: icon.color, borderRadius: '10px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                dangerouslySetInnerHTML={{ __html: icon.svg }}
            />

            {/* Content block */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary, #0F172A)', wordBreak: 'break-word' }}>
                        {n.title}
                    </strong>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary, #64748B)', flexShrink: 0 }}>{timeStr}</span>
                </div>
                <div style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary, #64748B)',
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                    display: 'block'
                }}>
                    {n.message}
                </div>
            </div>

            {/* Bubble close button removed as per user request */}

            {/* Unread indicator inside list */}
            {!isBubble && !n.read && (
                <div className="unread-dot" style={{ width: '6px', height: '6px', background: '#3B82F6', borderRadius: '50%', alignSelf: 'center', flexShrink: 0, marginLeft: '8px' }}></div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Notification Bubble Component
// ─────────────────────────────────────────────────────────────────────────────
function NotificationBubble({ notif, onClick }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 20);
        return () => clearTimeout(t);
    }, []);

    const icon = getNotifIcon(notif);

    return (
        <div
            onClick={onClick}
            style={{
                position: 'absolute',
                top: '100%',
                right: '-8px',
                marginTop: '14px',
                zIndex: 9999,
                width: '320px',
                background: 'var(--bg-card)',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0) scale(1)' : 'translateY(-10px) scale(0.95)',
                transformOrigin: 'top right',
            }}
        >
            {/* Chat bubble pointer */}
            <div style={{
                position: 'absolute',
                top: '-6px',
                right: '20px',
                width: '12px',
                height: '12px',
                background: 'var(--bg-card)',
                borderLeft: '1px solid var(--border)',
                borderTop: '1px solid var(--border)',
                transform: 'rotate(45deg)',
                zIndex: 1,
            }} />

            <div style={{ position: 'relative', zIndex: 2, background: 'var(--bg-card)', borderRadius: '12px', overflow: 'hidden' }}>
                <NotificationCard n={notif} isBubble={true} onDismiss={() => {}} />
                
                {/* Drain animation bar */}
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    height: '3px',
                    background: icon.color,
                    animation: 'notif-progress 3s linear forwards',
                    opacity: 0.6,
                }} />
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Notifications Dropdown Component
// ─────────────────────────────────────────────────────────────────────────────
export default function NotificationsDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const { notifications, unreadCount, markAsRead, markAllRead, bubbleNotif, dismissBubble } = useNotifications();

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        // Both mousedown (desktop) and touchstart (iOS/Android) to close on outside tap
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside, { passive: true });
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, []);

    const handleMarkAllRead = async (e) => {
        e.stopPropagation();
        await markAllRead();
    };

    const handleMarkRead = async (id) => {
        await markAsRead(id);
        setIsOpen(false);
    };

    return (
        <>
            {/* ── Bell Button + Dropdown ── */}
            <div className="notif-wrapper" ref={dropdownRef} style={{ position: 'relative' }}>
                <button
                    id="notifBellBtn"
                    className={`notif-btn${isOpen ? ' notif-btn--open' : ''}`}
                    onClick={() => setIsOpen(!isOpen)}
                    // Blur the button immediately on touch so iOS releases :hover/:active right away
                    onTouchEnd={(e) => { e.currentTarget.blur(); }}
                    aria-label="Notifications"
                    data-tooltip="Notifications"
                >
                    <svg viewBox="0 0 24 24" style={{ width: '22px', height: '22px', fill: 'none', stroke: isOpen ? 'var(--primary, #3B82F6)' : 'var(--text-secondary, #64748B)', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                    {unreadCount > 0 && (
                        <span className={`notif-badge${isOpen ? '' : ' pulse'}`}>{unreadCount}</span>
                    )}
                </button>

                {/* ── Notification Bubble Toast ── */}
                {bubbleNotif && !isOpen && (
                    <NotificationBubble 
                        notif={bubbleNotif} 
                        onClick={() => {
                            dismissBubble();
                            setIsOpen(true);
                        }} 
                    />
                )}

                {isOpen && (
                    <div className="notif-dropdown" style={{ display: 'block', zIndex: 9999, right: 0, marginTop: '8px', position: 'absolute', width: '380px', maxWidth: 'calc(100vw - 32px)', background: 'var(--bg-card)', borderRadius: '12px', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', borderRadius: '12px 12px 0 0' }}>
                            <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>Notifications</span>
                            <button 
                                type="button"
                                className="mark-all-read-btn"
                                onClick={handleMarkAllRead} 
                                style={{ 
                                    background: 'transparent', 
                                    border: 'none', 
                                    outline: 'none',
                                    boxShadow: 'none',
                                    fontSize: '12px', 
                                    fontWeight: '600', 
                                    cursor: 'pointer', 
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                Mark all as read
                            </button>
                        </div>
                        <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                            {notifications.length === 0 ? (
                                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                                    No notifications to display.
                                </div>
                            ) : notifications.map(n => (
                                <div key={n.id} onClick={() => handleMarkRead(n.id)} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', background: n.read ? 'var(--bg-card)' : 'var(--bg-secondary)', transition: 'background 0.2s' }}>
                                    <NotificationCard n={n} isBubble={false} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
