import React from 'react';

/**
 * Catches a crash while drawing a screen, so the user sees a short explanation and a
 * Reload button instead of a blank white page. Saved data is not affected by such a crash.
 */
export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    render() {
        if (!this.state.hasError) return this.props.children;

        return (
            <div role="alert" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--bg-canvas, #F8FAFC)' }}>
                <div style={{ maxWidth: '420px', width: '100%', background: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border, #E2E8F0)', borderRadius: '12px', padding: '28px', textAlign: 'center', boxShadow: 'var(--shadow-lg)' }}>
                    <div style={{ width: '44px', height: '44px', margin: '0 auto 14px', borderRadius: '50%', background: 'var(--danger-light, #FEE2E2)', color: 'var(--danger, #EF4444)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                    </div>
                    <h2 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 8px', color: 'var(--text-primary, #0F172A)' }}>This screen hit a problem</h2>
                    <p style={{ fontSize: '13px', lineHeight: 1.55, color: 'var(--text-secondary, #64748B)', margin: '0 0 20px' }}>
                        Your saved data is safe. Reload the page to continue. If this keeps happening, tell the system admin what you clicked just before it.
                    </p>
                    <button type="button" className="btn btn-primary" onClick={() => window.location.reload()} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', borderRadius: '8px', fontWeight: 600, padding: '8px 18px' }}>
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
                        Reload page
                    </button>
                </div>
            </div>
        );
    }
}
