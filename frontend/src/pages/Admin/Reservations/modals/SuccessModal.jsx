import React from 'react';

export default function SuccessModal({
    isOpen, onClose, successData, fmt, fmtDate
}) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal-card" style={{ maxWidth: '480px' }}>
                <div className="modal-body" style={{ textAlign: 'center', padding: '40px 32px' }}>
                    <div style={{ width: '64px', height: '64px', background: 'var(--success-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <svg viewBox="0 0 24 24" style={{ width: '32px', height: '32px', fill: 'none', stroke: 'var(--success)', strokeWidth: 2.5 }}>
                            <path d="M20 6L9 17l-5-5"/>
                        </svg>
                    </div>
                    <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                        {successData?.status?.value === 'Completed' || successData?.status === 'Completed' ? 'Order Fulfilled!' : 'Order Created!'}
                    </h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                        {successData?.status?.value === 'Completed' || successData?.status === 'Completed'
                            ? 'The reservation has been fulfilled and inventory updated.'
                            : `Reservation for ${successData?.customer?.name || successData?.customer_name || 'customer'} has been created successfully.`}
                    </p>
                    {successData && (
                        <div style={{ background: '#F8FAFC', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
                            {[
                                ['Order No.', successData.order_no || `RS-${String(successData.id).padStart(3, '0')}`],
                                ['Total', fmt(successData.total)],
                                ['Deposit', fmt(successData.deposit)],
                                ['Pickup Date', fmtDate(successData.pickup_date)],
                            ].map(([l, v]) => (
                                <div key={l} className="info-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                    <span className="info-label" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{l}</span>
                                    <span className="info-value" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{v}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <button className="btn btn-primary" style={{ width: '100%' }} onClick={onClose}>Done</button>
                </div>
            </div>
        </div>
    );
}
