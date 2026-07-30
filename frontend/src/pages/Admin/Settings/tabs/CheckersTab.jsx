import React from 'react';

export default function CheckersTab({ checkers, openEditChecker, openAddChecker }) {
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>Warehouse Checkers</h3>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>Manage the list of warehouse staff who check and fulfill items.</p>
                </div>
                <button type="button" className="btn btn-primary" onClick={openAddChecker} style={{ fontSize: '13px', padding: '8px 16px' }}>
                    + Add Checker
                </button>
            </div>
            
            <div className="card table-card">
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ borderBottom: '2px solid var(--table-border)', background: 'var(--table-header-bg)' }}>
                        <tr>
                            <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--table-text-secondary)', fontWeight: '600', letterSpacing: '0.02em' }}>Name</th>
                            <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--table-text-secondary)', fontWeight: '600', letterSpacing: '0.02em' }}>Status</th>
                            <th style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--table-text-secondary)', fontWeight: '600', letterSpacing: '0.02em', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody style={{ fontSize: '15px' }}>
                        {checkers.length === 0 ? (
                            <tr>
                                <td colSpan="3" style={{ padding: '24px', textAlign: 'center', color: 'var(--table-text-muted)', fontSize: '15px' }}>No checkers found.</td>
                            </tr>
                        ) : (
                            checkers.map((checker, idx) => {
                                const resolvedName = checker.name || checker.checker_name || '—';
                                return (
                                    <tr key={checker.id || idx} style={{ borderBottom: '1px solid var(--table-border-subtle)', minHeight: '48px' }}>
                                        <td style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--table-text-primary)', fontSize: '15px' }}>{resolvedName}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ 
                                                padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600',
                                                backgroundColor: (checker.status === 'Active' || !checker.status) ? '#DCFCE7' : '#F1F5F9',
                                                color: (checker.status === 'Active' || !checker.status) ? '#166534' : '#475569'
                                            }}>
                                                {checker.status || 'Active'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                            <button type="button" className="btn btn-secondary" onClick={() => openEditChecker(checker)} style={{ fontSize: '12px', padding: '6px 12px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--table-text-secondary)', fontWeight: '600' }}>
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
