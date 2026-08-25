import React, { useRef, useState, useEffect } from 'react';
import ImageUploadOverlay from '../../../../shared/components/ImageUploadOverlay';

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

export default function ProfileTab({
    profileData, setProfileData, handleProfileSubmit,
    setShowPasswordModal, showPIN, setShowPIN, isProfileDirty,
    handleAvatarUpload, handleAvatarRemove, avatarUploading, avatarProgress = 0, avatarRemoving,
    confirmingRemove, handleAvatarRemoveConfirmed, handleAvatarRemoveCancel,
    isEditing, onStartEdit, onCancelEdit
}) {
    const fileInputRef = useRef(null);
    const [imgError, setImgError] = React.useState(false);

    React.useEffect(() => {
        setImgError(false);
    }, [profileData?.profile_photo]);

    // Compute display avatar — server URL or initials fallback
    const photoUrl = fixImageUrl(profileData.profile_photo);
    const hasPhoto = !!photoUrl && !imgError;
    const displayName = profileData.full_name || profileData.name || '';
    const initials = displayName
        ? displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        : (profileData.username ? profileData.username.slice(0, 2).toUpperCase() : (profileData.role === 'Cashier' ? 'CA' : 'AD'));

    // Determine which required fields are missing
    const missing = [];
    if (!displayName.trim()) missing.push('Full Name');
    if (!profileData.email?.trim()) missing.push('Email Address');
    if (!profileData.username?.trim()) missing.push('Login Username');
    const hasIncomplete = missing.length > 0;

    return (
        <div className="profile-page-body">
            <div className="profile-page-grid">

                {/* Incomplete profile warning */}
                {hasIncomplete && (
                    <div style={{
                        gridColumn: '1 / -1',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        background: '#FEF2F2',
                        border: '1px solid #FECACA',
                        borderRadius: '10px',
                        padding: '14px 18px',
                        marginBottom: '8px',
                    }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" style={{ width: '18px', height: '18px', flexShrink: 0, marginTop: '1px' }}>
                            <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                        </svg>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#DC2626', marginBottom: '4px' }}>
                                Profile Incomplete
                            </div>
                            <div style={{ fontSize: '12px', color: '#B91C1C', lineHeight: 1.5 }}>
                                Please fill in the following required fields: <strong>{missing.join(', ')}</strong>
                            </div>
                        </div>
                    </div>
                )}

                {/* Photo & Profile Section */}
                <section className="profile-photo-section">
                    <div className="profile-section-card profile-photo-center">
                        {/* Avatar preview */}
                        <div className="profile-photo-preview-lg" style={{ position: 'relative', width: '96px', height: '96px', margin: '0 auto', borderRadius: '50%' }}>
                            {hasPhoto ? (
                                <img
                                    src={photoUrl}
                                    alt="Profile"
                                    style={{ width: '96px', height: '96px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--border)', display: 'block', margin: '0 auto' }}
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                <div className="profile-photo-avatar-lg user-avatar-img" style={{ width: '96px', height: '96px', borderRadius: '50%' }}>
                                    {initials}
                                </div>
                            )}
                            <ImageUploadOverlay isUploading={avatarUploading} progress={avatarProgress} borderRadius="50%" spinnerSize={24} />
                        </div>

                        <h2 className="profile-section-title" style={{ marginTop: '16px' }}>Profile Photo</h2>
                        <p className="profile-section-desc" style={{ marginBottom: '20px' }}>
                            This photo will appear in the sidebar and across the system.
                        </p>
                        {isEditing && (
                            <div className="profile-photo-actions" style={{ flexDirection: 'column' }}>
                                {/* Hidden real file input */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                                    style={{ display: 'none' }}
                                    onChange={handleAvatarUpload}
                                />
                                <button
                                    type="button"
                                    className="btn btn-secondary profile-upload-btn"
                                    style={{ width: '100%' }}
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={avatarUploading || avatarRemoving || hasPhoto}
                                >
                                    {avatarUploading ? 'Uploading...' : 'Upload New Photo'}
                                </button>
                                {hasPhoto && !avatarUploading && !avatarRemoving && (
                                    <span style={{ fontSize: '11px', color: '#64748B', marginTop: '6px', marginBottom: '4px', textAlign: 'center' }}>
                                        Please remove your current photo first.
                                    </span>
                                )}
                                {hasPhoto && !confirmingRemove && (
                                    <button
                                        type="button"
                                        className="btn btn-danger profile-remove-btn"
                                        style={{ width: '100%', background: 'transparent', border: 'none', color: '#DC2626' }}
                                        onClick={handleAvatarRemove}
                                        disabled={avatarUploading || avatarRemoving}
                                    >
                                        {avatarRemoving ? 'Removing...' : 'Remove Photo'}
                                    </button>
                                )}
                                {confirmingRemove && (
                                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                                        <span style={{ fontSize: '12px', color: '#64748B', textAlign: 'center' }}>Remove your profile photo?</span>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                type="button"
                                                onClick={handleAvatarRemoveConfirmed}
                                                disabled={avatarRemoving}
                                                style={{ flex: 1, padding: '6px 0', background: '#DC2626', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '13px', cursor: avatarRemoving ? 'not-allowed' : 'pointer', opacity: avatarRemoving ? 0.7 : 1 }}
                                            >
                                                {avatarRemoving ? 'Removing...' : 'Yes, Remove'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleAvatarRemoveCancel}
                                                disabled={avatarRemoving}
                                                style={{ flex: 1, padding: '6px 0', background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </section>

                {/* Personal Details Panel */}
                <section className="profile-fields-block">
                    <div className="profile-section-card profile-personal-section" style={{ marginBottom: '24px' }}>
                        <div className="profile-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: '12px' }}>
                            <div>
                                <h2 className="profile-section-title" style={{ marginBottom: '4px' }}>Personal Information</h2>
                                <p className="profile-section-desc" style={{ margin: 0 }}>Your name is shown on the dashboard greeting and transaction receipts.</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span className="profile-account-badge">{profileData.role || 'Cashier'}</span>
                                {!isEditing ? (
                                    <button type="button" className="btn btn-primary btn-sm" style={{ padding: '6px 14px' }} onClick={onStartEdit}>
                                        Edit Profile
                                    </button>
                                ) : (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button type="button" className="btn btn-secondary btn-sm" style={{ padding: '6px 14px' }} onClick={onCancelEdit}>
                                            Cancel
                                        </button>
                                        <button type="button" className="btn btn-primary btn-sm" style={{ padding: '6px 14px' }} onClick={handleProfileSubmit} disabled={!isProfileDirty || hasIncomplete}>
                                            Save Changes
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <form onSubmit={handleProfileSubmit}>
                            <div className="profile-form-grid">
                                <div className="form-group">
                                    <label className="form-label" htmlFor="profileName">
                                        Full Name <span style={{ color: '#DC2626' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="profileName"
                                        className="form-control profile-input"
                                        required
                                        value={profileData.full_name || profileData.name || ''}
                                        onChange={(e) => setProfileData({...profileData, full_name: e.target.value, name: e.target.value})}
                                        disabled={!isEditing}
                                        style={{ borderColor: !displayName?.trim() ? '#FCA5A5' : '' }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="profilePhone">
                                        Phone / Contact Number
                                    </label>
                                    <input
                                        type="text"
                                        id="profilePhone"
                                        className="form-control profile-input"
                                        placeholder="0912 345 6789"
                                        value={profileData.phone_number || ''}
                                        onChange={(e) => setProfileData({...profileData, phone_number: e.target.value})}
                                        disabled={!isEditing}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="profileEmail">
                                        Email Address <span style={{ color: '#DC2626' }}>*</span>
                                    </label>
                                    <input
                                        type="email"
                                        id="profileEmail"
                                        className="form-control profile-input"
                                        required
                                        value={profileData.email || ''}
                                        onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                                        disabled={!isEditing}
                                        style={{ borderColor: !profileData.email?.trim() ? '#FCA5A5' : '' }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="profileUsername">
                                        Login Username <span style={{ color: '#DC2626' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="profileUsername"
                                        className="form-control profile-input"
                                        required
                                        value={profileData.username || ''}
                                        onChange={(e) => setProfileData({...profileData, username: e.target.value})}
                                        disabled={!isEditing}
                                        style={{ borderColor: !profileData.username?.trim() ? '#FCA5A5' : '' }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Account Role</label>
                                    <div className="profile-readonly-field">{profileData.role || 'Cashier'}</div>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Security */}
                    <div className="profile-section-card profile-security-section">
                        <div className="profile-security-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 className="profile-section-title" style={{ marginBottom: '4px' }}>Password & Security</h2>
                                <p className="profile-section-desc" style={{ margin: 0 }}>Update your login password. You must enter your current password to confirm.</p>
                            </div>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowPasswordModal(true)}>Change Password</button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
