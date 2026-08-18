import { numberToWordsPesos } from './numberToWords';

/**
 * printReceipt.js
 * Generates exact 1:1 physical booklet style printouts matching the client's BIR receipts.
 * 
 * - printSalesInvoice: Exact replica of the official BIR pre-printed SALES INVOICE booklet.
 * - printCollectionReceipt: Exact replica of the official BIR pre-printed COLLECTION RECEIPT booklet.
 * - printUnifiedReceipt: Master router handling Sales Invoices and Collection Receipts.
 */

/**
 * printSalesInvoice
 * Generates an exact 1:1 physical BIR booklet style Sales Invoice matching the client's template.
 *
 * @param {Object} options
 */
export function printSalesInvoice(options) {
    const {
        invoiceNo = '',
        receiptNo = '',
        siNo = '',
        date = '',
        customer = '',
        customerName = '',
        phone = '',
        buyerTin = '',
        tin = '',
        buyerAddress = '',
        address = '',
        enginePlate = '',
        items = [],
        total = 0,
        amount = 0,
        discountAmount = 0,
        discount = 0,
        payment = '',
        paymentMethod = '',
        tendered = 0,
        servedBy = '',
        businessInfo = {},
        logoUrl = null,
    } = options;

    let cachedBiz = {};
    try {
        const stored = localStorage.getItem('cached_business_info');
        if (stored) cachedBiz = JSON.parse(stored);
    } catch (e) {}

    const bizName = businessInfo?.business_name || cachedBiz?.business_name || 'ZTG HEAVY EQUIPMENT PARTS SUPPLY';
    const bizAddress = businessInfo?.address || cachedBiz?.address || 'Purok 5 Taguibo 8600 City of Butuan, Agusan del Norte, Philippines';
    const bizTin = businessInfo?.tin || cachedBiz?.tin || '382-832-238-00002';
    const taxRate = parseFloat(businessInfo?.tax_rate || cachedBiz?.tax_rate || '12') || 12;
    const taxDivisor = 1 + (taxRate / 100);

    const finalInvoiceNo = invoiceNo || siNo || receiptNo || '—';
    const finalCustomer = customer || customerName || 'Walk-in Customer';
    const finalTin = buyerTin || tin || '—';
    const finalAddress = buyerAddress || address || [phone, enginePlate].filter(Boolean).join(' · ') || '—';
    const finalDate = date || new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' });
    const finalPaymentMethod = (paymentMethod || payment || 'Cash').toUpperCase();
    const finalServedBy = servedBy || options.cashier || options.checker || 'Cashier';

    const numericTotal = Number(total || amount || 0);
    const numericDiscount = Number(discountAmount || discount || 0);
    const grossSales = numericTotal + numericDiscount;

    // Standard Philippine BIR VAT breakdown (Strict 2 decimals)
    const vatableSales = grossSales > 0 ? Number((grossSales / taxDivisor).toFixed(2)) : 0;
    const vatAmount = grossSales > 0 ? Number((grossSales - vatableSales).toFixed(2)) : 0;
    const netAmountDue = Number(numericTotal.toFixed(2));
    const grossSalesFixed = Number(grossSales.toFixed(2));
    const discountFixed = Number(numericDiscount.toFixed(2));

    const fmtPesos = (val) => Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const isCash = finalPaymentMethod.includes('CASH');
    const isCharge = !isCash;

    // 16 rows to match the physical pre-printed booklet height
    let itemsRows = '';
    const itemList = items && items.length > 0 ? items.slice(0, 16) : [];

    for (let i = 0; i < 16; i++) {
        const it = itemList[i];
        if (it) {
            const name = it.name || it.item_name || it.product?.name || 'Item';
            const partNoStr = (it.partNo || it.part_no || it.product?.part_no) ? ` [${it.partNo || it.part_no || it.product?.part_no}]` : '';
            const qty = it.qty || it.quantity || 1;
            const price = Number(it.price || it.retail_price || 0);
            const lineTotal = Number(it.total || (price * qty) || 0);

            itemsRows += `
                <tr style="height: 18px;">
                    <td style="padding: 1px 4px; font-size: 9px; border-bottom: 1px solid #000; border-right: 1px solid #000; text-transform: uppercase; vertical-align: middle;">
                        ${name}${partNoStr}
                    </td>
                    <td style="padding: 1px 4px; font-size: 9px; text-align: center; border-bottom: 1px solid #000; border-right: 1px solid #000; vertical-align: middle;">
                        ${qty}
                    </td>
                    <td style="padding: 1px 4px; font-size: 9px; text-align: right; border-bottom: 1px solid #000; border-right: 1px solid #000; vertical-align: middle; white-space: nowrap;">
                        &#8369;${fmtPesos(price)}
                    </td>
                    <td style="padding: 1px 4px; font-size: 9px; text-align: right; border-bottom: 1px solid #000; font-weight: bold; vertical-align: middle; white-space: nowrap;">
                        &#8369;${fmtPesos(lineTotal)}
                    </td>
                </tr>
            `;
        } else {
            itemsRows += `
                <tr style="height: 18px;">
                    <td style="padding: 1px 4px; border-bottom: 1px solid #000; border-right: 1px solid #000;">&nbsp;</td>
                    <td style="padding: 1px 4px; border-bottom: 1px solid #000; border-right: 1px solid #000;">&nbsp;</td>
                    <td style="padding: 1px 4px; border-bottom: 1px solid #000; border-right: 1px solid #000;">&nbsp;</td>
                    <td style="padding: 1px 4px; border-bottom: 1px solid #000;">&nbsp;</td>
                </tr>
            `;
        }
    }

    const invoiceHtml = `
        <div style="font-family: Arial, Helvetica, sans-serif; width: 620px; margin: 0 auto; padding: 16px 18px; color: #000; background: #FFF; border: 1.5px solid #000; box-sizing: border-box;">

            <!-- TOP HEADER -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <!-- Left: Company Info -->
                <div style="flex: 1;">
                    <div style="font-size: 14px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; color: #000; line-height: 1.2;">
                        ZTG HEAVY EQUIPMENT PARTS SUPPLY
                    </div>
                    <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; margin-top: 2px;">
                        GERALDINE M. MUMAR - PROPRIETOR
                    </div>
                    <div style="font-size: 9.5px; font-weight: 600; margin-top: 1px;">
                        VAT Reg. TIN: ${bizTin}
                    </div>
                    <div style="font-size: 9.5px; margin-top: 1px; color: #111;">
                        Purok 5 Taguibo 8600 City of Butuan
                    </div>
                    <div style="font-size: 9.5px; color: #111;">
                        Agusan del Norte, Philippines
                    </div>
                </div>

                <!-- Right: Document Title -->
                <div style="text-align: right; margin-top: -2px;">
                    <div style="font-size: 10.5px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">SALES</div>
                    <div style="font-size: 18px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; line-height: 1;">INVOICE</div>
                </div>
            </div>

            <!-- SUBHEADER: CHECKBOXES & INVOICE NO / DATE -->
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 6px;">
                <!-- Left: Sales type checkboxes -->
                <div style="display: flex; flex-direction: column; gap: 3px; font-size: 10.5px; font-weight: bold;">
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <span style="display: inline-block; width: 12px; height: 12px; border: 1.5px solid #000; text-align: center; line-height: 11px; font-size: 9px; font-weight: 900;">${isCash ? '&#10003;' : '&nbsp;'}</span>
                        <span>CASH SALES</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <span style="display: inline-block; width: 12px; height: 12px; border: 1.5px solid #000; text-align: center; line-height: 11px; font-size: 9px; font-weight: 900;">${isCharge ? '&#10003;' : '&nbsp;'}</span>
                        <span>CHARGE SALES</span>
                    </div>
                </div>

                <!-- Right: Invoice No. & Date -->
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 3px;">
                    <div style="display: flex; align-items: center;">
                        <span style="font-size: 11px; font-weight: bold; margin-right: 5px;">Invoice No.:</span>
                        <span style="font-size: 16px; font-weight: 900; color: #DC2626; font-family: monospace; letter-spacing: 1px;">
                            ${finalInvoiceNo}
                        </span>
                    </div>
                    <div style="display: flex; align-items: center; border: 1px solid #000; padding: 1px 6px; min-width: 160px;">
                        <span style="font-size: 10.5px; font-weight: bold; margin-right: 5px;">Date:</span>
                        <span style="font-size: 10.5px; font-weight: bold;">${finalDate}</span>
                    </div>
                </div>
            </div>

            <!-- SOLD TO BOX -->
            <div style="border: 1px solid #000; padding: 4px 8px; margin-bottom: 6px; font-size: 10px;">
                <div style="font-weight: 900; margin-bottom: 3px; font-size: 10.5px;">SOLD TO:</div>
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <div style="display: flex; align-items: flex-end;">
                        <span style="font-weight: bold; width: 115px; white-space: nowrap;">Registered Name:</span>
                        <span style="flex: 1; border-bottom: 1px solid #000; font-weight: bold; text-transform: uppercase; padding-left: 4px;">
                            ${finalCustomer}
                        </span>
                    </div>
                    <div style="display: flex; align-items: flex-end;">
                        <span style="font-weight: bold; width: 115px; white-space: nowrap;">TIN :</span>
                        <span style="flex: 1; border-bottom: 1px solid #000; font-weight: bold; padding-left: 4px;">
                            ${finalTin}
                        </span>
                    </div>
                    <div style="display: flex; align-items: flex-end;">
                        <span style="font-weight: bold; width: 115px; white-space: nowrap;">Business Address :</span>
                        <span style="flex: 1; border-bottom: 1px solid #000; padding-left: 4px;">
                            ${finalAddress}
                        </span>
                    </div>
                </div>
            </div>

            <!-- UNIFIED SEAMLESS TABLE (ITEMS + SUMMARY + SIGNATURE) -->
            <table class="receipt-table" style="width: 100%; border-collapse: collapse; border: 1px solid #000; table-layout: fixed; margin-bottom: 4px;">
                <colgroup>
                    <col style="width: 38%;" />
                    <col style="width: 14%;" />
                    <col style="width: 25%;" />
                    <col style="width: 23%;" />
                </colgroup>
                <thead>
                    <tr style="background: transparent; height: 22px;">
                        <th style="font-size: 9px; font-weight: bold; text-align: center; border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 2px 4px;">Item Description/Nature of Service</th>
                        <th style="font-size: 9px; font-weight: bold; text-align: center; border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 2px 4px;">Quantity</th>
                        <th style="font-size: 9px; font-weight: bold; text-align: center; border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 2px 4px;">Unit Cost/Price</th>
                        <th style="font-size: 9px; font-weight: bold; text-align: center; border-bottom: 1px solid #000; padding: 2px 4px;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsRows}

                    <!-- SUMMARY ROW 1 -->
                    <tr style="height: 18px;">
                        <td style="font-size: 9px; font-weight: 500; border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 1px 4px; vertical-align: middle;">VATable Sales</td>
                        <td style="font-size: 9px; font-weight: bold; text-align: right; border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 1px 4px; vertical-align: middle; white-space: nowrap;">&#8369;${fmtPesos(vatableSales)}</td>
                        <td style="font-size: 9px; font-weight: 500; border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 1px 4px; vertical-align: middle;">Total Sales(VAT Inclusive)</td>
                        <td style="font-size: 9px; font-weight: bold; text-align: right; border-bottom: 1px solid #000; padding: 1px 4px; vertical-align: middle; white-space: nowrap;">&#8369;${fmtPesos(grossSalesFixed)}</td>
                    </tr>

                    <!-- SUMMARY ROW 2 -->
                    <tr style="height: 18px;">
                        <td style="font-size: 9px; font-weight: 500; border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 1px 4px; vertical-align: middle;">VAT</td>
                        <td style="font-size: 9px; font-weight: bold; text-align: right; border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 1px 4px; vertical-align: middle; white-space: nowrap;">&#8369;${fmtPesos(vatAmount)}</td>
                        <td style="font-size: 9px; font-weight: 500; border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 1px 4px; vertical-align: middle;">Less: VAT</td>
                        <td style="font-size: 9px; font-weight: bold; text-align: right; border-bottom: 1px solid #000; padding: 1px 4px; vertical-align: middle; white-space: nowrap;">&#8369;${fmtPesos(vatAmount)}</td>
                    </tr>

                    <!-- SUMMARY ROW 3 -->
                    <tr style="height: 18px;">
                        <td style="font-size: 9px; font-weight: 500; border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 1px 4px; vertical-align: middle;">Zero-RATED Sales</td>
                        <td style="font-size: 9px; font-weight: bold; text-align: right; border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 1px 4px; vertical-align: middle; white-space: nowrap;">&#8369;0.00</td>
                        <td style="font-size: 9px; font-weight: 500; border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 1px 4px; vertical-align: middle;">Amount: Net of VAT</td>
                        <td style="font-size: 9px; font-weight: bold; text-align: right; border-bottom: 1px solid #000; padding: 1px 4px; vertical-align: middle; white-space: nowrap;">&#8369;${fmtPesos(vatableSales)}</td>
                    </tr>

                    <!-- SUMMARY ROW 4 -->
                    <tr style="height: 18px;">
                        <td style="font-size: 9px; font-weight: 500; border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 1px 4px; vertical-align: middle;">VAT-Exempt Sales</td>
                        <td style="font-size: 9px; font-weight: bold; text-align: right; border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 1px 4px; vertical-align: middle; white-space: nowrap;">&#8369;0.00</td>
                        <td style="font-size: 9px; font-weight: 500; border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 1px 4px; vertical-align: middle;">Less Discount (SC/PWD/naac/mov/sp)</td>
                        <td style="font-size: 9px; font-weight: bold; text-align: right; border-bottom: 1px solid #000; padding: 1px 4px; vertical-align: middle; white-space: nowrap;">&#8369;${fmtPesos(discountFixed)}</td>
                    </tr>

                    <!-- SUMMARY ROW 5 -->
                    <tr style="height: 18px;">
                        <td colspan="2" style="font-size: 9px; border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 1px 4px; vertical-align: middle;">
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <span style="display: inline-block; width: 10px; height: 10px; border: 1px solid #000; text-align: center; line-height: 9px; font-size: 8px; font-weight: bold;">&#10003;</span>
                                <span style="font-weight: 500;">Received the amount of</span>
                                <span style="font-weight: bold; margin-left: 2px;">&#8369;${fmtPesos(netAmountDue)}</span>
                            </div>
                        </td>
                        <td style="font-size: 9px; font-weight: 500; border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 1px 4px; vertical-align: middle;">Add: vat</td>
                        <td style="font-size: 9px; font-weight: bold; text-align: right; border-bottom: 1px solid #000; padding: 1px 4px; vertical-align: middle; white-space: nowrap;">&#8369;${fmtPesos(vatAmount)}</td>
                    </tr>

                    <!-- SUMMARY ROW 6 -->
                    <tr style="height: 18px;">
                        <td colspan="2" rowspan="2" style="border-right: 1px solid #000; padding: 2px 4px; text-align: center; vertical-align: bottom;">
                            <div style="font-size: 9.5px; font-weight: bold; text-transform: uppercase; margin-bottom: 1px;">${finalServedBy}</div>
                            <div style="border-bottom: 1px solid #000; width: 85%; margin: 0 auto 1px auto;"></div>
                            <div style="font-size: 8px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3px;">Cashier/ Authorized Representative</div>
                        </td>
                        <td style="font-size: 9px; font-weight: 500; border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 1px 4px; vertical-align: middle;">Less: Withholding Tax</td>
                        <td style="font-size: 9px; font-weight: bold; text-align: right; border-bottom: 1px solid #000; padding: 1px 4px; vertical-align: middle; white-space: nowrap;">&#8369;0.00</td>
                    </tr>

                    <!-- SUMMARY ROW 7 (TOTAL AMOUNT DUE) -->
                    <tr style="height: 19px;">
                        <td style="font-size: 9.5px; font-weight: 900; border-right: 1px solid #000; padding: 1px 4px; vertical-align: middle; background: #F9FAFB;">TOTAL AMOUNT DUE</td>
                        <td style="font-size: 10px; font-weight: 900; text-align: right; padding: 1px 4px; vertical-align: middle; white-space: nowrap; background: #F9FAFB;">&#8369;${fmtPesos(netAmountDue)}</td>
                    </tr>
                </tbody>
            </table>

            <!-- SC / PWD BOX AT BOTTOM RIGHT (Aligned with Col 3 + Col 4 = 48%) -->
            <div style="display: flex; justify-content: flex-end; margin-bottom: 5px;">
                <div style="width: 48%; border: 1px solid #000; padding: 3px 6px; font-size: 8px;">
                    <div style="display: flex; align-items: flex-end; margin-bottom: 2px;">
                        <span style="font-weight: 500; margin-right: 4px; white-space: nowrap;">SC/PWD/NAAC/MOV/ Solo Parent ID No</span>
                        <span style="flex: 1; border-bottom: 1px solid #000; height: 9px;"></span>
                    </div>
                    <div style="display: flex; align-items: flex-end;">
                        <span style="font-weight: 500; margin-right: 4px; white-space: nowrap;">SC/PWD/NAAC/MOV/Signature</span>
                        <span style="flex: 1; border-bottom: 1px solid #000; height: 9px;"></span>
                    </div>
                </div>
            </div>

            <!-- BIR / PRINTER ACCREDITATION FOOTER BAR -->
            <div style="border-top: 1px solid #000; padding-top: 4px; display: flex; justify-content: space-between; font-size: 7.5px; line-height: 1.35; color: #111;">
                <div style="flex: 1.2;">
                    <div style="font-weight: bold;">PERMIT TO LOOSE LEAF NO.: __________ &nbsp; DATE ISSUED: __________</div>
                    <div style="font-weight: bold; margin-top: 1px;">LIFEWORKS PRINT HUB TIN: 006-118-234-00001</div>
                    <div>PRINTERS PERMANENT ACCREDITATION NO.103MP20230000000005</div>
                    <div>DATE ISSUED: DECEMBER 18, 2023</div>
                </div>
                <div style="flex: 1; text-align: right;">
                    <div style="font-weight: bold;">BIR AUTHORITY TO PRINT NO.: 103AU20260000004362</div>
                    <div style="font-weight: bold;">DATE ISSUED: April 28, 2026</div>
                    <div style="font-weight: bold;">APPROVED SERIES: 10751-18250 150Bks (2x50)</div>
                </div>
            </div>

        </div>
    `;

    // Render via print-section
    let printStyle = document.getElementById('print-style-si');
    if (!printStyle) {
        printStyle = document.createElement('style');
        printStyle.id = 'print-style-si';
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
            #ztg-print-si, #ztg-print-si * { visibility: visible !important; }
            #ztg-print-si {
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
            #ztg-print-si div,
            #ztg-print-si span,
            #ztg-print-si p,
            #ztg-print-si h3 {
                color: #000 !important;
                border-color: #000 !important;
                font-family: Arial, Helvetica, sans-serif !important;
            }
            #ztg-print-si table.receipt-table {
                width: 100% !important;
                border-collapse: collapse !important;
                table-layout: fixed !important;
                background: transparent !important;
                margin: 0 !important;
            }
            #ztg-print-si table.receipt-table th,
            #ztg-print-si table.receipt-table td {
                border-color: #000 !important;
                color: #000 !important;
                background: transparent !important;
                font-family: Arial, Helvetica, sans-serif !important;
                line-height: 1.2 !important;
            }
            #ztg-print-si table.receipt-table th {
                padding: 2px 4px !important;
                font-size: 9px !important;
                font-weight: bold !important;
                text-align: center !important;
                border-bottom: 1px solid #000 !important;
                background-color: transparent !important;
            }
            #ztg-print-si table.receipt-table td {
                padding: 1px 4px !important;
                font-size: 9px !important;
                background-color: transparent !important;
            }
        }
        @page { size: auto; margin: 0.5cm; }
    `;

    let printDiv = document.getElementById('ztg-print-si');
    if (!printDiv) {
        printDiv = document.createElement('div');
        printDiv.id = 'ztg-print-si';
        document.body.appendChild(printDiv);
    }

    printDiv.innerHTML = invoiceHtml;

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
 * Restored 100% to the exact original physical booklet layout.
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

/**
 * printUnifiedReceipt
 * Primary entry point: Routes dynamically to Sales Invoice or Collection Receipt.
 */
export function printUnifiedReceipt(options) {
    if (options.docType === 'C.R.') {
        return printCollectionReceipt(options);
    }
    // Default standard physical booklet Sales Invoice
    return printSalesInvoice(options);
}
