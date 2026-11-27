# TESTING.md — Verification & Testing Guide

## Automated Verification Commands
1. **Type Check & Lint**:
   ```bash
   npm run lint
   # Executes: tsc --noEmit
   ```
2. **Production Build & Bundle**:
   ```bash
   npm run build
   # Executes: node scripts/ensure-icons.cjs && vite build && esbuild server.ts --bundle --platform=node --format=cjs --external:vite --sourcemap --outfile=dist/server.cjs
   ```
3. **Applet Compilation Check**:
   - Use `compile_applet` and `lint_applet` to verify the full Vite + Express bundle and TypeScript types.

## Latest Verified Test Results (2026-11-26)
- `compile_applet` (`npm run build`): **PASSED**
- `lint_applet` (`tsc --noEmit`): **PASSED**
- Dev server on port 3000 (`restart_dev_server`): **PASSED**
- `POST /api/items` (restaurant fields `shortCode`, `dietaryType`, `halfPrice`, `kitchenStation`, `isAvailable`, `trackStock`), `GET /api/db`, availability toggle, and `POST /api/invoices` (`trackStock === false` skipping stock mutation): **PASSED**
- `GET /api/install-status`, `POST /api/tables/item`, `DELETE /api/tables/:id`, `POST /api/offers` (Cashback scheme), `POST /api/business/switch-vertical` (locked `403`): **PASSED**

## Manual Verification Procedures
- **Restaurant & Cafe Menu Items (Option A)**: In `restaurant` mode, open **Menu Items** in the Sidebar, verify hotel-specific KPI cards (Veg, Non-Veg & Egg, Sold Out) and 7-column menu table, create/edit a dish with Half/Full prices and Kitchen Station, toggle `Available` / `Sold Out` inline, and verify **Sales & POS** Quick-Pick Menu Board shows dietary filters, Half/Full quick-add buttons, Sold-Out blocking, and KOT kitchen station labels.
- **Installation Business Mode Lock**: On fresh install (when `data/install-lock.json` is absent), verify `InstallSetupView` prompts to choose and confirm the Business Mode. Afterward, open Settings → Business Profile & GST and verify Business Mode is read-only/locked. Reinstall/update preserves `data/install-lock.json`, whereas Windows uninstaller (`scripts/installer.nsh`) clears it.
- **Restaurant Table Management & Cleaning Lifecycle**: Open Restaurant Tables, create a custom table, settle a POS dine-in invoice against it (verify transition to `Needs Cleaning`), and click **Mark Cleaned** to return it to `Available`. Verify deleting all tables keeps the list empty rather than re-seeding defaults.
- **Offers & Cashback Schemes**: Open **Offers & Schemes** (from Sidebar or Settings → Customer Loyalty tab), create Cashback, Buy X Get Y, Percentage Discount, Flat Discount, or Bill Slab schemes, and toggle Active/Inactive status.

