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

### ✅ Phase 6: Custom Thermal Bill Designer & Vernacular Fractional POS (`ThermalDesignerModal.tsx` & `InvoicingView.tsx`)
* **Thermal Receipt Layout Editor (58mm & 80mm):** Customizable header, footer, store logo, barcode, and font sizing.
* **Dynamic UPI QR Code Generator:** Real-time scannable QR code generated from store UPI ID and merchant name.
* **Fractional & Traditional Indian Units Handling:** Complete support for sub-1 quantities (0.25, 0.5, 0.75, 1.5 etc.) and vernacular spoken/typed terms (*पाव, अर्धा किलो, तीन पाव, दीड किलो, 200 ग्रॅम*) without minimum quantity validation errors.
* **Dynamic Out-of-Catalog Item Auto-Addition:** When Munimji processes sales billing with items not currently in inventory (e.g. *शेंगदाणे, तेल, गूळ*), items are automatically created and added to inventory on the fly with estimated pricing and units while simultaneously recording in the bill.

### ✅ Phase 7: Customer Loyalty Points Scheme (`InvoicingView.tsx`, `PartiesView.tsx`, `SettingsView.tsx`, `InvoicePrintModal.tsx`)
* **Configurable Loyalty Rules Engine (`SettingsView.tsx`):** Enable/disable toggle, points earning rate per ₹100 spent (default: 1 pt / ₹100), redemption rate in ₹ (default: 1 pt = ₹1.00), minimum threshold to redeem (e.g. 10 pts), maximum redemption cap (% of invoice total, default: 50%), and validity expiry days.
* **Customer Loyalty Ledger & Model (`Party` in `types.ts` & `server.ts`):** `loyaltyPoints` balance, `totalPointsEarned`, `totalPointsRedeemed`, and complete audit trail `loyaltyLedger` records (`EARNED`, `REDEEMED`, `ADJUSTMENT`).
* **High-Speed POS Checkout Redemption (`InvoicingView.tsx`):** Real-time badge display for registered customer's available points and rupee value; 1-click "Redeem Max Eligible" and custom points input with instant bill discount calculation (`pointsDiscount`); automatic award of newly earned points on net bill.
* **Customer Parties & Khata Management (`PartiesView.tsx`):** Gold star badges on customer rows; dedicated "Customer Loyalty Points & Ledger" modal with 3 KPI metric cards, manual points credit/bonus or deduction form with reason notes, and chronologically sorted points ledger table.
* **Thermal & A4 Print Templates (`InvoicePrintModal.tsx` & `ThermalDesignerModal.tsx`):** Prints redeemed points discount and awarded loyalty points banner on 58mm/80mm receipts and A4/A5 invoices with customizable designer toggle `showLoyaltyPoints`.
* **Digital Munimji Voice Integration (`MunimjiDrawer.tsx` & `server.ts`):** Voice query for loyalty balance ("रमेशचे लॉयल्टी पॉईंट्स किती आहेत?") and loyalty adjustments with drawer auto-minimize.

### ✅ Phase 8: Automated Scheduled Email Reports (`eodReportService.ts`, `SettingsView.tsx`, `ReportsView.tsx`, `server.ts`)
* **Comprehensive EOD Engine (`src/server/eodReportService.ts`):** Calculates day's net sales, cash in drawer, UPI/bank collection, unpaid credit, customer returns, shop expenses, estimated profit & margin %, GST tax breakdown, top 5 selling items, low stock alerts, near expiry warnings, and loyalty activity.
* **Mobile-Responsive HTML Email Template (`buildEodHtmlEmail`):** Clean, professional branded HTML email formatted for mobile and desktop inboxes with 4 KPI hero cards and styled tables.
* **Background Automated Scheduler (`checkScheduledEodEmailJob`):** 60-second background timer checks `scheduledTime` (e.g. 21:00 / 9:00 PM) and store closing time, automatically dispatching the summary report once per day with zero manual intervention.
* **Interactive Store Configuration (`SettingsView.tsx`):** Toggle automated daily reports, primary owner email, CC emails, scheduled time picker, customizable section checkboxes, and optional SMTP / Gmail App Password configurator with test send and live HTML preview modal.
* **1-Click Reports View Integration (`ReportsView.tsx`):** "ईमेल अहवाल (Email EOD)" header action opens an instant summary dialog with 1-click manual dispatch for today or filtered date.
* **Digital Munimji Voice Sync (`server.ts`):** Voice commands ("आजचा डे-एंड ईमेल पाठवा", "Send EOD report", "ईमेल रिपोर्ट पाठवा") trigger immediate summary calculation, email dispatch, and vocal confirmation with drawer auto-minimize.

