import React, { useState } from 'react';
import LoadingSpinner from '../../../../shared/components/LoadingSpinner';
import useDisplayChineseNames from '../../../../shared/hooks/useDisplayChineseNames';
import useSystemSettings from '../../../../shared/hooks/useSystemSettings';
import FormattedProductName from '../../../../shared/components/FormattedProductName';

const DEFAULT_PLACEHOLDER_IMAGE = "/ztg-icon.png";

export default function ProductGrid({ 
    products, 
    loading,
    searchLoading,
    categories, 
    searchQuery, setSearchQuery, 
    categoryFilter, setCategoryFilter,
    addToCart,
    fmt
}) {
    const [previewImage, setPreviewImage] = useState(null);
    const showChineseNames = useDisplayChineseNames();
    const { 
        enable_dual_pricing, 
        track_warehouse_locations, 
        show_stock_levels_pos, 
        price1_label, 
        price2_label 
    } = useSystemSettings();

    // Build a map of parent product names so variant rows can display "ParentName (VariantOption)"
    const parentMap = React.useMemo(() => {
        const map = {};
        products.forEach(p => {
            if (!p.parent_product_id) map[p.id] = p.name;
        });
        return map;
    }, [products]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: '16px', height: '100%' }}>
            {/* Search Box & Category Filters */}
            <div className="pos-header-search-container" style={{ maxWidth: 'none', margin: '0', alignItems: 'flex-start', background: 'var(--bg-card)', padding: '16px 20px', borderBottom: '1px solid var(--border)', borderRadius: '10px 10px 0 0' }}>
                <div className="pos-search-wrapper" style={{ position: 'relative', width: '100%', marginBottom: '16px' }}>
                    <svg style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: 'var(--text-muted)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                    <input 
                        type="text" 
                        className="pos-search-input" 
                        placeholder="Search products by name or part number..." 
                        style={{ width: '100%', padding: '12px 16px 12px 46px', borderRadius: '30px', border: '1px solid var(--border)', fontSize: '14px', backgroundColor: 'var(--bg-canvas)', color: 'var(--text-primary)', outline: 'none' }}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchLoading && (
                        <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '14px', height: '14px', border: '2px solid #CBD5E1', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Searching...</span>
                        </div>
                    )}
                </div>
                <div className="filter-pills" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {categories.map(cat => (
                        <button 
                            key={cat}
                            className={`filter-pill ${categoryFilter === cat ? 'active' : ''}`}
                            onClick={() => setCategoryFilter(cat)}
                            style={{
                                padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                                border: categoryFilter === cat ? '1px solid #3B82F6' : '1px solid var(--border)',
                                background: categoryFilter === cat ? 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' : 'var(--bg-secondary)',
                                color: categoryFilter === cat ? '#FFFFFF' : 'var(--text-secondary)',
                                boxShadow: categoryFilter === cat ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {cat}
                        </button>
                    ))}
                    <button 
                        type="button"
                        className={`filter-pill ${categoryFilter === 'No Name / Part No' ? 'active' : ''}`}
                        onClick={() => setCategoryFilter(categoryFilter === 'No Name / Part No' ? 'All' : 'No Name / Part No')}
                        style={{
                            padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                            border: categoryFilter === 'No Name / Part No' ? '1px solid #8B5CF6' : '1px dashed var(--border)',
                            background: categoryFilter === 'No Name / Part No' ? 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' : 'var(--bg-secondary)',
                            color: categoryFilter === 'No Name / Part No' ? '#FFFFFF' : 'var(--text-secondary)',
                            boxShadow: categoryFilter === 'No Name / Part No' ? '0 4px 12px rgba(139, 92, 246, 0.3)' : 'none',
                            transition: 'all 0.2s ease',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                            <circle cx="12" cy="13" r="4" />
                        </svg>
                        <span>No Name / Part No</span>
                    </button>
                </div>
            </div>

            {/* Catalogue Table */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0, flex: 1, minHeight: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0 0 10px 10px' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Catalogue Picker</h3>
                </div>
                <div style={{ overflowY: 'auto', overflowX: 'auto', flex: 1 }}>
                    <table className="pos-table data-table" style={{ width: '100%', minWidth: '650px', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--table-header-bg)' }}>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '12.5px', fontWeight: '600', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-secondary)', borderBottom: '2px solid var(--table-border)', maxWidth: '200px' }}>Product</th>
                                <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '12.5px', fontWeight: '600', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-secondary)', borderBottom: '2px solid var(--table-border)' }}>Part No.</th>
                                <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '12.5px', fontWeight: '600', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-secondary)', borderBottom: '2px solid var(--table-border)' }}>Category</th>
                                {track_warehouse_locations && (
                                    <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '12.5px', fontWeight: '600', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-secondary)', borderBottom: '2px solid var(--table-border)' }}>Address</th>
                                )}
                                <th style={{ textAlign: 'right', padding: '12px 14px', fontSize: '12.5px', fontWeight: '600', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-secondary)', borderBottom: '2px solid var(--table-border)' }}>Stock</th>
                                <th style={{ textAlign: 'right', padding: '12px 14px', fontSize: '12.5px', fontWeight: '600', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-secondary)', borderBottom: '2px solid var(--table-border)' }}>{price1_label || 'Original Price'}</th>
                                {enable_dual_pricing && (
                                    <th style={{ textAlign: 'right', padding: '12px 20px', fontSize: '12.5px', fontWeight: '600', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-secondary)', borderBottom: '2px solid var(--table-border)' }}>{price2_label || 'Retail Price'}</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5 + (track_warehouse_locations ? 1 : 0) + (enable_dual_pricing ? 1 : 0)} style={{ padding: '20px' }}><LoadingSpinner text="Loading products..." minHeight="100px" /></td></tr>
                            ) : searchLoading ? (
                                <tr><td colSpan={5 + (track_warehouse_locations ? 1 : 0) + (enable_dual_pricing ? 1 : 0)} style={{ padding: '20px' }}><LoadingSpinner text="Searching..." minHeight="60px" /></td></tr>
                            ) : products.length === 0 ? (
                                <tr><td colSpan={5 + (track_warehouse_locations ? 1 : 0) + (enable_dual_pricing ? 1 : 0)} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--table-text-muted)', fontSize: '15px' }}>No products found.</td></tr>
                            ) : products.map(p => {
                                const isLow = p.stock > 0 && p.stock <= 5;
                                const isOut = p.stock <= 0;
                                const stockBadgeClass = isOut ? 'stock-badge stock-out' : isLow ? 'stock-badge stock-low' : 'stock-badge stock-in';
                                const uomClean = p.uom ? p.uom.replace(/^.*\/\s*/, '').trim().toUpperCase() : 'PCS';

                                return (
                                    <tr 
                                        key={p.id} 
                                        onClick={() => !isOut && addToCart(p, 'price1')}
                                        style={{ borderBottom: '1px solid var(--table-border-subtle)', cursor: isOut ? 'not-allowed' : 'pointer', opacity: isOut ? 0.5 : 1, minHeight: '52px' }}
                                        className="hover-row"
                                    >
                                        <td style={{ padding: '10px 14px', maxWidth: '200px', overflow: 'hidden' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                                                <img 
                                                    src={p.image || p.parent_product?.image || DEFAULT_PLACEHOLDER_IMAGE} 
                                                    alt={p.name} 
                                                    className="pos-product-image"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setPreviewImage(p.image || p.parent_product?.image || DEFAULT_PLACEHOLDER_IMAGE);
                                                    }}
                                                    onError={(e) => { e.currentTarget.src = DEFAULT_PLACEHOLDER_IMAGE; }}
                                                />
                                                <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                                                    <div style={{ fontSize: '15px', overflow: 'hidden' }}>
                                                        <FormattedProductName name={p.name} blockVariant={true} />
                                                    </div>
                                                    {showChineseNames && p.chinese_name && <div style={{ fontSize: '12px', color: 'var(--table-text-secondary)', fontWeight: '500', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.chinese_name}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 14px', fontSize: '15px', color: 'var(--table-text-primary)', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>{p.part_no || p.partNo || 'N/A'}</td>
                                        <td style={{ padding: '12px 14px', fontSize: '15px', color: 'var(--table-text-secondary)', fontWeight: '500' }}>{p.category?.name || p.category || 'Uncategorized'}</td>
                                        {track_warehouse_locations && (
                                            <td style={{ padding: '12px 14px', fontSize: '15px', color: 'var(--table-text-secondary)', fontWeight: '500' }}>{p.address || '—'}</td>
                                        )}
                                        <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            <span className={stockBadgeClass}>
                                                {show_stock_levels_pos ? (
                                                    <>
                                                        <span className="stock-qty">{p.stock}</span>
                                                        <span className="stock-uom">{uomClean}</span>
                                                    </>
                                                ) : (isOut ? 'OOS' : 'In Stock')}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 14px', fontSize: '15px', fontWeight: '600', textAlign: 'right', color: 'var(--table-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                                            {!isOut ? (
                                                <span 
                                                    onClick={(e) => { e.stopPropagation(); addToCart(p, 'price1'); }} 
                                                    style={{ cursor: 'pointer' }}
                                                    onMouseOver={(ev) => ev.currentTarget.style.textDecoration='underline'}
                                                    onMouseOut={(ev) => ev.currentTarget.style.textDecoration='none'}
                                                >
                                                    {fmt(p.price1)}
                                                </span>
                                            ) : (
                                                <span>{fmt(p.price1)}</span>
                                            )}
                                        </td>
                                        {enable_dual_pricing && (
                                            <td style={{ padding: '12px 20px', fontSize: '15px', fontWeight: '600', textAlign: 'right', color: 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}>
                                                {!isOut ? (
                                                    <span 
                                                        onClick={(e) => { e.stopPropagation(); addToCart(p, 'price2'); }} 
                                                        style={{ cursor: 'pointer' }}
                                                        onMouseOver={(ev) => ev.currentTarget.style.textDecoration='underline'}
                                                        onMouseOut={(ev) => ev.currentTarget.style.textDecoration='none'}
                                                    >
                                                        {fmt(p.price2)}
                                                    </span>
                                                ) : (
                                                    <span>{fmt(p.price2)}</span>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            {previewImage && (
                <div 
                    onClick={() => setPreviewImage(null)}
                    style={{ 
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                        background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)', 
                        zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    <button 
                        onClick={() => setPreviewImage(null)}
                        style={{ 
                            position: 'absolute', top: '24px', right: '24px', 
                            background: 'rgba(255, 255, 255, 0.2)', borderRadius: '50%', 
                            width: '44px', height: '44px', display: 'flex', alignItems: 'center', 
                            justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s',
                            color: '#FFFFFF',
                            backdropFilter: 'blur(4px)',
                            border: '1.5px solid rgba(255, 255, 255, 0.3)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            zIndex: 2010
                        }}
                        onMouseOver={e => { e.currentTarget.style.backgroundColor='rgba(255, 255, 255, 0.3)'; e.currentTarget.style.transform='scale(1.05)'; }}
                        onMouseOut={e => { e.currentTarget.style.backgroundColor='rgba(255, 255, 255, 0.2)'; e.currentTarget.style.transform='scale(1)'; }}
                    >
                        <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'none', stroke: 'currentColor', strokeWidth: '2.5' }}>
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>

                    <div 
                        onClick={(e) => e.stopPropagation()}
                        style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                    >
                        <img 
                            src={previewImage.replace('w=80', 'w=600')} 
                            alt="Preview" 
                            style={{ 
                                display: 'block', maxWidth: '90vw', maxHeight: '85vh', 
                                borderRadius: '12px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
                            }} 
                        />
                    </div>
                </div>
            )}
            <style>{`
                .pos-search-input:focus {
                    background-color: var(--bg-card) !important;
                    border-color: var(--primary) !important;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15) !important;
                }
                .hover-row:hover {
                    background-color: var(--bg-secondary);
                }
                .pos-product-image {
                    width: 40px;
                    height: 40px;
                    border-radius: 8px;
                    object-fit: cover;
                    background-color: var(--bg-secondary);
                    border: 1px solid var(--border);
                    flex-shrink: 0;
                    cursor: pointer;
                    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
                }
                .pos-product-image:hover {
                    transform: scale(1.15);
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
                    border-color: #3B82F6;
                }
            `}</style>
        </div>
    );
}
