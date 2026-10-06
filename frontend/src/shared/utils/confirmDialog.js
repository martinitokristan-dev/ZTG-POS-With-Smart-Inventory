/**
 * In-app replacement for window.confirm().
 *
 *   if (!(await confirmDialog({ title: 'Delete brand?', message: '...' }))) return;
 *
 * Resolves to true when the user confirms, false when they cancel (button, Escape or clicking outside).
 * The dialog itself is rendered by <ConfirmDialogHost />, mounted once in app.jsx.
 */

let listener = null;
let pending = null;

/**
 * Register the dialog host. Returns an unsubscribe function.
 * @param {(request: object|null) => void} fn
 */
export function subscribeConfirmDialog(fn) {
    listener = fn;
    return () => {
        if (listener === fn) listener = null;
    };
}

/**
 * Ask the user to confirm an action.
 * @param {{ title?: string, message?: string, confirmText?: string, cancelText?: string, variant?: 'danger'|'warning'|'primary' }} options
 * @returns {Promise<boolean>}
 */
export function confirmDialog({
    title = 'Are you sure?',
    message = '',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
} = {}) {
    // A newer request replaces an unanswered one; the old one counts as cancelled.
    if (pending) pending.resolve(false);

    return new Promise((resolve) => {
        if (!listener) {
            // Host not mounted (should not happen in the app). Fail safe: do not run the action.
            resolve(false);
            return;
        }
        pending = {
            title, message, confirmText, cancelText, variant,
            resolve: (answer) => {
                pending = null;
                resolve(answer);
            },
        };
        listener(pending);
    });
}
