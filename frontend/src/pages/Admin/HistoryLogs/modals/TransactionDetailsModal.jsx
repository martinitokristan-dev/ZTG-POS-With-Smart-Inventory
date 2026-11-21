import React, { useMemo, useState } from 'react';
import CopyableText from '../../../../shared/components/CopyableText';
import FormattedProductName from '../../../../shared/components/FormattedProductName';
import { calculateItemDiscountBreakdown, formatDiscountRate } from '../../../../shared/utils/discountCalculator';
import { getLineItemName, getLineItemPartNo } from '../../../../shared/utils/lineItemDisplay';
import ImportBatchDetails from '../../../../shared/components/ImportBatchDetails';
import { showToast } from '../../../../utils/toast';

/**
 * Snapshot product name without variant label.
 *
 * @param {object} item
 * @param {string} fallback
 * @returns {string}
 */
function getLineItemBaseName(item, fallback = 'Unknown Part') {
    if (!item) return fallback;
    const raw = item.item_name || item.name || item.product?.name || fallback;
    const label = item.variant_label;
    if (label) {
        const escaped = String(label).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const stripped = raw.replace(new RegExp(`\\s*\\(${escaped}\\)`, 'i'), '').trim();
        if (stripped) return stripped;
    }
    const match = raw.match(/^(.*?)\s*\((.*?)\)$/);
    if (match && match[1]?.trim()) {
        return match[1].trim();
    }
    return raw;
}

