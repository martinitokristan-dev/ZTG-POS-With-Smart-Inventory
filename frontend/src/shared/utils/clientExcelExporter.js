/**
 * clientExcelExporter.js
 * Exports sales data matching the client's exact spreadsheet template:
 * - Green Header: DAILY SALES [MONTH YEAR]
 * - 11 Columns: DATE | QTY | PART NUMBER | PART NAME | PRICE | SALES | CUSTOMER NAME | PAYMENT | DISCOUNTED | S.I./C.R./D.R. | SERVE BY
 */

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
};

const getMonthYearLabel = (startDateStr, endDateStr) => {
  const d = startDateStr ? new Date(startDateStr) : new Date();
  const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
  const month = monthNames[d.getMonth()] || "SALES";
  const year = d.getFullYear() || new Date().getFullYear();
  return `${month} ${year}`;
};

const escapeHtml = (unsafe) => {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const formatPaymentMethod = (pm) => {
  if (!pm) return 'CASH';
  const raw = String(pm).trim();
  if (/^P\.?O\.?/i.test(raw)) {
    return 'P.O';
  }
  return raw.replace(/\s*\([^)]*\)/g, '').trim() || 'CASH';
};

export const getItemDiscountAmount = (item, txInput) => {
  if (!item && !txInput) return 0;
  const tx = txInput || (item && item.tx) || {};
  if (!item) return Number(tx.discount_amount || tx.discount || tx.discount_val || 0);
  
  // 1. Direct item-level discount (total discount for this line item)
  const itemDiscVal = Number(item.discount || item.item_discount || 0);
  if (itemDiscVal > 0) {
    return itemDiscVal;
  }

  // 2. Order-wide discount from transaction (discount_amount, discount_val, or discount)
  const orderDisc = Number(tx.discount_amount || tx.discount || tx.discount_val || 0);
  if (orderDisc > 0) {
    const isPartialRefund = tx.is_partial_refund === true;
    const txItems = Array.isArray(tx.items) && tx.items.length > 0 ? tx.items : [];
    
    const activeItems = isPartialRefund
      ? txItems.filter(it => Number(it.net_qty ?? Math.max(0, (it.qty || 0) - (it.refunded_qty || 0))) > 0)
      : txItems;

    if (activeItems.length <= 1) {
      if (isPartialRefund && activeItems.length === 1) {
        const uPrice = Number(activeItems[0].original_price || activeItems[0].price || 0);
        const itemQty = Number(activeItems[0].net_qty ?? Math.max(0, (activeItems[0].qty || 0) - (activeItems[0].refunded_qty || 0)));
        const gross = itemQty * uPrice;
        const effDisc = Math.max(0, gross - Number(tx.amount || 0));
        return effDisc > 0 ? effDisc : orderDisc;
      }
      return orderDisc;
    }

    // Calculate raw subtotal of active items in transaction
    const activeRawSubtotal = activeItems.reduce((sum, it) => {
      const uPrice = Number(it.original_price || it.price || 0);
      const q = isPartialRefund
        ? Number(it.net_qty ?? Math.max(0, (it.qty || 0) - (it.refunded_qty || 0)))
        : Number(it.qty || 1);
      return sum + (q * uPrice);
    }, 0);

    if (activeRawSubtotal > 0) {
      const uPrice = Number(item.original_price || item.price || 0);
      const itemQty = isPartialRefund
        ? Number(item.net_qty ?? Math.max(0, (item.qty || 0) - (item.refunded_qty || 0)))
        : Number(item.qty || 1);
      const itemSubtotal = itemQty * uPrice;

      if (isPartialRefund) {
        const effectiveActiveDiscount = Math.max(0, activeRawSubtotal - Number(tx.amount || 0));
        return (itemSubtotal / activeRawSubtotal) * (effectiveActiveDiscount > 0 ? effectiveActiveDiscount : orderDisc);
      }

      return (itemSubtotal / activeRawSubtotal) * orderDisc;
    }
    return orderDisc / activeItems.length;
  }

  return 0;
};

