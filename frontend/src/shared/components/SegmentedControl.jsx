import React, { useRef } from 'react';

/**
 * Reusable Enterprise Segmented Control Component
 *
 * @param {Array<{ value: string|number, label: React.ReactNode, icon?: React.ReactNode }>} options - Options list
 * @param {string|number} value - Active option value
 * @param {function(value: string|number): void} onChange - Callback invoked with option value on selection
 * @param {string} [ariaLabel='Segmented control'] - Accessible label for the control group / tablist
 * @param {string} [className=''] - Optional additional CSS class for the track
 * @param {'filter'|'tabs'} [semantics='filter'] - Semantic role mode: 'filter' (group with aria-pressed) or 'tabs' (tablist with role="tab")
 * @param {string} [idPrefix=''] - Optional prefix for generating accessible IDs for tab buttons and panels
 */
export default function SegmentedControl({
    options = [],
    value,
    onChange,
    ariaLabel = 'Segmented control',
    className = '',
    semantics = 'filter',
    idPrefix = ''
}) {
    const buttonRefs = useRef([]);

    const handleKeyDown = (e, index) => {
        if (!options || options.length === 0) return;

        let targetIndex = -1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            targetIndex = (index + 1) % options.length;
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            targetIndex = (index - 1 + options.length) % options.length;
        } else if (e.key === 'Home') {
            e.preventDefault();
            targetIndex = 0;
        } else if (e.key === 'End') {
            e.preventDefault();
            targetIndex = options.length - 1;
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (onChange) {
                onChange(options[index].value);
            }
            return;
        }

        if (targetIndex !== -1 && targetIndex !== index) {
            if (buttonRefs.current[targetIndex]) {
                buttonRefs.current[targetIndex].focus();
            }
        }
    };

    const hasActive = options.some(opt => opt.value === value);
    const isTabs = semantics === 'tabs';

    return (
        <div
            role={isTabs ? 'tablist' : 'group'}
            aria-label={ariaLabel}
            className={`segmented-control-track ${className}`.trim()}
        >
            <style>{`
                .segmented-control-track {
                    --segmented-active-bg: var(--primary);
                    display: inline-flex;
                    align-items: center;
                    background-color: var(--bg-secondary);
                    border: 1px solid var(--border);
                    border-radius: 9999px;
                    padding: 4px;
                    gap: 2px;
                    white-space: nowrap;
                    flex-wrap: nowrap;
                    max-width: 100%;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                    box-sizing: border-box;
                    min-height: 44px;
                }
                .segmented-control-track::-webkit-scrollbar {
                    display: none;
                }
                .segmented-control-item {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    padding: 8px 16px;
                    border-radius: 9999px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    border: none;
                    background: transparent;
                    color: var(--text-secondary);
                    outline: none;
                    white-space: nowrap;
                    flex-shrink: 0;
                    box-sizing: border-box;
                    user-select: none;
                    line-height: 1.25;
                }
                .segmented-control-item:hover:not(.active) {
                    background-color: var(--border);
                    color: var(--text-primary);
                }
                .segmented-control-item.active {
                    background-color: var(--segmented-active-bg);
                    color: #FFFFFF;
                    font-weight: 600;
                    box-shadow: none;
                }
                .segmented-control-item.active:hover {
                    background-color: var(--primary-solid);
                }
                .segmented-control-item:focus-visible {
                    outline: 2px solid var(--segmented-active-bg);
                    outline-offset: 2px;
                    border-radius: inherit;
                }
                .segmented-control-icon {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    width: 16px;
                    height: 16px;
                }
                .segmented-control-icon svg {
                    width: 16px;
                    height: 16px;
                }
            `}</style>
            {options.map((option, index) => {
                const isActive = option.value === value;
                const tabIndex = isActive || (!hasActive && index === 0) ? 0 : -1;

                const itemProps = isTabs
                    ? {
                        role: 'tab',
                        id: idPrefix ? `${idPrefix}-tab-${option.value}` : undefined,
                        'aria-selected': isActive,
                        'aria-controls': (isActive && idPrefix) ? `${idPrefix}-panel-${option.value}` : undefined,
                    }
                    : {
                        'aria-pressed': isActive,
                    };

                return (
                    <button
                        key={String(option.value)}
                        ref={(el) => (buttonRefs.current[index] = el)}
                        type="button"
                        tabIndex={tabIndex}
                        onClick={() => onChange && onChange(option.value)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        className={`segmented-control-item ${isActive ? 'active' : ''}`}
                        {...itemProps}
                    >
                        {option.icon && (
                            <span className="segmented-control-icon">
                                {option.icon}
                            </span>
                        )}
                        <span>{option.label ?? option.value}</span>
                    </button>
                );
            })}
        </div>
    );
}
