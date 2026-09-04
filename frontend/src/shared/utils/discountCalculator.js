/**
 * discountCalculator.js
 *
 * Centralized financial discount computation and multi-item proration engine
 * conforming to retail POS standards (Microsoft Dynamics 365 / BIR RR 7-2024 / EOPT Act).
 *
 * Provides:
 * 1. Proportional weighted proration for whole-order discounts (custom peso or %) across 5+ items.
 * 2. Cent-accurate penny remainder safeguard (Largest Remainder Rule).
 * 3. Exact breakdown: Unit Price, Line Gross, Discount Rate (%), Discount (₱), Discounted Price.
 */

/**
 * Computes complete item-level financial and discount metrics.
 *
 * @param {Object} item The line item object (from transaction items or report rows)
 * @param {Object} txInput The parent transaction object
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
  const isPartialRefund = tx.is_partial_refund === true;

  // Resolve quantity
  const qty = Number(
    item?.displayQty ??
    (isPartialRefund
      ? (item?.net_qty ?? Math.max(0, (item?.qty || 0) - (item?.refunded_qty || 0)))
      : (item?.qty ?? 1))
  );

  // Resolve unit price (original list price takes precedence over discounted sold price)
  let rawPrice = Number(item?.original_price ?? item?.price ?? 0);
  const directItemDisc = Number(item?.discount ?? item?.item_discount ?? 0);

  // Fallback for older transactions where original_price was stored as price
  if (item?.original_price && Number(item.original_price) > Number(item.price) && directItemDisc === 0) {
    rawPrice = Number(item.original_price);
  }

  const unitPrice = rawPrice > 0 ? rawPrice : (Number(tx.amount || 0) / Math.max(1, qty));
  const lineGross = Math.max(0, qty * unitPrice);

  // Direct line-item discount
  let directDiscount = directItemDisc;
  if (item?.original_price && Number(item.original_price) > Number(item.price) && directDiscount === 0) {
    directDiscount = (Number(item.original_price) - Number(item.price)) * qty;
  }

  // Order-level discount from parent transaction
  const orderDisc = Number(tx.discount_amount ?? tx.discount ?? tx.discount_val ?? 0);
  let proratedOrderDiscount = 0;

  if (orderDisc > 0) {
    const txItems = Array.isArray(tx.items) && tx.items.length > 0 ? tx.items : [];
    
    // Filter active items
    const activeItems = isPartialRefund
      ? txItems.filter(it => Number(it.net_qty ?? Math.max(0, (it.qty || 0) - (it.refunded_qty || 0))) > 0)
      : txItems;

    if (activeItems.length <= 1) {
      // Single active item takes the entire remaining order discount
      if (isPartialRefund && activeItems.length === 1) {
        const uPrice = Number(activeItems[0].original_price || activeItems[0].price || 0);
        const itemQty = Number(activeItems[0].net_qty ?? Math.max(0, (activeItems[0].qty || 0) - (activeItems[0].refunded_qty || 0)));
        const gross = itemQty * uPrice;
        const effDisc = Math.max(0, gross - Number(tx.amount || 0));
        proratedOrderDiscount = effDisc > 0 ? effDisc : orderDisc;
      } else {
        proratedOrderDiscount = orderDisc;
      }
    } else {
      // Multi-item cart proration with Largest Remainder Rule cent safeguard
      let activeRawSubtotal = 0;
      let maxGross = -1;
      let maxGrossItemId = null;
      const computedShares = [];

      activeItems.forEach(it => {
        const itPrice = Number(it.original_price || it.price || 0);
        const itQty = isPartialRefund
          ? Number(it.net_qty ?? Math.max(0, (it.qty || 0) - (it.refunded_qty || 0)))
          : Number(it.qty || 1);
        const itGross = itQty * itPrice;
        activeRawSubtotal += itGross;

        if (itGross > maxGross) {
          maxGross = itGross;
          maxGrossItemId = it.id || it.product_id || it.part_no || it.name;
        }
      });

      if (activeRawSubtotal > 0) {
        const currentItemId = item?.id || item?.product_id || item?.part_no || item?.name;
        const baseShare = (lineGross / activeRawSubtotal) * orderDisc;
        const roundedBaseShare = Math.round(baseShare * 100) / 100;

        // Cent remainder accumulator adjustment for the highest-grossing item
        let totalRounded = 0;
        activeItems.forEach(it => {
          const itPrice = Number(it.original_price || it.price || 0);
          const itQty = isPartialRefund
            ? Number(it.net_qty ?? Math.max(0, (it.qty || 0) - (it.refunded_qty || 0)))
            : Number(it.qty || 1);
          const itGross = itQty * itPrice;
          const share = Math.round(((itGross / activeRawSubtotal) * orderDisc) * 100) / 100;
          totalRounded += share;
        });

        const centDiscrepancy = Math.round((orderDisc - totalRounded) * 100) / 100;
        if (currentItemId === maxGrossItemId && Math.abs(centDiscrepancy) > 0 && Math.abs(centDiscrepancy) < 1) {
          proratedOrderDiscount = Math.max(0, roundedBaseShare + centDiscrepancy);
        } else {
          proratedOrderDiscount = roundedBaseShare;
        }
      } else {
        proratedOrderDiscount = Math.round((orderDisc / activeItems.length) * 100) / 100;
      }
    }
  }

  // Combined line discount (clamped to line gross total)
  const totalDiscount = Math.min(lineGross, Math.max(0, directDiscount + proratedOrderDiscount));

  // Effective Discount Rate (%)
  let discountRate = 0;
  if (lineGross > 0 && totalDiscount > 0) {
    discountRate = (totalDiscount / lineGross) * 100;
  }

  // Discounted Price (Net line sales)
  const discountedPrice = Math.max(0, lineGross - totalDiscount);
  const discountedUnitPrice = qty > 0 ? (discountedPrice / qty) : unitPrice;

  // Formatted rate string: e.g. "10%", "3%", "1.45%", or "—"
  let formattedRate = '—';
  if (discountRate > 0) {
    const isInteger = Math.abs(discountRate - Math.round(discountRate)) < 0.001;
    formattedRate = `${isInteger ? Math.round(discountRate) : discountRate.toFixed(2)}%`;
  }

  return {
    qty,
    unitPrice,
    lineGross,
    directItemDiscount: directDiscount,
    proratedOrderDiscount,
    totalDiscount,
    discountRate,
    discountedPrice,
    discountedUnitPrice,
    formattedRate,
  };
};

/**
 * Backwards-compatible helper returning just the total discount amount for an item.
 *
 * @param {Object} item 
 * @param {Object} txInput 
 * @returns {number}
 */
export const getItemDiscountAmount = (item, txInput) => {
  const breakdown = calculateItemDiscountBreakdown(item, txInput);
  return breakdown.totalDiscount;
};

/**
 * Format discount rate helper.
 *
 * @param {number} rate 
 * @returns {string}
 */
export const formatDiscountRate = (rate) => {
  if (!rate || rate <= 0) return '—';
  const isInteger = Math.abs(rate - Math.round(rate)) < 0.001;
  return `${isInteger ? Math.round(rate) : rate.toFixed(2)}%`;
};
