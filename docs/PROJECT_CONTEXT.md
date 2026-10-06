# 📘 Billing On Hand - Project State, Architecture & Development Context

> **File Purpose:** This document is the single source of truth for the codebase history, current development state, completed phases, architectural rules, and upcoming roadmap. Any AI assistant or developer picking up this project in Google AI Studio or local IDE can read this file to gain 100% instant project context without any ramp-up delay.

---

## 🏢 1. Project Overview & Architecture
* **Project Name:** Billing On Hand (`Repo_billingOnHands`)
* **Primary Developer / Author:** Rupesh Gadkhe (`devrupeshgadkhe`)
* **Target Audience:** Indian retail and wholesale merchants (Kirana, Supermarkets, Agriculture/Krishi Seva, Garments, Medical/Pharmacy, Electronics, Hardware, F&B, etc.).
* **Core Technology Stack:**
  * **Frontend:** React (TypeScript) + Vite + Tailwind CSS + Lucide Icons.
  * **Backend / API:** Node.js (TypeScript with `tsx`) + Express running on Port 3000.
  * **Desktop Target:** Electron (Windows / Mac / Linux cross-platform desktop application).
  * **Storage Engine:** 100% Offline-First persistent JSON database (`db.json`) with automated pre-backup snapshots (`/backups/`).
  * **AI & Voice Engine:** Google Gemini API with unified Indian male voice (`mr-IN` / `hi-IN` / `en-IN`), multi-key pool rotation (`gemini_key.txt` and environment variables), and intelligent intent routing.

---

## 🛡️ 2. Architectural Guardrails & Stability Rules (CRITICAL)
1. **Zero White-Screen Discipline:**
   * Every component is protected by React Error Boundaries (`ErrorBoundary.tsx`).
   * The app includes a resilient client-side retry loader with 5 automated reconnection attempts and an interactive retry button to ensure smooth startup in desktop Electron builds.
2. **Offline-First & Self-Contained:**
   * Never rely on external blocking CDN scripts.
   * Sound effects (beeps, clicks, cash register sounds) use browser Web Audio API synthesizers so they work 100% offline.
3. **Desktop App Compatibility:**
   * Never break Electron native bridges or local storage paths.
   * Avoid `window.alert` or `window.open` where modal dialogs should be used.
4. **Digital Munimji Voice & Navigation Principle:**
   * Munimji uses a unified male voice and rotates keys seamlessly.
   * Whenever Munimji triggers page navigation (e.g. to Invoicing, Challans, Items, Reports), the Munimji drawer **must automatically minimize (`onClose`)** after navigation so the user can interact directly with the destination page.

---

## 📊 3. Completed Phases & Features Matrix (Status: 100% Completed)

### ✅ Phase 1: Core Invoicing, Catalog & Multi-Payment POS
* Multi-payment checkout: Cash (with tender calculator and fast chips), UPI/Bank, and Khata (credit/debt ledger).
* Barcode scanner support, product search autocomplete, and keyboard shortcuts (F2 Charge, F3 Hold/Park, F5 Cash, F6 Bank, F7 Khata).
* GST Tax Slabs (0%, 5%, 12%, 18%, 28%) with auto CGST/SGST/IGST breakdown.
* Extra charges (Freight, Packaging, Loading/Hamali, Labor).
* Sale Returns & Credit/Debit notes linked to original bills.
* Multimodal AI Bill & Invoice Scanner (Gemini OCR).

### ✅ Phase 2: Quotations & Delivery Challans
* **Quotations / Estimates (`QuotationsView.tsx` & `QuotationPrintModal.tsx`):** Draft, Sent, Accepted, Rejected statuses, and 1-Click conversion to Sales Invoices.
* **Delivery Challans (`DeliveryChallansView.tsx` & `ChallanPrintModal.tsx`):** Vehicle numbers, LR/Bilty details, gross/net weight, transporter info, Rule 55 compliance, and 1-Click conversion to bills.

### ✅ Phase 3: Analytics, GST Reports, Schemes & Access Control
* **Reports & Analytics (`ReportsView.tsx`):** GSTR-1 (B2B, B2CL, B2CS, HSN summaries), GSTR-3B, Profit & Loss Statement, Daybook, and Stock Valuation.
* **Offers & Discount Schemes (`OffersView.tsx`):** Percentage discounts, flat discounts, Buy X Get Y, and minimum cart value rules.
* **User Permissions & RBAC (`AccessControlView.tsx`):** Admin, Manager, Billing Clerk, View-Only operator with granular action locks.
* **Multi-Business Support (`SettingsView.tsx`):** Run multiple independent firms/shops with individual GSTINs, logos, and print layouts.

