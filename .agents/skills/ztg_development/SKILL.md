---
name: ZTG Heavy Parts Development Guidelines
description: Instructions and style guidelines for developing the ZTG Heavy Parts POS and Inventory Management System aligning with SystemLogicFlows.md.
---

# ZTG Heavy Parts Development Guidelines

This skill defines the development workflows, architectural constraints, and folder structures for building the ZTG Heavy Parts POS and Inventory Management system.

## Coding Standards

### Backend (Laravel)
* **Architecture:** Layered Architecture. Use thin Controllers and thin Services.
* **Validation:** All incoming request validation must be handled in Form Requests (`app/Http/Requests`).
* **Logic Separation:** Keep all business logic within Service classes under `app/Services/`. Use Action classes for single-purpose operations if a service gets too complex.
* **Database Transactions:** Always wrap critical data mutating operations (checkout, inventory updates, refunds) in database transactions:
  ```php
  DB::transaction(function () {
      // Data operations
  });
  ```
* **Security & Authentication:** Use Laravel Sanctum for API token-based authentication. Passwords and PINs must be encrypted using Bcrypt.
* **User & Profile Architecture:** Maintain strict separation between `users` (credentials, role, status, hashed PIN) and `user_profiles` (full name, phone, email, avatar). Always use the 1:1 `User hasOne UserProfile` relationship.
* **Database Enums:** All static options (roles, statuses) must be stored in database as `VARCHAR` columns and validated/casted using native **PHP Enums** in `app/Enums/`.

### Frontend (React)
* **Routing:** Use `react-router-dom` on the client side. Let Laravel route all requests to a single entrypoint view (`resources/views/app.blade.php`).
* **State & Storage:** Store session data (JWT/Sanctum Token, user role) in React state and persist it in `localStorage`.
* **API Calls:** Use `axios` for network requests. Configure a global axios instance with interceptors to automatically attach the Bearer token from `localStorage`.

### Design & UI Standards (Human-Crafted Aesthetics)
* **NO RAW EMOJIS IN PRODUCTION UI:** Never use raw unicode emojis (e.g. `✋`, `ℹ️`, `⚠️`, `💡`, `🎉`) as icons, bullet points, or banners in UI components, modals, or notifications. Raw emojis make the interface look like a generic AI-generated prototype.
* **USE REAL SVG ICONS:** Always use clean, professional inline SVG icons (Lucide / Heroicons style vector paths) with consistent stroke widths (`strokeWidth="2"`), proper viewboxes, and curated HSL/Tailwind color palettes.
* **NON-AI AESTHETICS:** Ensure all modal overlays, note banners, controls, and typography look handcrafted, sleek, and enterprise-grade. Avoid heavy dark blur masks or tacky AI placeholders.

---

## Frontend Architecture: Folder-Based Module Structure

**CRITICAL RULE:** Every admin page module MUST be a folder, not a single file. A page that starts to grow beyond ~200 lines of JSX MUST be split into the structure below. Single-file pages are NEVER acceptable.

### Required Structure per Module

```
frontend/src/pages/Admin/<ModuleName>/
├── index.jsx              ← THIN shell only: layout, imports sub-components & modals
├── <MainView>.jsx         ← Table/list view — pure UI, receives all data via props
├── <SubView>.jsx          ← Additional views (e.g. RestockView) — pure UI via props
├── modals/
│   ├── <ActionModal>.jsx  ← One file per modal — pure UI, receives isOpen/onClose/onSubmit props
│   └── ...
└── hooks/
    └── use<ModuleName>.js ← ALL state, useEffect, API calls, derived values
```

### File Responsibility Rules

| File | Allowed | NOT Allowed |
|------|---------|-------------|
| `index.jsx` | Layout shell, imports, prop wiring | Business logic, API calls, raw state |
| `*Table.jsx` / `*View.jsx` | JSX rendering, local display logic | API calls, state beyond display |
| `modals/*.jsx` | Modal JSX, form inputs | API calls, external state mutations |
| `hooks/use*.js` | All `useState`, `useEffect`, API, derived values | JSX rendering |

### Modal Contract

Every modal component MUST follow this prop contract:
```jsx
function MyModal({ isOpen, onClose, onSubmit, /* data props */ }) {
    if (!isOpen) return null; // Always guard at top
    // ... render JSX
}
```

### Hook Return Contract

The custom hook MUST return a flat object of everything the page needs:
```js
return {
    // Data
    items, categories, loading,
    // Derived
    sortedItems, filteredItems,
    // Modal visibility (controlled by index.jsx)
    showAddModal, setShowAddModal,
    // Handlers
    handleAdd, handleEdit, handleDelete,
    // Form state
    formData, setFormData, errorMessage,
};
```

