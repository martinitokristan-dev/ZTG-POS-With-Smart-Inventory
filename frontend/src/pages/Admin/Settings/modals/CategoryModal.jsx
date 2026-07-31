import React, { useEffect } from 'react';

export default function CategoryModal({
    showCategoryModal, setShowCategoryModal,
    selectedCategory, categoryName, setCategoryName,
    categoryVariants, setCategoryVariants, getOptionsForType,
    handleCategorySubmit, categorySubmitting = false
}) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (showCategoryModal && e.key === 'Enter') {
                if (document.activeElement && document.activeElement.tagName === 'TEXTAREA') return;
                // prevent default to avoid double firing if focused on the form input
                e.preventDefault();
                const btn = document.getElementById('submitCategoryBtn');
                if (btn) btn.click();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showCategoryModal]);

    if (!showCategoryModal) return null;

    const submitLabel = categorySubmitting 
        ? (selectedCategory ? 'Updating Category...' : 'Saving Category...') 
        : (selectedCategory ? 'Update Category' : 'Save Category');

    const toggleVariant = (key) => {
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
        { key: 'color', title: 'Color', typeName: 'Color' }
    ];

    return (
        <div className="modal-overlay" id="addCategoryModal" style={{ display: 'flex', zIndex: 1000, background: 'rgba(15, 23, 42, 0.6)' }}>
            <style>
                {`
                .variant-selector-card { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border: 1px solid var(--border, #e2e8f0); border-radius: 8px; cursor: pointer; transition: all 0.15s ease; user-select: none; margin-bottom: 8px; }
                .variant-selector-card:hover { border-color: var(--primary, #2563eb); background: var(--primary-light, #eff6ff); }
                .variant-selector-card:has(input:checked) { border-color: var(--primary, #2563eb); background: var(--primary-light, #eff6ff); box-shadow: 0 0 0 1px var(--primary, #2563eb); }
                .variant-card-info { display: flex; flex-direction: column; gap: 2px; }
                .variant-card-title { font-size: 13px; font-weight: 700; color: var(--text-primary, #1e293b); }
                .variant-card-desc { font-size: 11px; color: var(--text-secondary, #64748b); }
                .variant-card-indicator { width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--border, #e2e8f0); display: flex; align-items: center; justify-content: center; background: #ffffff; transition: all 0.15s ease; position: relative; }
                .variant-selector-card:has(input:checked) .variant-card-indicator { border-color: var(--primary, #2563eb); background: var(--primary, #2563eb); }
                .variant-selector-card:has(input:checked) .variant-card-indicator::after { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #ffffff; }
                `}
            </style>
            <div className="modal-card" style={{ maxWidth: '460px', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', margin: 'auto' }}>
                <form onSubmit={handleCategorySubmit}>
                    <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', padding: '18px 24px', background: 'var(--bg-card)' }}>
                        <h3 className="modal-title" style={{ fontSize: '15px', fontWeight: 700 }}>
                            {selectedCategory ? 'Edit Category' : 'Add Category'}
                        </h3>
                        <button type="button" onClick={() => setShowCategoryModal(false)} className="modal-close">
                            <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: 'none', stroke: 'currentColor', strokeWidth: '2' }}>
                                <path d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="modal-body" style={{ padding: '24px' }}>
                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label className="form-label" style={{ fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '6px' }}>Category Name <span style={{ color: 'var(--danger, #dc2626)' }}>*</span></label>
                            <input 
                                type="text" 
                                required 
                                value={categoryName}
                                onChange={(e) => setCategoryName(e.target.value)}
                                className="form-control"
                                style={{ height: '42px', fontSize: '13px' }}
                                placeholder="e.g. Apparel, Electronics"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" style={{ fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '8px' }}>Assign Variant Types <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>(select up to 2)</span></label>
                            {variantsList.map(v => {
                                const currentVars = categoryVariants || [];
                                const isSelected = currentVars.includes(v.key);
                                const options = getOptionsForType ? getOptionsForType(v.typeName) : [];
                                const optionsText = options.length > 0 ? `${options.length} options defined` : `no options defined`;
                                
                                return (
                                    <label key={v.key} className="variant-selector-card">
                                        <input type="checkbox" className="cat-var-check" style={{ display: 'none' }} checked={isSelected} onChange={() => toggleVariant(v.key)} />
                                        <div className="variant-card-info">
                                            <span className="variant-card-title">{v.title}</span>
                                            <span className="variant-card-desc">({optionsText})</span>
                                        </div>
                                        <div className="variant-card-indicator"></div>
                                    </label>
                                );
                            })}
                            {(categoryVariants || []).length >= 2 && (
                                <p style={{ fontSize: '11px', color: 'var(--warning, #f59e0b)', marginTop: '10px', fontWeight: 600, background: '#fffbeb', border: '1px solid #fef3c7', padding: '8px 12px', borderRadius: '6px' }}>
                                    ⚠ Maximum 2 variant types per category.
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-main)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button type="button" onClick={() => setShowCategoryModal(false)} className="btn btn-secondary" disabled={categorySubmitting}>Cancel</button>
                        <button id="submitCategoryBtn" type="submit" className="btn btn-primary" disabled={categorySubmitting}>
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
