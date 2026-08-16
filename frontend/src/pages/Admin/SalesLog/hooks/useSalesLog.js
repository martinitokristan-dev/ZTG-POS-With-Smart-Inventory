import { useState, useMemo, useEffect } from 'react';
import usePaginatedCache, { invalidateCachePage } from '../../../../shared/hooks/usePaginatedCache';
import echo from '../../../../lib/echo';
import api from '../../../../shared/api';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const fmt = (n) => `₱${Number(n || 0).toLocaleString('en-US')}`;

export default function useSalesLog() {
    const [searchQuery, setSearchQuery] = useState('');
    const [paymentFilter, setPaymentFilter] = useState('All');
    const [timeFilter, setTimeFilter] = useState('Today');
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

    const statusParam = activeTab === 'All' ? '' : 'Completed,Paid,Deposit,Refund,Return';
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

        const formatLocalDate = (d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        let date_from = '';
        let date_to = '';
        const now = new Date();
        
        if (timeFilter === 'Today') {
            const todayStr = formatLocalDate(now);
            date_from = todayStr;
            date_to = todayStr;
        } else if (timeFilter === 'This Week') {
            const dayOfWeek = now.getDay();
            const sunday = new Date(now);
            sunday.setDate(now.getDate() - dayOfWeek);
            date_from = formatLocalDate(sunday);
            date_to = formatLocalDate(now);
        } else if (timeFilter === 'This Month') {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            date_from = formatLocalDate(firstDay);
            date_to = formatLocalDate(now);
        }

        return {
            status: statusParam,
            type: 'sale,reservation',
            payment_method: paymentParam,
            search: searchParam,
            sort_by,
            sort_order,
            timeframe: timeFilter,
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

    // Exclude inventory/system/restock transactions, Voids, Pendings, and 100% fully refunded/returned transactions
    const EXCLUDED_STATUSES = new Set(['Restocked', 'Damaged', 'Security Alert', 'Void', 'Pending', 'Cancelled']);
    const saleTransactions = transactions.filter(t => {
        if (EXCLUDED_STATUSES.has(t.status)) return false;
        // Exclude fully refunded transactions (amount <= 0)
        if ((t.status === 'Refund' || t.status === 'Return') && t.is_partial_refund !== true && Number(t.amount || 0) <= 0) {
            return false;
        }
        return Number(t.amount || 0) > 0;
    });

    // Flatten transactions into items with net sold quantities
    let flattenedItems = [];
    saleTransactions.forEach(t => {
        const items = (t.items && t.items.length > 0) ? t.items : [{
            id: null,
            name: t.itemName || 'Transaction',
            partNo: 'N/A',
            qty: 1,
            price: t.amount,
            variant: ''
        }];
        items.forEach(item => {
            const rawQty = Number(item.qty || 1);
            const refundedQty = Number(item.refunded_qty || 0);
            const netQty = item.net_qty != null ? Number(item.net_qty) : Math.max(0, rawQty - refundedQty);

            // Skip items with 0 active sales remaining
            if (netQty <= 0) return;

            const resolvedName = item.product?.name || item.name || 'Unknown Product';
            const resolvedPartNo = item.product?.part_no || item.partNo || 'N/A';
            const rawPrice = Number(item.original_price || item.price || 0);
            const resolvedPrice = rawPrice > 0 ? rawPrice : (Number(t.amount || 0) / Math.max(1, netQty));
            
            flattenedItems.push({
                ...item,
                qty: netQty,
                price: resolvedPrice,
                name: resolvedName,
                part_no: resolvedPartNo,
                _txDate: t.date || t.created_at,
                _txReceipt: t.si_no || t.receipt_number,
                _txCustomer: t.customer?.name || 'Guest',
                _txCashier: t.cashier?.real_name || t.cashier?.name || 'Unknown',
                _txChecker: t.checker?.real_name || t.checker?.name || '—',
                _txPayment: t.payment_method || '—',
                _txStatus: 'Completed',
                _txAmount: t.amount,
                _txDiscountAmount: t.discount_amount,
                _txId: t.id
            });
        });
    });

    let filteredItems = flattenedItems;

    // Dynamic Summary calculation across active sales transactions
    const uniqueTxIds = new Set(filteredItems.map(item => item._txId));
    const uniqueTxs = transactions.filter(t => uniqueTxIds.has(t.id));

    let totalSales = 0;
    let totalItemsSold = 0;
    let count = uniqueTxs.length;

    uniqueTxs.forEach(t => {
        totalSales += parseFloat(t.amount || 0);
    });

    filteredItems.forEach(item => {
        totalItemsSold += Number(item.qty || 0);
    });

    const avgSale = count > 0 ? totalSales / count : 0;
    const metrics = { totalTx: count, totalSales, totalItemsSold, avgSale };

    return {
        loading,
        transactions,
        filteredItems,
        totalSales,
        totalItemsSold,
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
