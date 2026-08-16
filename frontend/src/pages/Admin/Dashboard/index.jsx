import React from 'react';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import { useDashboard } from './hooks/useDashboard';

import StatCards from './views/StatCards';
import SalesTrendChart from './views/SalesTrendChart';
import CriticalStockAlerts from './views/CriticalStockAlerts';
import TopSellingTable from './views/TopSellingTable';

export default function Dashboard() {
    const {
        name,
        loading,
        currentTimeRange,
        setCurrentTimeRange,
        stats,
        topProducts
    } = useDashboard();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div className="dashboard-top-bar" style={{
                minHeight: 60,
                height: 'auto',
                backgroundColor: '#FFFFFF',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                flexShrink: 0,
            }}>
                <div>
                    <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.3px', margin: 0 }}>
                        Good morning, {name}
                    </h1>
                    <p style={{ color: '#64748B', fontSize: 13, marginTop: 2, margin: '2px 0 0' }}>
                        You're signed in as <strong style={{ color: '#0F172A' }}>Admin</strong>. Here's your store at a glance.
                    </p>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

                <div className="dashboard-time-pills" style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: 8,
                    overflowX: 'auto',
                    padding: '4px 0 8px 0',
                    width: '100%',
                    minHeight: '44px',
                    whiteSpace: 'nowrap',
                    WebkitOverflowScrolling: 'touch',
                    scrollbarWidth: 'none',
                    flexShrink: 0
                }}>
                    {['Today', 'This Week', 'This Month', 'This Year'].map(range => (
                        <button
                            key={range}
                            onClick={() => setCurrentTimeRange(range)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: 9999,
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                backgroundColor: currentTimeRange === range ? '#3B82F6' : '#FFFFFF',
                                color: currentTimeRange === range ? '#FFFFFF' : '#64748B',
                                border: currentTimeRange === range ? '1px solid #3B82F6' : '1px solid #E2E8F0',
                                boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
                                flexShrink: 0,
                                height: '36px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            {range}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <LoadingSpinner text="Loading dashboard data..." fullPage={true} />
                ) : (
                    <>
                        <StatCards stats={stats} currentTimeRange={currentTimeRange} />

                        <div className="dashboard-charts-grid" style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: 24,
                            alignItems: 'stretch'
                        }}>
                            <div className="sales-trend-span" style={{ gridColumn: 'span 3', minWidth: 0 }}>
                                <SalesTrendChart last7Days={stats.last7Days || []} timeRange={currentTimeRange} />
                            </div>
                            <div className="alerts-span" style={{ gridColumn: 'span 1', minWidth: 0 }}>
                                <CriticalStockAlerts />
                            </div>
                        </div>

                        <TopSellingTable topProducts={topProducts} />
                    </>
                )}
            </div>
        </div>
    );
}
