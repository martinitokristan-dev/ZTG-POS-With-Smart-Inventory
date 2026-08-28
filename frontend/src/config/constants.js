/**
 * Application-wide frontend constants.
 * All magic numbers that represent configurable behaviour live here.
 * UI animation timings and CSS values stay inline in their components.
 */

// ─── POS ────────────────────────────────────────────────────────────────────

/** Milliseconds to wait after the cashier stops typing before firing a server search */
export const POS_SEARCH_DEBOUNCE_MS = 250;

/** Milliseconds to display the POS cart error banner before auto-dismissing */
export const POS_ERROR_DISPLAY_MS = 4000;

/** Maximum number of top-selling category pills shown in the POS catalogue header */
export const POS_TOP_CATEGORIES_LIMIT = 5;

// ─── Polling Intervals ───────────────────────────────────────────────────────

/** Fallback polling interval for inventory / product context (5 minutes) */
export const INVENTORY_POLL_INTERVAL_MS = 300000;

/** Debounce delay before re-polling after a real-time event (5 seconds) */
export const REALTIME_DEBOUNCE_POLL_MS = 5000;

/** Polling interval for notification context (15 seconds) */
export const NOTIFICATION_POLL_INTERVAL_MS = 15000;

/** Milliseconds to display the notification bubble before auto-dismissing */
export const NOTIFICATION_BUBBLE_DISPLAY_MS = 3000;

// ─── Cache ───────────────────────────────────────────────────────────────────

/** Maximum number of pages pre-fetched and cached for history / daily-sales lists */
export const PAGINATED_CACHE_MAX_PAGES = 50;
