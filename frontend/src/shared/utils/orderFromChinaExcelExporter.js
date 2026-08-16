/**
 * orderFromChinaExcelExporter.js (Rich Clipboard Exporter)
 * Copies pure data rows (WITHOUT headers) to the clipboard with full Excel styling:
 * - Calibri 11pt Font
 * - Thin Black Cell Borders (border: 1px solid #000000)
 * - Exact Column Alignments (Center, Left, Right)
 * - Bold Red PAYMENT text (PAID [Amount] or [Amount] BALANCE)
 * - Exact Number Formatting (#,##0.00)
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

const escapeHtml = (unsafe) => {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const formatExcelDeposit = (depositVal, method, chequeNo) => {
  const amt = Number(depositVal || 0);
  const formattedAmt = amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (!method) return `${formattedAmt} CASH`;
  const m = String(method).trim().toUpperCase();
  if (m === 'GCASH' || m === 'G-CASH') return `${formattedAmt} - G-CASH`;
  if (m === 'BANK' || m === 'BANK TRANSFER') return `${formattedAmt} BANK`;
  if (m === 'CHEQUE' || m === 'CHECK') {
    return chequeNo ? `${formattedAmt} CHEQUE (#${chequeNo})` : `${formattedAmt} CHEQUE`;
  }
  return `${formattedAmt} ${m}`;
};

const writeClipboardRich = async (htmlRows, tsvRows) => {
  const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>table, td, tr { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 11pt; font-weight: bold; }</style></head><body><table style="border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 11pt; font-weight: bold;"><tbody>${htmlRows}</tbody></table></body></html>`;

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

export const copyReservationsToClipboard = async (reservationsList = [], activeTab = 'deposit') => {
  const isCompletedTab = activeTab === 'completed';
  let targetOrders = reservationsList.filter(r => {
    const s = (r.status?.value || r.status || '').toLowerCase();
    return isCompletedTab ? s === 'completed' : s === 'pending';
  });

  if (targetOrders.length === 0) {
    return {
      success: false,
      count: 0,
      message: isCompletedTab ? 'No completed/claimed orders to copy' : 'No deposit orders to copy'
    };
  }

  // Ensure chronological order for appending to Excel:
  // Completed orders: sorted by date_get ASC, then fulfillment time (updated_at) ASC, then id ASC (newest fulfillment at the bottom)
  // Pending orders: sorted by date ASC, then creation time (created_at) ASC, then id ASC (newest order at the bottom)
  targetOrders = [...targetOrders].sort((a, b) => {
    if (isCompletedTab) {
      const dateA = new Date(a.date_get || a.date || a.created_at).getTime();
      const dateB = new Date(b.date_get || b.date || b.created_at).getTime();
      if (dateA !== dateB) return dateA - dateB;
      const updatedA = new Date(a.updated_at || 0).getTime();
      const updatedB = new Date(b.updated_at || 0).getTime();
      if (updatedA !== updatedB) return updatedA - updatedB;
      return (a.id || 0) - (b.id || 0);
    } else {
      const dateA = new Date(a.date || a.created_at).getTime();
      const dateB = new Date(b.date || b.created_at).getTime();
      if (dateA !== dateB) return dateA - dateB;
      const createdA = new Date(a.created_at || 0).getTime();
      const createdB = new Date(b.created_at || 0).getTime();
      if (createdA !== createdB) return createdA - createdB;
      return (a.id || 0) - (b.id || 0);
    }
  });

  let htmlRows = '';
  const textRows = [];
  const bStyle = 'border: 1px solid #000000; padding: 2px 6px; font-family: Calibri, Arial, sans-serif; font-size: 11pt; font-weight: bold; vertical-align: middle; white-space: nowrap;';

  targetOrders.forEach(r => {
    const items = Array.isArray(r.items) && r.items.length > 0
      ? r.items
      : [{ item_name: r.product_name, qty: r.qty || 1, price: r.total }];

    const rowSpanCount = items.length;
    const rowSpanAttr = rowSpanCount > 1 ? ` rowspan="${rowSpanCount}"` : '';

    // Calculate whole order deposit and payment
    const totalOrderAmount = Number(r.total || items.reduce((s, i) => s + (Number(i.price || 0) * Number(i.qty || 1)), 0));
    const depositAmt = Number(r.deposit || 0);
    const balanceAmt = Math.max(0, totalOrderAmount - depositAmt);
    const depositText = formatExcelDeposit(depositAmt, r.payment_method, r.cheque_number);

    let paymentText = '';
    if (isCompletedTab) {
      const paidVal = balanceAmt > 0 ? balanceAmt : totalOrderAmount;
      paymentText = `PAID ${paidVal.toLocaleString('en-US')}`;
    } else {
      paymentText = `${balanceAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BALANCE`;
    }

    const dateGetText = isCompletedTab ? formatDate(r.date_get || r.pickup_date || r.updated_at) : '';

    items.forEach((item, idx) => {
      const dateOrder = formatDate(r.date || r.created_at);
      const rawPNo = item.product?.part_no || item.part_no;
      const partNo = (!rawPNo || String(rawPNo).trim().toUpperCase() === 'N/A' || String(rawPNo).trim() === '' || String(rawPNo).trim() === '—') ? '' : String(rawPNo).trim();
      const description = item.product?.name || item.item_name || item.name || '—';
      const enginePlate = r.engine_plate_number || item.engine_plate_number || '';
      const qtyOrdered = Number(item.qty || 1);
      const custName = (r.customer?.name || r.customer_name || '—').toUpperCase();
      const price = Number(item.price || 0);
      const totalAmount = price * qtyOrdered;

      const formattedPrice = price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const formattedTotal = totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      if (isCompletedTab) {
        // 11 Columns for 'ORDER CLAIMED AND PAID'
        let mergedCellsHtml = '';
        if (idx === 0) {
          mergedCellsHtml = `
            <td${rowSpanAttr} style="${bStyle} text-align: center; vertical-align: middle; mso-number-format:'General';">${escapeHtml(depositText)}</td>
            <td${rowSpanAttr} style="${bStyle} text-align: center; vertical-align: middle; color: #DC2626; mso-number-format:'General';">${escapeHtml(paymentText)}</td>
            <td${rowSpanAttr} style="${bStyle} text-align: center; vertical-align: middle; mso-number-format:'Short Date';">${escapeHtml(dateGetText)}</td>`;
        }

        htmlRows += `
          <tr style="height: 24px;">
            <td style="${bStyle} text-align: center; mso-number-format:'Short Date';">${escapeHtml(dateOrder)}</td>
            <td style="${bStyle} text-align: left; mso-number-format:'General';">${escapeHtml(partNo)}</td>
            <td style="${bStyle} text-align: left; mso-number-format:'General';">${escapeHtml(description)}</td>
            <td style="${bStyle} text-align: center; mso-number-format:'General';">${escapeHtml(enginePlate)}</td>
            <td style="${bStyle} text-align: center; mso-number-format:'0';">${qtyOrdered}</td>
            <td style="${bStyle} text-align: left; mso-number-format:'General';">${escapeHtml(custName)}</td>
            <td style="${bStyle} text-align: right; mso-number-format:'#,##0.00';">${formattedPrice}</td>
            <td style="${bStyle} text-align: right; mso-number-format:'#,##0.00';">${formattedTotal}</td>${mergedCellsHtml}
          </tr>`;

        textRows.push([
          dateOrder,
          partNo,
          description,
          enginePlate,
          qtyOrdered,
          custName,
          formattedPrice,
          formattedTotal,
          idx === 0 ? depositText : '',
          idx === 0 ? paymentText : '',
          idx === 0 ? dateGetText : ''
        ].join('\t'));
      } else {
        // 10 Columns for 'FOR ORDER IN CHINA'
        let mergedCellsHtml = '';
        if (idx === 0) {
          mergedCellsHtml = `
            <td${rowSpanAttr} style="${bStyle} text-align: center; vertical-align: middle; mso-number-format:'General';">${escapeHtml(depositText)}</td>
            <td${rowSpanAttr} style="${bStyle} text-align: center; vertical-align: middle; color: #DC2626; mso-number-format:'General';">${escapeHtml(paymentText)}</td>`;
        }

        htmlRows += `
          <tr style="height: 24px;">
            <td style="${bStyle} text-align: center; mso-number-format:'Short Date';">${escapeHtml(dateOrder)}</td>
            <td style="${bStyle} text-align: left; mso-number-format:'General';">${escapeHtml(partNo)}</td>
            <td style="${bStyle} text-align: left; mso-number-format:'General';">${escapeHtml(description)}</td>
            <td style="${bStyle} text-align: center; mso-number-format:'General';">${escapeHtml(enginePlate)}</td>
            <td style="${bStyle} text-align: center; mso-number-format:'0';">${qtyOrdered}</td>
            <td style="${bStyle} text-align: left; mso-number-format:'General';">${escapeHtml(custName)}</td>
            <td style="${bStyle} text-align: right; mso-number-format:'#,##0.00';">${formattedPrice}</td>
            <td style="${bStyle} text-align: right; mso-number-format:'#,##0.00';">${formattedTotal}</td>${mergedCellsHtml}
          </tr>`;

        textRows.push([
          dateOrder,
          partNo,
          description,
          enginePlate,
          qtyOrdered,
          custName,
          formattedPrice,
          formattedTotal,
          idx === 0 ? depositText : '',
          idx === 0 ? paymentText : ''
        ].join('\t'));
      }
    });
  });

  const tsvData = textRows.join('\r\n');

  try {
    await writeClipboardRich(htmlRows, tsvData);
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