function ItemsPurchasedSection({
    processedItems,
    tx,
    status,
    isPartialRefund,
    isFullRefund,
    isVoid,
    isReturnAction,
    fmt,
    totalLineGross,
    totalDiscounts,
    totalRefundedQty,
}) {
    const [copiedPartNo, setCopiedPartNo] = useState(null);

    const hasDiscounts = useMemo(() => {
        return processedItems.some(it => Number(it.itemDisc || 0) > 0);
    }, [processedItems]);

    const isRefundOrReturn = isFullRefund || isPartialRefund;
    const isStandardSale = !isRefundOrReturn && !isVoid;

    const word = isReturnAction ? 'returned' : 'refunded';
    const wordCapitalized = isReturnAction ? 'Returned' : 'Refunded';

    const visibleColumnsCount = 3 + (hasDiscounts ? 1 : 0) + (isRefundOrReturn ? 1 : 0) + 1;

    let headerPill = null;
    const itemsCount = processedItems.length;
    const refundedItemsCount = processedItems.filter(it => Number(it.refundedQty || 0) > 0).length;

    if (isVoid) {
        headerPill = (
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', background: 'var(--border)', color: 'var(--text-secondary)' }}>
                Voided
            </span>
        );
    } else if (isFullRefund) {
        const pillText = isReturnAction ? 'Full return' : 'Full refund';
        headerPill = (
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                {pillText}
            </span>
        );
    } else if (isPartialRefund) {
        const actionPillWord = isReturnAction ? 'Partial return' : 'Partial refund';
        headerPill = (
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A' }}>
                {actionPillWord} · {refundedItemsCount} of {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
            </span>
        );
    }

    const handleCopyPartNo = (e, partNo) => {
        e.stopPropagation();
        if (!partNo || partNo === '—' || partNo === 'N/A') return;
        const copyText = String(partNo).trim();
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(copyText);
        } else {
            const textArea = document.createElement('textarea');
            textArea.value = copyText;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
            } catch (err) {
                console.error('Fallback copy failed:', err);
            }
            document.body.removeChild(textArea);
        }
        setCopiedPartNo(partNo);
        showToast(`Copied Part No. "${partNo}" to clipboard`);
        setTimeout(() => setCopiedPartNo(null), 1600);
    };

    return (
        <div className="audit-detail-section" style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Items Purchased ({itemsCount})
                </span>
                {headerPill}
            </div>

            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflowX: 'auto', overflowY: 'auto', maxHeight: '50vh', background: 'var(--bg-card)' }}>
                <table className="modal-table data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--table-header-bg)', borderBottom: '1px solid var(--border)', fontSize: '12px', color: 'var(--table-text-secondary)' }}>
                        <tr>
                            <th style={{ padding: '10px 14px', fontWeight: '600', minWidth: '200px' }}>Item</th>
                            <th style={{ padding: '10px 8px', fontWeight: '600', textAlign: 'center', width: '100px', whiteSpace: 'nowrap' }}>Qty</th>
                            <th style={{ padding: '10px 12px', fontWeight: '600', textAlign: 'right', width: '95px' }}>Unit price</th>
                            {hasDiscounts && (
                                <th style={{ padding: '10px 12px', fontWeight: '600', textAlign: 'right', width: '100px' }}>Discount</th>
                            )}
                            {isRefundOrReturn && (
                                <th style={{ padding: '10px 12px', fontWeight: '600', textAlign: 'right', width: '105px' }}>{wordCapitalized}</th>
                            )}
                            <th style={{ padding: '10px 14px', fontWeight: '600', textAlign: 'right', width: '105px' }}>
                                {isStandardSale ? 'Total' : 'Net'}
                            </th>
                        </tr>
                    </thead>
                    <tbody style={{ fontSize: '13px' }}>
                        {processedItems.length === 0 ? (
                            <tr>
                                <td colSpan={visibleColumnsCount} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                                    No items
                                </td>
                            </tr>
                        ) : (
                            processedItems.map((item, index) => {
                                const partNo = getLineItemPartNo(item);
                                const baseName = getLineItemBaseName(item, 'Unknown Part');
                                const variantText = item.variant_label || (() => {
                                    const raw = item.item_name || item.name || item.product?.name || '';
                                    const match = raw.match(/\((.*?)\)$/);
                                    return match ? match[1].trim() : '';
                                })();
                                const refundedQty = Number(item.refundedQty || 0);

                                return (
                                    <tr key={index} style={{ borderBottom: '1px solid var(--border)' }}>
                                        {/* 1. Item: Base name line 1, Part no pill + variant line 2 */}
                                        <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                                            <div
                                                style={{
                                                    fontWeight: '500',
                                                    color: 'var(--text-primary)',
                                                    lineHeight: '1.35',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                }}
                                                title={baseName}
                                            >
                                                {baseName}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '11px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                                                <span
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        padding: '1px 6px',
                                                        borderRadius: '4px',
                                                        background: 'var(--table-header-bg)',
                                                        border: '1px solid var(--border)',
                                                        fontFamily: 'var(--font-mono, monospace)',
                                                        fontSize: '11px',
                                                        fontWeight: '600',
                                                        color: 'var(--text-primary)',
                                                        whiteSpace: 'nowrap',
                                                        userSelect: 'none',
                                                    }}
                                                >
                                                    <span>{partNo}</span>
                                                    {partNo !== '—' && partNo !== 'N/A' && (
                                                        <button
                                                            type="button"
                                                            aria-label={`Copy part number ${partNo}`}
                                                            title={`Copy ${partNo}`}
                                                            onClick={(e) => handleCopyPartNo(e, partNo)}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                padding: '1px',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: copiedPartNo === partNo ? '#10B981' : 'var(--text-muted)',
                                                                transition: 'color 0.15s ease',
                                                            }}
                                                        >
                                                            {copiedPartNo === partNo ? (
                                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                    <polyline points="20 6 9 17 4 12" />
                                                                </svg>
                                                            ) : (
                                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                    )}
                                                </span>
                                                {variantText && (
                                                    <>
                                                        <span style={{ color: 'var(--text-muted)' }}>·</span>
                                                        <span style={{ color: 'var(--text-secondary)' }}>{variantText}</span>
                                                    </>
                                                )}
                                            </div>
                                        </td>

                                        {/* 2. Qty: sold quantity centered, subtext only when refunded_qty > 0 */}
                                        <td style={{ padding: '12px 8px', textAlign: 'center', verticalAlign: 'middle', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                                            <div style={{ fontWeight: '500', color: 'var(--text-primary)', fontSize: '13px' }}>
                                                {item.qty}
                                            </div>
                                            {!isVoid && isRefundOrReturn && refundedQty > 0 && (
                                                <div style={{ fontSize: '11px', marginTop: '2px', color: '#DC2626', fontWeight: '500', whiteSpace: 'nowrap' }}>
                                                    {refundedQty} {word}
                                                </div>
                                            )}
                                        </td>

                                        {/* 3. Unit price: right-aligned */}
                                        <td style={{ padding: '12px 12px', textAlign: 'right', verticalAlign: 'middle', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                            {fmt(item.unitPrice)}
                                        </td>

                                        {/* 4. Discount: right-aligned (only if hasDiscounts) */}
                                        {hasDiscounts && (
                                            <td style={{ padding: '12px 12px', textAlign: 'right', verticalAlign: 'middle', fontVariantNumeric: 'tabular-nums', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                                {item.itemDisc > 0 ? (
                                                    <div>
                                                        <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                                                            −{fmt(item.itemDisc)}
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                            {item.formattedRate}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                                                )}
                                            </td>
                                        )}

                                        {/* 5. Refunded: right-aligned (only if isRefundOrReturn) */}
                                        {isRefundOrReturn && (
                                            <td style={{ padding: '12px 12px', textAlign: 'right', verticalAlign: 'middle', fontVariantNumeric: 'tabular-nums', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                                {item.lineRefunded > 0 ? (
                                                    <span style={{ color: '#DC2626', fontWeight: '500' }}>
                                                        −{fmt(item.lineRefunded)}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                                                )}
                                            </td>
                                        )}

                                        {/* 6. Net: right-aligned, font-medium */}
                                        <td style={{ padding: '12px 14px', textAlign: 'right', verticalAlign: 'middle', color: 'var(--text-primary)', fontWeight: '500', fontVariantNumeric: 'tabular-nums', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                            {fmt(item.lineNet)}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Totals Footer: Pinned below the scroll area */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <div style={{ width: '100%', maxWidth: '280px', background: 'var(--table-header-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        <span>Subtotal</span>
                        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: '500', color: 'var(--text-primary)' }}>
                            {fmt(totalLineGross)}
                        </span>
                    </div>
                    {hasDiscounts && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            <span>Discounts</span>
                            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: '500', color: 'var(--text-primary)' }}>
                                −{fmt(totalDiscounts)}
                            </span>
                        </div>
                    )}
                    {isRefundOrReturn && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            <span>Total {word} ({totalRefundedQty} {totalRefundedQty === 1 ? 'pc' : 'pcs'})</span>
                            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: '500', color: '#DC2626' }}>
                                −{fmt(Number(tx.refunded_amount || 0))}
                            </span>
                        </div>
                    )}
                    <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0 6px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', alignItems: 'center' }}>
                        <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                            {isStandardSale ? 'Total' : 'Net sales remaining'}
                        </span>
                        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: '600', color: 'var(--text-primary)', fontSize: '15px' }}>
                            {fmt(isVoid ? 0 : Number(tx.amount || 0))}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function TransactionDetailsModal({ isOpen, onClose, transaction, fmtDate, fmt }) {
    if (!isOpen || !transaction) return null;

    const tx = transaction;
    const status = tx.status || 'Unknown';
    const reason = tx.reason || tx.refund_reason || tx.void_reason || tx.internal_notes || '—';
    const chequeNo = tx.cheque_number || (tx.payment_method && tx.payment_method.includes('(#') ? tx.payment_method.match(/\(#([^)]+)\)/)?.[1] : null);

    // Parse restock line items from internal_notes JSON
    let restockEntries = [];
    if (status === 'Restocked' && tx.internal_notes) {
        try {
            const parsed = typeof tx.internal_notes === 'string'
                ? JSON.parse(tx.internal_notes)
                : tx.internal_notes;
            restockEntries = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            restockEntries = [];
        }
    }

    const isPartialRefund = tx.is_partial_refund === true || (Number(tx.refunded_amount || 0) > 0 && Number(tx.amount || 0) > 0);
    const isFullRefund = (status === 'Refund' || status === 'Return') && !isPartialRefund;
    const isVoid = status === 'Void';

    // Excel import records keep a small JSON summary; the product list is loaded from the import itself.
    const isImportRecord = status === 'Imported' || status === 'Import Undone';
    let importInfo = {};
    if (isImportRecord && tx.internal_notes) {
        try {
            importInfo = (typeof tx.internal_notes === 'string' ? JSON.parse(tx.internal_notes) : tx.internal_notes) || {};
        } catch (e) {
            importInfo = {};
        }
    }

    let title = 'Transaction Details';
    let subtitle = tx.si_no || '—';
    let statusColor = '#334155';
    let itemsBlock = null;

    if (status === 'Restocked') {
        title = 'Restock Details';
        subtitle = 'Inventory restock record';
        statusColor = '#059669';
    } else if (isImportRecord) {
        title = status === 'Imported' ? 'Product Import Details' : 'Import Undone';
        subtitle = `${tx.si_no || '—'} · ${importInfo.file_name || 'Excel file'}`;
        statusColor = status === 'Imported' ? '#059669' : '#DC2626';
    } else if (isVoid) {
        title = 'Void Transaction Details';
        subtitle = 'Cancelled sale record';
        statusColor = '#DC2626';
    } else if (isPartialRefund) {
        title = status === 'Return' ? 'Partial Return Details' : 'Partial Refund Details';
        subtitle = tx.si_no || '—';
        statusColor = '#D97706';
    } else if (isFullRefund) {
        title = status === 'Return' ? 'Full Return Details' : 'Full Refund Details';
        subtitle = tx.si_no || '—';
        statusColor = '#DC2626';
    } else {
        title = 'Transaction Details';
        subtitle = tx.si_no || '—';
        statusColor = status === 'Completed' ? '#059669' : '#334155';
    }

    const txItems = Array.isArray(tx.items) ? tx.items : [];
    const hasRefundOrReturn = isPartialRefund || isFullRefund || isVoid || status === 'Refund' || status === 'Return' || Number(tx.refunded_amount || 0) > 0 || txItems.some(i => Number(i.refunded_qty || 0) > 0);
    const isReturnAction = status === 'Return' || (tx.type && String(tx.type).toLowerCase().includes('return'));
    const refundReturnColumnHeader = isVoid ? 'Voided Qty' : (isReturnAction ? 'Returned Qty' : 'Returned / Refund');

    // Calculate overall financial totals across transaction items
    let grossSubtotal = 0;
    let itemDiscountsTotal = 0;

    const processedItems = txItems.map(item => {
        const rawQty = Number(item.qty || 1);
        const refundedQty = Number(item.refunded_qty || (isFullRefund || isVoid ? rawQty : 0));
        // Units still sold: none after a full refund/return or a void.
        const displayRemainingQty = (isFullRefund || isVoid)
            ? 0
            : (isPartialRefund ? Number(item.net_qty ?? Math.max(0, rawQty - refundedQty)) : rawQty);

        // Sales and Discount columns: the whole line as sold. Net Sales: what is still sold after a
        // refund/return/void (the units given back take their own share of the discount with them).
        const breakdown = calculateItemDiscountBreakdown({ ...item, displayQty: rawQty }, tx);
        const origPrice = breakdown.unitPrice;
        const lineGross = breakdown.lineGross;
        const lineDisc = breakdown.totalDiscount;
        const itemOriginalTotal = breakdown.discountedPrice;
        const lineNet = displayRemainingQty === rawQty
            ? itemOriginalTotal
            : calculateItemDiscountBreakdown({ ...item, displayQty: displayRemainingQty }, tx).discountedPrice;

        grossSubtotal += lineGross;
        itemDiscountsTotal += lineDisc;

        return {
            ...item,
            qty: rawQty,
            displayQty: rawQty,
            netRemainingQty: displayRemainingQty,
            refundedQty,
            unitPrice: origPrice,
            lineGross,
            itemDisc: lineDisc,
            formattedRate: breakdown.formattedRate,
            discountRate: breakdown.discountRate,
            directItemDiscount: breakdown.directItemDiscount,
            itemOriginalTotal,
            lineNet
        };
    });

    // After a partial refund the server's net sale is the source of truth. Line amounts are
    // rounded per line, so put any leftover centavo on the largest line to make the Net Sales
    // column add up to exactly the "Net Sales Remaining" amount.
    if (isPartialRefund && processedItems.length > 0) {
        const lineSum = processedItems.reduce((sum, it) => sum + Number(it.lineNet || 0), 0);
        const centDiff = Math.round((Number(tx.amount || 0) - lineSum) * 100) / 100;
        if (centDiff !== 0 && Math.abs(centDiff) < 1) {
            const largest = processedItems.reduce((best, it) => (it.lineNet > best.lineNet ? it : best), processedItems[0]);
            largest.lineNet = Math.round((largest.lineNet + centDiff) * 100) / 100;
        }
    }

    // Money given back per line = what was paid for the line − what is still sold. The lines add
    // up to the "Refunded / Returned / Voided Amount" shown above the table.
    processedItems.forEach(it => {
        it.lineRefunded = Math.max(0, Math.round((Number(it.itemOriginalTotal || 0) - Number(it.lineNet || 0)) * 100) / 100);
    });
    const totalLineRefunded = processedItems.reduce((sum, it) => sum + it.lineRefunded, 0);

    const orderDiscountAmt = Number(tx.discount_amount || 0);
    const directItemDiscTotal = processedItems.reduce((sum, item) => sum + Number(item.directItemDiscount || 0), 0);
    // itemDiscountsTotal is the sum of breakdown.totalDiscount (which already accounts for prorated order discounts)
    // If there are items, totalLineDiscount is itemDiscountsTotal; fallback to orderDiscountAmt if no items
    const totalDiscounts = processedItems.length > 0 ? itemDiscountsTotal : orderDiscountAmt;

    const totalLineGross = grossSubtotal > 0 ? grossSubtotal : Number(tx.original_amount || tx.amount || 0);
    const totalLineDiscount = totalDiscounts;

    const overallDiscountRate = totalLineGross > 0 && totalLineDiscount > 0
        ? ((totalLineDiscount / totalLineGross) * 100)
        : (Number(tx.discount_rate) > 0 ? Number(tx.discount_rate) : 0);
    const formattedOverallRate = formatDiscountRate(overallDiscountRate);

    let discountTypeLabel = '';
    if (tx.discount_type === 'Senior') {
        discountTypeLabel = ' (Senior 20%)';
    } else if (tx.discount_type === 'PWD') {
        discountTypeLabel = ' (PWD 20%)';
    } else if (tx.discount_type === 'CustomPercent') {
        const rateStr = tx.discount_rate ? formatDiscountRate(Number(tx.discount_rate)) : formattedOverallRate;
        discountTypeLabel = ` (Custom ${rateStr})`;
    } else if (tx.discount_type === 'CustomAmount') {
        discountTypeLabel = overallDiscountRate > 0 ? ` (Custom ₱, ${formattedOverallRate})` : ' (Custom ₱)';
    } else if (tx.discount_type) {
        discountTypeLabel = overallDiscountRate > 0 ? ` (${tx.discount_type} ${formattedOverallRate})` : ` (${tx.discount_type})`;
    } else if (overallDiscountRate > 0) {
        discountTypeLabel = ` (${formattedOverallRate})`;
    }

    const totalOriginalAmount = (tx.original_amount != null && Number(tx.original_amount) > 0)
        ? Number(tx.original_amount)
        : (grossSubtotal > 0 ? Math.max(0, grossSubtotal - totalDiscounts) : Number(tx.amount || tx.total || 0));

    const totalRefundedAmount = (tx.refunded_amount != null && Number(tx.refunded_amount) > 0)
        ? Number(tx.refunded_amount)
        : (isFullRefund || isVoid ? totalOriginalAmount : 0);

    const netSalesRemaining = Number(tx.amount || 0);

    const totalQty = processedItems.reduce((sum, item) => sum + Number(item.qty || 0), 0);
    const totalLineNet = processedItems.reduce((sum, item) => sum + Number(item.lineNet || 0), 0);
    const totalRefundedQty = processedItems.reduce((sum, item) => sum + Number(item.refundedQty || 0), 0);

    if (status !== 'Restocked' && status !== 'Damaged') {
        itemsBlock = (
            <ItemsPurchasedSection
                processedItems={processedItems}
                tx={tx}
                status={status}
                isPartialRefund={isPartialRefund}
                isFullRefund={isFullRefund}
                isVoid={isVoid}
                isReturnAction={isReturnAction}
                fmt={fmt}
                totalLineGross={totalLineGross}
                totalDiscounts={totalDiscounts}
                totalRefundedQty={totalRefundedQty}
            />
        );
    }

    const auditDetailRow = (label, value, customStyle = {}) => {
        const isCopyable = ['Invoice No.', 'Reference No.', 'OR Number'].includes(label) && value && value !== '—' && value !== 'N/A';
        return (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: '13px', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '500', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>{label}</span>
                <span style={{ color: 'var(--text-primary)', textAlign: 'right', fontWeight: '600', ...customStyle }}>
                    {isCopyable ? <CopyableText text={value} label={label} /> : value}
                </span>
            </div>
        );
    };

    const statusDisplayLabel = isPartialRefund
        ? (status === 'Return' ? 'Partial Return' : 'Partial Refund')
        : (isFullRefund ? (status === 'Return' ? 'Full Return' : 'Full Refund') : status);

    const resolvedCustomer = tx.customer_name || tx.customer?.name || (tx.customer_id ? `Customer #${tx.customer_id}` : null);

    return (
        <div className="modal-overlay" style={{ zIndex: 999 }}>
            <div className="modal-card audit-detail-card" style={{ maxWidth: '960px', width: '95%', background: 'var(--bg-card)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
                <div className="modal-header audit-detail-header" style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h3 className="modal-title" style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>{title}</h3>
                        <p className="audit-detail-subtitle" style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                            {subtitle} {resolvedCustomer ? `• Customer: ${resolvedCustomer}` : ''}
                        </p>
                    </div>
                    <button type="button" className="modal-close" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'none', stroke: 'currentColor', strokeWidth: '2' }}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div className="modal-body audit-detail-body" style={{ padding: '20px 24px', maxHeight: '70vh', overflowY: 'auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', columnGap: '32px' }}>
                        {status === 'Restocked' && (
                            <>
                                {auditDetailRow('Action', 'Inventory Restock')}
                                {auditDetailRow('Date & Time', fmtDate(tx.date || tx.created_at))}
                                {auditDetailRow('Restocked By', tx.cashier?.full_name || tx.cashier?.name || '—')}
                                {auditDetailRow('Total Qty Added', `+${tx.total_qty || 0}`, { color: '#059669', fontWeight: '700' })}
                                {auditDetailRow('Reason', reason)}
                            </>
                        )}

                        {status === 'Void' && (
                            <>
                                {auditDetailRow('Invoice No.', tx.si_no || '—')}
                                {auditDetailRow('Date & Time', fmtDate(tx.date || tx.created_at))}
                                {auditDetailRow('Customer', tx.customer_name || tx.customer?.name || 'Walk-in')}
                                {auditDetailRow('Served By', tx.checker?.name || tx.cashier?.full_name || tx.cashier?.name || '—')}
                                {auditDetailRow('Original Sale (after discount)', fmt(totalOriginalAmount))}
                                {auditDetailRow('Voided Amount', `-${fmt(totalRefundedAmount)}`, { color: '#DC2626', fontWeight: '700' })}
                                {auditDetailRow('Net Sales', fmt(0), { color: 'var(--text-primary)', fontWeight: '700' })}
                                {auditDetailRow('Processed By', tx.approver?.full_name || tx.approver?.name || '—')}
                                {auditDetailRow('Reason', reason)}
                                {auditDetailRow('OR Number', tx.or_no || 'N/A')}
                            </>
                        )}

                        {(status === 'Deposit' || status === 'Paid') && (
                            <>
                                {auditDetailRow('Reference No.', tx.si_no || '—')}
                                {auditDetailRow('Date & Time', fmtDate(tx.date || tx.created_at))}
                                {auditDetailRow('Customer', tx.customer_name || tx.customer?.name || 'Walk-in')}
                                {auditDetailRow('Payment Method', (tx.payment_method || '—').replace(/\s*\([^)]*\)/g, '').trim())}
                                {chequeNo && auditDetailRow('Cheque Number', chequeNo)}
                                {auditDetailRow('Gross Sales', fmt(totalOriginalAmount))}
                                {totalDiscounts > 0 && auditDetailRow(`Total Discounts${discountTypeLabel}`, `-${fmt(totalDiscounts)}`, { color: '#2563EB', fontWeight: '700' })}
                                {auditDetailRow(status === 'Deposit' ? 'Deposit Amount Collected' : 'Payment Collected', fmt(tx.amount || tx.total), { color: 'var(--text-primary)', fontWeight: '700' })}
                                {auditDetailRow('Served By', tx.checker?.name || tx.cashier?.full_name || tx.cashier?.name || '—')}
                                {auditDetailRow('Status', status, { color: statusColor, fontWeight: '700' })}
                            </>
                        )}

                        {isImportRecord && (
                            <>
                                {auditDetailRow('Action', status === 'Imported' ? 'Excel Product Import' : 'Excel Import Undone')}
                                {auditDetailRow('Date & Time', fmtDate(tx.date || tx.created_at))}
                                {auditDetailRow(status === 'Imported' ? 'Imported By' : 'Undone By', tx.cashier?.full_name || tx.cashier?.name || '—')}
                                {auditDetailRow('File', importInfo.file_name || '—')}
                                {status === 'Imported'
                                    ? auditDetailRow('Products Added', `${importInfo.products ?? 0} products, ${importInfo.variants ?? 0} variants`, { color: '#059669', fontWeight: '700' })
                                    : auditDetailRow('Products Removed', `${importInfo.removed?.products ?? importInfo.products ?? 0} products`, { color: '#DC2626', fontWeight: '700' })}
                                {status === 'Imported' && auditDetailRow('Total Stock Added', `+${tx.total_qty || 0}`, { color: '#059669', fontWeight: '700' })}
                                {status === 'Imported' && Number(importInfo.failed || 0) > 0 && auditDetailRow('Could Not Be Saved', `${importInfo.failed} products`, { color: '#DC2626', fontWeight: '700' })}
                            </>
                        )}

                        {status !== 'Restocked' && !isImportRecord && status !== 'Void' && status !== 'Deposit' && status !== 'Paid' && (
                            <>
                                {auditDetailRow('Invoice No.', tx.si_no || '—')}
                                {auditDetailRow('Date & Time', fmtDate(tx.date || tx.created_at))}
                                {auditDetailRow('Customer', tx.customer_name || tx.customer?.name || (tx.customer_id ? `Customer #${tx.customer_id}` : 'Walk-in'))}
                                {(tx.customer?.phone || tx.customer_phone) && auditDetailRow('Contact Phone', tx.customer?.phone || tx.customer_phone)}
                                {auditDetailRow('Payment Method', (tx.payment_method || 'Cash').replace(/\s*\([^)]*\)/g, '').trim())}
                                {chequeNo && auditDetailRow('Cheque Number', chequeNo)}

                                {isPartialRefund ? (
                                    <>
                                        {auditDetailRow('Original Sale (after discount)', fmt(totalOriginalAmount))}
                                        {auditDetailRow(isReturnAction ? 'Returned Amount' : 'Refunded Amount', `-${fmt(totalRefundedAmount)}`, { color: '#DC2626', fontWeight: '700' })}
                                        {auditDetailRow('Net Sales Remaining', fmt(netSalesRemaining), { color: 'var(--text-primary)', fontWeight: '700', fontSize: '14px' })}
                                    </>
                                ) : isFullRefund ? (
                                    <>
                                        {auditDetailRow('Original Sale (after discount)', fmt(totalOriginalAmount))}
                                        {auditDetailRow(isReturnAction ? 'Returned Amount' : 'Refunded Amount', `-${fmt(totalRefundedAmount)}`, { color: '#DC2626', fontWeight: '700' })}
                                        {auditDetailRow('Net Sales Remaining', fmt(0), { color: 'var(--text-primary)', fontWeight: '700', fontSize: '14px' })}
                                    </>
                                ) : (
                                    <>
                                        {grossSubtotal > 0 && auditDetailRow('Gross Sales', fmt(grossSubtotal))}
                                        {totalDiscounts > 0 && (
                                            (directItemDiscTotal > 0 && orderDiscountAmt > 0) ? (
                                                <>
                                                    {auditDetailRow('Item Discounts', `-${fmt(directItemDiscTotal)}`, { color: '#2563EB', fontWeight: '700' })}
                                                    {auditDetailRow(`Order Discount${discountTypeLabel}`, `-${fmt(orderDiscountAmt)}`, { color: '#2563EB', fontWeight: '700' })}
                                                    {auditDetailRow('Total Discounts', `-${fmt(totalDiscounts)}`, { color: '#2563EB', fontWeight: '700' })}
                                                </>
                                            ) : (
                                                auditDetailRow(`Discount${discountTypeLabel}`, `-${fmt(totalDiscounts)}`, { color: '#2563EB', fontWeight: '700' })
                                            )
                                        )}
                                        {auditDetailRow('Net Sales', fmt(tx.amount || tx.total), { color: 'var(--text-primary)', fontWeight: '700', fontSize: '14px' })}
                                    </>
                                )}

                                {auditDetailRow('Served By', tx.checker?.name || tx.cashier?.full_name || tx.cashier?.name || '—')}
                                {auditDetailRow('Status', statusDisplayLabel, { color: statusColor, fontWeight: '700' })}
                                {(status === 'Refund' || status === 'Return' || isPartialRefund || reason !== '—') && auditDetailRow('Reason', reason)}
                            </>
                        )}
                    </div>

                    {status === 'Restocked' && restockEntries.length > 0 && (
                        <div style={{ marginTop: '16px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '10px' }}>Restocked Items</span>
                            <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflowX: 'auto', overflowY: 'auto', background: 'var(--bg-card)', maxHeight: '300px' }}>
                                <table className="modal-table data-table" style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead style={{ background: 'var(--table-header-bg)', borderBottom: '2px solid var(--table-border)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B' }}>
                                        <tr>
                                            <th style={{ padding: '10px 14px', fontWeight: '600' }}>Part No.</th>
                                            <th style={{ padding: '10px 14px', fontWeight: '600' }}>Product</th>
                                            <th style={{ padding: '10px 14px', fontWeight: '600', textAlign: 'right', width: '90px' }}>Prev. Stock</th>
                                            <th style={{ padding: '10px 14px', fontWeight: '600', textAlign: 'right', width: '80px' }}>Added</th>
                                            <th style={{ padding: '10px 14px', fontWeight: '600', textAlign: 'right', width: '90px' }}>New Stock</th>
                                        </tr>
                                    </thead>
                                    <tbody style={{ fontSize: '14px' }}>
                                        {restockEntries.map((entry, idx) => {
                                            const prevStock = entry.previous_stock ?? (entry.new_stock != null ? entry.new_stock - entry.qty : '—');
                                            return (
                                                <tr key={idx} style={{ borderBottom: '1px solid var(--table-border-subtle)', minHeight: '44px' }}>
                                                    <td style={{ padding: '10px 14px', fontWeight: '600', color: 'var(--table-text-primary)', fontVariantNumeric: 'tabular-nums', fontSize: '14px' }}>
                                                        <CopyableText text={entry.part_no || '—'} label="Part No." codeStyle={{ fontSize: '14px', fontWeight: '600' }} />
                                                    </td>
                                                    <td style={{ padding: '10px 14px', color: 'var(--table-text-primary)' }}>
                                                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{entry.name || '—'}</div>
                                                        {entry.category && <div style={{ fontSize: '12px', color: 'var(--table-text-muted)', marginTop: '2px' }}>{entry.category}{entry.address ? ` · ${entry.address}` : ''}</div>}
                                                    </td>
                                                    <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--table-text-secondary)', fontWeight: '600', fontVariantNumeric: 'tabular-nums', fontSize: '14px' }}>
                                                        {prevStock}
                                                    </td>
                                                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', fontVariantNumeric: 'tabular-nums', fontSize: '14px' }}>
                                                        <span style={{ color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '2px 8px', borderRadius: '12px', fontSize: '13px' }}>
                                                            +{entry.qty || 0}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-primary)', fontWeight: '700', fontVariantNumeric: 'tabular-nums', fontSize: '14px' }}>
                                                        {entry.new_stock || 0}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    {status === 'Imported' && importInfo.import_batch_id && (
                        <div style={{ marginTop: '16px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '10px' }}>Imported Products</span>
                            <ImportBatchDetails batchId={importInfo.import_batch_id} showSummary={false} />
                        </div>
                    )}
                    {!isImportRecord && itemsBlock}
                </div>
                <div className="modal-footer audit-detail-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--table-header-bg)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={onClose} style={{ padding: '8px 24px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>Close</button>
                </div>
            </div>
        </div>
    );
}