### Existing Modules (Reference Implementations)

| Module | Folder Path |
|--------|-------------|
| Product Management | `frontend/src/pages/Admin/ProductManagement/` |
| Reservations | `frontend/src/pages/Admin/Reservations.jsx` ← to be refactored |
| Settings | `frontend/src/pages/Admin/Settings.jsx` ← to be refactored |
| Dashboard | `frontend/src/pages/Admin/Dashboard.jsx` ← to be refactored |
| Inventory | `frontend/src/pages/Admin/Inventory.jsx` ← to be refactored |

**ProductManagement** is the completed pilot and reference implementation. Follow its exact pattern for all other modules.

### Shared Components (`frontend/src/shared/`)

* `Sidebar.jsx` — Global navigation
* `NotificationsDropdown.jsx` — Bell icon + dropdown (use this everywhere, never inline)
* `PrivateRoute.jsx` — Auth guard wrapper
* `api.js` — Axios instance with Bearer token interceptor

**Rule:** If a component is used in 2+ modules, it belongs in `shared/`. Never duplicate UI components across modules.

---

## Notification Bell Rule

**NEVER** render an inline `<button>` for notifications. Always import and use:
```jsx
import NotificationsDropdown from '../../../shared/NotificationsDropdown';
// In JSX:
<NotificationsDropdown />
```

This applies to every admin page, every time.

---

## Multi-File Blast Radius & Bug-Fixing Protocol (Regression Avoidance)

Whenever fixing bugs, refactoring, or adding features, you **MUST** follow this strict protocol to guarantee you never break adjacent files, introduce import errors, or leave dead code:

### 1. Mandatory Blast-Radius Grep Before Any Edit
* Before editing any shared function, setting key, state prop, API endpoint, or component, perform a workspace-wide search across `frontend/src` and `backend`.
* Identify **all** downstream consumers:
  - Which components render or query this prop/key?
  - Which hooks manage or cache this state?
  - Which backend controllers, services, observers, or console commands process this data?
* Map out the entire consumer tree before writing code.

### 2. Import & Variable Resolution Verification
* **Never assume an import exists:** When adding a new hook, utility, or component reference into an existing file, immediately add the required `import` statement at the top of that file.
* **Check for broken imports:** When moving or renaming a file, grep for all previous import paths and update them across the entire codebase.
* **No dangling references:** When removing a feature or prop, remove all unused variables, parameters, and imported symbols in all affected files.

### 3. Setting & Feature Toggle Contract Standard
* **Direct Interaction:** Settings toggles must be directly interactive without unexpected disabled gates or prerequisites unless explicitly requested.
* **Bidirectional Behavior:** Every toggle must actively branch behavior in both states:
  - `enabled (true)`: The feature, field, or alert is active and displayed.
  - `disabled (false)`: The feature, field, or alert is completely hidden/suppressed.
* **Full Removal Cleanup:** When a toggle or feature is deprecated/removed:
  1. Remove toggle from Settings UI tabs and re-arrange surrounding form controls cleanly.
  2. Remove key from default settings objects, seeders, and test cases.
  3. Ensure core system operations continue naturally without relying on the removed toggle.

### 4. Mandatory Self-Verification & Loop Testing Loop
Before completing any task or marking work as done, always execute the automated verification loop:
1. **Backend Tests:** Run `php artisan test` in `backend` and ensure all test suites pass with 0 failures.
2. **Frontend Production Build:** Run `npm run build` in `frontend` to guarantee all JSX, CSS, imports, and modules compile cleanly with 0 syntax or bundling errors.
3. **Loop Until Clean:** If any test fails or build errors occur, inspect the root cause, fix the affected files, and re-run the verification commands until 100% passing.

### 5. Warehouse Location Architecture (Direct Address Input)
* **Direct Input Only:** Warehouse location in product forms is a single, clean text input allowing the user to freely type the item location (e.g. `Aisle 1`, `Hang 3`, `Shelf A-2`, `Rack 4`).
* **Carrier is Deprecated:** `Carrier` has been completely purged and must never be reintroduced in forms, models, schemas, or UI components.
* **Unified Address Field:** The address is stored directly in the `address` field on the `products` table and displayed consistently across tables, modals, and POS catalogue.





---

## Advanced Coding Patterns & Code Quality Standards

This section defines the mandatory coding patterns enforced across all ZTG backend (Laravel/PHP) and frontend (React/JavaScript) code. These are not optional style preferences — they are architectural rules that all future development and refactoring must follow.

---

### 1. Guard Clauses (Fail-Fast Validation)

