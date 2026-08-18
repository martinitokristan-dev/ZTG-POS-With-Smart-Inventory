import React from 'react';

export default function SuccessModal({
    isOpen, onClose, successData, fmt, fmtDate, onPrintCR
}) {
    if (!isOpen) return null;

    const isCompleted = successData?.status?.value === 'Completed' || successData?.status === 'Completed';

    return (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal-card" style={{ maxWidth: '480px' }}>
                <div className="modal-body" style={{ textAlign: 'center', padding: '36px 28px' }}>
                    <div style={{ width: '60px', height: '60px', background: 'var(--success-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <svg viewBox="0 0 24 24" style={{ width: '30px', height: '30px', fill: 'none', stroke: 'var(--success)', strokeWidth: 2.5 }}>
                            <path d="M20 6L9 17l-5-5"/>
                        </svg>
                    </div>
                    <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                        {isCompleted ? 'Order Fulfilled!' : 'Order Created!'}
                    </h3>
                    <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                        {isCompleted
                            ? 'The order has been fulfilled and balance payment collected.'
                            : `Reservation for ${successData?.customer?.name || successData?.customer_name || 'customer'} has been created successfully.`}
                    </p>
                    {successData && (
                        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px 16px', marginBottom: '20px', textAlign: 'left' }}>
                            {[
                                ['Customer', successData?.customer?.name || successData?.customer_name || '—'],
                                !isCompleted ? ['Deposit C.R. No.', successData?.deposit_cr_no || '—'] : null,
                                isCompleted ? ['Final C.R. No.', successData?.si_no || successData?.order_no || '—'] : null,
                                ['Total Amount', fmt(successData.total)],
                                ['Deposit Paid', fmt(successData.deposit)],
                                isCompleted ? ['Balance Collected', fmt(Math.max(0, Number(successData.total || 0) - Number(successData.deposit || 0)))] : null,
                                !isCompleted ? ['Pickup Date', fmtDate(successData.pickup_date)] : null,
                            ].filter(Boolean).map(([l, v]) => (
                                <div key={l} className="info-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                    <span className="info-label" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{l}</span>
                                    <span className="info-value" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{v}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {onPrintCR && (
                            <button 
                                className="btn btn-primary" 
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '11px 16px', fontWeight: '700' }} 
                                onClick={() => { onPrintCR(successData); }}
                            >
                                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                                    <rect x="6" y="14" width="12" height="8"></rect>
                                </svg>
                                {isCompleted ? 'Print Final Collection Receipt (C.R.)' : 'Print Deposit Collection Receipt (C.R.)'}
                            </button>
                        )}
                        <button 
                            className="btn btn-secondary" 
                            style={{ width: '100%', padding: '10px 16px', fontWeight: '600' }} 
                            onClick={onClose}
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
