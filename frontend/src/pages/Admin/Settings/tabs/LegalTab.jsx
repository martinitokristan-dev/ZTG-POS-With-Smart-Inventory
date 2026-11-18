import React from 'react';
import LegalDocument from '../../../../shared/components/LegalDocument';
import { readStoredUser, formatAcceptedAt } from '../../../../shared/utils/termsStatus';
import '../../../../shared/components/LegalDocument.css';

/**
 * Settings > Privacy and Terms: read-only copy of the Privacy Policy and the Terms and
 * Conditions, with the date the signed-in user accepted them. Available to every role.
 */
export default function LegalTab() {
    const [user, setUser] = React.useState(readStoredUser);

    React.useEffect(() => {
        const handleUpdate = () => setUser(readStoredUser());
        window.addEventListener('auth_user_updated', handleUpdate);
        return () => window.removeEventListener('auth_user_updated', handleUpdate);
    }, []);

    const terms = user?.terms;
    const acceptedAt = formatAcceptedAt(terms?.accepted_at);
    const accepted = Boolean(acceptedAt);

    return (
        <div>
            <div className="legal-settings-status">
                <div className={`legal-settings-status-icon ${accepted ? 'accepted' : 'pending'}`} aria-hidden="true">
                    {accepted ? (
                        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                    ) : (
                        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                    )}
                </div>
                <div>
                    <p className="legal-settings-status-title">
                        {accepted ? 'You have accepted these documents' : 'Not yet accepted'}
                    </p>
                    <p className="legal-settings-status-text">
                        {accepted
                            ? `Accepted on ${acceptedAt}, version ${terms.accepted_version || terms.current_version}.`
                            : 'You will be asked to accept the Privacy Policy and the Terms and Conditions on your next sign-in.'}
                    </p>
                </div>
            </div>

            <div className="legal-settings-reader">
                <LegalDocument />
            </div>
        </div>
    );
}
