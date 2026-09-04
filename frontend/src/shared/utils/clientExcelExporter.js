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

export { calculateItemDiscountBreakdown, getItemDiscountAmount, formatDiscountRate } from './discountCalculator';
import { calculateItemDiscountBreakdown } from './discountCalculator';

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
 * Clipboard Exporter: Headerless Rich TSV & HTML Clipboard Copy
 * Copies pure data rows directly to clipboard for direct Excel paste (Ctrl+V)
 * with BOLD font on every column data exactly matching the client's reference sheet:
 * DATE | QTY | PART NUMBER | PART NAME | PRICE | SALES | CUSTOMER NAME | PAYMENT | DISCOUNT RATE | DISCOUNT | S.I./C.R./D.R. | SERVE BY
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
    const isPartialRefund = tx.is_partial_refund === true;
    const isDeduction = (tx.status === 'Refund' || tx.status === 'Return' || tx.status === 'Void') && !isPartialRefund;
    let resolvedName = item.product?.name || item.name || 'Unknown Product';
    const brandName = item.product?.brand?.name || item.brand?.name || (typeof item.brand === 'string' ? item.brand : null) || (typeof item.product?.brand === 'string' ? item.product?.brand : null) || item.product?.parent?.brand?.name;
    if (brandName && !resolvedName.toLowerCase().includes(`- ${String(brandName).toLowerCase()}`) && !resolvedName.toLowerCase().includes(`[${String(brandName).toLowerCase()}]`)) {
        resolvedName = `${resolvedName} - ${brandName}`;
    }
    const variantOpt = item.variant_option || item.variant || item.variant_name || item.variantOption;
    if (variantOpt && !resolvedName.toLowerCase().includes(String(variantOpt).toLowerCase())) {
        resolvedName = `${resolvedName} (${variantOpt})`;
    }
    const resolvedPartNo = item.product?.part_no || item.partNo || 'N/A';
    const qty = Number(item.displayQty ?? item.qty ?? 1);
    const breakdown = calculateItemDiscountBreakdown(item, tx);
    const unitPrice = breakdown.unitPrice;
    const discountVal = breakdown.totalDiscount;
    const formattedRate = breakdown.formattedRate !== '—' ? breakdown.formattedRate : '';
    const netSalesAmount = breakdown.discountedPrice;
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

    // 12 Columns matching the client's reference format with BOLD on every cell
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
        <td style="${bStyle} text-align: center; mso-number-format:'General';">${formattedRate}</td>
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
      formattedRate,
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

/**
 * File Exporter: HTML Excel Spreadsheet (.xls / .xlsx)
 * Opens cleanly in Microsoft Excel matching the client's exact 11-column template with green banner header.
 */
