import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../shared/api';
import echo from '../lib/echo';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [bubbleNotif, setBubbleNotif] = useState(null); // The one notification shown in the pop-up bubble
    const optimisticTimestamps = useRef({});
    const pollTimer = useRef(null);
    const seenIds = useRef(new Set()); // IDs already seen on first load — never bubble these
    const initialLoad = useRef(true);
    const bubbleTimer = useRef(null);

    const showBubble = useCallback((notif) => {
        // Only show 1 bubble at a time; clear any existing timer
        if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
        setBubbleNotif(notif);
        bubbleTimer.current = setTimeout(() => {
            setBubbleNotif(null);
        }, 3000);
    }, []);

    const dismissBubble = useCallback(() => {
        if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
        setBubbleNotif(null);
    }, []);

    const fetchNotifications = useCallback(async () => {
        // Skip fetch entirely when not authenticated or if not Admin/Supervisor
        const token = (sessionStorage.getItem('auth_token') ?? localStorage.getItem('auth_token'));
        if (!token) return;

        const userStr = (sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'));
        let user = null;
        try { user = userStr ? JSON.parse(userStr) : null; } catch {}
        if (!user || !['Admin', 'Supervisor'].includes(user.role)) {
            setNotifications([]);
            return;
        }

        const fetchStart = Date.now();
        try {
            const res = await api.get('/notifications');
            const notifs = Array.isArray(res.data) ? res.data : (res.data?.data || []);

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
                let parsed = new Date(str);
                if (isNaN(parsed.getTime())) return Date.now();
                let ts = parsed.getTime();
                return Math.min(ts, Date.now());
            };

            const mappedNotifs = notifs.map(n => ({
                id: n.id,
                type: n.type || 'system',
                sub_type: n.sub_type,
                title: n.title,
                message: n.message,
                timestamp: parseNotifDate(n.created_at || n.timestamp),
                read: n.is_read || n.read || false
            }));

            setNotifications(prev => {
                // Merge respecting optimistic timestamps
                const newMap = new Map(mappedNotifs.map(n => [n.id, n]));

                // Add existing items if they have a newer optimistic timestamp
                prev.forEach(existing => {
                    const optTime = optimisticTimestamps.current[existing.id];
                    if (optTime && optTime > fetchStart) {
                        newMap.set(existing.id, existing); // Override with local optimistic state
                    }
                });

                const merged = Array.from(newMap.values()).sort((a, b) => b.timestamp - a.timestamp);

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

    const schedulePoll = useCallback((delay = 15000) => { // 15 seconds fallback for responsive UI
        if (pollTimer.current) clearTimeout(pollTimer.current);
        pollTimer.current = setTimeout(() => {
            fetchNotifications().finally(() => schedulePoll());
        }, delay);
    }, [fetchNotifications]);

    useEffect(() => {
        fetchNotifications().finally(() => schedulePoll(15000));

        const token = (sessionStorage.getItem('auth_token') ?? localStorage.getItem('auth_token'));
        const userStr = (sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'));
        let channel = null;

        if (token && userStr) {
            const user = JSON.parse(userStr);
            if (['Admin', 'Supervisor'].includes(user.role)) {
                channel = echo.private('notifications')
                    .listen('.NotificationSent', (e) => {
                        setNotifications(prev => {
                            if (prev.some(n => n.id === e.notification.id)) {
                                return prev;
                            }
                            const newNotification = {
                                ...e.notification,
                                timestamp: new Date(e.notification.timestamp).getTime()
                            };
                            // Bubble real-time push notifications immediately
                            if (!seenIds.current.has(newNotification.id)) {
                                seenIds.current.add(newNotification.id);
                                if (!newNotification.read) {
                                    showBubble(newNotification);
                                }
                            }
                            return [newNotification, ...prev].sort((a, b) => b.timestamp - a.timestamp);
                        });
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
        schedulePoll(5000);
    };

    const markAsRead = async (id) => {
        const previousState = [...notifications];
        const now = Date.now();
        optimisticTimestamps.current[id] = now;

        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

        try {
            await api.patch(`/notifications/${id}/read`);
            debouncePoll();
        } catch (err) {
            console.error("Failed to mark as read:", err);
            setNotifications(previousState);
            delete optimisticTimestamps.current[id];
        }
    };

    const markAllRead = async () => {
        const previousState = [...notifications];
        const now = Date.now();

        setNotifications(prev => {
            const next = prev.map(n => {
                optimisticTimestamps.current[n.id] = now;
                return { ...n, read: true };
            });
            return next;
        });

        try {
            await api.post('/notifications/read-all');
            debouncePoll();
        } catch (err) {
            console.error("Failed to mark all as read:", err);
            setNotifications(previousState);
            previousState.forEach(n => delete optimisticTimestamps.current[n.id]);
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
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
