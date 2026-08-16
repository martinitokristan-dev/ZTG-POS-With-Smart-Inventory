import { numberToWordsPesos } from './numberToWords';

/**
 * printReceipt.js
 * Generates an HTML receipt and triggers the browser print dialog.
 *
 * BIR COMPLIANCE:
 *   businessInfo should be the transaction's frozen business_snapshot for all
 *   historical/reprint cases. For legacy transactions with no snapshot, pass
 *   current live settings as the fallback.
 *
 *   Business Logo is ALWAYS read live from current settings (never frozen),
 *   so pass logoUrl separately — not as part of businessInfo.
 *
 * @param {Object} options
 * @param {string} options.type             'Sales' | 'Refund' | 'Return' | 'Void'
 * @param {string} options.invoiceNo        E.g. 'SI-2026-101'
 * @param {string} options.date             Date string
 * @param {string} options.customer         Customer name
 * @param {string} options.phone            Customer phone
 * @param {string} options.buyerTin         Customer TIN
 * @param {string} options.buyerAddress     Customer address
 * @param {Array}  options.items            Array of item objects
 * @param {number} options.total            Total amount
 * @param {string} options.payment          Payment method
 * @param {number} options.tendered         Amount tendered
 * @param {number} options.change           Change amount
 * @param {string} options.servedBy         Cashier/checker name
 * @param {string} options.docType          Document type ('S.I.', 'D.R.', 'C.R.')
 * @param {string} options.originalInvoice  Original invoice number (refund/return)
 * @param {string} options.reason           Reason (refund/return/void)
 * @param {string} options.approver         Approver name
 * @param {string} options.approvalCode     Approval code
 * @param {string} options.splitDetails     HTML string for split payment breakdown
 * @param {Object} options.businessInfo     Frozen business snapshot or live settings fallback:
 *                                          { business_name, branch_location, address,
 *                                            contact_number, email_address, tax_rate, tin }
 * @param {string} options.logoUrl          ALWAYS current live logo URL (never frozen)
 */
