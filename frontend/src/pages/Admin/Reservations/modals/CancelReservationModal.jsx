import React from 'react';

export default function CancelReservationModal({
    isOpen, onClose, onSubmit, selected,
    cancelReason, setCancelReason, cancelLoading, fmt
}) {
    if (!isOpen || !selected) return null;

    return (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal-card" style={{ maxWidth: '400px' }}>
                <div className="modal-header" style={{ background: 'var(--danger)', borderBottom: 'none' }}>
                    <h3 className="modal-title" style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: 600 }}>Cancel Reservation</h3>
                </div>
                <div className="modal-body">
                    <p style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '16px' }}>
                        Are you sure you want to cancel this reservation? The deposited amount will be archived as returned.
                    </p>
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Refundable Deposit:</span>
                        <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)' }}>{fmt(selected.deposit)}</span>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Reason for Cancellation (Optional)</label>
                        <textarea className="form-control" placeholder="Enter reason..." value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} style={{ minHeight: '70px', resize: 'vertical', fontSize: '13px' }} />
                    </div>
                </div>
                <div className="modal-footer" style={{ justifyContent: 'flex-end', gap: '12px' }}>
                    <button className="btn btn-secondary" onClick={onClose}>Keep Reservation</button>
                    <button className="btn btn-danger" onClick={onSubmit} disabled={cancelLoading}>
                        {cancelLoading ? 'Cancelling...' : 'Yes, Cancel Order'}
                    </button>
                </div>
            </div>
        </div>
    );
}