### ✅ Phase 9: Multi-Godown / Warehouse & Stock Transfer Management (`GodownsView.tsx`, `StockTransferPrintModal.tsx`, `server.ts`)
* **Multi-Warehouse Management (`GodownsView.tsx`):** Create, edit, and manage multiple godowns/warehouses (Main Store, Depot, Cold Storage, etc.) with address, supervisor/manager name, contact phone, and default designation.
* **Godown-Wise Stock Tracking (`Item` in `types.ts` & `server.ts`):** Granular `godownStock` mapping per item (`Record<string, number>`) ensuring accurate warehouse level inventory balances alongside global stock quantities.
* **Inter-Godown Stock Transfer Vouchers (`StockTransferVoucher`):** Seamless creation of intra-warehouse stock transfer vouchers with source and destination godowns, multi-item line picker, batch number, expiry date, maximum available stock limits, and transport details (vehicle number, driver name).
* **Inventory Balancing & Reversal Engine (`server.ts`):** Automated deduction from source godown and addition to destination godown upon transfer creation; automated stock balance restoration on voucher cancellation.
* **Goods Transit Pass Printing (`StockTransferPrintModal.tsx`):** Professional thermal (80mm) and A4 printable Stock Transfer Delivery Transit Pass with voucher number, dispatch date, source/destination godowns, driver details, and recipient signature block.
* **Dynamic GST Tax Slab Architecture (`ItemsView.tsx`, `ItemsScanModal.tsx`, `InvoicingView.tsx`, `types.ts`):** Fully dynamic GST rate support accepting standard slabs (0%, 0.1%, 0.25%, 1.5%, 3%, 5%, 6%, 7.5%, 12%, 18%, 28%, 40%) as well as custom decimal tax percentages extracted from scanned vendor bills or entered manually.
* **GST vs Non-GST Dual Billing Mode (`InvoicingView.tsx`, `InvoicePrintModal.tsx`, `SettingsView.tsx`, `types.ts`, `server.ts`):**
  - **Instant Switcher & Auto-Persistence:** 1-click toggle on POS billing top bar between `GST Bill` (Tax Invoice) and `Non-GST` (साधी पावती / Bill of Supply / Cash Memo). Selection is permanently remembered in `localStorage` (`billingonhand_billing_mode`) and synced with `business.defaultBillingMode` in Settings so merchants never have to re-select on consecutive bills.
  - **Complete Non-GST Masking:** In Non-GST mode, all GST calculations, CGST/SGST/IGST breakdowns, GST% columns, HSN columns, and GSTIN numbers are completely removed from both on-screen POS calculations and A4/A5/Thermal printouts.
  - **Digital Munimji Voice Sync (`munimjiPool.ts` & `server.ts`):** Digital Munimji automatically creates Non-GST bills with ₹0 tax when commanded ("नॉन जीएसटी बिल दे", "विना जीएसटी साधे बिल बनवा", "कच्चे बिल द्या").
* **Anti-Tampering & DevTools Security Shield (`main.cjs`, `App.tsx`, `SettingsView.tsx`):**
  - **DevTools / F12 / Inspect Blocker:** Complete prevention of developer inspection (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U) and right-click context menu inspection across both desktop Windows application and web browser interface to protect application logic and database from unauthorized tampering or piracy.
  - **Privacy & Repository Security:** Completely removed all exposed GitHub releases URLs, repository names, and direct download links from the Settings view and client code to safeguard project source integrity.
  - **Seamless 1-Click NSIS Auto-Updater Resolution (`main.cjs`, `package.json`, `App.tsx`):**
    * Configured NSIS for true 1-click silent background auto-updates (`oneClick: true`, `perMachine: false`, `allowElevation: false`, `runAfterFinish: true`), eliminating NSIS assisted installer dialog halts and UAC elevation prompts that caused updates to abort and version loops.
    * Implemented single idempotent `installAndRelaunch()` in `main.cjs` to eliminate conflicting parallel calls to `quitAndInstall()` and prevented premature window destruction (`mainWindow.close()`) before installer spawn.
    * Added live runtime version detection (`electronAPI.getVersion()`) across Sidebar, Dashboard, and Settings so installed desktop apps dynamically display running version accurately.
    * Installed `nodemailer` package to guarantee error-free background email scheduler compilation (v1.0.101+).
