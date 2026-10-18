# 🧪 Billing On Hand - Comprehensive End-to-End Test Suite & Test Plan

> **Document Purpose:** This document provides exhaustive end-to-end test cases covering every module, workflow, business vertical, positive/negative scenario, Digital Munimji voice assistant command, and security safeguard implemented in **Billing On Hand** (`Repo_billingOnHands`).

---

## 📋 Table of Contents
1. [Test Strategy & Scope](#1-test-strategy--scope)
2. [Module 1: Business Profiles & Vertical Adaptation (Settings & PIN Security)](#2-module-1-business-profiles--vertical-adaptation-settings--pin-security)
3. [Module 2: Inventory Catalog & Batch/Expiry Management](#3-module-2-inventory-catalog--batchexpiry-management)
4. [Module 3: Barcode Generator & Thermal/Sheet Label Printing](#4-module-3-barcode-generator--thermalsheet-label-printing)
5. [Module 4: High-Speed POS Billing & Multi-Payment Checkout](#5-module-4-high-speed-pos-billing--multi-payment-checkout)
6. [Module 5: Customer Schemes, Discounts & Rewards Hub](#6-module-5-customer-schemes-discounts--rewards-hub)
7. [Module 6: Quotations & Delivery Challans](#7-module-6-quotations--delivery-challans)
8. [Module 7: Parties & Customer Khata / Loyalty Ledger](#8-module-7-parties--customer-khata--loyalty-ledger)
9. [Module 8: Multi-Godown / Warehouse & Stock Transfer Management](#9-module-8-multi-godown--warehouse--stock-transfer-management)
10. [Module 9: NIC E-Way Bill & E-Invoice Generator](#10-module-9-nic-e-way-bill--e-invoice-generator)
11. [Module 10: Reports, Analytics & Automated EOD Email Reports](#11-module-10-reports-analytics--automated-eod-email-reports)
12. [Module 11: Digital Munimji AI Voice & Multimodal Assistant](#12-module-11-digital-munimji-ai-voice--multimodal-assistant)
13. [Module 12: Security, DevTools Shield & Anti-Tampering](#13-module-12-security-devtools-shield--anti-tampering)

---

## 1. Test Strategy & Scope
* **Testing Levels:** Functional, Integration, Regression, Voice-AI Interaction, Security & Negative Error Handling.
* **Execution Environments:** Web browser (Chrome/Firefox/Edge) and Desktop Electron Application (Windows/Mac/Linux).
* **Coverage Goal:** 100% of features, business types, edge cases, and user workflows.

---

## 2. Module 1: Business Profiles & Vertical Adaptation (Settings & PIN Security)

| Test ID | Scenario Name | Type | Test Steps | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **SET-01** | Update Business Profile Details | Positive | 1. Go to Settings > Profile tab.<br>2. Edit store name, GSTIN, address, state.<br>3. Click "Save Business Profile". | Data is saved successfully and reflected immediately in the top header and invoice headers. |
| **SET-02** | Invalid GSTIN Validation | Negative | 1. Enter a 10-character alphanumeric string in GSTIN field.<br>2. Attempt to save. | System triggers pre-validation warning or highlights GSTIN format error. |
| **SET-03** | Vertical Switching with Correct PIN | Positive | 1. In Settings, change business vertical dropdown (e.g. from General Retail to Pharmacy / Medical).<br>2. Click Save.<br>3. PIN Modal appears asking for Admin PIN.<br>4. Enter correct PIN (`1234`) or click "Auto-Fill Default".<br>5. Click "Confirm & Switch Vertical". | Vertical updates successfully, POS adapts units/layout, and success alert is shown. |
| **SET-04** | Vertical Switching with Incorrect PIN | Negative | 1. Attempt to switch business vertical.<br>2. Enter incorrect PIN (`9999`).<br>3. Click Confirm. | System displays a clear error warning ("Incorrect Security PIN. Default PIN is 1234") and blocks the switch. |
| **SET-05** | Customizing Admin Security PIN | Positive | 1. Go to Settings > Security tab.<br>2. Enter new 4-digit PIN (`5678`).<br>3. Save.<br>4. Attempt vertical switch using `5678`. | New PIN validates successfully; old PIN (`1234`) is rejected. |

---

## 3. Module 2: Inventory Catalog & Batch/Expiry Management

| Test ID | Scenario Name | Type | Test Steps | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **INV-01** | Add New Item with Batch & Expiry | Positive | 1. Go to Items View > Add Item.<br>2. Enter name, HSN, purchase price, selling price, GST slab.<br>3. Enter Batch No (`BAT-2026-01`), Expiry Date (`2027-12-31`).<br>4. Save. | Item is saved with batch and expiry tracking enabled. |
| **INV-02** | Near-Expiry & Expired Inventory Filter | Positive | 1. In Items View, click filter tabs ("Near Expiry", "Expired", "Low Stock"). | Table correctly filters items within 45-day expiry threshold or 0 stock limit. |
| **INV-03** | Zero / Negative Selling Price Validation | Negative | 1. Try creating an item with selling price `-10` or `0`.<br>2. Save. | Validation error prevents saving items with invalid pricing. |

---

## 4. Module 3: Barcode Generator & Thermal/Sheet Label Printing

| Test ID | Scenario Name | Type | Test Steps | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **BAR-01** | 1-Click Barcode Generation | Positive | 1. Open Item in catalog.<br>2. Click "Generate Barcode". | A unique scannable barcode (CODE128 / EAN-13) is generated and assigned instantly. |
| **BAR-02** | Thermal & A4 Sheet Label Printing | Positive | 1. Select items in catalog.<br>2. Click "Print Barcode Labels".<br>3. Choose format (Thermal roll 50x25mm or A4 24-up sticker sheet).<br>4. Print. | Print preview renders exact sticker layout with store name, item name, price, and scannable barcode. |

---

## 5. Module 4: High-Speed POS Billing & Multi-Payment Checkout

| Test ID | Scenario Name | Type | Test Steps | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **POS-01** | Cash Sale Checkout with Tender Calculator | Positive | 1. Open Invoicing View.<br>2. Add items with fractional quantities (`0.5` kg, `1.5` ltr).<br>3. Select Cash payment [F5].<br>4. Enter cash tendered higher than grand total.<br>5. Complete charge & print. | Change returned is accurately calculated; invoice is saved and receipt modal opens. |
| **POS-02** | UPI / Bank Payment Checkout | Positive | 1. Select UPI/Bank payment [F6].<br>2. Verify dynamic UPI QR code rendered from store UPI ID.<br>3. Complete charge. | Invoice marked as paid via Bank; transaction recorded in Daybook. |
| **POS-03** | Khata (Credit) Sale against Customer | Positive | 1. Select Khata / Unpaid payment.<br>2. Select customer party.<br>3. Charge. | Invoice added to customer's outstanding balance; SMS/Print reminder generated. |
| **POS-04** | Dual GST vs Non-GST Billing Mode Switch | Positive | 1. Toggle billing mode button on POS header between "GST Bill" and "Non-GST (साधी पावती)". | All GST breakdowns, CGST/SGST/IGST, HSN columns, and GSTIN numbers are instantly hidden in Non-GST mode. |
| **POS-05** | Sale Return linked to Original Bill | Positive | 1. Switch transaction subtype to "Sale Return".<br>2. Enter original invoice reference and return items. | Credit Note (CN) generated with refund amount credited/adjusted against customer account. |

---

## 6. Module 5: Customer Schemes, Discounts & Rewards Hub

| Test ID | Scenario Name | Type | Test Steps | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **SCH-01** | Configure Instant Discount Scheme | Positive | 1. Go to Settings > Loyalty & Schemes tab.<br>2. Enable Instant Discount (e.g. 5% off on bills over ₹1,000).<br>3. Save. | POS automatically computes 5% discount when cart subtotal exceeds ₹1,000. |
| **SCH-02** | Tiered Slab Discount Testing | Positive | 1. Configure slab: ₹1000 = 5%, ₹2500 = 8%, ₹5000 = 12%.<br>2. Simulate bill of ₹3,000 in Settings live simulator or POS. | Slab tier correctly applies 8% discount. |
| **SCH-03** | Customer Khata Cashback Credit | Positive | 1. Enable 5% cashback auto-credit to Khata.<br>2. Complete a ₹2,000 sale with a registered customer. | ₹100 cashback is credited to customer's store credit balance (`party.currentBalance`) on bill completion. |
| **SCH-04** | Loyalty Points Accumulation & Redemption | Positive | 1. Earn points on bill.<br>2. On next visit, redeem accumulated points (`pointsRedeemed`) for instant rupee discount. | Points balance deducted correctly; points discount subtracted from grand total. |

---

## 7. Module 6: Quotations & Delivery Challans

| Test ID | Scenario Name | Type | Test Steps | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **QUT-01** | Create Quotation & Convert to Invoice | Positive | 1. Create Quotation in Quotations View.<br>2. Click "Convert to Sales Invoice". | Quotation status updates to Accepted; items, customer, and pricing are instantly loaded into POS billing. |
| **CHL-01** | Create Delivery Challan with Vehicle Details | Positive | 1. Go to Delivery Challans View > New Challan.<br>2. Enter vehicle number, transporter, gross/net weight, LR number.<br>3. Save & Print. | Rule 55 compliant transit pass printed with all transport details. |

---

## 8. Module 7: Parties & Customer Khata / Loyalty Ledger

| Test ID | Scenario Name | Type | Test Steps | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **PAR-01** | Customer Loyalty Points Manual Adjustment | Positive | 1. Go to Parties View > Customer Khata > Loyalty Ledger modal.<br>2. Add bonus points (+50 pts) with reason notes.<br>3. Submit. | Customer loyalty balance updates instantly; audit trail record logged in `loyaltyLedger`. |
| **PAR-02** | Negative Loyalty Deduction Guard | Negative | 1. Attempt to deduct more points than customer's current balance. | System blocks negative balance with a warning. |

---

## 9. Module 8: Multi-Godown / Warehouse & Stock Transfer Management

| Test ID | Scenario Name | Type | Test Steps | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **GOD-01** | Create Multi-Godown Location | Positive | 1. Go to Godowns View > Add Godown (e.g. Cold Storage Depot).<br>2. Save. | Godown created with supervisor and address details. |
| **GOD-02** | Inter-Godown Stock Transfer & Ledger Balancing | Positive | 1. Create Stock Transfer Voucher from Main Store to Depot.<br>2. Select items and quantities. | Stock is automatically deducted from source godown and added to destination godown; delivery transit pass prints correctly. |

---

## 10. Module 9: NIC E-Way Bill & E-Invoice Generator

| Test ID | Scenario Name | Type | Test Steps | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **EWB-01** | NIC E-Way Bill JSON Generation & Pre-Validation | Positive | 1. Open E-Way Bill modal from completed invoice.<br>2. Validate 15-char GSTIN, 6-digit PIN codes, and vehicle number.<br>3. Generate JSON. | 100% compliant JSON payload generated for direct upload to `ewaybillgst.gov.in`. |
| **EWB-02** | Invalid Vehicle Number Validation | Negative | 1. Enter incomplete vehicle number in E-Way Bill modal.<br>2. Generate JSON. | Pre-validation warning prompts user to correct vehicle number format. |

---

## 11. Module 10: Reports, Analytics & Automated EOD Email Reports

| Test ID | Scenario Name | Type | Test Steps | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **REP-01** | GSTR-1 & GSTR-3B Tax Report Generation | Positive | 1. Go to Reports View > GSTR-1 tab.<br>2. Select date range. | Accurate summary of B2B, B2CL, B2CS, and HSN-wise tax totals. |
| **REP-02** | Automated EOD Email Dispatch & Preview | Positive | 1. Go to Settings > EOD Reports tab.<br>2. Click "Preview HTML Email" or "Send Test EOD Report". | Professional branded HTML email generated with net sales, cash in drawer, UPI collection, and top items. |

---

## 12. Module 11: Digital Munimji AI Voice & Multimodal Assistant

| Test ID | Scenario Name | Type | Test Steps | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **AI-01** | Voice Command for Direct POS Billing | Positive | 1. Open Munimji Assistant Drawer.<br>2. Speak command in Marathi/Hindi/English ("५ किलो साखर, २ लिटर तेल बिल कर"). | Munimji parses items, automatically populates the POS invoice editor, navigates to Invoicing, and drawer auto-minimizes. |
| **AI-02** | Uncatalogued Spoken Item Auto-Addition | Positive | 1. Speak an invoice containing uncatalogued items (e.g. "शेंगदाणे, गूळ"). | Items are automatically created and registered into inventory on the fly with estimated pricing while being added to the bill. |
| **AI-03** | Live Webcam Document & Bill Scanning | Positive | 1. Click Live Camera Scan button in Munimji or Invoice Upload modal.<br>2. Capture handwritten bill note. | OCR engine extracts items, quantities, rates, and GST rates accurately without guessing. |

---

## 13. Module 12: Security, DevTools Shield & Anti-Tampering

| Test ID | Scenario Name | Type | Test Steps | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | DevTools / F12 Inspection Block | Positive | 1. Press `F12`, `Ctrl+Shift+I`, `Ctrl+U`, or right-click context menu. | Intercepted and blocked across both browser and Electron desktop app to protect source code and database integrity. |
| **SEC-02** | Stealth Core Engine Diagnostic Signature | Positive | 1. Inspect Settings updater card for discreet chip (`Core Engine: E{n}-OK • Live`).<br>2. Perform secret 3-tap diagnostic. | Reveals engine health and quota status exclusively to store owner. |
