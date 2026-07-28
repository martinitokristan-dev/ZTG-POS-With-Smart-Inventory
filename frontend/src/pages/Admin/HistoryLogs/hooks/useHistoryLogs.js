import { useState, useMemo, useEffect, useCallback } from 'react';
import api from '../../../../shared/api';
import { showToast } from '../../../../utils/toast';
import usePaginatedCache, { invalidateCachePage } from '../../../../shared/hooks/usePaginatedCache';
import echo from '../../../../lib/echo';
import { resetDashboardCache } from '../../../../shared/hooks/useDashboardCache';
import { resetReportsCache } from '../../../../shared/hooks/useReportsCache';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const fmt = (n) => `₱${Number(n || 0).toLocaleString('en-US')}`;

export default function useHistoryLogs() {
    // Filtering
    const [activeTab, setActiveTab] = useState('All'); // All, Refund, Return, Void, Reservation
    const [searchQuery, setSearchQuery] = useState('');
    const [paymentFilter, setPaymentFilter] = useState('All');
    const [txTypeFilter, setTxTypeFilter] = useState(''); // '' = all types, 'reservation' = reservations only
    
    // Modal states
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [selectedTxForRefund, setSelectedTxForRefund] = useState(null);

    const [showVoidModal, setShowVoidModal] = useState(false);
    const [selectedTxForVoid, setSelectedTxForVoid] = useState(null);

    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedTxForView, setSelectedTxForView] = useState(null);

    const [showPayModal, setShowPayModal] = useState(false);
    const [selectedTxForPay, setSelectedTxForPay] = useState(null);

    // Map UI states to backend API query params
    // 'Reservation' tab sets tx_type=reservation and clears status; other tabs filter by status
    const isReservationTab = activeTab === 'Reservation';
    const statusParam = (activeTab === 'All' || isReservationTab) ? '' : activeTab;
    const txTypeParam  = isReservationTab ? 'reservation' : (txTypeFilter || '');
    const paymentParam = paymentFilter === 'All' ? '' : paymentFilter;
    const searchParam  = searchQuery.trim();

    const queryParams = useMemo(() => ({
        status:         statusParam,
        tx_type:        txTypeParam,
        payment_method: paymentParam,   // was incorrectly sent as 'type' — fixed to match backend key
        search:         searchParam,
    }), [statusParam, txTypeParam, paymentParam, searchParam]);

    const { data: transactions, loading, page, setPage, pagination, refetch } = usePaginatedCache('history', '/transactions', queryParams);

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
                        invalidateCachePage('history', page);
                        refetch();
                    })
                    .listen('.TransactionUpdated', (e) => {
                        invalidateCachePage('history', page);
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

    const loadHistory = () => {
        invalidateCachePage('history', page);
        invalidateCachePage('sales', page);
        invalidateCachePage('daily-sales', 1);
        resetDashboardCache();
        resetReportsCache();
    };

    // Derived filtered list (No longer filtered client-side, using paginated results directly)
    let filteredList = transactions;

    // Modal handlers
    const handleOpenRefund = (tx) => {
        setSelectedTxForRefund(tx);
        setShowRefundModal(true);
    };

    const handleCloseRefund = () => {
        setSelectedTxForRefund(null);
        setShowRefundModal(false);
    };

    const handleSubmitRefund = async (payload) => {
        try {
            await api.post(`/transactions/${selectedTxForRefund.id}/${payload.type.toLowerCase()}`, payload);
            handleCloseRefund();
            loadHistory();
        } catch (err) {
            console.error("Refund failed:", err);
            throw err;
        }
    };

    const handleOpenVoid = (tx) => {
        setSelectedTxForVoid(tx);
        setShowVoidModal(true);
    };

    const handleCloseVoid = () => {
        setSelectedTxForVoid(null);
        setShowVoidModal(false);
    };

    const handleOpenView = (tx) => {
        setSelectedTxForView(tx);
        setShowViewModal(true);
    };

    const handleCloseView = () => {
        setSelectedTxForView(null);
        setShowViewModal(false);
    };

    const handleVoid = async (txId, payload) => {
        try {
            await api.post(`/transactions/${txId}/void`, payload);
            handleCloseVoid();
            loadHistory();
        } catch (err) {
            console.error("Void failed:", err);
            throw err;
        }
    };

    const handleOpenPay = (tx) => {
        setSelectedTxForPay(tx);
        setShowPayModal(true);
    };

    const handleClosePay = () => {
        setSelectedTxForPay(null);
        setShowPayModal(false);
    };

    const handlePaySubmit = async (txId, payload) => {
        try {
            await api.post(`/transactions/${txId}/pay`, payload);
            showToast('Pending Order payment successful!', 'success');
            handleClosePay();
            loadHistory();
        } catch (err) {
            console.error("Pay failed:", err);
            showToast("Payment failed: " + (err.response?.data?.message || err.message), 'error');
            throw err;
        }
    };

    const handleSearchTransaction = async (siNo) => {
        if (!siNo) return null;
        // Search locally first
        const found = transactions.find(t => 
            (t.si_no && t.si_no.toLowerCase() === siNo.toLowerCase()) || 
            (t.receipt_number && t.receipt_number.toLowerCase() === siNo.toLowerCase()) ||
            (t.or_no && t.or_no.toLowerCase() === siNo.toLowerCase())
        );
        if (found) {
            setSelectedTxForRefund(found);
            return found;
        }
        return null;
    };

    return {
        loading,
        transactions: filteredList,
        page,
        setPage,
        pagination,
        activeTab,
        setActiveTab,
        searchQuery,
        setSearchQuery,
        paymentFilter,
        setPaymentFilter,
        txTypeFilter,
        setTxTypeFilter,
        showRefundModal,
        selectedTxForRefund,
        handleOpenRefund,
        handleCloseRefund,
        handleSubmitRefund,
        handleSearchTransaction,
        showVoidModal,
        selectedTxForVoid,
        handleOpenVoid,
        handleCloseVoid,
        handleVoid,
        showViewModal,
        selectedTxForView,
        handleOpenView,
        handleCloseView,
        showPayModal,
        selectedTxForPay,
        handleOpenPay,
        handleClosePay,
        handlePaySubmit,
        fmt,
        fmtDate
    };
}
