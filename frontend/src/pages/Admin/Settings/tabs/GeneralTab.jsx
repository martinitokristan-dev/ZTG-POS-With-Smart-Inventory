import React, { useRef, useState, useEffect } from 'react';
import LogoCropModal from '../modals/LogoCropModal';
import ImageUploadOverlay from '../../../../shared/components/ImageUploadOverlay';
import useTheme from '../../../../shared/hooks/useTheme';
import { showCenterToast } from '../../../../utils/toast';

// Helper function to replace legacy localhost or blocked r2.dev image URLs with backend proxy paths
const fixImageUrl = (url) => {
    if (!url) return null;
    if (typeof url !== 'string') return url;
    let cleanUrl = url.trim();

    // Automatically upgrade http to https for production URLs to avoid Mixed Content errors
    if (cleanUrl.startsWith('http://') && !cleanUrl.includes('localhost') && !cleanUrl.includes('127.0.0.1')) {
        cleanUrl = cleanUrl.replace(/^http:\/\//i, 'https://');
    }

    if (cleanUrl.includes('localhost') || cleanUrl.includes('127.0.0.1')) {
        if (cleanUrl.includes('/storage/')) {
            cleanUrl = '/storage/' + cleanUrl.split('/storage/')[1];
        }
    }
    if (cleanUrl.includes('r2.dev/') || cleanUrl.includes('cloudflarestorage.com/')) {
        const match = cleanUrl.match(/(avatars|logos|products)\/.+$/);
        if (match) {
            const mediaPath = match[0];
            const backendBase = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : '';
            cleanUrl = `${backendBase}/api/media/${mediaPath}`;
        }
    }
    return cleanUrl;
};

export default function GeneralTab({ 
    settings, 
    handleSettingInputChange, 
    handleToggleSetting, 
    handleSaveBulkSettings, 
    logoUrl, 
    sidebarLogoUrl,
    logoUploading, 
    logoProgress = 0, 
    logoRemoving,
    handleLogoUpload,
    handleLogoUploadWithCrop,
    handleLogoRemove,
    onLogoUpload,
    onLogoUploadWithCrop,
    onLogoRemove, 
    isEditing,
    onStartEdit,
    onCancelEdit
}) {
    const { theme, resolvedTheme, isDark, setTheme } = useTheme();
    const logoInputRef = useRef(null);

    const [pendingFile, setPendingFile] = useState(null);
    const [showCropModal, setShowCropModal] = useState(false);
    const [logoError, setLogoError] = useState(false);

    React.useEffect(() => {
        setLogoError(false);
    }, [logoUrl]);

    const cleanLogoUrl = fixImageUrl(logoUrl);

    const uploadWithCropHandler = handleLogoUploadWithCrop || onLogoUploadWithCrop;
    const removeHandler = handleLogoRemove || onLogoRemove;

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPendingFile(file);
        setShowCropModal(true);
        e.target.value = '';
    };

    const handleCropConfirm = (originalFile, croppedSidebarBlob) => {
        setShowCropModal(false);
        setPendingFile(null);
        if (uploadWithCropHandler) {
            uploadWithCropHandler(originalFile, croppedSidebarBlob);
        }
    };

    return (
        <div className="card" style={{ marginBottom: '16px', paddingBottom: '24px' }}>
            <div className="settings-section">
                {/* Header with inline Card Edit / Save / Cancel Button */}
                <div className="settings-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                            Business Identity & Compliance
                        </h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                            Configure official store identity, BIR tax details, and receipt information
                        </p>
                    </div>
                    {!isEditing ? (
                        <button 
                            type="button" 
                            className="btn btn-primary btn-sm" 
                            style={{ padding: '6px 14px', fontWeight: 600 }}
                            onClick={onStartEdit}
                        >
                            Edit Settings
                        </button>
                    ) : (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                                type="button" 
                                className="btn btn-secondary btn-sm" 
                                style={{ padding: '6px 14px' }}
                                onClick={onCancelEdit}
                            >
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                className="btn btn-primary btn-sm" 
                                style={{ padding: '6px 14px' }}
                                onClick={handleSaveBulkSettings}
                            >
                                Save Settings
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Business Identity fields: Logo left/top, fields responsive right ── */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start', marginBottom: '24px' }}>

                    {/* Logo uploader – fixed column */}
                    <div style={{ flexShrink: 0, width: '200px', margin: '0 auto' }}>
                        <label className="form-label" style={{ display: 'block', marginBottom: '8px' }}>Business Logo</label>
                        <div
                            style={{
                                width: '200px', height: '160px', border: '2px dashed var(--border)',
                                borderRadius: '12px', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', overflow: 'hidden',
                                background: 'var(--bg-secondary)', position: 'relative'
                            }}
                        >
                            <ImageUploadOverlay isUploading={logoUploading} progress={logoProgress} borderRadius="12px" />
                            {cleanLogoUrl && !logoError ? (
                                <img
                                    src={cleanLogoUrl}
                                    alt="Business logo"
                                    style={{ maxWidth: '190px', maxHeight: '150px', objectFit: 'contain' }}
                                    onError={() => setLogoError(true)}
                                />
                            ) : (
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px', lineHeight: 1.5 }}>
                                    No logo<br />uploaded
                                </span>
                            )}
                        </div>

                        {isEditing && (
                            <>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '10px', width: '100%' }}>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        style={{ fontSize: '11px', fontWeight: '600', padding: '6px 12px', flex: 1, whiteSpace: 'nowrap' }}
                                        onClick={() => logoInputRef.current?.click()}
                                        disabled={logoUploading || logoRemoving}
                                    >
                                        {logoUploading ? 'Uploading…' : logoUrl ? 'Change' : 'Upload Logo'}
                                    </button>
                                    {logoUrl && (
                                        <button
                                            type="button"
                                            className="btn"
                                            style={{ 
                                                fontSize: '11px', 
                                                fontWeight: '600', 
                                                padding: '6px 12px', 
                                                color: '#EF4444', 
                                                border: '1px solid #FCA5A5', 
                                                backgroundColor: '#FEF2F2',
                                                whiteSpace: 'nowrap'
                                            }}
                                            onClick={removeHandler}
                                            disabled={logoUploading || logoRemoving}
                                        >
                                            {logoRemoving ? 'Removing…' : 'Remove'}
                                        </button>
                                    )}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    JPG, PNG, WebP · Crop available
                                </div>
                            </>
                        )}
                        <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            style={{ display: 'none' }}
                            onChange={handleFileSelect}
                            disabled={!isEditing}
                        />

                        {/* Circle Crop Modal */}
                        <LogoCropModal
                            isOpen={showCropModal}
                            onClose={() => { setShowCropModal(false); setPendingFile(null); }}
                            onConfirm={handleCropConfirm}
                            imageFile={pendingFile}
                            loading={logoUploading}
                            progress={logoProgress}
                        />
                    </div>

                    {/* All business detail fields – responsive grid */}
                    <div style={{ flex: 1, minWidth: '260px', width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px 20px' }}>

                        {/* Row 1: Business Name | Branch Location */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" htmlFor="businessName">Business Name</label>
                            <input
                                type="text"
                                id="businessName"
                                className="form-control"
                                value={settings.business_name || ''}
                                onChange={(e) => handleSettingInputChange('business_name', e.target.value)}
                                disabled={!isEditing}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" htmlFor="branchLocation">Branch Location</label>
                            <input
                                type="text"
                                id="branchLocation"
                                className="form-control"
                                value={settings.branch_location || ''}
                                onChange={(e) => handleSettingInputChange('branch_location', e.target.value)}
                                disabled={!isEditing}
                            />
                        </div>

                        {/* Row 2: Full Business Address – spans both columns */}
                        <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                            <label className="form-label" htmlFor="businessAddress">
                                Full Business Address
                                <span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span>
                                <span style={{ fontSize: '11px', fontWeight: '400', color: 'var(--text-muted)', marginLeft: '8px' }}>Appears on all printed receipts</span>
                            </label>
                            <input
                                type="text"
                                id="businessAddress"
                                className="form-control"
                                placeholder="e.g. 123 Industrial Ave., Brgy. San Jose, Butuan City, Agusan del Norte"
                                value={settings.address || ''}
                                onChange={(e) => handleSettingInputChange('address', e.target.value)}
                                disabled={!isEditing}
                            />
                        </div>

                        {/* Row 3: Contact | Email */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" htmlFor="contactNumber">
                                Contact Number
                                <span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span>
                            </label>
                            <input
                                type="tel"
                                id="contactNumber"
                                className="form-control"
                                placeholder="09XXXXXXXXX"
                                value={settings.contact_number || ''}
                                maxLength={11}
                                inputMode="numeric"
                                onChange={(e) => handleSettingInputChange('contact_number', e.target.value.replace(/\D/g, '').slice(0, 11))}
                                onKeyDown={(e) => {
                                    if (
                                        !/^[0-9]$/.test(e.key) && 
                                        !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter'].includes(e.key) &&
                                        !e.ctrlKey && !e.metaKey
                                    ) {
                                        e.preventDefault();
                                    }
                                }}
                                disabled={!isEditing}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" htmlFor="emailAddress">Email Address</label>
                            <input
                                type="email"
                                id="emailAddress"
                                className="form-control"
                                value={settings.email_address || ''}
                                onChange={(e) => handleSettingInputChange('email_address', e.target.value)}
                                disabled={!isEditing}
                            />
                        </div>

                        {/* Row 4: BIR TIN | Tax Rate | Currency */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" htmlFor="businessTin">
                                BIR TIN Number
                                <span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span>
                                <span style={{ fontSize: '11px', fontWeight: '400', color: 'var(--text-muted)', marginLeft: '8px' }}>Frozen on each transaction</span>
                            </label>
                            <input
                                type="text"
                                id="businessTin"
                                className="form-control"
                                placeholder="e.g. 000-123-456-000"
                                value={settings.tin || ''}
                                onChange={(e) => handleSettingInputChange('tin', e.target.value.replace(/[^\d-]/g, ''))}
                                onKeyDown={(e) => {
                                    if (
                                        !/^[0-9-]$/.test(e.key) && 
                                        !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter'].includes(e.key) &&
                                        !e.ctrlKey && !e.metaKey
                                    ) {
                                        e.preventDefault();
                                    }
                                }}
                                disabled={!isEditing}
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" htmlFor="taxRate">Tax Rate (%)</label>
                                <input
                                    type="number"
                                    id="taxRate"
                                    className="form-control"
                                    value={settings.tax_rate || ''}
                                    onChange={(e) => handleSettingInputChange('tax_rate', e.target.value.replace(/[^0-9.]/g, ''))}
                                    onKeyDown={(e) => {
                                        if (
                                            !/^[0-9.]$/.test(e.key) && 
                                            !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter'].includes(e.key) &&
                                            !e.ctrlKey && !e.metaKey
                                        ) {
                                            e.preventDefault();
                                        }
                                    }}
                                    disabled={!isEditing}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" htmlFor="currency">Currency</label>
                                <input
                                    type="text"
                                    id="currency"
                                    className="form-control"
                                    value={settings.currency || ''}
                                    onChange={(e) => handleSettingInputChange('currency', e.target.value)}
                                    disabled={!isEditing}
                                />
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <div className="settings-section" style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '16px', color: 'var(--text-primary)' }}>
                    Inventory Configuration
                </h3>
                <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: 0 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" htmlFor="deadStockPeriod">Dead Stock Threshold (days with no sales)</label>
                        <select
                            id="deadStockPeriod"
                            className="form-control"
                            value={settings.dead_stock_period || '30'}
                            onChange={(e) => handleSettingInputChange('dead_stock_period', e.target.value)}
                            disabled={!isEditing}
                            style={{ background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px 12px', fontSize: '13px', width: '100%', outline: 'none', opacity: isEditing ? 1 : 0.7 }}
                        >
                            <option value="15">15 Days</option>
                            <option value="30">30 Days (Default)</option>
                            <option value="60">60 Days</option>
                            <option value="90">90 Days</option>
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" htmlFor="dailyVoidLimit">Daily Void/Refund Limit</label>
                        <input
                            type="number"
                            id="dailyVoidLimit"
                            className="form-control"
                            value={settings.daily_void_limit || ''}
                            onChange={(e) => handleSettingInputChange('daily_void_limit', e.target.value)}
                            disabled={!isEditing}
                        />
                    </div>
                </div>
            </div>

            {/* ── Invoice & Receipt Numbering Configuration (BIR Sequential Standards) ── */}
            <div className="settings-section" style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                            </svg>
                            Invoice & Receipt Numbering
                        </h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                            Select how invoice numbers are issued: manual pre-printed booklet entry or automatic sequential numbers.
                        </p>
                    </div>

                    {/* Mode Status Pill */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px', backgroundColor: settings.si_numbering_mode === 'auto' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(59, 130, 246, 0.12)', color: settings.si_numbering_mode === 'auto' ? '#059669' : '#2563EB', fontSize: '11px', fontWeight: '700' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'currentColor' }}></span>
                        {settings.si_numbering_mode === 'auto' ? 'System-Generated (Auto) Active' : 'Manual Booklet Active'}
                    </div>
                </div>

                {/* Mode Selector Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                    {/* Manual Mode Option */}
                    <div
                        onClick={() => {
                            if (!isEditing) {
                                showCenterToast("Please click 'Edit Settings' at the top right to change the numbering method.");
                                return;
                            }
                            if (handleSettingInputChange) {
                                handleSettingInputChange('si_numbering_mode', 'manual');
                            }
                        }}
                        style={{
                            border: (settings.si_numbering_mode || 'manual') === 'manual' ? '2px solid #3B82F6' : '1px solid var(--border)',
                            borderRadius: '12px',
                            padding: '14px 16px',
                            backgroundColor: (settings.si_numbering_mode || 'manual') === 'manual' ? 'rgba(59, 130, 246, 0.04)' : 'var(--bg-card)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: (settings.si_numbering_mode || 'manual') === 'manual' ? '0 2px 8px rgba(59, 130, 246, 0.1)' : 'none',
                            opacity: !isEditing && (settings.si_numbering_mode || 'manual') !== 'manual' ? 0.75 : 1
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 20h9"></path>
                                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                    </svg>
                                </div>
                                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Manual Pre-Printed Booklet</span>
                            </div>
                            <input
                                type="radio"
                                name="si_numbering_mode_choice"
                                checked={(settings.si_numbering_mode || 'manual') === 'manual'}
                                onChange={() => {
                                    if (!isEditing) {
                                        showCenterToast("Please click 'Edit Settings' at the top right to change the numbering method.");
                                        return;
                                    }
                                    if (handleSettingInputChange) {
                                        handleSettingInputChange('si_numbering_mode', 'manual');
                                    }
                                }}
                                style={{ accentColor: '#2563EB', cursor: 'pointer' }}
                            />
                        </div>
                        <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '0 0 0 36px', lineHeight: 1.4 }}>
                            Cashier enters the invoice or receipt number directly from the physical pre-printed booklet for each sale.
                        </p>
                    </div>

                    {/* System-Generated POS Invoicing Option */}
                    <div
                        onClick={() => {
                            if (!isEditing) {
                                showCenterToast("Please click 'Edit Settings' at the top right to change the numbering method.");
                                return;
                            }
                            if (handleSettingInputChange) {
                                handleSettingInputChange('si_numbering_mode', 'auto');
                            }
                        }}
                        style={{
                            border: settings.si_numbering_mode === 'auto' ? '2px solid #10B981' : '1px solid var(--border)',
                            borderRadius: '12px',
                            padding: '14px 16px',
                            backgroundColor: settings.si_numbering_mode === 'auto' ? 'rgba(16, 185, 129, 0.04)' : 'var(--bg-card)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: settings.si_numbering_mode === 'auto' ? '0 2px 8px rgba(16, 185, 129, 0.1)' : 'none',
                            opacity: !isEditing && settings.si_numbering_mode !== 'auto' ? 0.75 : 1
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polyline>
                                    </svg>
                                </div>
                                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>System-Generated (Automatic)</span>
                            </div>
                            <input
                                type="radio"
                                name="si_numbering_mode_choice"
                                checked={settings.si_numbering_mode === 'auto'}
                                onChange={() => {
                                    if (!isEditing) {
                                        showCenterToast("Please click 'Edit Settings' at the top right to change the numbering method.");
                                        return;
                                    }
                                    if (handleSettingInputChange) {
                                        handleSettingInputChange('si_numbering_mode', 'auto');
                                    }
                                }}
                                style={{ accentColor: '#059669', cursor: 'pointer' }}
                            />
                        </div>
                        <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '0 0 0 36px', lineHeight: 1.4 }}>
                            The system automatically generates and advances sequential invoice numbers on each transaction.
                        </p>
                    </div>
                </div>

                {/* Sub-settings visible when System-Generated mode is selected */}
                {settings.si_numbering_mode === 'auto' && (
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#059669', flexShrink: 0 }}>
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="16" x2="12" y2="12"></line>
                                <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                            <span>Set the starting sequence number for each document series:</span>
                        </div>

                        <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                            {/* Sales Invoice (S.I.) Counter */}
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" htmlFor="siCounterSi" style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>S.I. Next Series No.</span>
                                    <span style={{ color: '#2563EB', fontWeight: '700' }}>Preview: {String(settings.si_counter_si || '1').padStart(parseInt(settings.si_auto_digits || 6, 10), '0')}</span>
                                </label>
                                <input
                                    type="text"
                                    id="siCounterSi"
                                    className="form-control"
                                    value={settings.si_counter_si || '000001'}
                                    onChange={(e) => handleSettingInputChange('si_counter_si', e.target.value.replace(/\D/g, ''))}
                                    placeholder="000001"
                                    disabled={!isEditing}
                                    style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '13px' }}
                                />
                            </div>

                            {/* Delivery Receipt (D.R.) Counter */}
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" htmlFor="siCounterDr" style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>D.R. Next Series No.</span>
                                    <span style={{ color: '#059669', fontWeight: '700' }}>Preview: {String(settings.si_counter_dr || '1').padStart(parseInt(settings.si_auto_digits || 6, 10), '0')}</span>
                                </label>
                                <input
                                    type="text"
                                    id="siCounterDr"
                                    className="form-control"
                                    value={settings.si_counter_dr || '000001'}
                                    onChange={(e) => handleSettingInputChange('si_counter_dr', e.target.value.replace(/\D/g, ''))}
                                    placeholder="000001"
                                    disabled={!isEditing}
                                    style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '13px' }}
                                />
                            </div>

                            {/* Collection Receipt (C.R.) Counter */}
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" htmlFor="siCounterCr" style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>C.R. Next Series No.</span>
                                    <span style={{ color: '#7C3AED', fontWeight: '700' }}>Preview: {String(settings.si_counter_cr || '1').padStart(parseInt(settings.si_auto_digits || 6, 10), '0')}</span>
                                </label>
                                <input
                                    type="text"
                                    id="siCounterCr"
                                    className="form-control"
                                    value={settings.si_counter_cr || '000001'}
                                    onChange={(e) => handleSettingInputChange('si_counter_cr', e.target.value.replace(/\D/g, ''))}
                                    placeholder="000001"
                                    disabled={!isEditing}
                                    style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '13px' }}
                                />
                            </div>
                        </div>

                        {/* Digits Pad Length Control */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px dashed var(--border)', flexWrap: 'wrap', gap: '10px' }}>
                            <label className="form-label" htmlFor="siAutoDigits" style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: 0 }}>
                                Digit Length (4 to 10 digits):
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="number"
                                    id="siAutoDigits"
                                    className="form-control form-control-sm"
                                    min="4"
                                    max="10"
                                    value={settings.si_auto_digits || '6'}
                                    onChange={(e) => handleSettingInputChange('si_auto_digits', e.target.value)}
                                    disabled={!isEditing}
                                    style={{ width: '70px', textAlign: 'center', fontWeight: '700' }}
                                />
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>digits (e.g. 6 → 000001)</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="settings-section" style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '16px', color: 'var(--text-primary)' }}>
                    Reservation Configuration
                </h3>
                <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" htmlFor="reservationGracePeriod">Reservation Grace Period (days after pickup date)</label>
                        <input
                            type="number"
                            id="reservationGracePeriod"
                            className="form-control"
                            min="0"
                            value={settings.reservation_grace_period || '3'}
                            onChange={(e) => handleSettingInputChange('reservation_grace_period', e.target.value)}
                            disabled={!isEditing}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" htmlFor="reservationDepositPolicy">On Reservation Expiry, Deposit is:</label>
                        <select
                            id="reservationDepositPolicy"
                            className="form-control"
                            value={settings.reservation_deposit_policy || 'forfeit'}
                            onChange={(e) => handleSettingInputChange('reservation_deposit_policy', e.target.value)}
                            disabled={!isEditing}
                            style={{ background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px 12px', fontSize: '13px', width: '100%', outline: 'none', opacity: isEditing ? 1 : 0.7 }}
                        >
                            <option value="forfeit">Forfeited (keep as revenue)</option>
                            <option value="refund">Refunded (auto-void transaction)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* ── Theme & Global Appearance Section ── */}
            <div className="settings-section" style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                            Theme & Global Appearance
                        </h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                            Toggle modern dark mode or sync with system color preference globally
                        </p>
                    </div>

                    {/* Quick Dark Mode Switch */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            {isDark ? 'Dark Mode Active' : 'Default Mode Active'}
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                const nextMode = isDark ? 'light' : 'dark';
                                setTheme(nextMode);
                                if (handleSettingInputChange) handleSettingInputChange('theme', nextMode);
                            }}
                            style={{
                                position: 'relative',
                                width: '48px',
                                height: '26px',
                                borderRadius: '13px',
                                backgroundColor: isDark ? '#3B82F6' : '#CBD5E1',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s ease',
                                padding: '3px'
                            }}
                            aria-label="Toggle Dark Mode"
                        >
                            <div style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                backgroundColor: '#FFFFFF',
                                transform: isDark ? 'translateX(22px)' : 'translateX(0)',
                                transition: 'transform 0.2s ease',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {isDark ? (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                                    </svg>
                                ) : (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="5"></circle>
                                        <line x1="12" y1="1" x2="12" y2="3"></line>
                                        <line x1="12" y1="21" x2="12" y2="23"></line>
                                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                                        <line x1="1" y1="12" x2="3" y2="12"></line>
                                        <line x1="21" y1="12" x2="23" y2="12"></line>
                                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                                    </svg>
                                )}
                            </div>
                        </button>
                    </div>
                </div>

                {/* Theme Selector Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '20px' }}>
                    {/* Default Mode Card */}
                    <div
                        onClick={() => {
                            setTheme('light');
                            if (handleSettingInputChange) handleSettingInputChange('theme', 'light');
                        }}
                        style={{
                            border: theme === 'light' ? '2px solid #3B82F6' : '1px solid var(--border)',
                            borderRadius: '16px',
                            padding: '18px',
                            backgroundColor: 'var(--bg-card)',
                            cursor: 'pointer',
                            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                            position: 'relative',
                            boxShadow: theme === 'light' ? '0 12px 24px -8px rgba(59, 130, 246, 0.25), 0 0 0 1px #3B82F6' : '0 2px 8px rgba(0,0,0,0.04)'
                        }}
                    >
                        {/* Mini Dashboard Illustration Mockup */}
                        <div style={{ height: '94px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', overflow: 'hidden', display: 'flex', marginBottom: '14px', position: 'relative' }}>
                            {/* Mini Sidebar */}
                            <div style={{ width: '28px', backgroundColor: '#1E293B', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '8px', gap: '6px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#3B82F6' }}></div>
                                <div style={{ width: '14px', height: '3px', backgroundColor: '#3B82F6', borderRadius: '2px' }}></div>
                                <div style={{ width: '14px', height: '3px', backgroundColor: '#475569', borderRadius: '2px' }}></div>
                                <div style={{ width: '14px', height: '3px', backgroundColor: '#475569', borderRadius: '2px' }}></div>
                            </div>
                            {/* Mini Main Workspace */}
                            <div style={{ flex: 1, padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: '#F1F5F9' }}>
                                {/* Top Navbar */}
                                <div style={{ height: '14px', backgroundColor: '#FFFFFF', borderRadius: '4px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px' }}>
                                    <div style={{ height: '3px', width: '36px', backgroundColor: '#94A3B8', borderRadius: '2px' }}></div>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#3B82F6' }}></div>
                                </div>
                                {/* Mini Stat Cards */}
                                <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
                                    <div style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: '6px', border: '1px solid #E2E8F0', padding: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                        <div style={{ height: '3px', width: '22px', backgroundColor: '#CBD5E1', borderRadius: '2px' }}></div>
                                        <div style={{ height: '8px', width: '30px', backgroundColor: '#0F172A', borderRadius: '2px' }}></div>
                                    </div>
                                    <div style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: '6px', border: '1px solid #E2E8F0', padding: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                        <div style={{ height: '3px', width: '22px', backgroundColor: '#CBD5E1', borderRadius: '2px' }}></div>
                                        <div style={{ height: '8px', width: '26px', backgroundColor: '#10B981', borderRadius: '2px' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Title & Description */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>Default</span>
                                    <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', backgroundColor: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '12px' }}>Light</span>
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px' }}>Default bright slate theme for daylight</div>
                            </div>
                            {theme === 'light' && (
                                <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)' }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Dark Mode Card */}
                    <div
                        onClick={() => {
                            setTheme('dark');
                            if (handleSettingInputChange) handleSettingInputChange('theme', 'dark');
                        }}
                        style={{
                            border: theme === 'dark' ? '2px solid #3B82F6' : '1px solid var(--border)',
                            borderRadius: '16px',
                            padding: '18px',
                            backgroundColor: 'var(--bg-card)',
                            cursor: 'pointer',
                            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                            position: 'relative',
                            boxShadow: theme === 'dark' ? '0 12px 24px -8px rgba(59, 130, 246, 0.35), 0 0 0 1px #3B82F6' : '0 2px 8px rgba(0,0,0,0.2)'
                        }}
                    >
                        {/* Mini Dark Dashboard Illustration Mockup */}
                        <div style={{ height: '94px', borderRadius: '10px', backgroundColor: '#0B1329', border: '1px solid #263354', overflow: 'hidden', display: 'flex', marginBottom: '14px', position: 'relative' }}>
                            {/* Mini Sidebar */}
                            <div style={{ width: '28px', backgroundColor: '#0B1329', borderRight: '1px solid #263354', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '8px', gap: '6px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#3B82F6' }}></div>
                                <div style={{ width: '14px', height: '3px', backgroundColor: '#3B82F6', borderRadius: '2px' }}></div>
                                <div style={{ width: '14px', height: '3px', backgroundColor: '#334155', borderRadius: '2px' }}></div>
                                <div style={{ width: '14px', height: '3px', backgroundColor: '#334155', borderRadius: '2px' }}></div>
                            </div>
                            {/* Mini Main Workspace */}
                            <div style={{ flex: 1, padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: '#0B1329' }}>
                                {/* Top Navbar */}
                                <div style={{ height: '14px', backgroundColor: '#151F38', borderRadius: '4px', border: '1px solid #263354', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px' }}>
                                    <div style={{ height: '3px', width: '36px', backgroundColor: '#64748B', borderRadius: '2px' }}></div>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#60A5FA' }}></div>
                                </div>
                                {/* Mini Stat Cards */}
                                <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
                                    <div style={{ flex: 1, backgroundColor: '#151F38', borderRadius: '6px', border: '1px solid #263354', padding: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                        <div style={{ height: '3px', width: '22px', backgroundColor: '#475569', borderRadius: '2px' }}></div>
                                        <div style={{ height: '8px', width: '30px', backgroundColor: '#60A5FA', borderRadius: '2px' }}></div>
                                    </div>
                                    <div style={{ flex: 1, backgroundColor: '#151F38', borderRadius: '6px', border: '1px solid #263354', padding: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                        <div style={{ height: '3px', width: '22px', backgroundColor: '#475569', borderRadius: '2px' }}></div>
                                        <div style={{ height: '8px', width: '26px', backgroundColor: '#34D399', borderRadius: '2px' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Title & Description */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>Dark Mode</span>
                                    <span style={{ fontSize: '11px', fontWeight: '600', color: '#60A5FA', backgroundColor: 'rgba(59, 130, 246, 0.18)', padding: '2px 8px', borderRadius: '12px' }}>Dark</span>
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px' }}>Sleek dark slate theme for low light</div>
                            </div>
                            {theme === 'dark' && (
                                <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)' }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
