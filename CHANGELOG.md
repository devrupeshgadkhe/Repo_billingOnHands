# CHANGELOG.md — Important Development History

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

