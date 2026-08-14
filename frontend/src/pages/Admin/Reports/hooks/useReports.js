import { useState, useEffect, useCallback } from 'react';
import api from '../../../../shared/api';
import { fetchReportsData, resetReportsCache } from '../../../../shared/hooks/useReportsCache';
import echo from '../../../../lib/echo';

const fmtDate = (d) => d ? new Date(d).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const fmt = (n) => `₱${Number(n || 0).toLocaleString('en-US')}`;

export default function useReports() {
    const [loading, setLoading] = useState(true);

    // Reports Data State
    const [salesSummary, setSalesSummary] = useState(null);
    const [productPerformance, setProductPerformance] = useState(null);
    const [refundVoidAnalysis, setRefundVoidAnalysis] = useState(null);
    const [customerLog, setCustomerLog] = useState([]);
    const [isReportGenerated, setIsReportGenerated] = useState(false);
    const [employees, setEmployees] = useState([]);

    // Global Date Range State (Defaults to Today)
    const getTodayStr = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    
    const todayStr = getTodayStr();
    
    const [startDate, setStartDate] = useState(todayStr);
    const [endDate, setEndDate] = useState(todayStr);

    const loadReports = useCallback(async () => {
        try {
            setLoading(true);
            const cachedStats = await fetchReportsData(startDate, endDate);

            setSalesSummary(cachedStats.salesSummary);
            setProductPerformance(cachedStats.productPerformance);
            setRefundVoidAnalysis(cachedStats.refundVoidAnalysis);
            setCustomerLog(cachedStats.customerLog);
            setIsReportGenerated(cachedStats.isReportGenerated);

            try {
                const empRes = await api.get('/employees');
                setEmployees(empRes.data || []);
            } catch (e) {
                // Ignore fallback
            }
        } catch (err) {
            console.error("Error loading reports:", err);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        loadReports();

        const token = localStorage.getItem('auth_token');
        const userStr = localStorage.getItem('auth_user');
        let channel = null;

        if (token && userStr) {
            const user = JSON.parse(userStr);
            const userRole = typeof user.role === 'object' ? (user.role.value || user.role.name) : user.role;
            if (['Admin', 'Supervisor', 'Cashier', 'Checker'].includes(userRole)) {
                channel = echo.private('transactions')
                    .listen('.TransactionCreated', () => {
                        resetReportsCache();
                        loadReports();
                    })
                    .listen('.TransactionUpdated', () => {
                        resetReportsCache();
                        loadReports();
                    });
            }
        }

        return () => {
            if (channel) {
                echo.leaveChannel('private-transactions');
            }
        };
    }, [loadReports, startDate, endDate]);

    return {
        loading,
        salesSummary,
        productPerformance,
        refundVoidAnalysis,
        customerLog,
        isReportGenerated,
        setIsReportGenerated,
        employees,
        startDate, setStartDate,
        endDate, setEndDate,
        fmt,
        fmtDate,
        refetchReports: () => {
            resetReportsCache();
            loadReports();
        }
    };
}
