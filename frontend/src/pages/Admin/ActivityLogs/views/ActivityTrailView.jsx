import React from 'react';
import LoadingSpinner from '../../../../shared/components/LoadingSpinner';
import IOSSelect from '../../../../shared/components/IOSSelect';
import IOSDatePicker from '../../../../shared/components/IOSDatePicker';

export default function ActivityTrailView({
    logs,
    loading,
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
    onPageChange,
    onViewDetails,
    onResetFilters,
}) {
    return (
        <div>
            {/* Filter Bar */}
            <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', padding: '16px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Top Row: Search & Dropdowns */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', alignItems: 'center' }}>
                    {/* Search Input */}
                    <div style={{ position: 'relative' }}>
                        <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--text-muted)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Search description, user, IP…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ paddingLeft: '36px', fontSize: '13px' }}
                        />
                    </div>

                    {/* Role Filter */}
                    <div>
                        <IOSSelect
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            options={[
                                { value: 'All', label: 'All Roles' },
                                { value: 'Admin', label: 'Admin Only' },
                                { value: 'Cashier', label: 'Cashier Only' },
                            ]}
                        />
                    </div>

                    {/* Module Filter */}
                    <div>
                        <IOSSelect
                            value={moduleFilter}
                            onChange={(e) => setModuleFilter(e.target.value)}
                            options={[
                                { value: 'All', label: 'All Modules' },
                                { value: 'Auth', label: 'Auth & Login' },
                                { value: 'Security', label: 'Security & Lockouts' },
                                { value: 'Settings', label: 'Settings' },
                                { value: 'Employees', label: 'Employees' },
                                { value: 'Inventory', label: 'Inventory' },
                                { value: 'POS', label: 'POS' },
                            ]}
                        />
                    </div>

                    {/* Severity Filter */}
                    <div>
                        <IOSSelect
                            value={severityFilter}
                            onChange={(e) => setSeverityFilter(e.target.value)}
                            options={[
                                { value: 'All', label: 'All Severities' },
                                { value: 'info', label: 'Info / Standard' },
                                { value: 'warning', label: 'Warning' },
                                { value: 'critical', label: 'Critical' },
                                { value: 'abnormal', label: 'Abnormal Only' },
                            ]}
                        />
                    </div>
                </div>

                {/* Bottom Row: Date Range & Reset */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>FROM:</span>
                            <IOSDatePicker
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                placeholder="Start Date"
                                style={{ width: '150px' }}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>TO:</span>
                            <IOSDatePicker
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                placeholder="End Date"
                                style={{ width: '150px' }}
                                alignRight={true}
                            />
                        </div>
                    </div>

                    <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={onResetFilters}
                        style={{ fontSize: '11.5px', padding: '4px 12px' }}
                    >
                        Reset Filters
                    </button>
                </div>
            </div>

            {/* Table or Loading */}
            {loading ? (
                <LoadingSpinner text="Loading audit logs..." minHeight="300px" />
            ) : logs.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ margin: '0 auto 12px' }}>
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px' }}>No Activity Logs Found</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>No records match your filter criteria.</p>
                </div>
            ) : (
                <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', margin: 0 }}>
                            <thead>
                                <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                    <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>Timestamp</th>
                                    <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>User</th>
                                    <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>Action / Module</th>
                                    <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>Description</th>
                                    <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>Device & IP</th>
                                    <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>Status</th>
                                    <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', textAlign: 'right' }}>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => {
                                    const u = log.user;
                                    const uName = u ? (u.profile?.full_name || u.username) : 'Guest / System';
                                    const isAbnormal = log.status === 'Abnormal' || log.severity === 'critical';

                                    return (
                                        <tr key={log.id} style={{ borderBottom: '1px solid var(--border)', backgroundColor: isAbnormal ? 'rgba(239, 68, 68, 0.03)' : 'transparent' }}>
                                            {/* Timestamp */}
                                            <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                <div>{new Date(log.created_at).toLocaleDateString()}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                                            </td>

                                            {/* User */}
                                            <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                                <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '13px' }}>{uName}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{u?.role || 'Unauthenticated'}</div>
                                            </td>

                                            {/* Action / Module */}
                                            <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                                <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '12.5px' }}>{log.action}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{log.module}</div>
                                            </td>

                                            {/* Description */}
                                            <td style={{ padding: '12px 16px', maxWidth: '300px' }}>
                                                <div style={{ fontSize: '12.5px', color: 'var(--text-primary)', lineHeight: '1.45', fontWeight: isAbnormal ? '600' : 'normal' }}>
                                                    {log.description}
                                                </div>
                                            </td>

                                            {/* Device & IP */}
                                            <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>{log.device || 'Unknown'}</div>
                                                <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{log.ip_address || '—'}</div>
                                            </td>

                                            {/* Status Badge */}
                                            <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                                <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '12px', backgroundColor: log.status === 'Success' ? '#ECFDF5' : isAbnormal ? '#FEF2F2' : '#FFFBEB', color: log.status === 'Success' ? '#059669' : isAbnormal ? '#DC2626' : '#D97706', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    {isAbnormal && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#DC2626' }}></span>}
                                                    {log.status}
                                                </span>
                                            </td>

                                            {/* View Details Action */}
                                            <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => onViewDetails(log)}
                                                    className="btn btn-secondary btn-sm"
                                                    style={{ fontSize: '11px', padding: '4px 10px', fontWeight: '600' }}
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Bar */}
                    {pagination.last_page > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                Page {pagination.current_page} of {pagination.last_page} ({pagination.total} total events)
                            </span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    disabled={pagination.current_page <= 1}
                                    onClick={() => onPageChange(pagination.current_page - 1)}
                                    style={{ fontSize: '11.5px', padding: '4px 10px' }}
                                >
                                    Previous
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    disabled={pagination.current_page >= pagination.last_page}
                                    onClick={() => onPageChange(pagination.current_page + 1)}
                                    style={{ fontSize: '11.5px', padding: '4px 10px' }}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
