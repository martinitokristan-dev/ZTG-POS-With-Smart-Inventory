import React, { useState, useRef, useEffect } from 'react';

/**
 * Themed dropdown.
 *
 * Optional inline creation: pass `onCreateOption(text)` returning a Promise that
 * resolves to the new option's value (or { value }). An "Add new" row then appears
 * at the bottom of the menu, and the created option is selected automatically.
 * If the promise rejects, its message is shown under the input.
 */
export default function IOSSelect({ value, onChange, options = [], placeholder = 'Select option', className = '', style = {}, disabled = false, onCreateOption = null, createLabel = 'Add new option' }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newOptionText, setNewOptionText] = useState('');
    const [createError, setCreateError] = useState('');
    const [savingOption, setSavingOption] = useState(false);
    const containerRef = useRef(null);

    const resetCreate = () => {
        setIsCreating(false);
        setNewOptionText('');
        setCreateError('');
    };

    const submitNewOption = async () => {
        if (!onCreateOption || savingOption) return;
        const text = newOptionText.trim();
        if (!text) {
            setCreateError('Please enter a value.');
            return;
        }
        setSavingOption(true);
        setCreateError('');
        try {
            const created = await onCreateOption(text);
            const createdValue = created && typeof created === 'object' ? created.value ?? created.id : created;
            resetCreate();
            setIsOpen(false);
            if (createdValue !== undefined && createdValue !== null) {
                onChange({ target: { value: String(createdValue) } });
            }
        } catch (err) {
            setCreateError(err?.message || 'Could not add option.');
        } finally {
            setSavingOption(false);
        }
    };

    // Enter saves the new option; Escape cancels. Propagation is stopped so a
    // surrounding form or modal-level Enter shortcut does not submit.
    const handleCreateKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            submitNewOption();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            resetCreate();
        }
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
                setIsCreating(false);
                setNewOptionText('');
                setCreateError('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Format options as array of objects { value, label }
    const normalizedOptions = options.map(opt => {
        if (typeof opt === 'object' && opt !== null) {
            return { value: String(opt.value), label: String(opt.label || opt.value) };
        }
        return { value: String(opt), label: String(opt) };
    });

    const selectedOption = normalizedOptions.find(opt => opt.value === String(value)) || null;

    const handleSelect = (optValue) => {
        if (disabled) return;
        onChange({ target: { value: optValue } });
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', display: 'inline-block', width: '100%', minWidth: 0, ...style }}>
            {/* Trigger Button matching Theme System */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`ios-select-trigger ${className}`}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '9px 14px',
                    border: isOpen ? '1px solid var(--primary)' : '1px solid var(--border)',
                    borderRadius: '12px',
                    backgroundColor: disabled ? 'var(--bg-secondary)' : 'var(--bg-card)',
                    color: selectedOption ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontSize: '13px',
                    fontWeight: 600,
                    fontFamily: 'var(--font-ui)',
                    boxShadow: isOpen ? '0 0 0 3px rgba(59, 130, 246, 0.15)' : 'var(--shadow-sm)',
                    cursor: disabled ? 'default' : 'pointer',
                    transition: 'all 0.2s ease',
                    minHeight: '38px',
                    boxSizing: 'border-box',
                    textAlign: 'left',
                }}
            >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, paddingRight: 8 }}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--text-secondary)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                        flexShrink: 0,
                    }}
                >
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </button>

            {/* Floating Popover Menu matching Theme System */}
            {isOpen && (
                <div
                    className="ios-select-menu"
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        left: 0,
                        right: 0,
                        zIndex: 9999,
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '14px',
                        border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow-lg)',
                        padding: '6px',
                        maxHeight: '260px',
                        overflowY: 'auto',
                        fontFamily: 'var(--font-ui)',
                        boxSizing: 'border-box',
                    }}
                >
                    {normalizedOptions.length === 0 ? (
                        <div style={{ padding: '10px 14px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
                            No options available
                        </div>
                    ) : (
                        normalizedOptions.map((opt) => {
                            const isSelected = opt.value === String(value);
                            return (
                                <div
                                    key={opt.value}
                                    onClick={() => handleSelect(opt.value)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '10px 12px',
                                        borderRadius: '10px',
                                        backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent',
                                        color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
                                        fontSize: '13px',
                                        fontWeight: isSelected ? 700 : 500,
                                        cursor: 'pointer',
                                        transition: 'background-color 0.15s ease',
                                        marginBottom: '2px',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
                                        {opt.label}
                                    </span>
                                    {isSelected && (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    )}
                                </div>
                            );
                        })
                    )}

                    {onCreateOption && (
                        <div style={{ borderTop: '1px solid var(--border)', marginTop: '4px', paddingTop: '6px' }}>
                            {isCreating ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '4px' }}>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <input
                                            type="text"
                                            className="form-control"
                                            autoFocus
                                            aria-label={createLabel}
                                            placeholder="Type new value..."
                                            value={newOptionText}
                                            disabled={savingOption}
                                            onChange={(e) => { setNewOptionText(e.target.value); setCreateError(''); }}
                                            onKeyDown={handleCreateKeyDown}
                                            style={{ flex: 1, minWidth: 0, fontSize: '13px', padding: '6px 10px' }}
                                        />
                                        <button type="button" className="btn btn-primary btn-sm" onClick={submitNewOption} disabled={savingOption} style={{ padding: '5px 10px', fontSize: '12px' }}>
                                            {savingOption ? 'Adding...' : 'Add'}
                                        </button>
                                        <button type="button" className="btn btn-secondary btn-sm" onClick={resetCreate} disabled={savingOption} style={{ padding: '5px 10px', fontSize: '12px' }}>
                                            Cancel
                                        </button>
                                    </div>
                                    {createError && (
                                        <div role="alert" style={{ fontSize: '11.5px', color: 'var(--danger, #DC2626)', fontWeight: 600 }}>{createError}</div>
                                    )}
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(true)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', padding: '9px 12px', borderRadius: '10px', border: 'none', background: 'transparent', color: 'var(--primary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M12 5v14M5 12h14" />
                                    </svg>
                                    {createLabel}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
