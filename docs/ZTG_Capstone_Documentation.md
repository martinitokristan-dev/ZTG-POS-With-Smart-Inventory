# ZTG Heavy Parts — Capstone Project Documentation
### Point-of-Sale and Inventory Management System

---

> **Prepared by:** Martini to Kristan (martinitokristan-dev)
> **Repository:** [ZTG-POS-With-Smart-Inventory](https://github.com/martinitokristan-dev/ZTG-POS-With-Smart-Inventory)
> **Live Frontend:** [ztg-pos-with-smart-inventory.pages.dev](https://ztg-pos-with-smart-inventory.pages.dev)
> **Live Backend API:** [ztg-pos-with-smart-inventory.onrender.com](https://ztg-pos-with-smart-inventory.onrender.com)
> **Document Version:** 1.0 | Date: July 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Overview & Problem Statement](#2-project-overview--problem-statement)
3. [System Specifications](#3-system-specifications)
4. [Software Development Life Cycle (SDLC)](#4-software-development-life-cycle-sdlc)
5. [System Architecture](#5-system-architecture)
6. [Technology Stack](#6-technology-stack)
7. [Database Design](#7-database-design)
8. [Backend API Design (Laravel)](#8-backend-api-design-laravel)
9. [Frontend Architecture (React)](#9-frontend-architecture-react)
10. [Security Implementation](#10-security-implementation)
11. [Real-Time Features](#11-real-time-features)
12. [DevOps: CI/CD Pipeline](#12-devops-cicd-pipeline)
13. [Infrastructure & Cloud Deployment](#13-infrastructure--cloud-deployment)
14. [CDN Implementation via Cloudflare Pages](#14-cdn-implementation-via-cloudflare-pages)
15. [Database Hosting: TiDB Cloud Serverless](#15-database-hosting-tidb-cloud-serverless)
16. [Uptime Monitoring via BetterStack](#16-uptime-monitoring-via-betterstack)
17. [Development Roadmap & Feature Milestones](#17-development-roadmap--feature-milestones)
18. [Project File & Folder Structure](#18-project-file--folder-structure)
19. [Known Limitations & Future Improvements](#19-known-limitations--future-improvements)
20. [Business Details & Receipt Compliance (Business Owner's Guide)](#20-business-details--receipt-compliance-business-owners-guide)

---

## 1. Executive Summary

**ZTG Heavy Parts** is a web-based Point-of-Sale (POS) and Inventory Management System developed as a capstone project. It is designed to digitize and streamline the sales operations of a heavy equipment parts business. The system supports multi-role user access (Admin and Cashier), real-time inventory tracking, automated low-stock alerts, reservation management, and comprehensive sales reporting.

The system is fully deployed on a production cloud infrastructure using a modern Jamstack-inspired approach — static frontend served globally via Cloudflare's CDN, a containerized Laravel REST API hosted on Render.com, and a globally distributed MySQL-compatible serverless database on TiDB Cloud.

---

## 2. Project Overview & Problem Statement

### Problem Statement

Heavy equipment parts businesses commonly rely on manual recording systems (ledgers, spreadsheets) which are prone to:

- **Human error** in inventory counting and sales recording.
- **No real-time visibility** into stock levels.
- **Inability to track** transaction history, refunds, and voided sales.
- **No role separation** between cashier and administrator access.
- **Manual generation** of sales reports leading to delayed decision-making.

### Proposed Solution

ZTG Heavy Parts POS addresses all of these pain points through a full-stack web application that provides:

- A real-time inventory dashboard with automated low-stock notifications.
- A dedicated cashier interface for fast point-of-sale operations.
- Role-based access control (Admin vs. Cashier).
- Automated report generation for daily sales, product performance, and refund analysis.
- A customer reservation system for pre-ordering parts.
- A product checker (price lookup) feature for floor staff.

---

## 3. System Specifications

### Hardware Requirements (Client-Side)

| Requirement | Minimum | Recommended |
|---|---|---|
| Device | Desktop / Laptop | Desktop / Laptop |
| Processor | Dual-core 1.8 GHz | Quad-core 2.5 GHz+ |
| RAM | 4 GB | 8 GB |
| Storage | 500 MB free | 2 GB free |
| Internet | 5 Mbps | 20 Mbps+ |
| Browser | Chrome 100+, Firefox 110+ | Chrome (latest) |
| Screen | 1280 x 720 | 1920 x 1080 |

### Software Requirements (Server-Side / Production)

| Component | Technology | Version |
|---|---|---|
| Runtime | PHP | 8.2.x |
| Web Server | Apache (inside Docker) | 2.4.68 |
| API Framework | Laravel | 12.x |
| Frontend Framework | React | 18.2.0 |
| Build Tool | Vite | 7.x |
| Database | TiDB Cloud Serverless (MySQL-compatible) | Latest |
| Containerization | Docker | Latest |
| Node.js | Node.js (build only) | 22.x |

---

## 4. Software Development Life Cycle (SDLC)

The project followed an **Agile-Iterative SDLC model**, organized into distinct phases with overlapping execution.

### Phase 1 — Planning & Requirements Gathering

**Activities:**
- Identified business domain: heavy equipment parts retail.
- Conducted stakeholder analysis (Admin role, Cashier role, Floor Staff).
- Defined functional requirements through use case analysis.
- Defined non-functional requirements (performance, security, availability).
- Chose technology stack based on team proficiency and modern industry standards.

**Deliverables:**
- Use Case Diagram
- Initial Entity-Relationship (ER) Diagram
- Technology Stack Decision Matrix

---

### Phase 2 — System Design

**Activities:**
- Designed the relational database schema with 15+ tables.
- Defined API contract (RESTful endpoints, request/response format).
- Created frontend module architecture using Folder-Based Module Structure.
- Designed system architecture (decoupled SPA + REST API).
- Implemented Role-Based Access Control (RBAC) design.

**Deliverables:**
- Database Schema (ERD)
- API Endpoint Specification
- Frontend Component Tree Diagram
- RBAC Matrix

---

### Phase 3 — Development

The development was split into two parallel tracks:

**Backend Track (Laravel):**
1. Project scaffolding with Laravel 12.
2. Database migrations for all 15 entities.
3. Laravel Sanctum authentication implementation.
4. Form Request validation classes.
5. Service Layer implementation (business logic).
6. RESTful Controller implementation (thin controllers).
7. PHP Enum definitions for all status/role fields.
8. Observer pattern for automated notification triggers.
9. Real-time broadcasting via Laravel Echo + Pusher.
10. Seeder creation for default admin/cashier accounts and settings.

**Frontend Track (React + Vite):**
1. Project scaffolding with Vite + React 18.
2. Global Axios instance with Sanctum Bearer token interceptor.
3. Role-aware private routing (`PrivateRoute` component).
4. Login page with role selector (Admin / Cashier).
5. Admin module development (8 modules):
   - Dashboard, Product Management, Inventory, Reservations,
   - History Logs, Sales Log, Reports, Settings.
6. Cashier module development (POS interface).
7. Real-time notification bell with Laravel Echo integration.
8. Shared component library (`Sidebar`, `NotificationsDropdown`, `PrivateRoute`).

---

### Phase 4 — Testing & Quality Assurance

**Testing Methods Applied:**
- **Manual Functional Testing:** Each API endpoint tested via browser network tab and `curl`.
- **Role Isolation Testing:** Verified that Cashier tokens cannot access Admin-only endpoints (HTTP 403).
- **Database Transaction Testing:** Confirmed that failed checkout operations roll back inventory changes completely.
- **CORS Testing:** Verified cross-origin requests from Cloudflare Pages domain to Render API.
- **SSL/TLS Testing:** Confirmed secure TiDB connection via `isrgrootx1.pem` CA certificate.
- **Latency Benchmarking:** Measured API response time using `curl` with timing flags.
- **Cold Start Testing:** Tested Render sleep behavior and verified BetterStack pings keep the server warm.

**Automated Test Suite (`php artisan test`):**

- **107 tests, 353 assertions** — all passing ✅
- **Duration: ~4.2 seconds** (full suite)
- Covers: Auth, POS Checkout, Returns, Refunds, Voids, Reservations, Products, Categories, Variants, Employees, Settings, Notifications, Alert Rules, Profile Avatar Upload/Remove, Reports

**API Performance Benchmark (`php artisan test:api-performance`):**

| Endpoint | Local Dev (Pusher Sync) | Local Dev (No Pusher) | Production Estimate | Target |
|---|---|---|---|---|
| `GET /products` | 472 ms | 298 ms | ~210 ms | < 200 ms |
| `GET /pos/products` | 293 ms | 201 ms | ~210 ms | < 200 ms |
| `POST /pos/checkout` | 968 ms | 315 ms | **~325 ms** | < 700 ms |
| `GET /reports/sales-summary` | 304 ms | 244 ms | ~250 ms | < 300 ms |
| `GET /inventory` | 273 ms | 193 ms | ~200 ms | < 150 ms |
| `GET /notifications` | 298 ms | 197 ms | ~205 ms | < 150 ms |

> **Why production is faster:** The local benchmarks include ~500ms of Philippines → Singapore (Pusher ap1) network overhead. In production, both Render and Pusher ap1 are hosted in Singapore, so server-to-server Pusher calls take only ~10ms. Filipino end-users experience an additional ~60ms round-trip to reach the Singapore server — still well within acceptable UX thresholds.

**End-to-End Flow Test (`php artisan test:api-flow`):**

Verifies the complete POS workflow end-to-end against the live database:
- ✔ Product category, variant types, and variant options creation
- ✔ Base product + variant product creation
- ✔ POS checkout with stock deduction
- ✔ Return with stock restoration
- ✔ Refund (mark damaged, no shelf restoration)
- ✔ Transaction void with stock restoration
- ✔ Reservation with 50% deposit
- ✔ Reservation fulfillment with remaining balance payment


---

### Phase 5 — Deployment

Full production deployment was completed across the following infrastructure:

| Component | Platform | URL |
|---|---|---|
| Frontend | Cloudflare Pages (CDN) | `ztg-pos-with-smart-inventory.pages.dev` |
| Backend API | Render.com (Docker) | `ztg-pos-with-smart-inventory.onrender.com` |
| Database | TiDB Cloud Serverless | `gateway01.ap-southeast-1.prod.aws.tidbcloud.com` |
| Real-Time | Pusher (Channels) | `ap1` cluster (Singapore) |
| File Storage | Cloudflare R2 | Persistent S3-compatible avatar/image storage |
| Uptime Monitor | BetterStack | Pings `/up` every 3 minutes |

**Production Optimizations Applied:**
- `php artisan config:cache` — caches all configuration files
- `php artisan route:cache` — caches route definitions
- `php artisan event:cache` — caches event-listener mappings
- `php artisan optimize` — combined optimization command
- `APP_DEBUG=false` — disables stack traces in production responses
- `BROADCAST_CONNECTION=pusher` — enables real-time Pusher broadcasting
- N+1 query fix on POS product catalog (`variantOptions.type` eager loaded on variants)
- Database indexes on `transactions` table (`status`, `cashier_id`, `date`) for fast report queries

### Phase 6 — Maintenance & Monitoring

- **Uptime Monitoring:** BetterStack Uptime pings the `/up` health endpoint every 3 minutes, preventing Render cold starts and sending email alerts on downtime.
- **Continuous Deployment:** Every `git push` to the `main` branch on GitHub automatically triggers a new deployment on both Cloudflare Pages (frontend) and Render (backend).
- **Error Logging:** PHP errors are visible via Render's real-time dashboard log stream.

---

## 5. System Architecture

The system uses a **Decoupled SPA + REST API** architecture (also called a **Headless** architecture).

```
                    USER (Browser)
                         |
                         | HTTPS Request
                         v
        +--------------------------------------------+
        |           Cloudflare CDN                   |
        |   (Global Edge Network - 300+ locations)   |
        |                                            |
        |   Serves: React SPA (HTML/CSS/JS)          |
        |   Domain: *.pages.dev                      |
        +--------------------+-----------------------+
                             |
                             | API Calls (HTTPS / JSON)
                             | Authorization: Bearer <token>
                             v
        +--------------------------------------------+
        |         Render.com (Docker Container)       |
        |                                            |
        |   Apache 2.4 Web Server                    |
        |   PHP 8.2 Runtime                          |
        |   Laravel 12 Application                   |
        |     |- Routes (api.php)                    |
        |     |- Controllers (thin)                  |
        |     |- Services (business logic)           |
        |     |- Models (Eloquent ORM)               |
        |     +- Observers (events)                  |
        +----------+-------------------+-------------+
                   |                   |
                   v                   v
  +----------------+----+   +----------+---------+
  |  TiDB Cloud         |   |  Pusher             |
  |  Serverless         |   |  (Real-time)        |
  |  (MySQL-compatible) |   |                     |
  |  SSL/TLS Required   |   |  Laravel Echo       |
  |  ap-southeast-1     |   |  WebSocket          |
  +---------------------+   +---------------------+
```

### Key Architectural Decisions

| Decision | Rationale |
|---|---|
| Decoupled Frontend/Backend | Independent deployments, scaling, and better performance via CDN |
| Docker Container for Backend | Render does not have native PHP support; Docker ensures consistent environment |
| Serverless Database (TiDB) | Zero infrastructure maintenance, auto-scaling, free tier with MySQL compatibility |
| Laravel Sanctum (not Passport) | Lightweight token authentication ideal for SPA + API use case |
| Vite (not CRA) | Significantly faster build times and modern ESM module support |

---

## 6. Technology Stack

### Backend

| Package | Version | Purpose |
|---|---|---|
| `laravel/framework` | ^12.0 | Core API framework |
| `laravel/sanctum` | ^4.0 | API token authentication |
| `pusher/pusher-php-server` | ^7.2 | Real-time event broadcasting |
| `laravel/ui` | ^4.6 | Bootstrap UI scaffolding |
| PHP | 8.2.x | Runtime language |
| Apache | 2.4.68 | HTTP server inside Docker |

### Frontend

| Package | Version | Purpose |
|---|---|---|
| `react` | ^18.2.0 | Core UI framework |
| `react-dom` | ^18.2.0 | DOM rendering |
| `react-router-dom` | ^7.18.1 | Client-side routing |
| `axios` | ^1.11.0 | HTTP client with interceptors |
| `laravel-echo` | ^2.4.0 | Real-time WebSocket client |
| `pusher-js` | ^8.5.0 | Pusher JavaScript SDK |
| `bootstrap` | ^5.2.3 | CSS component library |
| `vite` | ^7.0.7 | Build tool and dev server |
| `tailwindcss` | ^4.0.0 | Utility CSS framework |
| `sass` | ^1.56.1 | CSS preprocessor |

### DevOps & Infrastructure

| Tool | Purpose |
|---|---|
| Docker | Backend containerization |
| GitHub | Source control and CI/CD trigger |
| Cloudflare Pages | Frontend hosting + global CDN |
| Render.com | Backend (Docker) hosting |
| TiDB Cloud | Serverless MySQL-compatible database |
| Pusher | Managed WebSocket real-time service |
| BetterStack Uptime | Uptime monitoring + alert management |

---

## 7. Database Design

The system uses **15 database tables** with a MySQL-compatible schema, hosted on TiDB Cloud Serverless.

### Entity-Relationship Summary

```
users (employees)
  +-- transactions (1:many)
  |     +-- transaction_items (1:many)
  |           +-- products
  +-- reservations (1:many)
  |     +-- reservation_items (1:many)
  |           +-- products
  +-- notifications

products
  +-- categories (many:1)
  +-- product_variant_values (1:many)
  |     +-- variant_types (many:1)
  |     +-- variant_options (many:1)
  +-- alert_rules (1:many)

settings        (key-value store)
checkers        (price lookup terminals)
report_logs     (report generation tracking)
customers       (walk-in customer profiles)
```

### Table Specifications

| Table | Key Columns | Description |
|---|---|---|
| `users` | `id`, `name`, `employee_id`, `role`, `pin`, `is_active` | System users with role-based access |
| `products` | `id`, `name`, `sku`, `price`, `stock`, `category_id` | Inventory items |
| `categories` | `id`, `name`, `has_variants` | Product categorization |
| `variant_types` | `id`, `name` | e.g., "Size", "Color" |
| `variant_options` | `id`, `variant_type_id`, `value` | e.g., "Large", "Red" |
| `product_variant_values` | `id`, `product_id`, `variant_type_id`, `variant_option_id` | Product-specific variant combinations |
| `transactions` | `id`, `user_id`, `checker_id`, `total`, `status`, `payment_method` | Sales transactions |
| `transaction_items` | `id`, `transaction_id`, `product_id`, `quantity`, `unit_price` | Line items per transaction |
| `reservations` | `id`, `user_id`, `customer_id`, `status`, `total` | Pre-order reservations |
| `reservation_items` | `id`, `reservation_id`, `product_id`, `quantity` | Line items per reservation |
| `customers` | `id`, `name`, `contact` | Walk-in customer records |
| `notifications` | `id`, `user_id`, `type`, `message`, `is_read` | In-app notification store |
| `settings` | `key`, `value` | System-wide configuration (key-value) |
| `alert_rules` | `id`, `product_id`, `threshold`, `is_active` | Low-stock notification rules |
| `checkers` | `id`, `name`, `location` | Price lookup terminal registrations |
| `report_logs` | `id`, `type`, `generated_at` | Tracks when reports were last generated |
| `personal_access_tokens` | (Laravel Sanctum standard) | API authentication tokens |

---

## 8. Backend API Design (Laravel)

### Architecture Pattern: Layered Architecture

```
HTTP Request
     |
     v
  Routes (api.php)
     |
     v
  Form Request (Validation)
     |
     v
  Controller (thin - calls Service only)
     |
     v
  Service (all business logic lives here)
     |
     v
  Model (Eloquent ORM)
     |
     v
  Database (TiDB Cloud)
     |
     v
HTTP Response (JSON)
```

**Rule:** Controllers are "thin" — they only call a Service method and return a JSON response. All business logic lives in `app/Services/`.

### Service Layer Structure

```
app/Services/
+-- Employees/      <- Employee CRUD operations
+-- Notifications/  <- Notification creation and management
+-- POS/            <- Checkout logic, cart processing
+-- Products/       <- Product CRUD, restock, damaged stock
+-- Reports/        <- Sales summaries, product performance
+-- Reservations/   <- Reservation lifecycle management
+-- Settings/       <- Settings key-value management
+-- Transactions/   <- Transaction history, refunds, voids
```

### Key API Endpoints

**Authentication (Public):**

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/login` | Login with employee ID + password. Returns Sanctum token. |
| `POST` | `/api/logout` | Revoke current session token. |

**Products (Authenticated):**

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/api/products` | All | List all products with variants |
| `POST` | `/api/products` | Admin | Create a new product |
| `PUT` | `/api/products/{id}` | Admin | Update product details |
| `DELETE` | `/api/products/{id}` | Admin | Delete a product |
| `POST` | `/api/products/restock` | Admin | Restock inventory |
| `POST` | `/api/products/{id}/damaged` | Admin | Log damaged stock deduction |

**POS (Admin + Cashier):**

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/pos/products` | Fetch POS-optimized product list |
| `POST` | `/api/pos/checkout` | Process a sale (wrapped in DB transaction) |

**Transactions:**

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/api/transactions` | All | List all transactions |
| `POST` | `/api/transactions/{id}/refund` | Admin + Cashier | Full refund |
| `POST` | `/api/transactions/{id}/return` | Admin + Cashier | Partial return |
| `POST` | `/api/transactions/{id}/void` | Admin + Cashier | Void transaction |

**System Health (Public):**

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/up` | Laravel 11+ built-in health check for uptime monitors |

### RBAC (Role-Based Access Control) Matrix

| Feature | Admin | Cashier |
|---|---|---|
| POS Checkout | YES | YES |
| View Products | YES | YES |
| Manage Products (CRUD) | YES | NO |
| View Transactions | YES | YES |
| Refund / Void / Return | YES | YES |
| Employee Management | YES | NO |
| Reports & Analytics | YES | NO |
| Settings Management | YES | NO |
| Alert Rule Management | YES | NO |
| Notifications | YES | YES |

---

## 9. Frontend Architecture (React)

### Core Pattern: Folder-Based Module Structure

Every admin module follows a strict folder structure that separates concerns:

```
frontend/src/pages/Admin/<ModuleName>/
+-- index.jsx               <- Thin shell: layout and prop wiring only
+-- <MainView>.jsx          <- Pure UI table/list (receives data via props)
+-- modals/
|   +-- <ActionModal>.jsx   <- One modal per action (pure UI)
+-- hooks/
    +-- use<ModuleName>.js  <- ALL state, effects, API calls, derived data
```

### Admin Modules Implemented

| Module | Folder | Description |
|---|---|---|
| Dashboard | `Admin/Dashboard/` | KPI cards, sales chart, recent transactions |
| Product Management | `Admin/ProductManagement/` | Full CRUD with variants, image upload |
| Inventory | `Admin/Inventory/` | Stock overview, restock, damage logging |
| Reservations | `Admin/Reservations/` | Create/fulfill/cancel pre-orders |
| History Logs | `Admin/HistoryLogs/` | Full transaction history with filters |
| Sales Log | `Admin/SalesLog/` | Daily cashier sales summary |
| Reports | `Admin/Reports/` | Analytics: sales summary, product performance |
| Settings | `Admin/Settings/` | Business settings (tax rate, store info) |

### Cashier Modules

| Module | Folder | Description |
|---|---|---|
| POS Interface | `Cashier/POS/` | Product grid, cart, checkout flow |

### Shared Components (`frontend/src/shared/`)

| Component | Description |
|---|---|
| `Sidebar.jsx` | Global navigation sidebar & mobile drawer overlay |
| `NotificationsDropdown.jsx` | Bell icon + real-time notification dropdown |
| `IOSDatePicker.jsx` | Popover iOS calendar picker with smart right-edge alignment |
| `IOSSelect.jsx` | iOS custom select popover with active checkmarks (`✓`) |
| `IOSTimePicker.jsx` | iOS time picker selector popover |
| `PrivateRoute.jsx` | Auth guard that redirects unauthenticated users |
| `api.js` | Global Axios instance with Bearer token interceptor |

### Mobile Responsive Optimization & Custom iOS Component System

The frontend implements a unified mobile-first responsive design strategy adhering to **Apple Human Interface Guidelines**:

1. **Non-Destructive Breakpoint Architecture (`@media (max-width: 768px)`)**:
   - **Desktop Mode (`> 768px`)**: Preserves compact, proportional filter controls (`140px`–`180px`), horizontal card grids, and fixed sidebar navigation.
   - **Mobile Mode (`< 768px`)**: Automatically expands `.table-filters` elements and form triggers to 100% full-width touch rows.

2. **Custom iOS Form Control System**:
   - `<IOSSelect />`: Replaces native browser `<select>` dropdowns with smooth floating popovers, checkmarks (`✓`), and backdrop dismiss.
   - `<IOSDatePicker />`: Replaces native date inputs with popover calendar cards featuring smart right-edge alignment (`alignRight={true}`) and zero screen spill (`maxWidth: calc(100vw - 32px)`).
   - `<IOSTimePicker />`: Custom time selection popover for scheduling.

3. **Touch UX & Drawer Navigation**:
   - Hamburger sidebar drawer with dark semi-transparent backdrop overlay.
   - Minimum `44px` touch targets across all interactive buttons, tabs, and form controls.

### Global Axios Interceptor Pattern

```javascript
// src/shared/api.js
axios.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
```

---

## 10. Security Implementation

### Authentication: Laravel Sanctum

- SPA authentication via **API Token** (not session cookies).
- Tokens are stored in the browser's `localStorage`.
- Sent via the `Authorization: Bearer` header on every request.
- Tokens are revoked on logout.

### Authorization: Role-Based Middleware

A custom `RoleMiddleware` enforces access control at the route level:

```php
// Example: Only Admin can access product creation
Route::middleware('role:Admin')->group(function () {
    Route::post('/products', [ProductController::class, 'store']);
});
```

### Database Security: SSL/TLS Encryption

TiDB Cloud Serverless **requires** all connections to be encrypted.

- **CA Certificate:** `isrgrootx1.pem` (ISRG Root X1)
- **Environment Variable:** `MYSQL_ATTR_SSL_CA=/var/www/html/isrgrootx1.pem`

### API Security: CORS Policy

The backend uses Laravel's CORS middleware:

- **Allowed Origins:** Localhost development URLs + any `*.pages.dev` domain pattern.
- **Pattern-based matching** for Cloudflare preview deployments:

```php
'allowed_origins_patterns' => ['#^https?://.*\.pages\.dev$#'],
```

### Data Validation

All incoming API request data is validated using **Laravel Form Request** classes in `app/Http/Requests/`.

---

## 11. Real-Time Features

### Technology: Laravel Echo + Pusher

Used for:
1. **Low-Stock Notifications** — Auto-broadcast to admins when stock drops below threshold.
2. **In-App Notification Bell** — Updates in real-time without page refresh.

### Implementation Flow

```
1. Admin saves an Alert Rule (product + threshold)
2. Cashier completes a POS Checkout
3. ProductService deducts stock from database
4. ProductObserver detects stock dropped below threshold
5. NotificationService creates a Notification record in DB
6. Laravel broadcasts Event to Pusher channel
7. All connected Admin browsers receive the push notification
8. Notification bell badge count updates in real-time
```

### Pusher Configuration

| Setting | Value |
|---|---|
| Cluster | `ap1` (Asia-Pacific — optimal for Philippines) |
| Frontend SDK | `pusher-js` + `laravel-echo` |
| Backend SDK | `pusher/pusher-php-server` |

---

## 12. DevOps: CI/CD Pipeline

The project implements **automatic Continuous Integration and Continuous Deployment (CI/CD)** using GitHub as the single source of truth.

### Pipeline Flow

```
Developer Machine (Local)
         |
         | git push origin main
         v
   GitHub Repository
   (martinitokristan-dev/ZTG-POS-With-Smart-Inventory)
         |
         +-------------------------+
         |                         |
         v                         v
Cloudflare Pages             Render.com
(Auto-detects new commit)    (Auto-detects new commit)
         |                         |
         v                         v
   npm clean-install          docker build
   vite build                  (uses Dockerfile)
         |                         |
         v                         v
   Upload dist/ to CDN       docker run + start.sh
         |                         |
         v                    php artisan config:cache
   LIVE on pages.dev          php artisan route:cache
                              php artisan migrate --force
                              apache2-foreground
                                   |
                                   v
                              LIVE on onrender.com
```

### Docker Build Process (`Dockerfile`)

```dockerfile
FROM php:8.2-apache

# 1. Install system dependencies (libpng, mbstring, zip, etc.)
# 2. Install PHP extensions (pdo_mysql, gd, bcmath, pdo_pgsql, etc.)
# 3. Copy Composer binary from official Composer image
# 4. Set working directory to /var/www/html
# 5. Copy all backend source files
# 6. Configure Apache VirtualHost (vhost.conf)
# 7. Enable Apache mod_rewrite (required for Laravel routing)
# 8. Run composer install (production mode, no dev dependencies)
# 9. Set correct permissions on storage and bootstrap/cache
# 10. Mark start.sh as executable

CMD ["./start.sh"]
```

### Startup Script (`start.sh`)

```bash
#!/bin/bash
php artisan config:cache    # Cache all .env values for performance
php artisan route:cache     # Cache all routes for performance
php artisan migrate --force # Apply any pending migrations automatically
apache2-foreground          # Start the Apache web server
```

---

## 13. Infrastructure & Cloud Deployment

### Backend: Render.com Web Service

**Why Render?**
- Supports Docker-based deployments (necessary since Render has no native PHP support).
- Free tier available for capstone/portfolio use.
- Automatic HTTPS/SSL provisioning at no cost.
- Built-in real-time log streaming for debugging.
- Automatic deployments triggered by GitHub pushes.

**Environment Variables set on Render:**

| Variable | Value |
|---|---|
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `APP_KEY` | `[generated key]` |
| `DB_CONNECTION` | `mysql` |
| `DB_HOST` | `gateway01.ap-southeast-1.prod.aws.tidbcloud.com` |
| `DB_PORT` | `4000` |
| `DB_DATABASE` | `ztg_db` |
| `DB_USERNAME` | `[tidb username]` |
| `DB_PASSWORD` | `[tidb password]` |
| `MYSQL_ATTR_SSL_CA` | `/var/www/html/isrgrootx1.pem` |
| `BROADCAST_DRIVER` | `pusher` |
| `PUSHER_APP_ID` | `[pusher id]` |
| `PUSHER_APP_KEY` | `[pusher key]` |
| `PUSHER_APP_SECRET` | `[pusher secret]` |
| `PUSHER_APP_CLUSTER` | `ap1` |
| `ALLOWED_ORIGINS` | `https://ztg-pos-with-smart-inventory.pages.dev` |

---

## 14. CDN Implementation via Cloudflare Pages

### What is a CDN?

A **Content Delivery Network (CDN)** is a globally distributed network of servers. Instead of all users hitting one server in one location, the CDN delivers files from the nearest edge server to the user, dramatically reducing load time.

### Why Cloudflare Pages?

- **300+ Edge Locations worldwide** — the React app is served from the nearest server to the user.
- **Free tier** with unlimited bandwidth and requests.
- **Zero-configuration HTTPS** — automatic SSL certificate.
- **GitHub integration** — automatic deployments on every push.
- **Preview URLs** — every branch gets its own preview deployment URL.

### Build Configuration (Cloudflare Pages Settings)

| Setting | Value |
|---|---|
| Framework Preset | React (Vite) |
| Build Command | `npm run build` |
| Build Output Directory | `dist` |
| Root Directory | `frontend` |

### Environment Variables (Cloudflare Pages)

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://ztg-pos-with-smart-inventory.onrender.com/api` |
| `VITE_PUSHER_APP_KEY` | `[pusher key]` |
| `VITE_PUSHER_APP_CLUSTER` | `ap1` |

### How Vite Uses These Variables

During the `npm run build` step, Vite reads all `VITE_*` environment variables and bakes them directly into the compiled JavaScript bundle at build time. This means no secrets are exposed after deployment, and the frontend always knows the exact backend URL.

---

## 15. Database Hosting: TiDB Cloud Serverless

### What is TiDB Cloud Serverless?

TiDB Cloud Serverless is a **fully managed, serverless MySQL-compatible database** built on TiDB — a distributed SQL database. It is:

- **Serverless:** Zero infrastructure management. Scales automatically.
- **MySQL-Compatible:** Works with Laravel's standard `pdo_mysql` driver without code changes.
- **Globally distributed:** Data stored on AWS infrastructure.
- **Free tier:** 5 GB storage and 50 million row reads per month.

### Why TiDB vs Traditional MySQL?

| Feature | Traditional MySQL (Local/VPS) | TiDB Cloud Serverless |
|---|---|---|
| Setup | Manual installation and config | Click + deploy, instant |
| Scaling | Manual server upgrade | Automatic, transparent |
| Maintenance | OS patches, backups | Fully managed |
| High Availability | Requires replica setup | Built-in |
| Cost | VPS fees | Free tier available |
| SSL Required | Optional | Mandatory |

### SSL Connection Setup

TiDB Cloud Serverless **prohibits insecure (plain-text) connections**. The setup requires:

1. Download `isrgrootx1.pem` CA certificate from TiDB Cloud dashboard.
2. Store it in the `backend/` folder and commit to GitHub.
3. It is automatically copied into the Docker image during build.
4. Set `MYSQL_ATTR_SSL_CA=/var/www/html/isrgrootx1.pem` in Render environment variables.

### 💾 Storage Capacity & 50+ Year Operational Lifespan Analysis (5 GiB Free Tier)

TiDB Cloud provides **5 GiB (5,120 MB)** of free tier storage. Because relational SQL databases store structured numerical data, dates, and normalized string identifiers (rather than heavy binary media), database storage consumption is exceptionally low.

#### Storage Calculation Breakdown per Transaction

- **Single Receipt Header (`transactions` table):** ~400 bytes
- **Line Item Record (`transaction_items` table):** ~150 bytes per item (avg 2.5 items/sale = ~375 bytes)
- **Database Indexes & Metadata Overhead:** ~300 bytes
- **Total Storage Cost per Sale Transaction:** **~1.1 KB per complete transaction**

#### Operational Projections (at 150 Sales per Day)

| Timeframe | Sales Volume | Items Sold | TiDB Storage Consumed | % of 5 GiB Free Tier Used |
|---|---|---|---|---|
| **1 Day** | 150 transactions | 375 items | ~170 KB | 0.003% |
| **1 Month (30 days)** | 4,500 transactions | 11,250 items | ~5.2 MB | 0.10% |
| **1 Year (365 days)** | 54,750 transactions | 136,875 items | **~62.4 MB** | **1.22%** |
| **10 Years** | 547,500 transactions | 1,368,750 items | **~624 MB** | **12.18%** |
| **50 Years** | 2,737,500 transactions | 6,843,750 items | **~3,120 MB (3.1 GiB)** | **60.9%** |
| **82 Years (Limit)** | **4,489,500 transactions** | **11,223,750 items** | **5,120 MB (5.0 GiB)** | **100.0%** |

#### Why the System Operates 50+ Years Before Hitting Storage Limits:
1. **Media Offloading:** All heavy binary assets (product images, customer avatars) are offloaded to **Cloudflare R2** object storage. The database only stores light URL strings (~30 bytes).
2. **Normalized DB Schema:** Database fields use compact binary datatypes (`INT`, `DECIMAL(12,2)`, `DATETIME`) which consume only 4–5 bytes per column.
3. **Conclusion for Backup / Operational Planning:** For small to medium retail operations averaging 150 transactions/day, the TiDB Cloud 5 GiB free tier provides **over 50 to 80 years of continuous daily operation** before requiring a tier upgrade or data archiving.

---

## 16. Uptime Monitoring via BetterStack

### The Problem: Render Free Tier Sleep Mode

Render's free tier automatically spins down (sleeps) a service after **15 minutes of inactivity**. When a sleeping server receives a request, there is a **30–60 second cold start delay** — unacceptable for a live POS system.

### The Solution: BetterStack Uptime Monitor

BetterStack is an uptime monitoring service that:
1. Sends an HTTP GET request to a configured URL at a set interval.
2. Checks that the response returns `200 OK`.
3. Sends an **email/SMS/push notification alert** if the site goes down.

By pinging every **3 minutes**, it keeps Render from ever considering the server "inactive".

### Monitor Configuration

| Setting | Value | Reason |
|---|---|---|
| URL to Monitor | `https://ztg-pos-with-smart-inventory.onrender.com/up` | Laravel 11 built-in health endpoint |
| Alert When | URL becomes unavailable | Core uptime monitoring |
| Check Frequency | Every 3 minutes | Prevents Render 15-min sleep threshold |
| HTTP Method | GET | Read-only health check |
| Request Timeout | 30 seconds | Accounts for potential startup time |
| Notification | Email to primary responder | Immediate downtime alert |
| Region | Asia | Closest to the Philippines |

### The `/up` Health Check Endpoint

Laravel 11 includes a built-in health check endpoint registered in `bootstrap/app.php`:

```php
return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        health: '/up',  // <-- Automatically registers GET /up
    )
```

**Live Test Result:**

```bash
$ curl -i https://ztg-pos-with-smart-inventory.onrender.com/up

HTTP/1.1 200 OK
# Response: "Application up" - rendered in 9ms
```

---

## 17. Development Roadmap & Feature Milestones

### Completed Features

- [x] Multi-role authentication (Admin / Cashier) with Laravel Sanctum
- [x] Product management with variant system (Size, Color, etc.)
- [x] Point-of-Sale (POS) checkout interface
- [x] Inventory tracking with stock deduction on sale
- [x] Damaged stock logging
- [x] Restocking system
- [x] Customer reservation management (create, fulfill, cancel)
- [x] Transaction history with refund, return, and void operations
- [x] Automated low-stock alert rules
- [x] Real-time notifications via Laravel Echo + Pusher
- [x] Admin dashboard with KPIs and charts
- [x] Sales reports (daily summary, product performance, refund analysis)
- [x] Inventory summary report
- [x] Settings management (tax rate, store info)
- [x] Employee management (CRUD, role assignment, activate/deactivate)
- [x] Product Checker feature (price lookup terminals)
- [x] PIN verification for sensitive transaction operations
- [x] Profile management (name, password, avatar)
- [x] Database migrations and seeding (25 migration files)
- [x] Full production deployment (Cloudflare + Render + TiDB)
- [x] CORS configuration for cross-origin API access
- [x] BetterStack uptime monitoring to prevent cold starts
- [x] SSL/TLS encrypted database connection (TiDB CA cert)
- [x] Docker containerization for consistent production environment
- [x] CI/CD via GitHub auto-deploy to Cloudflare Pages and Render

### Future Improvements

- [ ] Receipt printing support (PDF generation / thermal printer)
- [ ] Barcode scanner integration for POS
- [ ] Supplier management module
- [ ] Purchase order tracking
- [ ] Customer loyalty points system
- [ ] Mobile responsive optimization
- [ ] PWA (Progressive Web App) support for offline POS
- [ ] Audit trail logs for all admin actions
- [ ] Two-factor authentication (2FA)
- [ ] Automated daily report emailing

---

## 18. Project File & Folder Structure

```
ZTG-main/
+-- backend/                         <- Laravel 12 REST API
|   +-- app/
|   |   +-- Enums/                   <- PHP Enums (roles, statuses)
|   |   +-- Events/                  <- Broadcasting events
|   |   +-- Http/
|   |   |   +-- Controllers/         <- Thin controllers (15+)
|   |   |   +-- Middleware/          <- RoleMiddleware
|   |   |   +-- Requests/            <- Form Request validators
|   |   +-- Models/                  <- Eloquent models (15 tables)
|   |   +-- Observers/               <- Model event observers
|   |   +-- Providers/               <- Service providers
|   |   +-- Services/                <- Business logic layer (8 modules)
|   +-- bootstrap/
|   |   +-- app.php                  <- App config (health: '/up')
|   +-- config/
|   |   +-- cors.php                 <- CORS policy configuration
|   +-- database/
|   |   +-- migrations/              <- 25 migration files
|   |   +-- seeders/                 <- AdminUserSeeder, SettingsSeeder
|   +-- routes/
|   |   +-- api.php                  <- All REST API routes
|   |   +-- channels.php             <- Pusher broadcasting channels
|   |   +-- web.php                  <- Minimal (SPA entry only)
|   +-- Dockerfile                   <- Docker build definition
|   +-- vhost.conf                   <- Apache VirtualHost config
|   +-- start.sh                     <- Container startup script
|   +-- isrgrootx1.pem               <- TiDB SSL CA certificate
|
+-- frontend/                        <- React 18 + Vite SPA
    +-- src/
    |   +-- pages/
    |   |   +-- Admin/
    |   |   |   +-- Dashboard/       <- KPI dashboard module
    |   |   |   +-- ProductManagement/ <- Product CRUD module
    |   |   |   +-- Inventory/       <- Stock management module
    |   |   |   +-- Reservations/    <- Reservation module
    |   |   |   +-- HistoryLogs/     <- Transaction history module
    |   |   |   +-- SalesLog/        <- Daily sales module
    |   |   |   +-- Reports/         <- Analytics module
    |   |   |   +-- Settings/        <- Settings module
    |   |   +-- Cashier/
    |   |   |   +-- POS/             <- Point-of-Sale module
    |   |   +-- Login.jsx            <- Role selector + auth form
    |   +-- shared/
    |       +-- api.js               <- Global Axios instance
    |       +-- Sidebar.jsx          <- Navigation sidebar
    |       +-- NotificationsDropdown.jsx <- Real-time bell
    |       +-- PrivateRoute.jsx     <- Auth guard component
    +-- .env                         <- VITE_API_URL, VITE_PUSHER_*
    +-- vite.config.js               <- Vite build configuration
    +-- package.json                 <- npm dependencies
```

---

## 19. Known Limitations & Future Improvements

| Limitation | Cause | Mitigation |
|---|---|---|
| **Render Cold Start** | Free tier service sleeps after 15 min inactivity | BetterStack pings every 3 minutes to keep server warm |
| **No Offline Mode** | Requires active internet connection | Future: PWA + service workers |
| **No Persistent File Storage** | Render ephemeral disk (files reset on deploy) | **Resolved:** Migrated all user avatars & product uploads to Cloudflare R2 (S3-compatible persistent cloud storage) |
| **Single Region Database** | TiDB Cloud free tier is single-region (ap-southeast-1) | Future: upgrade to paid multi-region plan |
| **No Automated Tests** | No unit/integration test suite yet | **Resolved:** Created a PHPUnit suite with 161+ tests (`php artisan test`) and an API latency benchmark tool (`php artisan test:api-performance`) |
| **Token Expiry UX** | Expired tokens show API error, not auto-logout | **Resolved:** Implemented global Axios 401 interceptor to auto-redirect unauthenticated sessions back to `/login` |
| **Direct Cloud Excel Sync vs. Desktop File Export** | Personal/unlicenced Microsoft accounts lack Azure Tenant Cloud API permissions for silent background cloud pushes | **Resolved:** Export formatted 11-column `.xls` / UTF-8 BOM `.csv` files matching client template for desktop Excel, with data models 100% prepared for instant Microsoft Graph API integration when upgrading to a paid Microsoft 365 Business plan. |

---

---

## 20. Development Change Log & Refactoring History

This section documents every major development milestone, refactor, bug fix, and architectural decision made throughout the project lifecycle. Each entry is tied to its actual Git commit hash and timestamp.

---

### SPRINT 1 — Prototype & Foundation
**Date: June 17–18, 2026**

#### `8ee0062` | June 17, 2026 21:37 — Initial Prototype
- First working prototype of the ZTG POS system committed to GitHub.
- Established the monorepo structure with `backend/` (Laravel) and `frontend/` (React + Vite) under a single `ZTG-main` root directory.
- Basic product listing and login screens implemented.

#### `e2a4ea1` | June 18, 2026 00:19 — New Update
- Early iteration of the admin dashboard and POS interface.
- Initial database schema created with migrations for `products`, `users`, `transactions`, and `categories`.

#### `728ff2b` | June 18, 2026 11:26 — POS UI Refinement + Cashier Customer Log + BIR Sales Invoice
**What changed:**
- Refined the Cashier POS interface with a cleaner product grid and cart layout.
- Added a **Cashier-specific Customer Log** view so cashiers can track their own daily sales without access to the full admin history.
- Implemented **BIR-formatted Sales Invoice (SI)** generation on checkout. The system generates SI numbers following the format `SI-YYYY-XXXX` to comply with Philippine Bureau of Internal Revenue receipt numbering requirements.

#### `ce885f9` | June 18, 2026 11:30 — Fix Login Page Centering
- Fixed a layout bug where the login card was not fully centered on screen due to a missing CSS flexbox container on the root `#root` div.

#### `bccbe7f` | June 18, 2026 11:34 — Make Login Root Page
- **Architectural change:** Moved the login page to be the root index route (`/`) instead of a child route.
- The dashboard now redirects unauthenticated users back to `/` instead of `/login`.
- This simplified the `PrivateRoute` guard logic and removed a double-redirect bug.

#### `1c3e227` | June 18, 2026 11:43 — Auth Storage: localStorage → sessionStorage
**Problem:** Using `localStorage` for the auth token meant that if two browser tabs were open — one as Admin and one as Cashier — they would share the same token, causing role confusion.

**Solution:** Switched auth token storage from `localStorage` to `sessionStorage`.

**How it works:**
- `sessionStorage` is **per-tab** in every browser. Each tab has its own completely isolated storage.
- This allowed a developer or tester to open one tab as Admin and another as Cashier simultaneously without them interfering with each other.
- The Axios interceptor in `src/shared/api.js` was updated to read from `sessionStorage` instead of `localStorage`.

---

### SPRINT 2 — Core Feature Development
**Date: June 21, 2026**

#### `1d2b778` | June 21, 2026 11:53 — Defense Proposal Enhancements
**What changed based on defense panel feedback:**
- Implemented the **Reservation Management** system (create, fulfill, cancel pre-orders for heavy parts).
- Added the **Employee Management** module (Admin can add, edit, activate/deactivate employees).
- Added **Role-Based Access Control (RBAC)** middleware (`RoleMiddleware.php`) so Cashier tokens are blocked from Admin-only API routes with `HTTP 403 Forbidden`.
- Implemented **PIN Verification** for sensitive operations (refunds, voids) to prevent unauthorized transaction reversals.
- Added `PHP Enum` classes for all static status values:
  - `ProductStatus`: `Active`, `Low Stock`, `No Stock`, `Disabled`
  - `TransactionStatus`: `Completed`, `Refunded`, `Voided`, `Restocked`, `Damaged`
  - `TransactionType`: `Sale`, `Inventory`

#### `27e87a3` | June 21, 2026 15:00 — Refund, Return, and Void System
**What was built:**

Three distinct transaction reversal operations were implemented, each with different business logic:

| Operation | What it does | Stock effect | Record |
|---|---|---|---|
| **Refund** | Full transaction reversal | Returns ALL stock back to inventory | Creates a new `Refunded` transaction linked to original |
| **Return** | Partial line-item reversal | Returns SELECTED items' stock | Partial deduction from original total |
| **Void** | Cancel before fulfillment | No stock change (sale not completed) | Marks transaction as `Voided` |

**Implementation detail:** All three operations are wrapped in `DB::transaction()` to ensure atomicity. If any stock update fails, the entire reversal rolls back — preventing ghost refunds where money is returned but stock doesn't update.

---

### SPRINT 3 — Reports & Sales Reporting Overhaul
**Date: June 25, 2026**

#### `f330de3` | June 25, 2026 19:42 — Sales Reporting Refactor: Multi-Item Row Splitting
**Problem:** The original sales report displayed one row per *transaction*, meaning a transaction with 5 different products showed as a single line with a combined total. This was useless for analyzing individual product sales performance.

**Solution — Complete reporting logic refactor:**
- Changed the report query to split each `TransactionItem` into its own row.
- Each row now shows: `SI No`, `Part No`, `Product Name`, `Qty`, `Unit Price`, `Line Total`, `Cashier`, `Date`.
- The Part No is now resolved directly from the `products` table via a JOIN, rather than relying on stored strings (which could be stale after a product rename).
- Added system-level report metadata updates: when a report is "generated" (exported), a `ReportLog` record is created to timestamp the last generation date per report type.

---

### SPRINT 4 — UI Polish & Variant System
**Date: July 3–6, 2026**

#### `93e1d06` | July 3, 2026 21:42 — Variant System UI Enhancements + POS Rendering
**What changed:**
- Overhauled the **variant selection UI** in Product Management. Variants are now displayed as expandable rows under their parent product, not as separate table entries.
- Fixed a POS rendering bug where products with variants were not displaying variant options in the product grid during checkout.
- Standardized layout consistency across all admin modules (consistent header heights, button placements, and modal sizing).

#### `a8bdac1` | July 6, 2026 02:06 — Restock Review Modal + Customer Log Exclusion + Premium Tooltips
**What changed:**

1. **Restock Review Modal:** Before a restock is committed to the database, a Review Modal now shows a summary of all items being restocked, their current stock, and the new stock after restocking. The admin must explicitly confirm before the restock is finalized. This prevents accidental duplicate restock submissions.

2. **Customer Log Exclusion:** The Customer Log report (which tracks walk-in customer purchase history) was incorrectly including `Restocked` and `Damaged` transaction types (which are internal inventory operations, not customer sales). Fixed by adding a `whereIn('type', ['Sale'])` filter on the Customer Log query.

3. **Universal Premium Tooltips:** Implemented a consistent tooltip system across all action buttons in the admin UI. Every icon button (Edit, Delete, View Details, Toggle status) now shows a descriptive tooltip on hover, improving UX for new staff.

---

### SPRINT 5 — Bug Fixes & Documentation
**Date: July 11, 2026**

#### `de398ca` | July 11, 2026 09:24 — Documentation Files + UI Component Updates
- Added early-version documentation files.
- Updated various UI components for visual consistency.

---

### SPRINT 6 — SKU-Level Architecture Refactor (Major)
**Date: July 15, 2026**

This sprint contained the single most significant architectural refactor of the project.

#### `bc8fc3d` | July 15, 2026 09:00 — Baseline Snapshot Before Major Refactor
- A clean "snapshot" commit was made before the breaking architecture change, allowing easy rollback if needed.

#### `43dec2b` | July 15, 2026 10:00 — MAJOR REFACTOR: Treat Base Products and Variants as Independent Sellable SKUs

**The Problem (Before):**
The original design stored a product's total stock at the *parent* level. Variants (e.g., "Bolt — Size M10", "Bolt — Size M12") shared the parent's stock pool. This caused a fundamental flaw: selling a "Size M10" bolt deducted from a shared counter that also represented "Size M12" bolts. Inventory counts were inaccurate.

**The Solution (After):**
Each product row — whether it's a base product or a variant — now has its **own independent `stock` field**, its own `alert_limit`, and its own `status`. They are treated as completely independent SKUs (Stock-Keeping Units) in the database.

**Implementation changes:**
- The `ProductService::calculateStatus()` method now runs independently for each product row (base and variant separately).
- The `getAll()` query was updated to filter and search across both base products AND their variants independently.
- The POS `checkout` flow was updated to deduct stock from the specific variant's own row, not the parent.
- The Inventory Report was updated to list each SKU (base and variant) as its own line item.
- Migration `drop_sales_count_from_products_table` was created to remove the now-obsolete `sales_count` column that previously tracked this at the parent level.

#### `ac22533` | July 15, 2026 10:06 — Variant Search on Inventory Report
- After the SKU refactor, the Inventory Report's search function was updated to search by variant name, part number, and Chinese name — not just by the base product name.
- This required updating the Eloquent query to use `orWhereHas('variants', ...)` pattern.

#### `b02ed51` | July 15, 2026 10:47 — Live SKU-Level Stock Aggregates + Shared Alert Helper

**What was built:**
- Implemented a **shared stock alert helper** function used across all inventory-mutating services (`checkout`, `restock`, `damaged log`).
- After any stock change, the helper checks the new stock level against each product's `alert_limit`.
- If the stock drops at or below the `alert_limit`, it automatically:
  1. Creates a `Notification` record in the database.
  2. Broadcasts an `InventoryUpdated` event via Pusher to all connected admin clients.
  3. Updates the product's `status` field to `Low Stock` or `No Stock` automatically.
- The Dashboard KPI cards were updated to read from live SKU-level aggregates instead of cached totals.

#### `dd87067` | July 15, 2026 09:01 — Fix: Laravel Echo `leaveChannel` → `stopListening` Memory Leak

**The Problem:**
The frontend was using `echo.leaveChannel(channelName)` inside React `useEffect` cleanup functions. The `leaveChannel` method disconnects the entire channel subscription — including subscriptions from OTHER components that may still be listening to the same channel. This caused a race condition where navigating between pages would silently disconnect real-time events for the notifications bell.

**The Fix:**
Changed all cleanup calls from:
```javascript
// WRONG — kills ALL listeners on this channel
echo.leaveChannel(`product.${id}`);
```
To:
```javascript
// CORRECT — only removes THIS component's listener
echo.stopListening(`product.${id}`, '.InventoryUpdated');
```

**Why this matters:** `stopListening` is scoped to a specific event on a channel, while `leaveChannel` tears down the entire channel subscription. Using the correct API prevents memory leaks and ensures the notification bell stays connected even after the user navigates between admin pages.

---

### SPRINT 7 — Stability Fixes & Final Refinements
**Date: July 17, 2026**

#### `a1b8036` | July 17, 2026 08:12 — Multi-Fix Commit

This commit bundled several targeted bug fixes:

| Fix | Description |
|---|---|
| **Sales Log SI/CI/DR Display** | The Sales Log was not correctly labeling transaction types. `SI` (Sales Invoice), `CI` (Cash Invoice), and `DR` (Delivery Receipt) labels were being mapped incorrectly. Fixed by normalizing the `tx_type` field comparison to use the `TransactionType` enum values. |
| **Variant-Type / Category Dedup Migrations** | Two new data-cleanup migrations were added: `clean_duplicate_variant_types` and `clean_duplicate_categories`. These removed orphaned duplicate rows that had been created during early testing with no unique constraints. |
| **History Logs — Reservation Tab** | The History Logs module's Reservation tab was not showing reservation records. Fixed by correcting the API call parameters: `tx_type` was being passed instead of `type` and `payment_method` was not being included in the query string. |
| **Price Tier Prop** | The POS product grid was not passing the correct `price_tier` prop to the cart when a customer type (retail vs. wholesale) was selected. Fixed by lifting the `customer_type` state to the correct parent component and threading it as a prop to the checkout handler. |
| **Product Variant Fields Preserved on Edit** | When editing a product and not changing variant images or notes, those fields were being erased on save. Fixed in `ProductService::updateProduct()` by using `array_key_exists()` instead of `isset()` — allowing explicit `null` values to be preserved correctly. |

#### `84c7d71` | July 17, 2026 14:12 — Customer Selection Fix + Test Fixes + Variant Validation + Image Inheritance

| Fix | Description |
|---|---|
| **Customer Selection in POS** | The customer selection dropdown in POS was not resetting to "Walk-in" after a completed transaction. Fixed by including `setSelectedCustomer(null)` in the `resetCart()` function inside `usePOS.js`. |
| **Duplicate Variant Part No Validation** | Added a redundant server-side guard in `ProductService::updateProduct()` to catch duplicate part numbers within the submitted variants array — in addition to the existing `UpdateProductRequest` validation. This prevents race conditions where two simultaneous edits could bypass the form-level check. |
| **Variant Image Inheritance** | When a new variant was added to an existing product that already had a parent image, the variant was not inheriting the parent's image as a fallback. Fixed in `createProduct()` by adding: `'image' => !empty($variantData['image']) ? $variantData['image'] : ($data['image'] ?? null)` |

---

### SPRINT 8 — UI Final Polish & Deployment
**Date: July 19, 2026**

#### `487cdf2` | July 19, 2026 16:20 — Final UI Fixes (POS, Settings, Product Management)
- Final round of UI consistency fixes before deployment.
- POS interface: fixed button alignment and cart total formatting.
- Settings page: fixed form input widths for smaller screen sizes.
- Product Management: fixed modal scroll behavior on small screens.

#### `4136678` | July 19, 2026 16:23 — Merge `ztg-7-19-26` into `main`
- Final feature branch merged into `main` in preparation for production deployment.

#### `20b7469` | July 19, 2026 16:58 — Add Docker Deployment Config for Render
**Files added:**
- `backend/Dockerfile` — Defines the PHP 8.2 + Apache Docker image.
- `backend/vhost.conf` — Apache VirtualHost config pointing document root to `/var/www/html/public`.
- `backend/start.sh` — Startup script that runs `config:cache`, `route:cache`, `migrate --force`, then starts Apache.

**Why Dockerfile was needed:** Render.com does not have a native PHP runtime. Docker was the official solution to run Laravel on Render, providing a fully reproducible production environment identical to local development.

#### `3badb72` | July 19, 2026 17:23 — Add TiDB SSL CA Certificate
- Added `backend/isrgrootx1.pem` (ISRG Root X1 CA certificate) to the repository.
- TiDB Cloud Serverless **requires** SSL/TLS for all connections. Without this certificate, the connection is refused with: `SQLSTATE[HY000] [1105] Connections using insecure transport are prohibited`.
- The certificate is bundled inside the Docker image and referenced via the `MYSQL_ATTR_SSL_CA` environment variable on Render.

#### `ce2c43f` | July 19, 2026 17:28 — Fix: Remove `view:cache` from `start.sh`
**Problem:** On Render, the startup script was running `php artisan view:cache`, which tried to compile Blade templates from the `resources/views` directory. Since this is a pure API backend (no Blade views beyond the minimal health check page), that directory did not exist, causing the container to crash on startup.

**Fix:** Removed `php artisan view:cache` from `start.sh`. Config cache and route cache are still run (these do not require a views directory).

#### `2cde1b2` | July 19, 2026 17:39 — Fix CORS for Cloudflare Pages
**Problem:** After the frontend was deployed to Cloudflare Pages, browser API calls from `https://3ad813b6.ztg-pos-with-smart-inventory.pages.dev` to `https://ztg-pos-with-smart-inventory.onrender.com/api` were being blocked with:
```
Access to XMLHttpRequest... has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Root Cause:** The backend's `config/cors.php` only allowed `http://localhost:3000` as the allowed origin. The Cloudflare Pages deployment URL was not whitelisted.

**Fix:** Added a regex pattern to `allowed_origins_patterns` in `config/cors.php`:
```php
'allowed_origins_patterns' => [
    '#^https?://.*\.pages\.dev$#',
],
```
This pattern dynamically allows any `*.pages.dev` subdomain, including both the primary production URL and any Cloudflare preview deployment URLs (which use a unique hash prefix).

---

### Post-Deployment — Infrastructure & Monitoring
**Date: July 19, 2026 (Post-Deploy)**

#### TiDB Cloud Database Migration
- The `php artisan migrate` command was run against the live TiDB Cloud Serverless database via the startup script on Render's first deployment.
- All 25 migrations ran successfully, creating the full schema on TiDB.
- **Issue encountered:** Initial migration failed because `DB_DATABASE` was set to `sys` (TiDB's system database). Fixed by changing `DB_DATABASE` to `ztg_db` (a user-created database with proper write permissions).

#### Database Seeding
- `php artisan db:seed --force` was run locally (with TiDB credentials in the local `.env`) to populate the live production database with:
  - Default admin and cashier user accounts via `AdminUserSeeder`.
  - Default system settings (tax rate, store name, etc.) via `SettingsSeeder`.

#### BetterStack Uptime Monitor Setup
- A BetterStack Uptime monitor was configured to ping `https://ztg-pos-with-smart-inventory.onrender.com/up` every **3 minutes**.
- Purpose: Prevent Render free tier from sleeping the server after 15 minutes of inactivity.
- The `/up` endpoint is Laravel 11's built-in health check registered in `bootstrap/app.php` — no custom code required.
- Live test confirmed the endpoint responds in **9ms** with `HTTP 200 OK`.

---

### SPRINT 9 — Financial Precision, Cheque Processing & Enterprise Polish
**Date: August 2026**

#### 1. Phase 8: Partial Refund & Net Sales Calculation Engine
- **Financial Precision & Audit Preservation:** Solved a critical business need where customers return a subset of items from an invoice (e.g., 90 out of 100 gasket units). 
- **Data Architecture:** 
  - Added frozen `original_amount` column on `transactions` table.
  - Added cumulative `refunded_amount` on `transactions`.
  - Added item-level `refunded_qty` on `transaction_items` table.
- **Reporting Recalculations:** Full refunds are completely excluded from gross revenue metrics while retaining full audit records in History Logs; partial refunds display exact net sales (`original_amount - refunded_amount`) and net remaining sold units in `SalesReportTab`, `SalesLog`, and `ProductPerformance`.
- **Sequential Partial Refunds:** Enables multiple partial refunds against the same transaction over time until all units are accounted for.

#### 2. Cheque Payment Integration & Due Date Tracking
- Enhanced POS Checkout, History Logs, and Reservations modules to support **Cheque** as a primary payment method.
- Added database fields for `cheque_number`, `cheque_bank` (e.g., BDO, Metrobank, BPI), and `cheque_date` (issuance / maturity date) on both `transactions` and `reservations` tables.
- Rendered bank and cheque reference metadata on printable customer invoices and transaction audit modals.

#### 3. Standardized Document Classification (DocType System)
- Implemented official Philippine commercial invoice classification:
  - `S.I.` (Sales Invoice) — Official invoice issued for completed sales transactions.
  - `D.R.` (Delivery Receipt) — Delivery tracking receipt for released goods.
  - `C.R.` (Collection Receipt) — Receipt for partial collections and reservation fulfillment.

#### 4. Cloudinary Independent Variant Image Management
- Integrated Cloudinary v3 SDK with localized fallback storage for seamless variant photo uploads.
- Provided per-variant image uploader modals with real-time uploading spinner overlays (`ImageUploadOverlay.jsx`).

#### 5. Enterprise Dark Mode Theme & Design System
- Built an end-to-end CSS variable theme system (`dark-theme.css`) with deep dark tones (`#0B1329`, `#151F38`), high-contrast tabular typography (`Inter`), and modern donut chart widgets for top categories.
- Enforced strict vector SVG icon standards across all components, completely eliminating raw emojis from production UI.

#### 6. Client-Side Excel Exporters
- Developed `clientExcelExporter.js` and `orderFromChinaExcelExporter.js` using SheetJS (`xlsx`) for zero-latency, multi-tab financial report generation and customized purchase orders formatted for overseas parts suppliers.

---

## 20. Business Details & Receipt Compliance (Business Owner's Guide)

This section explains how your business information and printed receipts work in simple terms for store owners and non-technical managers.

### 1. Automatic Receipt Snapshot
Whenever a sale is completed, the system takes an invisible "snapshot" of your current business details—your business name, address, phone number, email, BIR TIN number, and tax rate. This information is permanently attached to that specific transaction. Cashiers and administrators do not need to press anything extra; it happens automatically behind the scenes.

### 2. How Reservations Work
For customer reservations, two separate snapshots are taken:
- **First Snapshot:** Captured when the customer pays their initial deposit.
- **Second Snapshot:** Captured later when the customer pays the remaining balance and picks up their order.

Because deposit and pickup can happen weeks or months apart, each receipt keeps the exact business information that was active on the day that specific transaction took place.

### 3. Updating Business Details & Confirmation Security
Changing your business name, address, phone number, TIN, or tax rate in **General Settings** affects official customer documents. To prevent accidental changes:
- Updating any business detail requires typing the word **CONFIRM** before the system will save the changes.
- Everyday settings—like changing inventory alert limits—save instantly with a single click and do not require typing a confirmation word.

### 4. What Happens to Old Receipts When Business Details Change?
Updating your business details in settings **only applies to new sales going forward**. Old receipts from past months or years never change retroactively. Even if your store changes its location or business name multiple times over the next decade, reprinting an old receipt will always show the exact business name, address, and TIN that were active on the original date of sale.

### 5. Company Logo Behavior
The company logo works differently from text details:
- **Text Details (Address, Name, TIN):** Always stay locked to the original date of sale.
- **Company Logo:** Always displays your newest, currently active logo across all receipts, past and present. If you upload a new logo today, reprinting a receipt from last year will display your modern logo alongside the original historical address.

### 6. Real-World Example
1. **Today:** You process a sale while located at *123 Main Street*. The printed receipt displays *123 Main Street*.
2. **Next Year:** Your business moves to *456 Industrial Parkway*. You update the address in General Settings and type **CONFIRM** to save. You also upload a fresh new company logo.
3. **Reprinting the Old Sale:** A customer asks to reprint their receipt from last year. The reprinted receipt will still show the original address (*123 Main Street*) to maintain accurate historical records. However, it will display your newly uploaded company logo at the top.

---

## 21. System Security & Data Protection Architecture

The ZTG Heavy Parts POS & Inventory system incorporates multi-layered enterprise security controls across all application layers to protect business data, safeguard user accounts, and maintain system integrity:

### 1. Authentication & Token Authorization (JWT / Bearer Tokens)
- All protected API endpoints (`/api/*`) require a valid **JSON Web Token (JWT)** passed in the HTTP Authorization header (`Authorization: Bearer <token>`).
- Requests missing a valid token or carrying an expired session are automatically rejected by Laravel middleware with a `401 Unauthorized` response.

### 2. Password Encryption (Bcrypt Hashing)
- User and administrator passwords are encrypted using one-way **Bcrypt** hashing (`Hash::make()`).
- Plaintext passwords are never stored in the database or written to application log files.

### 3. Role-Based Access Control (RBAC) & Admin PIN Enforcement
- Middleware enforces role segregation between **Admin**, **Manager**, and **Cashier** accounts.
- Sensitive financial operations—including refunds, returns, voids, and manual stock write-offs—require explicit **Admin Security Approval PINs** (`approval_pin`).

### 4. Cross-Origin Resource Sharing (CORS) Isolation
- Backend CORS configuration explicitly restricts API calls to authorized frontend origin domains (`.pages.dev`), preventing cross-domain request hijacking.

### 5. Transport Layer Security (HTTPS / TLS 1.3)
- All network communication between the web browser, Cloudflare CDN, and Render API containers is encrypted in transit using **HTTPS / TLS 1.3**.

### 6. SQL Injection Protection (Laravel Eloquent ORM)
- All database queries execute via Laravel Eloquent ORM utilizing **PDO Parameter Binding**, completely neutralizing SQL Injection vectors.

### 7. Sanitized Media Uploads & Image Security
- Uploaded media files (user avatars and product photos) undergo strict MIME-type validation (`jpeg`, `png`, `webp`, `heic`), enforce a 12 MB size ceiling, and are assigned cryptographically random unique filenames (`avatar_1_JAjllNuCgWXw8yrE.jpg`).

---

*End of ZTG Heavy Parts Capstone Project Documentation v2.0*

*Document updated: August 2026*


