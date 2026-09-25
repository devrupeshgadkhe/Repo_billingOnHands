# AI-Powered Invoice-to-Purchase Bill (Image & PDF Extraction)

This feature enables retail store owners and managers to upload paper supplier invoices, bill photos, or PDF purchase receipts, automatically extracting vendor details, invoice numbers, dates, line items, quantities, rates, and GST breakdown into the Purchase Bill form for 1-click verification and entry.

> [!IMPORTANT]
> **Confirmed Choices from Phase 1 Discussion:**
> - **Verification Workflow**: The extracted data is pre-filled directly into the Purchase Bill creation form rather than silently committed to the database, giving the store owner 100% review and adjustment control.
> - **Free Tier Quota Management**: When the free tier quota is exhausted (Google Gemini 429 / Resource Exhausted), the AI Scan button and options are automatically hidden from the UI to prevent user frustration. Once the daily quota resets or recovers, the scan option automatically reappears.
> - **File Formats**: Supports both camera photos / images (`image/jpeg`, `image/png`, `image/webp`) and digital documents (`application/pdf`).

---

## 1. Overview & Core Concept

### What It Does
Retail store operators currently spend minutes manually keying in supplier invoices, line by line, calculating purchase rates, HSN codes, and GST slabs. With this feature:
1. The user drags & drops or takes a photo of a physical bill or uploads a vendor PDF.
2. Server-side Gemini AI (`gemini-3.8-flash`) parses the document structure with strict JSON schema enforcement.
3. The system maps extracted line items to existing inventory items (or prepares new stock items), matches the supplier party by GSTIN or name, and populates the Purchase Bill entry form.
4. The user reviews the pre-filled fields, checks the totals against the physical bill, and saves it with a single click.

### Target Audience & Persona
Busy shop owners (Kirana stores, garment shops, hardware/electronics retailers) receiving multiple distributor shipments weekly who want fast, error-free stock entry without manual typing.

### Key Value
- **Time Saving**: Reduces 5–10 minutes of manual data entry per bill down to 5–10 seconds.
- **Accuracy**: Prevents typos in HSN codes, quantities, rates, and GST rates.
- **Zero Cost (Free Tier First)**: Runs within Google Gemini's generous free tier limits with zero external paid subscriptions.

---

## 2. User Experience & Visual Design

### Key User Flows

```
[Purchase Invoices Screen]
       │
       ▼
 [Upload Invoice Button] ──(Quota Available?)──► [Show Clean Dropzone Modal]
       │                                                      │
       └──(Quota Exhausted)──► [Button Auto-Hidden]           ▼
                                                     [Select File / Drop Photo / PDF]
                                                              │
                                                              ▼
                                                     [Extracting Loader with Animation]
                                                              │
                                                              ▼
                                                     [Populate Purchase Form]
                                                              │
                                                              ▼
                                                     [User Verifies & Saves Bill]
```

1. **Entry Point in Purchases Tab**:
   - An elegant action button in the Purchases section: `AI Scan Supplier Invoice (PDF/Image)` styled with an emerald subtle glow and sparkle icon.
   - When quota is exhausted, this button is smoothly hidden, leaving only the standard "New Purchase Bill" manual entry button.

2. **Upload Modal & Drag-and-Drop Zone**:
   - Clean, distraction-free dropzone supporting drag-and-drop, file browser, or paste from clipboard.
   - Live thumbnail preview for images and PDF document badge.
   - Visual cues showing accepted formats (`JPG, PNG, PDF up to 10MB`).

3. **Extraction Progress & Thinking State**:
   - Reassuring progress indicator with pulsing steps: *"Analyzing bill layout..."* -> *"Matching supplier & items..."* -> *"Calculating GST..."*.

4. **Form Pre-Fill & Review**:
   - The user is transitioned directly to the standard Purchase Bill form with all fields pre-populated:
     - **Supplier**: Pre-selected if matched; if new, pre-fills name and GSTIN.
     - **Invoice No & Date**: Exact bill number and issue date from the supplier.
     - **Item Table**: Extracted items with quantities, rates, HSN codes, and GST rates mapped to store catalog.
   - Unmatched new items display an informative badge: `New Item Detected - Will be added to catalog on save`.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Server-Side Proxy Route vs Client-Side Direct Calls
