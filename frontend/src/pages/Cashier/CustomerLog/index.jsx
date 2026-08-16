import React from 'react';
import useCustomerLog from './hooks/useCustomerLog';
import CustomerDirectoryTable from './views/CustomerDirectoryTable';

export default function CustomerLog() {
    const cl = useCustomerLog();

    return (
        <div className="main-workspace-outer">

            <div className="main-workspace">
                <div className="top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '20px', marginBottom: '2px', color: 'var(--text-primary)' }}>Customer Log</h1>
                        <div className="page-description" style={{ marginTop: '0', fontSize: '13px', color: 'var(--text-secondary)' }}>View customer purchase history, contact details, and initial registration date.</div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>                    </div>
                </div>

                <div className="content-body" style={{ padding: '20px 24px', backgroundColor: '#F8FAFC', minHeight: 'calc(100vh - 120px)' }}>
                    
                    <div className="card table-card" style={{ background: '#FFFFFF', borderRadius: '10px', border: '1px solid var(--border)' }}>
                        <div className="table-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>Customer Directory</h3>
                            
                            <div style={{ position: 'relative', width: '300px' }}>
                                <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                </svg>
                                <input 
                                    type="text" 
                                    className="search-input" 
                                    placeholder="Search by name or number..." 
                                    style={{ width: '100%', padding: '10px 14px 10px 36px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                                    value={cl.searchQuery}
                                    onChange={(e) => cl.setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <CustomerDirectoryTable customers={cl.customers} loading={cl.loading} fmtDate={cl.fmtDate} />
                    </div>

                </div>
            </div>
            <style>{`
                .search-input:focus {
                    border-color: var(--primary) !important;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
                }
            `}</style>
        </div>
    );
}
