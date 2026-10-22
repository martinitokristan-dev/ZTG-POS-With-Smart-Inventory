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

/** Inventory data younger than this is reused instead of re-downloaded (e.g. when opening the dashboard). Realtime events keep it current in between. */
export const INVENTORY_FRESH_MS = 30000;

/** Debounce delay before re-polling after a real-time event (5 seconds) */
export const REALTIME_DEBOUNCE_POLL_MS = 5000;

/** Polling interval for notification context (15 seconds) */
export const NOTIFICATION_POLL_INTERVAL_MS = 15000;

/** Milliseconds to display the notification bubble before auto-dismissing */
export const NOTIFICATION_BUBBLE_DISPLAY_MS = 3000;

/** Notifications fetched per page in the inbox (infinite scroll loads the next page near the bottom) */
export const NOTIFICATION_PAGE_SIZE = 20;

// ─── Cache ───────────────────────────────────────────────────────────────────

/** Maximum number of pages pre-fetched and cached for history / daily-sales lists */
export const PAGINATED_CACHE_MAX_PAGES = 50;

// ─── Product Variants ────────────────────────────────────────────────────────

/** Maximum variant rows the "Generate combinations" tool creates in one click (guards against huge accidental matrices) */
export const VARIANT_GENERATOR_MAX_COMBINATIONS = 100;
