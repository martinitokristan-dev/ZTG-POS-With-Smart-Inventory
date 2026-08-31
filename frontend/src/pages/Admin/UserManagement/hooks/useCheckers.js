import React from 'react';
import api from '../../../../shared/api';
import { showToast } from '../../../../utils/toast';

/**
 * useCheckers — Manages Warehouse Checkers for PIN approvals / stock verification.
 */
export function useCheckers() {
    const [checkers, setCheckers] = React.useState([]);
    const [loadingCheckers, setLoadingCheckers] = React.useState(true);
    const [checkerSearchQuery, setCheckerSearchQuery] = React.useState('');

    // Modal state for creating / editing checker
    const [showCheckerModal, setShowCheckerModal] = React.useState(false);
    const [selectedChecker, setSelectedChecker] = React.useState(null);
    const [checkerForm, setCheckerForm] = React.useState({
        name: '',
        status: 'Active',
    });
    const [checkerSubmitting, setCheckerSubmitting] = React.useState(false);

    const fetchCheckers = React.useCallback(async () => {
        setLoadingCheckers(true);
        try {
            const res = await api.get('/checkers');
            setCheckers(res.data || []);
        } catch (err) {
            console.error('Failed to fetch checkers:', err);
        } finally {
            setLoadingCheckers(false);
        }
    }, []);

    React.useEffect(() => {
        fetchCheckers();
    }, [fetchCheckers]);

    const openAddChecker = () => {
        setSelectedChecker(null);
        setCheckerForm({
            name: '',
            status: 'Active',
        });
        setShowCheckerModal(true);
    };

    const openEditChecker = (checker) => {
        setSelectedChecker(checker);
        setCheckerForm({
            name: checker.name || checker.checker_name || '',
            status: checker.status || 'Active',
        });
        setShowCheckerModal(true);
    };

    const handleCheckerSubmit = async (e) => {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        setCheckerSubmitting(true);

        try {
            const payload = {
                name: (checkerForm.name || '').trim(),
                status: checkerForm.status || 'Active',
            };

            if (selectedChecker) {
                const res = await api.put(`/checkers/${selectedChecker.id}`, payload);
                const updated = res.data.checker || res.data;
                setCheckers((prev) => prev.map((c) => (c.id === selectedChecker.id ? updated : c)));
                showToast('Checker updated successfully.', 'success');
            } else {
                const res = await api.post('/checkers', payload);
                const created = res.data.checker || res.data;
                setCheckers((prev) => [created, ...prev]);
                showToast('New checker added successfully.', 'success');
            }

            setShowCheckerModal(false);
            fetchCheckers();
        } catch (err) {
            console.error('Failed to save checker:', err);
            showToast(err.response?.data?.message || 'Failed to save checker.', 'error');
        } finally {
            setCheckerSubmitting(false);
        }
    };

    const handleToggleChecker = async (checker) => {
        try {
            const newStatus = checker.status === 'Active' ? 'Inactive' : 'Active';
            const res = await api.put(`/checkers/${checker.id}`, {
                name: checker.name || checker.checker_name,
                status: newStatus,
            });
            const updated = res.data.checker || res.data;
            setCheckers((prev) => prev.map((c) => (c.id === checker.id ? { ...c, ...updated, status: newStatus } : c)));
            showToast(`Checker status set to ${newStatus}.`, 'success');
        } catch (err) {
            console.error('Failed to toggle checker:', err);
            showToast(err.response?.data?.message || 'Failed to update checker status.', 'error');
        }
    };

    const filteredCheckers = React.useMemo(() => {
        if (!checkerSearchQuery.trim()) return checkers;
        const q = checkerSearchQuery.toLowerCase();
        return checkers.filter((c) => {
            const name = (c.name || c.checker_name || '').toLowerCase();
            const status = (c.status || '').toLowerCase();
            return name.includes(q) || status.includes(q);
        });
    }, [checkers, checkerSearchQuery]);

    return {
        checkers,
        filteredCheckers,
        loadingCheckers,
        fetchCheckers,
        checkerSearchQuery,
        setCheckerSearchQuery,
        showCheckerModal,
        setShowCheckerModal,
        selectedChecker,
        checkerForm,
        setCheckerForm,
        checkerSubmitting,
        openAddChecker,
        openEditChecker,
        handleCheckerSubmit,
        handleToggleChecker,
    };
}
