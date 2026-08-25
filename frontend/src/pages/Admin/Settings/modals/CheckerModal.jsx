import React from 'react';

export default function CheckerModal({ 
    isOpen, showCheckerModal,
    onClose, setShowCheckerModal, 
    selectedChecker, checkerForm, setCheckerForm, 
    onSubmit, handleCheckerSubmit 
}) {
    const isVisible = isOpen ?? showCheckerModal;
    const handleClose = () => {
        if (onClose) onClose();
        if (setShowCheckerModal) setShowCheckerModal(false);
    };
    const handleSubmit = onSubmit || handleCheckerSubmit;

    if (!isVisible) return null;

    return (
        <div className="modal-overlay" style={{ display: 'flex' }}>
            <div className="modal-card" style={{ maxWidth: '400px' }}>
                <form onSubmit={handleSubmit}>
                    <div className="modal-header">
                        <h3 className="modal-title">{selectedChecker ? 'Edit Checker' : 'Add Checker'}</h3>
                        <button type="button" className="modal-close" onClick={handleClose}>
                            <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'none', stroke: 'currentColor', strokeWidth: '2' }}>
                                <path d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="form-group">
                            <label className="form-label">Checker Name</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                value={checkerForm?.name || ''}
                                onChange={e => setCheckerForm({...checkerForm, name: e.target.value})}
                                required
                            />
                        </div>
                        
                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select 
                                className="form-control"
                                value={checkerForm?.status || 'Active'}
                                onChange={e => setCheckerForm({...checkerForm, status: e.target.value})}
                            >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                            {checkerForm.status === 'Inactive' && (
                                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                                    Inactive checkers will no longer appear in the POS dropdown, but their names will remain visible in past transaction logs.
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="modal-footer" style={{ padding: '12px 20px' }}>
                        <button type="button" className="btn btn-secondary" onClick={handleClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Save Checker</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
