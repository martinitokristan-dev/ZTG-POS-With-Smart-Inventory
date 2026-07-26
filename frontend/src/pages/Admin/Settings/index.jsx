import React from 'react';
import useSettings from './hooks/useSettings';
import ProfileTab from './tabs/ProfileTab';
import GeneralTab from './tabs/GeneralTab';
import ProductsTab from './tabs/ProductsTab';
import AlertsTab from './tabs/AlertsTab';
import EmployeesTab from './tabs/EmployeesTab';
import CheckersTab from './tabs/CheckersTab';
import CategoryModal from './modals/CategoryModal';
import EmployeeModal from './modals/EmployeeModal';
import PasswordModal from './modals/PasswordModal';
import CheckerModal from './modals/CheckerModal';
import ConfirmSaveModal from './modals/ConfirmSaveModal';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';

export default function SettingsView() {
    const {
        loading, isProfileDirty, isSettingsDirty, notificationsCount,
        activeTab, setActiveTab, activeSubTab, setActiveSubTab, activeAlertsSubTab, setActiveAlertsSubTab,
        editingTab, handleStartEditTab, handleCancelEditTab,
        profileData, setProfileData, avatarUploading, avatarRemoving, handleAvatarUpload, handleAvatarRemove,
        confirmingRemove, handleAvatarRemoveConfirmed, handleAvatarRemoveCancel,
        passwordData, setPasswordData, showPasswordModal, setShowPasswordModal, showPIN, setShowPIN,
        settings, handleSettingInputChange, handleToggleSetting, handleSaveBulkSettings,
        handleConfirmSaveBulkSettings, handleCancelSaveBulkSettings, showConfirmSaveModal,
        logoUrl, sidebarLogoUrl, logoUploading, logoRemoving, handleLogoUpload, handleLogoUploadWithCrop, handleLogoRemove,
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
        const stored = localStorage.getItem('auth_user');
        return stored ? JSON.parse(stored) : null;
    }, []);

    const isCashier = profileData?.role === 'Cashier' || authUser?.role === 'Cashier';

    // Force active tab to profile if cashier
    React.useEffect(() => {
        if (isCashier && activeTab !== 'profile') {
            setActiveTab('profile');
        }
    }, [isCashier, activeTab, setActiveTab]);

    return (
        <>
            <div className="top-bar">
                <div>
                    <h1 id="settingsPageTitle" style={{ fontSize: '20px', marginBottom: '2px' }}>
                        {isCashier ? 'My Profile' : 'System Settings'}
                    </h1>
                    <div id="settingsPageDesc" className="page-description" style={{ marginTop: 0, fontSize: '12px' }}>
                        {isCashier ? 'Manage your personal details, photo, and account security.' : 'Configure inventory thresholds, categories, alerts, and employee access.'}
                    </div>
                </div>
                <div className="top-bar-actions"></div>
            </div>

            <div className="content-body settings-page-body">
                {loading ? (
                    <LoadingSpinner text={isCashier ? 'Loading profile...' : 'Loading settings...'} />
                ) : (
                    <div className="settings-tabs-wrap" style={{ paddingBottom: '60px' }}>
                    {/* Navigation Tabs Header (Hidden for Cashiers) */}
                    {!isCashier && (
                        <div className="tabs-header">
                            {[
                                { id: 'profile', label: 'My Profile' },
                                { id: 'general', label: 'General' },
                                { id: 'products', label: 'Products Settings' },
                                { id: 'alerts', label: 'Alerts & Notifications' },
                                { id: 'employees', label: 'Employee\'s role' },
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

                    {/* TAB CONTENTS */}
                    <div className={`tab-content ${activeTab === 'profile' ? 'active' : ''}`}>
                        {activeTab === 'profile' && (
                            <ProfileTab
                                profileData={profileData} setProfileData={setProfileData} handleProfileSubmit={handleProfileSubmit}
                                setShowPasswordModal={setShowPasswordModal} showPIN={showPIN} setShowPIN={setShowPIN} isProfileDirty={isProfileDirty}
                                handleAvatarUpload={handleAvatarUpload} handleAvatarRemove={handleAvatarRemove} avatarUploading={avatarUploading}
                                avatarRemoving={avatarRemoving}
                                confirmingRemove={confirmingRemove}
                                handleAvatarRemoveConfirmed={handleAvatarRemoveConfirmed}
                                handleAvatarRemoveCancel={handleAvatarRemoveCancel}
                                isEditing={editingTab === 'profile'}
                                onStartEdit={() => handleStartEditTab('profile')}
                                onCancelEdit={() => handleCancelEditTab('profile')}
                            />
                        )}
                    </div>

                    {!isCashier && (
                        <>
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
                                        logoRemoving={logoRemoving}
                                        isEditing={editingTab === 'general'}
                                        onStartEdit={() => handleStartEditTab('general')}
                                        onCancelEdit={() => handleCancelEditTab('general')}
                                    />
                                )}
                            </div>

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

                            <div className={`tab-content ${activeTab === 'alerts' ? 'active' : ''}`}>
                                {activeTab === 'alerts' && (
                                    <AlertsTab 
                                        activeAlertsSubTab={activeAlertsSubTab} setActiveAlertsSubTab={setActiveAlertsSubTab} settings={settings} handleSettingInputChange={handleSettingInputChange} handleToggleSetting={handleToggleSetting}
                                        alertRules={alertRules} setShowRuleModal={setShowRuleModal} handleToggleRule={handleToggleRule} handleDeleteRule={handleDeleteRule} handleSaveBulkSettings={handleSaveBulkSettings}
                                    />
                                )}
                            </div>

                            <div className={`tab-content ${activeTab === 'employees' ? 'active' : ''}`}>
                                {activeTab === 'employees' && (
                                    <EmployeesTab 
                                        employees={employees} openEditEmployee={openEditEmployee} openAddEmployee={openAddEmployee} handleToggleEmployee={handleToggleEmployee}
                                        setSelectedEmployee={setSelectedEmployee} setEmployeeForm={setEmployeeForm} setShowEmployeeModal={setShowEmployeeModal}
                                    />
                                )}
                            </div>

                            <div className={`tab-content ${activeTab === 'checkers' ? 'active' : ''}`}>
                                {activeTab === 'checkers' && (
                                    <CheckersTab 
                                        checkers={checkers} openEditChecker={openEditChecker} openAddChecker={openAddChecker}
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
                showCategoryModal={showCategoryModal} setShowCategoryModal={setShowCategoryModal}
                selectedCategory={selectedCategory} categoryName={categoryName} setCategoryName={setCategoryName}
                categoryVariants={categoryVariants} setCategoryVariants={setCategoryVariants}
                getOptionsForType={getOptionsForType}
                handleCategorySubmit={handleCategorySubmit}
                categorySubmitting={categorySubmitting}
            />
            <EmployeeModal 
                showEmployeeModal={showEmployeeModal} setShowEmployeeModal={setShowEmployeeModal}
                selectedEmployee={selectedEmployee} employeeForm={employeeForm} setEmployeeForm={setEmployeeForm}
                handleEmployeeSubmit={handleEmployeeSubmit}
            />
            <PasswordModal 
                showPasswordModal={showPasswordModal} setShowPasswordModal={setShowPasswordModal}
                passwordData={passwordData} setPasswordData={setPasswordData} handlePasswordSubmit={handlePasswordSubmit}
            />
            <CheckerModal 
                showCheckerModal={showCheckerModal} setShowCheckerModal={setShowCheckerModal}
                selectedChecker={selectedChecker} checkerForm={checkerForm} setCheckerForm={setCheckerForm}
                handleCheckerSubmit={handleCheckerSubmit}
            />
            <ConfirmSaveModal
                isOpen={showConfirmSaveModal}
                onConfirm={handleConfirmSaveBulkSettings}
                onCancel={handleCancelSaveBulkSettings}
            />
        </>
    );
}
