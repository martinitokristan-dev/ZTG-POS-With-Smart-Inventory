/**
 * Escape a value for safe insertion into an HTML string (text or quoted attribute).
 *
 * Use this for every user-controlled value placed into markup built with template
 * strings and `innerHTML` (e.g. printed receipts), so a product or customer name like
 * `<img src=x onerror=...>` is shown as text instead of running as code.
 *
 * @param {*} value Any value; null/undefined become an empty string.
 * @returns {string}
 */
export default function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
