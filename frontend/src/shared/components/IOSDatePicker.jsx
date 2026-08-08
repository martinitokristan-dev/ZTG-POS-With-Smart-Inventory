import React, { useState, useRef, useEffect } from 'react';

// Helper function to safely parse any date format without returning NaN
function parseSafeDate(val) {
    if (!val) return null;
    if (val instanceof Date && !isNaN(val.getTime())) return val;

    let str = String(val).trim();
    
    // Check YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const [y, m, d] = str.split('-').map(Number);
        const parsed = new Date(y, m - 1, d);
        if (!isNaN(parsed.getTime())) return parsed;
    }

    // Check DD/MM/YYYY or MM/DD/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
        const parts = str.split('/').map(Number);
        // Try DD/MM/YYYY
        if (parts[0] > 12) {
            const parsed = new Date(parts[2], parts[1] - 1, parts[0]);
            if (!isNaN(parsed.getTime())) return parsed;
        } else {
            // Try MM/DD/YYYY
            const parsed = new Date(parts[2], parts[0] - 1, parts[1]);
            if (!isNaN(parsed.getTime())) return parsed;
        }
    }

    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
}

export default function IOSDatePicker({ 
    value, 
    onChange, 
    placeholder = 'Select date', 
    required = false, 
    className = '', 
    style = {}, 
    alignRight = false,
    openUpward = false
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [dropUp, setDropUp] = useState(openUpward);
    const containerRef = useRef(null);

    // Selected date object
    const selectedDate = parseSafeDate(value);

    // View month & year state
    const [viewDate, setViewDate] = useState(() => selectedDate || new Date());

    useEffect(() => {
        const parsed = parseSafeDate(value);
        if (parsed) {
            setViewDate(parsed);
        }
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Check bounds on open to decide whether to open upward or downward
    const handleToggleOpen = () => {
        if (!isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            if (spaceBelow < 320 || openUpward) {
                setDropUp(true);
            } else {
                setDropUp(false);
            }
        }
        setIsOpen(!isOpen);
    };

    const validViewDate = (viewDate && !isNaN(viewDate.getTime())) ? viewDate : new Date();
    const viewYear = validViewDate.getFullYear();
    const viewMonth = validViewDate.getMonth();

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June', 
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

    // Generate days for calendar grid
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const prevMonthDays = Array.from({ length: firstDayOfMonth }, (_, i) => daysInPrevMonth - firstDayOfMonth + i + 1);
    const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const totalGridSlots = prevMonthDays.length + currentMonthDays.length;
    const nextMonthDays = Array.from({ length: (42 - totalGridSlots) % 7 }, (_, i) => i + 1);

    const prevMonth = () => setViewDate(new Date(viewYear, viewMonth - 1, 1));
    const nextMonth = () => setViewDate(new Date(viewYear, viewMonth + 1, 1));

    const handleSelectDay = (day) => {
        const m = String(viewMonth + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        const formatted = `${viewYear}-${m}-${d}`;
        onChange({ target: { value: formatted } });
        setIsOpen(false);
    };

    const handleToday = () => {
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate()).padStart(2, '0');
        const formatted = `${y}-${m}-${d}`;
        setViewDate(today);
        onChange({ target: { value: formatted } });
        setIsOpen(false);
    };

    const handleClear = () => {
        onChange({ target: { value: '' } });
        setIsOpen(false);
    };

    // Format display string safely
    const formatDisplay = (val) => {
        const parsed = parseSafeDate(val);
        if (!parsed) return val || '';
        return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const isToday = (day) => {
        const today = new Date();
        return today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
    };

    const isSelected = (day) => {
        if (!selectedDate) return false;
        return selectedDate.getFullYear() === viewYear && selectedDate.getMonth() === viewMonth && selectedDate.getDate() === day;
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', display: 'inline-block', width: '100%', ...style }}>
            {/* Input Trigger */}
            <div
                onClick={handleToggleOpen}
                className={`ios-datepicker-trigger ${className}`}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    border: isOpen ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-card)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: value ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Outfit", sans-serif',
                    boxShadow: isOpen ? '0 0 0 3px rgba(59, 130, 246, 0.15)' : '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
                    transition: 'all 0.2s ease',
                    minHeight: '38px',
                    boxSizing: 'border-box',
                }}
            >
                <span>{value ? formatDisplay(value) : placeholder}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 8, flexShrink: 0 }}>
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
            </div>

            {/* Hidden native input for form compatibility */}
            <input type="hidden" value={value || ''} required={required} />

            {/* iOS Calendar Card Popover */}
            {isOpen && (
                <div
                    className="ios-calendar-popover"
                    style={{
                        position: 'absolute',
                        ...(dropUp ? { bottom: 'calc(100% + 8px)' } : { top: 'calc(100% + 8px)' }),
                        left: alignRight ? 'auto' : 0,
                        right: alignRight ? 0 : 'auto',
                        zIndex: 99999,
                        backgroundColor: 'var(--bg-card, #FFFFFF)',
                        borderRadius: '16px',
                        border: '1px solid var(--border, #E2E8F0)',
                        boxShadow: '0 16px 36px -4px rgba(15, 23, 42, 0.18), 0 6px 16px rgba(0, 0, 0, 0.08)',
                        padding: '16px',
                        width: '280px',
                        maxWidth: 'calc(100vw - 32px)',
                        boxSizing: 'border-box',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Outfit", sans-serif',
                        userSelect: 'none',
                        animation: 'ios-popover-appear 0.2s ease-out forwards',
                    }}
                >
                    {/* Header: Month & Year + Nav Chevrons */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                        <span className="ios-calendar-title" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary, #0F172A)' }}>
                            {monthNames[viewMonth]} {viewYear}
                        </span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                                type="button"
                                onClick={prevMonth}
                                className="ios-calendar-nav-btn"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', borderRadius: '8px', color: 'var(--text-secondary, #64748B)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                            </button>
                            <button
                                type="button"
                                onClick={nextMonth}
                                className="ios-calendar-nav-btn"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', borderRadius: '8px', color: 'var(--text-secondary, #64748B)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                            </button>
                        </div>
                    </div>

                    {/* Day Name Headers */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '8px' }}>
                        {dayNames.map((d) => (
                            <span key={d} style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted, #94A3B8)', letterSpacing: '0.5px' }}>{d}</span>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center' }}>
                        {prevMonthDays.map((d) => (
                            <span key={`prev-${d}`} style={{ padding: '8px 0', fontSize: '13px', color: 'var(--text-muted, #CBD5E1)', opacity: 0.5, cursor: 'default' }}>{d}</span>
                        ))}
                        {currentMonthDays.map((d) => {
                            const active = isSelected(d);
                            const today = isToday(d);
                            return (
                                <button
                                    key={`curr-${d}`}
                                    type="button"
                                    onClick={() => handleSelectDay(d)}
                                    className={`ios-calendar-day-btn ${active ? 'active' : ''}`}
                                    style={{
                                        border: active ? 'none' : (today ? '2px solid #3B82F6' : 'none'),
                                        background: active ? '#3B82F6' : (today ? 'rgba(59, 130, 246, 0.15)' : 'transparent'),
                                        color: active ? '#FFFFFF' : (today ? '#3B82F6' : 'var(--text-primary, #0F172A)'),
                                        fontWeight: active || today ? 700 : 500,
                                        fontSize: '13px',
                                        width: '32px',
                                        height: '32px',
                                        margin: 'auto',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                        boxShadow: active ? '0 4px 10px rgba(59, 130, 246, 0.35)' : (today ? '0 0 0 2px rgba(59, 130, 246, 0.2)' : 'none'),
                                    }}
                                >
                                    {d}
                                </button>
                            );
                        })}
                        {nextMonthDays.map((d) => (
                            <span key={`next-${d}`} style={{ padding: '8px 0', fontSize: '13px', color: 'var(--text-muted, #CBD5E1)', opacity: 0.5, cursor: 'default' }}>{d}</span>
                        ))}
                    </div>

                    {/* Footer Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border, #F1F5F9)' }}>
                        <button
                            type="button"
                            onClick={handleClear}
                            style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                        >
                            Clear
                        </button>
                        <button
                            type="button"
                            onClick={handleToday}
                            style={{ background: 'none', border: 'none', color: '#3B82F6', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                        >
                            Today
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
