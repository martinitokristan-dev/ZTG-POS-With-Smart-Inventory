import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../shared/api';
import echo from '../lib/echo';
import { NOTIFICATION_POLL_INTERVAL_MS, REALTIME_DEBOUNCE_POLL_MS, NOTIFICATION_BUBBLE_DISPLAY_MS, NOTIFICATION_PAGE_SIZE } from '../config/constants';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

/** Parse a backend date (UTC, possibly without timezone suffix) into a ms timestamp, never in the future. */
const parseNotifDate = (dateVal) => {
    if (!dateVal) return Date.now();
    if (typeof dateVal === 'number') return dateVal;
    let str = String(dateVal).trim();
    if (str.includes(' ') && !str.includes('T')) {
        str = str.replace(' ', 'T');
    }
    // Append Z if string has no explicit timezone offset so JavaScript parses as UTC
    if (!str.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(str)) {
        str += 'Z';
    }
    const parsed = new Date(str);
    if (isNaN(parsed.getTime())) return Date.now();
    return Math.min(parsed.getTime(), Date.now());
};

/** Map a raw API notification into the shape the UI uses. */
const mapNotification = (n) => ({
    id: n.id,
    type: n.type || 'system',
    sub_type: n.sub_type,
    title: n.title,
    message: n.message,
    timestamp: parseNotifDate(n.created_at || n.timestamp),
    read: n.is_read || n.read || false,
    link: n.link || null,
    product_id: n.product_id || null,
    transaction_id: n.transaction_id || null
});

const byNewest = (a, b) => b.timestamp - a.timestamp;