const writeClipboardRichSales = async (htmlRows, tsvRows) => {
  const fullHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
      <style>
        body, table, tr, td { font-family: Calibri, Arial, sans-serif; font-size: 11pt; font-weight: bold; border-collapse: collapse; }
      </style>
    </head>
    <body>
      <table style="border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 11pt; font-weight: bold;">
        <tbody>
          ${htmlRows}
        </tbody>
      </table>
    </body>
    </html>
  `;

  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
    try {
      const htmlBlob = new Blob([fullHtml], { type: 'text/html' });
      const textBlob = new Blob([tsvRows], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob
        })
      ]);
      return true;
    } catch (err) {
      console.warn('ClipboardItem write failed, falling back to copy event:', err);
    }
  }

  const listener = (e) => {
    e.clipboardData.setData('text/html', fullHtml);
    e.clipboardData.setData('text/plain', tsvRows);
    e.preventDefault();
  };
  document.addEventListener('copy', listener);
  document.execCommand('copy');
  document.removeEventListener('copy', listener);
  return true;
};

/**
 * Primary Exporter: Headerless Rich TSV & HTML Clipboard Copy
 * Copies pure data rows directly to clipboard for direct Excel paste (Ctrl+V)
 * with BOLD font on every column data exactly matching the client's reference sheet:
 * DATE | QTY | PART NUMBER | PART NAME | PRICE | SALES | CUSTOMER NAME | PAYMENT | DISCOUNTED | S.I./C.R./D.R. | SERVE BY
 */
export const copySalesToClipboard = async (transactionsItems = []) => {
  if (transactionsItems.length === 0) {
    return { success: false, count: 0, message: 'No sales records to copy' };
  }

  let htmlRows = '';
  const textRows = [];
  const bStyle = 'border: 1px solid #000000; padding: 2px 6px; font-family: Calibri, Arial, sans-serif; font-size: 11pt; font-weight: bold; vertical-align: middle; white-space: nowrap;';

  transactionsItems.forEach((item) => {
    const tx = item.tx || {};
    const isDeduction = (tx.status === 'Refund' || tx.status === 'Return' || tx.status === 'Void');
    let resolvedName = item.product?.name || item.name || 'Unknown Product';
    const variantOpt = item.variant_option || item.variant || item.variant_name || item.variantOption;
    if (variantOpt && !resolvedName.toLowerCase().includes(String(variantOpt).toLowerCase())) {
        resolvedName = `${resolvedName} (${variantOpt})`;
    }
    const resolvedPartNo = item.product?.part_no || item.partNo || '—';
    const qty = Number(item.qty || 1);
    const rawPrice = Number(item.original_price || item.price || 0);
    const unitPrice = rawPrice > 0 ? rawPrice : (Number(tx.amount || 0) / Math.max(1, qty));
    const discountVal = getItemDiscountAmount(item, tx);
    const grossSalesAmount = qty * unitPrice;
    const netSalesAmount = Math.max(0, grossSalesAmount - discountVal);
    const finalSalesAmount = isDeduction ? -netSalesAmount : netSalesAmount;

    const dateVal = formatDate(tx.date || tx.created_at);
    const customerVal = (tx.customer_name || tx.customer?.name || (tx.customer_id ? `Customer #${tx.customer_id}` : 'WALK-IN')).toUpperCase();
    const paymentVal = formatPaymentMethod(tx.payment_method).toUpperCase();
    const isPo = paymentVal === 'P.O';
    const paymentStyle = isPo ? 'color: #C00000;' : 'color: #000000;';

    const siDrVal = tx.si_no || tx.receipt_number || '—';
    const serveByVal = (tx.checker?.name || tx.cashier?.full_name || tx.cashier?.name || 'SYSTEM').toUpperCase();

    const formattedUnitPrice = unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formattedFinalSales = finalSalesAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formattedDiscount = discountVal > 0 ? discountVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

    // 11 Columns matching the client's reference sheet with BOLD on every cell
    htmlRows += `
      <tr style="height: 24px;">
        <td style="${bStyle} text-align: center; mso-number-format:'Short Date';">${escapeHtml(dateVal)}</td>
        <td style="${bStyle} text-align: center; mso-number-format:'0';">${qty}</td>
        <td style="${bStyle} text-align: center; mso-number-format:'General';">${escapeHtml(resolvedPartNo)}</td>
        <td style="${bStyle} text-align: center; mso-number-format:'General';">${escapeHtml(resolvedName)}</td>
        <td style="${bStyle} text-align: right; mso-number-format:'#,##0.00';">${formattedUnitPrice}</td>
        <td style="${bStyle} text-align: right; mso-number-format:'#,##0.00';">${formattedFinalSales}</td>
        <td style="${bStyle} text-align: center; mso-number-format:'General';">${escapeHtml(customerVal)}</td>
        <td style="${bStyle} text-align: center; ${paymentStyle} mso-number-format:'General';">${escapeHtml(paymentVal)}</td>
        <td style="${bStyle} text-align: right; mso-number-format:'#,##0.00';">${formattedDiscount}</td>
        <td style="${bStyle} text-align: center; mso-number-format:'General';">${escapeHtml(siDrVal)}</td>
        <td style="${bStyle} text-align: center; mso-number-format:'General';">${escapeHtml(serveByVal)}</td>
      </tr>`;

    textRows.push([
      dateVal,
      qty,
      resolvedPartNo,
      resolvedName,
      formattedUnitPrice,
      formattedFinalSales,
      customerVal,
      paymentVal,
      formattedDiscount,
      siDrVal,
      serveByVal
    ].join('\t'));
  });

  const tsvData = textRows.join('\r\n');

  try {
    await writeClipboardRichSales(htmlRows, tsvData);
    return {
      success: true,
      count: textRows.length,
      message: `Copied ${textRows.length} ${textRows.length === 1 ? 'row' : 'rows'} to clipboard for Excel!`
    };
  } catch (err) {
    return {
      success: false,
      count: 0,
      message: 'Failed to access clipboard: ' + (err.message || err)
    };
  }
};
