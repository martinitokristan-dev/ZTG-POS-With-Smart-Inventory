import { useState, useEffect, useCallback } from 'react';
import api from '../../../../shared/api';
import { showToast } from '../../../../utils/toast';

export default function useActivityLogs() {
    // Active Tab: 'sessions' | 'trail' | 'alerts'
    const [activeTab, setActiveTab] = useState('sessions');

    // Summary Metrics
    const [summary, setSummary] = useState({
        total_today: 0,
        abnormal_alerts: 0,
        active_sessions: 0,
        failed_logins_today: 0,
    });
    const [summaryLoading, setSummaryLoading] = useState(true);

    // Active Sessions State
    const [sessions, setSessions] = useState([]);
    const [sessionsLoading, setSessionsLoading] = useState(true);

    // Activity Trail State
    const [logs, setLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(true);
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
        per_page: 20,
    });

    // Filters
    const [search, setSearch] = useState('');
    const [moduleFilter, setModuleFilter] = useState('All');
    const [actionFilter, setActionFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [roleFilter, setRoleFilter] = useState('All');
    const [severityFilter, setSeverityFilter] = useState('All');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    // Modals
    const [forceLogoutModalOpen, setForceLogoutModalOpen] = useState(false);
    const [targetSession, setTargetSession] = useState(null);
    const [isRevoking, setIsRevoking] = useState(false);

    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);

    // Fetch Summary Metrics
    const fetchSummary = useCallback(async () => {
        try {
            const res = await api.get('/activity-logs/summary');
            setSummary(res.data || {});
        } catch {
            // Silently ignore or show cached
        } finally {
            setSummaryLoading(false);
        }
    }, []);

    // Fetch Active Sessions
    const fetchSessions = useCallback(async () => {
        setSessionsLoading(true);
        try {
            const res = await api.get('/activity-logs/active-sessions');
            setSessions(res.data?.sessions || []);
        } catch {
            showToast('Failed to load active sessions', 'error');
        } finally {
            setSessionsLoading(false);
        }
    }, []);

    // Fetch Activity Logs Trail
    const fetchLogs = useCallback(async (page = 1) => {
        setLogsLoading(true);
        try {
            const params = {
                page,
                per_page: 20,
                search: search.trim() || undefined,
                module: moduleFilter !== 'All' ? moduleFilter : undefined,
                action: actionFilter !== 'All' ? actionFilter : undefined,
                status: statusFilter !== 'All' ? statusFilter : undefined,
                role: roleFilter !== 'All' ? roleFilter : undefined,
                severity: severityFilter !== 'All' ? severityFilter : undefined,
                from_date: fromDate || undefined,
                to_date: toDate || undefined,
            };

            const res = await api.get('/activity-logs', { params });
            setLogs(res.data?.data || []);
            setPagination({
                current_page: res.data?.current_page || 1,
                last_page: res.data?.last_page || 1,
                total: res.data?.total || 0,
                per_page: res.data?.per_page || 20,
            });
        } catch {
            showToast('Failed to load activity logs', 'error');
        } finally {
            setLogsLoading(false);
        }
    }, [search, moduleFilter, actionFilter, statusFilter, roleFilter, severityFilter, fromDate, toDate]);

    // Initial Load & Tab Switching
    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    useEffect(() => {
        if (activeTab === 'sessions') {
            fetchSessions();
        } else {
            fetchLogs(1);
        }
    }, [activeTab, fetchSessions, fetchLogs]);

    // Perform Force Logout
    const confirmForceLogout = async () => {
        if (!targetSession) return;
        setIsRevoking(true);
        try {
            const res = await api.post(`/activity-logs/active-sessions/${targetSession.token_id}/revoke`);
            showToast(res.data?.message || 'Session terminated successfully', 'success');
            setForceLogoutModalOpen(false);
            setTargetSession(null);
            fetchSessions();
            fetchSummary();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to terminate session', 'error');
        } finally {
            setIsRevoking(false);
        }
    };

    // Reset all filters
    const resetFilters = () => {
        setSearch('');
        setModuleFilter('All');
        setActionFilter('All');
        setStatusFilter('All');
        setRoleFilter('All');
        setSeverityFilter('All');
        setFromDate('');
        setToDate('');
    };

    return {
        activeTab,
        setActiveTab,
        summary,
        summaryLoading,
        sessions,
        sessionsLoading,
        logs,
        logsLoading,
        pagination,
        search,
        setSearch,
        moduleFilter,
        setModuleFilter,
        actionFilter,
        setActionFilter,
        statusFilter,
        setStatusFilter,
        roleFilter,
        setRoleFilter,
        severityFilter,
        setSeverityFilter,
        fromDate,
        setFromDate,
        toDate,
        setToDate,
        forceLogoutModalOpen,
        setForceLogoutModalOpen,
        targetSession,
        setTargetSession,
        isRevoking,
        detailsModalOpen,
        setDetailsModalOpen,
        selectedLog,
        setSelectedLog,
        fetchSessions,
        fetchLogs,
        fetchSummary,
        confirmForceLogout,
        resetFilters,
    };
}
