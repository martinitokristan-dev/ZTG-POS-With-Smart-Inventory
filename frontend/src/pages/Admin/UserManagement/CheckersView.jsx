import React, { useState, useEffect } from 'react';
import TablePagination from '../../../shared/components/TablePagination';

/**
 * CheckersView — Warehouse Checkers management tab under User Management.
 */
export default function CheckersView({
    checkers = [],
    loading = false,
    searchQuery = '',
    onSearchChange,
    onAddChecker,
    onEditChecker,
    onToggleChecker,
}) {
    const [currentPage, setCurrentPage] = React.useState(1);
    const [perPage, setPerPage] = React.useState(10);
    const [openDropdownId, setOpenDropdownId] = useState(null);

    // Close actions dropdown on outside click
    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (!e.target.closest('.actions-dropdown-container')) {
                setOpenDropdownId(null);
            }
        };
        document.addEventListener('click', handleOutsideClick);
        return () => document.removeEventListener('click', handleOutsideClick);
    }, []);

    const filteredCheckers = React.useMemo(() => {
        if (!searchQuery.trim()) return checkers;
        const q = searchQuery.toLowerCase();
        return checkers.filter(
            (c) =>
                (c.name || c.checker_name || '').toLowerCase().includes(q) ||
                (c.status || '').toLowerCase().includes(q)
        );
    }, [checkers, searchQuery]);

    const paginatedCheckers = React.useMemo(() => {
        if (perPage === 'All') return filteredCheckers;
        const num = Number(perPage) || 10;
        const start = (currentPage - 1) * num;
        return filteredCheckers.slice(start, start + num);
    }, [filteredCheckers, currentPage, perPage]);

    return (
        <>
            {/* Toolbar Filter Card */}
            <div className="card" style={{ marginBottom: '16px' }}>
                <div className="table-filters" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                    {/* Search */}
                    <div style={{ flex: 1, minWidth: '240px', maxWidth: '420px', position: 'relative' }}>
                        <svg
                            style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: '#94A3B8' }}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                        >
                            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                        <input
                            type="text"
                            className="form-control table-search-input"
                            placeholder="Search checkers by name or status..."
                            value={searchQuery}
                            onChange={(e) => {
                                onSearchChange(e.target.value);
                                setCurrentPage(1);
                            }}
                            style={{ paddingLeft: '44px' }}
                        />
                    </div>

                    {/* Add Checker Button */}
                    <button
                        type="button"
                        onClick={onAddChecker}
                        className="btn btn-primary"
                    >
                        <span>Add Checker</span>
                    </button>
                </div>
            </div>

            {/* Table Card */}
            <div className="card table-card" style={{ overflow: 'visible', paddingBottom: '80px' }}>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table className="data-table" style={{ width: '100%', minWidth: '780px', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', borderBottom: '2px solid var(--table-border)', background: 'var(--table-header-bg)' }}>
                            <tr>
                                <th style={{ padding: '12px 16px', fontWeight: '600', width: '50%' }}>Checker Name</th>
                                <th style={{ padding: '12px 16px', fontWeight: '600', width: '30%' }}>Status</th>
                                <th style={{ padding: '12px 16px', fontWeight: '600', width: '20%', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={3} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        Loading checkers...
                                    </td>
                                </tr>
                            ) : paginatedCheckers.length === 0 ? (
                                <tr>
                                    <td colSpan={3} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No checkers found.
                                    </td>
                                </tr>
                            ) : (
                                paginatedCheckers.map((checker, idx) => {
                                    const resolvedName = checker.name || checker.checker_name || '—';
                                    const isBottomRow = idx >= paginatedCheckers.length - 2 && paginatedCheckers.length > 2;

                                    return (
                                        <tr
                                            key={checker.id || idx}
                                            style={{
                                                borderBottom: '1px solid var(--table-border-subtle, var(--border))',
                                                transition: 'background-color 0.15s ease',
                                                minHeight: '48px',
                                            }}
                                            className="hover:bg-slate-50"
                                        >
                                            {/* Name */}
                                            <td style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                                {resolvedName}
                                            </td>

                                            {/* Status Badge */}
                                            <td style={{ padding: '12px 16px' }}>
                                                <span
                                                    style={{
                                                        display: 'inline-block',
                                                        fontSize: '11.5px',
                                                        fontWeight: '600',
                                                        padding: '3px 8px',
                                                        borderRadius: '6px',
                                                        backgroundColor: checker.status === 'Active' || !checker.status ? '#DCFCE7' : '#F1F5F9',
                                                        color: checker.status === 'Active' || !checker.status ? '#166534' : '#64748B',
                                                    }}
                                                >
                                                    {checker.status || 'Active'}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                <div className="actions-cell-wrapper actions-collapse-compact">
                                                    {/* Inline Action Buttons (Ample Space) */}
                                                    <div className="actions-inline-group">
                                                        <button
                                                            type="button"
                                                            onClick={() => onEditChecker(checker)}
                                                            className="action-trigger-btn"
                                                            data-tooltip="Edit Checker"
                                                            aria-label="Edit Checker"
                                                        >
                                                            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                            </svg>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => onToggleChecker(checker)}
                                                            className="action-trigger-btn"
                                                            data-tooltip={checker.status === 'Active' || !checker.status ? "Deactivate Checker" : "Activate Checker"}
                                                            aria-label={checker.status === 'Active' || !checker.status ? "Deactivate Checker" : "Activate Checker"}
                                                            style={{ color: checker.status === 'Active' || !checker.status ? '#DC2626' : '#16A34A' }}
                                                        >
                                                            {checker.status === 'Active' || !checker.status ? (
                                                                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <circle cx="12" cy="12" r="10"></circle>
                                                                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                                                                </svg>
                                                            ) : (
                                                                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                                                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                                                </svg>
                                                            )}
                                                        </button>
                                                    </div>

                                                    {/* 3-Dots Dropdown (Transformed on Zoom) */}
                                                    <div className="actions-dropdown-group actions-dropdown-container">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOpenDropdownId(openDropdownId === checker.id ? null : checker.id);
                                                            }}
                                                            className="action-trigger-btn"
                                                            aria-label="More actions"
                                                            data-tooltip="More actions"
                                                        >
                                                            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                                                                <circle cx="12" cy="5" r="2"></circle>
                                                                <circle cx="12" cy="12" r="2"></circle>
                                                                <circle cx="12" cy="19" r="2"></circle>
                                                            </svg>
                                                        </button>

                                                        {openDropdownId === checker.id && (
                                                            <div
                                                                className="actions-dropdown-menu show"
                                                                style={{
                                                                    position: 'absolute',
                                                                    right: 0,
                                                                    ...(isBottomRow ? { bottom: 'calc(100% + 6px)', top: 'auto' } : { top: 'calc(100% + 6px)', bottom: 'auto' }),
                                                                    zIndex: 99999,
                                                                    minWidth: '150px',
                                                                }}
                                                            >
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setOpenDropdownId(null);
                                                                        onEditChecker(checker);
                                                                    }}
                                                                    className="actions-dropdown-item"
                                                                >
                                                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                                        <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                                    </svg>
                                                                    <span>Edit Checker</span>
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setOpenDropdownId(null);
                                                                        onToggleChecker(checker);
                                                                    }}
                                                                    className={`actions-dropdown-item ${checker.status === 'Active' || !checker.status ? 'disable' : 'enable'}`}
                                                                    style={{ color: checker.status === 'Active' || !checker.status ? '#DC2626' : '#16A34A' }}
                                                                >
                                                                    {checker.status === 'Active' || !checker.status ? (
                                                                        <>
                                                                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                                                                                <circle cx="12" cy="12" r="10"></circle>
                                                                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                                                                            </svg>
                                                                            <span>Deactivate</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                                                                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                                                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                                                            </svg>
                                                                            <span>Activate</span>
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            <TablePagination
                currentPage={currentPage}
                totalItems={filteredCheckers.length}
                perPage={perPage}
                onPageChange={setCurrentPage}
                onPerPageChange={(val) => {
                    setPerPage(val);
                    setCurrentPage(1);
                }}
                label="checkers"
            />
        </>
    );
}
