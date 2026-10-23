# Excel Product Import

**Feature status**: Complete, tested, ready for browser verification.  
**Git branch**: `feature/variant-improvements` (not pushed yet).  
**Tests**: 358 passed (1,427 assertions), frontend builds OK.

---

## What it does

Imports the client's 3,000-product Excel price list in one click. The importer:

- **Parses** brand names, categories, and variant options (size, color, quality, voltage, specification, material, plus custom types) from the client's messy product names.
- **Groups** rows that differ only by variant details into one base product with multiple variants.
- **Learns** new brands by spotting words that consistently follow a dash or sit in [brackets].
- **Infers** categories by matching keywords (`HEADLIGHT` → Lights, `INJECTOR` → Engine Parts, `HOSE` → Hoses & Tubes).
- **Detects** existing products by part number and warns the user.
- **Enforces** the 5-variant-type limit per category (`VariantConstants::MAX_TYPES_PER_CATEGORY`, raised from 3; extras kept in the name with a warning).
- **Processes** 4,000 rows in ~4s (preview), ~25s (save), ~1s (undo).

---

## How to use (user)

1. **Prepare the Excel file**:
   - Required columns: `PART NO.`, `DESCRIPTION`, `PRICE 1` (or `PRICE 2`), `STOCK`.
   - Optional: `IMAGE`, `CHINESE NAME`, `ADDRESS` (warehouse location).
   - The importer recognizes English and Chinese headers in any order.

2. **Go to Inventory → "+ Import Products"** (requires `products,can_create` permission).

3. **Upload** the file (`.xlsx` or `.csv`). Multi-sheet workbooks prompt you to choose which sheet.

4. **Review** the organized plan:
   - Search, filter, and page through the recognized products.
   - Click any row to see and edit its name, brand, category, and every variant's details.
   - Untick rows you don't want to import.
   - Check the stats panel (how many products, variants, new brands, new categories).
   - **Prices are copied exactly.** An empty PRICE 1 or PRICE 2 cell stays empty (shown as `—`, saved as NULL), it is never copied from the other price and never set to 0. Review shows one summary line ("N rows have no Retail Price..."); a row with no price at all gets its own note. A single generic `PRICE` column is the item's one price and fills a tier only when that tier has no column/value of its own. The POS and the checkout API refuse to sell at an empty price (migration `2026_10_23_100000_make_product_prices_nullable`).
   - **Possible typos**: a new brand or category that is 1 letter away (names of 4 letters or fewer) or 2 letters away (longer names) from an existing or starter one is flagged, e.g. `"HOWOO" looks like a typo of Howo`. Swapped letters count as one (`HWOO`). Two real starter brands are never paired (HINO / HOWO, FAW / JAC). Nothing changes on its own: **Use Howo** moves the products to Howo (decision `brand_renames` / `category_renames`), **Keep HOWOO as new** creates it (decision `kept_brands` / `kept_categories`). Each choice can be undone. Code: `TypoMatcher`, `ImportPlanner::suggestTypos()`.
   - A word after a dash normally becomes a brand only after 2+ different products (so `AIR CONNECTOR - TEE` stays a shape). A word 1–2 letters from a known brand is recognised even on one product (`AIR HOSE - HOWOO #6` → brand HOWOO, name `AIR HOSE`, with the typo row and a **Not a brand** button). The dash that only introduced a brand is removed from single-product names (`WORK LAMP - HOWO 12V` → `WORK LAMP 12V`).

5. **Import**. Products are saved in chunks of 25. A progress bar shows how far along you are. A "Stop after this group" button lets you cancel early (the products saved so far remain).

6. **Done**. The import details screen shows exactly what was created: a searchable list of the new products with their variants, plus totals and any rows that failed.

**Undo**: click "Undo this import" on the Done screen, or find the batch in **History Logs** and undo it there. You need the `products,can_delete` permission (Admin or Manager). The undo soft-deletes the products and the entities created alongside them (brands, categories, variant options). It refuses to proceed if any product from the batch has been sold or restocked since the import.

