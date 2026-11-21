import React from 'react';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import SegmentedControl from '../../../shared/components/SegmentedControl';
import { useDashboard } from './hooks/useDashboard';
import useSystemSettings from '../../../shared/hooks/useSystemSettings';

import StatCards from './views/StatCards';
import SalesTrendChart from './views/SalesTrendChart';
import CriticalStockAlerts from './views/CriticalStockAlerts';
import TopSellingTable from './views/TopSellingTable';
import TopCategoriesCard from './views/TopCategoriesCard';

export default function Dashboard() {
    const {
        name,
        role,
        loading,
        currentTimeRange,
        setCurrentTimeRange,
        stats,
        topProducts,
        criticalItems
    } = useDashboard();
    const { show_alerts_on_dashboard } = useSystemSettings();

    const timeRanges = ['Today', 'This Week', 'This Month', 'This Year'];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', backgroundColor: 'var(--bg-canvas)' }}>
            <style>
                {`
                .dashboard-header-container {
                    background-color: var(--bg-card);
                    border-bottom: 1px solid var(--border);
                    display: grid;
                    grid-template-columns: 1fr auto 1fr;
                    align-items: center;
                    padding: 16px 24px;
                    flex-shrink: 0;
                    gap: 16px;
                    box-sizing: border-box;
                    width: 100%;
                }
                .dashboard-header-greeting {
                    min-width: 0;
                    text-align: left;
                }
                .dashboard-header-filter {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    justify-self: center;
                    min-width: 0;
                }
                .dashboard-header-spacer {
                    min-width: 0;
                }
                @media (max-width: 1150px) {
                    .dashboard-header-container {
                        grid-template-columns: 1fr;
                        gap: 12px;
                        padding: 16px 20px;
                    }
                    .dashboard-header-greeting {
                        max-width: calc(100% - 130px);
                    }
                    .dashboard-header-filter {
                        justify-content: flex-start;
                        justify-self: start;
                        width: 100%;
                        overflow-x: auto;
                        -webkit-overflow-scrolling: touch;
                        scrollbar-width: none;
                        -ms-overflow-style: none;
                    }
                    .dashboard-header-filter::-webkit-scrollbar {
                        display: none;
                    }
                    .dashboard-header-spacer {
                        display: none;
                    }
                }
                @media (max-width: 768px) {
                    .dashboard-header-container {
                        padding: 14px 16px;
                        gap: 12px;
                    }
                    .dashboard-header-greeting {
                        padding-right: 0;
                    }
                }
                .dashboard-grid-row {
                    display: grid;
                    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
                    gap: 24px;
                    align-items: stretch;
                }
                @media (max-width: 1024px) {
                    .dashboard-grid-row {
                        grid-template-columns: 1fr;
                        gap: 20px;
                    }
                }
                `}
            </style>

            {/* Header: 3-column CSS grid on desktop (greeting on left, centered period filter, empty spacer for global bell on right) */}
            <div className="dashboard-header-container">
                {/* Column 1: Greeting + subtitle (left-aligned) */}
                <div className="dashboard-header-greeting">
                    <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px', margin: 0 }}>
                        Good morning, {name}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '3px 0 0 0' }}>
                        Signed in as <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{role}</strong> · Here's your store at a glance.
                    </p>
                </div>

                {/* Column 2: Period filter (centered horizontally in header) */}
                <div className="dashboard-header-filter">
                    <SegmentedControl
                        options={timeRanges.map(r => ({ value: r, label: r }))}
                        value={currentTimeRange}
                        onChange={setCurrentTimeRange}
                        ariaLabel="Time period filter"
                    />
                </div>

                {/* Column 3: Empty spacer (where global fixed bell sits) */}
                <div className="dashboard-header-spacer" aria-hidden="true" />
            </div>

            {/* Main Content Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
                {loading ? (
                    <LoadingSpinner text="Loading dashboard data..." fullPage={true} />
                ) : (
                    <>
                        {/* 1. Stat Strip: 1 card, 4 columns */}
                        <StatCards
                            stats={stats}
                            currentTimeRange={currentTimeRange}
                            criticalItems={criticalItems}
                        />

                        {/* 2. Row 1: Sales Trend (2/3) + Restock Queue (1/3) */}
                        <div className="dashboard-grid-row">
                            <div style={{ minWidth: 0, height: '100%', minHeight: 0 }}>
                                <SalesTrendChart last7Days={stats.last7Days || []} timeRange={currentTimeRange} />
                            </div>
                            {show_alerts_on_dashboard ? (
                                <div style={{ minWidth: 0, height: '100%', minHeight: 0 }}>
                                    <CriticalStockAlerts criticalItems={criticalItems} />
                                </div>
                            ) : null}
                        </div>

                        {/* 3. Row 2: Top Selling Products (2/3) + Top Categories (1/3) */}
                        <div className="dashboard-grid-row">
                            <div style={{ minWidth: 0 }}>
                                <TopSellingTable topProducts={topProducts} timeRange={currentTimeRange} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <TopCategoriesCard topCategories={stats.topCategories || []} />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