* **Digital Munimji Billing & Item Automation Overhaul (`munimjiPool.ts`, `server.ts`, `MunimjiDrawer.tsx`):**
  - **Direct Sales Invoice Auto-Apply:** When users ask Munimji to create a bill ("बिल कर", "नवीन बिल", "५ साखर, २ तेल बिल कर"), Munimji immediately populates the bill editor with exact items, prices, quantities, and units via `onApplyBillToEditor()`, navigating directly to sales with live auditory feedback instead of redirecting or dropping bill items.
  - **Dynamic Item Auto-Addition without Default Placeholders:** When a spoken invoice includes new or uncatalogued items, Munimji dynamically creates and registers them into the inventory database (`db.items`) using their exact spoken/written names (preventing generic names like "Item 1" or "नवीन वस्तू").
  - **Intelligent Bulk/Multi-Item Voice Parsing:** Added enhanced multi-item extraction across commas, newlines, "आणि", "व", "+", and numbered lists ("१. साखर २ किलो, २. तेल १ लिटर"), cleanly segmenting each spoken product into its own distinct catalog and invoice line without merging everything into a single corrupted string.
* **Modern Tabbed Settings & 100% Database Persistence (`SettingsView.tsx`, `server.ts`):**
  - **Sub-Tab Navigation Bar:** Settings is now organized into dedicated responsive sub-tabs: 🏢 व्यवसाय व GST (Profile), ⭐ लॉयल्टी रिवॉर्ड्स (Loyalty), 📧 दैनिक अहवाल (EOD Reports), 🖨️ थर्मल प्रिंटर (Thermal Designer), 🔐 सुरक्षा व लॉगिन (Security), 💾 बॅकअप व रिसेट (Backup & Reset), and ⚡ ॲप व्हर्जन (Updates).
  - **Dedicated Save Buttons & Real-Time Sync:** Every tab now contains its own prominent "Save Changes" button, plus a top action bar save button. Settings syncs directly to `db.business` via deep-merge `POST /api/business`, eliminating data loss when toggling loyalty or email report configurations.
* **Live Webcam & Camera Document Scanner with Desktop Defaults (`CameraScannerModal.tsx`, `main.cjs`, `MunimjiDrawer.tsx`, `InvoiceUploadModal.tsx`, `ItemsScanModal.tsx`):**
  - **Unified Live Camera Scanner Modal (`CameraScannerModal.tsx`):** High-resolution camera stream (up to 1080p document clarity) with camera device switcher (front, back, external USB webcam, document scanner), document alignment guidelines, 1-click snapshot capture, shutter animation, and retake/confirm flow.
  - **Desktop App Webcam Auto-Grant (`main.cjs`):** Configured Electron `setPermissionCheckHandler`, `setPermissionRequestHandler`, and `setDevicePermissionHandler` to unconditionally grant video/camera and audio permissions in the desktop application, allowing desktop webcams to start by default without permission denials.
  - **Digital Munimji Camera Scan Option (`MunimjiDrawer.tsx`):** Added a dedicated Live Camera scan button next to the voice recording and upload buttons in the Munimji assistant drawer, enabling 1-click webcam scanning of handwritten bills or item lists with instant Marathi voice & draft card generation.
  - **Dual Scan Options in Purchase Invoicing & Inventory (`InvoiceUploadModal.tsx`, `ItemsScanModal.tsx`, `InvoicingView.tsx`):** Provided clean dual options ("थेट वेबकॅमने स्कॅन करा (Live Camera Scan)" and "फाईल / PDF अपलोड करा") in all document and bill scanning flows.
* **Precise Handwritten Note GST & Amount Extraction Engine (`server.ts`, `ItemsScanModal.tsx`, `ItemsView.tsx`):**
  - **AI Prompt Hardening:** Hardened Gemini prompt in `/api/ai/parse-items-list` to strictly extract the exact GST rate written on handwritten notes (0%, 0.1%, 0.25%, 1.5%, 3%, 5%, 6%, 7.5%, 12%, 18%, 28%, 40%), calculate split CGST+SGST, and compute tax rates from written tax amounts without guessing or defaulting to 18% on non-taxed notes.
  - **Data Normalization & Sanitization:** Implemented `parseGstRate()` in both backend (`server.ts`) and frontend (`ItemsScanModal.tsx`), guaranteeing that parsed percentages match between UI review and database persistence.
  - **Atomic Batch Item Persistence:** Added support in `/api/items` for array payloads and atomic batch saving to eliminate race conditions when importing large scanned lists.