**History**: every import and every undo is recorded in History Logs with a searchable product list.

---

## How to test (developer)

### Backend tests (all 358)
```
z_tests.bat
```
Output: `z_tests.txt`

### Backend tests (import only, 25 tests)
```
z_tests.bat tests/Feature/ProductImport
```

### Frontend build
```
z_build.bat
```
Output: `z_build.txt`

### 4,000-row stress test (on a scratch copy, deleted after)
```
z_php.bat z_rehearse4k.php full
```
Output: `backend/z_out.txt`

This:
1. Backs up `ztg_db` to `C:\Users\marti\ztg_db_backups\ztg_db_before_4k_rehearsal.sql`.
2. Creates a scratch database (`ztg_rehearsal_scratch`), restores `ztg_db` into it.
3. Runs the preview (4,000 rows → ~2,400 products).
4. Imports all 2,400 products in chunks of 25.
5. Re-uploads the same file to confirm nothing new is found.
6. Undoes the import.
7. Drops the scratch database.

The real `ztg_db` is never touched.

---

## Performance (4,000-row stress test)

| Operation              | Time  | Result                                            |
|------------------------|-------|---------------------------------------------------|
| Preview                | 4.2s  | 2,400 products, 2,911 variants. JSON plan 2 MB. Peak memory 92 MB. |
| Save                   | 25.4s | 2,400 products in 96 chunks. Slowest chunk 1.01s. Zero failures. |
| Details page (page 3)  | 0.07s | 10 products with variants.                        |
| Re-upload preview      | 3.9s  | 0 new families (all 2,400 already exist).         |
| Undo                   | 1.0s  | Removes 2,400 products, 72 options, 13 categories, 14 brands. |

---

## Files

### Backend (new)
- `app/Services/Products/Import/` (10 new service classes)
- `app/Services/Products/Import/Images/` (image uploader interface + implementation)
- `app/Services/Products/Import/Columns/` (column mapping)
- `app/Services/Constants/ImportConstants.php`
- `app/Http/Controllers/ProductImportController.php`
- `app/Http/Requests/ProductImportUploadRequest.php`
- `config/product_import.php` (category keywords, common words, truck models, variant markers)
- `database/migrations/2026_10_20_create_import_batches_table.php`
- `database/migrations/2026_10_20_add_import_batch_id_to_products.php`
- `tests/Feature/ProductImport/` (3 test classes, 25 tests)

### Backend (changed)
- `app/Services/Products/ProductService.php` (refactored `updateProduct` to avoid N+1 queries)
- `app/Http/Controllers/CategoryController.php`, `VariantController.php`, `SettingController.php` (validation, deletion guards)
- `app/Http/Requests/UpdateCategoryRequest.php` (validates variant-type limit)
- `routes/api.php` (added import routes)
- `composer.json` (added `phpoffice/phpspreadsheet:^2.3`)

### Frontend (new)
- `src/pages/Admin/Inventory/hooks/useProductImport.js` (wizard state machine)
- `src/pages/Admin/Inventory/hooks/useImportReview.js` (editable product list with search, filter, paging)
- `src/pages/Admin/Inventory/hooks/importConstants.js`
- `src/pages/Admin/Inventory/modals/ProductImportModal.jsx`
- `src/pages/Admin/Inventory/views/import/` (7 UI components + CSS)
- `src/shared/hooks/useImportBatchDetails.js`
- `src/shared/components/ImportBatchDetails.jsx` + `.css` (searchable product list with variants, used in Done screen, Recent imports, and History Logs)
- `src/shared/components/PagedList.jsx` (reusable search + pagination wrapper, used in Settings for brands, categories, variant options, units)

