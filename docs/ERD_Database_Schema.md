# ZTG Heavy Parts — ERD Database Schema & Documentation

> **Purpose:** Official ERD database schema and Lucid Chart AI prompt matching the production database migrations for **ZTG POS & Smart Inventory System**.

---

## Entity Definitions

### 1. `users`
Stores all authentication credentials and security access states.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Unique user identifier |
| `username` | VARCHAR(50) | UNIQUE, NOT NULL | Unique login handle |
| `password` | VARCHAR(255) | NOT NULL | Hashed via Bcrypt |
| `pin` | VARCHAR(255) | NULLABLE | Manager approval PIN (hashed via Bcrypt) |
| `role` | VARCHAR(50) | NOT NULL, DEFAULT 'Cashier' | System Role / Legacy fallback (`Admin`, `Cashier`, `Technical Operations`, etc.) |
| `status` | VARCHAR(50) | NOT NULL, DEFAULT 'Active' | PHP Enum: `Active`, `Inactive` |
| `email_verified_at` | TIMESTAMP | NULLABLE | Email verification timestamp for staff accounts |
| `remember_token` | VARCHAR(100) | NULLABLE | Session remember token |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | |

---

### 2. `user_profiles`
Stores personal identity and contact information in a strict 1-to-1 relationship with `users` (3NF Separation).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Unique profile identifier |
| `user_id` | BIGINT UNSIGNED | FK → `users.id`, UNIQUE, NOT NULL, ON DELETE CASCADE | 1-to-1 link to user account |
| `full_name` | VARCHAR(100) | NOT NULL | Employee full display / legal name |
| `phone_number` | VARCHAR(30) | NULLABLE | Contact telephone / mobile number |
| `email` | VARCHAR(255) | NULLABLE, UNIQUE | Email address for alerts, verification & password resets |
| `profile_photo` | VARCHAR(500) | NULLABLE | Cloudinary avatar image URL |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | |

---

### 3. `roles`
Stores system and custom defined user roles for Dynamic Role-Based Access Control (RBAC).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Unique role identifier |
| `name` | VARCHAR(50) | UNIQUE, NOT NULL | Role name (e.g., `Admin`, `Cashier`, `Technical Operations`, `Supervisor`) |
| `description` | VARCHAR(255) | NULLABLE | Human-readable role purpose / scope description |
| `is_system` | BOOLEAN | NOT NULL, DEFAULT FALSE | System roles cannot be deleted or renamed |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | |

---

### 4. `role_permissions`
Defines 2-layer permission matrix for each role across all system modules.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Unique permission record identifier |
| `role_id` | BIGINT UNSIGNED | FK → `roles.id`, NOT NULL, ON DELETE CASCADE | Target role |
| `module` | VARCHAR(50) | NOT NULL | Module identifier (`dashboard`, `products`, `inventory`, `reservations`, `pos`, `history_logs`, `sales_log`, `reports`, `settings`, `user_management`, `system_status`) |
| `has_access` | BOOLEAN | NOT NULL, DEFAULT FALSE | **Layer 1:** Module visibility & route access |
| `can_view` | BOOLEAN | NOT NULL, DEFAULT FALSE | **Layer 2:** Read records |
| `can_create` | BOOLEAN | NOT NULL, DEFAULT FALSE | **Layer 2:** Create new records |
| `can_edit` | BOOLEAN | NOT NULL, DEFAULT FALSE | **Layer 2:** Update / modify records |
| `can_delete` | BOOLEAN | NOT NULL, DEFAULT FALSE | **Layer 2:** Delete / void records |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | |

> **Unique Index:** `['role_id', 'module']`

---

### 5. `user_permission_overrides`
Allows granular user-specific permission overrides that take precedence over the user's assigned role.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Unique override record identifier |
| `user_id` | BIGINT UNSIGNED | FK → `users.id`, NOT NULL, ON DELETE CASCADE | Target user |
| `module` | VARCHAR(50) | NOT NULL | Module identifier |
| `has_access` | BOOLEAN | NOT NULL, DEFAULT FALSE | Override Layer 1 module visibility |
| `can_view` | BOOLEAN | NOT NULL, DEFAULT FALSE | Override read permission |
| `can_create` | BOOLEAN | NOT NULL, DEFAULT FALSE | Override create permission |
| `can_edit` | BOOLEAN | NOT NULL, DEFAULT FALSE | Override edit permission |
| `can_delete` | BOOLEAN | NOT NULL, DEFAULT FALSE | Override delete permission |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | |

