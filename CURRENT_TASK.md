# CURRENT_TASK.md — Live Development State

## Current Task Information
- **Task ID**: TASK-007
- **Objective**: Fix Digital Munimji multi-table creation & deletion so requests like `"चार टेबल क्रिएट कर"` or `"Create 4 tables"` run an explicit loop creating N distinct `RestaurantTable` records (never collapsing multiple table names/counts into one table), strengthen AI multi-entity common-sense prompting, verify all E2E suites, and release `v1.1.25` to `pre-production`.
- **Status**: VERIFIED LOCAL — READY FOR PUSH & CI PACKAGING
- **Current Branch**: `pre-production` (NEVER modify `main` directly)
- **Current Pre-Production App Version**: `1.1.25` (`BillingOnHand-Beta`)
- **Production Baseline**: `main` at `v1.1.20` (Workflow: `.github/workflows/build-electron.yml` unchanged)
- **Pre-Production Workflow**: `.github/workflows/pre-production.yml` (publishes rolling `beta-latest` GitHub Prerelease after automated Playwright Electron smoke test)

## User Requirements
1. All UI text, labels, buttons, notifications, comments, and technical documentation remain English-only (keeping Munimji's existing `mr`/`hi`/`en` multilingual chat/voice capabilities intact).
2. Preserve the React + Vite + Express + Electron + JSON DB (`data/db.json`) architecture and isolated `BillingOnHand-Beta` userData channel (`release-channel.cjs`).
3. Digital Munimji must be able to create and manage restaurant tables (including looping accurately over multi-table counts, ranges, and lists), add/settle running orders, manage restaurant menu availability, and create valid sales bills (including Half/Full portions, Dine-In/Takeaway/Delivery, GST & Non-GST).
4. Keep `PROJECT_CONTEXT.md`, `docs/PROJECT_CONTEXT.md`, `CURRENT_TASK.md`, `CHANGELOG.md`, and `TESTING.md` synchronized.

## Completed Milestones on `pre-production`
- **v1.1.15**: Installation-only Business Mode Lock (`InstallSetupView.tsx`, `data/install-lock.json`, NSIS uninstall-only clear), atomic table CRUD endpoints, `cleaning` lifecycle, and Multi-Scheme Cashback Engine (`OffersView.tsx`).
- **v1.1.20**: Dedicated Restaurant Menu Items UI (Option A on shared `items` store with `dietaryType`, `halfPrice`, `kitchenStation`, `shortCode`, `isAvailable`, `trackStock`), KOT station labels (`KOTPrintModal.tsx`), and non-tracked dish stock bypass.
- **ChatGPT PR #2 & PR #3 (`e38214d`..`46bb393`)**:
  - Beta channel isolation (`release-channel.cjs`), `beta-latest` prerelease pipeline, and Playwright Electron smoke-test gate (`scripts/electron-smoke-test.cjs`).
  - `RestaurantTableOrderDraft` persistence, guest name & billing mode preservation, customer snapshot checkout fallback, persistence error surfacing, read-after-write verification, and stale-write protection preventing partial table updates from erasing active running orders.
- **AI Studio `v1.1.21`–`v1.1.23` (`c43b89a`, `d4f73b8`, `34b4fa6`, `2fd294e`)**:
  - Fixed immediate post-Save-to-Table cart clearing (`tableSessionSignature` guard in `InvoicingView.tsx`).
  - Surfaced **Save to Table** & **Print KOT** above the fold, synced Print KOT auto-save to occupied tables, added 1-click **Running Tables** quick-load pills with dirty-cart guards, and added recovery for legacy `runningItemsSummary`, alternate schemas (`{name,qty,rate}`, `{title,count,price}`), deleted catalog items, and total-only occupied tables.
  - Added end-to-end Playwright suite `scripts/test-restaurant-table-persistence.cjs`.
- **AI Studio `v1.1.24` (`a4d005c`)**:
  - Trained Digital Munimji across Gemini AI and offline fallback heuristics on restaurant table CRUD, running orders, bill settlement (`invoice.type = "sale"`), menu availability toggles, offers/loyalty/godowns/EOD, interactive `table_list`/`offer_card` UI cards, and non-unmounting `fetchState()` refresh handling.
- **AI Studio `v1.1.25` (Current)**:
  - Implemented `expandMultiTableCreatePayload()` and `expandMultiTableDeleteTargets()` in `src/server/munimjiPool.ts` with Devanagari/English number-word parsing (`एक`–`वीस`, `one`–`twenty`), Unicode-safe Devanagari boundary matching, capacity phrase stripping (`6 seater`), Marathi voice transliteration detection (`क्रिएट`, `अॅड`, `बनव`), range/comma-list splitting, and collision-free sequential naming (`T-{n}`).
  - Updated `processMunimjiCommand()` with explicit AI Common Sense & Multi-Entity Looping rules (`ADD_TABLES` array schema + multi-target `DELETE_TABLE`), hardened `enrichMunimjiResponseWithStoreData()`, and updated `executeMunimjiUniversalCrud()` (`server.ts`) to loop and persist separate `RestaurantTable` records.
  - Added Step `3B` in `scripts/test-munimji-restaurant.cjs` and bumped pre-production version to `1.1.25` (`package.json`, `src/version.ts`).

## Tests & Verification Status (`v1.1.25`)
- TypeScript Check (`npm run lint`): **PASSED** (`tsc --noEmit` exit 0)
- Production Web & Backend Build (`npm run build`): **PASSED** (Vite + esbuild `dist/server.cjs`)
- Release Channel Isolation (`npm run test:release-channel`): **PASSED**
- Restaurant Table Persistence E2E (`node scripts/test-restaurant-table-persistence.cjs`): **PASSED** (all 11 scenarios + Kirana retail non-regression)
- Digital Munimji Restaurant Tables & Multi-Table Loop Verification (`node scripts/test-munimji-restaurant.cjs`): **PASSED** (`"चार टेबल क्रिएट कर"` -> 4 distinct tables, `"Create 4 new AC Dining 6 seater tables"` -> 4 distinct 6-seater AC tables, comma-joined `ADD_TABLE` payload sanitizer, multi-table range deletion, table seed/create/order/list/settle/clean/delete, `invoice.type === "sale"`, `tableNumber` preservation, and UI `MunimjiDrawer` 1-click Open Bill to T-2 POS)
- GitHub Actions `pre-production` Windows Beta Build & `beta-latest` Release: **PENDING PUSH**

## Next Actions
1. Run final co-executed `compile_applet` and `lint_applet` sanity check.
2. Commit and push cleanly to `origin/pre-production` and verify the GitHub Actions workflow + `beta-latest` prerelease assets pass end-to-end.
