# TESTING.md — Verification & Testing Guide

## Automated Verification Commands
1. **Release channel and data isolation**: `npm run test:release-channel`
2. **Type Check**: `npm run lint` (runs `tsc --noEmit`)
3. **Production Web & Backend Build**: `npm run build` (runs `vite build` + `esbuild server.ts`)
4. **Electron Desktop Smoke Test (Playwright + Electron)**: `npm run test:electron` (`scripts/electron-smoke-test.cjs`)
5. **Restaurant Table Persistence & Cart Restoration E2E (Playwright)**: `node scripts/test-restaurant-table-persistence.cjs` (requires server on `http://localhost:3000`; safely snapshots and restores `data/db.json` & `data/install-lock.json`)
6. **Digital Munimji Restaurant Tables & Sales E2E (API + Playwright)**: `node scripts/test-munimji-restaurant.cjs` (requires server on `http://localhost:3000`; safely snapshots and restores `data/db.json` & `data/install-lock.json`)
7. **Windows Installer Build**: `npx electron-builder --win --x64 --publish never`

## Pre-Production CI Workflow
Workflow: `.github/workflows/pre-production.yml`

Triggered on pushes to `pre-production` or `workflow_dispatch`. It:
- Runs on `windows-latest` with Node.js 20 (`npm ci || npm install`).
- Installs pinned Playwright runtime (`playwright@1.58.2`) and sets unique Beta build version via `scripts/set-preproduction-version.cjs`.
- Runs `npm run test:release-channel`, `npm run lint`, `npm run build`, and `node scripts/ensure-icons.cjs`.
- Runs the Playwright Electron desktop smoke test (`npm run test:electron`) gating installer generation.
- Packages the isolated `BillingOnHand-Beta` Windows x64 NSIS installer, verifies `latest.yml`, and updates the rolling `beta-latest` GitHub Prerelease.

## Latest Verification Results (`v1.1.24` on `pre-production`)
- `npm run test:release-channel`: **PASSED** (Beta identity, installer isolation, update feed, and data isolation verified)
- `npm run lint`: **PASSED** (`tsc --noEmit` exited with code 0)
- `npm run build`: **PASSED** (Vite client bundle + `esbuild` `dist/server.cjs` built cleanly)
- `node scripts/test-restaurant-table-persistence.cjs`: **PASSED** (all restaurant table persistence, KOT, schema recovery, HTTP 500 resilience, checkout-to-cleaning, and Kirana retail non-regression checks passed)
- `node scripts/test-munimji-restaurant.cjs`: **PASSED** (Munimji table seed/create/order/list/settle/clean/delete, `invoice.type === "sale"`, `tableNumber` preservation, `trackStock: false` protection, and interactive `MunimjiDrawer` -> POS T-2 flow passed)
- GitHub Actions `pre-production` run & `beta-latest` release asset check: **PENDING PUSH**

## Coverage Matrix
- **Restaurant Table Persistence (`test-restaurant-table-persistence.cjs`)**:
  - Take Order -> Save to Table retains cart items, totals, invoice number, customer name, extra charges, and notes immediately without wiping.
  - Multi-table isolation, dirty-cart overwrite guard, Running Tables quick-load pills, and Print KOT auto-save to occupied table.
  - Recovery of legacy `runningItemsSummary`, alternate schemas (`{name,qty,rate}`, `{title,count,price}`), deleted catalog items, and total-only occupied tables.
  - HTTP 500 persistence error resilience without clearing UI cart, Checkout -> `cleaning`, Mark Cleaned -> `available`, and Kirana retail non-regression.
- **Digital Munimji Restaurant & Sales Training (`test-munimji-restaurant.cjs`)**:
  - Table CRUD via `/api/munimji/process`: seed tables, create table (`T-7` 6-seater VIP), list tables + interactive `table_list` card, add running dishes (`SAVE_TABLE_ORDER`), settle table bill (`SETTLE_TABLE_BILL`) verifying `invoice.type === "sale"`, `trackStock === false` stock preservation, and `cleaning` status, mark cleaned (`available`), and delete table (`DELETE_TABLE`).
  - Direct Munimji sales billing (`"Create cash bill 2 Masala Dosa"`) verifying `invoice.type === "sale"` and UI `MunimjiDrawer` rendering `table_list` cards + 1-click **Open Bill / Take Order** navigation into Sales POS.