> **Unique Index:** `['user_id', 'module']`

---

### 6. `checkers`
Stores checker profiles assigned to sales transactions for supervisor verification.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| `name` | VARCHAR(100) | NOT NULL | Checker full name |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'Active' | Enum: 'Active', 'Inactive' |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | |

---

### 7. `categories`
Product categories managed from Settings with support for up to 3 variant dimensions.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| `name` | VARCHAR(100) | UNIQUE, NOT NULL | e.g. Hydraulics, Filters, Engine Parts |
| `prefix` | VARCHAR(10) | NULLABLE | Category SKU prefix e.g. HYD, FIL, ENG |
| `chinese_name` | VARCHAR(100) | NULLABLE | Chinese category translation |
| `allow_variants` | BOOLEAN | NOT NULL, DEFAULT FALSE | Flag to enable variants for category (supports up to 3 variant types) |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | |

---

### 8. `variant_types`
Defines variant dimensions (e.g. Size, Specification, Material, Color).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| `name` | VARCHAR(100) | UNIQUE, NOT NULL | e.g. "Size", "Specification", "Material" |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |

---

### 9. `variant_options`
Individual options within a variant type.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| `variant_type_id` | BIGINT UNSIGNED | FK → `variant_types.id`, NOT NULL | |
| `value` | VARCHAR(100) | NOT NULL | e.g. "Standard", "Heavy Duty", "300mm", "OEM Cast" |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |

---

### 10. `products`
Master product catalog. Each variant is its own row (same base `name`, distinct `variant_options` and `part_no`).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| `parent_product_id` | BIGINT UNSIGNED | FK → `products.id`, NULLABLE, ON DELETE CASCADE | NULL = base product; set for variants |
| `name` | VARCHAR(255) | NULLABLE | Product name (nullable for items with image/price only) |
| `chinese_name` | VARCHAR(255) | NULLABLE | Chinese translation |
| `part_no` | VARCHAR(50) | NULLABLE, UNIQUE | Part number |
| `category_id` | BIGINT UNSIGNED | FK → `categories.id`, NOT NULL, ON DELETE RESTRICT | Assigned category |
| `uom` | VARCHAR(50) | NULLABLE, DEFAULT 'Piece / PCS' | Dynamic Unit of Measure (PCS, Set, Roll, Meter, Box, etc.) |
| `address` | VARCHAR(50) | NULLABLE | Warehouse physical location (e.g. `Rack A-1`, `Shelf 3`) |
| `stock` | INT | NOT NULL, DEFAULT 0 | Current shelf stock |
| `alert_limit` | INT | NOT NULL, DEFAULT 5 | Low stock threshold |
| `price1` | DECIMAL(12,2) | NOT NULL, DEFAULT 0 | Wholesale / Original price |
| `price2` | DECIMAL(12,2) | NOT NULL, DEFAULT 0 | Retail price |
| `status` | VARCHAR(50) | NOT NULL, DEFAULT 'Active' | Enum: 'Active', 'Low Stock', 'No Stock', 'Disabled' |
| `is_dead_stock` | BOOLEAN | NOT NULL, DEFAULT FALSE | Flagged as dead stock (>90 days zero sales) |
| `damaged` | INT | NOT NULL, DEFAULT 0 | Units marked damaged |
| `variant_options` | VARCHAR(255) | NULLABLE | Display label e.g. "Size: 300mm / Material: Steel" |
| `image` | VARCHAR(500) | NULLABLE | Product image URL (inheritable by variants) |
| `notes` | TEXT | NULLABLE | Internal notes |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | |

---

### 11. `product_variant_values`
Join table mapping products to their assigned variant options.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| `product_id` | BIGINT UNSIGNED | FK → `products.id`, NOT NULL, ON DELETE CASCADE | |
| `variant_option_id` | BIGINT UNSIGNED | FK → `variant_options.id`, NOT NULL, ON DELETE CASCADE | |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |

