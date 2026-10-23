/**
 * Shared constants for the smart Excel product import.
 */

/** Product families sent per save request (backend accepts up to 50). */
export const IMPORT_CHUNK_SIZE = 50;

/** Product families shown per page on the review screen. */
export const IMPORT_PAGE_SIZE = 40;

/** Largest file accepted, in megabytes (matches the backend limit). */
export const IMPORT_MAX_FILE_MB = 20;

/** Accepted file extensions. */
export const IMPORT_ACCEPT = '.xlsx,.xls,.csv';

/** Variant types offered when moving a value to another type. */
export const IMPORT_VARIANT_TYPES = ['Size', 'Specification', 'Quality', 'Color', 'Material'];

/** Labels of the system fields an Excel column can be mapped to. */
export const IMPORT_FIELD_LABELS = {
    name: 'Product name / description',
    part_no: 'Part number',
    chinese_name: 'Chinese name',
    brand: 'Brand',
    category: 'Category',
    address: 'Warehouse address',
    stock: 'Stock balance',
    uom: 'Unit of measure',
    price1: 'Price 1',
    price2: 'Price 2',
    price: 'Single price (fills Price 1 and 2)',
    image: 'Image',
    notes: 'Notes',
};

/** Empty review decisions, in the shape the backend expects. */
export const EMPTY_DECISIONS = {
    rejected_brands: [],
    extra_brands: [],
    rejected_options: [],
    moved_options: [],
    category_renames: [],
    brand_renames: [],
    kept_brands: [],
    kept_categories: [],
};

/**
 * Readable message from an API error.
 *
 * @param {any} err Axios error.
 * @param {string} fallback Message when the server sent none.
 * @returns {string}
 */
export function importErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
    const data = err?.response?.data;
    const first = data?.errors ? Object.values(data.errors).flat()[0] : null;
    if (first) return String(first);
    if (err?.response?.status === 413) return 'The file is too large for the server. Remove large pictures or unused sheets and try again.';
    return data?.message ? String(data.message) : fallback;
}
