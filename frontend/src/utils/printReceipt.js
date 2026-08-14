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
                <table style="width:100%; border-collapse: collapse;">
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
                <table style="width:100%; border-collapse:collapse;">
                    <tr><td style="font-size:10px;color:#6B7280;width:55px;">Name:</td><td style="font-size:11px;font-weight:700;">${customer || 'Walk-in'}</td></tr>
                    <tr><td style="font-size:10px;color:#6B7280;">Address:</td><td style="font-size:11px;">${buyerAddress || '—'}</td></tr>
                    <tr><td style="font-size:10px;color:#6B7280;">TIN:</td><td style="font-size:11px;font-weight:600;">${buyerTin || 'N/A (Walk-in)'}</td></tr>
                    ${phone ? `<tr><td style="font-size:10px;color:#6B7280;">Tel:</td><td style="font-size:11px;">${phone}</td></tr>` : ''}
                </table>
            </div>

            <!-- Items Table -->
            <div style="margin-bottom: 10px;">
                <table style="width:100%; border-collapse: collapse; border-top: 2px solid #111; border-bottom: 1px dashed #ccc;">
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
                <table style="width:100%; border-collapse: collapse;">
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
        printStyle.innerHTML = `
            @media print {
                body * { visibility: hidden !important; }
                #ztg-print-receipt, #ztg-print-receipt * { visibility: visible !important; }
                #ztg-print-receipt {
                    position: absolute; left: 0; top: 0; width: 100%;
                    background: #fff; z-index: 999999; display: flex;
                    justify-content: center; padding: 0; margin: 0;
                }
            }
            @page { margin: 0.5cm; }
        `;
        document.head.appendChild(printStyle);
    }

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
