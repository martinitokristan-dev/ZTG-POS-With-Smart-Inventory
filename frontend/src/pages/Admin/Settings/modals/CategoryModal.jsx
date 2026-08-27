import React, { useEffect } from 'react';

export default function CategoryModal({
    isOpen, showCategoryModal,
    onClose, setShowCategoryModal,
    selectedCategory, categoryName, setCategoryName,
    categoryVariants, setCategoryVariants, getOptionsForType,
    onSubmit, handleCategorySubmit,
    submitting, categorySubmitting = false
}) {
    const isVisible = isOpen ?? showCategoryModal;
    const handleClose = () => {
        if (onClose) onClose();
        if (setShowCategoryModal) setShowCategoryModal(false);
    };
    const handleSubmit = onSubmit || handleCategorySubmit;
    const isSubmitting = submitting ?? categorySubmitting;

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (isVisible && e.key === 'Enter') {
                if (document.activeElement && document.activeElement.tagName === 'TEXTAREA') return;
                // prevent default to avoid double firing if focused on the form input
                e.preventDefault();
                const btn = document.getElementById('submitCategoryBtn');
                if (btn) btn.click();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isVisible]);

    if (!isVisible) return null;

    const submitLabel = isSubmitting 
        ? (selectedCategory ? 'Updating Category...' : 'Saving Category...') 
        : (selectedCategory ? 'Update Category' : 'Save Category');

    const toggleVariant = (key) => {
        if (!setCategoryVariants) return;
        setCategoryVariants(prev => {
            const current = prev || [];
            if (current.includes(key)) return current.filter(k => k !== key);
            if (current.length >= 2) return current; // Max 2 selections
            return [...current, key];
        });
    };

    const variantsList = [
        { key: 'size', title: 'Size', typeName: 'Size' },
        { key: 'quality', title: 'Quality', typeName: 'Quality' },
        { key: 'color', title: 'Color', typeName: 'Color' },
        { key: 'specification', title: 'Specification', typeName: 'Specification' },
        { key: 'material', title: 'Material', typeName: 'Material' }
    ];

    return (
        <div className="modal-overlay" id="addCategoryModal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
            <style>
                {`
                .category-modal-card { width: 100%; max-width: 460px; border-radius: 12px; overflow: hidden; box-shadow: var(--shadow-lg); background: var(--bg-card); border: 1px solid var(--border); }
                .cat-variant-card { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border: 1px solid var(--border); border-radius: 8px; cursor: pointer; transition: all 0.15s ease; user-select: none; margin-bottom: 8px; background: var(--bg-secondary); }
                .cat-variant-card:hover { border-color: var(--primary); background: var(--primary-light); }
                .cat-variant-card.selected { border-color: var(--primary); background: var(--primary-light); box-shadow: 0 0 0 1px var(--primary); }
                .cat-variant-info { display: flex; flex-direction: column; gap: 2px; }
                .cat-variant-title { font-size: 13px; font-weight: 700; color: var(--text-primary); }
                .cat-variant-desc { font-size: 11.5px; color: var(--text-secondary); }
                .cat-variant-indicator { width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--border); display: flex; align-items: center; justify-content: center; background: var(--bg-card); transition: all 0.15s ease; flex-shrink: 0; }
                .cat-variant-card.selected .cat-variant-indicator { border-color: var(--primary); background: var(--primary); }
                .cat-variant-card.selected .cat-variant-indicator::after { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #ffffff; }
                `}
            </style>
            <div className="modal-card category-modal-card">
                <form onSubmit={handleSubmit} className="no-float">
                    <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', padding: '16px 20px', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h3 className="modal-title" style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                            {selectedCategory ? 'Edit Category' : 'Add Category'}
                        </h3>
                        <button type="button" onClick={handleClose} className="modal-close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                            <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: 'none', stroke: 'currentColor', strokeWidth: '2' }}>
                                <path d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="modal-body no-float" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px', background: 'var(--bg-card)' }}>
                        
                        {/* Category Name */}
                        <div className="form-group no-float" style={{ margin: 0 }}>
                            <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                Category Name <span style={{ color: 'var(--danger)' }}>*</span>
                            </label>
                            <input 
                                type="text" 
                                required 
                                value={categoryName}
                                onChange={(e) => setCategoryName(e.target.value)}
                                className="form-control"
                                style={{ height: '42px', fontSize: '13.5px', width: '100%', borderRadius: '8px' }}
                                placeholder="e.g. Apparel, Electronics"
                            />
                        </div>

                        {/* Assign Variant Types */}
                        <div className="form-group no-float" style={{ margin: 0 }}>
                            <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                                Assign Variant Types <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>(select up to 2)</span>
                            </label>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {variantsList.map(v => {
                                    const currentVars = categoryVariants || [];
                                    const isSelected = currentVars.includes(v.key);
                                    const options = getOptionsForType ? getOptionsForType(v.typeName) : [];
                                    const optionsText = options.length > 0 ? `${options.length} options defined` : `no options defined`;
                                    
                                    return (
                                        <div 
                                            key={v.key} 
                                            className={`cat-variant-card ${isSelected ? 'selected' : ''}`}
                                            onClick={() => toggleVariant(v.key)}
                                        >
                                            <div className="cat-variant-info">
                                                <span className="cat-variant-title">{v.title}</span>
                                                <span className="cat-variant-desc">({optionsText})</span>
                                            </div>
                                            <div className="cat-variant-indicator"></div>
                                        </div>
                                    );
                                })}
                            </div>

                            {(categoryVariants || []).length >= 2 && (
                                <div style={{ fontSize: '11.5px', color: '#D97706', marginTop: '10px', fontWeight: 600, background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '8px 12px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', fill: 'none', stroke: 'currentColor', strokeWidth: 2, flexShrink: 0 }}><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                                    <span>Maximum 2 variant types per category.</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="modal-footer" style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-main)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button type="button" onClick={handleClose} className="btn btn-secondary" disabled={isSubmitting}>Cancel</button>
                        <button id="submitCategoryBtn" type="submit" className="btn btn-primary" disabled={isSubmitting}>
                            {categorySubmitting ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: '13px', height: '13px', borderWidth: '2px' }}></span>
                                    {submitLabel}
                                </span>
                            ) : (
                                submitLabel
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
