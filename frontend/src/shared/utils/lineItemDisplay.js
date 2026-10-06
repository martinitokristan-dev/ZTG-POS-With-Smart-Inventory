/**
 * Display helpers for sale / reservation line items.
 *
 * Line items carry a snapshot frozen at time of sale (item_name, part_no,
 * variant_label, unit). These helpers always prefer that snapshot over the
 * live `product` relation, so renaming or deleting a product or variant option
 * later does not rewrite how old sales look.
 *
 * Field order also supports POS cart / receipt objects that use `name` / `partNo`.
 */

/**
 * Line name including the variant label, e.g. "Track Bolt (M, Black)".
 * The "Name (label)" format is what FormattedProductName parses to highlight variants.
 *
 * @param {object} item     Transaction item, reservation item, or cart line.
 * @param {string} fallback Text used when no name is available.
 * @returns {string}
 */
export function getLineItemName(item, fallback = 'Item') {
    if (!item) return fallback;
    const base = item.name || item.item_name || item.product?.name || fallback;
    const label = item.variant_label;
    if (!label || base.includes(label)) return base;
    return `${base} (${label})`;
}

/**
 * Part number frozen on the line, falling back to the live product.
 *
 * @param {object} item     Transaction item, reservation item, or cart line.
 * @param {string} fallback Text used when no part number is available.
 * @returns {string}
 */
export function getLineItemPartNo(item, fallback = '—') {
    if (!item) return fallback;
    return item.partNo || item.part_no || item.product?.part_no || fallback;
}

/**
 * Unit of measure frozen on the line, falling back to the product's UOM.
 *
 * @param {object} item     Transaction item or cart line.
 * @param {string} fallback Unit used when none is recorded.
 * @returns {string}
 */
export function getLineItemUnit(item, fallback = 'pc') {
    if (!item) return fallback;
    return item.unit || item.uom || item.product?.uom || fallback;
}
