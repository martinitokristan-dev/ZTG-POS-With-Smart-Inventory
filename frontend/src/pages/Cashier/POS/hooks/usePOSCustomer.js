import { useState, useEffect } from 'react';
import useCustomerCache from '../../../../shared/hooks/useCustomerCache';
import api from '../../../../shared/api';

export function usePOSCustomer() {
    // Customer Fields
    const [existingCustomerSearch, setExistingCustomerSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null); // Full customer object if selected
    const [newCustomerName, setNewCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerTin, setCustomerTin] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    // Customer data — sourced from shared cache module (no duplicate /customer-log fetch)
    const { customers: customersList } = useCustomerCache();

    // Checkers
    const [checkers, setCheckers] = useState([]);
    const [selectedChecker, setSelectedChecker] = useState('');

    useEffect(() => {
        const loadCheckers = async () => {
            try {
                // Checkers API, we could also use cache or just fetch active_only
                const res = await api.get('/checkers?active_only=1');
                setCheckers(res.data);
            } catch (err) {
                console.error(err);
            }
        };
        loadCheckers();
    }, []);

    return {
        existingCustomerSearch,
        setExistingCustomerSearch,
        selectedCustomer,
        setSelectedCustomer,
        newCustomerName,
        setNewCustomerName,
        customerPhone,
        setCustomerPhone,
        customerTin,
        setCustomerTin,
        customerAddress,
        setCustomerAddress,
        customersList,
        checkers,
        selectedChecker,
        setSelectedChecker,
    };
}
