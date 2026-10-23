/**
 * Helpers for product prices. A price can be empty (null): it was not in the imported Excel or
 * was left blank in the product form. An empty price is never treated as ₱0 and cannot be sold.
 */

/**
 * Whether a price is set (0 is a set price; null, undefined and '' are empty).
 *
 * @param {number|string|null|undefined} value
 * @returns {boolean}
 */
export function hasPrice(value) {
    return value !== null && value !== undefined && value !== '' && !Number.isNaN(Number(value));
}

/**
 * Display text for a price: "₱1,250" or "—" when empty.
 *
 * @param {number|string|null|undefined} value
 * @param {object} [options] Intl number options (default: up to 2 decimals).
 * @returns {string}
 */
export function formatPrice(value, options = { maximumFractionDigits: 2 }) {
    return hasPrice(value) ? `₱${Number(value).toLocaleString('en-US', options)}` : '—';
}

/**
 * Value for a price input box: '' when empty, so the box shows blank instead of 0.
 *
 * @param {number|string|null|undefined} value
 * @returns {string|number}
 */
export function priceInputValue(value) {
    return hasPrice(value) ? value : '';
}

/**
 * Price as sent to the API: null when the box is empty, otherwise a number of at least 0.
 *
 * @param {number|string|null|undefined} value
 * @returns {number|null}
 */
export function priceForApi(value) {
    return hasPrice(value) ? Math.max(0, Number(value)) : null;
}
