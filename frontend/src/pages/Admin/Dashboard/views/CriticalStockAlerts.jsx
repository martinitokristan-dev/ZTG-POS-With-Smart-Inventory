import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventory } from '../../../../contexts/InventoryContext';
import { flattenToSellableSKUs } from '../../../../shared/utils/skuHelpers';

export default function CriticalStockAlerts() {
    const navigate = useNavigate();
    const { inventory: products } = useInventory();

    const criticalItems = React.useMemo(() => {
        const flatSKUs = flattenToSellableSKUs(products);

        return flatSKUs
            .filter(item => item.status !== 'Disabled' && (item.stock === 0 || item.stock <= (item.alert_limit || 5)))
            .map(item => {
                let displayName = item.name;
                const parent = item.parent_product_id ? products.find(p => p.id === item.parent_product_id) : null;
                if (parent) {
                    const optionValues = Array.isArray(item.variant_options)
                        ? item.variant_options.map(opt => opt.value).join(', ')
                        : (Array.isArray(item.variantOptions) ? item.variantOptions.map(opt => opt.value).join(', ') : '');
                    const nameToUse = item.name || parent.name;
                    displayName = optionValues && !nameToUse.includes(optionValues) ? `${nameToUse} (${optionValues})` : nameToUse;
                }

                return {
                    id: item.id,
                    name: displayName,
                    chineseName: item.chinese_name || parent?.chinese_name || null,
                    sku: item.part_no || item.partNo || 'N/A',
                    stock: item.stock,
                    isOut: item.stock === 0
                };
            })
            .sort((a, b) => {
                if (a.isOut && !b.isOut) return -1;
                if (!a.isOut && b.isOut) return 1;
                return a.stock - b.stock;
            });
    }, [products]);

    return (
        <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 12,
            padding: 20,
            boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            height: 320,
            boxSizing: 'border-box'
        }}>
            <style>
                {`
                .critical-alerts-scroll::-webkit-scrollbar {
                    width: 5px;
                }
                .critical-alerts-scroll::-webkit-scrollbar-track {
                    background: #F1F5F9;
                    border-radius: 4px;
                }
                .critical-alerts-scroll::-webkit-scrollbar-thumb {
                    background: #CBD5E1;
                    border-radius: 4px;
                }
                .critical-alerts-scroll::-webkit-scrollbar-thumb:hover {
                    background: #94A3B8;
                }
                `}
            </style>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexShrink: 0 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Critical Stock Alerts</h3>
                {criticalItems.length > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', backgroundColor: '#FEF2F2', padding: '2px 8px', borderRadius: 9999, border: '1px solid #FECACA' }}>
                        {criticalItems.length} {criticalItems.length === 1 ? 'item' : 'items'}
                    </span>
                )}
            </div>

            <div className="critical-alerts-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 0, overflowY: 'auto', flex: 1, minHeight: 0, paddingRight: 6 }}>
                {criticalItems.length === 0 ? (
                    <div style={{ padding: '40px 0', textAlign: 'center', color: '#94A3B8', fontSize: 13, fontWeight: 500 }}>
                        ✓ All stock levels healthy
                    </div>
                ) : (
                    criticalItems.map((item, idx, arr) => (
                        <div key={item.id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 0',
                            borderBottom: idx < arr.length - 1 ? '1px solid #F1F5F9' : 'none',
                        }}>
                            <div style={{ minWidth: 0, flex: 1, paddingRight: 10 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.name}>
                                    {item.name}
                                </div>
                                <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500, marginTop: 1 }}>{item.sku}</div>
                            </div>
                            <span style={{
                                fontSize: 10, fontWeight: 700,
                                color: item.isOut ? '#EF4444' : '#D97706',
                                backgroundColor: item.isOut ? '#FEF2F2' : '#FFFBEB',
                                border: item.isOut ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(217,119,6,0.2)',
                                borderRadius: 4, padding: '3px 8px', letterSpacing: '0.3px',
                                flexShrink: 0
                            }}>
                                {item.isOut ? 'OUT OF STOCK' : `LOW STOCK (${item.stock})`}
                            </span>
                        </div>
                    ))
                )}
            </div>

            <button
                onClick={() => navigate('/inventory')}
                style={{
                    marginTop: 12, width: '100%', padding: '9px 0',
                    backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0',
                    borderRadius: 8, fontSize: 13, fontWeight: 600,
                    color: '#64748B', cursor: 'pointer', transition: 'all 0.15s ease',
                    flexShrink: 0
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F1F5F9'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
            >
                Manage Stock
            </button>
        </div>
    );
}
