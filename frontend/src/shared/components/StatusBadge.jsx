import React from 'react';

const STATUS_CONFIG = {
    completed:          { className: 'status-completed', text: 'Completed' },
    'fully paid':       { className: 'status-completed', text: 'Fully Paid' },
    fully_paid:         { className: 'status-completed', text: 'Fully Paid' },
    active:             { className: 'status-completed', text: 'Active' },
    pending:            { className: 'status-pending', text: 'Pending Order' },
    deposit:            { className: 'status-deposit', text: 'Deposit' },
    refund:             { className: 'status-refund', text: 'Refund' },
    'full refund':      { className: 'status-refund', text: 'Refund' },
    full_refund:        { className: 'status-refund', text: 'Refund' },
    'partial refund':   { className: 'status-pending', text: 'Partial Refund' },
    partial_refund:     { className: 'status-pending', text: 'Partial Refund' },
    return:             { className: 'status-return', text: 'Returned' },
    'partial return':   { className: 'status-pending', text: 'Partial Return' },
    partial_return:     { className: 'status-pending', text: 'Partial Return' },
    void:               { className: 'status-void', text: 'Voided' },
    cancelled:          { className: 'status-void', text: 'Cancelled' },
};

export default function StatusBadge({ status, style = {} }) {
    const raw = (status || 'Unknown').toLowerCase();
    const config = STATUS_CONFIG[raw] ?? { className: 'status-default', text: status };

    return (
        <span className={`status-badge ${config.className}`} style={style}>
            {config.text}
        </span>
    );
}

