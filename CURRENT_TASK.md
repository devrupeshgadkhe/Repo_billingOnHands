# CURRENT_TASK.md — Live Development State

## Current Task Information
- **Task ID**: TASK-002
- **Objective**: Fix dev server startup, enforce installation-only Business Mode lock (preserved across updates, cleared only on uninstall), fix Restaurant Table creation & cleaning lifecycle, and wire Multi-Scheme Promotional Offers (Discounts, BOGO, Bill Slabs, Cashback).
- **Status**: COMPLETED & VERIFIED (All changes compiled, linted, and pushed to `origin/main`)
- **Last Safe Checkpoint Commit SHA**: Pending final commit on `main` (parent `5879682e0b70520a9b90fb24a06a9247b832f6fe`)
- **Current Branch**: `main`
- **Synchronization Status**: Synchronized with `origin/main` (`https://github.com/devrupeshgadkhe/Repo_billingOnHands.git`).

## Requirements & Acceptance Criteria
1. Resolve merge conflict markers blocking TypeScript compilation and Express/Vite dev server startup.
2. Implement installation-only business mode selector (`InstallSetupView.tsx`, `/api/install-status`, `/api/install/setup`) backed by persistent `data/install-lock.json` that survives auto-updates and is removed only on real Windows uninstall via NSIS hook (`scripts/installer.nsh`).
3. Lock business mode read-only in Settings (`SettingsView.tsx`) and enforce backend guards (`server.ts`).
4. Fix Restaurant Table creation, bulk seeding, empty-state deletion persistence, and add `'cleaning'` lifecycle (`TablesView.tsx`, `InvoicingView.tsx`, `/api/tables/item`, `/api/tables/seed`, `/api/tables/:id`).
5. Wire `OffersView.tsx` into `Sidebar.tsx`, `App.tsx`, and `SettingsView.tsx`, add `'cashback'` reward scheme support, and integrate the Multi-Form Customer Schemes Hub (`StoreSchemeConfig` + Khata cashback crediting) in `SettingsView.tsx`, `InvoicingView.tsx`, and `server.ts`.

## Completed Work
- Resolved Git merge conflict markers across affected files and restored dev server startup on port 3000.
- Added `InstallStatus`, `'cleaning'` table status, `'cashback'` offer scheme fields, and `StoreSchemeConfig` / `Invoice` scheme fields in `src/types.ts`.
- Created `src/components/InstallSetupView.tsx` and NSIS uninstall hook `scripts/installer.nsh` (wired into `package.json`).
- Updated `server.ts` with `install-lock.json` enforcement across profile/backup/reset/restore routes, atomic `/api/tables/item`, `/api/tables/seed`, `/api/tables/:id` routes, and Khata cashback crediting on invoice creation.
- Updated `App.tsx`, `SettingsView.tsx` (locked Business Mode card + Multi-Form Schemes Hub), `TablesView.tsx`, `InvoicingView.tsx`, `Sidebar.tsx`, and `OffersView.tsx`.

## Tests Executed & Results
- `npm run build` / `compile_applet`: **PASSED** (Vite client bundle + esbuild server bundle succeeded).
- `npm run lint` / `tsc --noEmit` / `lint_applet`: **PASSED** (Zero TypeScript errors).
- Dev server restart & live API verification on port 3000: **PASSED** (`/api/install-status`, `/api/tables/item`, `/api/tables/:id`, `/api/offers`, `/api/business/switch-vertical` lock verified).

## Pending / Blocked Work
- None.


