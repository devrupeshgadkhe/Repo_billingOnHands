# CURRENT_TASK.md — Live Development State

## Current Task Information
- **Task ID**: TASK-003
- **Objective**: Implement Option A for **Restaurant & Cafe Mode** Menu Items — reuse the existing `items` database collection with optional hotel/restaurant fields (`dietaryType`, `halfPrice`, `kitchenStation`, `shortCode`, `isAvailable`, `trackStock`) and deliver a clean, dedicated Hotel Menu UI across `ItemsView.tsx`, `Sidebar.tsx`, `InvoicingView.tsx`, `KOTPrintModal.tsx`, `App.tsx`, and `server.ts`.
- **Status**: COMPLETED & VERIFIED (All changes compiled, linted, API-tested, ready for push & CI release)
- **Current Branch**: `main`
- **Synchronization Status**: Pushing to `origin/main` (`https://github.com/devrupeshgadkhe/Repo_billingOnHands.git`).

## Requirements & Acceptance Criteria
1. Extend `Item` in `src/types.ts` (Option A — shared `items` table) with `dietaryType`, `halfPrice`, `kitchenStation`, `shortCode`, `isAvailable`, and `trackStock`, plus `RESTAURANT_UNITS`, `RESTAURANT_CATEGORIES`, and `KITCHEN_STATIONS`.
2. Preserve all retail and restaurant fields cleanly in `server.ts` (`normalizeDatabaseState`, `/api/items` `sanitizeItem`, `generateTemplateData("restaurant")`), and skip stock deduction on cooked dishes where `trackStock === false`.
3. Update `Sidebar.tsx` (`"Menu Items"` in restaurant mode) and `App.tsx` (`lowStockCount` excludes non-tracked restaurant dishes).
4. Render a dedicated Hotel Menu UI in `ItemsView.tsx` (Veg/Non-Veg/Egg/Available/Sold-Out KPIs & filters, 7-column menu table with FSSAI dietary mark, Half/Full pricing, 1-click kitchen availability toggle, and streamlined Add/Edit Menu Dish drawer with collapsible optional stock/barcode section for packaged drinks) while keeping all non-restaurant modes unchanged.
5. Adapt `InvoicingView.tsx` Quick-Pick Menu Board & Search Terminal (Veg/Non-Veg & Course chips, short code search, Half/Full portion quick-add, Sold-Out guard) and `KOTPrintModal.tsx` (kitchen station & portion label).

## Completed Work
- Updated `src/types.ts`, `src/utils/businessPersonaUtils.ts`, and `server.ts`.
- Updated `src/App.tsx`, `src/components/Sidebar.tsx`, `src/components/ItemsView.tsx`, `src/components/InvoicingView.tsx`, and `src/components/KOTPrintModal.tsx`.

## Tests Executed & Results
- `compile_applet` (`npm run build`): **PASSED**
- `lint_applet` (`tsc --noEmit`): **PASSED**
- Dev server on port 3000 (`restart_dev_server`) + live `/api/items` & `/api/invoices` verification: **PASSED** (verified `shortCode`, `dietaryType`, `halfPrice`, `kitchenStation`, `isAvailable` toggle, and `trackStock: false` skipping stock deduction on sale).

## Pending / Blocked Work
- Push to `origin/main` and monitor GitHub Actions `.exe` release build.
