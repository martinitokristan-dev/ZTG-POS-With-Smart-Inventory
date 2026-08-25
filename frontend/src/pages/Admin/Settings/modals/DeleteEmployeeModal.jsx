import React, { useState } from 'react';

export default function DeleteEmployeeModal({ isOpen, onClose, employee, onConfirm }) {
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen || !employee) return null;

    const handleConfirm = async () => {
        setSubmitting(true);
        try {
            await onConfirm(employee);
            onClose();
        } catch (err) {
            // error handled in caller
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div 
            className="modal-overlay" 
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 99999,
                padding: '16px'
            }}
            onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
        >
            <div 
                className="modal-card" 
                style={{
                    maxWidth: '440px',
                    width: '100%',
                    background: 'var(--bg-card, #FFFFFF)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    border: '1px solid var(--border, #E2E8F0)',
                    animation: 'modalScaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
            >
                {/* Header */}
                <div style={{
                    position: 'relative',
                    padding: '28px 24px 20px 24px',
                    background: 'var(--danger-light, #FEF2F2)',
                    borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: '12px'
                }}>
                    {/* Fixed X Close Button */}
                    <button 
                        type="button" 
                        disabled={submitting}
                        onClick={onClose}
                        aria-label="Close"
                        style={{
                            position: 'absolute',
                            top: '14px',
                            right: '14px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-secondary, #64748B)',
                            padding: '6px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.15s ease'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.06)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>

                    {/* Trash Danger Icon */}
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '2px solid var(--danger, #EF4444)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--danger, #EF4444)'
                    }}>
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </div>

                    <div>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '700', color: 'var(--danger, #EF4444)' }}>
                            Delete Staff Account
                        </h3>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary, #64748B)' }}>
                            This action will permanently remove this employee from the database.
                        </p>
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: '24px' }}>
                    <div style={{
                        background: 'var(--danger-light, #FEF2F2)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        borderRadius: '10px',
                        padding: '14px 16px',
                        fontSize: '13px',
                        color: 'var(--danger, #DC2626)',
                        lineHeight: 1.55,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px'
                    }}>
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: '2px' }}>
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>
                            <strong>Warning:</strong> Deleting this staff member completely purges their login credentials, account access, and profile records. <em>This action cannot be undone.</em>
                        </span>
                    </div>
                </div>

                {/* Footer Actions */}
                <div style={{
                    padding: '16px 24px',
                    background: 'var(--bg-secondary, #F8FAFC)',
                    borderTop: '1px solid var(--border, #E2E8F0)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '10px'
                }}>
                    <button
                        type="button"
                        disabled={submitting}
                        onClick={onClose}
                        className="btn btn-secondary"
                        style={{
                            padding: '9px 18px',
                            fontSize: '13px',
                            fontWeight: 600,
                            borderRadius: '8px'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={submitting}
                        onClick={handleConfirm}
                        className="btn btn-danger"
                        style={{
                            padding: '9px 20px',
                            fontSize: '13px',
                            fontWeight: 600,
                            borderRadius: '8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        {submitting ? (
                            'Deleting...'
                        ) : (
                            <>
                                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                                Delete Permanently
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