- **Chosen Approach**: All AI calls run through Express server proxy route (`POST /api/ai/parse-invoice`).
- **Why**: Keeps the environment API key secure on the backend, enforces rate-limiting logic, and enables file size and MIME-type validation before sending to Gemini.
- **Trade-Off**: Extra hop to the local server, which has negligible latency (<5ms) compared to model inference.

### Decision 2: Graceful Quota Handling & Auto-Hide Policy
- **Chosen Approach**: Server maintains an in-memory/cache status of quota health. When Gemini returns `429 RESOURCE_EXHAUSTED` or rate limit errors:
  1. The server flags `quotaStatus: { available: false, resetTime: "tomorrow 00:00 UTC" }`.
  2. The frontend suppresses/hides the AI scan button.
  3. A periodic background check or timestamp expiry restores the feature automatically when the quota window resets.
- **Why**: Protects user trust. Users won't click a feature that fails; standard manual billing remains 100% reliable and unaffected.

### Decision 3: Structured Schema Output via `gemini-3.8-flash`
- **Chosen Approach**: Use `@google/genai` with `responseMimeType: "application/json"` and strict `responseSchema`.
- **Why**: Guarantees valid JSON output matching our database data models (`itemName`, `hsn`, `quantity`, `purchasePrice`, `gstRate`, etc.), eliminating unstructured markdown parsing errors.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Client UI (React SPA)                           │
│                                                                        │
│   ┌──────────────────────────┐      ┌──────────────────────────────┐   │
│   │ PurchasesScreen Component│      │  InvoiceUploadModal          │   │
│   │  (Checks AI Quota Status)│◄────►│  (Drag & Drop, Preview)      │   │
│   └─────────────┬────────────┘      └──────────────┬───────────────┘   │
└─────────────────┼──────────────────────────────────┼───────────────────┘
                  │                                  │
                  │ GET /api/ai/status               │ POST /api/ai/parse-invoice
                  ▼                                  ▼ (base64 image / pdf)
┌────────────────────────────────────────────────────────────────────────┐
│                        Express Server (server.ts)                      │
│                                                                        │
│   ┌──────────────────────────┐      ┌──────────────────────────────┐   │
│   │ Quota Tracker & Cache    │      │  AI Invoice Controller       │   │
│   │ (429 detection & timers) │◄────►│  - File type validation      │   │
│   └──────────────────────────┘      │  - Gemini Prompt & Schema    │   │
│                                     └──────────────┬───────────────┘   │
└────────────────────────────────────────────────────┼───────────────────┘
                                                     │
                                                     ▼
                                      ┌──────────────────────────────┐
                                      │ Google GenAI SDK             │
                                      │ (gemini-3.8-flash)           │
                                      │ Multimodal Vision / PDF      │
                                      └──────────────────────────────┘
```

### JSON Extraction Schema Contract

```json
{
  "supplierName": "string",
  "supplierGstin": "string",
  "supplierAddress": "string",
  "invoiceNumber": "string",
  "invoiceDate": "YYYY-MM-DD",
  "items": [
    {
      "name": "string",
      "hsn": "string",
      "quantity": 0,
      "unit": "PCS | KGS | LTR | BOX",
      "rate": 0,
      "gstRate": 0,
      "taxableAmount": 0,
      "totalAmount": 0
    }
  ],
  "subtotal": 0,
  "taxAmount": 0,
  "cgst": 0,
  "sgst": 0,
  "igst": 0,
  "grandTotal": 0
}
```

### Next Steps
Once you review and approve this plan, we can implement:
1. The server-side Gemini multimodal parsing route with schema validation and quota tracking.
2. The user-friendly upload modal with PDF and photo support in the Purchases screen.
3. The automated form population and item-matching logic.
