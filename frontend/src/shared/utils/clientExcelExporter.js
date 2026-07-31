/**
 * clientExcelExporter.js
 * Exports sales data matching the client's exact spreadsheet template:
 * - Green Header: DAILY SALES [MONTH YEAR]
 * - 11 Columns: DATE | QTY | PART NUMBER | PART NAME | PRICE | SALES | CUSTOMER NAME | PAYMENT | DISCOUNTED | S.I./C.I./D.R. | SERVE BY
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
  const tx = txInput || item.tx || {};
  
  // 1. Direct item-level discount (per piece * qty)
  const itemDiscVal = Number(item.discount || item.item_discount || 0);
  const qty = Number(item.qty || 1);
  if (itemDiscVal > 0) {
    return itemDiscVal * qty;
  }

  // 2. Order-wide discount from transaction (discount_amount, discount_val, or discount)
  const orderDisc = Number(tx.discount_amount || tx.discount || tx.discount_val || 0);
  if (orderDisc > 0) {
    const txItems = Array.isArray(tx.items) && tx.items.length > 0 ? tx.items : [];
    if (txItems.length <= 1) {
      return orderDisc;
    }
    // Calculate raw subtotal of all items in transaction
    const txRawSubtotal = txItems.reduce((sum, it) => {
      const uPrice = Number(it.original_price || it.price || 0);
      return sum + (Number(it.qty || 1) * uPrice);
    }, 0);
    if (txRawSubtotal > 0) {
      const uPrice = Number(item.original_price || item.price || 0);
      const itemSubtotal = qty * uPrice;
      return (itemSubtotal / txRawSubtotal) * orderDisc;
    }
    return orderDisc / txItems.length;
  }

  return 0;
};

/**
 * Primary Exporter: HTML Excel Spreadsheet (.xls)
 * Opens cleanly in Microsoft Excel matching the client's exact 11-column template.
 */
