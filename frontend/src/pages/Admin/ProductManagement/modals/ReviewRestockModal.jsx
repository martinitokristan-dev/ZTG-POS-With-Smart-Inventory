import React from 'react';
import useMobileSheet from '../../../../shared/useMobileSheet';

export default function ReviewRestockModal({
    isOpen, onClose, onConfirm,
    products, restockQuantities,
    restockItemsCount, restockUnitsCount,
    restockVerifiedBy, restockDate, restockTime,
    errorMessage,
    DEFAULT_PLACEHOLDER_IMAGE,
    isSubmitting = false,
}) {
    const { sheetRef, dragHandleProps } = useMobileSheet({ onClose });

    if (!isOpen) return null;

    const restockItems = products.filter(p => (restockQuantities[p.id] || 0) > 0);

    return (
        <div className="modal-overlay" style={{ zIndex: 999 }}>
            <div ref={sheetRef} className="modal-card" style={{ maxWidth: '820px', width: '94%', backgroundColor: 'var(--bg-card)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', border: '1px solid var(--border)' }}>
                
                {/* Header */}
                <div {...dragHandleProps} className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', touchAction: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'var(--success-light)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)', flexShrink: 0 }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>Review Restock Order</h3>
                            <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>Verify items, quantities, and supervisor approval before completing restock.</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} disabled={isSubmitting} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'none', stroke: 'currentColor', strokeWidth: '2' }}>
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '72vh', overflowY: 'auto' }}>
                    
                    {errorMessage && (
                        <div style={{ backgroundColor: 'var(--danger-light)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: 'none', stroke: 'var(--danger)', strokeWidth: 2, flexShrink: 0 }}>
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    {/* Restock Items Table */}
                    <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'var(--bg-card)' }}>
                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            <table className="modal-table data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ backgroundColor: 'var(--table-header-bg)', borderBottom: '2px solid var(--table-border)', fontSize: '13px', fontWeight: '600', color: 'var(--table-text-secondary)', letterSpacing: '0.02em' }}>
                                        <th style={{ padding: '12px 16px' }}>Product</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Current Stock</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Adding Qty</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>New Stock</th>
                                    </tr>
                                </thead>
                                <tbody style={{ fontSize: '15px' }}>
                                    {restockItems.map(p => {
                                        const adding = restockQuantities[p.id] || 0;
                                        return (
                                            <tr key={p.id} style={{ borderBottom: '1px solid var(--table-border-subtle)', minHeight: '48px' }}>
                                                <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <img 
                                                        src={p.image || p.parent?.image || p.parent_product?.image || DEFAULT_PLACEHOLDER_IMAGE} 
                                                        alt={p.name}
                                                        style={{ width: '42px', height: '42px', borderRadius: '10px', objectFit: 'cover', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', flexShrink: 0 }}
                                                        onError={(e) => { e.target.src = DEFAULT_PLACEHOLDER_IMAGE; }} 
                                                    />
                                                    <div>
                                                        <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--table-text-primary)', display: 'block', lineHeight: '1.3' }}>{p.name}</span>
                                                        {p.chinese_name && <span style={{ fontSize: '12px', color: 'var(--table-text-secondary)', fontWeight: '500', display: 'block', marginTop: '2px' }}>{p.chinese_name}</span>}
                                                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--table-text-secondary)', display: 'block', marginTop: '3px', fontVariantNumeric: 'tabular-nums' }}>PART NO: {p.part_no}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '15px', fontWeight: '600', color: 'var(--table-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                                                    {p.stock} units
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                    <span style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.3)', padding: '4px 10px', borderRadius: '20px', fontWeight: '600', fontSize: '13px', display: 'inline-block', fontVariantNumeric: 'tabular-nums' }}>
                                                        +{adding}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '15px', fontWeight: '600', color: 'var(--table-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                                                    {p.stock + adding} units
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Summary Card */}
                    <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                Total Items to Restock: <span style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '13.5px' }}>{restockItemsCount}</span>
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                Supervisor / Admin: <span style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '13.5px' }}>{restockVerifiedBy}</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'right' }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                Total Units Added: <span style={{ color: 'var(--success)', fontWeight: '800', fontSize: '13.5px' }}>+{restockUnitsCount} units</span>
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                Date &amp; Time: <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{restockDate}, {restockTime}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="modal-footer" style={{ padding: '16px 24px', backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button 
                        type="button" 
                        onClick={onClose} 
                        disabled={isSubmitting}
                        style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)', padding: '9.5px 20px', borderRadius: '8px', fontSize: '13.5px', fontWeight: '600', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                    >
                        Cancel
                    </button>
                    <button 
                        type="button" 
                        onClick={onConfirm} 
                        disabled={isSubmitting}
                        style={{ 
                            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', 
                            color: '#FFFFFF', 
                            border: 'none', 
                            padding: '9.5px 22px', 
                            borderRadius: '8px', 
                            fontSize: '13.5px', 
                            fontWeight: '700', 
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            opacity: isSubmitting ? 0.7 : 1,
                            boxShadow: '0 4px 12px rgba(5,150,105,0.25)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        {isSubmitting ? (
                            <>
                                <span style={{ width: '14px', height: '14px', border: '2px solid #FFF', borderRightColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.75s linear infinite' }}></span>
                                Restocking Items...
                            </>
                        ) : (
                            <>
                                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Confirm & Restock
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
