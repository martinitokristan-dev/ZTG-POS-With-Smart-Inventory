import React, { useState, useMemo, useEffect } from 'react';
import useSalesLog from './hooks/useSalesLog';
import SalesTable from './views/SalesTable';
import IOSSelect from '../../../shared/components/IOSSelect';
import TablePagination from '../../../shared/components/TablePagination';

export default function SalesLog() {
    const sl = useSalesLog();
    const [itemPage, setItemPage] = useState(1);
    const [perPage, setPerPage] = useState(20);

    // Reset pagination to page 1 when search or filters change
    useEffect(() => {
        setItemPage(1);
    }, [sl.searchQuery, sl.paymentFilter, sl.timeFilter, sl.cashierFilter, sl.sortFilter, sl.activeTab]);

    const totalItemsCount = sl.filteredItems.length;

    // Slice items for current page
    const displayedItems = useMemo(() => {
        if (perPage === 'All' || perPage === 'all' || perPage >= 999999) {
            return sl.filteredItems;
        }
        const numericLimit = Number(perPage) || 20;
        const startIndex = (itemPage - 1) * numericLimit;
        return sl.filteredItems.slice(startIndex, startIndex + numericLimit);
    }, [sl.filteredItems, itemPage, perPage]);

    return (
        <div className="main-workspace">
            <div className="top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '20px', marginBottom: '2px', color: 'var(--text-primary)' }}>Sales Log</h1>
                    <div className="page-description" style={{ marginTop: '0', fontSize: '13px', color: 'var(--text-secondary)' }}>Master administrative record of active completed sales.</div>
                </div>
            </div>

                <div className="content-body" style={{ padding: '20px 24px', backgroundColor: '#F8FAFC', minHeight: 'calc(100vh - 120px)' }}>
                    
                    {/* Metrics Grid */}
                    <div className="daily-sales-kpis" style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
                        <div className="card" style={{ padding: '16px 20px', background: '#FFFFFF', borderRadius: '10px', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '6px' }}>Total Transactions</div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{sl.metrics.totalTx}</div>
                        </div>
                        <div className="card" style={{ padding: '16px 20px', background: '#FFFFFF', borderRadius: '10px', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '6px' }}>Total Items Sold</div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{sl.metrics.totalItemsSold}</div>
                        </div>
                        <div className="card" style={{ padding: '16px 20px', background: '#FFFFFF', borderRadius: '10px', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '6px' }}>Total Net Sales</div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{sl.fmt(sl.metrics.totalSales)}</div>
                        </div>
                        <div className="card" style={{ padding: '16px 20px', background: '#FFFFFF', borderRadius: '10px', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '6px' }}>Average Sale</div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{sl.fmt(sl.metrics.avgSale)}</div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div style={{ marginBottom: '16px' }}>
                        <div className="table-filters" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', background: '#FFFFFF', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
                                <svg style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: 'var(--text-muted)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                                </svg>
                                <input 
                                    type="text" 
                                    className="form-control form-control-sm" 
                                    placeholder="Search by receipt #, customer, or cashier..." 
                                    style={{ paddingLeft: '44px' }} 
                                    value={sl.searchQuery}
                                    onChange={(e) => sl.setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div style={{ width: '150px' }}>
                                <IOSSelect
                                    value={sl.timeFilter}
                                    onChange={(e) => sl.setTimeFilter(e.target.value)}
                                    options={[
                                        { value: 'Today', label: 'Today' },
                                        { value: 'All', label: 'All Time' },
                                        { value: 'This Week', label: 'This Week' },
                                        { value: 'This Month', label: 'This Month' }
                                    ]}
                                />
                            </div>
                            <div style={{ width: '150px' }}>
                                <IOSSelect
                                    value={sl.cashierFilter}
                                    onChange={(e) => sl.setCashierFilter(e.target.value)}
                                    options={[{ value: 'All', label: 'All Cashiers' }, ...sl.cashiers.map(c => ({ value: c.id, label: c.name }))]}
                                />
                            </div>
                            <div style={{ width: '150px' }}>
                                <IOSSelect
                                    value={sl.paymentFilter}
                                    onChange={(e) => sl.setPaymentFilter(e.target.value)}
                                    options={[
                                        { value: 'All', label: 'All Payments' },
                                        { value: 'Cash', label: 'Cash' },
                                        { value: 'GCash', label: 'GCash' },
                                        { value: 'Bank Transfer', label: 'Bank Transfer' },
                                        { value: 'Cheque', label: 'Cheque' },
                                        { value: 'P.O. (Pending)', label: 'P.O. (Pending)' }
                                    ]}
                                />
                            </div>
                            <div style={{ width: '160px' }}>
                                <IOSSelect
                                    value={sl.sortFilter}
                                    onChange={(e) => sl.setSortFilter(e.target.value)}
                                    options={[
                                        { value: 'Transaction #', label: 'Transaction #' },
                                        { value: 'Date (Newest)', label: 'Date (Newest)' },
                                        { value: 'Date (Oldest)', label: 'Date (Oldest)' }
                                    ]}
                                />
                            </div>
                        </div>
                        
                        {/* Tabs */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                            {['All', 'Completed'].map(tab => (
                                <button 
                                    key={tab}
                                    className={`status-tab ${sl.activeTab === tab ? 'active' : ''}`}
                                    onClick={() => sl.setActiveTab(tab)}
                                    style={{
                                        padding: '8px 16px', borderRadius: '20px', 
                                        fontSize: '13px', fontWeight: '600', cursor: 'pointer'
                                    }}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    <SalesTable 
                        items={displayedItems} 
                        loading={sl.loading} 
                        fmt={sl.fmt} 
                        fmtDate={sl.fmtDate} 
                    />

                    {/* Standardized System Pagination Card */}
                    {!sl.loading && totalItemsCount > 0 && (
                        <TablePagination
                            currentPage={itemPage}
                            totalItems={totalItemsCount}
                            perPage={perPage}
                            onPageChange={(newPage) => setItemPage(newPage)}
                            onPerPageChange={(newLimit) => {
                                setPerPage(newLimit);
                                setItemPage(1);
                            }}
                            label="sales items"
                        />
                    )}

            </div>
        </div>
    );
}