* **Multi-Key Quota Rotation Pool & Stealth Core Diagnostic (`munimjiPool.ts`, `server.ts`, `SettingsView.tsx`, `.gitignore`):**
  - **Dynamic Multi-Key Pool Expansion:** The server automatically discovers and loads API keys across `gemini_keys.txt` (any number of newline/comma-separated keys), `gemini_key_1..20.txt`, `GEMINI_API_KEY_1..20`, and `GEMINI_API_KEYS` env variables with zero manual config.
  - **Failover & Quota Protection:** Instant failover to alternative keys and 5 prioritized candidate models (`gemini-3.1-flash-lite`, `gemini-3.5-flash-lite`, `gemini-3.5-flash`, `gemini-flash-latest`, `gemini-3.8-flash`) on 429 quota exhaustion.
  - **Stealth Core Engine Signature:** Discreet chip rendered in Settings updater card (`Core Engine: E{n}-OK • Live`). Invisible to unauthorized personnel with a secret 3-tap diagnostic modal revealing engine counts and quota health exclusively to the owner.
  - **Comprehensive DevTools & Anti-Tampering Shield (`main.cjs`, `App.tsx`):** Unconditional interception and blocking of `F12`, `Ctrl+Shift+I`, `Ctrl+Shift+J`, `Ctrl+Shift+C`, `Ctrl+U`, `Ctrl+S`, and right-click context menu inspection across both Electron desktop executable and web browser builds.
  - **Repository Secret Shield:** Expanded `.gitignore` to strictly exclude `gemini_keys.txt`, `gemini_keys*.txt`, `data/gemini_keys.txt`, `*.key`, and `*.pem` from ever being tracked in GitHub.
  - **100% Real-Time Dynamic Dashboard Liquidity (`DashboardView.tsx`, `App.tsx`):** Removed all hardcoded static amounts (such as `750000`). Cash & Bank liquidity is now calculated dynamically in real-time directly from actual database invoices (sales collections minus purchase payments) and miscellaneous transactions.

---

## 🚀 4. Upcoming Roadmap & Next Phases (In Serial Order)

| Phase | Feature Name | Scope & Specifications | Priority |
| :--- | :--- | :--- | :--- |
| **Phase 10** | **Barcode Generator & Label Sticker Printing** | 24-up / 40-up sticker sheet printing for retail barcodes and thermal barcode printers. | **Next / High** |
| **Phase 11** | **Automated WhatsApp Payment Reminders & Invoices** | Direct WhatsApp Web / Cloud API integration for 1-click sharing of PDF bills and payment balance reminder links. | High |

---

## 💻 5. Key File Index for Quick Navigation
* `src/App.tsx` - Root UI orchestrator, persistent database sync, view router, and top navigation.
* `server.ts` - Express API backend, Gemini AI client, Digital Munimji execution engine, database normalization, and backup runner.
* `src/server/eodReportService.ts` - End-of-Day report engine, HTML email builder, and SMTP scheduler (Phase 8).
* `src/types.ts` - Central TypeScript interfaces (`Item`, `Party`, `Invoice`, `Godown`, `StockTransferVoucher`, `DeliveryChallan`, `Quotation`, `BusinessProfile`, `ScheduledEmailConfig`, etc.).
* `src/components/GodownsView.tsx` - Multi-Godown and warehouse stock transfer manager (Phase 9).
* `src/components/StockTransferPrintModal.tsx` - Inter-godown stock transfer delivery transit pass print modal (Phase 9).
* `src/components/EWayBillModal.tsx` - Official NIC E-Way Bill & E-Invoice modal (Phase 5).
* `src/components/InvoicingView.tsx` - High-speed POS Billing, item search, batch selection, dynamic GST, checkout, and parked bills.
* `src/components/DeliveryChallansView.tsx` - Delivery challan management, vehicle transport tracking, and bill conversion.
* `src/components/ItemsView.tsx` - Inventory catalog, dynamic GST selector, batch/expiry alerts, low stock badges, AI item scanner.
* `src/components/PartiesView.tsx` - Customer and Supplier Khata ledger, loyalty ledger, and payment reminders.
* `src/components/ReportsView.tsx` - GSTR-1, GSTR-3B, P&L, Daybook, EOD email dispatch, and CSV export.
* `src/components/SettingsView.tsx` - Business profile, thermal bill designer, loyalty config, and automated EOD email reports.
* `src/components/MunimjiDrawer.tsx` - Digital Munimji AI floating voice assistant drawer.
* `src/services/munimjiClient.ts` - Frontend client service for voice recording, streaming, and command processing.
* `docs/FEATURE_ROADMAP_AND_STATUS.md` - Detailed Marathi & English feature completion and status breakdown.

---

## 🔄 6. Instructions for Future AI Development Sessions
Whenever resuming work on this codebase in a new Google AI Studio conversation:
1. **Read `PROJECT_CONTEXT.md` first:** Check which phase was completed last (currently **Phase 9: Multi-Godown / Warehouse Stock Transfer & Dynamic GST**).
2. **Follow Serial Order:** Proceed to the next pending phase (**Phase 10: Barcode Generator & Label Sticker Printing**).
3. **Verify Builds:** Always run `lint_applet` and `compile_applet` before completing work.
4. **Push to GitHub:** Commit and push changes to the repository `devrupeshgadkhe/Repo_billingOnHands` on branch `main`.
5. **Update this file (`PROJECT_CONTEXT.md`):** Mark the completed phase and document key architecture changes immediately.