/** Only Admin and Supervisor receive notifications. */
const getNotifUser = () => {
    const token = (sessionStorage.getItem('auth_token') ?? localStorage.getItem('auth_token'));
    if (!token) return null;
    const userStr = (sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'));
    let user = null;
    try { user = userStr ? JSON.parse(userStr) : null; } catch { /* corrupt storage */ }
    return user && ['Admin', 'Supervisor'].includes(user.role) ? user : null;
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0); // Server total, not just the loaded rows
    const [hasMore, setHasMore] = useState(false);      // Older notifications exist on the server
    const [loadingMore, setLoadingMore] = useState(false);
    const [bubbleNotif, setBubbleNotif] = useState(null); // The one notification shown in the pop-up bubble
    const optimisticTimestamps = useRef({});
    const pollTimer = useRef(null);
    const seenIds = useRef(new Set()); // IDs already seen on first load — never bubble these
    const initialLoad = useRef(true);
    const bubbleTimer = useRef(null);
    const loadingMoreRef = useRef(false); // Synchronous guard against double "load more" calls
    const loadedOlderPages = useRef(false); // True once the user scrolled past the first page
    // Newest id of the last polled page. Rows from that id down are a gap-free run;
    // realtime pushes are not counted, because they can skip rows.
    const pageTopId = useRef(null);
    const lastMarkAt = useRef(0); // When the user last marked something read (badge race guard)

    const showBubble = useCallback((notif) => {
        // Only show 1 bubble at a time; clear any existing timer
        if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
        setBubbleNotif(notif);
        bubbleTimer.current = setTimeout(() => {
            setBubbleNotif(null);
        }, NOTIFICATION_BUBBLE_DISPLAY_MS);
    }, []);

    const dismissBubble = useCallback(() => {
        if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
        setBubbleNotif(null);
    }, []);

    /**
     * Refresh the newest page. Older pages the user already scrolled to are kept while
     * the new page still connects to them, so polling never collapses the list back to 20 rows.
     */
    const fetchNotifications = useCallback(async () => {
        // Skip fetch entirely when not authenticated or if not Admin/Supervisor
        if (!getNotifUser()) {
            setNotifications([]);
            setUnreadCount(0);
            setHasMore(false);
            return;
        }

        const fetchStart = Date.now();
        try {
            const res = await api.get('/notifications', { params: { per_page: NOTIFICATION_PAGE_SIZE } });
            const body = res.data || {};
            const mappedNotifs = (Array.isArray(body) ? body : (body.data || [])).map(mapNotification);
            const pageHasMore = Boolean(body.has_more);
            const fetchedIds = mappedNotifs.map(n => n.id);
            const oldestFetchedId = fetchedIds.length > 0 ? Math.min(...fetchedIds) : null;
            const newestFetchedId = fetchedIds.length > 0 ? Math.max(...fetchedIds) : null;

            // The rows we already hold continue this page only if the page reaches down to them.
            // After a burst (more new rows than one page) there is a hole between the two that
            // loadMore could never fill, so the older rows are dropped and paging restarts.
            const reachesLoadedRows = pageTopId.current !== null
                && oldestFetchedId !== null
                && oldestFetchedId <= pageTopId.current;
            const keepOlderRows = pageHasMore && reachesLoadedRows;
            pageTopId.current = newestFetchedId;

            // A mark-read that happened while this request was in flight is newer than its count.
            if (lastMarkAt.current < fetchStart) {
                setUnreadCount(Number(body.unread_count ?? mappedNotifs.filter(n => !n.read).length));
            }
            if (!pageHasMore) {
                // Everything fits on one page now, so nothing older exists.
                loadedOlderPages.current = false;
                setHasMore(false);
            } else if (!keepOlderRows) {
                // Older rows were dropped (or never loaded): the next page starts below this one.
                loadedOlderPages.current = false;
                setHasMore(true);
            }
            // Otherwise the user paged back and loadMore owns has_more for the oldest page.

            setNotifications(prev => {
                // Merge respecting optimistic timestamps
                const newMap = new Map(mappedNotifs.map(n => [n.id, n]));

                prev.forEach(existing => {
                    if (newMap.has(existing.id)) return;
                    // Rows older than this page came from "load more"; keep them while they connect.
                    const isOlderPage = keepOlderRows && existing.id < oldestFetchedId;
                    // Rows pushed in realtime after this request was answered.
                    const isNewerPush = newestFetchedId !== null && existing.id > newestFetchedId;
                    if (isOlderPage || isNewerPush) {
                        newMap.set(existing.id, existing);
                    }
                    // Anything else inside this page's range was deleted on the server
                    // (e.g. an auto-resolved low-stock alert), so it is dropped.
                });

                // Add existing items if they have a newer optimistic timestamp
                prev.forEach(existing => {
                    const optTime = optimisticTimestamps.current[existing.id];
                    if (optTime && optTime > fetchStart && newMap.has(existing.id)) {
                        newMap.set(existing.id, existing); // Override with local optimistic state
                    }
                });

                const merged = Array.from(newMap.values()).sort(byNewest);

                if (initialLoad.current) {
                    // On first load, mark everything as "already seen" — no bubbles
                    merged.forEach(n => seenIds.current.add(n.id));
                    initialLoad.current = false;
                } else {
                    // Find new unseen notifications and bubble the newest unread one
                    const newUnseen = merged.filter(n => !seenIds.current.has(n.id) && !n.read);
                    newUnseen.forEach(n => seenIds.current.add(n.id));
                    if (newUnseen.length > 0) {
                        showBubble(newUnseen[0]); // Show only the first/newest
                    }
                }

                return merged;
            });
        } catch (err) {
            if (err.response?.status !== 401) {
                console.error("Failed to load notifications:", err);
            }
        }
    }, [showBubble]);

    const schedulePoll = useCallback((delay = NOTIFICATION_POLL_INTERVAL_MS) => { // 15 seconds fallback for responsive UI
        if (pollTimer.current) clearTimeout(pollTimer.current);
        pollTimer.current = setTimeout(() => {
            fetchNotifications().finally(() => schedulePoll());
        }, delay);
    }, [fetchNotifications]);

    useEffect(() => {
        fetchNotifications().finally(() => schedulePoll(NOTIFICATION_POLL_INTERVAL_MS));

        const token = (sessionStorage.getItem('auth_token') ?? localStorage.getItem('auth_token'));
        const userStr = (sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'));
        let channel = null;

        if (token && userStr) {
            const user = JSON.parse(userStr);
            if (['Admin', 'Supervisor'].includes(user.role)) {
                channel = echo.private('notifications')
                    .listen('.NotificationSent', (e) => {
                        if (!e?.notification?.id) return;
                        // Same shape as polled rows, so "View" links work on realtime pushes too.
                        const newNotification = mapNotification(e.notification);
                        // Side effects stay outside the state updater (StrictMode may run updaters twice).
                        if (!seenIds.current.has(newNotification.id)) {
                            seenIds.current.add(newNotification.id);
                            if (!newNotification.read) {
                                showBubble(newNotification); // Bubble real-time push notifications immediately
                                setUnreadCount(c => c + 1);
                            }
                        }
                        setNotifications(prev => (
                            prev.some(n => n.id === newNotification.id)
                                ? prev
                                : [newNotification, ...prev].sort(byNewest)
                        ));
                    });
            }
        }

        return () => {
            if (pollTimer.current) clearTimeout(pollTimer.current);
            if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
            if (channel) {
                echo.leaveChannel('private-notifications');
            }
        };
    }, [fetchNotifications, schedulePoll, showBubble]);

    const debouncePoll = () => {
        schedulePoll(REALTIME_DEBOUNCE_POLL_MS);
    };

    /**
     * Load the next page of older notifications (infinite scroll).
     * Uses the oldest loaded id as a keyset cursor, so new arrivals never shift pages.
     */
    const loadMore = useCallback(async () => {
        if (loadingMoreRef.current || !hasMore || notifications.length === 0 || !getNotifUser()) return;

        loadingMoreRef.current = true;
        setLoadingMore(true);
        try {
            const beforeId = Math.min(...notifications.map(n => n.id));
            const res = await api.get('/notifications', {
                params: { per_page: NOTIFICATION_PAGE_SIZE, before_id: beforeId }
            });
            const body = res.data || {};
            const older = (body.data || []).map(mapNotification);

            // Older rows were never "new", so they must never trigger a bubble.
            older.forEach(n => seenIds.current.add(n.id));
            loadedOlderPages.current = true;
            setHasMore(Boolean(body.has_more));
            setNotifications(prev => {
                const map = new Map(prev.map(n => [n.id, n]));
                older.forEach(n => { if (!map.has(n.id)) map.set(n.id, n); });
                return Array.from(map.values()).sort(byNewest);
            });
        } catch (err) {
            if (err.response?.status !== 401) {
                console.error("Failed to load older notifications:", err);
            }
        } finally {
            loadingMoreRef.current = false;
            setLoadingMore(false);
        }
    }, [hasMore, notifications]);

    const markAsRead = async (id) => {
        const previousState = [...notifications];
        const previousUnread = unreadCount;
        const wasUnread = notifications.some(n => n.id === id && !n.read);
        const now = Date.now();
        optimisticTimestamps.current[id] = now;
        lastMarkAt.current = now;

        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        if (wasUnread) setUnreadCount(c => Math.max(0, c - 1));

        try {
            await api.patch(`/notifications/${id}/read`);
            // Polls that started before the server saved this are stale too.
            lastMarkAt.current = Date.now();
            debouncePoll();
        } catch (err) {
            console.error("Failed to mark as read:", err);
            setNotifications(previousState);
            setUnreadCount(previousUnread);
            delete optimisticTimestamps.current[id];
        }
    };

    const markAllRead = async () => {
        const previousState = [...notifications];
        const previousUnread = unreadCount;
        setUnreadCount(0);
        const now = Date.now();
        lastMarkAt.current = now;

        setNotifications(prev => {
            const next = prev.map(n => {
                optimisticTimestamps.current[n.id] = now;
                return { ...n, read: true };
            });
            return next;
        });

        try {
            await api.post('/notifications/read-all');
            // Polls that started before the server saved this are stale too.
            lastMarkAt.current = Date.now();
            debouncePoll();
        } catch (err) {
            console.error("Failed to mark all as read:", err);
            setNotifications(previousState);
            setUnreadCount(previousUnread);
            previousState.forEach(n => delete optimisticTimestamps.current[n.id]);
        }
    };

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            hasMore,
            loadingMore,
            loadMore,
            markAsRead,
            markAllRead,
            refetch: fetchNotifications,
            bubbleNotif,
            dismissBubble,
        }}>
            {children}
        </NotificationContext.Provider>
    );
};
