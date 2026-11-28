# CHANGELOG.md — Important Development History

## [1.1.25] - 2026-11-28
- **Milestone**: Digital Munimji Multi-Entity Looping & AI Common-Sense Fix (`ADD_TABLES`, Multi-Table `DELETE_TABLE`).
- **Summary of Changes**:
  - Fixed bug where asking Munimji to create multiple tables (e.g., `"चार टेबल क्रिएट कर"` / `"Create 4 tables"`) could collapse all requested names or counts into a single `RestaurantTable` record.
  - Added `expandMultiTableCreatePayload()` and `expandMultiTableDeleteTargets()` (`src/server/munimjiPool.ts`) supporting Devanagari & English count words (`एक`–`वीस`, `one`–`twenty`), numeric counts, ranges (`T-7 to T-10` / `T-7 ते T-10`), delimiter-joined strings (`T-1, T-2, T-3, T-4`), capacity stripping (`6 seater`), and sequential non-colliding table numbering (`T-{n}`).
  - Added explicit AI common-sense & multi-entity looping guidelines (`ADD_TABLES` array schema + multi-target `DELETE_TABLE`) in `processMunimjiCommand()`, sanitized AI responses in `enrichMunimjiResponseWithStoreData()`, upgraded Marathi voice transliteration detection (`क्रिएट`, `अॅड`, `बनव`), and updated `executeMunimjiUniversalCrud()` (`server.ts`) to loop cleanly and create separate database records per table.
  - Extended `scripts/test-munimji-restaurant.cjs` Step `3B` verifying `"चार टेबल क्रिएट कर"`, `"Create 4 new AC Dining 6 seater tables"`, comma-joined sanitizer protection, and multi-table range deletion.

