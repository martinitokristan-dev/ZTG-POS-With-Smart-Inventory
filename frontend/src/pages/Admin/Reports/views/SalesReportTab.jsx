import React, { useState, useMemo } from 'react';
import IOSDatePicker from '../../../../shared/components/IOSDatePicker';
import IOSSelect from '../../../../shared/components/IOSSelect';
import api from '../../../../shared/api';
import { resetReportsCache } from '../../../../shared/hooks/useReportsCache';
import { copySalesToClipboard, exportSalesToExcel, getItemDiscountAmount, calculateItemDiscountBreakdown } from '../../../../shared/utils/clientExcelExporter';
import StatusBadge from '../../../../shared/components/StatusBadge';
import { showToast } from '../../../../utils/toast';
import CopyableText from '../../../../shared/components/CopyableText';
import FormattedProductName from '../../../../shared/components/FormattedProductName';
import TablePagination from '../../../../shared/components/TablePagination';

export default function SalesReportTab({ salesSummary, employees = [], fmt, fmtDate, isReportGenerated, setIsReportGenerated, startDate, setStartDate, endDate, setEndDate }) {
    const [confirming, setConfirming] = useState(false);
    const [hasExported, setHasExported] = useState(false);
    const [copiedSalesCount, setCopiedSalesCount] = useState(null);
    const [isExportingExcel, setIsExportingExcel] = useState(false);
    const [selectedCashier, setSelectedCashier] = useState('All');
    const [selectedPayment, setSelectedPayment] = useState('All');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [modalError, setModalError] = useState('');
    const [reportPage, setReportPage] = useState(1);
    const [perPage, setPerPage] = useState(20);

    // Reset pagination when date or cashier/payment filters change
    React.useEffect(() => {
        setReportPage(1);
    }, [startDate, endDate, selectedCashier, selectedPayment]);

    // Extract unique Cashiers (users with Cashier role, excluding Admin role)
    const cashierOptions = useMemo(() => {
        const set = new Set();
        if (employees && employees.length > 0) {
            employees.forEach(emp => {
                const role = (emp.role || '').toLowerCase();
                if (role === 'cashier') {
                    const name = emp.full_name || emp.name;
                    if (name) set.add(name.trim());
                }
            });
        }
        if (salesSummary?.transactions) {
            salesSummary.transactions.forEach(tx => {
                if (tx.cashier) {
                    const role = (tx.cashier.role || '').toLowerCase();
                    if (role === 'cashier') {
                        const name = tx.cashier.full_name || tx.cashier.name;
                        if (name) set.add(name.trim());
                    }
                }
            });
        }
        return Array.from(set);
    }, [employees, salesSummary]);

    // Extract unique Payment methods
    const paymentOptions = useMemo(() => {
        const baseOptions = ['Cash', 'GCash', 'Bank Transfer', 'Cheque'];
        if (!salesSummary?.transactions) return baseOptions;
        const set = new Set(baseOptions);
        salesSummary.transactions.forEach(tx => {
            if (tx.payment_method && tx.payment_method !== 'P.O. (Pending)') {
                set.add(tx.payment_method);
            }
        });
        return Array.from(set);
    }, [salesSummary]);

    // Filter transactions based on selected Cashier and Payment method (Excluding restocks, system logs, pending orders, & full refunds/voids)
    const filteredTransactions = useMemo(() => {
        if (!salesSummary?.transactions) return [];
        return salesSummary.transactions.filter(tx => {
            if (tx.status === 'RESTOCKED' || tx.status === 'Restocked' || tx.type === 'system' || tx.type === 'restock' || (tx.si_no && tx.si_no.startsWith('INV-RESTOCK'))) {
                return false;
            }
            // Exclude pending/credit purchase orders (only show after payment/settlement)
            if (tx.status === 'Pending' || tx.status === 'Pending Order' || tx.payment_method === 'P.O. (Pending)') {
                return false;
            }
            // Exclude full refunds, returns, and voids from Sales Report (they remain in History Logs)
            const isFullDeduction = (tx.status === 'Refund' || tx.status === 'Return' || tx.status === 'Void') && tx.is_partial_refund !== true;
            if (isFullDeduction) {
                return false;
            }
            if (selectedCashier !== 'All') {
                const cashierName = tx.cashier?.full_name || tx.cashier?.name || '';
                if (cashierName !== selectedCashier) return false;
            }
            if (selectedPayment !== 'All') {
                const pm = tx.payment_method || '';
                if (!pm.includes(selectedPayment)) {
                    return false;
                }
            }
            return true;
        });
    }, [salesSummary, selectedCashier, selectedPayment]);

    // Calculate dynamic KPI metrics for filtered data
    const { kpiTotalRevenue, kpiTotalTransactions, kpiAvgTransaction, kpiTotalItemsSold } = useMemo(() => {
        let rev = 0;
        let itemsSold = 0;
        let validTxCount = 0;

        filteredTransactions.forEach(tx => {
            const isCompleted = ['Completed', 'Deposit', 'Paid'].includes(tx.status);
            const isPartialRefund = tx.is_partial_refund === true;

            if (isCompleted || isPartialRefund) {
                rev += Number(tx.amount || 0);
                validTxCount += 1;

                const itemsList = (tx.items && tx.items.length > 0) ? tx.items : null;
                if (itemsList) {
                    itemsList.forEach(it => {
                        // For partial refunds use net_qty (sold qty after returns)
                        const soldQty = isPartialRefund
                            ? Number(it.net_qty ?? Math.max(0, (it.qty || 0) - (it.refunded_qty || 0)))
                            : Number(it.qty || 0);
                        itemsSold += soldQty;
                    });
                } else {
                    itemsSold += Number(tx.total_qty || 1);
                }
            }
        });

        const netRev = Math.max(0, rev);
        const avg = validTxCount > 0 ? netRev / validTxCount : 0;
        return {
            kpiTotalRevenue: netRev,
            kpiTotalTransactions: validTxCount,
            kpiAvgTransaction: avg,
            kpiTotalItemsSold: itemsSold,
        };
    }, [filteredTransactions]);

    // Calculate flattened items and totals for filtered data
    const flattenedTransactionsItems = [];
    let totalQty = 0;
    let totalAmount = 0;
    let totalDiscountAmount = 0;

    if (filteredTransactions.length > 0) {
        filteredTransactions.forEach(tx => {
            const isPartialRefund = tx.is_partial_refund === true;
            const items = (tx.items && tx.items.length > 0) ? tx.items : [{
                id: null,
                name: tx.itemName || 'Transaction',
                partNo: 'N/A',
                qty: 1,
                price: tx.amount
            }];
            items.forEach(item => {
                // For partial refunds, show net qty sold (not original qty)
                const displayQty = isPartialRefund
                    ? Number(item.net_qty ?? Math.max(0, (item.qty || 0) - (item.refunded_qty || 0)))
                    : Number(item.qty || 1);

                // Omit items that have 0 remaining net quantity from sales report
                if (isPartialRefund && displayQty <= 0) {
                    return;
                }

                flattenedTransactionsItems.push({ ...item, tx, displayQty });

                // For full deductions (full refund, void): red negative row, excluded from totals
                const isFullDeduction = (tx.status === 'Refund' || tx.status === 'Return' || tx.status === 'Void') && !isPartialRefund;

                const breakdown = calculateItemDiscountBreakdown(item, tx);
                const unitPrice = breakdown.unitPrice;
                const discountVal = breakdown.totalDiscount;
                const netRowAmount = breakdown.discountedPrice;

                if (!isFullDeduction) {
                    totalQty += displayQty;
                    totalAmount += netRowAmount;
                    totalDiscountAmount += discountVal;
                }
            });
        });
    }

    const displayedReportItems = useMemo(() => {
        if (perPage === 'All' || perPage === 'all' || perPage >= 999999) {
            return flattenedTransactionsItems;
        }
        const numericLimit = Number(perPage) || 20;
        const startIndex = (reportPage - 1) * numericLimit;
        return flattenedTransactionsItems.slice(startIndex, startIndex + numericLimit);
    }, [flattenedTransactionsItems, reportPage, perPage]);

    const handleCopySales = async () => {
        if (flattenedTransactionsItems.length === 0) return;
        const res = await copySalesToClipboard(flattenedTransactionsItems);
        if (res.success) {
            setCopiedSalesCount(res.count);
            showToast(`✓ Copied ${res.count} sales ${res.count === 1 ? 'row' : 'rows'} for Excel! Paste with Ctrl+V.`);
            setHasExported(true);
            setTimeout(() => setCopiedSalesCount(null), 2500);
        } else {
            showToast(res.message, 'error');
        }
    };

    const handleExportSales = () => {
        if (flattenedTransactionsItems.length === 0) return;
        setIsExportingExcel(true);
        try {
            const res = exportSalesToExcel(flattenedTransactionsItems, { startDate, endDate });
            if (res.success) {
                showToast(`✓ ${res.message || 'Excel spreadsheet exported successfully!'}`);
                setHasExported(true);
            } else {
                showToast(res.message, 'error');
            }
        } catch (err) {
            showToast('Failed to export Excel file: ' + (err.message || err), 'error');
        } finally {
            setTimeout(() => setIsExportingExcel(false), 1500);
        }
    };

    const handleOpenConfirmModal = () => {
        setModalError('');
        setShowConfirmModal(true);
    };

    const handleConfirmReport = async () => {
        setModalError('');
        setConfirming(true);
        try {
            await api.post('/reports/mark-generated');
            resetReportsCache();
            setIsReportGenerated(true);
            showToast("Daily sales report confirmed successfully.", "success");
            setShowConfirmModal(false);
        } catch (err) {
            const serverMsg = err.response?.data?.message || err.response?.data?.error || err.message || "Failed to confirm report. Make sure you have Admin privileges.";
            setModalError(serverMsg);
        } finally {
            setConfirming(false);
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div className="table-filters" style={{ padding: 0, margin: 0, display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <IOSDatePicker value={startDate} onChange={e => setStartDate(e.target.value)} placeholder="Start Date" style={{ width: '140px' }} />
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>to</span>
                        <IOSDatePicker value={endDate} onChange={e => setEndDate(e.target.value)} placeholder="End Date" style={{ width: '140px' }} alignRight={true} />
                    </div>
                    <div style={{ width: '150px' }}>
                        <IOSSelect
                            value={selectedCashier}
                            onChange={e => setSelectedCashier(e.target.value)}
                            options={[{ value: 'All', label: 'All Cashiers' }, ...cashierOptions.map(name => ({ value: name, label: name }))]}
                        />
                    </div>
                    <div style={{ width: '150px' }}>
                        <IOSSelect
                            value={selectedPayment}
                            onChange={e => setSelectedPayment(e.target.value)}
                            options={[{ value: 'All', label: 'All Payments' }, ...paymentOptions.map(pm => ({ value: pm, label: pm }))]}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button 
                        id="copyDailySalesBtn"
                        className="btn" 
                        onClick={handleCopySales}
                        disabled={flattenedTransactionsItems.length === 0}
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            fontWeight: '700', 
                            fontSize: '13px', 
                            borderRadius: '8px', 
                            padding: '8px 18px',
                            background: 'var(--bg-card)',
                            border: copiedSalesCount !== null ? '1px solid #10B981' : '1px solid var(--border)',
                            color: copiedSalesCount !== null ? '#10B981' : 'var(--text-primary)',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            cursor: flattenedTransactionsItems.length === 0 ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                        title="Copy sales data directly to clipboard for Excel (Ctrl+V)"
                    >
                        {copiedSalesCount !== null ? (
                            <>
                                <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', fill: 'none', stroke: '#10B981', strokeWidth: 2.5 }}><polyline points="20 6 9 17 4 12"/></svg>
                                <span>Copied {copiedSalesCount} {copiedSalesCount === 1 ? 'row' : 'rows'}!</span>
                            </>
                        ) : (
                            <>
                                <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}>
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                                <span>Copy to Clipboard</span>
                            </>
                        )}
                    </button>

                    <button 
                        id="exportDailySalesBtn"
                        className="btn" 
                        onClick={handleExportSales}
                        disabled={flattenedTransactionsItems.length === 0 || isExportingExcel}
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            fontWeight: '700', 
                            fontSize: '13px', 
                            borderRadius: '8px', 
                            padding: '8px 18px',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-primary)',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            cursor: flattenedTransactionsItems.length === 0 ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                        title="Download formatted Excel spreadsheet (.xls / .xlsx)"
                    >
                        <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', fill: 'none', stroke: '#10B981', strokeWidth: 2 }}>
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        <span>{isExportingExcel ? 'Exporting...' : 'Export to Excel'}</span>
                    </button>

                    {isReportGenerated ? (
                        <button className="btn" style={{ background: '#E2E8F0', color: '#64748B', cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', borderRadius: '8px', padding: '8px 20px', border: 'none' }} disabled>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                            Report Confirmed
                        </button>
                    ) : (
                        <button 
                            className="btn btn-primary" 
                            onClick={handleOpenConfirmModal} 
                            disabled={confirming || !hasExported} 
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', 
                                borderRadius: '8px', padding: '8px 20px', 
                                background: (!hasExported) ? '#93C5FD' : 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', 
                                border: 'none', 
                                color: (!hasExported) ? '#EFF6FF' : '#FFFFFF',
                                cursor: (!hasExported || confirming) ? 'not-allowed' : 'pointer',
                                boxShadow: (!hasExported) ? 'none' : '0 4px 12px rgba(37,99,235,0.2)' 
                            }}
                            title={!hasExported ? "Please export Excel first to enable confirmation" : ""}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                            {confirming ? 'Confirming...' : 'Confirm Daily Report'}
                        </button>
                    )}
                </div>
            </div>

            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-label">Total Sales Revenue</div>
                    <div className="kpi-value">{salesSummary ? fmt(kpiTotalRevenue) : '₱0'}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Total Transactions</div>
                    <div className="kpi-value">{salesSummary ? kpiTotalTransactions : '0'}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Average Transaction</div>
                    <div className="kpi-value">{salesSummary ? fmt(kpiAvgTransaction) : '₱0'}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Total Items Sold</div>
                    <div className="kpi-value">{salesSummary ? kpiTotalItemsSold : '0'}</div>
                </div>
            </div>

            <div className="section-card">
                <div className="section-card-header">Sales Transactions</div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="reports-table data-table">
                        <thead style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', background: 'var(--table-header-bg)', borderBottom: '2px solid var(--table-border)', whiteSpace: 'nowrap' }}>
                            <tr>
                                <th style={{ padding: '10px 12px', fontWeight: '600' }}>Date</th>
                                <th style={{ padding: '10px 12px', fontWeight: '600' }}>S.I./C.R./D.R.</th>
                                <th style={{ padding: '10px 12px', fontWeight: '600' }}>Part No.</th>
                                <th style={{ padding: '10px 14px', fontWeight: '600' }}>Product</th>
                                <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: '600' }}>Qty</th>
                                <th style={{ padding: '10px 10px', textAlign: 'right', fontWeight: '600' }}>Price</th>
                                <th style={{ padding: '10px 10px', textAlign: 'right', fontWeight: '600' }}>Sales</th>
                                <th style={{ padding: '10px 12px', fontWeight: '600' }}>Customer Name</th>
                                <th style={{ padding: '10px 10px', fontWeight: '600' }}>Payment</th>
                                <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: '600' }}>Discount %</th>
                                <th style={{ padding: '10px 10px', textAlign: 'right', fontWeight: '600' }}>Discount</th>
                                <th style={{ padding: '10px 10px', fontWeight: '600' }}>Served By</th>
                                <th style={{ padding: '10px 12px', fontWeight: '600' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody style={{ fontSize: '14.5px' }}>
                            {flattenedTransactionsItems.length === 0 ? (
                                <tr>
                                    <td colSpan="13" style={{ textAlign: 'center', color: 'var(--table-text-muted)', fontSize: '15px' }}>
                                        No transactions found for the selected date range.
                                    </td>
                                </tr>
                            ) : (
                                displayedReportItems.map((item, i) => {
                                    const tx = item.tx || {};
                                    const isPartialRefund = tx.is_partial_refund === true;
                                    // Full deduction = refund/void with NO net sale remaining
                                    const isFullDeduction = (tx.status === 'Refund' || tx.status === 'Return' || tx.status === 'Void') && !isPartialRefund;
                                    const isPending = tx.status === 'Pending';

                                    // For partial refunds: show net sold qty, not original
                                    const displayQty = isPartialRefund
                                        ? Number(item.net_qty ?? Math.max(0, (item.qty || 0) - (item.refunded_qty || 0)))
                                        : Number(item.qty || 1);

                                    const amountColor = (isFullDeduction || isPending)
                                        ? 'var(--danger, #DC2626)'
                                        : 'var(--success, #16A34A)';
                                    const amountPrefix = isFullDeduction ? '- ' : '';
                                    const resolvedName = item.product?.name || item.name || 'Unknown Product';
                                    const resolvedPartNo = item.product?.part_no || item.partNo || 'N/A';
                                    const resolvedBrand = item.product?.brand || item.brand;
                                    const breakdown = calculateItemDiscountBreakdown(item, tx);
                                    const unitPrice = breakdown.unitPrice;
                                    const discountVal = breakdown.totalDiscount;
                                    const netRowAmount = breakdown.discountedPrice;
                                    const customerVal = tx.customer_name || tx.customer?.name || (tx.customer_id ? `Customer #${tx.customer_id}` : 'WALK-IN');
                                    const serveByVal = tx.checker?.name || tx.cashier?.full_name || tx.cashier?.name || '—';

                                     const fullDate = fmtDate(tx.date || tx.created_at) || '';
                                     const [displayDate, ...timeParts] = fullDate.split(', ');
                                     const displayTime = timeParts.join(', ');

                                     return (
                                         <tr key={`${tx.id}-${item.id || i}`} style={{ minHeight: '44px', whiteSpace: 'nowrap' }}>
                                             <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                                                 <span style={{ display: 'block', color: 'var(--table-text-primary)', fontSize: '14px', fontWeight: '500' }}>{displayDate}</span>
                                                 {displayTime && <span style={{ display: 'block', fontSize: '12px', color: 'var(--table-text-secondary)', fontWeight: '500' }}>{displayTime}</span>}
                                             </td>
                                            <td style={{ padding: '8px 12px', fontWeight: '600', color: 'var(--table-text-primary)', whiteSpace: 'nowrap', fontSize: '14px', fontVariantNumeric: 'tabular-nums' }}>
                                                <CopyableText text={tx.si_no || tx.receipt_number} label="SI Number" />
                                            </td>
                                            <td style={{ padding: '8px 12px', color: 'var(--table-text-primary)', fontWeight: '600', fontSize: '14px', fontVariantNumeric: 'tabular-nums' }}>{resolvedPartNo}</td>
                                            <td style={{ padding: '8px 14px', maxWidth: '220px', overflow: 'hidden' }}><span style={{ fontSize: '14px' }}><FormattedProductName name={resolvedName} variantOption={item.variant_option || item.variant || item.variantOption} brand={resolvedBrand} blockVariant={true} /></span></td>
                                            <td style={{ padding: '8px 8px', color: 'var(--table-text-primary)', textAlign: 'center', fontSize: '14px', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>{displayQty}</td>
                                            <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--table-text-secondary)', fontSize: '14px', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>
                                                {fmt(unitPrice)}
                                            </td>
                                            <td style={{ padding: '8px 10px', fontWeight: '600', textAlign: 'right', color: amountColor, fontSize: '14px', fontVariantNumeric: 'tabular-nums' }}>{amountPrefix}{fmt(netRowAmount)}</td>
                                            <td style={{ padding: '8px 12px', color: 'var(--table-text-primary)', fontWeight: '500', fontSize: '14px', whiteSpace: 'normal' }}>{customerVal}</td>
                                            <td style={{ padding: '8px 10px', fontWeight: tx.payment_method?.startsWith('P.O') ? '600' : '500', color: tx.payment_method?.startsWith('P.O') ? '#C00000' : 'var(--table-text-secondary)', fontSize: '14px' }}>{tx.payment_method || 'CASH'}</td>
                                            <td style={{ padding: '8px 8px', textAlign: 'center', color: breakdown.discountRate > 0 ? '#2563EB' : 'var(--table-text-muted)', fontWeight: breakdown.discountRate > 0 ? '600' : '500', fontSize: '14px', fontVariantNumeric: 'tabular-nums' }}>
                                                {breakdown.formattedRate}
                                            </td>
                                            <td style={{ padding: '8px 10px', textAlign: 'right', color: discountVal > 0 ? '#2563EB' : 'var(--table-text-muted)', fontWeight: discountVal > 0 ? '600' : '500', fontSize: '14px', fontVariantNumeric: 'tabular-nums' }}>
                                                {discountVal > 0 ? `-${fmt(discountVal)}` : '—'}
                                            </td>
                                            <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>{serveByVal.split(' ')[0]}</td>
                                            <td>
                                                <StatusBadge status={isPartialRefund ? 'Partial Refund' : tx.status} />
                                             </td>
                                         </tr>
                                     );
                                 })
                            )}
                        </tbody>
                        {flattenedTransactionsItems.length > 0 && (
                            <tfoot>
                                <tr style={{ borderTop: '2px solid var(--border)', background: '#F8FAFC' }}>
                                    <td style={{ fontWeight: '800', padding: '16px', color: 'var(--text-primary)' }}>Total:</td>
                                    <td></td>
                                    <td></td>
                                    <td></td>
                                    <td style={{ fontWeight: '800', padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>{totalQty}</td>
                                    <td></td>
                                    <td style={{ fontWeight: '800', padding: '16px', textAlign: 'right', color: 'var(--success, #16A34A)', fontSize: '15px' }}>{fmt(totalAmount)}</td>
                                    <td></td>
                                    <td></td>
                                    <td></td>
                                    <td style={{ fontWeight: '800', padding: '16px', textAlign: 'right', color: '#2563EB', fontSize: '15px' }}>
                                        {totalDiscountAmount > 0 ? `-${fmt(totalDiscountAmount)}` : fmt(0)}
                                    </td>
                                    <td></td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>

                {/* Standardized System Pagination Card */}
                {flattenedTransactionsItems.length > 0 && (
                    <div style={{ padding: '0 16px 16px 16px' }}>
                        <TablePagination
                            currentPage={reportPage}
                            totalItems={flattenedTransactionsItems.length}
                            perPage={perPage}
                            onPageChange={(newPage) => setReportPage(newPage)}
                            onPerPageChange={(newLimit) => {
                                setPerPage(newLimit);
                                setReportPage(1);
                            }}
                            label="sales items"
                        />
                    </div>
                )}
            </div>

            {/* Confirm Report Modal */}
            {showConfirmModal && (
                <div className="modal-overlay" style={{ zIndex: 999 }}>
                    <div className="modal-card" style={{ maxWidth: '480px', width: '92%', backgroundColor: '#FFFFFF', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', border: '1px solid #E2E8F0' }}>
                        <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                                </div>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0F172A' }}>Confirm Daily Sales Report</h3>
                            </div>
                            <button type="button" onClick={() => !confirming && setShowConfirmModal(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}>
                                <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'none', stroke: 'currentColor', strokeWidth: '2' }}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        
                        <div className="modal-body" style={{ padding: '24px' }}>
                            <p style={{ margin: '0 0 16px 0', fontSize: '13.5px', color: '#475569', lineHeight: '1.5' }}>
                                Are you sure you want to officially confirm today's daily sales report? This will mark today's audit log as verified and generated.
                            </p>

                            {modalError && (
                                <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: 'none', stroke: '#DC2626', strokeWidth: 2, flexShrink: 0 }}>
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" y1="8" x2="12" y2="12" />
                                        <line x1="12" y1="16" x2="12.01" y2="16" />
                                    </svg>
                                    <span>{modalError}</span>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer" style={{ padding: '16px 24px', backgroundColor: '#F8FAFC', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button 
                                type="button" 
                                className="btn" 
                                disabled={confirming}
                                onClick={() => setShowConfirmModal(false)} 
                                style={{ backgroundColor: '#FFFFFF', color: '#475569', border: '1px solid #CBD5E1', padding: '9px 18px', borderRadius: '8px', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                disabled={confirming}
                                onClick={handleConfirmReport}
                                style={{ 
                                    backgroundColor: '#2563EB', 
                                    color: '#FFFFFF', 
                                    border: 'none', 
                                    padding: '9px 20px', 
                                    borderRadius: '8px', 
                                    fontSize: '13.5px', 
                                    fontWeight: '600', 
                                    cursor: confirming ? 'not-allowed' : 'pointer',
                                    opacity: confirming ? 0.7 : 1,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                {confirming ? (
                                    <>
                                        <span style={{ width: '14px', height: '14px', border: '2px solid #FFF', borderRightColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.75s linear infinite' }}></span>
                                        Confirming...
                                    </>
                                ) : (
                                    'Confirm Report'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
