import React from 'react';
import LoadingSpinner from '../../../../shared/components/LoadingSpinner';
import StatusBadge from '../../../../shared/components/StatusBadge';
import CopyableText from '../../../../shared/components/CopyableText';
import FormattedProductName from '../../../../shared/components/FormattedProductName';
import { calculateItemDiscountBreakdown } from '../../../../shared/utils/discountCalculator';

export default function MySalesTable({ loading, items, fmt, fmtDate }) {
    if (loading) return <LoadingSpinner text="Loading sales data..." minHeight="200px" />;

    if (items.length === 0) {
        return (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748B' }}>
                No sales items found for the selected filters.
            </div>
        );
    }

    return (
        <div className="card table-card" style={{ background: '#FFFFFF', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div className="table-header-bar" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>Fulfilled Sales Invoices</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ borderBottom: '2px solid var(--table-border)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', background: 'var(--table-header-bg)', whiteSpace: 'nowrap' }}>
                        <tr>
                            <th style={{ padding: '10px 12px', fontWeight: '600' }}>Date</th>
                            <th style={{ padding: '10px 12px', fontWeight: '600' }}>S.I./C.R./D.R.</th>
                            <th style={{ padding: '10px 12px', fontWeight: '600' }}>Part No.</th>
                            <th style={{ padding: '10px 14px', fontWeight: '600' }}>Product</th>
                            <th style={{ padding: '10px 8px', fontWeight: '600', textAlign: 'center' }}>Qty</th>
                            <th style={{ padding: '10px 10px', fontWeight: '600', textAlign: 'right' }}>Price</th>
                            <th style={{ padding: '10px 10px', fontWeight: '600', textAlign: 'right' }}>Sales</th>
                            <th style={{ padding: '10px 12px', fontWeight: '600' }}>Customer</th>
                            <th style={{ padding: '10px 10px', fontWeight: '600' }}>Payment</th>
                            <th style={{ padding: '10px 8px', fontWeight: '600', textAlign: 'center' }}>Discount %</th>
                            <th style={{ padding: '10px 10px', fontWeight: '600', textAlign: 'right' }}>Discount</th>
                            <th style={{ padding: '10px 10px', fontWeight: '600' }}>Served By</th>
                            <th style={{ padding: '10px 12px', fontWeight: '600' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody style={{ fontSize: '14.5px' }}>
                        {items.map((item, i) => {
                            const amountColor = 'var(--success, #16A34A)';
                            const qty = Number(item.qty || 1);
                            const breakdown = calculateItemDiscountBreakdown(item, item._rawTx || item.tx);
                            const unitPrice = breakdown.unitPrice;
                            const discountVal = breakdown.totalDiscount;
                            const netRowAmount = breakdown.discountedPrice;

                            const fullDate = fmtDate(item._txDate) || '';
                            const [displayDate, ...timeParts] = fullDate.split(', ');
                            const displayTime = timeParts.join(', ');
                            const brandVal = item.product?.brand || item.brand || item.product?.brand?.name;

                            return (
                                <tr key={i} style={{ borderBottom: '1px solid var(--table-border-subtle)', minHeight: '44px', whiteSpace: 'nowrap' }}>
                                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                                        <span style={{ display: 'block', color: 'var(--table-text-primary)', fontSize: '14px', fontWeight: '500' }}>{displayDate}</span>
                                        {displayTime && <span style={{ display: 'block', fontSize: '12px', color: 'var(--table-text-secondary)', fontWeight: '500' }}>{displayTime}</span>}
                                    </td>
                                    <td style={{ padding: '8px 12px', fontSize: '14px', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>
                                        <CopyableText text={item._txReceipt} label="S.I./C.R./D.R." codeStyle={{ fontSize: '14px', color: 'var(--table-text-primary)', fontWeight: '600' }} />
                                    </td>
                                    <td style={{ padding: '8px 12px', color: 'var(--table-text-primary)', fontSize: '14px', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>{item.part_no || item.partNo || 'N/A'}</td>
                                    <td style={{ padding: '8px 14px', maxWidth: '220px', overflow: 'hidden' }}>
                                        <FormattedProductName name={item.name} brand={brandVal} blockVariant={true} />
                                    </td>
                                    <td style={{ padding: '8px 8px', color: 'var(--table-text-primary)', textAlign: 'center', fontSize: '14px', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>{qty}</td>
                                    <td style={{ padding: '8px 10px', color: 'var(--table-text-secondary)', textAlign: 'right', fontSize: '14px', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>{fmt(unitPrice)}</td>
                                    <td style={{ padding: '8px 10px', fontWeight: '600', textAlign: 'right', color: amountColor, fontSize: '14px', fontVariantNumeric: 'tabular-nums' }}>{fmt(netRowAmount)}</td>
                                    <td style={{ padding: '8px 12px', color: 'var(--table-text-secondary)', fontSize: '14px', fontWeight: '500', whiteSpace: 'normal' }}>{item._txCustomer}</td>
                                    <td style={{ padding: '8px 10px', color: 'var(--table-text-secondary)', fontSize: '14px', fontWeight: '500' }}>{item._txPayment}</td>
                                    <td style={{ padding: '8px 8px', textAlign: 'center', color: breakdown.discountRate > 0 ? '#2563EB' : 'var(--table-text-muted)', fontWeight: breakdown.discountRate > 0 ? '600' : '500', fontSize: '14px', fontVariantNumeric: 'tabular-nums' }}>
                                        {breakdown.formattedRate}
                                    </td>
                                    <td style={{ padding: '8px 10px', textAlign: 'right', color: discountVal > 0 ? '#2563EB' : 'var(--table-text-muted)', fontWeight: discountVal > 0 ? '600' : '500', fontSize: '14px', fontVariantNumeric: 'tabular-nums' }}>
                                        {discountVal > 0 ? `-${fmt(discountVal)}` : fmt(0)}
                                    </td>
                                    <td style={{ padding: '8px 10px', color: 'var(--table-text-secondary)', fontSize: '14px', fontWeight: '500' }}>{(item._txChecker || '—').split(' ')[0]}</td>
                                    <td style={{ padding: '8px 12px' }}><StatusBadge status={item._txStatus === 'Refund' || item._txStatus === 'Return' ? 'Completed' : item._txStatus} /></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