## [1.1.24] - 2026-11-28
- **Milestone**: Digital Munimji Training for Restaurant Tables, Menu Catalog, Sales Billing & Pre-Production Documentation Sync.
- **Summary of Changes**:
  - Trained Digital Munimji (`src/server/munimjiPool.ts`, `server.ts`, `src/services/munimjiClient.ts`) across both Gemini AI and offline Marathi/Hindi/English fallback heuristics to create/seed/list/clean/reserve/delete restaurant tables (`ADD_TABLE`, `SEED_TABLES`, `TABLE_LIST`, `UPDATE_TABLE_STATUS`, `DELETE_TABLE`), add running dishes (`SAVE_TABLE_ORDER`), open tables in POS (`OPEN_TABLE_POS`), settle running table bills (`SETTLE_TABLE_BILL`), toggle Sold Out / Available dishes (`MENU_AVAILABILITY`), handle Half/Full portion pricing, GST vs Non-GST modes, cashback offers, loyalty balances, godowns, and EOD dispatch.
  - Fixed pre-existing invoice persistence bug in `executeMunimjiUniversalCrud()` (`server.ts`) where Munimji-created bills wrote `type: "sales"` instead of `"sale"` and deducted stock on non-tracked dishes (`trackStock === false`); now calculates GST/Non-GST totals accurately, updates Khata balances, respects `trackStock !== false`, transitions settled dining tables to `cleaning`, and preserves `tableId`, `tableNumber`, `orderType`, and `originalInvoiceNumber` inside `normalizeDatabaseState()`.
  - Interactive `"table_list"` and `"offer_card"` UI cards plus Restaurant quick-suggestion chips added in `src/components/MunimjiDrawer.tsx`; guarded drawer auto-close so query cards stay open and updated `fetchState()` (`src/App.tsx`) with `hasLoadedDbRef` so background DB refreshes never unmount active drawers or views.
  - Synchronized `PROJECT_CONTEXT.md`, `docs/PROJECT_CONTEXT.md`, `CURRENT_TASK.md`, `CHANGELOG.md`, and `TESTING.md` with all ChatGPT (PR #2 & PR #3) and AI Studio (`v1.1.15`–`v1.1.24`) changes.
- **Verification**: `npm run lint`, `npm run build`, `npm run test:release-channel`, `node scripts/test-restaurant-table-persistence.cjs`, and `node scripts/test-munimji-restaurant.cjs` all passed.

## [1.1.23] - 2026-11-27
- **Milestone**: Occupied Table Cart Recovery Across All Schemas & POS Layout Refinement (`2fd294e`).
- **Summary of Changes**:
  - Updated `InvoicingView.tsx`, `server.ts`, `src/App.tsx`, and `scripts/test-restaurant-table-persistence.cjs` to recover running carts from legacy `runningItemsSummary`, alternate line schemas (`{name,qty,rate}`, `{title,count,price}`), deleted catalog items, and total-only occupied tables without showing an empty cart.
  - Kept **Save to Table** and **Print KOT** controls visible above the fold and allowed seamless 1-click switching between saved occupied tables when there are no unsaved edits.

## [1.1.22 / Beta CI Fixes] - 2026-11-27
- **Milestone**: Empty-Cart Table Prevention, Running Tables Quick-Load Pills & Print KOT Table Sync (`34b4fa6`).
- **Summary of Changes**:
  - Added **Running Tables** quick-load pill bar inside `InvoicingView.tsx` so occupied tables can be opened in 1 click directly from Sales POS.
  - Updated `KOTPrintModal.tsx` and `InvoicingView.tsx` to auto-save table orders when printing KOT and prevent clearing carts when table orders contain items.

## [1.1.21] - 2026-11-27
- **Milestone**: Post-Save POS Cart Preservation & Table Persistence Hardening (`c43b89a`, `d4f73b8`).
- **Summary of Changes**:
  - Fixed immediate post-Save-to-Table cart wipe caused by re-hydration triggering on the same active table save response (`tableSessionSignature` guard).
  - Added `scripts/test-restaurant-table-persistence.cjs` Playwright end-to-end suite verifying save retention, multi-table isolation, HTTP 500 error recovery, and Kirana retail non-regression.

## [Pre-Production PR #2 & PR #3 (ChatGPT)] - 2026-11-26 to 2026-11-27
- **Milestone**: Beta Release Channel Isolation, Automated Electron Smoke Gate & Running Bill Integrity (`e38214d`..`46bb393`).
- **Summary of Changes**:
  - Configured `.github/workflows/pre-production.yml` with `scripts/electron-smoke-test.cjs` Playwright desktop gating, `scripts/set-preproduction-version.cjs`, `scripts/ensure-latest-yml.cjs`, and rolling `beta-latest` GitHub Prerelease publishing using isolated `BillingOnHand-Beta` userData (`release-channel.cjs`).
  - Introduced `RestaurantTableOrderDraft` (`src/types.ts`), draft metadata restoration, guest name & transaction subtype preservation, checkout customer snapshot fallback, clear persistence error surfacing, read-after-write snapshot verification, and server-side guards (`46bb393`) preventing stale/empty updates from erasing active running orders.

## [1.1.20] - 2026-11-26
- **Milestone**: Restaurant & Cafe Dedicated Menu Items UI (Option A on Shared `items` Table).
- **Summary of Changes**:
  - Extended `Item` (`src/types.ts`) with optional hotel/restaurant fields (`dietaryType`, `halfPrice`, `kitchenStation`, `shortCode`, `isAvailable`, `trackStock`) and added `RESTAURANT_UNITS`, `RESTAURANT_CATEGORIES`, and `KITCHEN_STATIONS`.
  - Updated `server.ts` (`normalizeDatabaseState`, `/api/items`, `generateTemplateData("restaurant")`) and `src/utils/businessPersonaUtils.ts` to normalize, seed, and persist all retail + restaurant fields and skip inventory deduction for made-to-order dishes (`trackStock === false`).
  - Updated `Sidebar.tsx` (`"Menu Items"` in restaurant mode) and `App.tsx` (`lowStockCount` ignores non-tracked dishes).
  - Built dedicated Restaurant Menu UI in `ItemsView.tsx`: FSSAI dietary markers (Veg/Non-Veg/Egg/Drink), Course & Dietary filter tabs, 7-column hotel menu table, 1-click Available/Sold-Out toggle, Half/Full pricing display, and a streamlined Add/Edit Menu Dish drawer with an optional collapsible stock/barcode section for packaged drinks (keeping all retail/medical/kirana modes unchanged).
  - Enhanced `InvoicingView.tsx` Quick-Pick Menu Board & Terminal and `KOTPrintModal.tsx` with menu category & dietary filter chips, short code search, Half/Full portion quick-add buttons, Sold-Out guard, and kitchen station tags on KOT slips.
- **Verification**: `compile_applet`, `lint_applet`, dev server restart, and live API persistence/stock checks passed.

## [1.1.15] - 2026-11-26
- **Milestone**: Installation-Only Business Mode Lock, Restaurant Table Fixes & Cleaning Lifecycle, Multi-Scheme Cashback Engine, and Dev Server Recovery.
- **Summary of Changes**:
  - Resolved Git merge conflict markers across 11 frontend/backend/style files blocking Vite and Express startup.
  - Added first-time installation setup flow (`InstallSetupView.tsx`), persistent backend lock (`data/install-lock.json` via `/api/install-status` and `/api/install/setup`), and Windows NSIS uninstaller cleanup (`scripts/installer.nsh` guarded by `${ifNot} ${isUpdated}`) so business mode cannot change after installation or auto-updates until uninstalled.
  - Made Business Mode read-only in `SettingsView.tsx`, removed legacy PIN prompt switching, and guarded `/api/business`, `/api/settings`, restore, and reset routes in `server.ts`.
  - Fixed restaurant table creation, bulk preset seeding, and empty-table persistence bugs using atomic endpoints (`/api/tables/item`, `/api/tables/seed`, `/api/tables/:id`) and inline modal error feedback in `TablesView.tsx`.
  - Added `cleaning` table status across `TablesView.tsx`, `InvoicingView.tsx`, and `server.ts` so settled dining bills transition to Needs Cleaning with 1-click "Mark Cleaned".
  - Wired `OffersView.tsx` into `Sidebar.tsx`, `App.tsx`, and `SettingsView.tsx`, and added `cashback` reward scheme support (`cashbackPercent`, `cashbackAmount`, `maxCashbackAmount`).
- **Verification**: `compile_applet`, `lint_applet`, dev server startup, and live API tests passed.

## [1.1.14] - 2026-10-18
- **Milestone**: Implementation of AI-Independent Development Continuity System and multi-vertical business switcher (Restaurant, Kirana, Medical, Garment, Electronics, etc.).
- **Summary of Changes**:
  - Added project memory files (`AGENTS.md`, `PROJECT_CONTEXT.md`, `CURRENT_TASK.md`, `CHANGELOG.md`, `TESTING.md`).
  - Added REST API endpoint `/api/business/switch-vertical` and restaurant table initialization.
  - Enhanced Settings view with interactive business vertical selector and capability highlights.
  - Resolved all TypeScript and ESBuild compilation issues.
- **Verification**: `npm run build` and `tsc --noEmit` passed successfully with zero errors.

