import React, { useState } from 'react';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import useReports from './hooks/useReports';
import SalesReportTab from './views/SalesReportTab';
import ProductReportTab from './views/ProductReportTab';
import PaymentMethodsTab from './views/PaymentMethodsTab';

export default function Reports() {
    const rep = useReports();
    const [activeTab, setActiveTab] = useState('sales');

    return (
        <div className="main-workspace-outer">

            <div className="main-workspace">
                <div className="top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px', color: 'var(--text-primary)' }}>Reports</h1>
                        <div className="page-description" style={{ marginTop: '0', fontSize: '13px', color: 'var(--text-secondary)' }}>Sales trends, product performance, and payment method analytics.</div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>                    </div>
                </div>

                <div className="content-body" style={{ padding: '20px 24px', minHeight: 'calc(100vh - 120px)' }}>
                    
                    <div className="reports-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                        {[
                            { id: 'sales', label: 'Sales Report' },
                            { id: 'products', label: 'Product Report' },
                            { id: 'payments', label: 'Payment Methods' }
                        ].map(t => (
                            <button 
                                key={t.id}
                                className={`reports-tab-btn ${activeTab === t.id ? 'active' : ''}`} 
                                style={{ 
                                    padding: '9px 18px', 
                                    fontSize: '13px', 
                                    fontWeight: '600', 
                                    cursor: 'pointer', 
                                    borderRadius: '8px' 
                                }}
                                onClick={() => setActiveTab(t.id)}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {rep.loading ? (
                        <LoadingSpinner text="Loading reports data..." minHeight="200px" />
                    ) : (
                        <>
                            {activeTab === 'sales' && <SalesReportTab salesSummary={rep.salesSummary} employees={rep.employees} fmt={rep.fmt} fmtDate={rep.fmtDate} isReportGenerated={rep.isReportGenerated} setIsReportGenerated={rep.setIsReportGenerated} startDate={rep.startDate} setStartDate={rep.setStartDate} endDate={rep.endDate} setEndDate={rep.setEndDate} />}
                            {activeTab === 'products' && <ProductReportTab productPerformance={rep.productPerformance} refundVoidAnalysis={rep.refundVoidAnalysis} startDate={rep.startDate} setStartDate={rep.setStartDate} endDate={rep.endDate} setEndDate={rep.setEndDate} />}
                            {activeTab === 'payments' && <PaymentMethodsTab salesSummary={rep.salesSummary} employees={rep.employees} fmt={rep.fmt} startDate={rep.startDate} setStartDate={rep.setStartDate} endDate={rep.endDate} setEndDate={rep.setEndDate} />}
                        </>
                    )}
                </div>
            </div>
            <style>{`
                .reports-tab-btn:hover { color: var(--text-primary); }
                .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 20px; }
                .kpi-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 16px 18px; transition: border-top 0.2s ease; }
                .kpi-label { font-size: 12px; color: var(--text-secondary); font-weight: 500; margin-bottom: 6px; }
                .kpi-value { font-size: 24px; font-weight: 700; color: var(--text-primary); line-height: 1.2; font-variant-numeric: tabular-nums; }
                .reports-table { width: 100%; border-collapse: collapse; }
                .reports-table th { font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-secondary); font-weight: 600; padding: 14px 16px; border-bottom: 1px solid var(--border); text-align: left; background: var(--bg-secondary); }
                .reports-table td { font-size: 14px; color: var(--text-primary); font-weight: 500; padding: 14px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
                .reports-table tbody tr:hover td { background-color: var(--bg-secondary); }
                .section-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; margin-bottom: 20px; overflow: hidden; }
                .section-card-header { padding: 16px 20px; border-bottom: 1px solid var(--border); font-size: 15px; font-weight: 700; color: var(--text-primary); background: var(--bg-card); }
                @media (max-width: 768px) {
                    .kpi-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
                    .reports-tabs { overflow-x: auto !important; white-space: nowrap !important; scrollbar-width: none !important; }
                    .reports-tabs::-webkit-scrollbar { display: none !important; }
                    .reports-tab-btn { padding: 8px 12px !important; font-size: 13px !important; flex-shrink: 0 !important; }
                }
            `}</style>
        </div>
    );
}
