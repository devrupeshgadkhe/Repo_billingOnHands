const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");
const LOCK_PATH = path.join(DATA_DIR, "install-lock.json");

function readDiskDb() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

async function fetchApiDb(page) {
  return await page.evaluate(async () => {
    const res = await fetch("/api/db", { cache: "no-store" });
    if (!res.ok) throw new Error(`GET /api/db failed with ${res.status}`);
    return await res.json();
  });
}

(async () => {
  const hadDb = fs.existsSync(DB_PATH);
  const origDbContent = hadDb ? fs.readFileSync(DB_PATH, "utf8") : null;
  const hadLock = fs.existsSync(LOCK_PATH);
  const origLockContent = hadLock ? fs.readFileSync(LOCK_PATH, "utf8") : null;

  // Ensure a clean first-install state before launching browser
  if (fs.existsSync(LOCK_PATH)) {
    fs.unlinkSync(LOCK_PATH);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];

  let ignoreSimulated500Console = false;
  page.on("pageerror", (err) => pageErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (ignoreSimulated500Console && text.includes("status of 500")) {
        return;
      }
      consoleErrors.push(text);
    }
  });

  try {
    console.log("1. Opening app & completing Restaurant Mode installation setup...");
    await page.goto(BASE_URL, { waitUntil: "networkidle" });

    // Complete first-time install setup for Restaurant & Cafe mode with demo menu & tables
    await page.getByRole("button", { name: /Restaurant/i }).first().click();
    await page.locator('input[placeholder*="Restaurant"]').fill("Spice Garden Bistro");
    await page.locator("label", { hasText: /Load Sample Industry Items/i }).click();
    await page.locator("label", { hasText: /I understand & confirm/i }).locator('input[type="checkbox"]').check();
    await page.getByRole("button", { name: /Confirm & Lock Business Mode/i }).click();

    console.log("2. Logging in as admin...");
    await page.locator("#auth-input-username").waitFor({ state: "visible", timeout: 15000 });
    await page.locator("#auth-input-username").fill("admin");
    await page.locator("#auth-input-password").fill("admin123");
    await page.locator("#auth-submit-btn").click();

    await page.locator("#sidebar-tables-btn").waitFor({ state: "visible", timeout: 15000 });
    await page.locator("#sidebar-tables-btn").click();
    await page.getByText("Restaurant Table Management").waitFor({ state: "visible" });

    // Verify initial DB has restaurant tables
    let apiDb = await fetchApiDb(page);
    assert.equal(apiDb.business.businessType, "restaurant");
    assert.ok(apiDb.tables.length >= 4, "Restaurant tables should be initialized");
    assert.ok(apiDb.items.length >= 2, "Demo menu items should be initialized");

    // ---------------------------------------------------------------
    // TEST 1: Open T-1 -> Add multiple items + metadata -> Save to Table
    // Verify Cart stays visible IMMEDIATELY after Save to Table
    // ---------------------------------------------------------------
    console.log("3. Testing Take Order on T-1 -> Add items -> Save to Table (immediate visibility)...");
    const t1Card = page.locator("div.rounded-2xl").filter({ has: page.getByText("T-1", { exact: true }) }).first();
    await t1Card.getByRole("button", { name: /Take Order/i }).click();

    await page.locator("#pos-terminal-root").waitFor({ state: "visible" });
    const selectedTableVal = await page.locator("#pos-table-select").inputValue();
    assert.equal(selectedTableVal, "tbl_1", "T-1 should be selected in POS table dropdown");

    // Record first 3 menu items from DB to pick deterministically
    const dish1 = apiDb.items[0];
    const dish2 = apiDb.items[1];
    const dish3 = apiDb.items[2] || apiDb.items[0];

    // Add Dish 1 via scanner/terminal input twice (or add + stepper)
    await page.locator("#pos-barcode-scanner-input").fill(dish1.name);
    await page.locator("#pos-barcode-scanner-input").press("Enter");
    // Wait for row 1
    await page.locator("tbody tr").first().waitFor({ state: "visible" });

    // Click + button on row 1 to set qty = 1.5 (POS fractional stepper)
    await page.locator("tbody tr").nth(0).locator("button").nth(1).click();
    const row1Qty = await page.locator("tbody tr").nth(0).locator('input[type="number"]').first().inputValue();
    assert.equal(Number(row1Qty), 1.5, "Dish 1 quantity should be 1.5");

    // Add Dish 2
    await page.locator("#pos-barcode-scanner-input").fill(dish2.name);
    await page.locator("#pos-barcode-scanner-input").press("Enter");
    await page.locator("tbody tr").nth(1).waitFor({ state: "visible" });

    // Apply 10% discount on row 2
    const row2DiscInput = page.locator("tbody tr").nth(1).locator('input[type="number"]').nth(2);
    await row2DiscInput.fill("10");

    // Add Custom Guest Name
    await page.locator("#pos-party-search-input").fill("Rohan Deshmukh");

    // Switch Payment Method to UPI/Bank
    await page.getByRole("button", { name: /UPI\/Bank/i }).click();

    // Add Extra Charge ("Service Charge", 45)
    await page.getByRole("button", { name: /Additional Charges/i }).click();
    await page.getByRole("button", { name: /Add Extra Charge/i }).click();
    await page.locator('input[placeholder="e.g. Delivery"]').fill("Service Charge");
    await page.locator('input[placeholder="₹"]').fill("45");

    // Add Bill Notes
    await page.getByRole("button", { name: /\+ Add Bill Remarks/i }).click();
    await page.locator('textarea[placeholder*="Delivery terms"]').fill("Extra spicy, no onion");

    const preSaveInvNo = await page.locator("#pos-invoice-number-input").inputValue();
    const preSaveTotalText = (await page.locator("#pos-grand-total-amount").innerText()).trim();
    const preSaveRowCount = await page.locator("tbody tr").count();
    assert.equal(preSaveRowCount, 2, "Cart must have 2 lines before Save to Table");
    assert.notEqual(preSaveTotalText, "₹0.00", "Grand total must be non-zero before Save to Table");

    // Click Save to Table and monitor POST /api/tables/item + GET /api/db
    const [saveResp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/tables/item") && r.request().method() === "POST"),
      page.getByRole("button", { name: /Save to Table/i }).click()
    ]);
    assert.equal(saveResp.status(), 200, "POST /api/tables/item must return 200");

    // Wait past fetchState & re-renders to make sure cart DOES NOT DISAPPEAR
    await page.waitForTimeout(1200);

    const immediatePostSaveRows = await page.locator("tbody tr").count();
    const immediatePostSaveTotal = (await page.locator("#pos-grand-total-amount").innerText()).trim();
    const immediatePostSaveInv = await page.locator("#pos-invoice-number-input").inputValue();
    const immediatePostSaveParty = await page.locator("#pos-party-search-input").inputValue();

    assert.equal(immediatePostSaveRows, 2, "CRITICAL: Cart items must NOT disappear immediately after Save to Table");
    assert.equal(immediatePostSaveTotal, preSaveTotalText, "CRITICAL: Bill total must NOT reset to 0 after Save to Table");
    assert.equal(immediatePostSaveInv, preSaveInvNo, "Invoice number must stay intact after Save to Table");
    assert.equal(immediatePostSaveParty, "Rohan Deshmukh", "Customer name must stay intact after Save to Table");

    // Verify backend JSON persistence directly
    apiDb = await fetchApiDb(page);
    const savedT1 = apiDb.tables.find((t) => t.id === "tbl_1");
    assert.equal(savedT1.status, "occupied");
    assert.equal(savedT1.currentOrderInvoiceNumber, preSaveInvNo);
    assert.equal(savedT1.currentOrderItems.length, 2);
    assert.equal(savedT1.currentOrderItems[0].itemName, dish1.name);
    assert.equal(savedT1.currentOrderItems[0].quantity, 1.5);
    assert.equal(savedT1.currentOrderExtraCharges.length, 1);
    assert.equal(savedT1.currentOrderExtraCharges[0].amount, 45);
    assert.equal(savedT1.currentOrderNotes, "Extra spicy, no onion");
    assert.equal(savedT1.currentOrderDraft.partyName, "Rohan Deshmukh");
    assert.equal(savedT1.currentOrderDraft.paymentType, "bank");

    // ---------------------------------------------------------------
    // TEST 2: Leave POS -> Tables View -> Reopen T-1 -> Full Restore
    // ---------------------------------------------------------------
    console.log("4. Navigating back to Tables & reopening T-1...");
    await page.locator("#sidebar-tables-btn").click();
    await page.getByText("Restaurant Table Management").waitFor({ state: "visible" });

    const t1OccupiedCard = page.locator("div.rounded-2xl").filter({ has: page.getByText("T-1", { exact: true }) }).first();
    await t1OccupiedCard.getByText(/occupied/i).waitFor({ state: "visible" });
    await t1OccupiedCard.getByRole("button", { name: /View Order \/ Bill/i }).click();

    await page.locator("#pos-terminal-root").waitFor({ state: "visible" });
    await page.locator("tbody tr").first().waitFor({ state: "visible" });

    assert.equal(await page.locator("tbody tr").count(), 2, "Reopened T-1 must restore both items");
    assert.equal((await page.locator("#pos-grand-total-amount").innerText()).trim(), preSaveTotalText, "Reopened T-1 must restore exact grand total");
    assert.equal(await page.locator("#pos-invoice-number-input").inputValue(), preSaveInvNo, "Reopened T-1 must restore exact invoice number");
    assert.equal(await page.locator("#pos-party-search-input").inputValue(), "Rohan Deshmukh", "Reopened T-1 must restore guest name");
    assert.equal(await page.locator('textarea[placeholder*="Delivery terms"]').inputValue(), "Extra spicy, no onion", "Reopened T-1 must restore notes");
    assert.equal(await page.locator('input[placeholder="₹"]').inputValue(), "45", "Reopened T-1 must restore extra charges");

    // ---------------------------------------------------------------
    // TEST 3 & 4: Add Dish 3 -> Two consecutive saves -> Reopen -> Verify no duplication or loss
    // ---------------------------------------------------------------
    console.log("5. Adding 3rd item & testing consecutive Save to Table calls...");
    if (dish3.id !== dish1.id && dish3.id !== dish2.id) {
      await page.locator("#pos-barcode-scanner-input").fill(dish3.name);
      await page.locator("#pos-barcode-scanner-input").press("Enter");
      await page.locator("tbody tr").nth(2).waitFor({ state: "visible" });
    } else {
      await page.locator("tbody tr").nth(1).locator("button").nth(1).click();
    }

    const expectedLinesAfterEdit = await page.locator("tbody tr").count();
    const updatedTotalText = (await page.locator("#pos-grand-total-amount").innerText()).trim();

    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/tables/item") && r.request().method() === "POST"),
      page.getByRole("button", { name: /Save to Table/i }).click()
    ]);
    await page.waitForTimeout(500);
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/tables/item") && r.request().method() === "POST"),
      page.getByRole("button", { name: /Save to Table/i }).click()
    ]);
    await page.waitForTimeout(800);

    assert.equal(await page.locator("tbody tr").count(), expectedLinesAfterEdit, "Consecutive saves must not drop or duplicate lines");
    assert.equal((await page.locator("#pos-grand-total-amount").innerText()).trim(), updatedTotalText);

    // ---------------------------------------------------------------
    // TEST 5: Direct-Sales Table Dropdown Path (T-2) & Overwrite Guard
    // ---------------------------------------------------------------
    console.log("6. Testing direct Sales & POS dropdown selection on T-2...");
    await page.locator("#sidebar-dashboard-btn").click();
    await page.locator("#sidebar-sales-btn").click();
    await page.locator("#pos-terminal-root").waitFor({ state: "visible" });

    await page.locator("#pos-table-select").selectOption("tbl_2");
    await page.locator("#pos-barcode-scanner-input").fill(dish2.name);
    await page.locator("#pos-barcode-scanner-input").press("Enter");
    await page.locator("tbody tr").first().waitFor({ state: "visible" });
    await page.locator("#pos-party-search-input").fill("Priya Kulkarni");

    const t2TotalBeforeSave = (await page.locator("#pos-grand-total-amount").innerText()).trim();
    const t2InvBeforeSave = await page.locator("#pos-invoice-number-input").inputValue();

    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/tables/item") && r.request().method() === "POST"),
      page.getByRole("button", { name: /Save to Table/i }).click()
    ]);
    await page.waitForTimeout(1200);

    assert.equal(await page.locator("tbody tr").count(), 1, "CRITICAL: T-2 cart via dropdown must NOT clear after Save to Table");
    assert.equal((await page.locator("#pos-grand-total-amount").innerText()).trim(), t2TotalBeforeSave);
    assert.equal(await page.locator("#pos-invoice-number-input").inputValue(), t2InvBeforeSave);

    // Try switching dropdown to occupied T-1 while T-2 cart has items -> must block & protect T-1
    await page.locator("#pos-table-select").selectOption("tbl_1");
    await page.getByText(/already has an active running bill/i).waitFor({ state: "visible" });
    apiDb = await fetchApiDb(page);
    assert.equal(apiDb.tables.find((t) => t.id === "tbl_1").currentOrderItems.length, expectedLinesAfterEdit, "T-1 order must stay untouched");

    // ---------------------------------------------------------------
    // TEST 6: Full Browser Refresh & Multi-Table Isolation
    // ---------------------------------------------------------------
    console.log("7. Reloading browser & verifying T-1 and T-2 independent persistence...");
    await page.reload({ waitUntil: "networkidle" });
    await page.locator("#sidebar-tables-btn").waitFor({ state: "visible" });
    await page.locator("#sidebar-tables-btn").click();

    const t2OccupiedCard = page.locator("div.rounded-2xl").filter({ has: page.getByText("T-2", { exact: true }) }).first();
    await t2OccupiedCard.getByRole("button", { name: /View Order \/ Bill/i }).click();
    await page.locator("tbody tr").first().waitFor({ state: "visible" });
    assert.equal((await page.locator("#pos-grand-total-amount").innerText()).trim(), t2TotalBeforeSave);
    assert.equal(await page.locator("#pos-party-search-input").inputValue(), "Priya Kulkarni");

    // ---------------------------------------------------------------
    // TEST 7: Deleted Catalog Item Resilience on T-1
    // ---------------------------------------------------------------
    console.log("8. Deleting dish1 from catalog & reopening T-1 to verify dish name/price preservation...");
    await page.evaluate(async (itemId) => {
      const res = await fetch(`/api/items/${itemId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete item");
    }, dish1.id);

    await page.locator("#sidebar-tables-btn").click();
    const t1ReloadCard = page.locator("div.rounded-2xl").filter({ has: page.getByText("T-1", { exact: true }) }).first();
    await t1ReloadCard.getByRole("button", { name: /View Order \/ Bill/i }).click();
    await page.locator("tbody tr").first().waitFor({ state: "visible" });

    const firstRowText = await page.locator("tbody tr").first().innerText();
    assert.ok(firstRowText.includes(dish1.name), `Expected preserved dish name '${dish1.name}', got: ${firstRowText}`);
    assert.equal((await page.locator("#pos-grand-total-amount").innerText()).trim(), updatedTotalText);

    // ---------------------------------------------------------------
    // TEST 8: Failed Save to Table (HTTP 500) must NOT clear Cart
    // ---------------------------------------------------------------
    console.log("9. Simulating Save to Table network/500 failure -> Cart must stay intact...");
    ignoreSimulated500Console = true;
    await page.route("**/api/tables/item", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Simulated disk write failure" })
      });
    });

    await page.getByRole("button", { name: /Save to Table/i }).click();
    await page.getByText(/Simulated disk write failure/i).waitFor({ state: "visible" });
    assert.equal(await page.locator("tbody tr").count(), expectedLinesAfterEdit, "Cart must remain intact on save failure");
    assert.equal((await page.locator("#pos-grand-total-amount").innerText()).trim(), updatedTotalText);
    await page.unroute("**/api/tables/item");
    ignoreSimulated500Console = false;

    // ---------------------------------------------------------------
    // TEST 9: Checkout T-1 -> Creates Invoice + Clears T-1 to Cleaning + Leaves T-2 Occupied
    // ---------------------------------------------------------------
    console.log("10. Checking out T-1 -> verifying Invoice created & T-1 moved to Needs Cleaning...");
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/invoices") && r.request().method() === "POST"),
      page.locator("#pos-checkout-btn").click()
    ]);

    await page.waitForTimeout(1000);
    apiDb = await fetchApiDb(page);

    const createdInvoice = apiDb.invoices.find((inv) => inv.invoiceNumber === preSaveInvNo);
    assert.ok(createdInvoice, "Final invoice must be created in db.invoices on checkout");
    assert.equal(createdInvoice.partyName, "Rohan Deshmukh");
    assert.equal(createdInvoice.extraCharges.length, 1);
    assert.equal(createdInvoice.extraCharges[0].amount, 45);
    assert.equal(createdInvoice.items.length, expectedLinesAfterEdit);

    const t1AfterCheckout = apiDb.tables.find((t) => t.id === "tbl_1");
    assert.equal(t1AfterCheckout.status, "cleaning", "T-1 must move to cleaning after checkout");
    assert.equal((t1AfterCheckout.currentOrderItems || []).length, 0, "T-1 running items must clear after checkout");
    assert.equal(t1AfterCheckout.currentOrderTotal, 0);

    const t2StillOccupied = apiDb.tables.find((t) => t.id === "tbl_2");
    assert.equal(t2StillOccupied.status, "occupied", "T-2 must remain occupied untouched");
    assert.equal((t2StillOccupied.currentOrderItems || []).length, 1);

    // Also verify disk db.json directly matches API response and has no duplicate keys
    const diskDb = readDiskDb();
    assert.equal(diskDb.tables.find((t) => t.id === "tbl_1").status, "cleaning");
    assert.equal(diskDb.tables.find((t) => t.id === "tbl_2").currentOrderItems.length, 1);

    // Dismiss print modal if open, return to Tables, and Mark Cleaned on T-1
    console.log("11. Closing receipt preview, marking T-1 cleaned, and checking non-restaurant mode regression...");
    const closePreviewBtn = page.locator('button[title="Close Preview"]');
    if (await closePreviewBtn.isVisible().catch(() => false)) {
      await closePreviewBtn.click();
    }
    await page.locator("#sidebar-tables-btn").click();
    const t1CleaningCard = page.locator("div.rounded-2xl").filter({ has: page.getByText("T-1", { exact: true }) }).first();
    await t1CleaningCard.getByRole("button", { name: /Mark Cleaned/i }).click();
    await t1CleaningCard.getByText(/available/i).waitFor({ state: "visible" });

    // Non-Restaurant Mode Regression Check (Kirana retail flow via clean uninstall + setup)
    if (fs.existsSync(LOCK_PATH)) fs.unlinkSync(LOCK_PATH);
    await page.evaluate(async () => {
      await fetch("/api/install/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessType: "kirana", storeName: "Test Kirana Mart", state: "Maharashtra", setupMode: "demo" })
      });
    });
    await page.reload({ waitUntil: "networkidle" });
    await page.locator("#sidebar-sales-btn").waitFor({ state: "visible" });
    assert.equal(await page.locator("#sidebar-tables-btn").count(), 0, "Restaurant Tables tab must stay hidden in Kirana mode");
    await page.locator("#sidebar-sales-btn").click();
    await page.locator("#pos-terminal-root").waitFor({ state: "visible" });
    assert.equal(await page.locator("#pos-table-select").count(), 0, "Table selector must not show in Kirana mode without tables");
    const kiranaDb = await fetchApiDb(page);
    await page.locator("#pos-barcode-scanner-input").fill(kiranaDb.items[0].name);
    await page.locator("#pos-barcode-scanner-input").press("Enter");
    await page.locator("tbody tr").first().waitFor({ state: "visible" });
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/invoices") && r.request().method() === "POST"),
      page.locator("#pos-checkout-btn").click()
    ]);
    await page.waitForTimeout(500);
    assert.equal(await page.locator("#pos-terminal-root tbody tr").count(), 0, "Standard retail POS should still reset cart cleanly after checkout");
    const closeKiranaPreview = page.locator('button[title="Close Preview"]');
    if (await closeKiranaPreview.isVisible().catch(() => false)) {
      await closeKiranaPreview.click();
    }

    assert.deepEqual(pageErrors, [], `Unexpected page errors: ${pageErrors.join("; ")}`);
    assert.deepEqual(consoleErrors, [], `Unexpected console errors: ${consoleErrors.join("; ")}`);

    console.log("ALL RESTAURANT PERSISTENCE & REGRESSION E2E TESTS PASSED!");
  } finally {
    await browser.close();

    // Restore original data/db.json and data/install-lock.json
    if (hadDb && origDbContent !== null) {
      fs.writeFileSync(DB_PATH, origDbContent, "utf8");
    }
    if (hadLock && origLockContent !== null) {
      fs.writeFileSync(LOCK_PATH, origLockContent, "utf8");
    } else if (fs.existsSync(LOCK_PATH)) {
      fs.unlinkSync(LOCK_PATH);
    }
    console.log("Restored original /data state cleanly.");
  }
})().catch((err) => {
  console.error("E2E TEST FAILED:", err);
  process.exit(1);
});
