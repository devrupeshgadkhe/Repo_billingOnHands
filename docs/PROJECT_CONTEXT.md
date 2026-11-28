# 📘 Billing On Hand - Project State, Architecture & Development Context

> **File Purpose:** Mirrored reference of `/PROJECT_CONTEXT.md`. Keep synchronized with the root `PROJECT_CONTEXT.md` so any developer or assistant inspecting `docs/` immediately gets accurate, up-to-date project history through `v1.1.25`.

---

## 🏢 1. Project Overview & Architecture
* **Project Name:** Billing On Hand (`Repo_billingOnHands`)
* **Primary Developer / Author:** Rupesh Gadkhe (`devrupeshgadkhe`)
* **Target Audience:** Indian retail, wholesale, and hospitality merchants (Kirana, Supermarkets, Agriculture/Krishi Seva, Garments, Medical/Pharmacy, Wine Shop, Electronics, Restaurant & Cafe, Hardware, etc.).
* **Core Technology Stack:**
  * **Frontend:** React (TypeScript) + Vite + Tailwind CSS + Lucide Icons.
  * **Backend / API:** Node.js (TypeScript with `tsx`) + Express running on Port 3000.
  * **Desktop Target:** Electron (Windows x64 NSIS desktop application with `BillingOnHand-Beta` isolated pre-production channel).
  * **Storage Engine:** 100% Offline-First persistent JSON database (`data/db.json` + `data/install-lock.json`) with automated pre-backup snapshots (`/backups/`).
  * **AI & Voice Engine:** Google Gemini API (`munimjiPool.ts`) with unified Indian male voice (`mr-IN` / `hi-IN` / `en-IN`), multi-key pool rotation, offline heuristic fallback, and intelligent intent routing.

---

## 📊 2. Completed Phases & Major Releases Summary

* **Phases 1–9 (Core ERP):** Multi-payment POS & Barcode billing, GST slabs & Non-GST mode, Quotations & Delivery Challans, GSTR-1/3B/P&L/Daybook Reports, Offers & Schemes, Batch & Expiry tracking, NIC E-Way Bill & E-Invoice JSON generator, Custom Thermal Bill Designer & Indian vernacular fractional POS, Customer Loyalty Points Ledger, Scheduled Automated EOD Email Reports (`eodReportService.ts`), and Multi-Godown Warehouse & Stock Transfers.
* **v1.1.15 (Business Mode Lock & Table Cleaning Lifecycle):** Installation-only business mode selector (`InstallSetupView.tsx`, `data/install-lock.json`, NSIS uninstall-only clear in `scripts/installer.nsh`), atomic `/api/tables/*` routes, `cleaning` table status, and Cashback reward schemes in `OffersView.tsx`.
* **v1.1.20 (Restaurant Menu UI — Option A on Shared `items`):** FSSAI dietary badges (`veg`, `non_veg`, `egg`, `beverage`), Half/Full portion pricing, short codes, Kitchen Stations on `KOTPrintModal.tsx`, Available/Sold-Out toggles, and non-tracked dish stock bypass (`trackStock === false`).
* **ChatGPT PR #2 & PR #3 (`e38214d`..`46bb393`):** Pre-Production Beta CI pipeline (`.github/workflows/pre-production.yml`), isolated `BillingOnHand-Beta` userData (`release-channel.cjs`), `beta-latest` GitHub Prerelease updater, Playwright Electron smoke test gate (`scripts/electron-smoke-test.cjs`), `RestaurantTableOrderDraft` schema, read-after-write table verification, and server-side guards against stale updates overwriting active running bills.
* **v1.1.21–v1.1.23 (`c43b89a`, `d4f73b8`, `34b4fa6`, `2fd294e`):** Fixed immediate post-Save-to-Table POS cart wipe (`tableSessionSignature` guard), added **Running Tables** quick-load pills & Print KOT auto-save sync, surfaced **Save to Table** & **Print KOT** above the fold, recovered legacy/alternate occupied table schemas (`runningItemsSummary`, `{name,qty,rate}`, missing catalog fallback, total-only fallback), and verified via `scripts/test-restaurant-table-persistence.cjs`.
* **v1.1.24–v1.1.25 (Digital Munimji Restaurant Training & Multi-Entity Table Looping):**
  * Trained Munimji (`munimjiPool.ts`, `server.ts`, `munimjiClient.ts`, `MunimjiDrawer.tsx`, `App.tsx`) for full Restaurant Table CRUD (`ADD_TABLE`, `ADD_TABLES`, `SEED_TABLES`, `TABLE_LIST`, `UPDATE_TABLE_STATUS`, `DELETE_TABLE`), opening tables in POS (`OPEN_TABLE_POS`), saving running dishes (`SAVE_TABLE_ORDER`), settling table bills (`SETTLE_TABLE_BILL`), Menu Sold-Out toggles (`MENU_AVAILABILITY`), Half/Full portion billing, GST/Non-GST billing, cashback offers, godowns, and interactive `table_list` / `offer_card` UI cards.
  * Added common-sense multi-table loop expansion (`expandMultiTableCreatePayload` / `expandMultiTableDeleteTargets`) across AI prompts, response sanitizer, Marathi/Hindi/English fallback heuristics, and backend CRUD so `"चार टेबल क्रिएट कर"`, `"Create 4 tables"`, ranges, or comma-lists always create N distinct `RestaurantTable` records.
  * Fixed `server.ts` Munimji invoice bug so bills always save `type: "sale"`, calculate GST/Non-GST & Khata balances properly, respect `trackStock !== false`, and auto-transition settled dining tables to `cleaning`.

---

## 💻 3. Branch & Verification Discipline
1. Active engineering, testing, and CI prerelease packaging happen strictly on `pre-production` (`main` stays protected until reviewed PR merge).
2. Always see root `/PROJECT_CONTEXT.md`, `/CURRENT_TASK.md`, `/CHANGELOG.md`, and `/TESTING.md` for live task tracking and verification commands.