export function printUnifiedReceipt(options) {
    if (options.docType === 'C.R.') {
        return printCollectionReceipt(options);
    }
    const {
        type = 'Sales',
        invoiceNo = '',
        date = '',
        customer = 'Walk-in',
        phone = '',
        buyerTin = '',
        buyerAddress = '',
        items = [],
        total = 0,
        payment = '',
        tendered = 0,
        change = 0,
        servedBy = '',
        docType = 'S.I.',
        originalInvoice = '',
        reason = '',
        approver = '',
        approvalCode = '',
        splitDetails = '',
        businessInfo = {},
        logoUrl = null,
    } = options;

    // Resolve business identity from snapshot (or live-settings fallback).
    let cachedBiz = {};
    try {
        const stored = localStorage.getItem('cached_business_info');
        if (stored) cachedBiz = JSON.parse(stored);
    } catch (e) {
        // Silently ignore JSON parse errors
    }

    const bizName    = businessInfo?.business_name    || cachedBiz?.business_name    || '';
    const bizBranch  = businessInfo?.branch_location  || cachedBiz?.branch_location  || '';
    const bizAddress = businessInfo?.address          || cachedBiz?.address          || '';
    const bizContact = businessInfo?.contact_number   || cachedBiz?.contact_number   || '';
    const bizEmail   = businessInfo?.email_address    || cachedBiz?.email_address    || '';
    const bizTin     = businessInfo?.tin              || cachedBiz?.tin              || '';
    const taxRate    = parseFloat(businessInfo?.tax_rate || cachedBiz?.tax_rate || '12') || 12;
    const taxDivisor = 1 + (taxRate / 100);

    // Type-specific styling
    const typeConfig = {
        Sales: {
            color: '#059669',
            bgLight: '#ECFDF5',
            border: '#6EE7B7',
            label: docType === 'D.R.' ? 'DELIVERY RECEIPT' : docType === 'C.R.' ? 'COLLECTION RECEIPT' : 'SALES INVOICE',
            badge: docType === 'D.R.' ? 'D.R.' : docType === 'C.R.' ? 'C.R.' : 'S.I.',
        },
        Refund: {
            color: '#DC2626',
            bgLight: '#FEF2F2',
            border: '#FCA5A5',
            label: 'REFUND INVOICE',
            badge: 'REFUND',
        },
        Return: {
            color: '#D97706',
            bgLight: '#FFFBEB',
            border: '#FDE68A',
            label: 'RETURN / EXCHANGE INVOICE',
            badge: 'RETURN',
        },
        Void: {
            color: '#7F1D1D',
            bgLight: '#FEF2F2',
            border: '#FECACA',
            label: 'VOID NOTICE',
            badge: 'VOID',
        }
    };
    const cfg = typeConfig[type] || typeConfig['Sales'];

    // Calculate raw subtotal and total discount amount
    const rawSubtotal = items.reduce((sum, item) => {
        const p = Number(item.original_price || item.price || item.retail_price || 0);
        const q = Number(item.qty || item.quantity || 1);
        return sum + (p * q);
    }, 0);

    const txDiscount = Number(options.discountAmount || options.discount_amount || options.discount || 0);
    const itemsDiscount = items.reduce((sum, item) => {
        const d = Number(item.discount || item.item_discount || 0);
        return sum + d;
    }, 0);

    const totalDiscount = txDiscount > 0 ? txDiscount : itemsDiscount;

    const subtotalDisplay = (rawSubtotal > Number(total) && totalDiscount > 0) ? rawSubtotal : (Number(total) + totalDiscount);
    const discountLines = totalDiscount > 0 ? `
        <tr>
            <td style="padding:2px 0;font-size:10px;color:#374151;font-weight:600;">Subtotal:</td>
            <td style="padding:2px 0;font-size:10px;text-align:right;font-weight:600;">&#8369;${subtotalDisplay.toLocaleString(undefined,{minimumFractionDigits:2})}</td>
        </tr>
        <tr>
            <td style="padding:2px 0;font-size:10px;color:#2563EB;font-weight:600;">Discount:</td>
            <td style="padding:2px 0;font-size:10px;text-align:right;color:#2563EB;font-weight:700;">-&#8369;${totalDiscount.toLocaleString(undefined,{minimumFractionDigits:2})}</td>
        </tr>
    ` : '';

    // Items table rows (Cleaned of Chinese Name and Part No)
    const itemsRows = items.map(item => `
        <tr style="border-bottom: 1px dashed #E5E7EB;">
            <td style="padding: 5px 4px; font-size: 11px; line-height: 1.4; font-weight: 600;">
                ${item.name || item.product?.name || '—'}
            </td>
            <td style="padding: 5px 4px; text-align: center; font-size: 11px; width: 28px;">${item.unit || 'pc'}</td>
            <td style="padding: 5px 4px; text-align: center; font-size: 11px; width: 28px;">${item.qty || item.quantity}</td>
            <td style="padding: 5px 4px; text-align: right; font-size: 11px; width: 68px;">&#8369;${Number(item.price || item.retail_price || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            <td style="padding: 5px 4px; text-align: right; font-weight: 700; font-size: 11px; width: 72px;">&#8369;${Number(item.total || ((item.price || item.retail_price || 0) * (item.qty || item.quantity))).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        </tr>
    `).join('');

    // Payment summary lines
    let paymentLines = '';
    if (splitDetails) {
        paymentLines = splitDetails;
    } else {
        const cleanPayment = payment ? String(payment).replace(/\s*\([^)]*\)/g, '').trim() : '—';
        paymentLines += `<tr><td style="padding:3px 0;font-size:11px;color:#374151;">Payment Method:</td><td style="padding:3px 0;font-size:11px;text-align:right;font-weight:600;">${cleanPayment}</td></tr>`;
        if (tendered > 0 && type === 'Sales') {
            paymentLines += `<tr><td style="padding:3px 0;font-size:11px;color:#374151;">Cash Received:</td><td style="padding:3px 0;font-size:11px;text-align:right;">&#8369;${Number(tendered).toLocaleString(undefined, {minimumFractionDigits: 2})}</td></tr>`;
            paymentLines += `<tr><td style="padding:3px 0;font-size:11px;color:#374151;">Change:</td><td style="padding:3px 0;font-size:11px;text-align:right;">&#8369;${Number(change).toLocaleString(undefined, {minimumFractionDigits: 2})}</td></tr>`;
        }
    }

    // Reference block (non-Sales types)
    const refBlock = (type !== 'Sales') ? `
        <tr style="border-top: 1px dashed #ccc;"><td colspan="2" style="padding-top: 8px;"></td></tr>
        <tr><td style="font-size:11px;color:#6B7280;padding:3px 0;">Original Invoice:</td><td style="font-size:11px;font-weight:700;text-align:right;">${originalInvoice || '—'}</td></tr>
        <tr><td style="font-size:11px;color:#6B7280;padding:3px 0;">Reason:</td><td style="font-size:11px;text-align:right;">${reason || '—'}</td></tr>
        <tr><td style="font-size:11px;color:#6B7280;padding:3px 0;">Processed By:</td><td style="font-size:11px;font-weight:600;text-align:right;">${approver || '—'}</td></tr>
        ${approvalCode ? `<tr><td style="font-size:11px;color:#6B7280;padding:3px 0;">Approval Code:</td><td style="font-size:11px;text-align:right;">${approvalCode}</td></tr>` : ''}
    ` : '';

    // Business logo — ALWAYS current live logo (never frozen), shown only when set
    const logoHtml = logoUrl
        ? `<img src="${logoUrl}" alt="${bizName} logo" style="max-width:160px;max-height:60px;object-fit:contain;margin:0 auto 8px auto;display:block;" />`
        : '';

    // Full receipt HTML — all company info from businessInfo (snapshot or live-settings fallback)
    const receiptHtml = `
        <div style="font-family: 'Courier New', Courier, monospace; width: 320px; margin: 0 auto; padding: 20px; color: #111; font-size: 12px; line-height: 1.5;">

            <!-- Company Header — values from frozen business_snapshot (or current settings for legacy) -->
            <div style="text-align: center; margin-bottom: 12px;">
                ${logoHtml}
                <div style="font-size: 16px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;">${bizName || '[Business Name Not Set]'}</div>
                ${bizBranch  ? `<div style="font-size: 10px; color: #374151; margin-top: 2px;">${bizBranch}</div>` : ''}
                ${bizAddress ? `<div style="font-size: 10px; color: #374151;">${bizAddress}</div>` : ''}
                ${bizContact ? `<div style="font-size: 10px; color: #374151;">Tel: ${bizContact}</div>` : ''}
                ${bizEmail   ? `<div style="font-size: 10px; color: #374151;">${bizEmail}</div>` : ''}
                ${bizTin     ? `<div style="font-size: 10px; color: #374151;">TIN: ${bizTin}</div>` : ''}
                <div style="font-size: 10px; color: #374151; margin-top: 2px;">VAT Registered</div>
            </div>

            <!-- Type Badge -->
            <div style="text-align: center; border: 2px solid ${cfg.color}; background: ${cfg.bgLight}; color: ${cfg.color}; padding: 6px 0; margin: 10px 0; font-size: 14px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">
                ${cfg.label}
            </div>

            <!-- Invoice Number & Date -->
            <div style="border: 1px dashed #ccc; padding: 8px; margin-bottom: 10px;">
                <table class="receipt-table" style="width:100%; border-collapse: collapse;">
                    <tr>
                        <td style="font-size:11px; color:#6B7280;">Invoice No.:</td>
                        <td style="font-size:12px; font-weight:900; text-align:right; color:${cfg.color};">${invoiceNo}</td>
                    </tr>
                    <tr>
                        <td style="font-size:11px; color:#6B7280;">Date & Time:</td>
                        <td style="font-size:11px; text-align:right;">${date}</td>
                    </tr>
                    <tr>
                        <td style="font-size:11px; color:#6B7280;">Served By:</td>
                        <td style="font-size:11px; text-align:right; font-weight:600;">${servedBy || '—'}</td>
                    </tr>
                </table>
            </div>

            <!-- Sold To Block -->
            <div style="border: 1px dashed #ccc; padding: 8px; margin-bottom: 10px;">
                <div style="font-size:10px; font-weight:700; text-transform:uppercase; color:#6B7280; margin-bottom:4px;">Sold To / Customer</div>
                <table class="receipt-table" style="width:100%; border-collapse:collapse;">
                    <tr><td style="font-size:10px;color:#6B7280;width:55px;">Name:</td><td style="font-size:11px;font-weight:700;">${customer || 'Walk-in'}</td></tr>
                    <tr><td style="font-size:10px;color:#6B7280;">Address:</td><td style="font-size:11px;">${buyerAddress || '—'}</td></tr>
                    <tr><td style="font-size:10px;color:#6B7280;">TIN:</td><td style="font-size:11px;font-weight:600;">${buyerTin || 'N/A (Walk-in)'}</td></tr>
                    ${phone ? `<tr><td style="font-size:10px;color:#6B7280;">Tel:</td><td style="font-size:11px;">${phone}</td></tr>` : ''}
                </table>
            </div>

            <!-- Items Table -->
            <div style="margin-bottom: 10px;">
                <table class="receipt-table" style="width:100%; border-collapse: collapse; border-top: 2px solid #111; border-bottom: 1px dashed #ccc;">
                    <thead>
                        <tr style="border-bottom: 1px dashed #999;">
                            <th style="padding:5px 4px; text-align:left; font-size:10px; font-weight:700; text-transform:uppercase;">Description</th>
                            <th style="padding:5px 4px; text-align:center; font-size:10px; font-weight:700; width:28px;">Unit</th>
                            <th style="padding:5px 4px; text-align:center; font-size:10px; font-weight:700; width:28px;">Qty</th>
                            <th style="padding:5px 4px; text-align:right; font-size:10px; font-weight:700; width:68px;">Price</th>
                            <th style="padding:5px 4px; text-align:right; font-size:10px; font-weight:700; width:72px;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsRows || '<tr><td colspan="5" style="padding:8px 4px; text-align:center; font-size:11px; color:#6B7280;">No items</td></tr>'}
                    </tbody>
                </table>
            </div>

            <!-- VAT Breakdown + Totals — uses tax_rate from businessInfo snapshot -->
            <div style="margin-bottom: 10px;">
                <table class="receipt-table" style="width:100%; border-collapse: collapse;">
                    ${discountLines}
                    <tr><td style="padding:2px 0;font-size:10px;color:#6B7280;">VATable Sales:</td><td style="padding:2px 0;font-size:10px;text-align:right;color:#6B7280;">&#8369;${(Number(total)/taxDivisor).toLocaleString(undefined,{minimumFractionDigits:2})}</td></tr>
                    <tr><td style="padding:2px 0;font-size:10px;color:#6B7280;">VAT Amount (${taxRate}%):</td><td style="padding:2px 0;font-size:10px;text-align:right;color:#6B7280;">&#8369;${(Number(total)-Number(total)/taxDivisor).toLocaleString(undefined,{minimumFractionDigits:2})}</td></tr>
                    <tr><td style="padding:2px 0;font-size:10px;color:#6B7280;">VAT-Exempt Sales:</td><td style="padding:2px 0;font-size:10px;text-align:right;color:#6B7280;">&#8369;0.00</td></tr>
                    <tr><td style="padding:2px 0;font-size:10px;color:#6B7280;">Zero-Rated Sales:</td><td style="padding:2px 0;font-size:10px;text-align:right;color:#6B7280;">&#8369;0.00</td></tr>
                    <tr style="border-top: 2px solid #111; border-bottom: 2px solid #111;">
                        <td style="padding:5px 0;font-size:13px;font-weight:900;">${type==='Refund'?'TOTAL REFUND:':type==='Return'?'TOTAL RETURN:':type==='Void'?'VOIDED AMOUNT:':'TOTAL AMOUNT DUE:'}</td>
                        <td style="padding:5px 0;font-size:13px;font-weight:900;text-align:right;color:${cfg.color};">&#8369;${Number(total).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                    </tr>
                    ${paymentLines}
                    ${refBlock}
                </table>
            </div>

            <!-- Footer -->
            <div style="text-align: center; border-top: 1px dashed #999; padding-top: 10px; margin-top: 10px;">
                <div style="font-size: 9px; color: #6B7280; line-height: 1.6;">
                    <div style="margin-top: 6px; font-size: 11px; font-style: italic; color: #374151;">Thank you for your business!</div>
                    ${bizName ? `<div style="margin-top: 2px;">— ${bizName} —</div>` : ''}
                </div>
            </div>

        </div>
    `;

    // Render via print-section (same-page approach consistent across all types)
    let printStyle = document.getElementById('print-style-receipt');
    if (!printStyle) {
        printStyle = document.createElement('style');
        printStyle.id = 'print-style-receipt';
        document.head.appendChild(printStyle);
    }
    printStyle.innerHTML = `
        @media print {
            html, body {
                zoom: 1 !important;
                background: #fff !important;
                color: #000 !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                height: auto !important;
                overflow: visible !important;
                font-family: 'Courier New', Courier, monospace !important;
            }
            body * { visibility: hidden !important; }
            #ztg-print-receipt, #ztg-print-receipt * { visibility: visible !important; }
            #ztg-print-receipt {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                background: #fff !important;
                z-index: 999999 !important;
                display: flex !important;
                justify-content: center !important;
                padding: 0 !important;
                margin: 0 !important;
            }
            #ztg-print-receipt table.receipt-table {
                width: 100% !important;
                border-collapse: collapse !important;
                background: transparent !important;
            }
            #ztg-print-receipt th,
            #ztg-print-receipt td {
                background: transparent !important;
                border-color: inherit !important;
                color: #111 !important;
                font-family: 'Courier New', Courier, monospace !important;
            }
            #ztg-print-receipt th {
                padding: 5px 4px !important;
                font-size: 10px !important;
                font-weight: 700 !important;
            }
            #ztg-print-receipt td {
                padding: 3px 0 !important;
                font-size: 11px !important;
            }
            #ztg-print-receipt tbody td {
                padding: 5px 4px !important;
            }
        }
        @page { margin: 0.5cm; }
    `;

    let printDiv = document.getElementById('ztg-print-receipt');
    if (!printDiv) {
        printDiv = document.createElement('div');
        printDiv.id = 'ztg-print-receipt';
        document.body.appendChild(printDiv);
    }

    printDiv.innerHTML = receiptHtml;

    // Small delay to ensure styles and DOM updates are applied before printing
    setTimeout(() => {
        window.print();
        setTimeout(() => {
            printDiv.innerHTML = '';
        }, 1000);
    }, 100);
}

