# CHANGELOG.md — Important Development History

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

