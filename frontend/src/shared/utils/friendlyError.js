/**
 * Plain-language text for a failed API call.
 *
 * Every screen already shows `err.response?.data?.message || err.message`. The api.js
 * interceptor runs every error through here and rewrites both fields when they hold a
 * technical text ("Network Error", "Request failed with status code 500", ...), so all
 * screens show the readable sentence without changing each one.
 *
 * Messages the server wrote on purpose (validation, business rules) are kept as they are.
 */

const TECHNICAL = [
    /^$/,
    /^Network Error$/i,
    /^Request failed with status code \d+$/i,
    /^timeout of \d+ms exceeded$/i,
    /^Server Error$/i,
    /^Unauthenticated\.?$/i,
    /^This action is unauthorized\.?$/i,
    /^Too Many Attempts\.?$/i,
    /^No query results for model/i,
    /^The route .* could not be found/i,
    /^(Not Found|Forbidden|Unauthorized|Page Expired|Service Unavailable|Bad Gateway|Gateway Timeout)$/i,
    /SQLSTATE|Exception|Stack trace|\.php/i,
];

const isTechnical = (text) => TECHNICAL.some((re) => re.test(String(text ?? '').trim()));

/** The sentence to show when the server gave nothing readable. */
function messageFor(error) {
    if (error?.code === 'ERR_CANCELED') return 'The request was cancelled.';
    if (error?.code === 'ECONNABORTED' || /timeout/i.test(error?.message || '')) {
        return 'The server took too long to answer. Please check your internet and try again.';
    }
    if (!error?.response) {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            return "You're offline. Check your internet connection and try again.";
        }
        return "Can't reach the server. It may be starting up. Wait a few seconds and try again.";
    }

    const status = error.response.status;
    const reference = error.response.data?.reference;
    switch (status) {
        case 400: return 'The request was not accepted. Please check your input and try again.';
        case 401: return 'Your session has expired. Please log in again.';
        case 403: return "You don't have permission to do this. Ask an Admin if you need access.";
        case 404: return 'This record was not found. It may have been deleted. Refresh the page and try again.';
        case 405: return 'This action is not available. Refresh the page and try again.';
        case 409: return 'Someone else changed this at the same time. Refresh the page and try again.';
        case 413: return 'The file is too large. Choose a smaller file and try again.';
        case 419: return 'Your session expired. Refresh the page and try again.';
        case 422: return 'Some details are missing or not valid. Please check the form and try again.';
        case 429: return 'Too many attempts. Please wait a minute and try again.';
        case 502:
        case 503:
        case 504: return 'The server is busy or restarting. Please wait a moment and try again.';
        default:
            if (status >= 500) {
                return reference
                    ? `Something went wrong on our side. Please try again. If it keeps happening, tell the system admin this code: ${reference}.`
                    : 'Something went wrong on our side. Please try again in a moment.';
            }
            return 'The request could not be completed. Please try again.';
    }
}

/**
 * Rewrite a failed request's messages in place, keeping readable server messages.
 * @param {any} error axios error
 * @returns {any} the same error
 */
export function applyFriendlyError(error) {
    if (!error || error.__friendly) return error;
    const data = error.response?.data;
    const hasObjectBody = data && typeof data === 'object' && !(typeof Blob !== 'undefined' && data instanceof Blob);
    const serverMsg = hasObjectBody ? data.message : undefined;

    const friendly = serverMsg && !isTechnical(serverMsg) ? serverMsg : messageFor(error);

    if (hasObjectBody) {
        data.message = friendly;
    } else if (error.response) {
        error.response.data = { message: friendly };
    }
    error.message = friendly;
    error.__friendly = true;
    return error;
}

/** Readable text for any caught error (also works for non-API errors). */
export function friendlyErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
    if (error?.isAxiosError || error?.response || error?.request) {
        return applyFriendlyError(error).message;
    }
    const msg = error?.message;
    return msg && !isTechnical(msg) ? msg : fallback;
}