**Rule:** All validation checks must appear as guard clauses at the TOP of a method, before any business logic, loops, or DB operations. Never bury validation inside nested conditionals.

**Anti-Pattern (NEVER do this):**
```php
public function processRefund(Transaction $transaction, array $data): Transaction
{
    // Validation buried deep — reader must scroll to discover all failure points
    $updated = DB::transaction(function () use ($transaction, $data) {
        foreach ($data['items'] as $item) {
            if ($transaction->status === 'Void') {  // ← Level 3 nesting
                throw ValidationException::withMessages([...]);
            }
            if ($item->qty <= 0) {                  // ← Level 3 nesting
                continue;
            }
        }
    });
}
```

**Required Pattern:**
```php
public function processRefund(Transaction $transaction, array $data): Transaction
{
    // All guards at the top — reader sees ALL failure conditions in first 3 lines
    $this->refundEligibilityValidator->validate($transaction);
    $this->pinValidator->verify($data['approver_id'], $data['pin']);

    // Business logic only runs if all guards passed
    $updated = DB::transaction(function () use ($transaction, $data) {
        // ...
    });
}
```

**Rules:**
- Maximum nesting depth: **3 levels**. If you need level 4, extract a method or validator.
- Validators belong in dedicated classes under `app/Services/{Module}/Validators/`.
- Each validator must be independently unit testable.
- Use `throw` immediately on failure — never return error objects from validators.

**Reference implementations:**
- `app/Services/Transactions/Validators/RefundEligibilityValidator.php`
- `app/Services/Transactions/Validators/RefundItemValidator.php`

---

### 2. Single-Pass Iteration (Advanced Iteration & Data Operations)

**Rule:** Never loop over the same collection multiple times to perform operations that can be combined into one pass. Multiple loops over the same data is an O(kn) complexity smell.

**Anti-Pattern (NEVER do this):**
```php
// Loop 1: validate
foreach ($cart as $item) { validate($item); }

// Loop 2: calculate (same data visited again)
foreach ($cart as $item) { $subtotal += calculate($item); }

// Loop 3: update (same data visited again)
foreach ($cart as $item) { $item->update([...]); }
```

**Required Pattern — Use a Processor/DTO:**
```php
// ONE pass. Validate + calculate + prepare — all in one loop.
$processor = (new CartProcessor($this->productService))
    ->process($cart, $products);

$subtotal = $processor->getSubtotal();
$processor->applyStockUpdates();
$transaction->items()->createMany($processor->getTransactionItems());
```

**Rules for Loops:**
- If you find yourself writing `foreach` twice over the same collection, stop and extract a processor class.
- Use `Collection::keyBy('id')` before loops to enable O(1) lookups by ID inside the loop.
- Use bulk operations (`whereIn`, `createMany`, `update`) instead of per-row queries inside loops.
- **N+1 Query Rule:** Never call `Model::find()` inside a `foreach`. Always load all records before the loop with a single `whereIn()`.

**N+1 Anti-Pattern (NEVER do this):**
```php
foreach ($data['items'] as $item) {
    $product = Product::find($item['product_id']); // ← query per item = N+1
}
```

**Required Pattern:**
```php
$productIds = array_column($data['items'], 'product_id');
$products   = Product::whereIn('id', $productIds)->get()->keyBy('id'); // 1 query

foreach ($data['items'] as $item) {
    $product = $products[$item['product_id']]; // ← O(1) memory lookup
}
```

**Reference implementations:**
- `app/Services/POS/CartProcessor.php` — single-pass cart processing
- `app/Services/Reservations/ReservationService::createReservation()` — bulk product loading

---

### 3. Structural Code Architecture (DTOs, Processors, Constants)

#### Data Transfer Objects (DTOs)

When a method needs to pass multiple related computed values between collaborators, use a DTO instead of raw arrays.

**Anti-Pattern:**
```php
// Passing raw arrays with undocumented keys — callers must guess structure
$item = ['price' => 250, 'qty' => 5, 'total' => 1250, 'new_stock' => 10];
```

**Required Pattern:**
```php
// DTOs make structure explicit and self-documenting
$dto = new CartItemDTO($cartItem, $product);
$dto->unitPrice;  // typed, named, obvious
$dto->lineTotal;  // calculated once in constructor
$dto->newStock;   // available without re-computing
```

**Rules for DTOs:**
- DTOs live in `app/Services/{Module}/DTOs/`.
- All calculations happen in the constructor — callers only read properties.
- Properties are `public readonly` (PHP 8.1+) or `public` with PHPDoc `@property-read`.
- DTOs always have a `toArray()` or specific serialization method for DB inserts.

