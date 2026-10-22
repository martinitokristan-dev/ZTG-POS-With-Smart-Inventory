import React from 'react';
import { useNavigate } from 'react-router-dom';
import { resolveNotificationTarget } from './utils/notificationTarget';

/**
 * NotificationDetailModal - Clean, compact notification detail card
 * Shows when user taps any notification in the inbox
 * Matches the UI design: Icon + Title + Badge → Key details → Action buttons
 */
export default function NotificationDetailModal({ notification, onClose }) {
    const navigate = useNavigate();
    
    if (!notification) return null;

    // Helper: resolve icon properties (square icons with rounded corners)
    const getIcon = (n) => {
        const subType = n.sub_type || '';
        const title = n.title || '';

        // Return icon (simple rectangle/square for refund)
        if (subType === 'Refund' || subType === 'Return' || title.includes('Refund') || title.includes('Return')) {
            return { bg: '#FEF3C7', color: '#F59E0B', svg: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><rect x="4" y="6" width="16" height="12" rx="1"></rect></svg>' };
        }
        // X icon for void/damaged
        if (subType === 'Void' || subType === 'Damaged' || title.includes('Void') || title.includes('Damaged')) {
            return { bg: '#FEE2E2', color: '#EF4444', svg: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><line x1="6" y1="6" x2="18" y2="18"></line><line x1="6" y1="18" x2="18" y2="6"></line></svg>' };
        }
        // Box icon for restocked
        if (subType === 'Restocked' || title.includes('Restocked')) {
            return { bg: '#DBEAFE', color: '#3B82F6', svg: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><rect x="3" y="8" width="18" height="12" rx="2"></rect><path d="M3 13h18"></path></svg>' };
        }
        // Warning triangle for low stock
        if (n.type === 'inventory' || n.type === 'low_stock' || subType === 'Low Stock' || subType === 'Out of Stock' || title.includes('Stock')) {
            return { bg: '#FEF3C7', color: '#F59E0B', svg: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><path d="M12 9v4m0 4h.01M4.93 19h14.14a1 1 0 00.86-1.5l-7.07-12a1 1 0 00-1.72 0l-7.07 12a1 1 0 00.86 1.5z"></path></svg>' };
        }
        // Calendar for reservations
        if (subType === 'Paid' || subType === 'Deposit' || title.includes('Reservation') || title.includes('Deposit')) {
            return { bg: '#E0E7FF', color: '#6366F1', svg: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><rect x="3" y="6" width="18" height="15" rx="2"></rect><line x1="3" y1="11" x2="21" y2="11"></line></svg>' };
        }
        // Checkmark for completed
        if (n.type === 'transaction' || subType === 'Completed' || title.includes('Completed')) {
            return { bg: '#D1FAE5', color: '#10B981', svg: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>' };
        }
        // Document for imports
        if (subType === 'Imported' || subType === 'Import Undone' || title.includes('Import')) {
            return { bg: '#EDE9FE', color: '#8B5CF6', svg: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>' };
        }
        // Alert for system/security
        if (n.type === 'system' || subType === 'Security Alert') {
            return { bg: '#FEE2E2', color: '#EF4444', svg: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><path d="M12 9v4m0 4h.01M12 3l9 4v6c0 5-4 7-9 9-5-2-9-4-9-9V7l9-4z"></path></svg>' };
        }
        return { bg: '#F1F5F9', color: '#64748B', svg: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>' };
    };

    // Format timestamp - compact like "Refund · Aug 26, 2026, 10:21 PM"
    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    // Stock alerts are saved with type "low_stock" and no sub_type; the title says which kind.
    const stockAlertKind = (n) => {
        if (n.sub_type === 'Low Stock' || n.sub_type === 'Out of Stock') return n.sub_type;
        if (n.type !== 'low_stock') return null;
        return (n.title || '').includes('Out of Stock') ? 'Out of Stock' : 'Low Stock';
    };

    // Badge text: readable words, never a raw key like "low_stock"
    const getBadge = (n) => {
        const stockKind = stockAlertKind(n);
        if (stockKind) return stockKind;
        const raw = n.sub_type || n.type || '';
        return raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    };

    // Extract key information for two-column display
    const getDisplayInfo = (n) => {
        const subType = stockAlertKind(n) || n.sub_type || '';
        const message = n.message || '';
        
        // Extract invoice/order number from message
        const invoiceMatch = message.match(/(?:Invoice|SI No:|Order|Ref:)\s*([A-Z0-9-]+)/i);
        const invoice = invoiceMatch ? invoiceMatch[1] : null;
        
        // Extract amount from message
        const amountMatch = message.match(/₱\s*([\d,]+(?:\.\d{2})?)/);
        const amount = amountMatch ? amountMatch[1] : null;
        
        // Determine labels and values based on notification type
        if (subType === 'Refund' || subType === 'Return') {
            return {
                leftLabel: 'Invoice',
                leftValue: invoice || 'N/A',
                rightLabel: 'Refunded',
                rightValue: amount ? `₱${amount}` : 'N/A',
                actionLabel: 'View invoice'
            };
        }
        
        // "Reservation Expired" is saved as a Void but opens the reservation, not an invoice.
        if (subType === 'Void' && (n.title || '').includes('Reservation Expired')) {
            const orderMatch = message.match(/Reservation\s+(\S+)\s+for/i);
            return {
                leftLabel: 'Order',
                leftValue: orderMatch ? orderMatch[1] : 'N/A',
                rightLabel: 'Status',
                rightValue: 'Expired',
                actionLabel: 'View reservation'
            };
        }

        if (subType === 'Void') {
            return {
                leftLabel: 'Invoice',
                leftValue: invoice || 'N/A',
                rightLabel: 'Status',
                rightValue: 'Voided',
                actionLabel: 'View invoice'
            };
        }
        
        if (subType === 'Damaged') {
            return {
                leftLabel: 'Batch',
                leftValue: invoice || 'N/A',
                rightLabel: 'Status',
                rightValue: 'Logged',
                actionLabel: 'View details'
            };
        }
        
        if (subType === 'Restocked') {
            return {
                leftLabel: 'Batch',
                leftValue: invoice || 'N/A',
                rightLabel: 'Status',
                rightValue: 'Restocked',
                actionLabel: 'View details'
            };
        }
        
        if (subType === 'Paid' || subType === 'Deposit') {
            return {
                leftLabel: 'Order',
                leftValue: invoice || 'N/A',
                rightLabel: subType === 'Paid' ? 'Paid' : 'Deposit',
                rightValue: amount ? `₱${amount}` : 'N/A',
                actionLabel: 'View order'
            };
        }
        
        if (subType === 'Completed') {
            return {
                leftLabel: 'Invoice',
                leftValue: invoice || 'N/A',
                rightLabel: 'Amount',
                rightValue: amount ? `₱${amount}` : 'N/A',
                actionLabel: 'View invoice'
            };
        }
        
        if (subType === 'Imported' || subType === 'Import Undone') {
            // Extract count from message like "123 products imported"
            const countMatch = message.match(/(\d+)\s+product/i);
            const count = countMatch ? countMatch[1] : null;
            
            return {
                leftLabel: 'Batch',
                leftValue: invoice || 'N/A',
                rightLabel: subType === 'Imported' ? 'Imported' : 'Undone',
                rightValue: count ? `${count} products` : 'N/A',
                actionLabel: 'View details'
            };
        }
        
        if (subType === 'Low Stock' || subType === 'Out of Stock') {
            // Extract product name and quantity
            const productMatch = message.match(/Product '([^']+)'/);
            const qtyMatch = message.match(/quantity\s+(\d+)/i);
            const product = productMatch ? productMatch[1] : 'N/A';
            const qty = qtyMatch ? qtyMatch[1] : '0';
            
            return {
                leftLabel: 'Product',
                leftValue: product.length > 20 ? product.substring(0, 20) + '...' : product,
                rightLabel: 'Quantity',
                rightValue: qty,
                actionLabel: 'View product'
            };
        }
        
        // Default fallback
        return {
            leftLabel: 'Reference',
            leftValue: invoice || n.id || 'N/A',
            rightLabel: 'Status',
            rightValue: subType || 'Updated',
            actionLabel: 'View details'
        };
    };

    const icon = getIcon(notification);
    const badge = getBadge(notification);
    const dateStr = formatDate(notification.timestamp);
    const displayInfo = getDisplayInfo(notification);

    // Handle backdrop click (close on click outside)
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // Open the record the notification is about (see resolveNotificationTarget for the routing table).
    const viewTarget = resolveNotificationTarget(notification);
    const handleViewDetails = () => {
        onClose(); // Close modal first for smooth transition
        if (viewTarget) navigate(viewTarget);
    };

    return (
        <div 
            className="notification-detail-backdrop"
            onClick={handleBackdropClick}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.55)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                padding: '20px',
                animation: 'fadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
        >
            <div 
                className="notification-detail-card"
                style={{
                    background: '#FFFFFF',
                    borderRadius: '24px',
                    boxShadow: '0 25px 70px rgba(0, 0, 0, 0.25), 0 10px 25px rgba(0, 0, 0, 0.15)',
                    width: '100%',
                    maxWidth: '540px',
                    overflow: 'hidden',
                    animation: 'morphIn 0.4s cubic-bezier(0.34, 1.25, 0.64, 1)',
                    transformOrigin: 'center center'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header - Icon + Title + Badge + Timestamp + Close */}
                <div style={{
                    padding: '28px 28px 24px 28px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px'
                }}>
                    {/* Icon */}
                    <div
                        style={{
                            width: '56px',
                            height: '56px',
                            background: icon.bg,
                            color: icon.color,
                            borderRadius: '14px',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        dangerouslySetInnerHTML={{ __html: icon.svg }}
                    />
                    
                    {/* Title + Badge + Timestamp */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h2 style={{
                            margin: 0,
                            fontSize: '19px',
                            fontWeight: 600,
                            color: '#1F2937',
                            lineHeight: 1.4,
                            marginBottom: '6px'
                        }}>
                            {notification.title}
                        </h2>
                        <div style={{
                            fontSize: '14px',
                            color: '#6B7280',
                            lineHeight: 1.5
                        }}>
                            {badge && <span style={{ color: '#9CA3AF' }}>{badge} · </span>}
                            {dateStr}
                        </div>
                    </div>

                    {/* Close button - small square */}
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            padding: '6px',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            color: '#9CA3AF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            width: '32px',
                            height: '32px',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#F3F4F6'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        aria-label="Close"
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content - Two-column key details */}
                <div style={{
                    padding: '0 28px 28px 28px'
                }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '24px',
                        marginBottom: '24px'
                    }}>
                        {/* Left column */}
                        <div>
                            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
                                {displayInfo.leftLabel}
                            </div>
                            <div style={{ fontSize: '17px', fontWeight: 600, color: '#1F2937', lineHeight: 1.3 }}>
                                {displayInfo.leftValue}
                            </div>
                        </div>
                        {/* Right column */}
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
                                {displayInfo.rightLabel}
                            </div>
                            <div style={{ fontSize: '17px', fontWeight: 600, color: '#1F2937', lineHeight: 1.3 }}>
                                {displayInfo.rightValue}
                            </div>
                        </div>
                    </div>

                    {/* Action buttons: the "View" button only shows when there is a page to open */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: viewTarget ? '1fr 1fr' : '1fr',
                        gap: '12px'
                    }}>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '14px',
                                background: '#FFFFFF',
                                color: '#374151',
                                border: '1.5px solid #E5E7EB',
                                borderRadius: '10px',
                                fontSize: '15px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#F9FAFB';
                                e.currentTarget.style.borderColor = '#D1D5DB';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#FFFFFF';
                                e.currentTarget.style.borderColor = '#E5E7EB';
                            }}
                        >
                            Dismiss
                        </button>
                        {viewTarget && <button
                            onClick={handleViewDetails}
                            style={{
                                padding: '14px',
                                background: '#000000',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '10px',
                                fontSize: '15px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#1F2937'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#000000'}
                        >
                            {displayInfo.actionLabel}
                        </button>}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { 
                        opacity: 0; 
                    }
                    to { 
                        opacity: 1; 
                    }
                }
                
                @keyframes morphIn {
                    0% {
                        opacity: 0;
                        transform: scale(0.85) translateY(30px);
                        filter: blur(10px);
                    }
                    60% {
                        opacity: 1;
                        filter: blur(0px);
                    }
                    100% {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                        filter: blur(0px);
                    }
                }

                /* Mobile responsive */
                @media (max-width: 600px) {
                    .notification-detail-backdrop {
                        padding: 16px;
                    }
                    
                    .notification-detail-card {
                        max-width: 100%;
                    }
                }
            `}</style>
        </div>
    );
}