---

### 12. `customers`
Customer records for invoicing, receipts, and reservation tracking.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| `name` | VARCHAR(100) | NOT NULL | Customer name |
| `phone` | VARCHAR(30) | NULLABLE | Contact number |
| `email` | VARCHAR(255) | NULLABLE | Email address |
| `tin` | VARCHAR(50) | NULLABLE | Tax Identification Number |
| `address` | TEXT | NULLABLE | Business / Delivery address |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | |

---

### 13. `transactions`
Core sales, inventory adjustments, and security audit log entries.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| `si_no` | VARCHAR(50) | UNIQUE, NOT NULL | Sales Invoice / Document No. Format: `SI-YYYY-XXX`, `DR-YYYY-XXX` |
| `or_no` | VARCHAR(50) | NULLABLE | Official Receipt / Refund Ref (e.g., `OR-RFD-YYYY-XXX`, `OR-RET-YYYY-XXX`) |
| `date` | DATETIME | NOT NULL | Transaction timestamp |
| `customer_id` | BIGINT UNSIGNED | FK → `customers.id`, NULLABLE, ON DELETE SET NULL | Customer reference |
| `cashier_id` | BIGINT UNSIGNED | FK → `users.id`, NOT NULL, ON DELETE RESTRICT | Cashier who processed transaction |
| `checker_id` | BIGINT UNSIGNED | FK → `checkers.id`, NULLABLE, ON DELETE SET NULL | Assigned checker |
| `total_qty` | INT | NOT NULL, DEFAULT 0 | Total units in transaction |
| `amount` | DECIMAL(12,2) | NOT NULL, DEFAULT 0 | Current net transaction total (adjusted upon partial refund/void) |
| `original_amount` | DECIMAL(12,2) | NULLABLE | Frozen original sale amount at checkout (for net sales & refund auditing) |
| `refunded_amount` | DECIMAL(12,2) | NOT NULL, DEFAULT 0 | Cumulative total refunded amount |
| `discount_amount` | DECIMAL(12,2) | NOT NULL, DEFAULT 0 | Total discount amount applied |
| `discount_type` | VARCHAR(50) | NULLABLE | 'CustomAmount', 'CustomPercent' |
| `discount_rate` | DECIMAL(5,2) | NOT NULL, DEFAULT 0 | Discount rate percentage |
| `amount_tendered` | DECIMAL(12,2) | NULLABLE | Cash tendered |
| `payment_method` | VARCHAR(255) | NOT NULL | 'Cash', 'GCash', 'Bank Transfer', 'Cheque', 'P.O. (Pending)' |
| `cheque_number` | VARCHAR(100) | NULLABLE | Reference number for cheque payments |
| `cheque_bank` | VARCHAR(100) | NULLABLE | Issuing bank name (e.g., BDO, Metrobank, BPI) |
| `cheque_date` | DATE | NULLABLE | Issue date / Maturity date of cheque |
| `doc_type` | VARCHAR(50) | NULLABLE | PHP Enum: `S.I.` (Sales Invoice), `D.R.` (Delivery Receipt), `C.R.` (Collection Receipt) |
| `status` | VARCHAR(50) | NOT NULL, INDEX | Enum: `Completed`, `Refund`, `Return`, `Void`, `Pending`, `Deposit`, `Paid`, `Restocked`, `Damaged`, `Security Alert` |
| `type` | VARCHAR(50) | NULLABLE | Enum: `sale`, `reservation`, `inventory`, `system` |
| `refund_reason` | VARCHAR(255) | NULLABLE | Reason for refund/return |
| `void_reason` | VARCHAR(255) | NULLABLE | Reason for void |
| `action_type` | VARCHAR(100) | NULLABLE | e.g. "Refunded via Cash" |
| `inv_action` | VARCHAR(100) | NULLABLE | e.g. "Restocked to Shelf" |
| `approver_id` | BIGINT UNSIGNED | FK → `users.id`, NULLABLE, ON DELETE SET NULL | Admin who approved action |
| `approval_code` | VARCHAR(20) | NULLABLE | PIN used for approval |
| `order_ref` | VARCHAR(50) | NULLABLE | FK reference to reservation `ORD-XXX` / `RS-XXX` |
| `business_snapshot` | TEXT / JSON | NULLABLE | Frozen snapshot of business header details |
| `internal_notes` | TEXT | NULLABLE | Internal notes |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | |

