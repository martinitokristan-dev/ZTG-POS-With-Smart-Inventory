import React from 'react';
import useDailySales from './hooks/useDailySales';
import MySalesTable from './views/MySalesTable';
import IOSSelect from '../../../shared/components/IOSSelect';
import TablePagination from '../../../shared/components/TablePagination';

export default function DailySales() {
    const ds = useDailySales();

    return (
        <div className="main-workspace-outer">

            <div className="main-workspace">
                <div className="top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '20px', marginBottom: '2px', color: 'var(--text-primary)' }}>Sales Log</h1>
                        <div className="page-description" style={{ marginTop: '0', fontSize: '13px', color: 'var(--text-secondary)' }}>Revenue-impacting transactions from your sessions. Completed and refunded sales only.</div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>                    </div>
                </div>

                <div className="content-body" style={{ padding: '20px 24px', backgroundColor: 'var(--bg-canvas)', minHeight: 'calc(100vh - 120px)' }}>
                    
                    {/* Stat Cards Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', marginBottom: '24px' }}>
                        <div className="card stat-box" style={{ padding: '24px', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                            <div>
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Gross Sales Revenue</span>
                                <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{ds.fmt(ds.grossSales)}</div>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="card" style={{ marginBottom: '24px', background: 'var(--bg-card)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                        <div className="table-filters" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
                                <input 
                                    type="text" 
                                    className="form-control form-control-sm" 
                                    placeholder="Search customer, item, SI..." 
                                    style={{ height: '38px', padding: '8px 12px 8px 12px', fontSize: '13px', border: '1px solid var(--border)', borderRadius: '6px', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', width: '100%' }}
                                    value={ds.searchQuery}
                                    onChange={(e) => ds.setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div style={{ width: '160px' }}>
                                <IOSSelect
                                    value={ds.timeFilter}
                                    onChange={(e) => ds.setTimeFilter(e.target.value)}
                                    options={[
                                        { value: 'Today', label: 'Today' },
                                        { value: 'All', label: 'All Time' },
                                        { value: 'This Week', label: 'This Week' },
                                        { value: 'This Month', label: 'This Month' },
                                    ]}
                                />
                            </div>
                        </div>
                    </div>

                    <MySalesTable items={ds.items} loading={ds.loading} fmt={ds.fmt} fmtDate={ds.fmtDate} />

                    {/* Standardized System Pagination Card */}
                    {!ds.loading && (ds.pagination?.total > 0 || ds.items.length > 0) && (
                        <TablePagination
                            currentPage={ds.page}
                            totalItems={ds.pagination?.total || ds.items.length}
                            perPage={ds.pagination?.per_page || 20}
                            onPageChange={(newPage) => ds.setPage(newPage)}
                            label="sales records"
                        />
                    )}

                </div>
            </div>
        </div>
    );
}
