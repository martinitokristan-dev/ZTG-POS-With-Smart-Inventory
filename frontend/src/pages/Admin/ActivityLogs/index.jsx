import React from 'react';
import useActivityLogs from './hooks/useActivityLogs';
import ActiveSessionsView from './views/ActiveSessionsView';
import ActivityTrailView from './views/ActivityTrailView';
import AbnormalAlertsView from './views/AbnormalAlertsView';
import ForceLogoutModal from './modals/ForceLogoutModal';
import ActivityDetailsModal from './modals/ActivityDetailsModal';

export default function ActivityLogs() {
    const {
        activeTab,
        setActiveTab,
        sessions,
        sessionsLoading,
        logs,
        logsLoading,
        pagination,
        search,
        setSearch,
        moduleFilter,
        setModuleFilter,
        roleFilter,
        setRoleFilter,
        severityFilter,
        setSeverityFilter,
        statusFilter,
        setStatusFilter,
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
    } = useActivityLogs();

    return (
        <div className="activity-logs-embedded-wrap" style={{ width: '100%' }}>
            {/* Sleek Sub-Tab Switcher (No Cards) */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', flexWrap: 'wrap' }}>
                <button
                    type="button"
                    onClick={() => setActiveTab('sessions')}
                    className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
                    style={{
                        padding: '7px 16px',
                        borderRadius: '8px',
                        fontSize: '12.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.15s ease',
                    }}
                >
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }}></span>
                    <span>Active Sessions ({sessions.length})</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('trail')}
                    className={`tab-btn ${activeTab === 'trail' ? 'active' : ''}`}
                    style={{
                        padding: '7px 16px',
                        borderRadius: '8px',
                        fontSize: '12.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.15s ease',
                    }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                    </svg>
                    <span>Activity Audit Trail</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('alerts')}
                    className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
                    style={{
                        padding: '7px 16px',
                        borderRadius: '8px',
                        fontSize: '12.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.15s ease',
                    }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <span>Security Alerts & Anomalies</span>
                </button>
            </div>

            {/* Active Sub-Tab View */}
            {activeTab === 'sessions' && (
                <ActiveSessionsView
                    sessions={sessions}
                    loading={sessionsLoading}
                    onForceLogout={(sess) => {
                        setTargetSession(sess);
                        setForceLogoutModalOpen(true);
                    }}
                    onRefresh={() => {
                        fetchSessions();
                        fetchSummary();
                    }}
                />
            )}

            {activeTab === 'trail' && (
                <ActivityTrailView
                    logs={logs}
                    loading={logsLoading}
                    pagination={pagination}
                    search={search}
                    setSearch={setSearch}
                    moduleFilter={moduleFilter}
                    setModuleFilter={setModuleFilter}
                    roleFilter={roleFilter}
                    setRoleFilter={setRoleFilter}
                    severityFilter={severityFilter}
                    setSeverityFilter={setSeverityFilter}
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                    fromDate={fromDate}
                    setFromDate={setFromDate}
                    toDate={toDate}
                    setToDate={setToDate}
                    onPageChange={(p) => fetchLogs(p)}
                    onViewDetails={(log) => {
                        setSelectedLog(log);
                        setDetailsModalOpen(true);
                    }}
                    onResetFilters={resetFilters}
                />
            )}

            {activeTab === 'alerts' && (
                <AbnormalAlertsView
                    logs={logs}
                    loading={logsLoading}
                    onViewDetails={(log) => {
                        setSelectedLog(log);
                        setDetailsModalOpen(true);
                    }}
                    onRefresh={() => {
                        fetchLogs(1);
                        fetchSummary();
                    }}
                />
            )}

            {/* Modals */}
            <ForceLogoutModal
                isOpen={forceLogoutModalOpen}
                onClose={() => {
                    setForceLogoutModalOpen(false);
                    setTargetSession(null);
                }}
                session={targetSession}
                onConfirm={confirmForceLogout}
                isProcessing={isRevoking}
            />

            <ActivityDetailsModal
                isOpen={detailsModalOpen}
                onClose={() => {
                    setDetailsModalOpen(false);
                    setSelectedLog(null);
                }}
                log={selectedLog}
            />
        </div>
    );
}