### ✅ Phase 4: Batch Number & Expiry Date Management
* **Batch Tracking (`ItemsView.tsx` & `InvoicingView.tsx`):** Batch number, manufacturing date, and expiry date recording for pharma, grocery, seed, and FMCG.
* **Near Expiry & Expired Inventory Alerts:** 45-day threshold visual warnings, statistics cards, and filter tabs (All, Low Stock, Near Expiry, Expired).
* **Batch-Enabled Print Templates:** Automatic printing of batch numbers and expiry dates on 58mm/80mm thermal and A4/A5 receipts.
* **Munimji Voice Sync:** Voice queries for expiry alerts and auto-navigation to inventory filter tabs.

### ✅ Phase 5: Government NIC E-Way Bill & E-Invoice JSON Generator (`EWayBillModal.tsx`)
* **Official NIC E-Way Bill Schema (`eWayBillJSON`):** 100% compliant JSON payload for direct bulk upload to `ewaybillgst.gov.in`.
* **IRP E-Invoice Schema (v1.03):** Standard B2B, B2G, Deemed Export, and Reverse Charge compliant payload.
* **Cross-Module Triggers:** 1-Click generation from Sales Invoices (`InvoicingView.tsx`), Delivery Challans (`DeliveryChallansView.tsx`), and Sales Reports (`ReportsView.tsx`).
* **Live NIC Pre-Validation:** Automated validation for 15-character GSTIN, 6-digit PIN codes, transport distance, and vehicle numbers.
* **Transit Slip Printing:** Rule 138 compliant e-Way Bill summary print with QR code and barcode.
* **Digital Munimji Sync:** Voice commands ("ई-वे बिल बनवा", "E-Invoice तयार करा") navigate directly to generator with drawer auto-minimize.

---

## 🚀 4. Upcoming Roadmap & Next Phases (In Serial Order)

| Phase | Feature Name | Scope & Specifications | Priority |
| :--- | :--- | :--- | :--- |
| **Phase 6** | **Custom Thermal Bill Designer** | Drag-and-drop / customizable thermal bill editor for 58mm & 80mm printers (custom headers, footers, store logo, QR code, bilingual English/Marathi labels, font sizes, GST breakdown switches). | **Next / High** |
| **Phase 7** | **Customer Loyalty Points Scheme** | Points earning rules per ₹100 spent, point redemption in POS checkout, customer points balance ledger, and expiry management. | Medium |
| **Phase 8** | **Automated Scheduled Email Reports** | Automated daily end-of-day (EOD) summary email with sales, cash collection, and low stock snapshot sent to business owner. | Medium |
| **Phase 9** | **Multi-Godown / Warehouse Stock Transfer** | Multi-location warehouse inventory tracking and intra-warehouse stock transfer vouchers. | Medium |

---

## 💻 5. Key File Index for Quick Navigation
* `src/App.tsx` - Root UI orchestrator, persistent database sync, view router, and top navigation.
* `server.ts` - Express API backend, Gemini AI client, Digital Munimji execution engine, database normalization, and backup runner.
* `src/types.ts` - Central TypeScript interfaces (`Item`, `Party`, `Invoice`, `DeliveryChallan`, `Quotation`, `BusinessProfile`, `ItemBatch`, etc.).
* `src/components/EWayBillModal.tsx` - Official NIC E-Way Bill & E-Invoice modal (Phase 5).
* `src/components/InvoicingView.tsx` - High-speed POS Billing, item search, batch selection, checkout, and parked bills.
* `src/components/DeliveryChallansView.tsx` - Delivery challan management, vehicle transport tracking, and bill conversion.
* `src/components/ItemsView.tsx` - Inventory catalog, batch/expiry alerts, low stock badges, AI item scanner.
* `src/components/PartiesView.tsx` - Customer and Supplier Khata ledger and payment reminders.
* `src/components/ReportsView.tsx` - GSTR-1, GSTR-3B, P&L, Daybook, and CSV export.
* `src/components/MunimjiDrawer.tsx` - Digital Munimji AI floating voice assistant drawer.
* `src/services/munimjiClient.ts` - Frontend client service for voice recording, streaming, and command processing.
* `docs/FEATURE_ROADMAP_AND_STATUS.md` - Detailed Marathi & English feature completion and status breakdown.

---

## 🔄 6. Instructions for Future AI Development Sessions
Whenever resuming work on this codebase in a new Google AI Studio conversation:
1. **Read `PROJECT_CONTEXT.md` first:** Check which phase was completed last (currently **Phase 5**).
2. **Follow Serial Order:** Proceed to the next pending phase (**Phase 6: Custom Thermal Bill Designer**).
3. **Verify Builds:** Always run `lint_applet` and `compile_applet` before completing work.
4. **Push to GitHub:** Commit and push changes to the repository `devrupeshgadkhe/Repo_billingOnHands` on branch `main`.
5. **Update this file (`PROJECT_CONTEXT.md`):** Mark the completed phase and document key architecture changes immediately.
