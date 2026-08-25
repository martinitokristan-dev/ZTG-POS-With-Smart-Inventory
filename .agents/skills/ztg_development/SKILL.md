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