/**
 * printCollectionReceipt
 * Generates a physical BIR booklet style Collection Receipt matching the client's template.
 *
 * @param {Object} options
 */
export function printCollectionReceipt(options) {
    const {
        receiptNo = '',
        invoiceNo = '',
        siNo = '',
        date = '',
        customer = '',
        customerName = '',
        address = '',
        phone = '',
        enginePlate = '',
        items = [],
        total = 0,
        amount = 0,
        balancePaid = 0,
        deposit = 0,
        payment = '',
        paymentMethod = '',
        chequeNumber = '',
        servedBy = '',
        orderNo = '',
        orderRef = '',
        businessInfo = {},
        logoUrl = null,
    } = options;

    const finalReceiptNo = receiptNo || siNo || invoiceNo || '—';
    const finalCustomer = customer || customerName || 'Walk-in Customer';
    const finalAddress = address || [phone, enginePlate].filter(Boolean).join(' · ') || '—';
    const finalDate = date || new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' });
    const finalPaymentMethod = (paymentMethod || payment || 'Cash').toUpperCase();
    const finalChequeNo = chequeNumber || options.cheque_number || '';
    const finalOrderRef = orderNo || orderRef || (options.order_ref ? options.order_ref : '');
    const finalServedBy = servedBy || options.cashier || options.fulfilled_by || 'Staff';

    const numericTotal = Number(total || amount || balancePaid || 0);
    const wordsAmount = numberToWordsPesos(numericTotal);

    // Business identity
    let cachedBiz = {};
    try {
        const stored = localStorage.getItem('cached_business_info');
        if (stored) cachedBiz = JSON.parse(stored);
    } catch (e) {}

    const bizName = businessInfo?.business_name || cachedBiz?.business_name || 'ZTG HEAVY PARTS';
    const bizAddress = businessInfo?.address || cachedBiz?.address || '';
    const bizContact = businessInfo?.contact_number || cachedBiz?.contact_number || '';
    const bizTin = businessInfo?.tin || cachedBiz?.tin || '';

    const isCash = finalPaymentMethod.includes('CASH');
    const isCheck = finalPaymentMethod.includes('CHEQUE') || finalPaymentMethod.includes('CHECK');
    const isOther = !isCash && !isCheck;

    // Exactly 5 rows for the table to match the physical booklet
    let particularsRows = '';
    const itemRows = (items && items.length > 0) ? items.slice(0, 5) : [];
    
    for (let i = 0; i < 5; i++) {
        const it = itemRows[i];
        if (it) {
            const name = it.name || it.item_name || it.product?.name || 'Item';
            const qtyStr = it.qty ? ` (X${it.qty})` : '';
            const amtStr = Number(it.total || (it.price * (it.qty || 1)) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
            particularsRows += `
                <tr style="height: 24px;">
                    <td style="padding: 3px 6px; font-size: 11px; border-bottom: 1px solid #000; border-right: 1px solid #000; text-transform: uppercase; vertical-align: middle;">
                        ${name}${qtyStr}
                    </td>
                    <td style="padding: 3px 6px; font-size: 11px; text-align: right; border-bottom: 1px solid #000; font-weight: bold; vertical-align: middle; white-space: nowrap;">
                        &#8369;${amtStr}
                    </td>
                </tr>
            `;
        } else if (i === 0 && itemRows.length === 0) {
            particularsRows += `
                <tr style="height: 24px;">
                    <td style="padding: 3px 6px; font-size: 11px; border-bottom: 1px solid #000; border-right: 1px solid #000; text-transform: uppercase; vertical-align: middle;">
                        ${finalOrderRef ? `ORDER #${finalOrderRef} SETTLEMENT` : 'PAYMENT / SETTLEMENT'}
                    </td>
                    <td style="padding: 3px 6px; font-size: 11px; text-align: right; border-bottom: 1px solid #000; font-weight: bold; vertical-align: middle; white-space: nowrap;">
                        &#8369;${numericTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                </tr>
            `;
        } else {
            particularsRows += `
                <tr style="height: 24px;">
                    <td style="padding: 3px 6px; border-bottom: 1px solid #000; border-right: 1px solid #000;">&nbsp;</td>
                    <td style="padding: 3px 6px; border-bottom: 1px solid #000;">&nbsp;</td>
                </tr>
            `;
        }
    }

    const receiptHtml = `
        <div style="font-family: Arial, Helvetica, sans-serif; width: 800px; margin: 10px auto; padding: 22px 24px; color: #000; background: #FFF; border: 1.5px solid #000; box-sizing: border-box;">
            
            <!-- Two-Column Booklet Layout -->
            <div style="display: flex; gap: 24px; align-items: stretch;">

                <!-- LEFT COLUMN: Physical Settlement Box with Inner Borders -->
                <div style="width: 280px; border: 1.5px solid #000; box-sizing: border-box; display: flex; flex-direction: column;">
                    
                    <!-- Box Header -->
                    <div style="border-bottom: 1px solid #000; padding: 5px 4px; font-size: 10px; font-weight: bold; text-align: center; letter-spacing: 0.3px; text-transform: uppercase;">
                        IN SETTLEMENT OF THE FOLLOWING:
                    </div>
                    
                    <!-- Particulars & Amount Table -->
                    <table class="receipt-table" style="width: 100%; border-collapse: collapse; table-layout: fixed;">
                        <thead>
                            <tr style="border-bottom: 1px solid #000; height: 22px;">
                                <th style="padding: 3px 6px; font-size: 9.5px; text-align: center; font-weight: bold; text-transform: uppercase; width: 62%; border-right: 1px solid #000;">PARTICULARS</th>
                                <th style="padding: 3px 6px; font-size: 9.5px; text-align: center; font-weight: bold; text-transform: uppercase; width: 38%;">AMOUNT</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${particularsRows}
                            <tr style="height: 22px;">
                                <td style="padding: 3px 6px; font-size: 10px; font-weight: bold; text-align: center; border-bottom: 1px solid #000; border-right: 1px solid #000;">Total Sales:</td>
                                <td style="padding: 3px 6px; font-size: 10.5px; font-weight: bold; text-align: right; border-bottom: 1px solid #000;">&#8369;${numericTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                            <tr style="height: 22px;">
                                <td style="padding: 3px 6px; font-size: 9.5px; font-weight: bold; text-align: center; border-bottom: 1px solid #000; border-right: 1px solid #000;">Less: Withholding Tax:</td>
                                <td style="padding: 3px 6px; font-size: 10px; text-align: right; border-bottom: 1px solid #000;">&#8369;0.00</td>
                            </tr>
                            <tr style="height: 22px;">
                                <td style="padding: 3px 6px; font-size: 10px; font-weight: bold; text-align: center; border-bottom: 1px solid #000; border-right: 1px solid #000;">Total Amount Due:</td>
                                <td style="padding: 3px 6px; font-size: 10.5px; font-weight: bold; text-align: right; border-bottom: 1px solid #000;">&#8369;${numericTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                        </tbody>
                    </table>

                    <!-- Payment In Form Of Section -->
                    <div style="padding: 6px 8px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <div style="font-size: 9.5px; font-weight: bold; text-align: center; margin-bottom: 4px; text-transform: uppercase;">
                                PAYMENT IN FORM OF:
                            </div>
                            <div style="display: flex; justify-content: center; gap: 16px; font-size: 10px; font-weight: bold; margin-bottom: 8px;">
                                <span>(&nbsp;${isCash ? '&#10004;' : '&nbsp;'}&nbsp;) CASH</span>
                                <span>(&nbsp;${isCheck ? '&#10004;' : '&nbsp;'}&nbsp;) CHECK</span>
                            </div>
                        </div>

                        <div style="display: flex; flex-direction: column; gap: 6px; font-size: 10.5px;">
                            <!-- Cash row -->
                            <div style="display: flex; align-items: flex-end;">
                                <span style="font-weight: bold; width: 45px;">Cash</span>
                                <span style="flex: 1; border-bottom: 1px solid #000; text-align: right; font-weight: bold; padding-right: 4px; padding-bottom: 1px;">
                                    ${isCash ? `&#8369;${numericTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '&nbsp;'}
                                </span>
                            </div>

                            <!-- Check row -->
                            <div style="display: flex; align-items: flex-end;">
                                <span style="font-weight: bold; white-space: nowrap;">Check (&nbsp;</span>
                                <span style="min-width: 45px; border-bottom: 1px solid #000; text-align: center; font-size: 9.5px; font-weight: bold; padding-bottom: 1px;">
                                    ${finalChequeNo || '&nbsp;'}
                                </span>
                                <span style="font-weight: bold; margin-right: 4px;">&nbsp;)</span>
                                <span style="flex: 1; border-bottom: 1px solid #000; text-align: right; font-weight: bold; padding-right: 4px; padding-bottom: 1px;">
                                    ${isCheck ? `&#8369;${numericTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '&nbsp;'}
                                </span>
                            </div>

                            <!-- Others row -->
                            <div style="display: flex; align-items: flex-end;">
                                <span style="font-weight: bold; width: 45px;">Others</span>
                                <span style="flex: 1; border-bottom: 1px solid #000; text-align: right; font-weight: bold; padding-right: 4px; padding-bottom: 1px;">
                                    ${isOther ? `&#8369;${numericTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '&nbsp;'}
                                </span>
                            </div>

                            <!-- TOTAL row -->
                            <div style="display: flex; align-items: flex-end;">
                                <span style="font-weight: bold; width: 45px;">TOTAL</span>
                                <span style="flex: 1; border-bottom: 1px solid #000; text-align: right; font-weight: bold; font-size: 11px; padding-right: 4px; padding-bottom: 1px;">
                                    &#8369;${numericTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>

                </div>

                <!-- RIGHT COLUMN: Open Booklet Page -->
                <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 2px 0 0 0;">
                    
                    <div>
                        <!-- Top Header: COLLECTION RECEIPT centered/underlined -->
                        <div style="text-align: center; margin-bottom: 12px;">
                            <span style="font-size: 21px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; text-decoration: underline;">
                                COLLECTION RECEIPT
                            </span>
                        </div>

                        <!-- No. & Date lines aligned right -->
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px; margin-bottom: 20px;">
                            <div style="display: flex; align-items: flex-end; width: 230px;">
                                <span style="font-size: 13px; font-weight: bold; margin-right: 6px;">No.:</span>
                                <span style="flex: 1; border-bottom: 1px solid #000; text-align: center; font-size: 13.5px; font-weight: bold; font-family: Arial, monospace; padding-bottom: 1px;">
                                    ${finalReceiptNo}
                                </span>
                            </div>
                            <div style="display: flex; align-items: flex-end; width: 230px;">
                                <span style="font-size: 13px; font-weight: bold; margin-right: 6px;">Date:</span>
                                <span style="flex: 1; border-bottom: 1px solid #000; text-align: center; font-size: 13px; font-weight: bold; padding-bottom: 1px;">
                                    ${finalDate}
                                </span>
                            </div>
                        </div>

                        <!-- Main Body Fill-in Lines -->
                        <div style="display: flex; flex-direction: column; gap: 14px; font-size: 13px;">
                            
                            <!-- Received from -->
                            <div style="display: flex; align-items: flex-end;">
                                <span style="font-weight: bold; white-space: nowrap; margin-right: 6px;">Received from</span>
                                <span style="flex: 1; border-bottom: 1px solid #000; font-weight: bold; text-transform: uppercase; padding-left: 6px; padding-bottom: 1px;">
                                    ${finalCustomer}
                                </span>
                            </div>

                            <!-- Address at -->
                            <div style="display: flex; align-items: flex-end;">
                                <span style="font-weight: bold; white-space: nowrap; margin-right: 6px;">Address at</span>
                                <span style="flex: 1; border-bottom: 1px solid #000; font-weight: bold; padding-left: 6px; padding-bottom: 1px;">
                                    ${finalAddress}
                                </span>
                            </div>

                            <!-- The sum of -->
                            <div style="display: flex; align-items: flex-end;">
                                <span style="font-weight: bold; white-space: nowrap; margin-right: 6px;">The sum of</span>
                                <span style="flex: 1; border-bottom: 1px solid #000; font-weight: bold; font-size: 11.5px; text-transform: uppercase; padding-left: 6px; padding-bottom: 1px;">
                                    ${wordsAmount}
                                </span>
                            </div>

                            <!-- Pesos ( ₱ Amount ) -->
                            <div style="display: flex; align-items: flex-end; justify-content: flex-end; margin-top: -2px;">
                                <span style="font-weight: bold; margin-right: 4px;">Pesos (&nbsp;&#8369;</span>
                                <span style="border-bottom: 1px solid #000; min-width: 170px; text-align: center; font-weight: 900; font-size: 14px; padding: 0 8px; padding-bottom: 1px;">
                                    ${numericTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                                <span style="font-weight: bold; margin-left: 4px;">&nbsp;)</span>
                            </div>

                            <!-- In partial/full payment for (Clean blank underline matching booklet) -->
                            <div style="display: flex; align-items: flex-end;">
                                <span style="font-weight: bold; white-space: nowrap; margin-right: 6px;">In partial/full payment for</span>
                                <span style="flex: 1; border-bottom: 1px solid #000; padding-bottom: 1px;">&nbsp;</span>
                            </div>

                        </div>
                    </div>

                    <!-- Signatures Block & Disclaimer -->
                    <div style="margin-top: 24px;">
                        <div style="display: flex; flex-direction: column; align-items: flex-end; margin-bottom: 16px;">
                            <div style="width: 220px; text-align: center;">
                                <div style="font-size: 11px; font-weight: bold; margin-bottom: 2px;">Payment Received by:</div>
                                <div style="font-size: 12.5px; font-weight: bold; text-transform: uppercase; margin-bottom: 22px;">
                                    ${finalServedBy}
                                </div>
                                <div style="border-bottom: 1px solid #000; width: 100%; margin-bottom: 4px;"></div>
                                <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
                                    Authorized Signature
                                </div>
                            </div>
                        </div>

                        <!-- BIR Disclaimer Notice -->
                        <div style="text-align: center; font-size: 9.5px; font-weight: bold; letter-spacing: 0.3px;">
                            "THIS DOCUMENT IS NOT VALID FOR CLAIMING INPUT TAXES"
                        </div>
                    </div>

                </div>

            </div>

        </div>
    `;

    // Render via print-section
    let printStyle = document.getElementById('print-style-cr');
    if (!printStyle) {
        printStyle = document.createElement('style');
        printStyle.id = 'print-style-cr';
        document.head.appendChild(printStyle);
    }
    printStyle.innerHTML = `
        @media print {
            html, body {
                zoom: 1 !important;
                background: #fff !important;
                color: #000 !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                height: auto !important;
                overflow: visible !important;
                font-family: Arial, Helvetica, sans-serif !important;
            }
            body * { visibility: hidden !important; }
            #ztg-print-cr, #ztg-print-cr * { visibility: visible !important; }
            #ztg-print-cr {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                background: #fff !important;
                z-index: 999999 !important;
                display: flex !important;
                justify-content: center !important;
                align-items: flex-start !important;
                padding: 0 !important;
                margin: 0 !important;
            }
            #ztg-print-cr div,
            #ztg-print-cr span,
            #ztg-print-cr p,
            #ztg-print-cr h3 {
                color: #000 !important;
                border-color: #000 !important;
                font-family: Arial, Helvetica, sans-serif !important;
            }
            #ztg-print-cr table.receipt-table {
                width: 100% !important;
                border-collapse: collapse !important;
                table-layout: fixed !important;
                background: transparent !important;
                margin: 0 !important;
            }
            #ztg-print-cr table.receipt-table th,
            #ztg-print-cr table.receipt-table td {
                border-color: #000 !important;
                color: #000 !important;
                background: transparent !important;
                font-family: Arial, Helvetica, sans-serif !important;
                line-height: 1.2 !important;
            }
            #ztg-print-cr table.receipt-table th {
                padding: 3px 6px !important;
                font-size: 9.5px !important;
                font-weight: bold !important;
                text-align: center !important;
                border-bottom: 1px solid #000 !important;
                background-color: transparent !important;
            }
            #ztg-print-cr table.receipt-table td {
                padding: 3px 6px !important;
                font-size: 11px !important;
                background-color: transparent !important;
            }
        }
        @page { size: auto; margin: 0.5cm; }
    `;

    let printDiv = document.getElementById('ztg-print-cr');
    if (!printDiv) {
        printDiv = document.createElement('div');
        printDiv.id = 'ztg-print-cr';
        document.body.appendChild(printDiv);
    }

    printDiv.innerHTML = receiptHtml;

    setTimeout(() => {
        window.print();
        setTimeout(() => {
            printDiv.innerHTML = '';
        }, 1000);
    }, 100);
}

