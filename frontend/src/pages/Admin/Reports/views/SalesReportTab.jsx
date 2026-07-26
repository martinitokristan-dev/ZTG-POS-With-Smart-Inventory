import React, { useState, useMemo } from 'react';
import IOSDatePicker from '../../../../shared/components/IOSDatePicker';
import IOSSelect from '../../../../shared/components/IOSSelect';
import api from '../../../../shared/api';
import { resetReportsCache } from '../../../../shared/hooks/useReportsCache';
import { exportSalesToExcel, getItemDiscountAmount } from '../../../../shared/utils/clientExcelExporter';
import StatusBadge from '../../../../shared/components/StatusBadge';
import { showToast } from '../../../../utils/toast';
import CopyableText from '../../../../shared/components/CopyableText';

export default function SalesReportTab({ salesSummary, employees = [], fmt, fmtDate, isReportGenerated, setIsReportGenerated, startDate, setStartDate, endDate, setEndDate }) {
    const [confirming, setConfirming] = useState(false);
    const [hasExported, setHasExported] = useState(false);
    const [selectedCashier, setSelectedCashier] = useState('All');
    const [selectedPayment, setSelectedPayment] = useState('All');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [modalError, setModalError] = useState('');

    // Extract unique Cashiers (users with Cashier role, excluding Admin role)
    const cashierOptions = useMemo(() => {
        const set = new Set();
        if (employees && employees.length > 0) {
            employees.forEach(emp => {
                const role = (emp.role || '').toLowerCase();
                if (role === 'cashier') {
                    const name = emp.real_name || emp.name;
                    if (name) set.add(name.trim());
                }
            });
        }
        if (salesSummary?.transactions) {
            salesSummary.transactions.forEach(tx => {
                if (tx.cashier) {
                    const role = (tx.cashier.role || '').toLowerCase();
                    if (role === 'cashier') {
                        const name = tx.cashier.real_name || tx.cashier.name;
                        if (name) set.add(name.trim());
                    }
                }
            });
        }
        return Array.from(set);
    }, [employees, salesSummary]);

    // Extract unique Payment methods
    const paymentOptions = useMemo(() => {
        const baseOptions = ['Cash', 'GCash', 'Bank Transfer', 'P.O. (Pending)', 'Split'];
        if (!salesSummary?.transactions) return baseOptions;
        const set = new Set(baseOptions);
        salesSummary.transactions.forEach(tx => {
            if (tx.payment_method) {
                if (tx.payment_method.startsWith('Split')) {
                    set.add('Split');
                } else {
                    set.add(tx.payment_method);
                }
            }
        });
        return Array.from(set);
    }, [salesSummary]);

    // Filter transactions based on selected Cashier and Payment method (Excluding restocks & system logs)
    const filteredTransactions = useMemo(() => {
        if (!salesSummary?.transactions) return [];
        return salesSummary.transactions.filter(tx => {
            if (tx.status === 'RESTOCKED' || tx.status === 'Restocked' || tx.type === 'system' || tx.type === 'restock' || (tx.si_no && tx.si_no.startsWith('INV-RESTOCK'))) {
                return false;
            }
            if (selectedCashier !== 'All') {
                const cashierName = tx.cashier?.real_name || tx.cashier?.name || '';
                if (cashierName !== selectedCashier) return false;
            }
            if (selectedPayment !== 'All') {
                const pm = tx.payment_method || '';
                if (selectedPayment === 'Split') {
                    if (!pm.startsWith('Split')) return false;
                } else if (!pm.includes(selectedPayment)) {
                    return false;
                }
            }
            return true;
        });
    }, [salesSummary, selectedCashier, selectedPayment]);

    // Calculate dynamic KPI metrics for filtered data (Net Revenue = ₱9,750 & Items Sold = 61)
    const { kpiTotalRevenue, kpiTotalTransactions, kpiAvgTransaction, kpiTotalItemsSold } = useMemo(() => {
        let rev = 0;
        let itemsSold = 0;
        let validTxCount = 0;

        filteredTransactions.forEach(tx => {
            if (tx.status === 'Completed' || tx.status === 'Pending') {
                rev += Number(tx.amount || 0);
                validTxCount += 1;

                const itemsList = (tx.items && tx.items.length > 0) ? tx.items : null;
                if (itemsList) {
                    itemsList.forEach(it => {
                        itemsSold += Number(it.qty || 0);
                    });
                } else {
                    itemsSold += Number(tx.total_qty || 1);
                }
            } else if (tx.status === 'Refund') {
                rev -= Number(tx.amount || 0);
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
            const items = (tx.items && tx.items.length > 0) ? tx.items : [{
                id: null,
                name: tx.itemName || 'Transaction',
                partNo: 'N/A',
                qty: 1,
                price: tx.amount
            }];
            items.forEach(item => {
                flattenedTransactionsItems.push({
                    ...item,
                    tx
                });

                const isDeduction = (tx.status === 'Refund' || tx.status === 'Return' || tx.status === 'Void');
                const unitPrice = Number(item.original_price || item.price || 0);
                const discountVal = getItemDiscountAmount(item, tx);
                const grossRowAmount = (item.qty || 1) * unitPrice;
                const netRowAmount = Math.max(0, grossRowAmount - discountVal);

                if (tx.status === 'Refund') {
                    totalAmount -= netRowAmount;
                } else if (!isDeduction) {
                    totalQty += (item.qty || 0);
                    totalAmount += netRowAmount;
                    totalDiscountAmount += discountVal;
                }
            });
        });
    }

    const handleExportCSV = () => {
        if (flattenedTransactionsItems.length === 0) return;
        exportSalesToCSV(flattenedTransactionsItems, { startDate, endDate });
        setHasExported(true);
    };

    const handleExportExcel = () => {
        if (flattenedTransactionsItems.length === 0) return;
        exportSalesToExcel(flattenedTransactionsItems, { startDate, endDate });
        setHasExported(true);
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
                    {/* Date Filters */}
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

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                        className="btn btn-success" 
                        onClick={handleExportExcel}
                        disabled={flattenedTransactionsItems.length === 0}
                        style={{ 
                            display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '13px', 
                            borderRadius: '8px', padding: '8px 20px', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', 
                            border: 'none', color: '#FFFFFF', boxShadow: '0 4px 12px rgba(5,150,105,0.3)',
                            cursor: flattenedTransactionsItems.length === 0 ? 'not-allowed' : 'pointer'
                        }}
                        title="Export formatted Excel report matching Daily Sales template"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        Export Excel
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
                    <table className="reports-table">
                        <thead>
                            <tr>
                                <th>DATE</th>
                                <th>S.I./C.I./D.R.</th>
                                <th>PART NO.</th>
                                <th>PRODUCT</th>
                                <th style={{ textAlign: 'center' }}>QTY</th>
                                <th style={{ textAlign: 'right' }}>PRICE</th>
                                <th style={{ textAlign: 'right' }}>SALES</th>
                                <th>CUSTOMER NAME</th>
                                <th>PAYMENT</th>
                                <th style={{ textAlign: 'center' }}>DISCOUNTED</th>
                                <th>SERVE BY</th>
                                <th>STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {flattenedTransactionsItems.length === 0 ? (
                                <tr>
                                    <td colSpan="12" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        No transactions found for the selected date range.
                                    </td>
                                </tr>
                            ) : (
                                flattenedTransactionsItems.map((item, i) => {
                                    const tx = item.tx || {};
                                    const isDeduction = (tx.status === 'Refund' || tx.status === 'Return' || tx.status === 'Void');
                                    const isPending = tx.status === 'Pending';
                                    const amountColor = (isDeduction || isPending) ? 'var(--danger, #DC2626)' : 'var(--success, #16A34A)';
                                    const amountPrefix = isDeduction ? '- ' : '';
                                    const resolvedName = item.product?.name || item.name || 'Unknown Product';
                                    const resolvedPartNo = item.product?.part_no || item.partNo || 'N/A';
                                    const qty = Number(item.qty || 1);
                                    const unitPrice = Number(item.original_price || item.price || 0);
                                    const discountVal = getItemDiscountAmount(item, tx);
                                    const grossRowAmount = qty * unitPrice;
                                    const netRowAmount = Math.max(0, grossRowAmount - discountVal);
                                    const customerVal = tx.customer_name || tx.customer?.name || (tx.customer_id ? `Customer #${tx.customer_id}` : 'WALK-IN');
                                    const serveByVal = tx.cashier?.real_name || tx.cashier?.name || tx.checker?.name || '—';

                                    return (
                                        <tr key={`${tx.id}-${item.id || i}`}>
                                            <td style={{ color: '#64748B', whiteSpace: 'nowrap' }}>{fmtDate(tx.date || tx.created_at)}</td>
                                            <td style={{ fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                                <CopyableText text={tx.si_no || tx.receipt_number} label="SI Number" />
                                            </td>
                                            <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontWeight: '600' }}>{resolvedPartNo}</td>
                                            <td><span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{resolvedName}</span></td>
                                            <td style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>{qty}</td>
                                            <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                                                {fmt(unitPrice)}
                                            </td>
                                            <td style={{ fontWeight: '700', textAlign: 'right', color: amountColor }}>{amountPrefix}{fmt(netRowAmount)}</td>
                                            <td style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{customerVal}</td>
                                            <td style={{ fontWeight: tx.payment_method?.startsWith('P.O') ? '700' : '400', color: tx.payment_method?.startsWith('P.O') ? '#C00000' : 'var(--text-secondary)' }}>{tx.payment_method || 'CASH'}</td>
                                            <td style={{ textAlign: 'center', color: discountVal > 0 ? '#2563EB' : '#94A3B8', fontWeight: discountVal > 0 ? '700' : '400' }}>
                                                {discountVal > 0 ? `-${fmt(discountVal)}` : '—'}
                                            </td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{serveByVal.split(' ')[0]}</td>
                                            <td><StatusBadge status={tx.status} /></td>
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
                                    <td style={{ fontWeight: '800', padding: '16px', textAlign: 'center', color: '#2563EB', fontSize: '13px' }}>
                                        {totalDiscountAmount > 0 ? `-${fmt(totalDiscountAmount)}` : '—'}
                                    </td>
                                    <td></td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
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
