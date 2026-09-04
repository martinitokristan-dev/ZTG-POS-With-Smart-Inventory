import React, { useEffect } from 'react';

export default function BrandModal({
    isOpen,
    onClose,
    selectedBrand,
    brandName,
    setBrandName,
    brandDescription,
    setBrandDescription,
    brandStatus,
    setBrandStatus,
    onSubmit,
    submitting = false
}) {
    if (!isOpen) return null;

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'Enter') {
                if (document.activeElement && document.activeElement.tagName === 'TEXTAREA') return;
                e.preventDefault();
                const btn = document.getElementById('submitBrandBtn');
                if (btn) btn.click();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const submitLabel = submitting 
        ? (selectedBrand ? 'Updating Brand...' : 'Saving Brand...') 
        : (selectedBrand ? 'Update Brand' : 'Save Brand');

    return (
        <div className="modal-overlay" id="brandModal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
            <div className="modal-card" style={{ width: '100%', maxWidth: '460px', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <form onSubmit={onSubmit} className="no-float">
                    <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', padding: '16px 20px', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h3 className="modal-title" style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                            {selectedBrand ? 'Edit Brand' : 'Add Brand'}
                        </h3>
                        <button type="button" onClick={onClose} className="modal-close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                            <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: 'none', stroke: 'currentColor', strokeWidth: '2' }}>
                                <path d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="modal-body no-float" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-card)' }}>
                        {/* Brand Name */}
                        <div className="form-group no-float" style={{ margin: 0 }}>
                            <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                Brand Name <span style={{ color: 'var(--danger)' }}>*</span>
                            </label>
                            <input 
                                type="text" 
                                required 
                                autoFocus
                                value={brandName}
                                onChange={(e) => setBrandName(e.target.value)}
                                className="form-control"
                                style={{ height: '42px', fontSize: '13.5px', width: '100%', borderRadius: '8px' }}
                                placeholder="e.g. HOWO, WEICHAI, Cummins"
                            />
                        </div>

                        {/* Description */}
                        <div className="form-group no-float" style={{ margin: 0 }}>
                            <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                Description <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'none' }}>(Optional)</span>
                            </label>
                            <textarea 
                                value={brandDescription || ''}
                                onChange={(e) => setBrandDescription(e.target.value)}
                                className="form-control"
                                rows="3"
                                style={{ fontSize: '13.5px', width: '100%', borderRadius: '8px', padding: '10px 12px', resize: 'vertical' }}
                                placeholder="Short notes or manufacturer details..."
                            />
                        </div>

                        {/* Status */}
                        <div className="form-group no-float" style={{ margin: 0 }}>
                            <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                Status
                            </label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {['Active', 'Inactive'].map((st) => {
                                    const isSelected = brandStatus === st;
                                    return (
                                        <button
                                            key={st}
                                            type="button"
                                            onClick={() => setBrandStatus(st)}
                                            style={{
                                                flex: 1,
                                                padding: '10px',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                fontWeight: 600,
                                                border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                                                background: isSelected ? 'var(--primary-light)' : 'var(--bg-secondary)',
                                                color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            {st}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '14px 20px', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button 
                            type="button" 
                            onClick={onClose} 
                            disabled={submitting}
                            className="btn btn-secondary" 
                            style={{ height: '40px', padding: '0 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            id="submitBrandBtn"
                            disabled={submitting || !brandName.trim()} 
                            className="btn btn-primary" 
                            style={{ height: '40px', padding: '0 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}
                        >
                            {submitLabel}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