#### Constants Classes

Magic numbers and hardcoded strings are forbidden in service classes. They belong in dedicated constant classes.

**Anti-Pattern (NEVER do this):**
```php
if (RateLimiter::tooManyAttempts($key, 5)) { ... }    // What is 5?
RateLimiter::hit($key, 60);                            // What is 60?
$siNo = 'SEC-' . now()->timestamp;                    // What is 'SEC-'?
```

**Required Pattern:**
```php
use App\Services\Constants\SecurityConstants;

if (RateLimiter::tooManyAttempts($key, SecurityConstants::MAX_PIN_ATTEMPTS)) { ... }
RateLimiter::hit($key, SecurityConstants::PIN_LOCKOUT_SECONDS);
$siNo = SecurityConstants::SECURITY_ALERT_PREFIX . now()->timestamp;
```

**Rules for Constants:**
- Constants live in `app/Services/Constants/`.
- Group by domain: `SecurityConstants`, `InvoiceConstants`, `StockConstants`.
- Every constant must have a PHPDoc `/** */` describing what it controls.
- Frontend constants live in `frontend/src/config/constants.js` as named exports.

**Reference implementations:**
- `app/Services/Constants/SecurityConstants.php`
- `app/Services/Constants/InvoiceConstants.php`
- `app/Services/Constants/StockConstants.php`
- `frontend/src/config/constants.js`

---

### 4. Polymorphism & Separation of Concerns

**Rule:** When a class grows beyond ~150 lines or handles more than one logical concern, it must be split. God classes and god hooks are never acceptable.

#### Backend: Extract Validators and Processors

When a service method validates, calculates, and persists in one block:
1. Extract validation to a `Validators/` class.
2. Extract data preparation to a `Processor` or `DTO`.
3. Keep the service method as an orchestrator that calls these collaborators.

Target method length in services: **< 60 lines**.
Maximum nesting depth: **3 levels**.

#### Frontend: Decompose God Hooks

When a React hook exceeds ~200 lines or manages unrelated state groups:

**Anti-Pattern:**
```js
// 520-line hook managing products + cart + customer + checkout + checkers
export default function usePOS() {
    // 20+ useState declarations all mixed together
}
```

**Required Pattern:**
```js
// Each hook has ONE concern, < 150 lines
export function usePOSProducts() { /* product search and filtering only */ }
export function usePOSCart()     { /* cart state and operations only */    }
export function usePOSCustomer() { /* customer and checker state only */   }

// Root hook composes them — thin orchestrator only
export default function usePOS() {
    const products = usePOSProducts();
    const cart     = usePOSCart();
    const customer = usePOSCustomer();
    return { ...products, ...cart, ...customer };
}
```

**Rules:**
- Hook decomposition must preserve the root hook's public return shape so consumers need zero changes.
- Sub-hooks are named exports; the root hook is the default export.
- Sub-hooks live in the same `hooks/` folder as their parent.

**Reference implementations:**
- `frontend/src/pages/Cashier/POS/hooks/usePOSProducts.js`
- `frontend/src/pages/Cashier/POS/hooks/usePOSCart.js`
- `frontend/src/pages/Cashier/POS/hooks/usePOSCustomer.js`
- `frontend/src/pages/Cashier/POS/hooks/usePOS.js` (orchestrator)

---

### 5. PHPDoc Standards

All public methods in Service classes, Validator classes, DTO classes, and Controller classes must have PHPDoc blocks.

**Required format:**
```php
/**
 * One-sentence description of what the method does.
 *
 * Longer explanation if needed. Describe WHY, not just what.
 * Reference related classes with @see if relevant.
 *
 * @param Type $paramName  What this parameter represents.
 * @return Type            What is returned and when.
 * @throws ExceptionClass  When and why this exception is thrown.
 */
public function methodName(Type $paramName): Type
```

**Rules:**
- `@param` required for every parameter.
- `@return` required unless `void`.
- `@throws` required for every exception type the method can throw.
- `@see` recommended when the method delegates to another class.
- Private methods need a one-line `//` comment only.

---

### 6. Verification Checklist Before Merging Any Refactor

Before merging any refactoring branch, all of the following must pass:

```bash
# Backend: all phase tests must pass
cd backend && php artisan test --filter=Phase

# Frontend: production build must succeed with zero errors
cd frontend && npm run build
```

- ✅ Zero test failures
- ✅ Zero build errors
- ✅ No test assertion changes without explicit user approval
- ✅ Max nesting depth ≤ 3 in all modified methods
- ✅ No magic numbers in service classes
- ✅ No `Model::find()` inside loops
- ✅ PHPDoc on all new public methods
