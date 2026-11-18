import React from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { LegalArticle } from './LegalDocument';
import { clearEntireCache } from '../hooks/usePaginatedCache';
import { readStoredUser, saveStoredTerms } from '../utils/termsStatus';
import { confirmDialog } from '../utils/confirmDialog';
import { showToast } from '../../utils/toast';
import { LEGAL_DOCUMENTS, TERMS_VERSION, LEGAL_LAST_UPDATED, LEGAL_BUSINESS_NAME } from '../../config/legal';
import './LegalDocument.css';

/** Distance from the bottom (px) that counts as "read to the end". */
const END_TOLERANCE = 24;

/**
 * Agreement screen shown once, on the first sign-in of an account that has not yet accepted.
 *
 * Two steps: the Privacy Policy, then the Terms and Conditions. The button of each step is
 * enabled only after the user has scrolled to the end of that document (scroll-to-accept).
 * "I Agree" on the last step records the acceptance; after that the screen never appears again
 * for the account. "Decline" signs the user out. Mounted once in AppShell.
 */
export default function TermsGate() {
    const navigate = useNavigate();
    const [user, setUser] = React.useState(readStoredUser);
    const [step, setStep] = React.useState(0);
    const [readToEnd, setReadToEnd] = React.useState({});
    const [progress, setProgress] = React.useState(0);
    const [submitting, setSubmitting] = React.useState(false);
    const [signingOut, setSigningOut] = React.useState(false);
    const [error, setError] = React.useState('');
    const fetchedRef = React.useRef(false);
    const cardRef = React.useRef(null);
    const bodyRef = React.useRef(null);

    const doc = LEGAL_DOCUMENTS[step];
    const isLastStep = step === LEGAL_DOCUMENTS.length - 1;
    const canContinue = Boolean(readToEnd[doc.id]);
    const isOpen = Boolean(user?.terms?.required);

    React.useEffect(() => {
        const handleUpdate = () => setUser(readStoredUser());
        window.addEventListener('auth_user_updated', handleUpdate);
        return () => window.removeEventListener('auth_user_updated', handleUpdate);
    }, []);

    // A session started before this feature has no terms status yet: ask the server once.
    React.useEffect(() => {
        if (!user || user.terms || fetchedRef.current) return;
        fetchedRef.current = true;
        api.get('/user')
            .then(res => {
                const terms = res?.data?.user?.terms;
                if (terms) saveStoredTerms(terms);
            })
            .catch(() => { /* Not shown now; the next sign-in brings the status. */ });
    }, [user]);

    // Keep the page behind still and put keyboard focus in the dialog.
    React.useEffect(() => {
        if (!isOpen) return undefined;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        cardRef.current?.focus();
        return () => { document.body.style.overflow = previous; };
    }, [isOpen]);

    const measure = React.useCallback(() => {
        const el = bodyRef.current;
        if (!el) return;
        const scrollable = el.scrollHeight - el.clientHeight;
        const ratio = scrollable <= 0 ? 1 : Math.min(1, el.scrollTop / scrollable);
        setProgress(ratio);
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - END_TOLERANCE) {
            setReadToEnd(prev => (prev[doc.id] ? prev : { ...prev, [doc.id]: true }));
        }
    }, [doc.id]);

    // New step: start at the top. Short text on a tall screen counts as read at once.
    React.useEffect(() => {
        if (!isOpen) return undefined;
        const el = bodyRef.current;
        if (el) el.scrollTop = 0;
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [isOpen, step, measure]);

    if (!isOpen) return null;

    const scrollDown = () => {
        const el = bodyRef.current;
        if (el) el.scrollBy({ top: el.clientHeight * 0.85, behavior: 'smooth' });
    };

    const handleNext = () => {
        if (!canContinue) return;
        setError('');
        setStep(s => s + 1);
    };

    const handleBack = () => {
        setError('');
        setStep(s => Math.max(0, s - 1));
    };

    const handleAgree = async () => {
        if (!canContinue || submitting) return;
        setSubmitting(true);
        setError('');
        try {
            const res = await api.post('/user/accept-terms', { version: TERMS_VERSION });
            saveStoredTerms(res.data.terms);
            showToast('Thank you. Your acceptance has been recorded.');
        } catch (err) {
            setError(
                err?.response?.data?.errors?.version?.[0]
                || err?.response?.data?.message
                || 'Your acceptance could not be saved. Please check your connection and try again.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleDecline = async () => {
        const confirmed = await confirmDialog({
            title: 'Decline and sign out?',
            message: 'You can use the System only after accepting the Privacy Policy and the Terms and Conditions. You will be signed out, and you will see these documents again the next time you sign in.',
            confirmText: 'Decline and Sign Out',
            cancelText: 'Keep Reading',
            variant: 'danger',
        });
        if (!confirmed) return;

        setSigningOut(true);
        try {
            await api.post('/logout');
        } catch {
            /* The session is cleared below either way. */
        } finally {
            clearEntireCache();
            sessionStorage.removeItem('auth_token');
            sessionStorage.removeItem('auth_user');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            window.dispatchEvent(new Event('auth_user_updated'));
            navigate('/login');
        }
    };

    const busy = submitting || signingOut;

    return (
        <div className="terms-gate-overlay">
            <div
                className="terms-gate-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="terms-gate-title"
                tabIndex={-1}
                ref={cardRef}
            >
                <header className="terms-gate-header">
                    {step > 0 && (
                        <button
                            type="button"
                            className="terms-gate-back-circle"
                            onClick={handleBack}
                            disabled={busy}
                            aria-label="Go back"
                            title="Back"
                        >
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                        </button>
                    )}
                    <h2 className="terms-gate-title" id="terms-gate-title">{doc.title}</h2>
                    <p className="terms-gate-meta">
                        {LEGAL_BUSINESS_NAME} · Last updated {LEGAL_LAST_UPDATED}
                    </p>
                    <div
                        className="terms-gate-progress"
                        role="progressbar"
                        aria-label={`Reading progress of the ${doc.title}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(progress * 100)}
                    >
                        <span style={{ width: `${Math.round(progress * 100)}%` }} />
                    </div>
                </header>

                <div className="terms-gate-body" ref={bodyRef} onScroll={measure} tabIndex={0}>
                    <p className="terms-gate-intro">
                        {isLastStep
                            ? `Please read these Terms and Conditions carefully. They govern your use of the System of ${LEGAL_BUSINESS_NAME}.`
                            : `Please read this Privacy Policy carefully. It explains how ${LEGAL_BUSINESS_NAME} handles personal information in the System.`}
                    </p>
                    <LegalArticle doc={doc} />
                </div>

                <footer className="terms-gate-footer">
                    {error ? (
                        <p className="terms-gate-error" role="alert">{error}</p>
                    ) : canContinue ? (
                        <p className="terms-gate-hint done">
                            {isLastStep
                                ? 'By selecting Agree, you accept the Privacy Policy and the Terms and Conditions. You are asked only once.'
                                : 'You have reached the end. Select Accept to read the Terms and Conditions.'}
                        </p>
                    ) : (
                        <button type="button" className="terms-gate-hint" onClick={scrollDown}>
                            <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
                            Scroll to the end of the {doc.title} to continue
                        </button>
                    )}

                    <div className="terms-gate-actions">
                        <div className="terms-gate-buttons">
                            <button
                                type="button"
                                className="terms-gate-btn terms-gate-btn-decline"
                                onClick={handleDecline}
                                disabled={busy}
                            >
                                {signingOut ? 'Signing out...' : 'Decline'}
                            </button>
                            <button
                                type="button"
                                className="terms-gate-btn terms-gate-btn-primary"
                                onClick={isLastStep ? handleAgree : handleNext}
                                disabled={!canContinue || busy}
                            >
                                {submitting && <span className="terms-gate-spinner" aria-hidden="true" />}
                                {isLastStep ? (submitting ? 'Saving...' : 'Agree') : 'Accept'}
                            </button>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