---

### 14. `transaction_items`
Line items for each sales transaction or inventory adjustment, with product name and part number snapshots.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| `transaction_id` | BIGINT UNSIGNED | FK → `transactions.id`, NOT NULL, ON DELETE CASCADE | Parent transaction |
| `product_id` | BIGINT UNSIGNED | FK → `products.id`, NULLABLE, ON DELETE SET NULL | Product foreign key |
| `item_name` | VARCHAR(255) | NULLABLE | Frozen product name snapshot |
| `part_no` | VARCHAR(100) | NULLABLE | Frozen part number snapshot |
| `qty` | INT | NOT NULL | Original quantity purchased |
| `refunded_qty` | INT | NOT NULL, DEFAULT 0 | Cumulative units refunded / returned |
| `price` | DECIMAL(12,2) | NOT NULL | Unit price after item discount |
| `original_price` | DECIMAL(12,2) | NOT NULL, DEFAULT 0 | Base catalog price |
| `discount` | DECIMAL(12,2) | NOT NULL, DEFAULT 0 | Item-level discount amount |
| `price_tier` | VARCHAR(50) | DEFAULT 'price1' | PHP Enum: `price1` (Wholesale), `price2` (Retail) |
| `unit` | VARCHAR(20) | DEFAULT 'pc' | Unit of measure snapshot |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |

---

### 15. `reservations`
Order-based reservations with multi-item cart support, Collection Receipt fulfillment, and vehicle tracking.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| `order_no` | VARCHAR(50) | UNIQUE, NOT NULL | Format: `RS-YYYY-XXX` |
| `customer_id` | BIGINT UNSIGNED | FK → `customers.id`, NULLABLE, ON DELETE SET NULL | Customer reference |
| `customer_name` | VARCHAR(100) | NULLABLE | Customer display name |
| `customer_phone` | VARCHAR(50) | NULLABLE | Customer contact phone |
| `email` | VARCHAR(255) | NULLABLE | Customer email |
| `engine_plate_number`| VARCHAR(100) | NULLABLE | Target vehicle/engine plate number |
| `notes` | TEXT | NULLABLE | Special instructions |
| `payment_method` | VARCHAR(50) | NOT NULL | 'Cash', 'GCash', 'Bank Transfer', 'Cheque' |
| `cheque_number` | VARCHAR(100) | NULLABLE | Cheque reference number |
| `cheque_bank` | VARCHAR(100) | NULLABLE | Cheque issuing bank |
| `cheque_date` | DATE | NULLABLE | Cheque issue / maturity date |
| `payment_type` | VARCHAR(50) | NOT NULL | PHP Enum: `deposit50`, `full` |
| `deposit` | DECIMAL(12,2) | NOT NULL, DEFAULT 0 | Deposit amount paid |
| `total` | DECIMAL(12,2) | NOT NULL, DEFAULT 0 | Order total amount |
| `date` | DATE | NOT NULL | Reservation date |
| `pickup_date` | DATE | NULLABLE | Expected pickup date |
| `pickup_time` | TIME | NULLABLE | Expected pickup time |
| `date_get` | DATE | NULLABLE | Actual item fulfillment / claim date |
| `doc_type` | VARCHAR(20) | DEFAULT 'C.R.' | Document type: 'C.R.' (Collection Receipt), 'S.I.', 'D.R.' |
| `deposit_cr_no` | VARCHAR(50) | NULLABLE | Physical Collection Receipt No. (C.R. No.) issued upon initial booking deposit |
| `balance_cr_no` | VARCHAR(50) | NULLABLE | Physical Collection Receipt No. (C.R. No.) issued upon order fulfillment/balance payment |
| `si_no` | VARCHAR(50) | NULLABLE | Physical Collection Receipt No. (C.R. No.) from booklet (backward compatible alias) |
| `reserved_by_id` | BIGINT UNSIGNED | FK → `users.id`, NOT NULL | Cashier who booked |
| `fulfilled_by_id` | BIGINT UNSIGNED | FK → `users.id`, NULLABLE | Cashier who fulfilled |
| `status` | VARCHAR(50) | NOT NULL, DEFAULT 'Pending' | PHP Enum: `Pending`, `Completed`, `Cancelled` |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | |

