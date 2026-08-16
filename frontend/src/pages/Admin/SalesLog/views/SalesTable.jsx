import React from 'react';
import LoadingSpinner from '../../../../shared/components/LoadingSpinner';
import StatusBadge from '../../../../shared/components/StatusBadge';
import CopyableText from '../../../../shared/components/CopyableText';
import FormattedProductName from '../../../../shared/components/FormattedProductName';

export default function SalesTable({ loading, items, fmt, fmtDate }) {
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
            <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ borderBottom: '2px solid var(--table-border)', fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--table-header-bg)', whiteSpace: 'nowrap' }}>
                        <tr>
                            <th style={{ padding: '12px 16px', fontWeight: '600' }}>Date</th>
                            <th style={{ padding: '12px 16px', fontWeight: '600' }}>S.I./C.R./D.R.</th>
                            <th style={{ padding: '12px 16px', fontWeight: '600' }}>Part No.</th>
                            <th style={{ padding: '12px 16px', fontWeight: '600', maxWidth: '140px' }}>Product</th>
                            <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'center' }}>Qty</th>
                            <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'right' }}>Price</th>
                            <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'right' }}>Amount</th>
                            <th style={{ padding: '12px 16px', fontWeight: '600' }}>Customer</th>
                            <th style={{ padding: '12px 16px', fontWeight: '600' }}>Payment</th>
                            <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'right' }}>Discounted</th>
                            <th style={{ padding: '12px 16px', fontWeight: '600' }}>Served By</th>
                            <th style={{ padding: '12px 16px', fontWeight: '600' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody style={{ fontSize: '15px' }}>
                        {items.map((item, i) => {
                            const amountColor = 'var(--success, #16A34A)';
                            const qty = Number(item.qty || 1);
                            const rawPrice = Number(item.original_price || item.price || 0);
                            const unitPrice = rawPrice > 0 ? rawPrice : (Number(item._txAmount || 0) / Math.max(1, qty));
                            const itemDisc = Number(item.discount || item.item_discount || 0);
                            const discountVal = itemDisc > 0 ? itemDisc : Number(item._txDiscountAmount || 0);
                            const grossRow = qty * unitPrice;
                            const netRowAmount = Math.max(0, grossRow - discountVal);

                            const fullDate = fmtDate(item._txDate) || '';
                            const [displayDate, ...timeParts] = fullDate.split(', ');
                            const displayTime = timeParts.join(', ');

                            return (
                                <tr key={i} style={{ borderBottom: '1px solid var(--table-border-subtle)', minHeight: '48px', whiteSpace: 'nowrap' }}>
                                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                        <span style={{ display: 'block', color: 'var(--table-text-primary)', fontSize: '15px', fontWeight: '500' }}>{displayDate}</span>
                                        {displayTime && <span style={{ display: 'block', fontSize: '13px', color: 'var(--table-text-secondary)', fontWeight: '500' }}>{displayTime}</span>}
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: '15px', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>
                                        <CopyableText text={item._txReceipt} label="S.I./C.R./D.R." codeStyle={{ fontSize: '15px', color: 'var(--table-text-primary)', fontWeight: '600' }} />
                                    </td>
                                    <td style={{ padding: '12px 16px', color: 'var(--table-text-primary)', fontSize: '15px', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>{item.part_no || item.partNo || 'N/A'}</td>
                                    <td style={{ padding: '12px 16px', maxWidth: '140px', overflow: 'hidden' }}>
                                        <FormattedProductName name={item.name} blockVariant={true} />
                                    </td>
                                    <td style={{ padding: '12px 16px', color: 'var(--table-text-primary)', textAlign: 'center', fontSize: '15px', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>{qty}</td>
                                    <td style={{ padding: '12px 16px', color: 'var(--table-text-secondary)', textAlign: 'right', fontSize: '15px', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>{fmt(unitPrice)}</td>
                                    <td style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'right', color: amountColor, fontSize: '15px', fontVariantNumeric: 'tabular-nums' }}>{fmt(netRowAmount)}</td>
                                    <td style={{ padding: '12px 16px', color: 'var(--table-text-secondary)', fontSize: '15px', fontWeight: '500', whiteSpace: 'normal' }}>{item._txCustomer}</td>
                                    <td style={{ padding: '12px 16px', color: 'var(--table-text-secondary)', fontSize: '15px', fontWeight: '500' }}>{item._txPayment}</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right', color: discountVal > 0 ? '#2563EB' : 'var(--table-text-muted)', fontWeight: discountVal > 0 ? '600' : '500', fontSize: '15px', fontVariantNumeric: 'tabular-nums' }}>
                                        {discountVal > 0 ? `-${fmt(discountVal)}` : fmt(0)}
                                    </td>
                                    <td style={{ padding: '12px 16px', color: 'var(--table-text-secondary)', fontSize: '15px', fontWeight: '500' }}>{(item._txChecker || '—').split(' ')[0]}</td>
                                    <td style={{ padding: '12px 16px' }}><StatusBadge status={item._txStatus === 'Refund' || item._txStatus === 'Return' ? 'Completed' : item._txStatus} /></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