export const exportSalesToExcel = (transactionsItems = [], options = {}) => {
  if (transactionsItems.length === 0) {
    return { success: false, count: 0, message: 'No sales records to export' };
  }

  const monthYearLabel = getMonthYearLabel(options.startDate, options.endDate);
  const filename = options.filename 
    ? options.filename.replace(/\.xlsx$/i, '.xls')
    : `Daily_Sales_${monthYearLabel.replace(/\s+/g, '_')}.xls`;

  let tableRows = '';
  const cellStyle = 'border: 1px solid #000000; padding: 4px 8px; font-family: Calibri, Segoe UI, sans-serif; font-size: 10pt; font-weight: bold; vertical-align: middle;';

  transactionsItems.forEach((item) => {
    const tx = item.tx || {};
    const isPartialRefund = tx.is_partial_refund === true;
    const isDeduction = (tx.status === 'Refund' || tx.status === 'Return' || tx.status === 'Void') && !isPartialRefund;
    let resolvedName = item.product?.name || item.name || 'Unknown Product';
    const brandName = item.product?.brand?.name || item.brand?.name || (typeof item.brand === 'string' ? item.brand : null) || (typeof item.product?.brand === 'string' ? item.product?.brand : null) || item.product?.parent?.brand?.name;
    if (brandName && !resolvedName.toLowerCase().includes(`- ${String(brandName).toLowerCase()}`) && !resolvedName.toLowerCase().includes(`[${String(brandName).toLowerCase()}]`)) {
        resolvedName = `${resolvedName} - ${brandName}`;
    }
    const variantOpt = item.variant_option || item.variant || item.variant_name || item.variantOption;
    if (variantOpt && !resolvedName.toLowerCase().includes(String(variantOpt).toLowerCase())) {
        resolvedName = `${resolvedName} (${variantOpt})`;
    }
    const resolvedPartNo = item.product?.part_no || item.partNo || 'N/A';
    const qty = Number(item.displayQty ?? item.qty ?? 1);
    const breakdown = calculateItemDiscountBreakdown(item, tx);
    const unitPrice = breakdown.unitPrice;
    const discountVal = breakdown.totalDiscount;
    const formattedRate = breakdown.formattedRate !== '—' ? breakdown.formattedRate : '';
    const netSalesAmount = breakdown.discountedPrice;
    const finalSalesAmount = isDeduction ? -netSalesAmount : netSalesAmount;

    const dateVal = formatDate(tx.date || tx.created_at);
    const customerVal = (tx.customer_name || tx.customer?.name || (tx.customer_id ? `Customer #${tx.customer_id}` : 'WALK-IN')).toUpperCase();
    const paymentVal = formatPaymentMethod(tx.payment_method).toUpperCase();
    const isPo = paymentVal === 'P.O';
    const paymentStyle = isPo ? 'color: #C00000; font-weight: bold;' : 'color: #000000; font-weight: bold;';

    const siDrVal = tx.si_no || tx.receipt_number || '—';
    const serveByVal = (tx.checker?.name || tx.cashier?.full_name || tx.cashier?.name || 'SYSTEM').toUpperCase();

    tableRows += `
      <tr style="height: 24px;">
        <td style="${cellStyle} text-align: center; mso-number-format:'Short Date';">${escapeHtml(dateVal)}</td>
        <td style="${cellStyle} text-align: center; mso-number-format:'0';">${qty}</td>
        <td style="${cellStyle} text-align: center; mso-number-format:'\\@';">${escapeHtml(resolvedPartNo)}</td>
        <td style="${cellStyle} text-align: left; mso-number-format:'\\@';">${escapeHtml(resolvedName)}</td>
        <td style="${cellStyle} text-align: right; mso-number-format:'#,##0.00';">${unitPrice.toFixed(2)}</td>
        <td style="${cellStyle} text-align: right; mso-number-format:'#,##0.00';">${finalSalesAmount.toFixed(2)}</td>
        <td style="${cellStyle} text-align: left; mso-number-format:'\\@';">${escapeHtml(customerVal)}</td>
        <td style="${cellStyle} text-align: center; ${paymentStyle} mso-number-format:'\\@';">${escapeHtml(paymentVal)}</td>
        <td style="${cellStyle} text-align: center; mso-number-format:'\\@';">${formattedRate}</td>
        <td style="${cellStyle} text-align: right; mso-number-format:'#,##0.00';">${discountVal > 0 ? discountVal.toFixed(2) : ''}</td>
        <td style="${cellStyle} text-align: center; mso-number-format:'\\@';">${escapeHtml(siDrVal)}</td>
        <td style="${cellStyle} text-align: center; mso-number-format:'\\@';">${escapeHtml(serveByVal)}</td>
      </tr>`;
  });

  const htmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>${escapeHtml(monthYearLabel)}</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body { font-family: 'Segoe UI', Calibri, sans-serif; font-size: 10pt; }
        table { border-collapse: collapse; table-layout: auto; }
        th { background-color: #E2EFDA; color: #000000; font-weight: bold; text-align: center; border: 1px solid #000000; height: 28px; padding: 4px 10px; font-size: 10pt; }
        .banner { background-color: #006100; color: #FFFFFF; font-size: 16pt; font-weight: bold; text-align: center; height: 42px; border: 1px solid #000000; }
      </style>
    </head>
    <body>
      <table>
        <thead>
          <tr>
            <th colspan="12" class="banner">DAILY SALES ${escapeHtml(monthYearLabel)}</th>
          </tr>
          <tr>
            <th style="min-width: 90px;">DATE</th>
            <th style="min-width: 50px;">QTY</th>
            <th style="min-width: 220px;">PART NUMBER</th>
            <th style="min-width: 340px;">PART NAME</th>
            <th style="min-width: 100px;">PRICE</th>
            <th style="min-width: 110px;">SALES</th>
            <th style="min-width: 180px;">CUSTOMER NAME</th>
            <th style="min-width: 90px;">PAYMENT</th>
            <th style="min-width: 90px;">DISCOUNT %</th>
            <th style="min-width: 100px;">DISCOUNT</th>
            <th style="min-width: 110px;">S.I./C.I./D.R.</th>
            <th style="min-width: 100px;">SERVE BY</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </body>
    </html>
  `;

  try {
    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return {
      success: true,
      count: transactionsItems.length,
      filename,
      message: `Downloaded ${filename} successfully!`
    };
  } catch (err) {
    return {
      success: false,
      count: 0,
      message: 'Failed to export file: ' + (err.message || err)
    };
  }
};
