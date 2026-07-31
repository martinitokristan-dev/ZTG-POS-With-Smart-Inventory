import React from 'react';

const STATUS_CONFIG = {
    completed:    { bg: '#F0FDF4', color: '#10B981', text: 'Completed' },
    'fully paid': { bg: '#F0FDF4', color: '#10B981', text: 'Fully Paid' },
    fully_paid:   { bg: '#F0FDF4', color: '#10B981', text: 'Fully Paid' },
    pending:      { bg: '#FFFBEB', color: '#D97706', text: 'Pending Order' },
    deposit:      { bg: '#EFF6FF', color: '#2563EB', text: 'Deposit' },
    refund:       { bg: '#FEF2F2', color: '#DC2626', text: 'Refund' },
    return:       { bg: '#FFF7ED', color: '#EA580C', text: 'Returned' },
    void:         { bg: '#F1F5F9', color: '#475569', text: 'Voided' },
    cancelled:    { bg: '#F1F5F9', color: '#475569', text: 'Cancelled' },
};

export default function StatusBadge({ status, style = {} }) {
    const raw = status || 'Unknown';
    const config = STATUS_CONFIG[raw.toLowerCase()] ?? { bg: '#F3F4F6', color: '#4B5563', text: raw };

    return (
        <span style={{ 
            backgroundColor: config.bg, 
            color: config.color, 
            padding: '2px 8px', 
            borderRadius: '4px', 
            fontWeight: '700',
            fontSize: '11px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            letterSpacing: '0.3px',
            textTransform: 'uppercase',
            ...style
        }}>
            {config.text}
        </span>
    );
}