---

### 16. `reservation_items`
Line items within a reservation order.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| `reservation_id` | BIGINT UNSIGNED | FK → `reservations.id`, NOT NULL, ON DELETE CASCADE | |
| `product_id` | BIGINT UNSIGNED | FK → `products.id`, NULLABLE, ON DELETE SET NULL | |
| `part_no` | VARCHAR(100) | NULLABLE | Product part number |
| `item_name` | VARCHAR(255) | NULLABLE | Product name |
| `engine_plate_number`| VARCHAR(100) | NULLABLE | Specific vehicle/engine plate number per item |
| `qty` | INT | NOT NULL | Quantity reserved |
| `price` | DECIMAL(12,2) | NOT NULL | Unit price |

---

### 17. `staff_verification_tokens`
Stores secure single-use revelation tokens and encrypted temporary passwords for newly registered staff accounts.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Unique token identifier |
| `user_id` | BIGINT UNSIGNED | FK → `users.id`, NOT NULL, ON DELETE CASCADE | Target staff account |
| `token` | VARCHAR(64) | UNIQUE, INDEX, NOT NULL | Cryptographic token sent via email verification link |
| `expires_at` | TIMESTAMP | NOT NULL | Expiry threshold (24 hours from creation) |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | |

---

### 18. `activity_logs`
Enterprise security audit trail tracking staff authentication, security lockouts, configuration edits, staff management, inventory updates, and POS transactions.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Unique audit log entry ID |
| `user_id` | BIGINT UNSIGNED | FK → `users.id`, NULLABLE, ON DELETE SET NULL | Staff member who performed the action |
| `action` | VARCHAR(60) | INDEX, NOT NULL | `login`, `logout`, `force_logout`, `login_lockout`, `forgot_password_request`, `password_reset`, `rate_limit_exceeded`, `settings_update`, `employee_create`, `employee_update`, `product_create`, `checkout`, `refund`, `void`, etc. |
| `module` | VARCHAR(40) | INDEX, NOT NULL, DEFAULT 'Auth' | `Auth`, `Security`, `Settings`, `Employees`, `Inventory`, `POS`, `UserManagement` |
| `description` | TEXT | NOT NULL | Human-readable audit description |
| `ip_address` | VARCHAR(45) | NULLABLE | Client IP address (`127.0.0.1 (Localhost)` or Public/LAN IP) |
| `user_agent` | TEXT | NULLABLE | Browser and OS User-Agent header |
| `device` | VARCHAR(100) | NULLABLE | Parsed device string (e.g., `Chrome on Windows 10/11`) |
| `status` | VARCHAR(30) | INDEX, NOT NULL, DEFAULT 'Success' | `Success`, `Warning`, `Abnormal`, `Terminated` |
| `severity` | VARCHAR(20) | INDEX, NOT NULL, DEFAULT 'info' | `info`, `warning`, `critical` |
| `metadata` | JSON | NULLABLE | JSON payload with context IDs, old/new values, and amounts |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | |

---

### 19. `personal_access_tokens`
Laravel Sanctum Bearer token storage for API session authentication.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| `tokenable_type` | VARCHAR(255) | NOT NULL | Model class (`App\Models\User`) |
| `tokenable_id` | BIGINT UNSIGNED | NOT NULL | Target user ID |
| `name` | VARCHAR(255) | NOT NULL | e.g. `auth_token` |
| `token` | VARCHAR(64) | UNIQUE, NOT NULL | Hashed SHA-256 token |
| `abilities` | TEXT | NULLABLE | Allowed scopes |
| `last_used_at` | TIMESTAMP | NULLABLE | Last active request timestamp |
| `expires_at` | TIMESTAMP | NULLABLE | Token expiration |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | |

