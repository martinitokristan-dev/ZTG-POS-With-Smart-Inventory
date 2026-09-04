import { useState, useMemo, useEffect } from 'react';
import usePaginatedCache, { invalidateCachePage } from '../../../../shared/hooks/usePaginatedCache';
import echo from '../../../../lib/echo';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const fmt = (n) => `₱${Number(n || 0).toLocaleString('en-US')}`;

// Today's date in YYYY-MM-DD format for the backend date_from filter
const getTodayISO = () => new Date().toISOString().slice(0, 10);

export default function useDailySales() {
    const userStr = (sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'));
    const currentUser = userStr ? JSON.parse(userStr) : null;
    const isCashier = currentUser?.role === 'Cashier';
    const cashierId = isCashier ? currentUser?.id : null;

    // Filtering state (client-side search/time on top of paginated data)
    const [searchQuery, setSearchQuery] = useState('');
    const [timeFilter, setTimeFilter] = useState('Today');

    const formatLocalDate = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const queryParams = useMemo(() => {
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
        // If timeFilter === 'All', date_from & date_to remain empty, fetching all lifetime records

        const params = {
            status: 'Completed,Paid,Refund,Return,Pending',
            timeframe: timeFilter,
        };

        if (date_from) params.date_from = date_from;
        if (date_to) params.date_to = date_to;
        if (cashierId) params.cashier_id = cashierId;

        return params;
    }, [timeFilter, cashierId]);

    const { data: transactions, loading, page, setPage, pagination, refetch } = usePaginatedCache(
        `daily-sales-${cashierId || 'all'}-${timeFilter}`,
        '/transactions',
        queryParams
    );

    const handleTimeFilterChange = (val) => {
        setTimeFilter(val);
        setPage(1);
    };

    useEffect(() => {
        const token = (sessionStorage.getItem('auth_token') ?? localStorage.getItem('auth_token'));
        const userStr = (sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'));
        let channel = null;

        if (token && userStr) {
            const user = JSON.parse(userStr);
            const userRole = typeof user.role === 'object' ? (user.role.value || user.role.name) : user.role;
            if (['Admin', 'Supervisor', 'Cashier', 'Checker'].includes(userRole)) {
                channel = echo.private('transactions')
                    .listen('.TransactionCreated', (e) => {
                        invalidateCachePage(`daily-sales-${cashierId || 'all'}`, page);
                        refetch();
                    })
                    .listen('.TransactionUpdated', (e) => {
                        invalidateCachePage(`daily-sales-${cashierId || 'all'}`, page);
                        refetch();
                    });
            }
        }

        return () => {
            if (channel) {
                echo.leaveChannel('private-transactions');
            }
        };
    }, [refetch, page, cashierId]);

    // Exclude inventory/system/restock transactions, Voids, Pendings, and 100% fully refunded/returned transactions
    const EXCLUDED_STATUSES = new Set(['Restocked', 'Damaged', 'Security Alert', 'Void', 'Pending', 'Cancelled']);
    const flattenedItems = useMemo(() => {
        const result = [];
        const saleTransactions = transactions.filter(t => {
            if (EXCLUDED_STATUSES.has(t.status)) return false;
            // Strict security: if Cashier, strictly ensure the transaction cashier_id matches logged-in user
            if (cashierId && t.cashier_id && Number(t.cashier_id) !== Number(cashierId)) return false;
            if ((t.status === 'Refund' || t.status === 'Return') && t.is_partial_refund !== true && Number(t.amount || 0) <= 0) {
                return false;
            }
            return Number(t.amount || 0) > 0;
        });

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

                if (netQty <= 0) return;

                const resolvedName = item.product?.name || item.name || 'Unknown Product';
                const resolvedPartNo = item.product?.part_no || item.partNo || 'N/A';
                const resolvedBrand = item.product?.brand || item.brand || item.product?.parent?.brand;
                result.push({
                    ...item,
                    qty: netQty,
                    name: resolvedName,
                    part_no: resolvedPartNo,
                    brand: resolvedBrand,
                    _txDate: t.date || t.created_at,
                    _txReceipt: t.si_no || t.receipt_number,
                    _txCustomer: t.customer?.name || 'Guest',
                    _txCashier: t.cashier?.full_name || t.cashier?.name || 'Unknown',
                    _txChecker: t.checker?.name || '—',
                    _txPayment: t.payment_method || '—',
                    _txStatus: 'Completed',
                    _txId: t.id,
                    _rawTx: t
                });
            });
        });
        return result;
    }, [transactions, cashierId]);

    // Client-side search and time filter on top of paginated results
    const filteredItems = useMemo(() => {
        let items = flattenedItems;

        if (searchQuery.trim() !== '') {
            const q = searchQuery.toLowerCase();
            items = items.filter(item =>
                (item._txReceipt || '').toLowerCase().includes(q) ||
                (item._txCustomer || '').toLowerCase().includes(q) ||
                (item._txCashier || '').toLowerCase().includes(q) ||
                (item._txChecker || '').toLowerCase().includes(q) ||
                (item.name || '').toLowerCase().includes(q) ||
                (item.part_no || item.partNo || '').toLowerCase().includes(q)
            );
        }

        return items;
    }, [flattenedItems, searchQuery]);

    // Gross sales from unique Completed/Paid transactions in current page
    const grossSales = useMemo(() => {
        const seenIds = new Set();
        let total = 0;
        filteredItems.forEach(item => {
            if (!seenIds.has(item._txId) && (item._txStatus === 'Completed' || item._txStatus === 'Paid')) {
                seenIds.add(item._txId);
                const tx = transactions.find(t => t.id === item._txId);
                if (tx) total += parseFloat(tx.amount || 0);
            }
        });
        return total;
    }, [filteredItems, transactions]);

    return {
        loading,
        items: filteredItems,
        searchQuery, setSearchQuery,
        timeFilter, setTimeFilter: handleTimeFilterChange,
        grossSales,
        page, setPage, pagination,
        fmt,
        fmtDate
    };
}
