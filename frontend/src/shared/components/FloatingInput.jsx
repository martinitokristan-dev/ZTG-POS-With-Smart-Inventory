import React, { forwardRef } from 'react';

/**
 * Reusable Outlined Floating Label Input Component (Notched Outline)
 * Matches the modern SaaS UI design pattern across ZTG system.
 */
const FloatingInput = forwardRef(({
    label,
    required = false,
    type = 'text',
    value,
    onChange,
    onBlur,
    onFocus,
    placeholder = '',
    helperText,
    actionButton,
    prefixIcon,
    suffixIcon,
    disabled = false,
    readOnly = false,
    options = [],
    rows = 3,
    min,
    max,
    step,
    autoFocus = false,
    className = '',
    style = {},
    inputStyle = {},
    error,
    id,
    name,
    ...rest
}, ref) => {
    const inputId = id || (label ? `float-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : undefined);

    const renderInput = () => {
        if (type === 'textarea') {
            return (
                <textarea
                    ref={ref}
                    id={inputId}
                    name={name}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    onFocus={onFocus}
                    placeholder={placeholder}
                    disabled={disabled}
                    readOnly={readOnly}
                    rows={rows}
                    className={`floating-input form-control ${error ? 'is-invalid' : ''}`}
                    style={{ ...inputStyle, resize: 'vertical' }}
                    {...rest}
                />
            );
        }

        if (type === 'select') {
            return (
                <select
                    ref={ref}
                    id={inputId}
                    name={name}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    onFocus={onFocus}
                    disabled={disabled}
                    className={`floating-input form-control ${error ? 'is-invalid' : ''}`}
                    style={inputStyle}
                    {...rest}
                >
                    {options.map((opt, idx) => (
                        <option key={opt.value ?? idx} value={opt.value}>
                            {opt.label ?? opt.value}
                        </option>
                    ))}
                </select>
            );
        }

        return (
            <input
                ref={ref}
                type={type}
                id={inputId}
                name={name}
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                onFocus={onFocus}
                placeholder={placeholder}
                disabled={disabled}
                readOnly={readOnly}
                min={min}
                max={max}
                step={step}
                autoFocus={autoFocus}
                className={`floating-input form-control ${error ? 'is-invalid' : ''}`}
                style={{
                    ...inputStyle,
                    paddingLeft: prefixIcon ? '38px' : undefined,
                    paddingRight: suffixIcon ? '38px' : undefined,
                }}
                {...rest}
            />
        );
    };

    return (
        <div className={`form-group floating-form-group ${className}`} style={{ ...style }}>
            <div className={actionButton ? 'input-with-actions' : undefined}>
                <div className="floating-input-inner" style={{ position: 'relative', width: '100%' }}>
                    {label && (
                        <label htmlFor={inputId} className="floating-label form-label">
                            {label}
                            {required && <span style={{ color: 'var(--danger, #EF4444)', marginLeft: '2px' }}>*</span>}
                        </label>
                    )}

                    {prefixIcon && (
                        <div style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            pointerEvents: 'none',
                            color: 'var(--text-secondary, #64748B)',
                            display: 'flex',
                            alignItems: 'center',
                            zIndex: 2
                        }}>
                            {prefixIcon}
                        </div>
                    )}

                    {renderInput()}

                    {suffixIcon && (
                        <div style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-secondary, #64748B)',
                            display: 'flex',
                            alignItems: 'center',
                            zIndex: 2
                        }}>
                            {suffixIcon}
                        </div>
                    )}
                </div>

                {actionButton && (
                    <div className="input-action-wrapper" style={{ flexShrink: 0 }}>
                        {actionButton}
                    </div>
                )}
            </div>

            {helperText && <div className="floating-helper-text form-helper-text">{helperText}</div>}
            {error && <div className="floating-helper-text" style={{ color: 'var(--danger, #EF4444)' }}>{error}</div>}
        </div>
    );
});

FloatingInput.displayName = 'FloatingInput';

export default FloatingInput;
