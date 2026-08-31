import React, { useEffect } from 'react';

/**
 * Modern ConfirmModal Component
 * Replaces ugly browser native window.confirm() popups with a sleek, themed in-app dialog.
 *
 * Props:
 * - isOpen (boolean)
 * - onClose (function)
 * - onConfirm (function)
 * - title (string)
 * - message (string | ReactNode)
 * - confirmText (string)
 * - cancelText (string)
 * - variant ('danger' | 'warning' | 'primary')
 * - loading (boolean)
 */
export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    loading = false,
}) {
    // Handle Escape key to close
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && !loading) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, loading, onClose]);

    if (!isOpen) return null;

    const getVariantStyles = () => {
        switch (variant) {
            case 'danger':
                return {
                    iconBg: '#FEE2E2',
                    iconColor: '#DC2626',
                    confirmBg: '#DC2626',
                    confirmHover: '#B91C1C',
                    icon: (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                    ),
                };
            case 'warning':
                return {
                    iconBg: '#FEF3C7',
                    iconColor: '#D97706',
                    confirmBg: '#D97706',
                    confirmHover: '#B45309',
                    icon: (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    ),
                };
            case 'primary':
            default:
                return {
                    iconBg: '#EFF6FF',
                    iconColor: '#2563EB',
                    confirmBg: '#2563EB',
                    confirmHover: '#1D4ED8',
                    icon: (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                    ),
                };
        }
    };

    const currentVariant = getVariantStyles();

    return (
        <div
            className="confirm-modal-overlay"
            onClick={!loading ? onClose : undefined}
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(5px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 999999,
                padding: '20px',
                animation: 'fadeInOverlay 0.15s ease-out',
            }}
        >
            <div
                className="confirm-modal-card"
                onClick={(e) => e.stopPropagation()}
                style={{
                    backgroundColor: 'var(--bg-card, #FFFFFF)',
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '440px',
                    padding: '24px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                    border: '1px solid var(--border, #E2E8F0)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    position: 'relative',
                    animation: 'zoomInCard 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
            >
                {/* Icon Bubble */}
                <div
                    style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '50%',
                        backgroundColor: currentVariant.iconBg,
                        color: currentVariant.iconColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '16px',
                        flexShrink: 0,
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                    }}
                >
                    {currentVariant.icon}
                </div>

                {/* Title */}
                <h3
                    style={{
                        margin: '0 0 8px 0',
                        fontSize: '18px',
                        fontWeight: '700',
                        color: 'var(--text-primary, #0F172A)',
                        letterSpacing: '-0.01em',
                    }}
                >
                    {title}
                </h3>

                {/* Message */}
                <div
                    style={{
                        fontSize: '13.5px',
                        color: 'var(--text-secondary, #64748B)',
                        lineHeight: 1.55,
                        marginBottom: '24px',
                        padding: '0 8px',
                    }}
                >
                    {message}
                </div>

                {/* Actions Row */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        width: '100%',
                    }}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        style={{
                            flex: 1,
                            padding: '10px 16px',
                            borderRadius: '10px',
                            border: '1px solid var(--border, #E2E8F0)',
                            backgroundColor: 'var(--bg-secondary, #F8FAFC)',
                            color: 'var(--text-primary, #1E293B)',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.15s ease',
                            opacity: loading ? 0.6 : 1,
                        }}
                        onMouseEnter={(e) => {
                            if (!loading) e.currentTarget.style.backgroundColor = 'var(--border, #E2E8F0)';
                        }}
                        onMouseLeave={(e) => {
                            if (!loading) e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #F8FAFC)';
                        }}
                    >
                        {cancelText}
                    </button>

                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        style={{
                            flex: 1,
                            padding: '10px 16px',
                            borderRadius: '10px',
                            border: 'none',
                            backgroundColor: currentVariant.confirmBg,
                            color: '#FFFFFF',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'background-color 0.15s ease, transform 0.1s ease',
                            opacity: loading ? 0.8 : 1,
                            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
                        }}
                        onMouseEnter={(e) => {
                            if (!loading) e.currentTarget.style.backgroundColor = currentVariant.confirmHover;
                        }}
                        onMouseLeave={(e) => {
                            if (!loading) e.currentTarget.style.backgroundColor = currentVariant.confirmBg;
                        }}
                    >
                        {loading && (
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                style={{ animation: 'spin 0.8s linear infinite' }}
                            >
                                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                            </svg>
                        )}
                        <span>{loading ? 'Processing...' : confirmText}</span>
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeInOverlay {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes zoomInCard {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