---

### 20. `password_reset_tokens`
Secure token storage for password recovery via transactional reset email links.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `email` | VARCHAR(255) | PK | User email address |
| `token` | VARCHAR(255) | NOT NULL | Hashed 64-character token |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Enforces 60-minute expiry |

---

### 21. `report_logs`
Audit log recording report generation and export events.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| `user_id` | BIGINT UNSIGNED | FK → `users.id`, NULLABLE, ON DELETE SET NULL | User who generated report |
| `report_type` | VARCHAR(50) | NOT NULL | 'sales', 'product', 'payment', 'china_export' |
| `timeframe` | VARCHAR(50) | NOT NULL | 'today', 'thismonth', 'thisyear', 'custom' |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |

---

### 22. `notifications`
System-generated alerts (low stock, transactions, reservations).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| `type` | VARCHAR(50) | NOT NULL | 'low_stock', 'transaction', 'reservation' |
| `sub_type` | VARCHAR(50) | NULLABLE | 'sale', 'refund', 'void', 'inventory_restock' |
| `title` | VARCHAR(255) | NOT NULL | Alert title |
| `message` | TEXT | NOT NULL | Detailed message |
| `link` | VARCHAR(255) | NULLABLE | Page route link |
| `product_id` | BIGINT UNSIGNED | FK → `products.id`, NULLABLE, ON DELETE CASCADE | |
| `transaction_id` | BIGINT UNSIGNED | FK → `transactions.id`, NULLABLE, ON DELETE CASCADE | |
| `is_read` | BOOLEAN | DEFAULT FALSE | Read indicator |
| `user_id` | BIGINT UNSIGNED | FK → `users.id`, NULLABLE, ON DELETE CASCADE | Target user |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |

---

### 23. `settings`
Key-value store for system configuration settings.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| `key` | VARCHAR(100) | UNIQUE, NOT NULL | `business_name`, `business_address`, `tin`, `auto_si_numbering`, `next_si_number`, `next_dr_number`, `next_cr_number`, `unit_of_measure`, etc. |
| `value` | TEXT | NULLABLE | Config value |
| `updated_at` | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | |

---

### 24. `alert_rules`
Configurable rules for automated low-stock and threshold alerts.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| `name` | VARCHAR(100) | NOT NULL | Rule name |
| `type` | VARCHAR(50) | NOT NULL | e.g. `low_stock`, `dead_stock` |
| `threshold` | INT | NOT NULL | Trigger threshold value |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Active switch |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | |

---

## Visual Mermaid ERD

