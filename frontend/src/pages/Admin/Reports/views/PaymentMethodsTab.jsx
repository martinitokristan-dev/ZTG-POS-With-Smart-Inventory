import React, { useState, useMemo } from 'react';
import IOSDatePicker from '../../../../shared/components/IOSDatePicker';
import IOSSelect from '../../../../shared/components/IOSSelect';

export default function PaymentMethodsTab({ salesSummary, employees = [], fmt, startDate, setStartDate, endDate, setEndDate }) {
    const [selectedCashier, setSelectedCashier] = useState('All');

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

    // Filter transactions by selected Cashier
    const filteredTransactions = useMemo(() => {
        if (!salesSummary?.transactions) return [];
        return salesSummary.transactions.filter(tx => {
            if (selectedCashier !== 'All') {
                const cashierName = tx.checker?.name || tx.cashier?.name || '';
                if (cashierName !== selectedCashier) return false;
            }
            return true;
        });
    }, [salesSummary, selectedCashier]);

    // Compute payment methods breakdown dynamically based on cashier filter
    const { methods, totalRev } = useMemo(() => {
        if (selectedCashier === 'All') {
            return {
                methods: salesSummary?.revenue_by_payment || [],
                totalRev: salesSummary?.total_revenue || 0,
            };
        }

        const pmMap = new Map();
        let total = 0;

        filteredTransactions.forEach(tx => {
            if (tx.status === 'Completed' || tx.status === 'Pending') {
                const pm = tx.payment_method 
                    ? (tx.payment_method.startsWith('Split') ? 'Split' : (tx.payment_method.startsWith('Cheque') ? 'Cheque' : tx.payment_method))
                    : 'Other';
                const current = pmMap.get(pm) || { name: pm, amount: 0, count: 0 };
                current.amount += Number(tx.amount || 0);
                current.count += 1;
                pmMap.set(pm, current);
                total += Number(tx.amount || 0);
            }
        });

        const sortedMethods = Array.from(pmMap.values()).sort((a, b) => b.amount - a.amount);
        return { methods: sortedMethods, totalRev: total };
    }, [salesSummary, selectedCashier, filteredTransactions]);

    const handleExportCSV = () => {
        if (methods.length === 0) return;
        const headers = ["Payment Method", "Transactions", "Total Amount", "% of Total Sales"];
        const rows = [headers.join(",")];

        methods.forEach(m => {
            const percentage = totalRev > 0 ? ((m.amount / totalRev) * 100).toFixed(1) : 0;
            rows.push([`"${m.name}"`, m.count, m.amount, `"${percentage}%"`].join(","));
        });

        const csvContent = "data:text/csv;charset=utf-8," + rows.join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Payment_Methods_Report_${startDate}_to_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
                    <div style={{ width: '160px' }}>
                        <IOSSelect
                            value={selectedCashier}
                            onChange={e => setSelectedCashier(e.target.value)}
                            options={[{ value: 'All', label: 'All Cashiers' }, ...cashierOptions.map(name => ({ value: name, label: name }))]}
                        />
                    </div>
                </div>
                <button 
                    className="btn btn-success" 
                    onClick={handleExportCSV}
                    disabled={methods.length === 0}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}
                >
                    <svg viewBox="0 0 24 24" style={{ width: '15px', height: '15px', fill: 'none', stroke: '#fff', strokeWidth: '2.5' }}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                    Export CSV
                </button>
            </div>

            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {methods.map((m, i) => (
                    <div key={i} className="kpi-card">
                        <div className="kpi-label">{m.name}</div>
                        <div className="kpi-value">{fmt(m.amount)}</div>
                        <div className="kpi-trend neutral">{m.count} {m.count === 1 ? 'transaction' : 'transactions'}</div>
                    </div>
                ))}
            </div>

            <div className="section-card">
                <div className="section-card-header">Payment Methods Breakdown</div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="reports-table data-table">
                        <thead style={{ fontSize: '13px', color: 'var(--table-text-secondary)', background: 'var(--table-header-bg)', borderBottom: '2px solid var(--table-border)' }}>
                            <tr>
                                <th style={{ fontWeight: '600', letterSpacing: '0.02em' }}>Payment Method</th>
                                <th style={{ textAlign: 'right', fontWeight: '600', letterSpacing: '0.02em' }}>Transactions</th>
                                <th style={{ textAlign: 'right', fontWeight: '600', letterSpacing: '0.02em' }}>Total Amount</th>
                                <th style={{ textAlign: 'right', fontWeight: '600', letterSpacing: '0.02em' }}>% of Total Sales</th>
                            </tr>
                        </thead>
                        <tbody style={{ fontSize: '15px' }}>
                            {methods.length === 0 ? (
                                <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--table-text-muted)', fontSize: '15px' }}>No payment methods found for the selected date range.</td></tr>
                            ) : methods.map((m, i) => {
                                const percentage = totalRev > 0 ? ((m.amount / totalRev) * 100).toFixed(1) : 0;
                                return (
                                    <tr key={i} style={{ minHeight: '48px' }}>
                                        <td style={{ fontSize: '15px', fontWeight: '600', color: 'var(--table-text-primary)' }}>
                                            <strong>{m.name}</strong>
                                            {i === 0 && m.amount > 0 && <span className="badge badge-success" style={{ marginLeft: '8px' }}>Top</span>}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: '600', fontSize: '15px', fontVariantNumeric: 'tabular-nums' }}>{m.count}</td>
                                        <td style={{ fontWeight: '600', textAlign: 'right', fontSize: '15px', fontVariantNumeric: 'tabular-nums' }}>{fmt(m.amount)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: '600', fontSize: '15px', fontVariantNumeric: 'tabular-nums' }}>{percentage}%</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr style={{ background: 'var(--table-header-bg)', fontWeight: '600', borderTop: '2px solid var(--table-border)', fontSize: '15px' }}>
                                <td style={{ padding: '14px 16px', fontWeight: '600', color: 'var(--table-text-primary)' }}>Total</td>
                                <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>{methods.reduce((sum, m) => sum + m.count, 0)}</td>
                                <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>{fmt(methods.reduce((sum, m) => sum + m.amount, 0))}</td>
                                <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>{totalRev > 0 ? '100%' : '—'}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}
