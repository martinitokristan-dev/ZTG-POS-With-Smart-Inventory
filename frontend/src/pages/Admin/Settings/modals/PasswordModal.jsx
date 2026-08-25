import React from 'react';
import PasswordRequirementDetector from '../../../../shared/components/PasswordRequirementDetector';

export default function PasswordModal({
    showPasswordModal, setShowPasswordModal,
    passwordData, setPasswordData, handlePasswordSubmit
}) {
    if (!showPasswordModal) return null;
    return (
        <div className="modal-overlay" style={{ zIndex: 999 }}>
            <div className="modal-card" style={{ maxWidth: '450px', width: '95%', background: '#FFFFFF', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.12)', border: '1px solid #E2E8F0' }}>
                <form onSubmit={handlePasswordSubmit}>
                    <div className="modal-header" style={{ background: '#FFFFFF', borderBottom: '1px solid #F1F5F9', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 style={{ color: '#1E293B', fontSize: '18px', fontWeight: '700', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" strokeWidth="2.5" style={{ color: '#3B82F6', flexShrink: 0 }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> 
                                Change Account Password
                            </h3>
                            <p style={{ color: '#64748B', fontSize: '11.5px', margin: 0 }}>Update your login credentials securely</p>
                        </div>
                        <button type="button" onClick={() => setShowPasswordModal(false)} style={{ color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }}>
                            <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'none', stroke: 'currentColor', strokeWidth: '2' }}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                    
                    <div className="modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '75vh', overflowY: 'auto' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Current Password <span style={{ color: '#EF4444' }}>*</span></label>
                            <input 
                                type="password" 
                                required 
                                value={passwordData.current_password}
                                onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                                className="form-control"
                                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>New Password <span style={{ color: '#EF4444' }}>*</span></label>
                            <input 
                                type="password" 
                                required 
                                value={passwordData.password}
                                onChange={(e) => setPasswordData({...passwordData, password: e.target.value})}
                                className="form-control"
                                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                            />
                            <PasswordRequirementDetector password={passwordData.password || ''} showWhenEmpty={true} />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Confirm New Password <span style={{ color: '#EF4444' }}>*</span></label>
                            <input 
                                type="password" 
                                required 
                                value={passwordData.password_confirmation}
                                onChange={(e) => setPasswordData({...passwordData, password_confirmation: e.target.value})}
                                className="form-control"
                                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                            />
                        </div>
                    </div>

                    <div className="modal-footer" style={{ padding: '20px 24px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button type="button" onClick={() => setShowPasswordModal(false)} className="btn" style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#475569', fontWeight: '600', padding: '10px 20px', borderRadius: '8px' }}>
                            Cancel
                        </button>
                        <button type="submit" className="btn" style={{ background: '#3B82F6', color: '#FFFFFF', border: 'none', fontWeight: '600', padding: '10px 24px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.2)' }}>
                            Change Password
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
