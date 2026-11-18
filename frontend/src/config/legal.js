/**
 * Privacy Policy and Terms and Conditions of the ZTG POS and Smart Inventory System.
 *
 * Shown once on the first sign-in of every account (TermsGate: Privacy Policy first, then the
 * Terms and Conditions, each read to the end before continuing) and read-only in
 * Settings > Privacy and Terms. Every statement here was checked against the actual
 * behavior of the System; update the text when that behavior changes.
 *
 * TERMS_VERSION must match LegalConstants::TERMS_VERSION in the backend.
 *
 * Block types used in sections:
 *   { type: 'p', text }
 *   { type: 'list', items: [string | { label, text }] }
 *   { type: 'quote', cite, text }
 *   { type: 'table', head: [string], rows: [[string]] }
 */

export const TERMS_VERSION = '1.0';
export const LEGAL_LAST_UPDATED = 'November 15, 2026';
export const LEGAL_BUSINESS_NAME = 'ZTG Heavy Equipment Parts';
export const LEGAL_DEVELOPER_NAME = 'MARCITANDO';

const B = LEGAL_BUSINESS_NAME;
const D = LEGAL_DEVELOPER_NAME;

const privacy = {
    id: 'privacy',
    title: 'Privacy Policy',
    sections: [
        {
            id: 'introduction',
            title: 'Introduction',
            blocks: [
                { type: 'p', text: `${B} (\u201Cthe Company\u201D, \u201Cwe\u201D, \u201Cus\u201D) is the personal information controller for the ZTG Point of Sale and Smart Inventory System (\u201Cthe System\u201D).` },
                { type: 'p', text: `The System was developed by ${D} (\u201Cthe Developers\u201D) for the exclusive use of the Company. The Company uses it under a Memorandum of Agreement with the Developers. The System is not offered to the public or to any other business. Only the Owner of the Company and the personnel the Owner authorizes may access it.` },
                { type: 'p', text: 'This Policy states:' },
                { type: 'list', items: [
                    'what personal information the System holds;',
                    'why it is processed;',
                    'who may access it;',
                    'how long it is kept; and',
                    'the rights of the persons concerned.',
                ] },
                { type: 'p', text: 'It applies to all authorized users of the System. It also applies to customers whose transactions are recorded in it.' },
            ],
        },
        {
            id: 'data-privacy-act',
            title: 'Data Privacy Act of 2012',
            blocks: [
                { type: 'quote', cite: 'Republic Act No. 10173, Section 11', text: '\u201CThe processing of personal information shall be allowed, subject to compliance with the requirements of this Act and other laws allowing disclosure of information to the public and adherence to the principles of transparency, legitimate purpose and proportionality.\u201D' },
                { type: 'p', text: 'Under Section 12 of the Act, we process personal information on these grounds:' },
                { type: 'list', items: [
                    'to fulfill our employment relationship with staff and our sales and reservation agreements with customers;',
                    'to comply with legal obligations, including tax and invoicing requirements; and',
                    'to pursue legitimate business interests, such as preventing fraud and protecting the System.',
                ] },
            ],
        },
        {
            id: 'information-we-collect',
            title: 'Personal Information We Collect',
            blocks: [
                { type: 'list', items: [
                    { label: 'Staff accounts', text: 'full name, username, email address, mobile number, profile photo, assigned role and permissions, and account status. Passwords and approval PINs are stored only in hashed form, so no one can read them, including administrators.' },
                    { label: 'Customers', text: 'name; mobile number, which is optional for sales and required for reservations; for reservations, the email address, vehicle engine or plate number, and notes; and, where the customer provides them, the address and Taxpayer Identification Number.' },
                    { label: 'Transactions', text: 'items, quantities, prices and discounts applied; payment method, with the cheque number, bank and date where applicable; document number; the cashier, checker and approver involved; and the stated reason for any refund, return or void.' },
                    { label: 'System and security records', text: 'sign-in and sign-out times, failed sign-in and PIN attempts, IP address, browser and device type, and the actions performed in each module.' },
                ] },
            ],
        },
        {
            id: 'purposes',
            title: 'Purposes of Processing',
            blocks: [
                { type: 'p', text: 'Personal information is processed only to:' },
                { type: 'list', items: [
                    'record sales and issue Sales Invoices (S.I.), Delivery Receipts (D.R.) and Collection Receipts (C.R.);',
                    'manage products, prices, stock levels, product imports and reservations;',
                    'verify the identity of users and authorize sensitive transactions;',
                    'prepare sales, inventory and performance reports;',
                    'detect, investigate and prevent errors, fraud and unauthorized access; and',
                    'comply with tax, invoicing and other legal requirements.',
                ] },
                { type: 'p', text: 'Personal information is not used for marketing or profiling. The System makes no automated decisions that affect individuals.' },
            ],
        },
        {
            id: 'scope',
            title: 'Scope and Method of Processing',
            blocks: [
                { type: 'list', items: [
                    'The System has no public registration. User accounts are created only by the Owner or by an administrator the Owner authorizes.',
                    'Customer information is entered by staff during a sale or reservation.',
                    'All processing is done electronically within the System.',
                    'Each user can access only the modules their role allows. The roles are Administrator, Supervisor, Cashier, Technical Operations, and any custom role the Company sets up.',
                ] },
            ],
        },
        {
            id: 'recipients',
            title: 'Recipients and Service Providers',
            blocks: [
                { type: 'p', text: 'Within the Company, personal information is available only to the Owner and to authorized personnel, according to their role.' },
                { type: 'p', text: `The Developers (${D}) hold the Technical Operations role. They access the System only to maintain, support and configure it on behalf of the Company. For this purpose, they act as a personal information processor under Section 14 of the Act. They must keep all records confidential and may not use them for any other purpose.` },
                { type: 'p', text: 'We use the following service providers to operate the System. They process information only on our behalf:' },
                { type: 'table', head: ['Provider', 'Purpose'], rows: [
                    ['Render', 'Application server'],
                    ['TiDB Cloud', 'Database'],
                    ['Cloudflare Pages', 'Web interface'],
                    ['Cloudinary', 'Storage of profile photos, logos and product images'],
                    ['Brevo', 'Account setup and password reset emails'],
                    ['Pusher', 'Real-time screen updates'],
                ] },
                { type: 'p', text: 'We may also disclose information to government authorities, such as the Bureau of Internal Revenue, when the law requires it. We do not sell, rent or trade personal information.' },
            ],
        },
        {
            id: 'outside-philippines',
            title: 'Storage Outside the Philippines',
            blocks: [
                { type: 'p', text: 'Some of our service providers keep their servers outside the Philippines. Under Section 21 of the Act, the Company remains accountable for this information. We require these providers to give it a comparable level of protection.' },
            ],
        },
        {
            id: 'security',
            title: 'Security Measures',
            blocks: [
                { type: 'p', text: 'Under Section 20 of the Act, the Company has put the following measures in place:' },
                { type: 'list', items: [
                    'All connections to the System are encrypted through HTTPS.',
                    'Passwords and approval PINs are stored in hashed form.',
                    'Access to modules and actions is limited by role-based permissions.',
                    'After five failed sign-in attempts, the account is locked for 60 seconds and administrators are notified.',
                    'After five failed approval PIN attempts, PIN entry is locked for 60 seconds and administrators are notified.',
                    'Sign-in sessions expire after 24 hours and end when the browser tab is closed. Administrators may also end any active session.',
                    'New accounts are activated only through an emailed setup link, valid for 48 hours. Password reset links are valid for 60 minutes.',
                    'Activity and security logs cannot be edited or deleted through the System.',
                ] },
                { type: 'p', text: 'Everyone who handles personal information in the System must keep it confidential. This duty continues after their employment or engagement ends.' },
            ],
        },
        {
            id: 'retention',
            title: 'Retention Period',
            blocks: [
                { type: 'list', items: [
                    { label: 'Transaction, invoice and related customer records', text: 'are kept for the period required by the National Internal Revenue Code and BIR regulations, and for as long as needed to establish or defend legal claims.' },
                    { label: 'Staff accounts', text: 'are deactivated, not deleted, when a person leaves the Company. Transactions recorded under the account stay on file for audit.' },
                    { label: 'Activity and security logs', text: 'are kept for audit and security purposes.' },
                    { label: 'Sign-in sessions and links', text: 'sessions expire after 24 hours, setup links after 48 hours and password reset links after 60 minutes.' },
                    { label: 'Uploaded product import files', text: 'are removed once they are no longer needed.' },
                ] },
                { type: 'p', text: 'Records that are no longer required are securely deleted by authorized personnel.' },
            ],
        },
        {
            id: 'browser-storage',
            title: 'Browser Storage',
            blocks: [
                { type: 'p', text: 'The System uses your browser\u2019s session storage to keep you signed in while the tab is open. It uses local storage to remember display preferences, such as the color theme and the business name and logo on the sign-in page. The System does not use advertising cookies, analytics tools or third-party tracking.' },
            ],
        },
        {
            id: 'rights',
            title: 'Your Rights',
            blocks: [
                { type: 'p', text: 'Under Sections 16 and 18 of the Act, you have the right to:' },
                { type: 'list', items: [
                    'be informed whether and how your personal information is processed;',
                    'have reasonable access to your personal information;',
                    'dispute and correct inaccurate or incomplete information;',
                    'suspend, withdraw, block or remove your personal information, under the conditions set by law;',
                    'obtain a copy of your information in a structured electronic format;',
                    'be indemnified for damages caused by inaccurate or unauthorized use of your information; and',
                    'file a complaint with the National Privacy Commission.',
                ] },
                { type: 'p', text: 'Some requests may be limited where the law requires a record to be kept, such as tax and invoice records.' },
            ],
        },
        {
            id: 'breach',
            title: 'Personal Data Breach',
            blocks: [
                { type: 'p', text: 'If personal information is believed to have been acquired by an unauthorized person, and this creates a real risk of serious harm, the Company will promptly notify the National Privacy Commission and the affected persons, as required by Section 20(f) of the Act.' },
            ],
        },
        {
            id: 'contact',
            title: 'Accountable Person and Contact',
            blocks: [
                { type: 'p', text: `The Owner of ${B} is accountable for the Company\u2019s compliance with the Data Privacy Act of 2012, as provided in Section 21(b) of the Act.` },
                { type: 'p', text: 'Questions, requests and complaints about personal information may be addressed to the Owner or to the System Administrator of the Company. Technical concerns about the System may be referred to Technical Operations.' },
            ],
        },
        {
            id: 'changes',
            title: 'Changes to this Policy',
            blocks: [
                { type: 'p', text: 'The Company may update this Policy to reflect changes in the System or in the law. Users will be notified before any change takes effect. The version number and the date of the last update at the top of this Policy show the latest revision.' },
            ],
        },
    ],
};

