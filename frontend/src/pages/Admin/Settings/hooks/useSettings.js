import { useState, useEffect, useMemo } from 'react';
import api from '../../../../shared/api';
import { fetchSettingData, resetSettingsCache } from '../../../../shared/hooks/useSettingsCache';
import { useProducts } from '../../../../contexts/ProductContext';
import { useNotifications } from '../../../../contexts/NotificationContext';
import { showToast } from '../../../../utils/toast';

export default function useSettings() {
    const { count: notificationsCount } = useNotifications();

    // Primary Active Tab: 'account', 'general', 'products', 'employees', 'checkers'
    const [activeTab, setActiveTab] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab');
        if (tabParam === 'activity' || tabParam === 'alerts' || tabParam === 'profile' || tabParam === 'account') {
            return 'account';
        }
        if (tabParam && ['general', 'products', 'employees', 'checkers'].includes(tabParam)) {
            return tabParam;
        }
        const saved = localStorage.getItem('settingsActiveTab');
        if (saved === 'profile' || saved === 'alerts') return 'account';
        return saved || 'account';
    });

    // Account Nested Sub-tab: 'profile', 'inventory', 'transaction', 'reservation', 'reports', 'activity'
    const [activeAccountSubTab, setActiveAccountSubTab] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab') || params.get('sub');
        if (tabParam === 'activity' || tabParam === 'activity-logs') return 'activity';
        if (tabParam === 'inventory') return 'inventory';
        if (tabParam === 'transaction') return 'transaction';
        if (tabParam === 'reservation') return 'reservation';
        if (tabParam === 'reports') return 'reports';
        if (tabParam === 'alerts') return 'inventory';
        return localStorage.getItem('settingsAccountSubTab') || 'profile';
    });

    // Tab edit mode state: null | 'profile' | 'general'
    const [editingTab, setEditingTab] = useState(null);

    useEffect(() => {
        localStorage.setItem('settingsActiveTab', activeTab);
        setEditingTab(null);
    }, [activeTab]);

    useEffect(() => {
        localStorage.setItem('settingsAccountSubTab', activeAccountSubTab);
    }, [activeAccountSubTab]);

    // Products Settings Nested Sub-tab: 'info', 'categories', 'sizes', 'quality', 'colors', 'pricing', 'warehouse'
    const [activeSubTab, setActiveSubTab] = useState('info');

    // Alerts Rules Nested Sub-tab: 'inventory', 'transaction', 'reservation', 'email', 'rules'
    const [activeAlertsSubTab, setActiveAlertsSubTab] = useState('inventory');

    const [loading, setLoading] = useState(true);

    // ------------------------------------------------------------------------
    // TAB 1: PROFILE DATA STATE
    // ------------------------------------------------------------------------
    const [profileData, setProfileData] = useState({
        full_name: '',
        name: '',
        phone_number: '',
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
        // Units of Measure
        units_of_measure: '["Piece / PCS", "Unit", "Roll", "Meter / m", "Set", "Box", "Pack", "Pair", "Kilogram / kg", "Liter / L"]',
        // Display
        show_stock_levels_pos: 'true',
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
        send_monthly_performance_report: 'false',
        // SI / OR Numbering Configuration (Hybrid Manual / Auto)
        si_numbering_mode: 'manual',
        si_counter_si: '000001',
        si_counter_dr: '000001',
        si_counter_cr: '000001',
        si_auto_digits: '6'
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
    // TAB 1 & 5: SUBMITTING LOADING STATES
    // ------------------------------------------------------------------------
    const [profileSubmitting, setProfileSubmitting] = useState(false);
    const [passwordSubmitting, setPasswordSubmitting] = useState(false);
    const [employeeSubmitting, setEmployeeSubmitting] = useState(false);

    // ------------------------------------------------------------------------
    // TAB 5: EMPLOYEES STATE
    // ------------------------------------------------------------------------
    const [employees, setEmployees] = useState([]);
    const [showEmployeeModal, setShowEmployeeModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [showDeleteEmployeeModal, setShowDeleteEmployeeModal] = useState(false);
    const [employeeToDelete, setEmployeeToDelete] = useState(null);
    const [employeeForm, setEmployeeForm] = useState({
        full_name: '',
        phone_number: '',
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
            let currentRole = profileData.role || ((sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user')) ? JSON.parse((sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'))).role : '');
            
            // Load user profile
            const profileDataResponse = await fetchSettingData('user', '/user');
            if (profileDataResponse?.user) {
                const u = profileDataResponse.user;
                const loadedFullName = u.full_name || u.name || '';
                const loadedProfile = {
                    full_name: loadedFullName,
                    name: loadedFullName,
                    phone_number: u.phone_number || '',
                    email: u.email || '',
                    username: u.username || '',
                    pin: u.pin || '',
                    role: u.role || ((sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user')) ? JSON.parse((sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'))).role : 'Cashier'),
                    profile_photo: u.profile_photo || null
                };
                setProfileData(loadedProfile);
                setInitialProfileData(loadedProfile);
                if (loadedProfile.role) {
                    currentRole = loadedProfile.role;
                }

                const stored = (sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'));
                if (stored) {
                    const parsed = JSON.parse(stored);
                    sessionStorage.setItem('auth_user', JSON.stringify({
                        ...parsed,
                        full_name: loadedFullName,
                        phone_number: u.phone_number || '',
                        name: loadedFullName,
                        profile_photo: u.profile_photo || null
                    }));
                    localStorage.removeItem('auth_user');
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
        try {
            const data = await fetchSettingData('categories', '/categories');
            const list = Array.isArray(data) ? data : (data?.data || []);
            setCategories(list);
        } catch (e) {
            console.error("Failed to load cached categories:", e);
            if (contextCategories && contextCategories.length > 0) {
                setCategories(contextCategories);
            }
        }
    };

    useEffect(() => {
        if (contextCategories && contextCategories.length > 0) {
            setCategories(contextCategories);
        }
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
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        const fullName = (profileData.full_name || profileData.name || '').trim();
        if (!fullName || !profileData.email?.trim() || !profileData.username?.trim()) {
            showToast('Please fill in all required profile fields: Full Name, Email, and Username.', 'error');
            return;
        }

        setProfileSubmitting(true);
        try {
            const payload = {
                ...profileData,
                full_name: fullName,
                name: fullName,
                phone_number: profileData.phone_number?.trim() || null,
                email: profileData.email.trim(),
                username: profileData.username.trim(),
            };
            const res = await api.put('/profile', payload);
            const updatedUser = res.data?.user;
            const updatedFullName = updatedUser?.full_name || updatedUser?.name || fullName;

            if (updatedUser) {
                const stored = (sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'));
                if (stored) {
                    const parsed = JSON.parse(stored);
                    sessionStorage.setItem('auth_user', JSON.stringify({
                        ...parsed,
                        full_name: updatedFullName,
                        name: updatedFullName,
                        phone_number: updatedUser.phone_number ?? parsed.phone_number,
                        username: updatedUser.username,
                        email: updatedUser.email,
                        profile_photo: updatedUser.profile_photo ?? parsed.profile_photo
                    }));
                    localStorage.removeItem('auth_user');
                }
            }

            const updated = {
                full_name: updatedFullName,
                name: updatedFullName,
                phone_number: updatedUser?.phone_number || profileData.phone_number,
                email: updatedUser?.email || profileData.email,
                username: updatedUser?.username || profileData.username,
                pin: profileData.pin,
                role: updatedUser?.role || profileData.role,
                profile_photo: updatedUser?.profile_photo ?? profileData.profile_photo
            };
            setProfileData(updated);
            setInitialProfileData(updated);
            if (updatedUser) {
                setEmployees(prev => prev.map(emp => (emp.id === updatedUser.id || emp.username === updatedUser.username) ? { ...emp, ...updatedUser } : emp));
            }
            setShowPasswordModal(false);
            setEditingTab(null);
            resetSettingsCache('user');
            resetSettingsCache('employees');
            window.dispatchEvent(new Event('auth_user_updated'));
            showToast('Profile updated successfully!', 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update profile.', 'error');
        } finally {
            setProfileSubmitting(false);
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

            const stored = (sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'));
            if (stored) {
                const parsed = JSON.parse(stored);
                sessionStorage.setItem('auth_user', JSON.stringify({ ...parsed, profile_photo: newPhotoUrl })); localStorage.removeItem('auth_user');
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

            const stored = (sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'));
            if (stored) {
                const parsed = JSON.parse(stored);
                sessionStorage.setItem('auth_user', JSON.stringify({ ...parsed, profile_photo: null })); localStorage.removeItem('auth_user');
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
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        setPasswordSubmitting(true);
        try {
            await api.put('/profile/password', passwordData);
            showToast('Password changed successfully!', 'success');
            setShowPasswordModal(false);
            setPasswordData({ current_password: '', password: '', password_confirmation: '' });
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update login password.', 'error');
        } finally {
            setPasswordSubmitting(false);
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
            } else {
                localStorage.removeItem('cached_business_name');
            }
            if (payload.business_logo) {
                localStorage.setItem('cached_business_logo', payload.business_logo);
            } else {
                localStorage.removeItem('cached_business_logo');
            }
            if (payload.sidebar_logo) {
                localStorage.setItem('cached_sidebar_logo', payload.sidebar_logo);
            } else {
                localStorage.removeItem('cached_sidebar_logo');
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

            if (key === 'enable_product_variants') updates.enable_variants = nextVal;
            if (key === 'enable_variants') updates.enable_product_variants = nextVal;
            if (key === 'track_warehouse_locations') updates.track_locations = nextVal;
            if (key === 'track_locations') updates.track_warehouse_locations = nextVal;

            const next = { ...prev, ...updates };

            try {
                localStorage.setItem('cached_business_info', JSON.stringify(next));
                window.dispatchEvent(new Event('settings_updated'));
            } catch (_) {}

            setTimeout(async () => {
                try {
                    await api.put('/settings', { settings: next });
                    resetSettingsCache('settings');
                    setInitialSettings(next);
                    localStorage.setItem('cached_business_info', JSON.stringify(next));
                    window.dispatchEvent(new Event('settings_updated'));
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
            resetSettingsCache('categories');
            commitFn();
            setShowCategoryModal(false);
            setCategoryName('');
            setSelectedCategory(null);
            refetchCategories();
            loadCategories();
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
            resetSettingsCache('categories');
            commit();
            showToast('Category deleted successfully.', 'success');
            refetchCategories();
            loadCategories();
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
            showToast('Variant option deleted.', 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to delete variant option.', 'error');
        }
    };

    // ------------------------------------------------------------------------
    // TAB: UNITS OF MEASURE (UOM) CRUD
    // ------------------------------------------------------------------------
    const [newUomValue, setNewUomValue] = useState('');
    const [editingUomIndex, setEditingUomIndex] = useState(null);
    const [editUomValue, setEditUomValue] = useState('');

    const uomList = useMemo(() => {
        if (!settings.units_of_measure) {
            return ['Piece / PCS', 'Unit', 'Roll', 'Meter / m', 'Set', 'Box', 'Pack', 'Pair', 'Kilogram / kg', 'Liter / L'];
        }
        try {
            const parsed = typeof settings.units_of_measure === 'string'
                ? JSON.parse(settings.units_of_measure)
                : settings.units_of_measure;
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (_) {}
        return ['Piece / PCS', 'Unit', 'Roll', 'Meter / m', 'Set', 'Box', 'Pack', 'Pair', 'Kilogram / kg', 'Liter / L'];
    }, [settings.units_of_measure]);

    const handleSaveUomList = async (newList) => {
        const jsonStr = JSON.stringify(newList);
        setSettings(prev => {
            const next = { ...prev, units_of_measure: jsonStr };
            try {
                localStorage.setItem('cached_business_info', JSON.stringify(next));
                window.dispatchEvent(new Event('settings_updated'));
            } catch (_) {}
            return next;
        });

        try {
            await api.put('/settings', { settings: { units_of_measure: jsonStr } });
            resetSettingsCache('settings');
            window.dispatchEvent(new Event('settings_updated'));
        } catch (err) {
            showToast('Failed to save Unit of Measure.', 'error');
        }
    };

    const handleAddUom = async () => {
        if (!newUomValue.trim()) return;
        const val = newUomValue.trim();
        if (uomList.includes(val)) {
            showToast('This Unit of Measure already exists.', 'error');
            return;
        }
        const updated = [...uomList, val];
        await handleSaveUomList(updated);
        setNewUomValue('');
        showToast(`Unit of Measure "${val}" added successfully.`, 'success');
    };

    const handleUpdateUom = async (index, newVal) => {
        if (!newVal.trim()) return;
        const val = newVal.trim();
        const updated = [...uomList];
        updated[index] = val;
        await handleSaveUomList(updated);
        setEditingUomIndex(null);
        showToast('Unit of Measure updated successfully.', 'success');
    };

    const handleDeleteUom = async (index) => {
        const item = uomList[index];
        if (!window.confirm(`Delete Unit of Measure "${item}"?`)) return;
        const updated = uomList.filter((_, i) => i !== index);
        await handleSaveUomList(updated);
        showToast(`Unit of Measure "${item}" deleted.`, 'success');
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
            full_name: '',
            phone_number: '',
            email: '',
            username: '',
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
            full_name: emp.full_name || emp.name || '',
            phone_number: emp.phone_number || '',
            email: emp.email || emp.user_profile?.email || '',
            username: emp.username || '',
            password: '',
            role: emp.role || 'Cashier',
            pin: emp.pin || '',
            status: emp.status || 'Active'
        });
        setShowEmployeeModal(true);
    };

    const handleEmployeeSubmit = async (e) => {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        setEmployeeSubmitting(true);
        try {
            const fullName = (employeeForm.full_name || employeeForm.name || '').trim();
            const payload = {
                ...employeeForm,
                full_name: fullName,
                name: fullName,
                phone_number: employeeForm.phone_number?.trim() || null,
                email: employeeForm.email?.trim() || null,
                username: employeeForm.username?.trim(),
            };
            delete payload.employee_id;

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

                // Dynamically sync auth_user and sidebar if editing currently logged-in account
                const stored = (sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'));
                if (stored) {
                    try {
                        const currentUser = JSON.parse(stored);
                        const isCurrent = (currentUser.id && Number(currentUser.id) === Number(updated.id)) ||
                            (currentUser.username && (currentUser.username === selectedEmployee.username || currentUser.username === updated.username));

                        if (isCurrent) {
                            const newFullName = updated.full_name || updated.name || currentUser.full_name || currentUser.name;
                            const newAuthUser = {
                                ...currentUser,
                                ...updated,
                                full_name: newFullName,
                                name: newFullName,
                                phone_number: updated.phone_number ?? currentUser.phone_number,
                                username: updated.username || currentUser.username,
                                email: updated.email || currentUser.email,
                                role: updated.role || currentUser.role,
                                pin: updated.pin !== undefined ? updated.pin : currentUser.pin,
                                profile_photo: updated.profile_photo !== undefined ? updated.profile_photo : currentUser.profile_photo,
                            };
                            sessionStorage.setItem('auth_user', JSON.stringify(newAuthUser));
                            localStorage.removeItem('auth_user');

                            // Sync profile tab state so "My Profile" tab reflects changes immediately
                            const updatedProfile = {
                                full_name: newFullName,
                                name: newFullName,
                                phone_number: newAuthUser.phone_number || '',
                                email: newAuthUser.email || '',
                                username: newAuthUser.username,
                                role: newAuthUser.role,
                                pin: updated.pin !== undefined ? updated.pin : (currentUser.pin || ''),
                                profile_photo: newAuthUser.profile_photo ?? null,
                            };
                            setProfileData(prev => ({ ...prev, ...updatedProfile }));
                            setInitialProfileData(prev => ({ ...prev, ...updatedProfile }));

                            resetSettingsCache('user');
                            window.dispatchEvent(new Event('auth_user_updated'));
                        }
                    } catch (err) {
                        console.error('Error syncing auth_user after employee update:', err);
                    }
                }

                showToast('Staff profile updated successfully!', 'success');
            } else {
                const res = await api.post('/employees', payload);
                const created = res.data.employee || res.data;
                setEmployees(prev => [created, ...prev]);
                showToast('New staff registered! Verification email sent with credentials access.', 'success');
            }
            setShowEmployeeModal(false);
            resetSettingsCache('employees');
        } catch (err) {
            console.error('Failed to save staff:', err);
            const errData = err.response?.data;
            let errMsg = 'Failed to save staff.';
            if (errData?.errors) {
                const firstKey = Object.keys(errData.errors)[0];
                errMsg = errData.errors[firstKey]?.[0] || errMsg;
            } else if (errData?.message) {
                errMsg = errData.message;
            }
            showToast(errMsg, 'error');
        } finally {
            setEmployeeSubmitting(false);
        }
    };

    const handleToggleEmployee = async (emp) => {
        try {
            const res = await api.patch(`/employees/${emp.id}/toggle`);
            const updated = res.data.employee || res.data;
            const newStatus = updated.status || (emp.status === 'Active' ? 'Inactive' : 'Active');
            setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, ...updated, status: newStatus } : e));
            resetSettingsCache('employees');

            const stored = (sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'));
            if (stored) {
                try {
                    const currentUser = JSON.parse(stored);
                    const isCurrent = (currentUser.id && Number(currentUser.id) === Number(emp.id)) ||
                        (currentUser.username && currentUser.username === emp.username);

                    if (isCurrent) {
                        const newAuthUser = {
                            ...currentUser,
                            status: newStatus,
                        };
                        sessionStorage.setItem('auth_user', JSON.stringify(newAuthUser));
                        localStorage.removeItem('auth_user');
                        window.dispatchEvent(new Event('auth_user_updated'));
                    }
                } catch (err) {}
            }

            showToast(`Employee account set to ${newStatus}.`, 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to toggle employee status.', 'error');
        }
    };

    const openDeleteEmployeeModal = (emp) => {
        if (emp.id === 1 || emp.username === 'admin' || emp.employee_id === 'EMP-000') {
            showToast('Cannot delete the default administrator account.', 'error');
            return;
        }
        setEmployeeToDelete(emp);
        setShowDeleteEmployeeModal(true);
    };

    const handleConfirmDeleteEmployee = async (emp) => {
        const target = emp || employeeToDelete;
        if (!target) return;

        try {
            await api.delete(`/employees/${target.id}`);
            setEmployees(prev => prev.filter(e => e.id !== target.id));
            resetSettingsCache('employees');
            showToast('Staff member permanently deleted.', 'success');
            setShowDeleteEmployeeModal(false);
            setEmployeeToDelete(null);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to delete staff member.', 'error');
            throw err;
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
        activeAccountSubTab, setActiveAccountSubTab,
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
        profileSubmitting, passwordSubmitting, employeeSubmitting,

        // Tab 2: General System Settings & Logo
        settings, handleSettingInputChange, handleToggleSetting, handleSaveBulkSettings,
        showConfirmSaveModal, handleConfirmSaveBulkSettings, handleCancelSaveBulkSettings,
        logoUrl, sidebarLogoUrl, logoUploading, logoProgress, logoRemoving, handleLogoUpload, handleLogoUploadWithCrop, handleLogoRemove,

        // Tab 3: Products Settings
        categories, showCategoryModal, setShowCategoryModal, selectedCategory, setSelectedCategory,
        categoryName, setCategoryName, categoryVariants, setCategoryVariants,
        newOptionValue, setNewOptionValue, categorySubmitting,
        handleCategorySubmit, handleDeleteCategory, handleAddVariantOption, handleUpdateVariantOption, handleDeleteVariantOption, getOptionsForType,
        uomList, newUomValue, setNewUomValue, editingUomIndex, setEditingUomIndex, editUomValue, setEditUomValue,
        handleAddUom, handleUpdateUom, handleDeleteUom,

        // Tab 4: Alert Rules
        alertRules, showRuleModal, setShowRuleModal, ruleForm, setRuleForm,
        handleRuleSubmit, handleToggleRule, handleDeleteRule,

        // Tab 5: Employees
        employees, showEmployeeModal, setShowEmployeeModal, employeeForm, setEmployeeForm, selectedEmployee, setSelectedEmployee,
        showDeleteEmployeeModal, setShowDeleteEmployeeModal, employeeToDelete, setEmployeeToDelete,
        handleEmployeeSubmit, openEditEmployee, handleToggleEmployee, handleDeleteEmployee: openDeleteEmployeeModal,
        openDeleteEmployeeModal, handleConfirmDeleteEmployee, openAddEmployee,

        // Tab 6: Checkers
        checkers, showCheckerModal, setShowCheckerModal, checkerForm, setCheckerForm, selectedChecker, setSelectedChecker,
        handleCheckerSubmit, openEditChecker, openAddChecker
    };
}
