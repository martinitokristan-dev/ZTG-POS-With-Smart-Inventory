import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventory } from '../../../../contexts/InventoryContext';
import { flattenToSellableSKUs } from '../../../../shared/utils/skuHelpers';

export default function CriticalStockAlerts({ criticalItems: propItems }) {
    const navigate = useNavigate();
    const { inventory: products } = useInventory();

    const localItems = useMemo(() => {
        if (!products || !products.length) return [];
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

                const rawSku = item.part_no || item.partNo || '';
                const cleanSku = (rawSku && rawSku !== 'N/A' && rawSku !== '—') ? rawSku : '';

                return {
                    id: item.id,
                    name: displayName,
                    chineseName: item.chinese_name || parent?.chinese_name || null,
                    sku: cleanSku,
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

    const criticalItems = propItems || localItems;
    const totalCount = criticalItems.length;
    const displayRows = criticalItems.slice(0, 100);
    const hasMoreThan100 = criticalItems.length > 100;

    const [atBottom, setAtBottom] = useState(false);
    const scrollRef = useRef(null);

    const checkScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const isScrollable = el.scrollHeight > el.clientHeight + 2;
        if (!isScrollable) {
            setAtBottom(true);
            return;
        }
        const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 2;
        setAtBottom(isAtBottom);
    }, []);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const onScroll = () => {
            checkScroll();
        };

        el.addEventListener('scroll', onScroll, { passive: true });
        checkScroll();

        let ro;
        if (typeof ResizeObserver !== 'undefined') {
            ro = new ResizeObserver(() => {
                checkScroll();
            });
            ro.observe(el);
        }

        return () => {
            el.removeEventListener('scroll', onScroll);
            if (ro) ro.disconnect();
        };
    }, [criticalItems, checkScroll]);

    return (
        <div
            className="critical-stock-alerts-card"
            style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: 0,
                boxSizing: 'border-box',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <style>{`
                .critical-manage-stock-btn {
                    margin-top: 16px;
                    width: 100%;
                    height: 38px;
                    background-color: var(--primary);
                    color: #FFFFFF;
                    border: none;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background-color 0.15s ease;
                    flex-shrink: 0;
                    outline: none;
                    box-sizing: border-box;
                    user-select: none;
                }
                .critical-manage-stock-btn:hover {
                    background-color: var(--primary-solid);
                }
                .critical-manage-stock-btn:focus-visible {
                    outline: 2px solid var(--primary);
                    outline-offset: 2px;
                }
                .critical-stock-scroll-list:focus-visible {
                    outline: 2px solid var(--primary);
                    outline-offset: -2px;
                }
                .critical-stock-scroll-list::-webkit-scrollbar {
                    width: 6px;
                }
                .critical-stock-scroll-list::-webkit-scrollbar-track {
                    background: transparent;
                }
                .critical-stock-scroll-list::-webkit-scrollbar-thumb {
                    background: var(--border);
                    border-radius: 9999px;
                }
                @media (max-width: 1024px) {
                    .critical-stock-alerts-card {
                        height: auto !important;
                    }
                    .critical-stock-scroll-wrapper {
                        flex: 0 1 auto !important;
                        min-height: 0 !important;
                        max-height: 360px !important;
                    }
                    .critical-stock-scroll-list {
                        flex: 0 1 auto !important;
                        min-height: 0 !important;
                        max-height: 360px !important;
                    }
                }
            `}</style>

            {/* Header: Title + Subtitle on left, "View all" link on right */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexShrink: 0 }}>
                <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        Critical stock alerts
                    </h3>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '3px 0 0 0', fontWeight: 500 }}>
                        {totalCount} {totalCount === 1 ? 'item needs' : 'items need'} restocking
                    </p>
                </div>
                {totalCount > 0 && (
                    <button
                        type="button"
                        onClick={() => navigate('/inventory')}
                        style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            color: 'var(--primary, #3B82F6)',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            textDecoration: 'none'
                        }}
                    >
                        View all
                    </button>
                )}
            </div>

            {/* List Body */}
            {totalCount === 0 ? (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: '1 1 0',
                    minHeight: 0,
                    gap: 8,
                    padding: '30px 0',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        backgroundColor: 'rgba(16, 185, 129, 0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--success, #10B981)',
                        marginBottom: 2
                    }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                        All stock levels healthy
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Every item is in stock.
                    </div>
                </div>
            ) : (
                <div className="critical-stock-scroll-wrapper" style={{ position: 'relative', flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <ul
                        ref={scrollRef}
                        onScroll={checkScroll}
                        tabIndex={0}
                        role="region"
                        aria-label="Items needing restocking"
                        className="critical-stock-scroll-list"
                        style={{
                            listStyle: 'none',
                            margin: 0,
                            padding: 0,
                            flex: '1 1 0',
                            minHeight: 0,
                            overflowY: 'auto',
                            overscrollBehavior: 'contain',
                            scrollbarWidth: 'thin',
                            scrollbarColor: 'var(--border) transparent',
                            outline: 'none'
                        }}
                    >
                        {displayRows.map((item, idx) => {
                            const statusText = item.isOut
                                ? 'Out of stock'
                                : `Low stock · ${item.stock} left`;
                            const dotColor = item.isOut
                                ? 'var(--danger, #EF4444)'
                                : 'var(--warning, #F59E0B)';
                            const isLastRow = !hasMoreThan100 && idx === displayRows.length - 1;

                            return (
                                <li
                                    key={item.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '12px 0',
                                        borderBottom: isLastRow ? 'none' : '1px solid var(--border)',
                                        gap: 12
                                    }}
                                >
                                    {/* Left: Status Dot */}
                                    <div style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        backgroundColor: dotColor,
                                        flexShrink: 0,
                                        marginTop: 2
                                    }} />

                                    {/* Middle: Name + Details */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                            style={{
                                                fontSize: 13,
                                                fontWeight: 600,
                                                color: 'var(--text-primary)',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}
                                            title={item.name}
                                        >
                                            {item.name}
                                        </div>

                                        {/* Second line: Part number (mono) · status in words. Omit SKU if empty. Never show N/A */}
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                            {item.sku ? (
                                                <>
                                                    <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 500 }}>
                                                        {item.sku}
                                                    </span>
                                                    <span>·</span>
                                                    <span>{statusText}</span>
                                                </>
                                            ) : (
                                                <span>{statusText}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Restock link */}
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/inventory?highlight=${item.id}`)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            padding: '4px 6px',
                                            color: 'var(--primary, #3B82F6)',
                                            fontSize: 13,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            flexShrink: 0
                                        }}
                                    >
                                        Restock
                                    </button>
                                </li>
                            );
                        })}

                        {hasMoreThan100 && (
                            <li
                                key="see-all-100"
                                style={{
                                    padding: '12px 0',
                                    textAlign: 'center',
                                    borderBottom: 'none'
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() => navigate('/inventory')}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        padding: '4px 8px',
                                        color: 'var(--primary, #3B82F6)',
                                        fontSize: 13,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        textDecoration: 'none'
                                    }}
                                >
                                    See all {totalCount} in Inventory
                                </button>
                            </li>
                        )}
                    </ul>

                    {/* 24px Gradient overlay at bottom of scroll list */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: 24,
                            pointerEvents: 'none',
                            background: 'linear-gradient(to bottom, transparent, var(--bg-card))',
                            opacity: atBottom ? 0 : 1,
                            transition: 'opacity 0.2s ease',
                        }}
                        aria-hidden="true"
                    />
                </div>
            )}

            {/* Bottom Primary Button */}
            <button
                type="button"
                onClick={() => navigate('/inventory')}
                className="critical-manage-stock-btn"
            >
                Manage stock
            </button>
        </div>
    );
}
