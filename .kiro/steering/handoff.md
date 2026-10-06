# Session handoff (read first)

This file carries context from the previous working session. Read it fully, then **continue working with the user on the next task below**.

## Where things stand

- Git branch: `feature/variant-improvements` (based on `origin/main` at `64e5276`). Work is committed locally, **not pushed** yet. Ask before pushing or opening a PR.
- Real database: `ztg_db` on **XAMPP MariaDB 10.4.32**, `127.0.0.1:3307`, user `root` (see `backend/.env`). It is fully migrated; `php artisan migrate:status --pending` shows nothing pending.
- Database backups: `C:\Users\marti\ztg_db_backups\` (newest: `ztg_db_RIGHT_BEFORE_upstream_migrate_20261007_003346.sql`).
- Extra safety copies from before the update (can be removed once the user is happy): git `stash@{0}` (`ztg-variant-work-before-update`) and `C:\Users\marti\zbk\work.tar`.
- Last verification: backend `php artisan test` = 331 passed; frontend `npm run build` OK.

## What was built in the previous session

- Sale and reservation lines save a snapshot (item name, part no, `variant_label`, real unit), so history survives later edits. Shared display helper: `frontend/src/shared/utils/lineItemDisplay.js`.
- Product form: "Generate combinations" (each new variant gets its own price, stock and alert fields, and Add stays disabled until they're filled), "+ Add new" option inside variant dropdowns, a per-variant **Variant Status**, and a **Base Product Status** that disables the whole family.
- A variant's Disabled state is respected on save. Re-enabling a disabled base product revives its variants.
- Custom variant types (for example "Voltage") can be added, renamed and deleted in Settings → Products Settings. The 5 built-in types are protected. In-use options and types can't be deleted.
- **Categories link to variant types by ID** through the `category_variant_type` pivot. The API still accepts and returns `variants` (names) and also `variant_type_ids`. The old JSON column is kept as `categories.variants_legacy`.
- `ProductService::updateProduct` was refactored: no per-variant queries, and variant ids must belong to the product being edited.
- Numeric settings are validated (tax rate, dead-stock days, daily void limit).
- Browser `alert` / `confirm` popups were replaced by the in-app `confirmDialog()` (`frontend/src/shared/utils/confirmDialog.js`) and `showToast()`. Production builds strip `console.log`, `info` and `debug` (`frontend/vite.config.js`).
- In-app table headers show "Product / Brand". The Excel exports deliberately keep their original headers.

## Rules learned with this user (follow them)

- **Database changes:** read-only check first, then back up, rehearse on a scratch copy (`ztg_rehearsal_scratch`, created and dropped by you), and only then the real `ztg_db`. Never run `phpunit` against MySQL (`RefreshDatabase` would wipe it); tests use in-memory SQLite.
- The XAMPP server hosts other projects' databases. Only touch `ztg_db` and your own scratch database.
- Production quality: no browser popups, no debug console output, no raw emojis in the UI. Use `confirmDialog`, `showToast` and inline errors.
- Follow `.agents/AGENTS.md` (flag any change to what an existing test asserts) and `.agents/skills/ztg_development/SKILL.md` (thin controllers and services, Form Requests, `DB::transaction`, no queries in loops, modular folders, PHPDoc).
- Always run the backend tests and the frontend build before reporting done, and say clearly what was not checked in a browser.
- The agent shell on this PC is unreliable for long command lines and output redirection. Keep commands short, or run PHP scripts that write their own result file and read it back.
- Explain things simply, step by step, with tables or analogies when useful. The user is learning.

## Open items (small)

- Change or disable the default `techops` account. Its password `TechOps*123` is in the public repo.
- Optional: change the toggle label "Enable product variants (Size, Color, ...)" to plain "Enable product variants".

---

## NEXT TASK: smart bulk import of products from Excel

**User's request:** the client has about **3,000 products in an Excel file**. Adding them one by one is not realistic. Build an **intelligent one-time import** that organizes the client's messy sheet into the system. Their Excel is **not organized**: the **brand and the variants are written inside the product name**. The importer must work out what goes where (base product, brand, variant options, category and so on), so the data lands properly organized in a single import.

### First step: ask, don't guess

Before designing, ask the user for:
1. A **sample of the real Excel**: the header row plus about 30 to 50 typical rows, including the messy ones. The column names and naming patterns decide the parsing rules.
2. Answers to these questions:
   - Is there a part number column?
   - Which price columns exist (original / retail)?
   - Is there a stock column?
   - Is there a category column, or should the category be inferred?
   - Are images needed? The add-product form currently requires an image; the backend doesn't.
   - Is this a one-time migration only, or will they re-import updates later?

Then propose a short plan or spec and get approval before building.

### Facts about the target data model

- `products`: one row per base product **and** one row per variant (variants have `parent_product_id`). Fields:
  - `name`, `chinese_name`, `part_no` (unique, nullable), `category_id` (required), `brand_id` (nullable)
  - `uom` (default `Piece / PCS`), `address`, `stock`, `alert_limit`
  - `price1` (original), `price2` (retail), `status`, `notes`, `image`
- `brands`: `name` unique, `status`.
- Variant attributes: `variant_types` (Size, Quality, Color, Specification, Material, plus custom ones) → `variant_options` (values) → `product_variant_values` (product ↔ option).
- Categories: `categories` → `category_variant_type` pivot, max 3 types per category.
- The existing creation logic to reuse is `ProductService::createProduct` (base product + `variants[]` with `option_ids`). Write routes need the `products,can_create` permission.

### Expected shape of a good solution (to refine with the user)

1. **Upload** `.xlsx` or `.csv`. A parsing library is needed; none is installed yet. Suggest a pinned, well-known one (for example `phpoffice/phpspreadsheet` or `openspout/openspout` on the backend) and ask before adding it.
2. **Column mapping** step: the user confirms which Excel column is name, part no, price, stock and so on. Remember the mapping.
3. **Smart parsing** of the product name, using dictionaries built from the system and the file:
   - Known brands: the existing `brands` table, plus brands detected and confirmed by the user.
   - Known variant options per type (sizes, colors, quality grades and so on), plus patterns such as sizes and voltages.
   - Group rows that share the same base name into **one base product with variants**.
4. **Preview / dry run**: show the organized result (base products, variants, brands and options to be created, and duplicate or conflicting part numbers). The user can fix or override rows before committing. Nothing is written yet.
5. **Commit** in chunks inside DB transactions, tagged with an **import batch id** so the whole import can be reviewed or rolled back. Show a progress and summary report with errors per row.
6. **Rehearse on a scratch copy of `ztg_db`** before importing into the real database, and back up first.
