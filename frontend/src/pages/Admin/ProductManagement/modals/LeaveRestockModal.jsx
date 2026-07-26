import React from 'react';
import useMobileSheet from '../../../../shared/useMobileSheet';

export default function LeaveRestockModal({ isOpen, onClose, onSaveDraft, onDiscard }) {
    const { sheetRef, dragHandleProps } = useMobileSheet({ onClose });

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{ zIndex: 999 }}>
            <div ref={sheetRef} className="modal-card" style={{ maxWidth: '420px', width: '90%', backgroundColor: '#FFFFFF', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.18)', border: '1px solid #E2E8F0' }}>
                
                {/* Header */}
                <div {...dragHandleProps} style={{ padding: '20px 24px 16px 24px', position: 'relative', textAlign: 'center', borderBottom: '1px solid #F1F5F9', backgroundColor: '#F8FAFC', touchAction: 'none' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0F172A', fontFamily: '"Outfit", sans-serif', textAlign: 'center' }}>
                        Leave Restock?
                    </h3>
                    <button type="button" onClick={onClose} style={{ position: 'absolute', right: '16px', top: '16px', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: 'none', stroke: 'currentColor', strokeWidth: '2' }}>
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748B', fontWeight: '500', lineHeight: '1.5', textAlign: 'center' }}>
                        You have restock changes in progress. Save them as a draft to continue later, or discard them entirely.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                        <button
                            type="button"
                            onClick={onSaveDraft}
                            style={{ width: '100%', padding: '11px', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '13.5px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(5,150,105,0.2)' }}
                        >
                            Save Changes
                        </button>
                        <button
                            type="button"
                            onClick={onDiscard}
                            style={{ width: '100%', padding: '11px', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: '8px', fontSize: '13.5px', fontWeight: '700', cursor: 'pointer' }}
                        >
                            Discard Changes
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{ width: '100%', padding: '8px', backgroundColor: 'transparent', color: '#64748B', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                        >
                            Keep Editing
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