```mermaid
erDiagram
    users ||--|| user_profiles : "has profile (user_id)"
    users ||--o{ personal_access_tokens : "issues (tokenable_id)"
    users ||--o{ staff_verification_tokens : "receives (user_id)"
    users ||--o{ activity_logs : "generates (user_id)"
    users ||--o{ user_permission_overrides : "has custom overrides (user_id)"
    users ||--o{ transactions : "processes (cashier_id)"
    users ||--o{ transactions : "approves (approver_id)"
    users ||--o{ reservations : "books (reserved_by_id)"
    users ||--o{ reservations : "fulfills (fulfilled_by_id)"
    users ||--o{ report_logs : "generates (user_id)"
    users ||--o{ notifications : "receives (user_id)"

    roles ||--o{ role_permissions : "defines (role_id)"
    roles ||--o{ users : "assigned to (role)"

    checkers ||--o{ transactions : "verifies (checker_id)"

    categories ||--o{ products : "categorizes (category_id)"

    products ||--o{ products : "has variants (parent_product_id)"
    products ||--o{ product_variant_values : "has option values"
    products ||--o{ transaction_items : "sold in"
    products ||--o{ reservation_items : "reserved in"
    products ||--o{ notifications : "alerts for"

    variant_types ||--o{ variant_options : "defines"
    variant_options ||--o{ product_variant_values : "assigned to"

    customers ||--o{ transactions : "makes (customer_id)"
    customers ||--o{ reservations : "books (customer_id)"

    transactions ||--o{ transaction_items : "contains"
    transactions ||--o{ notifications : "triggers"

    reservations ||--o{ reservation_items : "contains"

    roles {
        bigint id PK
        string name UK
        string description
        boolean is_system
    }

    role_permissions {
        bigint id PK
        bigint role_id FK
        string module
        boolean has_access
        boolean can_view
        boolean can_create
        boolean can_edit
        boolean can_delete
    }

    user_permission_overrides {
        bigint id PK
        bigint user_id FK
        string module
        boolean has_access
        boolean can_view
        boolean can_create
        boolean can_edit
        boolean can_delete
    }

    users {
        bigint id PK
        string username UK
        string password
        string pin
        string role
        string status
        timestamp email_verified_at
    }

    user_profiles {
        bigint id PK
        bigint user_id FK
        string full_name
        string phone_number
        string email UK
        string profile_photo
    }

    staff_verification_tokens {
        bigint id PK
        bigint user_id FK
        string token UK
        timestamp expires_at
    }

    activity_logs {
        bigint id PK
        bigint user_id FK
        string action
        string module
        text description
        string ip_address
        string device
        string status
        string severity
        json metadata
    }

    products {
        bigint id PK
        bigint parent_product_id FK
        string name
        string chinese_name
        string part_no UK
        bigint category_id FK
        string uom
        string address
        int stock
        int alert_limit
        decimal price1
        decimal price2
        string status
        string image
    }

    reservations {
        bigint id PK
        string order_no UK
        bigint customer_id FK
        string customer_name
        string payment_method
        string payment_type
        decimal deposit
        decimal total
        date date
        date date_get
        string doc_type
        string deposit_cr_no
        string balance_cr_no
        string si_no
        string status
    }

    transactions {
        bigint id PK
        string si_no UK
        string or_no
        datetime date
        bigint customer_id FK
        bigint cashier_id FK
        bigint checker_id FK
        decimal amount
        decimal original_amount
        decimal refunded_amount
        string payment_method
        string doc_type
        string status
    }

    transaction_items {
        bigint id PK
        bigint transaction_id FK
        bigint product_id FK
        string item_name
        string part_no
        int qty
        int refunded_qty
        decimal price
        string unit
    }

    reservation_items {
        bigint id PK
        bigint reservation_id FK
        bigint product_id FK
        string part_no
        string item_name
        int qty
        decimal price
    }
```

---

## Lucid Chart AI Prompt

> Copy and paste the prompt below into **Lucid Chart AI** to auto-generate the complete ERD diagram:

