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




