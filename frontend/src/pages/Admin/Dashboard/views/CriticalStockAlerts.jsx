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
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 20,
            boxShadow: 'var(--shadow-sm)',
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
                    background: var(--bg-secondary);
                    border-radius: 4px;
                }
                .critical-alerts-scroll::-webkit-scrollbar-thumb {
                    background: var(--border);
                    border-radius: 4px;
                }
                .critical-alerts-scroll::-webkit-scrollbar-thumb:hover {
                    background: var(--text-muted);
                }
                `}
            </style>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexShrink: 0 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Critical Stock Alerts</h3>
                {criticalItems.length > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#F87171', backgroundColor: 'rgba(239, 68, 68, 0.15)', padding: '2px 8px', borderRadius: 9999, border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        {criticalItems.length} {criticalItems.length === 1 ? 'item' : 'items'}
                    </span>
                )}
            </div>

            <div className="critical-alerts-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 0, overflowY: 'auto', flex: 1, minHeight: 0, paddingRight: 6 }}>
                {criticalItems.length === 0 ? (
                    <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>
                        ✓ All stock levels healthy
                    </div>
                ) : (
                    criticalItems.map((item, idx, arr) => (
                        <div key={item.id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 0',
                            borderBottom: idx < arr.length - 1 ? '1px solid var(--border)' : 'none',
                        }}>
                            <div style={{ minWidth: 0, flex: 1, paddingRight: 10 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.name}>
                                    {item.name}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, marginTop: 1 }}>{item.sku}</div>
                            </div>
                            <span style={{
                                fontSize: 10, fontWeight: 700,
                                color: item.isOut ? '#F87171' : '#FBBF24',
                                backgroundColor: item.isOut ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                border: item.isOut ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(245, 158, 11, 0.25)',
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
                type="button"
                onClick={() => navigate('/inventory')}
                className="btn btn-secondary btn-sm"
                style={{
                    marginTop: 12, width: '100%', padding: '9px 0',
                    fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.15s ease',
                    flexShrink: 0
                }}
            >
                Manage Stock
            </button>
        </div>
    );
}
