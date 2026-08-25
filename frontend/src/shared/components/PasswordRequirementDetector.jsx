import React from 'react';

export default function PasswordRequirementDetector({ password = '', showWhenEmpty = true }) {
    if (!showWhenEmpty && !password) return null;

    const hasMinLength = (password || '').length >= 6;
    const hasUppercase = /[A-Z]/.test(password || '');
    const hasSpecial = /[\W_]/.test(password || '');

    const rules = [
        { label: 'At least 6 characters', valid: hasMinLength },
        { label: 'At least 1 uppercase letter', valid: hasUppercase },
        { label: 'At least 1 special character', valid: hasSpecial },
    ];

    return (
        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary, #334155)', marginBottom: '2px' }}>
                Must contain:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {rules.map((rule, idx) => (
                    <div 
                        key={idx}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '7px',
                            fontSize: '12px',
                            fontWeight: rule.valid ? '500' : '400',
                            color: rule.valid ? '#16A34A' : '#64748B',
                            transition: 'color 0.15s ease',
                            userSelect: 'none'
                        }}
                    >
                        {rule.valid ? (
                            <svg viewBox="0 0 24 24" width="13" height="13" stroke="#16A34A" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" width="13" height="13" stroke="#94A3B8" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        )}
                        <span>{rule.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
