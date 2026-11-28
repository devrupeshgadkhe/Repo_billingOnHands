# CURRENT_TASK.md — Live Development State

## Current Task Information
- **Task ID**: TASK-006
- **Objective**: Train Digital Munimji end-to-end on all newly added features (Restaurant Table CRUD & running-order/settlement workflows, Restaurant Menu catalog/Sold-Out toggles, Half/Full portion & GST/Non-GST sales billing, Offers/Cashback, Loyalty, Godowns, EOD) and synchronize all continuity documentation with the latest ChatGPT (PR #2 & PR #3) and AI Studio (`v1.1.15`–`v1.1.24`) changes on `pre-production`.
- **Status**: VERIFIED LOCAL — READY FOR PUSH & CI PACKAGING
- **Current Branch**: `pre-production` (NEVER modify `main` directly)
- **Current Pre-Production App Version**: `1.1.24` (`BillingOnHand-Beta`)
- **Production Baseline**: `main` at `v1.1.20` (Workflow: `.github/workflows/build-electron.yml` unchanged)
- **Pre-Production Workflow**: `.github/workflows/pre-production.yml` (publishes rolling `beta-latest` GitHub Prerelease after automated Playwright Electron smoke test)

## User Requirements
1. All UI text, labels, buttons, notifications, comments, and technical documentation remain English-only (keeping Munimji's existing `mr`/`hi`/`en` multilingual chat/voice capabilities intact).
2. Preserve the React + Vite + Express + Electron + JSON DB (`data/db.json`) architecture and isolated `BillingOnHand-Beta` userData channel (`release-channel.cjs`).
3. Digital Munimji must be able to create and manage restaurant tables, add/settle running orders, manage restaurant menu availability, and create valid sales bills (including Half/Full portions, Dine-In/Takeaway/Delivery, GST & Non-GST).
4. Synchronize `PROJECT_CONTEXT.md`, `docs/PROJECT_CONTEXT.md`, `CURRENT_TASK.md`, `CHANGELOG.md`, and `TESTING.md` with all recent ChatGPT and AI Studio work.

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
- **AI Studio `v1.1.24` (Current)**:
  - Updated `src/services/munimjiClient.ts`, `src/server/munimjiPool.ts`, `server.ts`, `src/App.tsx`, and `src/components/MunimjiDrawer.tsx` to train Munimji on `ADD_TABLE`, `SEED_TABLES`, `TABLE_LIST`, `UPDATE_TABLE_STATUS`, `DELETE_TABLE`, `OPEN_TABLE_POS`, `SAVE_TABLE_ORDER`, `SETTLE_TABLE_BILL`, `MENU_AVAILABILITY`, `OFFER_LIST`/`OFFER_CREATE`, `GODOWN_LIST`, `CHECK_LOYALTY`/`ADJUST_LOYALTY`, `SEND_EOD_EMAIL`, and `NAVIGATE`.
  - Fixed Munimji sales invoice persistence bug (`invoice.type = "sale"`, GST/Non-GST totals, `trackStock !== false`, and linked table transition to `cleaning`) and preserved `tableId`, `tableNumber`, `orderType`, and `originalInvoiceNumber` in `normalizeDatabaseState()` (`server.ts`).
  - Fixed background `fetchState()` DB refreshes in `src/App.tsx` (`hasLoadedDbRef`) so refreshing database state never unmounts `MunimjiDrawer` or wipes active drawer messages/cards.
  - Added interactive `"table_list"` and `"offer_card"` UI cards (plus explicit-navigation guard preventing query cards from auto-closing the drawer) and restaurant quick-suggestion chips in `MunimjiDrawer.tsx`.
  - Added end-to-end verification suite `scripts/test-munimji-restaurant.cjs` and bumped pre-production version to `1.1.24` (`package.json`, `src/version.ts`).

## Tests & Verification Status (`v1.1.24`)
- TypeScript Check (`npm run lint`): **PASSED** (`tsc --noEmit` exit 0)
- Production Web & Backend Build (`npm run build`): **PASSED** (Vite + esbuild `dist/server.cjs`)
- Release Channel Isolation (`npm run test:release-channel`): **PASSED**
- Restaurant Table Persistence E2E (`node scripts/test-restaurant-table-persistence.cjs`): **PASSED** (all 11 scenarios + Kirana retail non-regression)
- Digital Munimji Restaurant Tables & Sales Verification (`node scripts/test-munimji-restaurant.cjs`): **PASSED** (table seed/create/order/list/settle/clean/delete, `invoice.type === "sale"`, `tableNumber` preservation, and UI `MunimjiDrawer` 1-click Open Bill to T-2 POS)
- GitHub Actions `pre-production` Windows Beta Build & `beta-latest` Release: **PENDING PUSH**

## Next Actions
1. Run final co-executed `compile_applet` and `lint_applet` sanity check after updating documentation.
2. Commit and push cleanly to `origin/pre-production` and verify the GitHub Actions workflow + `beta-latest` prerelease assets pass end-to-end.
