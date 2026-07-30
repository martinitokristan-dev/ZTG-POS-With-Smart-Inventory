import React from 'react';
import LoadingSpinner from '../../../../shared/components/LoadingSpinner';
import useDisplayChineseNames from '../../../../shared/hooks/useDisplayChineseNames';
import { matchesStatusFilter } from '../../../../shared/utils/skuHelpers';
import CopyableText from '../../../../shared/components/CopyableText';

export default function InventoryTable({ products, loading, handleViewProduct, pagination, statusFilter }) {
    const showChineseNames = useDisplayChineseNames();
    const renderRow = (item, isVariant, baseIndex, parentProduct) => {
        const alertLevel = item.alert_limit || 5;
        const isOutOfStock = item.stock === 0;
        const isLowStock = item.stock > 0 && item.stock <= alertLevel;

        let stockStatusText = 'Active';
        let stockBadgeClass = 'badge-success';
        let customStatusStyle = {};

        if (item.status === 'Disabled') {
            stockStatusText = 'Disabled';
            stockBadgeClass = 'badge-secondary';
        } else if (isOutOfStock) {
            stockStatusText = 'No Stock';
            stockBadgeClass = 'badge-danger';
        } else if (isLowStock) {
            stockStatusText = 'Low Stock';
            stockBadgeClass = 'badge-warning';
        }

        const variantOptionText = item.variant_options?.map(o => o.value).join(', ')
            || item.variantOptions?.map(o => o.value).join(', ');

        const stockBadgeStyle = {
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            lineHeight: 1.2,
            padding: '4px 8px',
            minWidth: '50px',
            borderRadius: '6px',
        };

        const damagedStyle = {
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            lineHeight: 1.2,
            padding: '4px 8px',
            minWidth: '60px',
            borderRadius: '6px',
            backgroundColor: (item.damaged || 0) > 0 ? 'var(--danger-light)' : '#F1F5F9',
            color: (item.damaged || 0) > 0 ? 'var(--danger)' : 'var(--text-secondary)',
        };

        return (
            <tr key={item.id} style={!isVariant && baseIndex > 0 ? { borderTop: '2px solid var(--border)' } : {}}>
                <td style={{ fontSize: '15px' }}>
                    {isVariant ? (
                        <>
                            <strong style={{ display: 'block', fontSize: '15px', fontWeight: 600, color: 'var(--table-text-primary)' }}>
                                {item.name || parentProduct.name} {variantOptionText && !(item.name || '').includes(variantOptionText) && <span style={{ color: 'var(--primary)', fontWeight: 500 }}>({variantOptionText})</span>}
                            </strong>
                            {showChineseNames && (item.chinese_name || parentProduct.chinese_name) && <span className="chinese-subtitle" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--table-text-secondary)' }}>{item.chinese_name || parentProduct.chinese_name}</span>}
                        </>
                    ) : (
                        <>
                            <strong style={{ display: 'block', fontSize: '15px', fontWeight: 600, color: 'var(--table-text-primary)' }}>{item.name}</strong>
                            {showChineseNames && <span className="chinese-subtitle" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--table-text-secondary)' }}>{item.chinese_name || ''}</span>}
                        </>
                    )}
                </td>
                <td style={{ fontSize: '15px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    <CopyableText text={item.part_no} label="Part No." />
                </td>
                <td style={{ fontSize: '15px', fontWeight: 500, color: 'var(--table-text-secondary)' }}>{item.category?.name || parentProduct?.category?.name || 'Unassigned'}</td>
                <td><code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', fontSize: '13px', fontWeight: 500 }}>{item.address || '—'}</code></td>
                <td style={{ textAlign: 'right' }}>
                    <span className={`badge ${stockBadgeClass}`} style={{ ...stockBadgeStyle, fontVariantNumeric: 'tabular-nums' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600 }}>{item.stock}</span>
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Units</span>
                    </span>
                </td>
                <td style={{ fontWeight: 600, fontSize: '15px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>₱{Number(item.price1 || 0).toLocaleString('en-US')}</td>
                <td style={{ fontWeight: 600, fontSize: '15px', color: 'var(--primary)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>₱{Number(item.price2 || 0).toLocaleString('en-US')}</td>
                <td style={{ whiteSpace: 'nowrap', textAlign: 'right', fontSize: '15px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{item.sales_count || 0} sold</td>
                <td>
                    <div style={{ display: 'inline-flex', gap: '6px', flexWrap: 'nowrap', alignItems: 'center' }}>
                        <span className={`badge ${stockBadgeClass}`} style={{ whiteSpace: 'nowrap', ...customStatusStyle }}>
                            {stockStatusText}
                        </span>
                        {item.is_dead_stock && (
                            <span className="badge" style={{ backgroundColor: '#FFE4E6', color: '#BE123C', border: 'none', padding: '4px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                                Dead Stock
                            </span>
                        )}
                    </div>
                </td>
                <td style={{ textAlign: 'center' }}>
                    <span style={{ ...damagedStyle, fontVariantNumeric: 'tabular-nums' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600 }}>{item.damaged || 0}</span>
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Damaged</span>
                    </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <button className="action-trigger-btn" aria-label="View Product Details" data-tooltip="View Details" onClick={() => handleViewProduct(isVariant ? parentProduct : item)}>
                            <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}>
                                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        );
    };

    return (
        <div className="card table-card">
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table className="data-table" style={{ minWidth: '850px', width: '100%' }}>
                    <thead>
                        <tr>
                            <th style={{ textAlign: 'left' }}>Product</th>
                            <th style={{ textAlign: 'left' }}>Part No.</th>
                            <th style={{ textAlign: 'left' }}>Category</th>
                            <th style={{ textAlign: 'left' }}>Address</th>
                            <th style={{ textAlign: 'right' }}>Stock</th>
                            <th style={{ textAlign: 'right' }}>Original Price</th>
                            <th style={{ textAlign: 'right' }}>Retail Price</th>
                            <th style={{ textAlign: 'right' }}>Sales</th>
                            <th style={{ textAlign: 'left' }}>Status</th>
                            <th style={{ textAlign: 'center' }}>Damaged</th>
                            <th style={{ textAlign: 'center' }}>View</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="11" style={{ padding: '32px' }}>
                                    <LoadingSpinner text="Loading product inventory dataset..." minHeight="100px" />
                                </td>
                            </tr>
                        ) : products.length === 0 ? (
                            <tr>
                                <td colSpan="11" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '32px' }}>
                                    No inventory items found.
                                </td>
                            </tr>
                        ) : (
                            products.map((p, index) => {
                                const showParent = matchesStatusFilter(p, statusFilter);
                                const matchingVariants = p.variants ? p.variants.filter(v => matchesStatusFilter(v, statusFilter)) : [];
                                
                                if (!showParent && matchingVariants.length === 0) return null;

                                return (
                                    <React.Fragment key={`group-${p.id}`}>
                                        {showParent && renderRow(p, false, index, p)}
                                        {matchingVariants.map(v => renderRow(v, true, index, p))}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                    {!loading && products.length > 0 && (() => {
                        let totalStock = 0;
                        let totalSold = 0;
                        let totalDamaged = 0;

                        products.forEach(p => {
                            if (matchesStatusFilter(p, statusFilter)) {
                                totalStock += Number(p.stock || 0);
                                totalSold += Number(p.sales_count || 0);
                                totalDamaged += Number(p.damaged || 0);
                            }
                            if (p.variants && p.variants.length > 0) {
                                p.variants.forEach(v => {
                                    if (matchesStatusFilter(v, statusFilter)) {
                                        totalStock += Number(v.stock || 0);
                                        totalSold += Number(v.sales_count || 0);
                                        totalDamaged += Number(v.damaged || 0);
                                    }
                                });
                            }
                        });

                        return (
                            <tfoot>
                                <tr style={{ borderTop: '2.5px solid var(--border)', background: '#F8FAFC', fontWeight: 'bold' }}>
                                    <td style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 800 }}>Total:</td>
                                    <td></td>
                                    <td></td>
                                    <td></td>
                                    <td style={{ padding: '16px', color: 'var(--text-primary)' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 800 }}>{totalStock}</span>
                                        <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', marginLeft: '4px' }}>Units</span>
                                    </td>
                                    <td style={{ padding: '16px' }}></td>
                                    <td style={{ padding: '16px' }}></td>
                                    <td style={{ padding: '16px', color: 'var(--primary)', fontSize: '13px', fontWeight: 800, whiteSpace: 'nowrap' }}>{totalSold} sold</td>
                                    <td style={{ padding: '16px' }}></td>
                                    <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 800, color: totalDamaged > 0 ? 'var(--danger)' : 'inherit' }}>{totalDamaged}</span>
                                        <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', marginLeft: '4px', color: totalDamaged > 0 ? 'var(--danger)' : 'inherit' }}>Damaged</span>
                                    </td>
                                    <td style={{ padding: '16px' }}></td>
                                </tr>
                            </tfoot>
                        );
                    })()}
                </table>
            </div>
            
            {pagination && pagination.last_page > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Showing page {pagination.current_page} of {pagination.last_page} ({pagination.total} total items)
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            className="btn btn-outline" 
                            disabled={pagination.current_page === 1}
                            onClick={() => pagination.onPageChange(pagination.current_page - 1)}
                            style={{ padding: '6px 12px', fontSize: '13px' }}
                        >
                            Previous
                        </button>
                        <button 
                            className="btn btn-outline" 
                            disabled={pagination.current_page === pagination.last_page}
                            onClick={() => pagination.onPageChange(pagination.current_page + 1)}
                            style={{ padding: '6px 12px', fontSize: '13px' }}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