const terms = {
    id: 'terms',
    title: 'Terms and Conditions',
    sections: [
        {
            id: 'acceptance',
            title: 'Acceptance of Terms and Exclusive Use',
            blocks: [
                { type: 'p', text: `These Terms and Conditions govern the use of the ZTG Point of Sale and Smart Inventory System (\u201Cthe System\u201D) by ${B} (\u201Cthe Company\u201D).` },
                { type: 'p', text: 'The System was developed exclusively for the Company. It is not offered to the public or to any other business. Access is limited to the Owner and to the personnel the Owner authorizes.' },
                { type: 'p', text: 'By accepting these Terms, you confirm that you have read, understood and agreed to them and to the Company\u2019s Privacy Policy. If you do not agree, do not use the System, and inform your administrator.' },
            ],
        },
        {
            id: 'definitions',
            title: 'Definitions',
            blocks: [
                { type: 'list', items: [
                    { label: 'Owner', text: `the owner of ${B}, who has final authority over the users and records of the System.` },
                    { label: 'Company', text: `${B}, the only business authorized to use the System.` },
                    { label: 'Developers', text: `${D}, the team that developed and maintains the System.` },
                    { label: 'Technical Operations', text: 'the role held by the Developers for maintaining, supporting and configuring the System.' },
                    { label: 'User', text: 'any employee or authorized person with a System account.' },
                    { label: 'Approver', text: 'an active user with the Administrator or Supervisor role.' },
                    { label: 'Document', text: 'a Sales Invoice (S.I.), Delivery Receipt (D.R.) or Collection Receipt (C.R.) recorded in the System.' },
                    { label: 'P.O. (Pending)', text: 'a sale whose payment is collected at a later date.' },
                ] },
            ],
        },
        {
            id: 'ownership',
            title: 'Ownership of the System and Term of Use',
            blocks: [
                { type: 'list', items: [
                    { label: 'The software', text: 'the program, design and source code of the System belong to the Developers.' },
                    { label: 'The records', text: 'all records entered in the System belong to the Company. This includes products, prices, stock, sales, documents, reservations, and customer and staff information.' },
                    { label: 'Term of use', text: 'the Company may use the System for one (1) year from the effective date stated in the Memorandum of Agreement between the Company and the Developers.' },
                    { label: 'After the first year', text: 'continued use is subject to a separate agreement between the Company and the Developers.' },
                    { label: 'End of the agreement', text: 'if the agreement expires or is ended, the Developers will give the Company a copy of its records in a commonly used electronic format, upon the Company\u2019s request.' },
                    { label: 'Limits', text: 'no user may copy, modify, resell or distribute the System, or give any other business access to it.' },
                ] },
            ],
        },
        {
            id: 'accounts',
            title: 'User Accounts',
            blocks: [
                { type: 'list', items: [
                    'The System has no public registration. Accounts may be created only by the Owner or by an administrator the Owner authorizes.',
                    'Accounts are given only to employees and other persons working for the Company. The only exception is the Technical Operations account, which is held by the Developers.',
                    'A new account is activated only when the user sets a password through the setup link sent to their email. The link is valid for 48 hours.',
                    'Each account is for one person only.',
                    'Users must keep their profile information accurate and up to date.',
                ] },
            ],
        },
        {
            id: 'account-security',
            title: 'Account Security',
            blocks: [
                { type: 'list', items: [
                    'Passwords must have at least six characters, including at least one uppercase letter and one symbol.',
                    'Do not share your password or approval PIN. Do not allow another person to use your account.',
                    'You are accountable for every action recorded under your account.',
                    'Sign out or close the browser tab before leaving your workstation.',
                    'Report a lost password or any suspected unauthorized access to an administrator immediately.',
                ] },
            ],
        },
        {
            id: 'roles',
            title: 'Roles and Permissions',
            blocks: [
                { type: 'p', text: 'Each user may access only the modules and actions permitted by their assigned role. Any attempt to access functions beyond your role is prohibited.' },
                { type: 'p', text: 'Settings that affect official invoice numbering may be changed only by Technical Operations. This includes switching between manual and system-generated numbering, which Technical Operations does only upon the instruction of the Company.' },
            ],
        },
        {
            id: 'approvals',
            title: 'Approval of Sensitive Transactions',
            blocks: [
                { type: 'list', items: [
                    { label: 'What needs approval', text: 'refunds, returns, voids, payment of P.O. (Pending) sales, cancellation of P.O. sales and restocking.' },
                    { label: 'Who approves', text: 'an Approver, by personally entering their own PIN or password.' },
                    { label: 'Approver responsibility', text: 'an Approver must never disclose their PIN. By approving, the Approver confirms that the transaction has been checked and is valid.' },
                    { label: 'Failed attempts', text: 'every failed approval attempt is recorded as a security alert. Five failed attempts lock PIN entry for 60 seconds, and administrators are notified.' },
                    { label: 'Void limit', text: 'voids are subject to a daily limit per cashier, set by the Company in the System settings.' },
                ] },
            ],
        },
        {
            id: 'sales-documents',
            title: 'Recording of Sales and Documents',
            blocks: [
                { type: 'list', items: [
                    'Every sale must be recorded in the System at the time of the transaction, using the correct document type.',
                    'When manual numbering is in use, enter the number printed on the BIR-registered booklet, in proper sequence. The System rejects a number that has already been used for the same document type.',
                    'System-generated numbering may be enabled only by Technical Operations, after the Company has obtained the required BIR authorization.',
                    'Errors in a completed sale must be corrected through an approved void, refund or return. Do not encode the same sale again.',
                ] },
            ],
        },
        {
            id: 'prices-discounts',
            title: 'Prices and Discounts',
            blocks: [
                { type: 'list', items: [
                    'Items must be sold at the prices recorded in the System. An item without a recorded price cannot be sold.',
                    'P.O. (Pending) sales use the P.O. price of the item.',
                    'Senior Citizen and PWD discounts may be granted only when the customer presents a valid identification card, as required by the Expanded Senior Citizens Act and the Magna Carta for Persons with Disability.',
                    'All other discounts must be authorized by management. Every discount is recorded and reported.',
                ] },
            ],
        },
        {
            id: 'payments',
            title: 'Payments',
            blocks: [
                { type: 'p', text: 'The System records the method of payment. It does not receive, hold or transfer money. The accepted methods are Cash, GCash, Bank Transfer, Cheque and P.O. (Pending). Before completing a sale, the user must check:' },
                { type: 'list', items: [
                    'the amount received;',
                    'the payment reference; and',
                    'for cheques, the cheque number, bank and date.',
                ] },
            ],
        },
        {
            id: 'reservations',
            title: 'Reservations and Deposits',
            blocks: [
                { type: 'list', items: [
                    { label: 'What to record', text: 'the customer\u2019s name and mobile number, the reserved items, the pickup date and the deposit received. The deposit is either 50 percent or the full amount.' },
                    { label: 'Expiry', text: 'a reservation not claimed within the grace period after its pickup date is marked Expired by the System. The grace period is set in the System settings.' },
                    { label: 'Deposit', text: 'the deposit on an expired reservation is forfeited or refunded, according to the deposit policy set in the System settings.' },
                    { label: 'Customer notice', text: 'users must inform the customer of this policy when the reservation is made.' },
                ] },
            ],
        },
        {
            id: 'inventory',
            title: 'Inventory and Product Information',
            blocks: [
                { type: 'p', text: 'Product details, prices and stock movements must reflect the actual items on hand. The results of an Excel product import must be reviewed before they are confirmed. An authorized user may undo an import batch that was confirmed in error. Any difference between recorded and actual stock must be reported to an administrator.' },
            ],
        },
        {
            id: 'monitoring',
            title: 'Records, Reports and Monitoring',
            blocks: [
                { type: 'p', text: 'Every transaction and significant action is logged with:' },
                { type: 'list', items: [
                    'the name of the user;',
                    'the date and time; and',
                    'the IP address and device used.',
                ] },
                { type: 'p', text: 'Logs cannot be edited or deleted through the System. Management may review them at any time to verify accuracy and investigate incidents. Reports exported from the System are confidential and may be used only for the business of the Company.' },
            ],
        },
        {
            id: 'confidentiality',
            title: 'Confidentiality and Data Protection',
            blocks: [
                { type: 'p', text: 'Users must handle all business and customer information in accordance with the Privacy Policy of the Company and the Data Privacy Act of 2012. Users must not:' },
                { type: 'list', items: [
                    'copy, photograph, print, transmit or disclose System data, except as their duties require; or',
                    'use customer information for any personal purpose.',
                ] },
                { type: 'p', text: 'This duty of confidentiality continues after a user\u2019s employment or engagement ends.' },
            ],
        },
        {
            id: 'prohibited',
            title: 'Prohibited Acts',
            blocks: [
                { type: 'p', text: 'Users must not:' },
                { type: 'list', items: [
                    'record false, incomplete or altered transactions;',
                    'void, refund or return a transaction without a valid reason;',
                    'change prices, discounts or stock records to conceal a shortage or loss;',
                    'use the account, password or approval PIN of another person;',
                    'attempt to bypass sign-in, role permissions or approval requirements;',
                    'disclose business or customer information to unauthorized persons;',
                    'interfere with the operation or security of the System;',
                    'give access to the System, or to its records, to any person outside the Company;',
                    'use the System, or any of its records, for another business or for personal gain; or',
                    'copy, modify, reproduce or distribute any part of the System.',
                ] },
            ],
        },
        {
            id: 'availability',
            title: 'System Availability',
            blocks: [
                { type: 'list', items: [
                    'The System requires an internet connection and has no offline mode.',
                    'The Company and the Developers do not guarantee that the System will be available at all times. It may be unavailable during maintenance or when internet service or third-party providers fail.',
                    'When the System is unavailable, sales must be recorded on the BIR-registered booklet and entered in the System once service is restored.',
                ] },
            ],
        },
        {
            id: 'violations',
            title: 'Violations and Sanctions',
            blocks: [
                { type: 'p', text: 'Violations of these Terms may result in any of the following:' },
                { type: 'list', items: [
                    'suspension or deactivation of System access;',
                    'disciplinary action under Company policy and applicable labor laws; and',
                    'civil or criminal liability under applicable laws, including the Data Privacy Act of 2012 and the Cybercrime Prevention Act of 2012.',
                ] },
            ],
        },
        {
            id: 'end-of-access',
            title: 'End of Access',
            blocks: [
                { type: 'p', text: 'When a user leaves the Company or no longer needs access, the account is deactivated and all active sessions are ended. Transactions and logs recorded under the account are kept for audit, as stated in the Privacy Policy.' },
            ],
        },
        {
            id: 'amendments',
            title: 'Amendments',
            blocks: [
                { type: 'p', text: 'The Company may amend these Terms when needed. Users will be notified of any amendment before it takes effect. Continued use of the System after that date means the amended Terms are accepted.' },
            ],
        },
        {
            id: 'governing-law',
            title: 'Governing Law',
            blocks: [
                { type: 'p', text: 'These Terms are governed by the laws of the Republic of the Philippines.' },
            ],
        },
        {
            id: 'contact',
            title: 'Contact',
            blocks: [
                { type: 'p', text: `Questions about these Terms may be directed to the System Administrator of ${B}. Technical concerns about the System may be referred to Technical Operations (${D}).` },
            ],
        },
    ],
};

/** Both documents, in the order their tabs appear. */
export const LEGAL_DOCUMENTS = [privacy, terms];
