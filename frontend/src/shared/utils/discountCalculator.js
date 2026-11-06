/**
 * discountCalculator.js
 *
 * Per-line money breakdown of a sale, used by Transaction Details, Sales Report, Sales Log,
 * My Sales and the Excel/clipboard export. It follows the same rule as the server
 * (TransactionService::paidRatio / paidForUnits), so every screen matches the saved totals.
 *
 * All discounts are stored in pesos (a percent typed at the POS is converted to pesos there),
 * so peso and percent discounts are computed the same way here.
 *
 * For one line of a sale:
 *   Line gross        = unit price × qty sold
 *   Item discount     = the line's own peso discount
 *   Line net          = line gross − item discount
 *   Order discount    = spread over all lines by their share of the net lines
 *                       (share = order discount × line net ÷ sum of line nets, cents fixed on the
 *                       largest line so the shares add up exactly)
 *   Paid for the line = line net − its order discount share
 *
 * Showing only some units (the units left after a partial refund) scales every amount by
 * units ÷ qty sold, so the refunded units take their own share of the discount with them.
 */

const num = (v) => Number(v) || 0;
const round2 = (v) => Math.round(v * 100) / 100;

const soldQtyOf = (it) => Math.max(0, num(it?.qty ?? 1));
const remainingQtyOf = (it) => Math.max(0, num(it?.net_qty ?? (num(it?.qty) - num(it?.refunded_qty))));

/** Unit price before any discount, and the line's own peso discount for the whole sold qty. */
function linePrices(it) {
    const sold = soldQtyOf(it);
    let unitPrice = num(it?.original_price ?? it?.price);
    let directDiscount = num(it?.discount ?? it?.item_discount);

    // Older sales stored the discounted price as `price` and the list price as `original_price`.
    if (it?.original_price && num(it.original_price) > num(it.price) && directDiscount === 0) {
        unitPrice = num(it.original_price);
        directDiscount = round2((num(it.original_price) - num(it.price)) * sold);
    }

    const gross = round2(unitPrice * sold);
    directDiscount = Math.min(gross, Math.max(0, directDiscount));
    return { sold, unitPrice, gross, directDiscount, net: round2(gross - directDiscount) };
}

const sameLine = (a, b) => (a?.id != null && b?.id != null ? a.id === b.id : a === b);

/**
 * Order-discount share of `item` for its whole sold qty, spread over every line of the sale.
 */
function orderShareOf(item, tx, orderDisc) {
    if (orderDisc <= 0) return 0;
    const lines = Array.isArray(tx?.items) && tx.items.length > 0 ? tx.items : [item];
    if (lines.length === 1) return orderDisc;

    const nets = lines.map((l) => linePrices(l).net);
    const total = nets.reduce((s, v) => s + v, 0);
    if (total <= 0) return 0;

    const shares = nets.map((n) => round2(orderDisc * n / total));
    // Put the leftover centavo(s) on the largest line so the shares add up to the order discount.
    const diff = round2(orderDisc - shares.reduce((s, v) => s + v, 0));
    if (diff !== 0) {
        const largest = nets.indexOf(Math.max(...nets));
        shares[largest] = round2(shares[largest] + diff);
    }

    const index = lines.findIndex((l) => sameLine(l, item));
    if (index !== -1) return shares[index];

    // The line is not in tx.items (e.g. a flattened report row): use its proportional share.
    return round2(orderDisc * linePrices(item).net / total);
}

/**
 * Computes the money breakdown of one line, for the units being shown.
 *
 * Units shown: item.displayQty when given, otherwise the units left after a partial refund
 * (tx.is_partial_refund), otherwise the qty sold.
 *
 * @param {Object} item The line item (transaction item or report row)
 * @param {Object} txInput The parent transaction (with discount_amount and items)
 * @returns {{
 *   qty: number,
 *   unitPrice: number,
 *   lineGross: number,
 *   directItemDiscount: number,
 *   proratedOrderDiscount: number,
 *   totalDiscount: number,
 *   discountRate: number,
 *   discountedPrice: number,
 *   discountedUnitPrice: number,
 *   formattedRate: string
 * }}
 */
export const calculateItemDiscountBreakdown = (item, txInput) => {
    const tx = txInput || (item && (item.tx || item._rawTx)) || {};
    const line = linePrices(item);
    const orderDisc = num(tx.discount_amount ?? tx.discount ?? tx.discount_val ?? 0);
    const orderShare = orderShareOf(item, tx, orderDisc);

    const qty = item?.displayQty != null
        ? Math.max(0, num(item.displayQty))
        : (tx.is_partial_refund === true ? remainingQtyOf(item) : line.sold);

    // Whole line shown: use the exact amounts. Fewer units: scale by units ÷ qty sold.
    const scale = line.sold > 0 ? qty / line.sold : 0;
    const whole = qty === line.sold;

    const lineGross = whole ? line.gross : round2(line.unitPrice * qty);
    const directItemDiscount = whole ? line.directDiscount : round2(line.directDiscount * scale);
    const proratedOrderDiscount = whole ? orderShare : round2(orderShare * scale);
    const totalDiscount = Math.min(lineGross, round2(directItemDiscount + proratedOrderDiscount));
    const discountedPrice = round2(Math.max(0, lineGross - totalDiscount));

    const discountRate = lineGross > 0 && totalDiscount > 0 ? (totalDiscount / lineGross) * 100 : 0;

    return {
        qty,
        unitPrice: line.unitPrice,
        lineGross,
        directItemDiscount,
        proratedOrderDiscount,
        totalDiscount,
        discountRate,
        discountedPrice,
        discountedUnitPrice: qty > 0 ? round2(discountedPrice / qty) : line.unitPrice,
        formattedRate: formatDiscountRate(discountRate),
    };
};

/**
 * Total discount (item + order share) for the units shown of one line.
 *
 * @param {Object} item
 * @param {Object} txInput
 * @returns {number}
 */
export const getItemDiscountAmount = (item, txInput) => calculateItemDiscountBreakdown(item, txInput).totalDiscount;

/**
 * Format a discount rate: "10%", "3%", "1.45%", or "—".
 *
 * @param {number} rate
 * @returns {string}
 */
export function formatDiscountRate(rate) {
    if (!rate || rate <= 0) return '—';
    const isInteger = Math.abs(rate - Math.round(rate)) < 0.001;
    return `${isInteger ? Math.round(rate) : rate.toFixed(2)}%`;
}
