import React from 'react';

export default function ProductsTab({
    activeSubTab, setActiveSubTab, settings, handleSettingInputChange, handleToggleSetting,
    categories, setSelectedCategory, setCategoryName, setShowCategoryModal, handleDeleteCategory, setCategoryVariants,
    newOptionValue, setNewOptionValue, handleAddVariantOption, handleDeleteVariantOption, getOptionsForType,
    handleSaveBulkSettings, handleUpdateVariantOption,
    uomList, newUomValue, setNewUomValue, handleAddUom, handleUpdateUom, handleDeleteUom
}) {
    return (
        <div className="prod-tabs-layout">
            {/* Left Sidebar */}
            <div className="prod-vtab-sidebar">
                {[
                    { id: 'info', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>, label: 'Product Info' },
                    { id: 'categories', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>, label: 'Categories' },
                    { id: 'sizes', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7h18M3 12h12M3 17h6"/></svg>, label: 'Size Options' },
                    { id: 'quality', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>, label: 'Quality' },
                    { id: 'colors', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 010 18"/></svg>, label: 'Color Options' },
                    { id: 'specification', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>, label: 'Specification' },
                    { id: 'material', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>, label: 'Material' },
                    { id: 'uom', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7V4h16v3M9 20h6M12 4v16"/><path d="M8 11h8M8 15h8"/></svg>, label: 'Unit of Measure (UOM)' },
                    { id: 'pricing', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 0v20M2 12h20"/></svg>, label: 'Pricing Configuration' }
                ].map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id)}
                        className={`prod-vtab-btn ${activeSubTab === tab.id ? 'active' : ''}`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="prod-panel-content" style={{ flex: 1, padding: '24px 32px' }}>
                    {/* PANEL: Product Info */}
                    {activeSubTab === 'info' && (
                        <div className="prod-vtab-panel active">
                            <div style={{ marginBottom: '20px' }}>
                                <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px' }}>Product Information Settings</h4>
                                <p className="panel-desc" style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>Configure display names, variant modes, pricing options, warehouse tracking, and POS display.</p>
                            </div>
                            <div className="checkbox-group" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                                <label className="toggle-row" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                                    <span className="toggle-label" style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Display Chinese names for products</span>
                                    <input type="checkbox" checked={settings.display_chinese_names === 'true'} onChange={() => handleToggleSetting('display_chinese_names')} />
                                </label>
                                <label className="toggle-row" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                                    <span className="toggle-label" style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Enable product variants (Size, Color, Quality, Specification, Material)</span>
                                    <input type="checkbox" checked={settings.enable_product_variants === 'true' || settings.enable_variants === 'true'} onChange={() => handleToggleSetting('enable_product_variants')} />
                                </label>
                                <label className="toggle-row" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                                    <span className="toggle-label" style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Enable dual pricing (Original and Retail Price)</span>
                                    <input type="checkbox" checked={settings.enable_dual_pricing === 'true'} onChange={() => handleToggleSetting('enable_dual_pricing')} />
                                </label>
                                <label className="toggle-row" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                                    <span className="toggle-label" style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Track product warehouse locations (Warehouse Address)</span>
                                    <input type="checkbox" checked={settings.track_warehouse_locations === 'true' || settings.track_locations === 'true'} onChange={() => handleToggleSetting('track_warehouse_locations')} />
                                </label>
                                <label className="toggle-row" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '12px 0' }}>
                                    <span className="toggle-label" style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Show stock levels in POS product catalog</span>
                                    <input type="checkbox" checked={settings.show_stock_levels_pos === 'true'} onChange={() => handleToggleSetting('show_stock_levels_pos')} />
                                </label>
                            </div>
                        </div>
                    )}

                    {/* PANEL: Categories */}
                    {activeSubTab === 'categories' && (
                        <div className="prod-vtab-panel active">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: '0 0 3px', fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Product Categories</h4>
                                    <p className="panel-desc" style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>Add categories and assign variant types — up to 3 per category.</p>
                                </div>
                                <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} onClick={() => { setSelectedCategory(null); setCategoryName(''); setCategoryVariants([]); setShowCategoryModal(true); }}>
                                    <svg viewBox="0 0 24 24" style={{ width: '13px', height: '13px', fill: 'none', stroke: 'currentColor', strokeWidth: '2.5', verticalAlign: 'middle', marginRight: '4px' }}><path d="M12 5v14M5 12h14"/></svg>
                                    Add Category
                                </button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {(!categories || categories.length === 0) ? (
                                    <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                                        No product categories found. Click "+ Add Category" to create one.
                                    </div>
                                ) : categories.map(c => (
                                    <div key={c.id} className="cat-card">
                                        <div className="cat-card-info">
                                            <div className="cat-card-name">{c.name}</div>
                                            <div className="cat-variant-badges">
                                                {c.variants && c.variants.length > 0 ? c.variants.map(v => (
                                                    <span key={v} className={`cv-badge ${v}`}>
                                                        {v === 'quality' ? 'Quality' : v === 'color' ? 'Color' : v === 'specification' ? 'Specification' : v === 'material' ? 'Material' : 'Size'}
                                                    </span>
                                                )) : <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>No variants assigned</span>}
                                            </div>
                                        </div>
                                        <div className="cat-card-actions">
                                            <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedCategory(c); setCategoryName(c.name); setCategoryVariants(c.variants || []); setShowCategoryModal(true); }}>Edit</button>
                                            <button className="btn btn-danger btn-sm" style={{ background: 'transparent', color: '#DC2626', borderColor: '#fca5a5' }} onClick={() => handleDeleteCategory(c)}>Remove</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* PANEL: Variants (Sizes, Quality, Colors, Specification, Material) */}
                    {['sizes', 'quality', 'colors', 'specification', 'material'].includes(activeSubTab) && (() => {
                        const typeMap = { 
                            sizes: 'Size', 
                            quality: 'Quality', 
                            colors: 'Color',
                            specification: 'Specification',
                            material: 'Material'
                        };
                        const placeholderMap = {
                            colors: 'e.g. Red, Yellow, Black',
                            quality: 'e.g. Standard, Premium, Heavy Duty',
                            sizes: 'e.g. Small, Medium, Large',
                            specification: 'e.g. Standard Type, High Pressure, Heavy Duty Type',
                            material: 'e.g. Steel, Alloy Steel, Rubber'
                        };
                        const typeName = typeMap[activeSubTab];
                        const [editingVariantId, setEditingVariantId] = React.useState(null);
                        const [editValue, setEditValue] = React.useState('');

                        const handleEditClick = (opt) => {
                            setEditingVariantId(opt.id);
                            setEditValue(opt.value);
                        };

                        const handleSaveEdit = (optId) => {
                            handleUpdateVariantOption(optId, editValue, typeName);
                            setEditingVariantId(null);
                        };

                        const handleColorChange = (e) => {
                            const hex = e.target.value;
                            const colors = {
                                '#ff0000': 'Red', '#00ff00': 'Green', '#0000ff': 'Blue', '#000000': 'Black', '#ffffff': 'White',
                                '#ffff00': 'Yellow', '#00ffff': 'Cyan', '#ff00ff': 'Magenta', '#808080': 'Gray', '#800000': 'Maroon',
                                '#808000': 'Olive', '#008000': 'Dark Green', '#800080': 'Purple', '#008080': 'Teal', '#000080': 'Navy',
                                '#ffa500': 'Orange', '#a52a2a': 'Brown', '#ffc0cb': 'Pink', '#ffd700': 'Gold', '#c0c0c0': 'Silver'
                            };
                            let minD = Infinity, name = hex;
                            const hR = parseInt(hex.slice(1,3),16), hG = parseInt(hex.slice(3,5),16), hB = parseInt(hex.slice(5,7),16);
                            for (const [cHex, cName] of Object.entries(colors)) {
                                const cR = parseInt(cHex.slice(1,3),16), cG = parseInt(cHex.slice(3,5),16), cB = parseInt(cHex.slice(5,7),16);
                                const d = (hR-cR)**2 + (hG-cG)**2 + (hB-cB)**2;
                                if (d < minD && d < 10000) { minD = d; name = cName; }
                            }
                            setNewOptionValue(name);
                        };

                        return (
                            <div className="prod-vtab-panel active">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ margin: '0 0 3px', fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{typeName} Options</h4>
                                        <p className="panel-desc" style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>Manage available {typeName.toLowerCase()} values for products.</p>
                                    </div>
                                    <div className="add-option-row" style={{ flexShrink: 0, display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            placeholder={placeholderMap[activeSubTab] || `e.g. Value 1, Value 2`} 
                                            style={{ width: '240px' }} 
                                            value={newOptionValue} 
                                            onChange={(e) => setNewOptionValue(e.target.value)} 
                                            onKeyDown={(e) => { if(e.key === 'Enter') handleAddVariantOption(typeName); }} 
                                        />
                                        {activeSubTab === 'colors' && (
                                            <input type="color" defaultValue="#3b82f6" onChange={handleColorChange} style={{ width: '36px', height: '36px', padding: '2px', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', background: '#fff' }} />
                                        )}
                                        <button className="btn btn-primary btn-sm" onClick={() => handleAddVariantOption(typeName)}>Add</button>
                                    </div>
                                </div>
                                <div className="variant-list">
                                    {getOptionsForType(typeName).map(opt => (
                                        <div key={opt.id} className="vitem" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', border: '1px solid var(--border)', borderRadius: '6px', marginBottom: '8px', background: '#fff' }}>
                                            {editingVariantId === opt.id ? (
                                                <div style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center' }}>
                                                    <input type="text" className="form-control" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus onKeyDown={(e) => { if(e.key === 'Enter') handleSaveEdit(opt.id); if(e.key === 'Escape') setEditingVariantId(null); }} style={{ flex: 1, height: '32px' }} />
                                                    <button className="btn btn-primary btn-sm" onClick={() => handleSaveEdit(opt.id)}>Save</button>
                                                    <button className="btn btn-secondary btn-sm" onClick={() => setEditingVariantId(null)}>Cancel</button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="vitem-label" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{opt.value}</div>
                                                    <div className="vitem-actions" style={{ display: 'flex', gap: '6px' }}>
                                                        <button className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: '11px', background: 'transparent', border: '1px solid var(--border)' }} onClick={() => handleEditClick(opt)}>Edit</button>
                                                        <button className="btn btn-danger btn-sm" style={{ padding: '4px 10px', fontSize: '11px', background: 'transparent', color: '#DC2626', borderColor: '#fca5a5' }} onClick={() => handleDeleteVariantOption(opt.id, typeName)}>Remove</button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                    {getOptionsForType(typeName).length === 0 && (
                                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0' }}>No options added yet.</p>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {/* PANEL: Unit of Measure (UOM) */}
                    {activeSubTab === 'uom' && (() => {
                        const [editingUomIdx, setEditingUomIdx] = React.useState(null);
                        const [editUomText, setEditUomText] = React.useState('');

                        const startEdit = (idx, val) => {
                            setEditingUomIdx(idx);
                            setEditUomText(val);
                        };

                        const saveEdit = (idx) => {
                            if (handleUpdateUom) handleUpdateUom(idx, editUomText);
                            setEditingUomIdx(null);
                        };

                        return (
                            <div className="prod-vtab-panel active">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ margin: '0 0 3px', fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Unit of Measure (UOM)</h4>
                                        <p className="panel-desc" style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>Manage available units of measure for product stock (e.g. Piece / PCS, Roll, Set, Box, Liter).</p>
                                    </div>
                                    <div className="add-option-row" style={{ flexShrink: 0, display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            placeholder="e.g. Piece / PCS, Roll, Box" 
                                            style={{ width: '220px' }} 
                                            value={newUomValue || ''} 
                                            onChange={(e) => setNewUomValue && setNewUomValue(e.target.value)} 
                                            onKeyDown={(e) => { if(e.key === 'Enter' && handleAddUom) handleAddUom(); }} 
                                        />
                                        <button className="btn btn-primary btn-sm" onClick={handleAddUom}>Add UOM</button>
                                    </div>
                                </div>
                                <div className="variant-list">
                                    {(uomList || []).map((uom, idx) => (
                                        <div key={idx} className="vitem" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', border: '1px solid var(--border)', borderRadius: '6px', marginBottom: '8px', background: '#fff' }}>
                                            {editingUomIdx === idx ? (
                                                <div style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center' }}>
                                                    <input 
                                                        type="text" 
                                                        className="form-control" 
                                                        value={editUomText} 
                                                        onChange={e => setEditUomText(e.target.value)} 
                                                        autoFocus 
                                                        onKeyDown={(e) => { if(e.key === 'Enter') saveEdit(idx); if(e.key === 'Escape') setEditingUomIdx(null); }} 
                                                        style={{ flex: 1, height: '32px' }} 
                                                    />
                                                    <button className="btn btn-primary btn-sm" onClick={() => saveEdit(idx)}>Save</button>
                                                    <button className="btn btn-secondary btn-sm" onClick={() => setEditingUomIdx(null)}>Cancel</button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="vitem-label" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{uom}</div>
                                                    <div className="vitem-actions" style={{ display: 'flex', gap: '6px' }}>
                                                        <button className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: '11px', background: 'transparent', border: '1px solid var(--border)' }} onClick={() => startEdit(idx, uom)}>Edit</button>
                                                        <button className="btn btn-danger btn-sm" style={{ padding: '4px 10px', fontSize: '11px', background: 'transparent', color: '#DC2626', borderColor: '#fca5a5' }} onClick={() => handleDeleteUom && handleDeleteUom(idx)}>Remove</button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                    {(!uomList || uomList.length === 0) && (
                                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0' }}>No units of measure added yet.</p>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {/* PANEL: Pricing Configuration */}
                    {activeSubTab === 'pricing' && (
                        <div className="prod-vtab-panel active">
                            <div style={{ marginBottom: '20px' }}>
                                <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px' }}>Pricing Configuration</h4>
                                <p className="panel-desc" style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>Configure custom labels for Original Price (Price 1) and Retail Price (Price 2).</p>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: 0 }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Original Price Label</label>
                                    <input type="text" className="form-control" value={settings.price1_label || ''} onChange={(e) => handleSettingInputChange('price1_label', e.target.value)} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Retail Price Label</label>
                                    <input type="text" className="form-control" value={settings.price2_label || ''} onChange={(e) => handleSettingInputChange('price2_label', e.target.value)} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
