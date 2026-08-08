import React from 'react';

export default function ViewProductModal({
    showViewModal, setShowViewModal,
    selectedProduct
}) {
    if (!showViewModal || !selectedProduct) return null;

    return (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowViewModal(false); }}>
            <div className="modal-card" style={{ maxWidth: '850px', width: '95%' }}>
                <div className="modal-header">
                    <h3 className="modal-title">Product Specs: {selectedProduct.name}</h3>
                    <button type="button" className="modal-close" onClick={() => setShowViewModal(false)}>
                        <svg viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
                <div className="modal-body">
                    <div style={{ background: 'var(--primary-light)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px', padding: '18px', marginBottom: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px 20px' }}>
                            {[
                                { label: 'English Name', value: selectedProduct.name },
                                { label: 'Chinese Name', value: selectedProduct.chinese_name || 'N/A' },
                                { label: 'Part No. (Base)', value: selectedProduct.part_no, mono: true },
                                { label: 'Category', value: selectedProduct.category?.name || 'Unassigned' },
                                { label: 'Warehouse Location', value: selectedProduct.address || 'N/A' },
                                { label: 'Status', value: selectedProduct.status || 'Active' },
                                { label: 'Stock Level', value: `${selectedProduct.stock} units (Alert ≤ ${selectedProduct.alert_limit || 5})` },
                                { label: 'Sales Counter', value: `${selectedProduct.sales_count || 0} units sold` },
                                { label: 'Original Price', value: `₱${(selectedProduct.price1 || 0).toLocaleString()}` },
                                { label: 'Retail Price', value: `₱${(selectedProduct.price2 || 0).toLocaleString()}` },
                                { label: 'Damaged / Scrap', value: `${selectedProduct.damaged || 0} units` },
                                { label: 'Dead Stock', value: selectedProduct.is_dead_stock ? 'Yes' : 'No' },
                            ].map(({ label, value, mono }) => (
                                <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ color: 'var(--primary)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px', fontFamily: mono ? 'var(--font-mono)' : undefined }}>{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                        <div>
                            <div className="modal-section-title">Associated SKUs &amp; Variants ({selectedProduct.variants.length})</div>
                            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th style={{ padding: '9px 12px' }}>Part No.</th>
                                            <th style={{ padding: '9px 12px' }}>Variant</th>
                                            <th style={{ padding: '9px 12px', textAlign: 'center' }}>Stock</th>
                                            <th style={{ padding: '9px 12px', textAlign: 'right' }}>Orig. Price</th>
                                            <th style={{ padding: '9px 12px', textAlign: 'right' }}>Retail Price</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedProduct.variants.map((v, idx) => {
                                            const variantOptionText = v.variant_options?.map(o => o.value).join(', ') || v.variantOptions?.map(o => o.value).join(', ') || '—';
                                            const sc = v.stock === 0 ? 'var(--danger)' : (v.stock <= (v.alert_limit || 5) ? 'var(--warning)' : 'var(--success)');
                                            const sb = v.stock === 0 ? 'var(--danger-light)' : (v.stock <= (v.alert_limit || 5) ? 'var(--warning-light)' : 'var(--success-light)');
                                            return (
                                                <tr key={v.id} style={{ background: idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-secondary)' }}>
                                                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '12px' }}>{v.part_no}</td>
                                                    <td style={{ padding: '10px 12px' }}>{variantOptionText}</td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                        <span style={{ background: sb, color: sc, padding: '3px 10px', borderRadius: '9999px', fontWeight: 700, fontSize: '11px' }}>{v.stock}</span>
                                                    </td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>₱{(v.price1 || 0).toLocaleString()}</td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>₱{(v.price2 || 0).toLocaleString()}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowViewModal(false)}>Close</button>
                </div>
            </div>
        </div>
    );
}
