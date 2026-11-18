/**
 * Privacy Policy and Terms acceptance status of the signed-in user.
 * The server sends it as `user.terms` with the login and GET /user responses:
 *   { current_version, accepted_version, accepted_at, required }
 */

/** The signed-in user from session storage, or null. */
export function readStoredUser() {
    try {
        return JSON.parse(sessionStorage.getItem('auth_user') ?? localStorage.getItem('auth_user'));
    } catch {
        return null;
    }
}

/**
 * Save a new terms status on the stored user and tell the rest of the app.
 *
 * @param {object} terms Status returned by the server.
 */
export function saveStoredTerms(terms) {
    const user = readStoredUser();
    if (!user) return;
    sessionStorage.setItem('auth_user', JSON.stringify({ ...user, terms }));
    localStorage.removeItem('auth_user');
    window.dispatchEvent(new Event('auth_user_updated'));
}

/**
 * Acceptance date for display, e.g. "November 15, 2026 at 3:20 PM".
 *
 * @param {string|null} iso
 * @returns {string}
 */
export function formatAcceptedAt(iso) {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const day = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${day} at ${time}`;
}
