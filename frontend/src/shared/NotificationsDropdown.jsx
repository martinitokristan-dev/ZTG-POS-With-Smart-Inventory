import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import NotificationDetailModal from './NotificationDetailModal';
import useNotificationSearch, { NOTIF_CATEGORIES, NOTIF_PERIODS } from './hooks/useNotificationSearch';
import IOSSelect from './components/IOSSelect';

// Helper: resolve icon properties from notification type/sub_type
function getNotifIcon(n) {
    const subType = n.sub_type || '';
    const title   = n.title || '';

    // Security first: a failed PIN "for Refund ..." must not look like a refund or a success.
    if (subType === 'Security Alert' || subType === 'security_alert' || title.startsWith('Security Alert') || title === 'Failed PIN Attempt') {
        return { bg: 'rgba(239, 68, 68, 0.12)', color: '#DC2626', svg: '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>' };
    }

    if (subType === 'Refund' || subType === 'Return' || title.includes('Refund') || title.includes('Return')) {
        return { bg: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', svg: '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>' };
    }
    if (subType === 'Void' || subType === 'Damaged' || title.includes('Void') || title.includes('Damaged')) {
        return { bg: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', svg: '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>' };
    }
    if (subType === 'Restocked' || title.includes('Restocked')) {
        return { bg: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6', svg: '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>' };
    }
    if (n.type === 'inventory' || subType === 'Low Stock' || subType === 'Out of Stock' || title.includes('Stock')) {
        return { bg: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', svg: '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>' };
    }
    if (subType === 'Paid' || subType === 'Deposit' || title.includes('Reservation') || title.includes('Deposit')) {
        return { bg: 'rgba(99, 102, 241, 0.15)', color: '#6366F1', svg: '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>' };
    }
    if (n.type === 'transaction' || subType === 'Completed' || title.includes('Completed')) {
        return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10B981', svg: '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>' };
    }
    return { bg: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', svg: '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>' };
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
                    <strong style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                        {n.title}
                    </strong>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flexShrink: 0 }}>{timeStr}</span>
                </div>
                <div style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
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

/** Short relative time for the list ("Just now", "5m", "3h", "2d", then "Oct 21"). */
function shortTime(timestamp) {
    if (!timestamp) return '';
    const mins = Math.floor(Math.max(0, Date.now() - timestamp) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Split a newest-first list into Today / Yesterday / Earlier, keeping the order. */
function groupByDay(list) {
    const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
    const startYesterday = startToday.getTime() - 86400000;
    const groups = [];
    list.forEach((n) => {
        const label = n.timestamp >= startToday.getTime() ? 'Today' : n.timestamp >= startYesterday ? 'Yesterday' : 'Earlier';
        const last = groups[groups.length - 1];
        if (last && last.label === label) last.items.push(n);
        else groups.push({ label, items: [n] });
    });
    return groups;
}

/** Text with the searched word marked, so it is clear why a row matched. Plain React, no HTML. */
function Highlight({ text, term }) {
    const value = String(text ?? '');
    const q = term.trim();
    if (!q) return value;
    const lower = value.toLowerCase();
    const needle = q.toLowerCase();
    const parts = [];
    let from = 0;
    let at = lower.indexOf(needle);
    while (at !== -1) {
        if (at > from) parts.push(value.slice(from, at));
        parts.push(<mark key={at} className="notif-mark">{value.slice(at, at + q.length)}</mark>);
        from = at + q.length;
        at = lower.indexOf(needle, from);
    }
    if (from < value.length) parts.push(value.slice(from));
    return parts;
}

/** One list row: type icon, title, two-line message, time, and one quiet unread dot. */
function NotificationRow({ n, onOpen, term = '' }) {
    const icon = getNotifIcon(n);
    return (
        <button type="button" className={`notif-row${n.read ? '' : ' is-unread'}`} onClick={onOpen}>
            <span className="notif-row-icon" style={{ background: icon.bg, color: icon.color }} dangerouslySetInnerHTML={{ __html: icon.svg }} aria-hidden="true" />
            <span className="notif-row-body">
                <span className="notif-row-top">
                    <span className="notif-row-title"><Highlight text={n.title} term={term} /></span>
                    <span className="notif-row-time" title={new Date(n.timestamp).toLocaleString()}>{shortTime(n.timestamp)}</span>
                </span>
                <span className="notif-row-msg"><Highlight text={n.message} term={term} /></span>
            </span>
            {!n.read && <span className="notif-row-dot" aria-label="Unread" />}
        </button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Notifications Dropdown Component
// ─────────────────────────────────────────────────────────────────────────────
export default function NotificationsDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState(null);
    const dropdownRef = useRef(null);
    const listRef = useRef(null);      // Scrollable notification list
    const sentinelRef = useRef(null);  // Invisible marker at the bottom of the list
    const live = useNotifications();
    const { unreadCount, markAsRead, markAllRead, bubbleNotif, dismissBubble } = live;
    const filter = useNotificationSearch();

    // With a search or filter set, the list comes from the server search; otherwise the live inbox.
    const notifications = filter.isFiltering ? filter.results : live.notifications;
    const hasMore = filter.isFiltering ? filter.hasMore : live.hasMore;
    const loadingMore = filter.isFiltering ? filter.loadingMore : live.loadingMore;
    const loadMore = filter.isFiltering ? filter.loadMore : live.loadMore;

    // Infinite scroll: load older notifications when the bottom marker comes into view
    useEffect(() => {
        if (!isOpen || !hasMore || !listRef.current || !sentinelRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) loadMore();
            },
            // Start loading slightly before the user actually hits the bottom
            { root: listRef.current, rootMargin: '0px 0px 80px 0px' }
        );
        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [isOpen, hasMore, loadMore, notifications.length]);

    // New filter = start at the top of the list.
    useEffect(() => {
        if (listRef.current) listRef.current.scrollTop = 0;
    }, [filter.isFiltering, filter.category, filter.unreadOnly, filter.period]);

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
        filter.markAllLocalRead();
    };

    const handleMarkRead = async (id) => {
        // Find the notification
        const notification = notifications.find(n => n.id === id);
        if (!notification) return;

        // Mark as read
        filter.markLocalRead(id);
        await markAsRead(id);
        
        // Show detail modal
        setSelectedNotification(notification);
        setIsOpen(false);
    };

    const handleCloseDetail = () => {
        setSelectedNotification(null);
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
                        <span className={`notif-badge${isOpen ? '' : ' pulse'}`}>{unreadCount > 99 ? '99+' : unreadCount}</span>
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
                    <div className="notif-panel" role="dialog" aria-label="Notifications">
                        {/* ── Header: title, unread count, bulk action ── */}
                        <div className="notif-panel-head">
                            <div className="notif-panel-title">
                                <span>Notifications</span>
                                {unreadCount > 0 && <span className="notif-count-pill">{unreadCount > 99 ? '99+' : unreadCount} new</span>}
                            </div>
                            <button
                                type="button"
                                className="notif-mark-all"
                                onClick={handleMarkAllRead}
                                disabled={unreadCount === 0}
                            >
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 7l-8.5 8.5L6 12" /><path d="M22 7l-8.5 8.5-1.2-1.2" /></svg>
                                Mark all read
                            </button>
                        </div>

                        {/* ── All / Unread tabs ── */}
                        <div className="notif-tabs" role="tablist">
                            <button type="button" role="tab" aria-selected={!filter.unreadOnly} className={!filter.unreadOnly ? 'active' : ''} onClick={() => filter.setUnreadOnly(false)}>All</button>
                            <button type="button" role="tab" aria-selected={filter.unreadOnly} className={filter.unreadOnly ? 'active' : ''} onClick={() => filter.setUnreadOnly(true)}>
                                Unread{unreadCount > 0 && <span className="notif-tab-count">{unreadCount > 99 ? '99+' : unreadCount}</span>}
                            </button>
                        </div>

                        {/* ── Search & filters ── */}
                        <div className="notif-filters">
                            <div className="notif-search-row">
                            <div className="notif-search">
                                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                                <input
                                    type="text"
                                    value={filter.search}
                                    onChange={(e) => filter.setSearch(e.target.value)}
                                    placeholder="Search product, part no. or S.I. no."
                                    maxLength={100}
                                    aria-label="Search notifications"
                                />
                                {filter.search && (
                                    <button type="button" className="notif-search-clear" onClick={() => filter.setSearch('')} aria-label="Clear search">
                                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                    </button>
                                )}
                            </div>
                            <div className="notif-period">
                                <IOSSelect
                                    value={filter.period}
                                    onChange={(e) => filter.setPeriod(e.target.value)}
                                    options={NOTIF_PERIODS}
                                />
                            </div>
                            </div>
                            <div className="notif-chips" role="group" aria-label="Notification type">
                                {NOTIF_CATEGORIES.map((c) => (
                                    <button
                                        key={c.value}
                                        type="button"
                                        className={`notif-chip${filter.category === c.value ? ' active' : ''}`}
                                        aria-pressed={filter.category === c.value}
                                        onClick={() => filter.setCategory(c.value)}
                                    >
                                        {c.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div ref={listRef} className="notif-list" aria-busy={loadingMore || filter.loading}>
                            {filter.isFiltering && filter.error ? (
                                <div role="alert" className="notif-state notif-state--error">
                                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                    <span>{filter.error}</span>
                                </div>
                            ) : filter.isFiltering && filter.loading ? (
                                <div role="status" className="notif-state">
                                    <span className="notif-spinner" />
                                    Searching...
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="notif-state">
                                    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                                    {filter.isFiltering ? (
                                        <>
                                            <strong>No matching notifications</strong>
                                            <span>Try another word or filter.</span>
                                            <button type="button" className="notif-clear-link" onClick={filter.clearFilters}>Clear filters</button>
                                        </>
                                    ) : (
                                        <>
                                            <strong>You're all caught up</strong>
                                            <span>New alerts will show up here.</span>
                                        </>
                                    )}
                                </div>
                            ) : groupByDay(notifications).map(({ label, items }) => (
                                <section key={label} aria-label={label}>
                                    <div className="notif-group-label">{label}</div>
                                    {items.map(n => (
                                        <NotificationRow key={n.id} n={n} term={filter.isFiltering ? filter.search : ''} onOpen={() => handleMarkRead(n.id)} />
                                    ))}
                                </section>
                            ))}

                            {/* Infinite scroll marker + status footer */}
                            {hasMore && <div ref={sentinelRef} style={{ height: '1px' }} aria-hidden="true" />}
                            {loadingMore && (
                                <div role="status" className="notif-list-foot">
                                    <span className="notif-spinner" />
                                    Loading older notifications...
                                </div>
                            )}
                            {!hasMore && !loadingMore && !(filter.isFiltering && (filter.loading || filter.error)) && notifications.length > 0 && (
                                <div className="notif-list-foot">That's everything</div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedNotification && (
                <NotificationDetailModal 
                    notification={selectedNotification}
                    onClose={handleCloseDetail}
                />
            )}
        </>
    );
}