```
Create an Entity Relationship Diagram for an enterprise POS and Inventory Management System called "ZTG Heavy Parts" with these tables and relationships:

TABLES:
- roles (id PK, name UNIQUE, description, is_system BOOL, timestamps)
- role_permissions (id PK, role_id FK->roles ON DELETE CASCADE, module VARCHAR(50), has_access BOOL, can_view BOOL, can_create BOOL, can_edit BOOL, can_delete BOOL, UNIQUE[role_id+module], timestamps)
- user_permission_overrides (id PK, user_id FK->users ON DELETE CASCADE, module VARCHAR(50), has_access BOOL, can_view BOOL, can_create BOOL, can_edit BOOL, can_delete BOOL, UNIQUE[user_id+module], timestamps)
- users (id PK, username UNIQUE, password, pin, role, status, email_verified_at TIMESTAMP, remember_token, timestamps)
- user_profiles (id PK, user_id FK->users UNIQUE ON DELETE CASCADE, full_name, phone_number, email UNIQUE, profile_photo, timestamps)
- staff_verification_tokens (id PK, user_id FK->users ON DELETE CASCADE, token UNIQUE, expires_at TIMESTAMP, timestamps)
- activity_logs (id PK, user_id FK->users NULLABLE, action VARCHAR(60), module VARCHAR(40), description TEXT, ip_address VARCHAR(45), user_agent TEXT, device VARCHAR(100), status VARCHAR(30), severity VARCHAR(20), metadata JSON, timestamps)
- personal_access_tokens (id PK, tokenable_type, tokenable_id, name, token UNIQUE, abilities, last_used_at, expires_at, timestamps)
- password_reset_tokens (email PK, token, created_at)
- checkers (id PK, name, status, timestamps)
- categories (id PK, name UNIQUE, prefix, chinese_name, allow_variants BOOL, timestamps)
- variant_types (id PK, name UNIQUE, created_at)
- variant_options (id PK, variant_type_id FK->variant_types, value, created_at)
- products (id PK, parent_product_id FK->products NULLABLE self-ref, name NULLABLE, chinese_name, part_no NULLABLE UNIQUE, category_id FK->categories, uom VARCHAR(50) DEFAULT 'Piece / PCS', address, stock INT, alert_limit INT, price1 DECIMAL, price2 DECIMAL, status, is_dead_stock BOOL, damaged INT, variant_options VARCHAR, image VARCHAR, notes TEXT, timestamps)
- product_variant_values (id PK, product_id FK->products, variant_option_id FK->variant_options, UNIQUE[product_id+variant_option_id])
- customers (id PK, name, phone, email, tin, address, timestamps)
- transactions (id PK, si_no UNIQUE, or_no, date DATETIME, customer_id FK->customers, cashier_id FK->users, checker_id FK->checkers, total_qty INT, amount DECIMAL, original_amount DECIMAL, refunded_amount DECIMAL, discount_amount DECIMAL, discount_type, discount_rate DECIMAL, amount_tendered DECIMAL, payment_method, cheque_number, cheque_bank, cheque_date DATE, doc_type, status, type, refund_reason, void_reason, action_type, inv_action, approver_id FK->users NULLABLE, approval_code, order_ref, business_snapshot TEXT, internal_notes TEXT, timestamps)
- transaction_items (id PK, transaction_id FK->transactions CASCADE, product_id FK->products, item_name, part_no, qty INT, refunded_qty INT, price DECIMAL, original_price DECIMAL, discount DECIMAL, price_tier, unit VARCHAR, created_at)
- reservations (id PK, order_no UNIQUE, customer_id FK->customers, customer_name, customer_phone, email, engine_plate_number, notes TEXT, payment_method, cheque_number, cheque_bank, cheque_date DATE, payment_type, deposit DECIMAL, total DECIMAL, date DATE, pickup_date DATE, pickup_time TIME, date_get DATE, doc_type DEFAULT 'C.R.', deposit_cr_no VARCHAR(50), balance_cr_no VARCHAR(50), si_no VARCHAR(50), reserved_by_id FK->users, fulfilled_by_id FK->users NULLABLE, status, timestamps)
- reservation_items (id PK, reservation_id FK->reservations CASCADE, product_id FK->products, part_no, item_name, engine_plate_number, qty INT, price DECIMAL)
- report_logs (id PK, user_id FK->users NULLABLE, report_type, timeframe, created_at)
- notifications (id PK, type, sub_type, title, message TEXT, link, product_id FK->products NULLABLE, transaction_id FK->transactions NULLABLE, is_read BOOL, user_id FK->users NULLABLE, created_at)
- settings (id PK, key UNIQUE, value TEXT, updated_at)
- alert_rules (id PK, name, type, threshold INT, is_active BOOL, timestamps)

RELATIONSHIPS:
- roles 1:M role_permissions (role_id)
- users 1:M user_permission_overrides (user_id)
- users 1:1 user_profiles (user_id)
- users 1:M staff_verification_tokens (user_id)
- users 1:M activity_logs (user_id)
- users 1:M personal_access_tokens (tokenable_id)
- users 1:M transactions (cashier_id)
- users 1:M transactions (approver_id)
- users 1:M reservations (reserved_by_id)
- users 1:M reservations (fulfilled_by_id)
- users 1:M report_logs (user_id)
- checkers 1:M transactions (checker_id)
- categories 1:M products (category_id)
- products 1:M products (self-ref parent_product_id for variants)
- products M:M variant_options (through product_variant_values)
- variant_types 1:M variant_options (variant_type_id)
- customers 1:M transactions (customer_id)
- customers 1:M reservations (customer_id)
- transactions 1:M transaction_items (transaction_id)
- products 1:M transaction_items (product_id)
- reservations 1:M reservation_items (reservation_id)
- products 1:M reservation_items (product_id)

Use crow's foot notation. Group related tables visually.
```