export const exportSalesToExcel = (transactionsItems = [], options = {}) => {
  const monthYearLabel = getMonthYearLabel(options.startDate, options.endDate);
  const filename = options.filename 
    ? options.filename.replace(/\.xlsx$/i, '.xls')
    : `Daily_Sales_${monthYearLabel.replace(/\s+/g, '_')}.xls`;

  let tableRows = '';

  transactionsItems.forEach((item) => {
    const tx = item.tx || {};
    const isDeduction = (tx.status === 'Refund' || tx.status === 'Return' || tx.status === 'Void');
    // Mirror SalesReportTab: reservation transactions (deposit OR fulfillment) use item.price
    // for the SALES column (the portion actually collected), while PRICE shows original_price.
    const isReservationTx = tx.type === 'reservation';
    const resolvedName = item.product?.name || item.name || 'Unknown Product';
    const resolvedPartNo = item.product?.part_no || item.partNo || 'N/A';
    const qty = Number(item.qty || 1);
    const rawPrice = Number(item.original_price || item.price || 0);
    const unitPrice = rawPrice > 0 ? rawPrice : (Number(tx.amount || 0) / Math.max(1, qty));
    const discountVal = getItemDiscountAmount(item, tx);
    // PRICE column: always full product price (unitPrice)
    // SALES column: for reservations use item.price × qty; for regular sales use unitPrice × qty
    const salesUnitPrice = isReservationTx ? Number(item.price || 0) : unitPrice;
    const grossSalesAmount = qty * salesUnitPrice;
    const netSalesAmount = Math.max(0, grossSalesAmount - discountVal);
    const finalSalesAmount = isDeduction ? -netSalesAmount : netSalesAmount;

    const dateVal = formatDate(tx.date || tx.created_at);
    const customerVal = tx.customer_name || tx.customer?.name || (tx.customer_id ? `Customer #${tx.customer_id}` : 'WALK-IN');
    const paymentVal = formatPaymentMethod(tx.payment_method);
    const isPo = paymentVal === 'P.O';
    const paymentStyle = isPo ? 'color: #C00000; font-weight: bold;' : 'color: #000000;';

    const siDrVal = tx.si_no || tx.receipt_number || '-';
    const serveByVal = tx.checker?.real_name || tx.checker?.name || tx.cashier?.real_name || tx.cashier?.name || 'SYSTEM';

    tableRows += `
      <tr style="height: 24px;">
        <td style="border: 1px solid #000000; text-align: center; mso-number-format:'Short Date'; padding: 4px 8px;">${escapeHtml(dateVal)}</td>
        <td style="border: 1px solid #000000; text-align: center; mso-number-format:'0'; padding: 4px 8px;">${qty}</td>
        <td style="border: 1px solid #000000; text-align: center; font-weight: bold; mso-number-format:'\\@'; padding: 4px 12px;">${escapeHtml(resolvedPartNo)}</td>
        <td style="border: 1px solid #000000; text-align: left; mso-number-format:'\\@'; padding: 4px 12px;">${escapeHtml(resolvedName)}</td>
        <td style="border: 1px solid #000000; text-align: right; mso-number-format:'#,##0.00'; padding: 4px 12px;">${unitPrice.toFixed(2)}</td>
        <td style="border: 1px solid #000000; text-align: right; mso-number-format:'#,##0.00'; padding: 4px 12px;">${finalSalesAmount.toFixed(2)}</td>
        <td style="border: 1px solid #000000; text-align: left; mso-number-format:'\\@'; padding: 4px 12px;">${escapeHtml(customerVal)}</td>
        <td style="border: 1px solid #000000; text-align: center; ${paymentStyle} mso-number-format:'\\@'; padding: 4px 8px;">${escapeHtml(paymentVal)}</td>
        <td style="border: 1px solid #000000; text-align: right; mso-number-format:'#,##0.00'; padding: 4px 8px;">${discountVal > 0 ? discountVal.toFixed(2) : ''}</td>
        <td style="border: 1px solid #000000; text-align: center; mso-number-format:'\\@'; padding: 4px 8px;">${escapeHtml(siDrVal)}</td>
        <td style="border: 1px solid #000000; text-align: center; mso-number-format:'\\@'; padding: 4px 8px;">${escapeHtml(serveByVal)}</td>
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
            <th colspan="11" class="banner">DAILY SALES ${escapeHtml(monthYearLabel)}</th>
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
            <th style="min-width: 110px;">DISCOUNTED</th>
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

  const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Secondary Exporter: Clean CSV with UTF-8 BOM & Exact Client 11 Columns
 */
export const exportSalesToCSV = (transactionsItems = [], options = {}) => {
  const monthYearLabel = getMonthYearLabel(options.startDate, options.endDate);
  const filename = options.filename || `Daily_Sales_${monthYearLabel.replace(/\s+/g, '_')}.csv`;

  const headers = ["DATE", "QTY", "PART NUMBER", "PART NAME", "PRICE", "SALES", "CUSTOMER NAME", "PAYMENT", "DISCOUNTED", "S.I./C.I./D.R.", "SERVE BY"];
  const csvRows = [headers.join(",")];

  transactionsItems.forEach((item) => {
    const tx = item.tx || {};
    const isDeduction = (tx.status === 'Refund' || tx.status === 'Return' || tx.status === 'Void');
    const resolvedName = (item.product?.name || item.name || 'Unknown Product').replace(/"/g, '""');
    const resolvedPartNo = (item.product?.part_no || item.partNo || 'N/A').replace(/"/g, '""');
    const qty = Number(item.qty || 1);
    const unitPrice = Number(item.price || 0);
    const rowSalesAmount = qty * unitPrice;
    const finalSalesAmount = isDeduction ? -rowSalesAmount : rowSalesAmount;
    const discountVal = Number(tx.discount || item.discount || 0);

    const dateVal = formatDate(tx.date || tx.created_at);
    const customerVal = (tx.customer_name || tx.customer?.name || (tx.customer_id ? `Customer #${tx.customer_id}` : 'WALK-IN')).replace(/"/g, '""');
    const paymentVal = formatPaymentMethod(tx.payment_method).replace(/"/g, '""');
    const siDrVal = (tx.si_no || tx.receipt_number || '-').replace(/"/g, '""');
    const serveByVal = (tx.checker?.real_name || tx.checker?.name || tx.cashier?.real_name || tx.cashier?.name || 'SYSTEM').replace(/"/g, '""');

    const row = [
      `"${dateVal}"`,
      qty,
      `"${resolvedPartNo}"`,
      `"${resolvedName}"`,
      unitPrice.toFixed(2),
      finalSalesAmount.toFixed(2),
      `"${customerVal}"`,
      `"${paymentVal}"`,
      discountVal > 0 ? discountVal.toFixed(2) : '""',
      `"${siDrVal}"`,
      `"${serveByVal}"`
    ];
    csvRows.push(row.join(","));
  });

  const csvContent = "\uFEFF" + csvRows.join("\r\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
