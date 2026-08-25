import React from 'react';

/**
 * ActivityDetailsModal Component
 * Formatted with clear, plain-language descriptions for POS store operators.
 * Completely hides raw developer payloads, JSON blobs, and complex user-agent strings.
 */
export default function ActivityDetailsModal({ isOpen, onClose, log }) {
    if (!isOpen || !log) return null;

    const user = log.user;
    const userName = user ? (user.full_name || user.profile?.full_name || user.username || user.name) : 'System / Automated';
    const userRole = user?.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'System';

    // Format action nicely
    const formatAction = (action) => {
        if (!action) return 'General Activity';
        return action
            .replace(/_/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
    };

    // Format date nicely
    const formattedDate = log.created_at 
        ? new Date(log.created_at).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        })
        : '—';

    const isFailedOrWarning = log.status === 'Abnormal' || log.status === 'Failed' || log.severity === 'warning' || log.severity === 'critical';

    return (
        <div className="modal-overlay" style={{ 
            zIndex: 1050, 
            position: 'fixed', 
            inset: 0, 
            backgroundColor: 'rgba(15, 23, 42, 0.65)', 
            backdropFilter: 'blur(4px)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '16px'
        }}>
            <div className="modal-content" style={{ 
                maxWidth: '520px', 
                width: '100%', 
                padding: '0', 
                borderRadius: '16px', 
                overflow: 'hidden', 
                backgroundColor: '#FFFFFF', 
                border: '1px solid #E2E8F0',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Header */}
                <div style={{ 
                    padding: '18px 24px', 
                    borderBottom: '1px solid #E2E8F0', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    backgroundColor: '#FFFFFF'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                            width: '38px', 
                            height: '38px', 
                            borderRadius: '10px', 
                            backgroundColor: log.severity === 'critical' ? '#FEE2E2' : isFailedOrWarning ? '#FEF3C7' : '#EFF6FF', 
                            color: log.severity === 'critical' ? '#DC2626' : isFailedOrWarning ? '#D97706' : '#2563EB', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            flexShrink: 0 
                        }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="16" x2="12" y2="12"></line>
                                <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                        </div>
                        <div>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: '#0F172A' }}>
                                Activity Log Details
                            </h3>
                            <span style={{ fontSize: '12px', color: '#64748B' }}>
                                {formattedDate}
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{ 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer', 
                            color: '#94A3B8', 
                            padding: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        aria-label="Close"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '20px 24px', maxHeight: '65vh', overflowY: 'auto', backgroundColor: '#FFFFFF' }}>
                    {/* Activity Summary Card */}
                    <div style={{ 
                        padding: '14px 16px', 
                        borderRadius: '12px', 
                        backgroundColor: '#F8FAFC', 
                        border: '1px solid #E2E8F0', 
                        marginBottom: '18px' 
                    }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                            Activity Summary
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#0F172A', lineHeight: '1.45' }}>
                            {log.description}
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
                        <div>
                            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', display: 'block', marginBottom: '3px', textTransform: 'uppercase' }}>
                                Staff / User
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', display: 'block' }}>
                                {userName}
                            </span>
                            <span style={{ fontSize: '11.5px', color: '#64748B', display: 'block', marginTop: '1px' }}>
                                Role: {userRole}
                            </span>
                        </div>

                        <div>
                            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', display: 'block', marginBottom: '3px', textTransform: 'uppercase' }}>
                                Action Type
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', display: 'block' }}>
                                {formatAction(log.action)}
                            </span>
                            <span style={{ fontSize: '11.5px', color: '#64748B', display: 'block', marginTop: '1px' }}>
                                Section: {log.module || 'System'}
                            </span>
                        </div>

                        <div>
                            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', display: 'block', marginBottom: '3px', textTransform: 'uppercase' }}>
                                Network Address
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>
                                {log.ip_address || '—'}
                            </span>
                        </div>

                        <div>
                            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', display: 'block', marginBottom: '3px', textTransform: 'uppercase' }}>
                                Status & Severity
                            </span>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                                <span style={{ 
                                    fontSize: '11px', 
                                    fontWeight: '700', 
                                    padding: '2px 8px', 
                                    borderRadius: '6px', 
                                    backgroundColor: log.status === 'Success' ? '#ECFDF5' : log.status === 'Abnormal' ? '#FEF2F2' : '#FFFBEB', 
                                    color: log.status === 'Success' ? '#059669' : log.status === 'Abnormal' ? '#DC2626' : '#D97706' 
                                }}>
                                    {log.status || 'Recorded'}
                                </span>
                                {log.severity && (
                                    <span style={{ 
                                        fontSize: '11px', 
                                        fontWeight: '700', 
                                        padding: '2px 8px', 
                                        borderRadius: '6px', 
                                        backgroundColor: log.severity === 'critical' ? '#FEE2E2' : '#F1F5F9', 
                                        color: log.severity === 'critical' ? '#DC2626' : '#475569' 
                                    }}>
                                        {log.severity.toUpperCase()}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Device Card */}
                    <div>
                        <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                            Device & Platform
                        </span>
                        <div style={{ 
                            padding: '10px 14px', 
                            borderRadius: '8px', 
                            backgroundColor: '#F8FAFC', 
                            border: '1px solid #E2E8F0', 
                            fontSize: '12.5px', 
                            color: '#0F172A', 
                            fontWeight: '600' 
                        }}>
                            {log.device || 'Standard Desktop / Mobile Browser'}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ 
                    padding: '14px 24px', 
                    borderTop: '1px solid #E2E8F0', 
                    display: 'flex', 
                    justifyContent: 'flex-end', 
                    backgroundColor: '#F8FAFC' 
                }}>
                    <button 
                        type="button" 
                        className="btn btn-secondary btn-sm" 
                        onClick={onClose} 
                        style={{ padding: '7px 20px', fontWeight: '600', fontSize: '13px', borderRadius: '8px', cursor: 'pointer' }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
