import { useState, useEffect, useMemo } from 'react';
import api from '../../../../shared/api';
import { fetchSettingData, resetSettingsCache } from '../../../../shared/hooks/useSettingsCache';
import { useProducts } from '../../../../contexts/ProductContext';
import { useNotifications } from '../../../../contexts/NotificationContext';
import { showToast } from '../../../../utils/toast';

export default function useSettings() {
    const { count: notificationsCount } = useNotifications();

    // Primary Active Tab: 'profile', 'general', 'products', 'alerts', 'employees'
    const [activeTab, setActiveTab] = useState(() => localStorage.getItem('settingsActiveTab') || 'profile');

    // Tab edit mode state: null | 'profile' | 'general'
    const [editingTab, setEditingTab] = useState(null);

    useEffect(() => {
        localStorage.setItem('settingsActiveTab', activeTab);
        setEditingTab(null);
    }, [activeTab]);

    // Products Settings Nested Sub-tab: 'info', 'categories', 'sizes', 'quality', 'colors', 'pricing', 'warehouse'
    const [activeSubTab, setActiveSubTab] = useState('info');

    // Alerts Rules Nested Sub-tab: 'inventory', 'transaction', 'reservation', 'email', 'rules'
    const [activeAlertsSubTab, setActiveAlertsSubTab] = useState('inventory');

    const [loading, setLoading] = useState(true);

    // ------------------------------------------------------------------------
    // TAB 1: PROFILE DATA STATE
    // ------------------------------------------------------------------------
    const [profileData, setProfileData] = useState({
        name: '',
        real_name: '',
        email: '',
        username: '',
        pin: '',
        role: '',
        profile_photo: null
    });
    const [initialProfileData, setInitialProfileData] = useState({});

    // Profile Modals & Photo Actions
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showPIN, setShowPIN] = useState(false);
    const [passwordData, setPasswordData] = useState({ current_password: '', password: '', password_confirmation: '' });
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [avatarProgress, setAvatarProgress] = useState(0);
    const [avatarRemoving, setAvatarRemoving] = useState(false);
    const [confirmingRemove, setConfirmingRemove] = useState(false);

    // Check if profile tab has unsaved changes
    const isProfileDirty = useMemo(() => {
        return JSON.stringify(profileData) !== JSON.stringify(initialProfileData);
    }, [profileData, initialProfileData]);

    // ------------------------------------------------------------------------
    // TAB 2: GENERAL SYSTEM SETTINGS DATA STATE
    // ------------------------------------------------------------------------
    const [settings, setSettings] = useState({
        // Business details (TIN & Full Address)
        business_name: 'ZTG HEAVY EQUIPMENT PARTS',
        branch_location: 'Butuan City',
        address: '123 Industrial Ave., Brgy. San Jose, Butuan City',
        contact_number: '0917-000-1111',
        email_address: 'info@ztgheavyparts.com',
        tin: '000-123-456-000',
        tax_rate: '12',
        currency: 'PHP',
        // Inventory Configuration
        dead_stock_period: '30',
        auto_deduct_stock: 'true',
        track_damaged_separately: 'true',
        track_damaged: 'true',
        // Product Info toggles
        display_chinese_names: 'true',
        enable_product_variants: 'true',
        enable_variants: 'true',
        enable_dual_pricing: 'true',
        track_warehouse_locations: 'true',
        track_locations: 'true',
        // Pricing Configuration
        price1_label: 'Original Price',
        price2_label: 'Retail Price',
        auto_calc_price2: 'true',
        price2_markup_percent: '10',
        price2_markup: '10',
        // Warehouse & Display
        location_format: 'Aisle-Center-Hang (A-12-3)',
        number_of_aisles: '15',
        always_display_part_numbers: 'false',
        show_stock_levels_pos: 'true',
        hide_oos_pos: 'false',
        // Authorization & Limit Settings
        daily_void_limit: '5',
        // Alerts Tab settings
        enable_stock_alerts_checkbox: 'true',
        send_low_stock_alerts: 'true',
        send_oos_alerts: 'true',
        send_dead_stock_alerts: 'true',
        send_damaged_alerts: 'true',
        show_alerts_on_dashboard: 'true',
        // Transaction Alerts settings
        notify_po_awaiting_approval: 'true',
        notify_po_approved: 'true',
        notify_po_rejected: 'true',
        send_refund_alerts: 'true',
        send_large_sales_alerts: 'false',
        // Reservation Alerts settings
        send_reservation_expiring_alerts: 'true',
        send_reservation_expired_alerts: 'true',
        // Email & Reports settings
        enable_email_notifications: 'true',
        admin_email_address: 'admin@ztgheavyparts.com',
        additional_email_recipients: 'email1@example.com, email2@example.com',
        send_daily_sales_report: 'false',
        send_weekly_inventory_report: 'false',
        send_monthly_performance_report: 'false'
    });
    const [initialSettings, setInitialSettings] = useState({});

    // Business logo — loaded from settings, admin-only upload/remove
    const [logoUrl, setLogoUrl] = useState(null);
    const [sidebarLogoUrl, setSidebarLogoUrl] = useState(null);
    const [logoUploading, setLogoUploading] = useState(false);
    const [logoProgress, setLogoProgress] = useState(0);
    const [logoRemoving, setLogoRemoving] = useState(false);

    // Check if general settings tab has unsaved changes
    const isSettingsDirty = useMemo(() => {
        return JSON.stringify(settings) !== JSON.stringify(initialSettings);
    }, [settings, initialSettings]);

    // ------------------------------------------------------------------------
    // TAB 3: PRODUCTS SETTINGS DATA (Categories & Variants)
    // ------------------------------------------------------------------------
    const { categories: contextCategories, optimisticUpdateCategory, optimisticDeleteCategory, refetch: refetchCategories } = useProducts();
    const [categories, setCategories] = useState([]);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [categoryName, setCategoryName] = useState('');
    const [categoryVariants, setCategoryVariants] = useState([]);

    // Variants options
    const [variantTypes, setVariantTypes] = useState([]);
    const [newOptionValue, setNewOptionValue] = useState('');

    // ------------------------------------------------------------------------
    // TAB 4: ALERTS RULES STATE
    // ------------------------------------------------------------------------
    const [alertRules, setAlertRules] = useState([]);
    const [showRuleModal, setShowRuleModal] = useState(false);
    const [ruleForm, setRuleForm] = useState({
        name: '',
        event_type: 'low_stock',
        threshold: 5,
        recipient_email: 'admin@heavypartspro.com',
        is_active: true
    });

    // ------------------------------------------------------------------------
    // TAB 5: EMPLOYEES STATE
    // ------------------------------------------------------------------------
    const [employees, setEmployees] = useState([]);
    const [showEmployeeModal, setShowEmployeeModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [employeeForm, setEmployeeForm] = useState({
        name: '',
        email: '',
        username: '',
        role: 'Cashier',
        pin: '',
        status: 'Active'
    });

    // ------------------------------------------------------------------------
    // TAB 6: CHECKERS STATE
    // ------------------------------------------------------------------------
    const [checkers, setCheckers] = useState([]);
    const [showCheckerModal, setShowCheckerModal] = useState(false);
    const [selectedChecker, setSelectedChecker] = useState(null);
    const [checkerForm, setCheckerForm] = useState({
        name: '',
        status: 'Active'
    });

    // ------------------------------------------------------------------------
    // INITIAL LOAD & CACHING HELPERS
    // ------------------------------------------------------------------------
    const loadSettingsData = async () => {
        setLoading(true);
        try {
            let currentRole = profileData.role || (localStorage.getItem('auth_user') ? JSON.parse(localStorage.getItem('auth_user')).role : '');
            
            // Load user profile
            const profileDataResponse = await fetchSettingData('user', '/user');
            if (profileDataResponse?.user) {
                const u = profileDataResponse.user;
                const loadedProfile = {
                    name: u.username || '',
                    real_name: u.real_name || '',
                    email: u.email || '',
                    username: u.username || '',
                    pin: u.pin || '',
                    role: u.role || (localStorage.getItem('auth_user') ? JSON.parse(localStorage.getItem('auth_user')).role : 'Cashier'),
                    profile_photo: u.profile_photo || null
                };
                setProfileData(loadedProfile);
                setInitialProfileData(loadedProfile);
                if (loadedProfile.role) {
                    currentRole = loadedProfile.role;
                }

                const stored = localStorage.getItem('auth_user');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    localStorage.setItem('auth_user', JSON.stringify({ ...parsed, profile_photo: u.profile_photo || null }));
                    window.dispatchEvent(new Event('auth_user_updated'));
                }
            }

            // Load bulk system settings
            const settingsData = await fetchSettingData('settings', '/settings');
            if (settingsData) {
                const logo = settingsData.business_logo || settingsData.logo_url || null;
                const sidebarLogo = settingsData.sidebar_logo || null;
                setLogoUrl(logo);
                setSidebarLogoUrl(sidebarLogo);
                if (sidebarLogo) {
                    localStorage.setItem('cached_sidebar_logo', sidebarLogo);
                }
                localStorage.setItem('cached_business_info', JSON.stringify(settingsData));
                setSettings(prev => {
                    const next = { ...prev, ...settingsData, business_logo: logo, sidebar_logo: sidebarLogo };
                    setInitialSettings(next);
                    return next;
                });
            }

            // Load nested assets (only fetch Admin-only endpoints if user is Admin)
            loadCategories();
            loadVariants();
            if (currentRole && currentRole.toLowerCase() === 'admin') {
                loadAlertRules();
                loadEmployees();
            }
            loadCheckers();
        } catch (err) {
            showToast('Failed to load system settings configurations.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadCategories = async () => {
        setCategories(contextCategories);
    };

    useEffect(() => {
        setCategories(contextCategories);
    }, [contextCategories]);

    const loadVariants = async () => {
        try {
            const data = await fetchSettingData('variants', '/variants');
            setVariantTypes(data || []);
        } catch (e) {
            console.error(e);
        }
    };

    const loadAlertRules = async () => {
        try {
            const data = await fetchSettingData('alertRules', '/alert-rules');
            setAlertRules(data || []);
        } catch (e) {
            if (e.response?.status !== 403) {
                console.error(e);
            }
        }
    };

    const loadEmployees = async () => {
        try {
            const data = await fetchSettingData('employees', '/employees');
            setEmployees(data || []);
        } catch (e) {
            if (e.response?.status !== 403) {
                console.error(e);
            }
        }
    };

    const loadCheckers = async () => {
        try {
            const data = await fetchSettingData('checkers', '/checkers');
            setCheckers(data || []);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        loadSettingsData();
    }, []);

    // ------------------------------------------------------------------------
    // TAB 1 ACTIONS: PROFILE UPDATES & AVATAR
    // ------------------------------------------------------------------------
    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        if (!profileData.real_name?.trim() || !profileData.email?.trim() || !profileData.username?.trim()) {
            showToast('Please fill in all required profile fields: Full Name, Email, and Username.', 'error');
            return;
        }

        try {
            const res = await api.put('/profile', profileData);
            const updatedUser = res.data?.user;
            if (updatedUser) {
                const stored = localStorage.getItem('auth_user');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    localStorage.setItem('auth_user', JSON.stringify({
                        ...parsed,
                        username: updatedUser.username,
                        real_name: updatedUser.real_name,
                        email: updatedUser.email,
                        profile_photo: updatedUser.profile_photo ?? parsed.profile_photo
                    }));
                }
            }

            const updated = {
                name: updatedUser?.username || profileData.username,
                real_name: updatedUser?.real_name || profileData.real_name,
                email: updatedUser?.email || profileData.email,
                username: updatedUser?.username || profileData.username,
                pin: profileData.pin,
                role: updatedUser?.role || profileData.role,
                profile_photo: updatedUser?.profile_photo ?? profileData.profile_photo
            };
            setProfileData(updated);
            setInitialProfileData(updated);
            setShowPasswordModal(false);
            setEditingTab(null);
            resetSettingsCache('user');
            window.dispatchEvent(new Event('auth_user_updated'));
            showToast('Profile updated successfully!', 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update profile.', 'error');
        }
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/') && !file.name.match(/\.(heic|heif|jpg|jpeg|png|webp|gif|bmp|avif)$/i)) {
            showToast('Invalid file type. Please upload an image file.', 'error');
            e.target.value = '';
            return;
        }

        if (file.size > 12 * 1024 * 1024) {
            showToast('File size exceeds 12MB limit.', 'error');
            e.target.value = '';
            return;
        }

        const formData = new FormData();
        formData.append('avatar', file);

        setAvatarUploading(true);
        setAvatarProgress(0);
        try {
            const res = await api.post('/profile/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total && progressEvent.total > 0) {
                        const percent = Math.min(100, Math.max(0, Math.round((progressEvent.loaded * 100) / progressEvent.total)));
                        setAvatarProgress(percent);
                    }
                }
            });
            const newPhotoUrl = res.data?.profile_photo;
            setProfileData(prev => ({ ...prev, profile_photo: newPhotoUrl }));

            const stored = localStorage.getItem('auth_user');
            if (stored) {
                const parsed = JSON.parse(stored);
                localStorage.setItem('auth_user', JSON.stringify({ ...parsed, profile_photo: newPhotoUrl }));
            }
            resetSettingsCache('user');
            window.dispatchEvent(new Event('auth_user_updated'));
            showToast('Profile photo updated successfully!', 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to upload photo.', 'error');
        } finally {
            setAvatarUploading(false);
            setAvatarProgress(0);
            e.target.value = '';
        }
    };

    const handleAvatarRemove = () => {
        setConfirmingRemove(true);
    };

    const handleAvatarRemoveConfirmed = async () => {
        setConfirmingRemove(false);
        setAvatarRemoving(true);
        try {
            await api.delete('/profile/avatar');
            setProfileData(prev => ({ ...prev, profile_photo: null }));

            const stored = localStorage.getItem('auth_user');
            if (stored) {
                const parsed = JSON.parse(stored);
                localStorage.setItem('auth_user', JSON.stringify({ ...parsed, profile_photo: null }));
            }
            resetSettingsCache('user');
            window.dispatchEvent(new Event('auth_user_updated'));
            showToast('Profile photo removed.', 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to remove photo.', 'error');
        } finally {
            setAvatarRemoving(false);
        }
    };

    const handleAvatarRemoveCancel = () => {
        setConfirmingRemove(false);
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.put('/profile/password', passwordData);
            showToast('Password changed successfully!', 'success');
            setShowPasswordModal(false);
            setPasswordData({ current_password: '', password: '', password_confirmation: '' });
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update login password.', 'error');
        }
    };

    // ------------------------------------------------------------------------
    // BUSINESS LOGO ACTIONS (Admin only, R2 bucket storage)
    // ------------------------------------------------------------------------
    const handleLogoUploadWithCrop = async (originalFile, croppedSidebarBlob) => {
        if (!originalFile) return;

        const formData = new FormData();
        formData.append('logo', originalFile);
        if (croppedSidebarBlob) {
            formData.append('sidebar_logo', croppedSidebarBlob);
        }

        setLogoUploading(true);
        setLogoProgress(0);
        try {
            const res = await api.post('/settings/logo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total && progressEvent.total > 0) {
                        const percent = Math.min(100, Math.max(0, Math.round((progressEvent.loaded * 100) / progressEvent.total)));
                        setLogoProgress(percent);
                    }
                }
            });
            const newUrl = res.data?.logo_url || null;
            const newSidebarUrl = res.data?.sidebar_logo_url || null;

            setLogoUrl(newUrl);
            setSidebarLogoUrl(newSidebarUrl);
            setSettings(prev => ({ ...prev, business_logo: newUrl, sidebar_logo: newSidebarUrl }));
            setInitialSettings(prev => ({ ...prev, business_logo: newUrl, sidebar_logo: newSidebarUrl }));

            if (newUrl) {
                localStorage.setItem('cached_business_logo', newUrl);
            } else {
                localStorage.removeItem('cached_business_logo');
            }

            if (newSidebarUrl) {
                localStorage.setItem('cached_sidebar_logo', newSidebarUrl);
            } else {
                localStorage.removeItem('cached_sidebar_logo');
            }

            resetSettingsCache('settings');
            window.dispatchEvent(new Event('settings_updated'));
            showToast('Business logo updated successfully!', 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to upload logo.', 'error');
        } finally {
            setLogoUploading(false);
            setLogoProgress(0);
        }
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            showToast('Invalid logo image type. Upload JPG, PNG, or WebP.', 'error');
            e.target.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showToast('Logo file size exceeds 5MB limit.', 'error');
            e.target.value = '';
            return;
        }

        await handleLogoUploadWithCrop(file, null);
        e.target.value = '';
    };

    const handleLogoRemove = async () => {
        setLogoRemoving(true);
        try {
            await api.delete('/settings/logo');
            setLogoUrl(null);
            setSidebarLogoUrl(null);
            setSettings(prev => ({ ...prev, business_logo: null, sidebar_logo: null }));
            setInitialSettings(prev => ({ ...prev, business_logo: null, sidebar_logo: null }));
            localStorage.removeItem('cached_business_logo');
            localStorage.removeItem('cached_sidebar_logo');
            resetSettingsCache('settings');
            window.dispatchEvent(new Event('settings_updated'));
            showToast('Business logo removed.', 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to remove logo.', 'error');
        } finally {
            setLogoRemoving(false);
        }
    };

    // ------------------------------------------------------------------------
    // TAB 2 ACTIONS: SYSTEM BULK SETTINGS & CONFIRMATION GATE
    // ------------------------------------------------------------------------
    const COMPLIANCE_KEYS = [
        'business_name', 'branch_location', 'address',
        'contact_number', 'email_address', 'tax_rate', 'tin'
    ];

    const [showConfirmSaveModal, setShowConfirmSaveModal] = useState(false);

    const handleConfirmSaveBulkSettings = async () => {
        setShowConfirmSaveModal(false);
        try {
            const payload = { ...settings, business_logo: logoUrl };
            await api.put('/settings', { settings: payload });
            resetSettingsCache('settings');

            // Instantly update cached business details and notify all active listeners (Sidebar, Receipts, POS)
            localStorage.setItem('cached_business_info', JSON.stringify(payload));
            if (payload.business_name) {
                localStorage.setItem('cached_business_name', payload.business_name);
            }
            window.dispatchEvent(new Event('settings_updated'));

            showToast('System settings saved successfully!', 'success');
            setSettings(payload);
            setInitialSettings(payload);
            setEditingTab(null);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update system settings.', 'error');
        }
    };

    const handleCancelSaveBulkSettings = () => {
        setShowConfirmSaveModal(false);
    };

    const handleStartEditTab = (tabName) => {
        setEditingTab(tabName);
    };

    const handleCancelEditTab = (tabName) => {
        if (tabName === 'profile') {
            setProfileData(initialProfileData);
        } else {
            setSettings(initialSettings);
        }
        setEditingTab(null);
    };

    const handleSaveBulkSettings = () => {
        const hasComplianceChange = COMPLIANCE_KEYS.some(
            key => (settings[key] ?? '') !== (initialSettings[key] ?? '')
        );
        if (hasComplianceChange) {
            setShowConfirmSaveModal(true);
        } else {
            handleConfirmSaveBulkSettings();
        }
    };

    const handleToggleSetting = (key) => {
        setSettings(prev => {
            const nextVal = prev[key] === 'true' ? 'false' : 'true';
            const updates = { [key]: nextVal };

            if (key === 'track_damaged_separately') updates.track_damaged = nextVal;
            if (key === 'track_damaged') updates.track_damaged_separately = nextVal;
            if (key === 'enable_product_variants') updates.enable_variants = nextVal;
            if (key === 'enable_variants') updates.enable_product_variants = nextVal;
            if (key === 'track_warehouse_locations') updates.track_locations = nextVal;
            if (key === 'track_locations') updates.track_warehouse_locations = nextVal;

            const next = { ...prev, ...updates };

            setTimeout(async () => {
                try {
                    await api.put('/settings', { settings: next });
                    resetSettingsCache('settings');
                    setInitialSettings(next);
                } catch (err) {
                    showToast('Failed to auto-save setting change.', 'error');
                }
            }, 0);

            return next;
        });
    };

    const handleSettingInputChange = (key, val) => {
        setSettings(prev => {
            const updates = { [key]: val };
            if (key === 'price2_markup_percent') updates.price2_markup = val;
            if (key === 'price2_markup') updates.price2_markup_percent = val;
            return { ...prev, ...updates };
        });
    };

    // ------------------------------------------------------------------------
    // TAB 3 ACTIONS: CATEGORIES & VARIANTS OPTIONS CRUD
    // ------------------------------------------------------------------------
    const [categorySubmitting, setCategorySubmitting] = useState(false);

    const handleCategorySubmit = async (e) => {
        e.preventDefault();
        if (categorySubmitting) return;
        setCategorySubmitting(true);
        let commitFn, rollbackFn;
        if (selectedCategory) {
            const { commit, rollback } = optimisticUpdateCategory(selectedCategory.id, { name: categoryName, variants: categoryVariants });
            commitFn = commit; rollbackFn = rollback;
        } else {
            const { commit, rollback } = optimisticUpdateCategory(Date.now(), { name: categoryName, variants: categoryVariants });
            commitFn = commit; rollbackFn = rollback;
        }

        try {
            if (selectedCategory) {
                await api.put(`/categories/${selectedCategory.id}`, { name: categoryName, variants: categoryVariants });
                showToast('Category updated successfully!', 'success');
            } else {
                await api.post('/categories', { name: categoryName, variants: categoryVariants });
                showToast('New category added successfully!', 'success');
            }
            commitFn();
            setShowCategoryModal(false);
            setCategoryName('');
            setSelectedCategory(null);
            refetchCategories();
        } catch (err) {
            rollbackFn();
            showToast(err.response?.data?.message || 'Failed to save product category.', 'error');
        } finally {
            setCategorySubmitting(false);
        }
    };

    const handleDeleteCategory = async (cat) => {
        if (!window.confirm(`Are you sure you want to delete ${cat.name}?`)) return;
        const { commit, rollback } = optimisticDeleteCategory(cat.id);
        try {
            await api.delete(`/categories/${cat.id}`);
            commit();
            showToast('Category deleted successfully.', 'success');
            refetchCategories();
        } catch (err) {
            rollback();
            showToast(err.response?.data?.message || 'Failed to delete category.', 'error');
        }
    };

    const getOptionsForType = (typeName) => {
        const found = variantTypes.find(v => v.name?.toLowerCase() === typeName?.toLowerCase());
        return found ? found.options || [] : [];
    };

    const handleAddVariantOption = async (typeName) => {
        if (!newOptionValue.trim()) return;

        try {
            let typeObj = variantTypes.find(v => v.name?.toLowerCase() === typeName?.toLowerCase());
            let typeId = typeObj ? typeObj.id : null;

            if (!typeId) {
                const createTypeRes = await api.post('/variants', { name: typeName });
                const typeData = createTypeRes.data;
                typeObj = typeData.variant_type || typeData;
                typeId = typeObj.id;

                setVariantTypes(prev => {
                    if (!prev.some(v => v.name?.toLowerCase() === typeName?.toLowerCase())) {
                        return [...prev, { ...typeObj, options: [] }];
                    }
                    return prev;
                });
            }

            const optRes = await api.post(`/variants/${typeId}/options`, { value: newOptionValue.trim() });
            const optData = optRes.data;
            const newOption = optData.variant_option || optData;

            setVariantTypes(prev => prev.map(vt => {
                if (vt.id === typeId || vt.name?.toLowerCase() === typeName?.toLowerCase()) {
                    const existingOpts = vt.options || [];
                    if (!existingOpts.some(o => o.id === newOption.id)) {
                        return { ...vt, options: [...existingOpts, newOption] };
                    }
                }
                return vt;
            }));

            setNewOptionValue('');
            resetSettingsCache('variants');
            showToast(`Option "${newOptionValue}" added to ${typeName}.`, 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to add variant option.', 'error');
        }
    };

    const handleUpdateVariantOption = async (optionId, newValue, typeName) => {
        try {
            const res = await api.put(`/variant-options/${optionId}`, { value: newValue });
            const optData = res.data;
            const updatedOption = optData.variant_option || optData;

            setVariantTypes(prev => prev.map(vt => {
                if (vt.name?.toLowerCase() === typeName?.toLowerCase()) {
                    return {
                        ...vt,
                        options: vt.options.map(opt => opt.id === optionId ? updatedOption : opt)
                    };
                }
                return vt;
            }));

            resetSettingsCache('variants');
            showToast('Variant option updated successfully.', 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update variant option.', 'error');
        }
    };

    const handleDeleteVariantOption = async (optionId, typeName) => {
        if (!window.confirm('Delete this variant option?')) return;
        try {
            await api.delete(`/variant-options/${optionId}`);
            setVariantTypes(prev => prev.map(vt => {
                if (vt.name?.toLowerCase() === typeName?.toLowerCase()) {
                    return {
                        ...vt,
                        options: vt.options.filter(opt => opt.id !== optionId)
                    };
                }
                return vt;
            }));
            resetSettingsCache('variants');
            showToast('Variant option removed.', 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to delete variant option.', 'error');
        }
    };

    // ------------------------------------------------------------------------
    // TAB 4 ACTIONS: ALERT RULES CRUD
    // ------------------------------------------------------------------------
    const handleRuleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/alert-rules', ruleForm);
            setAlertRules(prev => [res.data, ...prev]);
            setShowRuleModal(false);
            setRuleForm({ name: '', event_type: 'low_stock', threshold: 5, recipient_email: 'admin@heavypartspro.com', is_active: true });
            resetSettingsCache('alertRules');
            showToast('Alert rule added successfully!', 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to add alert rule.', 'error');
        }
    };

    const handleToggleRule = async (rule) => {
        try {
            const res = await api.put(`/alert-rules/${rule.id}`, { is_active: !rule.is_active });
            setAlertRules(prev => prev.map(r => r.id === rule.id ? res.data : r));
            resetSettingsCache('alertRules');
            showToast(`Alert rule ${res.data.is_active ? 'enabled' : 'disabled'}.`, 'success');
        } catch (err) {
            showToast('Failed to update alert rule status.', 'error');
        }
    };

    const handleDeleteRule = async (rule) => {
        if (!window.confirm('Delete this alert rule?')) return;
        try {
            await api.delete(`/alert-rules/${rule.id}`);
            setAlertRules(prev => prev.filter(r => r.id !== rule.id));
            resetSettingsCache('alertRules');
            showToast('Alert rule deleted.', 'success');
        } catch (err) {
            showToast('Failed to delete alert rule.', 'error');
        }
    };

    // ------------------------------------------------------------------------
    // TAB 5 ACTIONS: EMPLOYEES CRUD
    // ------------------------------------------------------------------------
    const openAddEmployee = () => {
        setSelectedEmployee(null);
        setEmployeeForm({
            employee_id: '',
            username: '',
            real_name: '',
            name: '',
            password: '',
            role: 'Cashier',
            pin: '',
            status: 'Active'
        });
        setShowEmployeeModal(true);
    };

    const openEditEmployee = (emp) => {
        setSelectedEmployee(emp);
        setEmployeeForm({
            employee_id: emp.employee_id || '',
            username: emp.username || '',
            real_name: emp.real_name || emp.name || '',
            name: emp.name || emp.real_name || '',
            password: '',
            role: emp.role || 'Cashier',
            pin: emp.pin || '',
            status: emp.status || 'Active'
        });
        setShowEmployeeModal(true);
    };

    const handleEmployeeSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...employeeForm,
                name: employeeForm.real_name?.trim() || employeeForm.username?.trim(),
                real_name: employeeForm.real_name?.trim(),
                username: employeeForm.username?.trim(),
                employee_id: employeeForm.employee_id?.trim() || undefined,
            };

            if (payload.role === 'Cashier') {
                delete payload.pin;
            }

            if (selectedEmployee) {
                if (!payload.password) {
                    delete payload.password;
                }
                const res = await api.put(`/employees/${selectedEmployee.id}`, payload);
                const updated = res.data.employee || res.data;
                setEmployees(prev => prev.map(emp => emp.id === selectedEmployee.id ? updated : emp));
                showToast('Employee updated successfully!', 'success');
            } else {
                const res = await api.post('/employees', payload);
                const created = res.data.employee || res.data;
                setEmployees(prev => [created, ...prev]);
                showToast('New employee added successfully!', 'success');
            }
            setShowEmployeeModal(false);
            resetSettingsCache('employees');
        } catch (err) {
            console.error('Failed to save employee:', err);
            const errData = err.response?.data;
            let errMsg = 'Failed to save employee.';
            if (errData?.errors) {
                const firstKey = Object.keys(errData.errors)[0];
                errMsg = errData.errors[firstKey]?.[0] || errMsg;
            } else if (errData?.message) {
                errMsg = errData.message;
            }
            showToast(errMsg, 'error');
        }
    };

    const handleToggleEmployee = async (emp) => {
        const nextStatus = emp.status === 'Active' ? 'Inactive' : 'Active';
        try {
            const res = await api.put(`/employees/${emp.id}`, { status: nextStatus });
            setEmployees(prev => prev.map(e => e.id === emp.id ? res.data : e));
            resetSettingsCache('employees');
            showToast(`Employee account set to ${nextStatus}.`, 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to toggle employee status.', 'error');
        }
    };

    // ------------------------------------------------------------------------
    // TAB 6 ACTIONS: CHECKERS CRUD
    // ------------------------------------------------------------------------
    const openAddChecker = () => {
        setSelectedChecker(null);
        setCheckerForm({ name: '', status: 'Active' });
        setShowCheckerModal(true);
    };

    const openEditChecker = (chk) => {
        setSelectedChecker(chk);
        setCheckerForm({
            name: chk.name || chk.checker_name || '',
            status: chk.status || 'Active'
        });
        setShowCheckerModal(true);
    };

    const handleCheckerSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name: checkerForm.name.trim(),
                status: checkerForm.status || 'Active'
            };
            if (selectedChecker) {
                const res = await api.put(`/checkers/${selectedChecker.id}`, payload);
                const updated = res.data?.checker || res.data;
                setCheckers(prev => prev.map(c => c.id === selectedChecker.id ? updated : c));
                showToast('Product checker updated successfully!', 'success');
            } else {
                const res = await api.post('/checkers', payload);
                const newChecker = res.data?.checker || res.data;
                setCheckers(prev => [...prev, newChecker]);
                showToast('New product checker registered!', 'success');
            }
            setShowCheckerModal(false);
            resetSettingsCache('checkers');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to save product checker.', 'error');
        }
    };

    return {
        notificationsCount,
        loading, isProfileDirty, isSettingsDirty,

        // Tab Navigation
        activeTab, setActiveTab,
        editingTab, handleStartEditTab, handleCancelEditTab,
        activeSubTab, setActiveSubTab,
        activeAlertsSubTab, setActiveAlertsSubTab,

        // Tab 1: Profile
        profileData, setProfileData,
        showPasswordModal, setShowPasswordModal,
        showPIN, setShowPIN,
        passwordData, setPasswordData,
        avatarUploading, avatarProgress, avatarRemoving, handleAvatarUpload, handleAvatarRemove,
        confirmingRemove, handleAvatarRemoveConfirmed, handleAvatarRemoveCancel,
        handleProfileSubmit, handlePasswordSubmit,

        // Tab 2: General System Settings & Logo
        settings, handleSettingInputChange, handleToggleSetting, handleSaveBulkSettings,
        showConfirmSaveModal, handleConfirmSaveBulkSettings, handleCancelSaveBulkSettings,
        logoUrl, sidebarLogoUrl, logoUploading, logoProgress, logoRemoving, handleLogoUpload, handleLogoUploadWithCrop, handleLogoRemove,

        // Tab 3: Products Settings
        categories, showCategoryModal, setShowCategoryModal, selectedCategory, setSelectedCategory,
        categoryName, setCategoryName, categoryVariants, setCategoryVariants,
        newOptionValue, setNewOptionValue, categorySubmitting,
        handleCategorySubmit, handleDeleteCategory, handleAddVariantOption, handleUpdateVariantOption, handleDeleteVariantOption, getOptionsForType,

        // Tab 4: Alert Rules
        alertRules, showRuleModal, setShowRuleModal, ruleForm, setRuleForm,
        handleRuleSubmit, handleToggleRule, handleDeleteRule,

        // Tab 5: Employees
        employees, showEmployeeModal, setShowEmployeeModal, employeeForm, setEmployeeForm, selectedEmployee, setSelectedEmployee,
        handleEmployeeSubmit, openEditEmployee, handleToggleEmployee, openAddEmployee,

        // Tab 6: Checkers
        checkers, showCheckerModal, setShowCheckerModal, checkerForm, setCheckerForm, selectedChecker, setSelectedChecker,
        handleCheckerSubmit, openEditChecker, openAddChecker
    };
}
