import React from 'react';
import useSettings from './hooks/useSettings';
import ProfileTab from './tabs/ProfileTab';
import GeneralTab from './tabs/GeneralTab';
import ProductsTab from './tabs/ProductsTab';
import EmployeesTab from './tabs/EmployeesTab';
import CheckersTab from './tabs/CheckersTab';
import ActivityLogs from '../ActivityLogs/index.jsx';
import CategoryModal from './modals/CategoryModal';
import EmployeeModal from './modals/EmployeeModal';
import PasswordModal from './modals/PasswordModal';
import CheckerModal from './modals/CheckerModal';
import ConfirmSaveModal from './modals/ConfirmSaveModal';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';

export default function SettingsView() {
    const {
        loading, isProfileDirty, isSettingsDirty, notificationsCount,
        activeTab, setActiveTab, activeAccountSubTab, setActiveAccountSubTab,
        activeSubTab, setActiveSubTab,
        editingTab, handleStartEditTab, handleCancelEditTab,
        profileData, setProfileData, avatarUploading, avatarProgress, avatarRemoving, handleAvatarUpload, handleAvatarRemove,
        confirmingRemove, handleAvatarRemoveConfirmed, handleAvatarRemoveCancel,
        passwordData, setPasswordData, showPasswordModal, setShowPasswordModal, showPIN, setShowPIN,
        settings, handleSettingInputChange, handleToggleSetting, handleSaveBulkSettings,
        handleConfirmSaveBulkSettings, handleCancelSaveBulkSettings, showConfirmSaveModal,
        logoUrl, sidebarLogoUrl, logoUploading, logoProgress, logoRemoving, handleLogoUpload, handleLogoUploadWithCrop, handleLogoRemove,
        categories, showCategoryModal, setShowCategoryModal, selectedCategory, setSelectedCategory, categoryName, setCategoryName,
        categoryVariants, setCategoryVariants, categorySubmitting,
        newOptionValue, setNewOptionValue,
        alertRules, showRuleModal, setShowRuleModal, ruleForm, setRuleForm,
        employees, showEmployeeModal, setShowEmployeeModal, employeeForm, setEmployeeForm, selectedEmployee, setSelectedEmployee,
        handleProfileSubmit, handlePasswordSubmit, handleCategorySubmit, handleDeleteCategory, handleAddVariantOption, handleUpdateVariantOption, handleDeleteVariantOption, getOptionsForType,
        handleRuleSubmit, handleToggleRule, handleDeleteRule,
        handleEmployeeSubmit, openEditEmployee, handleToggleEmployee, openAddEmployee,
        checkers, showCheckerModal, setShowCheckerModal, checkerForm, setCheckerForm, selectedChecker, setSelectedChecker, handleCheckerSubmit, openEditChecker, openAddChecker
    } = useSettings();

    const authUser = React.useMemo(() => {
        const stored = (sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'));
        return stored ? JSON.parse(stored) : null;
    }, []);

    const isCashier = profileData?.role === 'Cashier' || authUser?.role === 'Cashier';

    // Force active tab to account if cashier
    React.useEffect(() => {
        if (isCashier && activeTab !== 'account') {
            setActiveTab('account');
        }
    }, [isCashier, activeTab, setActiveTab]);

    return (
        <>
            <div className="top-bar">
                <div>
                    <h1 id="settingsPageTitle" style={{ fontSize: '20px', marginBottom: '2px' }}>
                        {isCashier ? 'My Account' : 'System Settings'}
                    </h1>
                    <div id="settingsPageDesc" className="page-description" style={{ marginTop: 0, fontSize: '12px' }}>
                        {isCashier ? 'Manage your personal details, photo, and account security.' : 'Configure inventory thresholds, categories, account profile, alerts, and employee access.'}
                    </div>
                </div>
                <div className="top-bar-actions"></div>
            </div>

            <div className="content-body settings-page-body">
                {loading ? (
                    <LoadingSpinner text={isCashier ? 'Loading account...' : 'Loading settings...'} />
                ) : (
                    <div className="settings-tabs-wrap" style={{ paddingBottom: '60px' }}>
                        {/* Primary Navigation Tabs Header (Hidden for Cashiers) */}
                        {!isCashier && (
                            <div className="tabs-header">
                                {[
                                    { id: 'account', label: 'My Account' },
                                    { id: 'general', label: 'General' },
                                    { id: 'products', label: 'Products Settings' },
                                    { id: 'employees', label: "Employee's role" },
                                    { id: 'checkers', label: 'Checkers' }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* TAB 1: MY ACCOUNT (UNIFIED VERTICAL SUB-TABS: PROFILE, INVENTORY ALERTS, TRANSACTION ALERTS, RESERVATION ALERTS, REPORTS, ACTIVITY LOGS) */}
                        <div className={`tab-content ${activeTab === 'account' ? 'active' : ''}`}>
                            {activeTab === 'account' && (
                                <>
                                    {isCashier ? (
                                        <ProfileTab
                                            profileData={profileData} setProfileData={setProfileData} handleProfileSubmit={handleProfileSubmit}
                                            setShowPasswordModal={setShowPasswordModal} showPIN={showPIN} setShowPIN={setShowPIN} isProfileDirty={isProfileDirty}
                                            handleAvatarUpload={handleAvatarUpload} handleAvatarRemove={handleAvatarRemove} avatarUploading={avatarUploading} avatarProgress={avatarProgress}
                                            avatarRemoving={avatarRemoving}
                                            confirmingRemove={confirmingRemove}
                                            handleAvatarRemoveConfirmed={handleAvatarRemoveConfirmed}
                                            handleAvatarRemoveCancel={handleAvatarRemoveCancel}
                                            isEditing={editingTab === 'profile'}
                                            onStartEdit={() => handleStartEditTab('profile')}
                                            onCancelEdit={() => handleCancelEditTab('profile')}
                                        />
                                    ) : (
                                        <div className="prod-tabs-layout">
                                            {/* Left Vertical Sidebar */}
                                            <div className="prod-vtab-sidebar">
                                                {[
                                                    {
                                                        id: 'profile',
                                                        icon: (
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                                                <circle cx="12" cy="7" r="4"/>
                                                            </svg>
                                                        ),
                                                        label: 'My Profile'
                                                    },
                                                    {
                                                        id: 'inventory',
                                                        icon: (
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/>
                                                                <path d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z"/>
                                                            </svg>
                                                        ),
                                                        label: 'Inventory Alerts'
                                                    },
                                                    {
                                                        id: 'transaction',
                                                        icon: (
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                                                                <rect x="9" y="3" width="6" height="4" rx="1"/>
                                                            </svg>
                                                        ),
                                                        label: 'Transaction Alerts'
                                                    },
                                                    {
                                                        id: 'reservation',
                                                        icon: (
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <rect x="3" y="4" width="18" height="18" rx="2"/>
                                                                <path d="M16 2v4M8 2v4M3 10h18"/>
                                                            </svg>
                                                        ),
                                                        label: 'Reservation Alerts'
                                                    },
                                                    {
                                                        id: 'reports',
                                                        icon: (
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <rect x="2" y="4" width="20" height="16" rx="2"/>
                                                                <path d="M22 6l-10 7L2 6"/>
                                                            </svg>
                                                        ),
                                                        label: 'Reports'
                                                    },
                                                    {
                                                        id: 'activity',
                                                        icon: (
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                                                            </svg>
                                                        ),
                                                        label: 'Activity Logs'
                                                    }
                                                ].map(tab => (
                                                    <button
                                                        key={tab.id}
                                                        type="button"
                                                        onClick={() => setActiveAccountSubTab(tab.id)}
                                                        className={`prod-vtab-btn ${activeAccountSubTab === tab.id ? 'active' : ''}`}
                                                    >
                                                        {tab.icon}
                                                        {tab.label}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Right Panel Content */}
                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                <div className="prod-panel-content" style={{ flex: 1, padding: activeAccountSubTab === 'profile' ? '0' : '24px 32px' }}>
                                                    {/* Sub-Panel 1: My Profile */}
                                                    {activeAccountSubTab === 'profile' && (
                                                        <ProfileTab
                                                            profileData={profileData} setProfileData={setProfileData} handleProfileSubmit={handleProfileSubmit}
                                                            setShowPasswordModal={setShowPasswordModal} showPIN={showPIN} setShowPIN={setShowPIN} isProfileDirty={isProfileDirty}
                                                            handleAvatarUpload={handleAvatarUpload} handleAvatarRemove={handleAvatarRemove} avatarUploading={avatarUploading} avatarProgress={avatarProgress}
                                                            avatarRemoving={avatarRemoving}
                                                            confirmingRemove={confirmingRemove}
                                                            handleAvatarRemoveConfirmed={handleAvatarRemoveConfirmed}
                                                            handleAvatarRemoveCancel={handleAvatarRemoveCancel}
                                                            isEditing={editingTab === 'profile'}
                                                            onStartEdit={() => handleStartEditTab('profile')}
                                                            onCancelEdit={() => handleCancelEditTab('profile')}
                                                        />
                                                    )}

                                                    {/* Sub-Panel 2: Inventory Alerts */}
                                                    {activeAccountSubTab === 'inventory' && (
                                                        <div className="prod-vtab-panel active">
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                    <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" style={{ width: '18px', height: '18px' }}><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z"/></svg>
                                                                </div>
                                                                <div>
                                                                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 2px' }}>Inventory Alerts</h4>
                                                                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Get notified about stock levels, damaged goods, and dashboard visibility.</p>
                                                                </div>
                                                            </div>
                                                            <div style={{ height: '1px', background: 'var(--border)', margin: '16px 0' }}></div>

                                                            <div style={{ background: 'var(--primary-light)', border: '1px solid var(--primary)', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
                                                                <label className="toggle-row" style={{ margin: 0, border: 'none', padding: 0, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                                                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary)', flex: 1 }}>Enable stock alerts (low-stock & out-of-stock)</span>
                                                                    <input type="checkbox" checked={settings.enable_stock_alerts_checkbox === 'true'} onChange={(e) => handleSettingInputChange('enable_stock_alerts_checkbox', e.target.checked ? 'true' : 'false')} />
                                                                </label>
                                                            </div>

                                                            <div className="checkbox-group" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                                                                <label className="toggle-row" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                                                                    <span className="toggle-label" style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Send alerts for low stock items</span>
                                                                    <input type="checkbox" checked={settings.send_low_stock_alerts === 'true'} onChange={() => handleToggleSetting('send_low_stock_alerts')} />
                                                                </label>
                                                                <label className="toggle-row" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                                                                    <span className="toggle-label" style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Send alerts for out-of-stock items</span>
                                                                    <input type="checkbox" checked={settings.send_oos_alerts === 'true'} onChange={() => handleToggleSetting('send_oos_alerts')} />
                                                                </label>
                                                                <label className="toggle-row" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                                                                    <span className="toggle-label" style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Send alerts for dead stock (no sales in 90+ days)</span>
                                                                    <input type="checkbox" checked={settings.send_dead_stock_alerts === 'true'} onChange={() => handleToggleSetting('send_dead_stock_alerts')} />
                                                                </label>
                                                                <label className="toggle-row" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                                                                    <span className="toggle-label" style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Send alerts when damaged items are recorded</span>
                                                                    <input type="checkbox" checked={settings.send_damaged_alerts === 'true'} onChange={() => handleToggleSetting('send_damaged_alerts')} />
                                                                </label>
                                                                <label className="toggle-row" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '12px 0' }}>
                                                                    <span className="toggle-label" style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Show inventory alerts on admin dashboard</span>
                                                                    <input type="checkbox" checked={settings.show_alerts_on_dashboard === 'true'} onChange={() => handleToggleSetting('show_alerts_on_dashboard')} />
                                                                </label>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Sub-Panel 3: Transaction Alerts */}
                                                    {activeAccountSubTab === 'transaction' && (
                                                        <div className="prod-vtab-panel active">
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                    <svg viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" style={{ width: '18px', height: '18px' }}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
                                                                </div>
                                                                <div>
                                                                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 2px' }}>Transaction Alerts</h4>
                                                                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Notifications for purchase orders, refunds, and large sales events.</p>
                                                                </div>
                                                            </div>
                                                            <div style={{ height: '1px', background: 'var(--border)', margin: '16px 0' }}></div>

                                                            <div className="checkbox-group" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                                                                <label className="toggle-row" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                                                                    <span className="toggle-label" style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Send alerts when refunds are processed</span>
                                                                    <input type="checkbox" checked={settings.send_refund_alerts === 'true'} onChange={() => handleToggleSetting('send_refund_alerts')} />
                                                                </label>
                                                                <label className="toggle-row" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                                                                    <span className="toggle-label" style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Send alerts when returns are processed</span>
                                                                    <input type="checkbox" checked={settings.send_return_alerts === 'true'} onChange={() => handleToggleSetting('send_return_alerts')} />
                                                                </label>
                                                                <label className="toggle-row" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '12px 0' }}>
                                                                    <span className="toggle-label" style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Send alerts when transactions are voided</span>
                                                                    <input type="checkbox" checked={settings.send_void_transaction_alerts === 'true'} onChange={() => handleToggleSetting('send_void_transaction_alerts')} />
                                                                </label>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Sub-Panel 4: Reservation Alerts */}
                                                    {activeAccountSubTab === 'reservation' && (
                                                        <div className="prod-vtab-panel active">
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                    <svg viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" style={{ width: '18px', height: '18px' }}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                                                                </div>
                                                                <div>
                                                                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 2px' }}>Reservation Alerts</h4>
                                                                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Stay informed about upcoming and expired reservations.</p>
                                                                </div>
                                                            </div>
                                                            <div style={{ height: '1px', background: 'var(--border)', margin: '16px 0' }}></div>

                                                            <div className="checkbox-group" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                                                                <label className="toggle-row" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                                                                    <span className="toggle-label" style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Send alerts for reservations expiring soon (24 hours before)</span>
                                                                    <input type="checkbox" checked={settings.send_reservation_expiring_alerts === 'true'} onChange={() => handleToggleSetting('send_reservation_expiring_alerts')} />
                                                                </label>
                                                                <label className="toggle-row" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '12px 0' }}>
                                                                    <span className="toggle-label" style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Send alerts when reservations expire</span>
                                                                    <input type="checkbox" checked={settings.send_reservation_expired_alerts === 'true'} onChange={() => handleToggleSetting('send_reservation_expired_alerts')} />
                                                                </label>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Sub-Panel 5: Reports */}
                                                    {activeAccountSubTab === 'reports' && (
                                                        <div className="prod-vtab-panel active">
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                    <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" style={{ width: '18px', height: '18px' }}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></svg>
                                                                </div>
                                                                <div>
                                                                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 2px' }}>Reports</h4>
                                                                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Configure automated report reminders.</p>
                                                                </div>
                                                            </div>
                                                            <div style={{ height: '1px', background: 'var(--border)', margin: '16px 0' }}></div>

                                                            <div className="checkbox-group" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                                                                <label className="toggle-row" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                                                                    <span className="toggle-label" style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Remind admin to report the daily sales at 4:30 PM and 5:00 PM (Mon-Sat)</span>
                                                                    <input type="checkbox" checked={settings.remind_daily_sales_report === 'true'} onChange={() => handleToggleSetting('remind_daily_sales_report')} />
                                                                </label>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Sub-Panel 6: Activity Logs */}
                                                    {activeAccountSubTab === 'activity' && (
                                                        <div className="prod-vtab-panel active" style={{ padding: '0' }}>
                                                            <ActivityLogs />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {!isCashier && (
                            <>
                                {/* TAB 2: GENERAL */}
                                <div className={`tab-content ${activeTab === 'general' ? 'active' : ''}`}>
                                    {activeTab === 'general' && (
                                        <GeneralTab 
                                            settings={settings}
                                            handleSettingInputChange={handleSettingInputChange}
                                            handleToggleSetting={handleToggleSetting}
                                            handleSaveBulkSettings={handleSaveBulkSettings}
                                            logoUrl={logoUrl}
                                            sidebarLogoUrl={sidebarLogoUrl}
                                            onLogoUpload={handleLogoUpload}
                                            onLogoUploadWithCrop={handleLogoUploadWithCrop}
                                            onLogoRemove={handleLogoRemove}
                                            logoUploading={logoUploading}
                                            logoProgress={logoProgress}
                                            logoRemoving={logoRemoving}
                                            isEditing={editingTab === 'general'}
                                            onStartEdit={() => handleStartEditTab('general')}
                                            onCancelEdit={() => handleCancelEditTab('general')}
                                        />
                                    )}
                                </div>

                                {/* TAB 3: PRODUCTS SETTINGS */}
                                <div className={`tab-content ${activeTab === 'products' ? 'active' : ''}`}>
                                    {activeTab === 'products' && (
                                        <ProductsTab 
                                            activeSubTab={activeSubTab} setActiveSubTab={setActiveSubTab} settings={settings} handleSettingInputChange={handleSettingInputChange} handleToggleSetting={handleToggleSetting}
                                            categories={categories} setSelectedCategory={setSelectedCategory} setCategoryName={setCategoryName} setShowCategoryModal={setShowCategoryModal} handleDeleteCategory={handleDeleteCategory} setCategoryVariants={setCategoryVariants}
                                            newOptionValue={newOptionValue} setNewOptionValue={setNewOptionValue} handleAddVariantOption={handleAddVariantOption} handleUpdateVariantOption={handleUpdateVariantOption} handleDeleteVariantOption={handleDeleteVariantOption} getOptionsForType={getOptionsForType}
                                            handleSaveBulkSettings={handleSaveBulkSettings}
                                        />
                                    )}
                                </div>

                                {/* TAB 4: EMPLOYEES */}
                                <div className={`tab-content ${activeTab === 'employees' ? 'active' : ''}`}>
                                    {activeTab === 'employees' && (
                                        <EmployeesTab 
                                            employees={employees} openEditEmployee={openEditEmployee} openAddEmployee={openAddEmployee} handleToggleEmployee={handleToggleEmployee}
                                            setSelectedEmployee={setSelectedEmployee} setEmployeeForm={setEmployeeForm} setShowEmployeeModal={setShowEmployeeModal}
                                        />
                                    )}
                                </div>

                                {/* TAB 5: CHECKERS */}
                                <div className={`tab-content ${activeTab === 'checkers' ? 'active' : ''}`}>
                                    {activeTab === 'checkers' && (
                                        <CheckersTab 
                                            checkers={checkers} openEditChecker={openEditChecker} openAddChecker={openAddChecker}
                                            setSelectedChecker={setSelectedChecker} setCheckerForm={setCheckerForm} setShowCheckerModal={setShowCheckerModal}
                                        />
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* MODALS */}
            <CategoryModal
                isOpen={showCategoryModal}
                onClose={() => setShowCategoryModal(false)}
                categoryName={categoryName}
                setCategoryName={setCategoryName}
                onSubmit={handleCategorySubmit}
                selectedCategory={selectedCategory}
                submitting={categorySubmitting}
                categoryVariants={categoryVariants}
                setCategoryVariants={setCategoryVariants}
                getOptionsForType={getOptionsForType}
            />

            <EmployeeModal
                isOpen={showEmployeeModal}
                onClose={() => setShowEmployeeModal(false)}
                employeeForm={employeeForm}
                setEmployeeForm={setEmployeeForm}
                onSubmit={handleEmployeeSubmit}
                selectedEmployee={selectedEmployee}
            />

            <PasswordModal
                isOpen={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
                passwordData={passwordData}
                setPasswordData={setPasswordData}
                onSubmit={handlePasswordSubmit}
            />

            <CheckerModal
                isOpen={showCheckerModal}
                onClose={() => setShowCheckerModal(false)}
                checkerForm={checkerForm}
                setCheckerForm={setCheckerForm}
                onSubmit={handleCheckerSubmit}
                selectedChecker={selectedChecker}
            />

            <ConfirmSaveModal
                isOpen={showConfirmSaveModal}
                onConfirm={handleConfirmSaveBulkSettings}
                onCancel={handleCancelSaveBulkSettings}
            />
        </>
    );
}
