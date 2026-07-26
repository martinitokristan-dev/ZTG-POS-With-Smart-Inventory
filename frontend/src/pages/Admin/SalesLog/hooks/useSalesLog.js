import { useState, useMemo, useEffect } from 'react';
import usePaginatedCache from '../../../../shared/hooks/usePaginatedCache';
import echo from '../../../../lib/echo';
import api from '../../../../shared/api';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const fmt = (n) => `₱${Number(n || 0).toLocaleString('en-US')}`;

export default function useSalesLog() {
    const [searchQuery, setSearchQuery] = useState('');
    const [paymentFilter, setPaymentFilter] = useState('All');
    const [timeFilter, setTimeFilter] = useState('All');
    const [cashierFilter, setCashierFilter] = useState('All');
    const [sortFilter, setSortFilter] = useState('Transaction #');
    const [activeTab, setActiveTab] = useState('All');
    const [cashiers, setCashiers] = useState([]);

    useEffect(() => {
        const fetchCashiers = async () => {
            try {
                const res = await api.get('/employees');
                const list = res.data.filter(emp => emp.role === 'Cashier');
                setCashiers(list);
            } catch (err) {
                console.error("Failed to load cashiers:", err);
            }
        };
        fetchCashiers();
    }, []);
    const statusParam = activeTab === 'All' ? '' : 
        (activeTab === 'Refund' ? 'Refund,Return' : 
        (activeTab === 'Completed' ? 'Completed,Paid' : activeTab));
    const paymentParam = paymentFilter === 'All' ? '' : paymentFilter;
    const searchParam = searchQuery.trim();

    const queryParams = useMemo(() => {
        let sort_by = 'date';
        let sort_order = 'desc';

        if (sortFilter === 'Date (Oldest)') {
            sort_by = 'date';
            sort_order = 'asc';
        } else if (sortFilter === 'Transaction #') {
            sort_by = 'id';
            sort_order = 'desc';
        }

        let date_from = '';
        let date_to = '';
        const today = new Date();
        
        if (timeFilter === 'Today') {
            const dateStr = today.toISOString().split('T')[0];
            date_from = dateStr;
            date_to = dateStr;
        } else if (timeFilter === 'This Week') {
            const first = today.getDate() - today.getDay();
            const firstDay = new Date(today.setDate(first));
            date_from = firstDay.toISOString().split('T')[0];
            date_to = new Date().toISOString().split('T')[0];
        } else if (timeFilter === 'This Month') {
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            date_from = firstDay.toISOString().split('T')[0];
            date_to = new Date().toISOString().split('T')[0];
        }

        return {
            status: statusParam,
            payment_method: paymentParam,
            search: searchParam,
            sort_by,
            sort_order,
            date_from,
            date_to,
            cashier_id: cashierFilter === 'All' ? '' : cashierFilter
        };
    }, [statusParam, paymentParam, searchParam, sortFilter, timeFilter, cashierFilter]);

    const { data: transactions, loading, page, setPage, pagination, refetch } = usePaginatedCache('sales', '/transactions', queryParams);

    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        const userStr = localStorage.getItem('auth_user');
        let channel = null;

        if (token && userStr) {
            const user = JSON.parse(userStr);
            const userRole = typeof user.role === 'object' ? (user.role.value || user.role.name) : user.role;
            if (['Admin', 'Supervisor', 'Cashier', 'Checker'].includes(userRole)) {
                channel = echo.private('transactions')
                    .listen('.TransactionCreated', (e) => {
                        invalidateCachePage('sales', page);
                        refetch();
                    })
                    .listen('.TransactionUpdated', (e) => {
                        invalidateCachePage('sales', page);
                        refetch();
                    });
            }
        }

        return () => {
            if (channel) {
                echo.leaveChannel('private-transactions');
            }
        };
    }, [refetch, page]);

    // Flatten transactions into items to match the Sales Log mockup
    let flattenedItems = [];
    transactions.forEach(t => {
        const items = (t.items && t.items.length > 0) ? t.items : [{
            id: null,
            name: t.itemName || 'Transaction',
            partNo: 'N/A',
            qty: 1,
            price: t.amount,
            variant: ''
        }];
        items.forEach(item => {
            const resolvedName = item.product?.name || item.name || 'Unknown Product';
            const resolvedPartNo = item.product?.part_no || item.partNo || 'N/A';
            flattenedItems.push({
                ...item,
                name: resolvedName,
                part_no: resolvedPartNo,
                _txDate: t.date || t.created_at,
                _txReceipt: t.si_no || t.receipt_number,
                _txCustomer: t.customer?.name || 'Guest',
                _txCashier: t.cashier?.name || 'Unknown',
                _txChecker: t.checker?.name || '—',
                _txPayment: t.payment_method || '—',
                _txStatus: t.status,
                _txId: t.id
            });
        });
    });

    // We no longer filter client-side because backend handles it via usePaginatedCache
    let filteredItems = flattenedItems;

    // Dynamic Summary calculation
    const uniqueTxIds = new Set(filteredItems.map(item => item._txId));
    const uniqueTxs = transactions.filter(t => uniqueTxIds.has(t.id));

    let totalSales = 0;
    let totalRefunds = 0;
    let count = uniqueTxs.length;

    uniqueTxs.forEach(t => {
        if (t.status === 'Completed' || t.status === 'Paid') {
            totalSales += parseFloat(t.amount || 0);
        }
        if (t.status === 'Refund' || t.status === 'Return') {
            totalRefunds += parseFloat(t.amount || 0);
        }
    });

    const avgSale = count > 0 ? totalSales / count : 0;
    const metrics = { totalTx: count, totalSales, totalRefunds, avgSale };

    return {
        loading,
        transactions,
        filteredItems,
        totalSales,
        totalRefunds,
        count: pagination.total,
        page,
        setPage,
        pagination,
        
        searchQuery, setSearchQuery,
        paymentFilter, setPaymentFilter,
        timeFilter, setTimeFilter,
        cashierFilter, setCashierFilter,
        sortFilter, setSortFilter,
        activeTab, setActiveTab,
        metrics,
        fmt,
        fmtDate,
        cashiers
    };
}
