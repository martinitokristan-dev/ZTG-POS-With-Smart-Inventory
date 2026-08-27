import React from 'react';
import CopyableText from '../../../../shared/components/CopyableText';

export default function ViewProductModal({ isOpen, onClose, product, categories = [] }) {
    if (!isOpen || !product) return null;

    const variants = product.variants || [];
    const hasVariants = variants.length > 0;

    const categoryName = product.category?.name 
        || (categories && categories.find(c => Number(c.id) === Number(product.category_id))?.name)
        || 'N/A';

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center transition-opacity" onClick={onClose}>
            <div 
                className="modal-card bg-white flex flex-col shadow-2xl relative" 
                style={{ maxWidth: '850px', width: '95%', borderRadius: '16px', maxHeight: '90vh' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="modal-header flex justify-between items-center px-6 py-5 border-b border-slate-100">
                    <h3 className="modal-title text-[18px] font-bold text-slate-800 m-0">
                        Product Details: {product.name}
                    </h3>
                    <button 
                        type="button" 
                        onClick={onClose} 
                        style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748B', lineHeight: '1', padding: '0 8px' }}
                    >
                        &times;
                    </button>
                </div>
                
                <div className="modal-body p-6 flex flex-col gap-4 text-[14px] text-slate-800 overflow-y-auto" style={{ maxHeight: '650px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px 20px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '18px', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ color: '#2563EB', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>English Name</span>
                            <span style={{ fontWeight: '600', color: '#1E293B', fontSize: '15px', minHeight: '20px', display: 'inline-block' }}>{product.name}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ color: '#2563EB', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Chinese Name</span>
                            <span style={{ fontWeight: '600', color: '#1E293B', fontSize: '15px', minHeight: '20px', display: 'inline-block' }}>{product.chinese_name || 'N/A'}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ color: '#2563EB', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</span>
                            <span style={{ fontWeight: '500', color: '#334155', fontSize: '15px', minHeight: '20px', display: 'inline-block' }}>{categoryName}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ color: '#2563EB', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Warehouse Location</span>
                            <span style={{ fontWeight: '500', color: '#334155', fontSize: '15px', minHeight: '20px', display: 'inline-block' }}>{product.address || 'N/A'}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ color: '#2563EB', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Part No. (Base)</span>
                            <CopyableText text={product.part_no} label="Part No." codeStyle={{ fontSize: '15px' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ color: '#2563EB', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</span>
                            <span style={{ fontWeight: '600', color: product.status === 'Active' || !product.status ? '#16A34A' : '#EF4444', fontSize: '15px', minHeight: '20px', display: 'inline-block' }}>{product.status || 'Active'}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ color: '#2563EB', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Stock Level</span>
                            <span style={{ fontWeight: '700', color: product.stock === 0 ? '#EF4444' : product.stock <= (product.alert_limit||5) ? '#F59E0B' : '#1E293B', fontSize: '15px', minHeight: '20px', display: 'inline-block' }}>{product.stock} {product.uom ? product.uom.replace(/^.*\/\s*/, '') : 'units'}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ color: '#2563EB', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Damaged Count</span>
                            <span style={{ fontWeight: '500', color: (product.damaged||0) > 0 ? '#EF4444' : '#334155', fontSize: '15px', minHeight: '20px', display: 'inline-block' }}>{product.damaged || 0}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ color: '#2563EB', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Original Price</span>
                            <span style={{ fontWeight: '700', color: '#1E293B', fontSize: '15px', minHeight: '20px', display: 'inline-block' }}>₱{(parseFloat(product.price1) || 0).toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ color: '#2563EB', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Retail Price</span>
                            <span style={{ fontWeight: '700', color: '#3B82F6', fontSize: '15px', minHeight: '20px', display: 'inline-block' }}>₱{(parseFloat(product.price2) || 0).toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ color: '#2563EB', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dead Stock</span>
                            <span style={{ fontWeight: '500', color: '#334155', fontSize: '15px', minHeight: '20px', display: 'inline-block' }}>{product.is_dead_stock ? 'Yes' : 'No'}</span>
                        </div>
                    </div>

                    {hasVariants && (
                        <div style={{ marginTop: '14px' }}>
                            <h4 style={{ fontWeight: '700', marginBottom: '10px', color: '#3B82F6', fontSize: '13px', letterSpacing: '0.3px', margin: '0 0 10px 0' }}>
                                Associated SKUs &amp; Variants ({variants.length})
                            </h4>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', border: '1px solid #E2E8F0', borderRadius: '6px', overflow: 'hidden', display: 'table' }}>
                                <thead>
                                    <tr style={{ background: '#F1F5F9', borderBottom: '2px solid #E2E8F0' }}>
                                        <th style={{ padding: '9px 12px', color: '#64748B', fontSize: '11px', letterSpacing: '0.5px', textAlign: 'left' }}>PART NO.</th>
                                        <th style={{ padding: '9px 12px', color: '#64748B', fontSize: '11px', letterSpacing: '0.5px', textAlign: 'left' }}>VARIANT</th>
                                        <th style={{ padding: '9px 12px', color: '#64748B', fontSize: '11px', letterSpacing: '0.5px', textAlign: 'center' }}>STOCK</th>
                                        <th style={{ padding: '9px 12px', color: '#64748B', fontSize: '11px', letterSpacing: '0.5px', textAlign: 'right' }}>ORIG. PRICE</th>
                                        <th style={{ padding: '9px 12px', color: '#64748B', fontSize: '11px', letterSpacing: '0.5px', textAlign: 'right' }}>RETAIL PRICE</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {variants.map((v, idx) => {
                                        const vStockColor = v.stock === 0 ? '#EF4444' : (v.stock <= (v.alert_limit || 5) ? '#F59E0B' : '#22C55E');
                                        const vStockBg = v.stock === 0 ? '#FEE2E2' : (v.stock <= (v.alert_limit || 5) ? '#FEF3C7' : '#DCFCE7');
                                        const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
                                        const varLabel = v.variant_options ? v.variant_options.map(opt => opt.value).join(', ') : 'Variant';
                                        
                                        return (
                                            <tr key={v.id} style={{ borderBottom: '1px solid #F1F5F9', background: rowBg }}>
                                                <td style={{ padding: '10px 12px' }}>
                                                    <CopyableText text={v.part_no} label="Part No." />
                                                </td>
                                                <td style={{ padding: '10px 12px', color: '#475569', fontWeight: '500' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontWeight: '600', color: '#0F172A' }}>{v.name || product.name} {varLabel && `(${varLabel})`}</span>
                                                        {v.chinese_name && <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '1px' }}>{v.chinese_name}</span>}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                    <span style={{ background: vStockBg, color: vStockColor, padding: '3px 10px', borderRadius: '9999px', fontWeight: '700', fontSize: '11px' }}>{v.stock}</span>
                                                </td>
                                                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', color: '#334155' }}>₱{(parseFloat(v.price1) || 0).toLocaleString()}</td>
                                                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: '#3B82F6' }}>₱{(parseFloat(v.price2) || 0).toLocaleString()}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div style={{ marginTop: '14px' }}>
                        <strong style={{ color: '#64748B', fontSize: '12px' }}>Notes:</strong>
                        <p style={{ marginTop: '6px', padding: '10px', background: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0', fontStyle: 'italic', color: '#475569', lineHeight: '1.6', fontSize: '12.5px', margin: 0 }}>
                            {product.notes || 'No description notes.'}
                        </p>
                    </div>
                </div>
                
                <div className="modal-footer flex justify-end px-6 py-4 border-t border-slate-100" style={{ borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px', background: '#F8FAFC' }}>
                    <button 
                        type="button" 
                        onClick={onClose}
                        style={{ padding: '8px 20px', fontSize: '13.5px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', color: '#475569', fontWeight: '500', cursor: 'pointer', height: '38px' }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
