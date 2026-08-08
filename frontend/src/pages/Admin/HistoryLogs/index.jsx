import React, { useEffect } from 'react';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import useHistoryLogs from './hooks/useHistoryLogs';
import HistoryTable from './views/HistoryTable';
import RefundModal from './modals/RefundModal';
import VoidModal from './modals/VoidModal';
import TransactionDetailsModal from './modals/TransactionDetailsModal';
import PayModal from './modals/PayModal';
import IOSSelect from '../../../shared/components/IOSSelect';

export default function HistoryLogs() {
    const hl = useHistoryLogs();

    // Close dropdowns on external click
    useEffect(() => {
        const handleClickOutside = () => {
            // We handled this directly inside the table component or we can broadcast an event
            // In a more complex app, we'd use a context or global state, but standard React state handles this well enough.
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    return (
        <div className="main-workspace-outer">

            <div className="main-workspace">
                <div className="top-bar">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <div>
                            <h1 style={{ fontSize: '20px', marginBottom: '2px' }}>History Logs</h1>
                            <div className="page-description" style={{ marginTop: '0', fontSize: '12px' }}>
                                System-wide audit trail — refunds, returns, voids, P.O. activities and all non-revenue events.
                            </div>
                        </div>
                    </div>
                </div>

                <div className="content-body">
                    <div style={{ marginBottom: '16px' }}>
                        <div className="table-filters" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', background: '#FFFFFF', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <div style={{ flex: '1', minWidth: '250px', position: 'relative' }}>
                                <svg style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: 'var(--text-muted)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                                </svg>
                                <input 
                                    type="text" 
                                    className="form-control form-control-sm" 
                                    placeholder="Search by S.I./C.I., customer, or cashier..." 
                                    style={{ paddingLeft: '44px' }} 
                                    value={hl.searchQuery}
                                    onChange={(e) => hl.setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div style={{ width: '150px' }}>
                                <IOSSelect
                                    value={hl.paymentFilter}
                                    onChange={(e) => hl.setPaymentFilter(e.target.value)}
                                    options={[
                                        { value: 'All', label: 'All Payment' },
                                        { value: 'Cash', label: 'Cash' },
                                        { value: 'GCash', label: 'GCash' },
                                        { value: 'Bank', label: 'Bank' }
                                    ]}
                                />
                            </div>
                            <button className="btn" style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)', fontWeight: '600', padding: '8px 16px', borderRadius: '6px', fontSize: '13px' }} onClick={() => hl.handleOpenRefund(null)}>
                                Refund / Return
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                            {['All', 'Refund', 'Return', 'Void', 'Reservation', 'Pending'].map(tab => (
                                <button 
                                    key={tab}
                                    className={`status-tab ${hl.activeTab === tab ? 'active' : ''}`}
                                    style={{ padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    onClick={() => hl.setActiveTab(tab)}
                                >
                                    {tab === 'Refund' && <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2.5" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
                                    {tab === 'Return' && <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2.5" style={{ flexShrink: 0 }}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>}
                                    {tab === 'Void' && <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2.5" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>}
                                    {tab === 'Reservation' && <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2.5" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>}
                                    {tab === 'Pending' && <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2.5" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                                    {tab === 'Pending' ? 'Pending Order' : tab}
                                </button>
                            ))}
                        </div>

                        <div style={{ marginTop: '12px', background: 'var(--primary-light)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '6px', padding: '10px 16px', fontSize: '11px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', flexShrink: 0, fill: 'none', stroke: 'currentColor', strokeWidth: '2' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            <span><strong>Business Activity Log:</strong> Records all business transactions — sales, refunds, returns, voids, restocks, and order releases.</span>
                        </div>
                    </div>

                    {hl.loading && hl.transactions.length === 0 ? (
                        <LoadingSpinner text="Loading history logs..." minHeight="400px" />
                    ) : hl.transactions.length > 0 ? (
                        <>
                            <HistoryTable 
                                transactions={hl.transactions} 
                                fmtDate={hl.fmtDate}
                                fmt={hl.fmt}
                                handleOpenRefund={hl.handleOpenRefund}
                                handleOpenVoid={hl.handleOpenVoid}
                                handleOpenView={hl.handleOpenView}
                                handleOpenPay={hl.handleOpenPay}
                            />
                            
                            {/* Pagination Controls */}
                            {hl.pagination && hl.pagination.last_page > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', background: 'var(--bg-card)', padding: '12px 24px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                        Showing page {hl.pagination.current_page} of {hl.pagination.last_page} ({hl.pagination.total} total records)
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button 
                                            className="btn btn-sm" 
                                            style={{ border: '1px solid var(--border)', background: '#fff' }}
                                            disabled={hl.page <= 1}
                                            onClick={() => hl.setPage(hl.page - 1)}
                                        >
                                            Previous
                                        </button>
                                        <button 
                                            className="btn btn-sm" 
                                            style={{ border: '1px solid var(--border)', background: '#fff' }}
                                            disabled={hl.page >= hl.pagination.last_page}
                                            onClick={() => hl.setPage(hl.page + 1)}
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            No transactions found matching your criteria.
                        </div>
                    )}
                </div>
            </div>

            <RefundModal 
                isOpen={hl.showRefundModal} 
                onClose={hl.handleCloseRefund} 
                transaction={hl.selectedTxForRefund} 
                onSubmit={hl.handleSubmitRefund} 
                fmtDate={hl.fmtDate}
                fmt={hl.fmt}
                onSearchTransaction={hl.handleSearchTransaction}
            />

            <VoidModal 
                isOpen={hl.showVoidModal} 
                onClose={hl.handleCloseVoid} 
                transaction={hl.selectedTxForVoid} 
                onSubmit={hl.handleVoid} 
                fmtDate={hl.fmtDate}
                fmt={hl.fmt}
            />

            <TransactionDetailsModal
                isOpen={hl.showViewModal}
                onClose={hl.handleCloseView}
                transaction={hl.selectedTxForView}
                fmtDate={hl.fmtDate}
                fmt={hl.fmt}
            />

            <PayModal 
                isOpen={hl.showPayModal} 
                onClose={hl.handleClosePay} 
                transaction={hl.selectedTxForPay} 
                onSubmit={hl.handlePaySubmit} 
                fmtDate={hl.fmtDate}
                fmt={hl.fmt}
            />
        </div>
    );
}