### Frontend (changed)
- `src/pages/Admin/Inventory/views/InventoryTable.jsx` (added "+ Import Products" button)
- `src/pages/Admin/Settings/tabs/ProductsTab.jsx` (wrapped brands, categories, options, units in `PagedList` for search and pagination once they exceed 10 items)
- `src/pages/Admin/HistoryLogs/modals/TransactionDetailsModal.jsx` (custom display for import and undo records with searchable product list)
- `src/shared/components/StatusBadge.jsx` (added `Imported` and `Import Undone` styles)
- `vite.config.js` (strips console.log/info/debug in production builds)

---

## Config

**`config/product_import.php`** holds the rules that drive the smart parsing:

- **`categories`**: keyword → category mapping. Example: `'Lights' => ['LIGHT', 'LAMP', 'BULB']`.
- **`common_words`**: words never mistaken for brands (e.g., `LEFT`, `RIGHT`, `REAR`, `FRONT`, `HEAVY`, `DUTY`).
- **`truck_models`**: model names that follow a known brand (e.g., `371`, `MAX`, `T7H`). These are not brands themselves.
- **`variant_markers`**: patterns recognized as variant options (sizes in mm or cm, voltage in V, colors, qualities, shapes like `ELBOW` or `TEE`, directions, etc.).

To add a category, add it to the `categories` array with a list of keywords. To teach the importer a new variant pattern, add it to `variant_markers`.

---

## Sample files

- **`samples/ZTG_PRICE_LIST_SAMPLE.xlsx`**: 100 rows, mixed Chinese and English, with pictures. Good for a quick test.
- **`samples/ZTG_PRICE_LIST_SAMPLE_v2.xlsx`**: 300 rows, English only, no pictures. Good for a medium test.
- **`samples/ZTG_PRICE_LIST_4000.xlsx`**: 4,000 unique parts, 8 pictures, covering 14 brands, 14 categories, 5 built-in variant types plus 1 custom (`Voltage`). Generated by `backend/z_make_4k.php`. Used for the stress test.
- **`samples/ZTG_PRICE_LIST_4000_5TYPES.xlsx`**: the 4,000-row file plus 40 rows (5 products x 8 variants) whose names carry 5 variant types each: WORK LAMP, QUICK CONNECTOR, SPIRAL HOSE, ELECTRIC HORN, BRAKE CHAMBER. A dry run of the planner gives 2,405 products, each new product with all 5 types and no limit warnings.

---

## What was not checked in a browser

- The import wizard itself (upload, column mapping, review, progress, details).
- The recent-imports list and the undo confirmation.
- The History Logs display for import and undo records (custom layout with searchable product list).
- The paginated brand, category, variant-option and unit lists in Settings (search box, "No items match" message).

All of those are built from shared components (`ImportBatchDetails`, `PagedList`, `confirmDialog`, `showToast`, mobile sheet, tables, pills, badges). The backend API is fully tested (358 tests pass), the build succeeds, and the 4,000-row stress test completes without errors. The shapes are correct, but the visual spacing, mobile layout and interaction feel should be verified in a browser before pushing.

---

## Next steps

1. **Test in a browser**: upload `samples/ZTG_PRICE_LIST_SAMPLE_v2.xlsx` (300 rows), review the plan, import it, view the details, then undo. Check spacing, mobile layout, interaction feel.
2. If the UI is good, **test with the 4,000-row file** to confirm the progress bar, chunk timing and "Stop" button work as expected.
3. **Commit** the work to `feature/variant-improvements` and **push** to the remote.
4. **Deploy** to staging and have the client test with a small sample of their real 3,000-product file.
5. Once confirmed, **import the full 3,000 products** on production (back up first, rehearse on a scratch copy, then the real database).

---

## Open items (small)

1. Done (Sprint 21 security review): the `techops` account no longer has a hardcoded password; change the live password in Profile > Change password.
2. Done: the Settings toggle now reads "Enable product variants".
3. Optional: ask the client for a real 30–50 row sample of their Excel to confirm the column names and naming patterns match the parsing rules.

---

**Status**: Feature complete, tested, ready for browser verification.
