const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");
const LOCK_PATH = path.join(DATA_DIR, "install-lock.json");

async function fetchJson(url, opts) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON from ${url} (${res.status}): ${text.slice(0, 200)}`);
  }
  return { status: res.status, ok: res.ok, json };
}

async function callMunimji(text, language = "en") {
  return await fetchJson(`${BASE_URL}/api/munimji/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language, history: [] })
  });
}

(async () => {
  const hadDb = fs.existsSync(DB_PATH);
  const origDbContent = hadDb ? fs.readFileSync(DB_PATH, "utf8") : null;
  const hadLock = fs.existsSync(LOCK_PATH);
  const origLockContent = hadLock ? fs.readFileSync(LOCK_PATH, "utf8") : null;

  let browser;
  try {
    console.log("1. Setting up fresh Restaurant Mode DB via /api/install/setup...");
    if (fs.existsSync(LOCK_PATH)) fs.unlinkSync(LOCK_PATH);

    const setupResp = await fetchJson(`${BASE_URL}/api/install/setup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessType: "restaurant",
        storeName: "Munimji Test Kitchen",
        state: "Maharashtra",
        setupMode: "demo"
      })
    });
    assert.equal(setupResp.status, 200, "Install setup for Restaurant mode must succeed");

    let db = (await fetchJson(`${BASE_URL}/api/db`)).json;
    assert.equal(db.business.businessType, "restaurant");
    const dosaDish = db.items.find((i) => /dosa|masala|paneer|tea|coffee/i.test(i.name)) || db.items[0];
    assert.ok(dosaDish, "Demo restaurant catalog must contain dishes");
    const initialStock = dosaDish.stockQuantity;

    console.log("2. Testing Munimji SEED_TABLES (when clearing tables first) & ADD_TABLE...");
    // Clear seeded tables briefly to test Munimji SEED_TABLES end-to-end
    for (const tbl of db.tables || []) {
      await fetchJson(`${BASE_URL}/api/tables/${tbl.id}`, { method: "DELETE" });
    }
    const seedRes = await callMunimji("Seed sample restaurant tables", "en");
    assert.equal(seedRes.status, 200);
    db = (await fetchJson(`${BASE_URL}/api/db`)).json;
    assert.ok((db.tables || []).length >= 4, "SEED_TABLES via Munimji must populate restaurant tables");

    console.log("3. Testing Munimji CREATE single table T-7 (6 seater VIP Lounge)...");
    const createRes = await callMunimji("Create new table T-7 capacity 6 VIP Lounge", "en");
    assert.equal(createRes.status, 200);
    assert.equal(createRes.json.intent, "TABLE_CREATE");
    assert.ok((createRes.json.displayCards || []).some((c) => c.type === "table_list"), "TABLE_CREATE should return live table_list displayCard");

    db = (await fetchJson(`${BASE_URL}/api/db`)).json;
    const t7Created = db.tables.find((t) => String(t.tableNumber).toUpperCase() === "T-7");
    assert.ok(t7Created, "Created table T-7 must persist in db.tables");
    assert.equal(Number(t7Created.capacity), 6, "T-7 capacity must be 6");
    assert.equal(t7Created.status, "available");

    console.log("3B. Testing Multi-Table Creation in a Loop (Marathi count + English count + comma-joined AI guard)...");
    const countBeforeMulti = db.tables.length;
    const marathiFourRes = await callMunimji("चार टेबल क्रिएट कर", "mr");
    assert.equal(marathiFourRes.status, 200);
    assert.equal(marathiFourRes.json.intent, "TABLE_CREATE");
    db = (await fetchJson(`${BASE_URL}/api/db`)).json;
    assert.equal(db.tables.length, countBeforeMulti + 4, "Marathi 'चार टेबल क्रिएट कर' MUST create 4 separate tables (T-8..T-11), never 1 table!");
    for (const expectedNum of ["T-8", "T-9", "T-10", "T-11"]) {
      assert.ok(db.tables.some((t) => t.tableNumber === expectedNum), `Missing separate table ${expectedNum}`);
    }

    const engFourRes = await callMunimji("Create 4 new AC Dining 6 seater tables", "en");
    assert.equal(engFourRes.status, 200);
    db = (await fetchJson(`${BASE_URL}/api/db`)).json;
    assert.equal(db.tables.length, countBeforeMulti + 8, "English 'Create 4 new AC Dining 6 seater tables' MUST create 4 separate tables (T-12..T-15)");
    for (const expectedNum of ["T-12", "T-13", "T-14", "T-15"]) {
      const t = db.tables.find((x) => x.tableNumber === expectedNum);
      assert.ok(t, `Missing AC table ${expectedNum}`);
      assert.equal(Number(t.capacity), 6);
      assert.equal(t.section, "AC Dining");
    }

    // Defensive guard against comma-joined single tableNumber payload on /api/munimji/execute-action
    const commaExecRes = await fetchJson(`${BASE_URL}/api/munimji/execute-action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actionType: "ADD_TABLE",
        payload: { tableNumber: "T-16, T-17, T-18", capacity: 4, section: "VIP Lounge" }
      })
    });
    assert.equal(commaExecRes.status, 200);
    db = (await fetchJson(`${BASE_URL}/api/db`)).json;
    assert.equal(db.tables.length, countBeforeMulti + 11, "Comma-joined payload MUST split & loop into T-16, T-17, T-18");
    for (const expectedNum of ["T-16", "T-17", "T-18"]) {
      assert.ok(db.tables.some((t) => t.tableNumber === expectedNum), `Comma-split table ${expectedNum} missing`);
    }

    // Multi-delete T-8 to T-18 cleanly via Munimji
    const multiDelRes = await callMunimji("Delete tables T-8 to T-18", "en");
    assert.equal(multiDelRes.status, 200);
    db = (await fetchJson(`${BASE_URL}/api/db`)).json;
    assert.equal(db.tables.length, countBeforeMulti, "Multi-delete T-8 to T-18 must clean up all 11 test tables");

    console.log("4. Testing Munimji SAVE_TABLE_ORDER onto table T-7...");
    const orderRes = await callMunimji(`Add 2 ${dosaDish.name} to table T-7`, "en");
    assert.equal(orderRes.status, 200);
    assert.equal(orderRes.json.intent, "TABLE_ORDER");

    db = (await fetchJson(`${BASE_URL}/api/db`)).json;
    const t7Occupied = db.tables.find((t) => String(t.tableNumber).toUpperCase() === "T-7");
    assert.equal(t7Occupied.status, "occupied", "T-7 must become occupied after saving running order");
    assert.ok((t7Occupied.currentOrderItems || []).length >= 1, "T-7 currentOrderItems must contain saved dishes");
    assert.ok(Number(t7Occupied.currentOrderTotal) > 0, "T-7 currentOrderTotal must be > 0");
    assert.ok(Boolean(t7Occupied.currentOrderInvoiceNumber), "T-7 must have running invoice number");

    console.log("5. Testing Munimji TABLE_LIST query returns live table_list card with T-7 occupied...");
    const listRes = await callMunimji("Show all restaurant tables status", "en");
    assert.equal(listRes.status, 200);
    assert.equal(listRes.json.intent, "TABLE_LIST");
    const listCard = (listRes.json.displayCards || []).find((c) => c.type === "table_list");
    assert.ok(listCard && Array.isArray(listCard.data?.tables), "TABLE_LIST must return populated table_list card");
    const t7CardEntry = listCard.data.tables.find((t) => String(t.tableNumber).toUpperCase() === "T-7");
    assert.ok(t7CardEntry && t7CardEntry.status === "occupied", "table_list card must reflect live T-7 occupied status");

    console.log("6. Testing Munimji SETTLE_TABLE_BILL on T-7 -> invoice.type === 'sale' + cleaning status...");
    const invoiceCountBefore = db.invoices.length;
    const settleRes = await callMunimji("Settle table T-7 bill cash", "en");
    assert.equal(settleRes.status, 200);
    assert.equal(settleRes.json.intent, "TABLE_ORDER");

    db = (await fetchJson(`${BASE_URL}/api/db`)).json;
    assert.equal(db.invoices.length, invoiceCountBefore + 1, "Settling T-7 must create 1 final sales invoice");
    const settledInv = db.invoices[db.invoices.length - 1];
    assert.equal(settledInv.type, "sale", "CRITICAL BUGFIX: Settled invoice type must be 'sale' (never 'sales')");
    assert.equal(settledInv.tableNumber, "T-7");
    assert.ok(settledInv.totalAmount > 0, "Settled invoice totalAmount must be > 0");

    if (dosaDish.trackStock === false) {
      const dishAfter = db.items.find((i) => i.id === dosaDish.id);
      assert.equal(dishAfter.stockQuantity, initialStock, "Made-to-order dish (trackStock: false) stock must remain untouched");
    }

    const t7Cleaning = db.tables.find((t) => String(t.tableNumber).toUpperCase() === "T-7");
    assert.equal(t7Cleaning.status, "cleaning", "Settled dining table must transition to 'cleaning'");
    assert.equal((t7Cleaning.currentOrderItems || []).length, 0, "Settled table running items must clear");

    console.log("7. Testing Munimji UPDATE_TABLE_STATUS (Mark Cleaned) & DELETE_TABLE on T-7...");
    const cleanRes = await callMunimji("Mark table T-7 cleaned", "en");
    assert.equal(cleanRes.status, 200);
    db = (await fetchJson(`${BASE_URL}/api/db`)).json;
    assert.equal(db.tables.find((t) => t.tableNumber === "T-7").status, "available");

    const delRes = await callMunimji("Delete table T-7", "en");
    assert.equal(delRes.status, 200);
    db = (await fetchJson(`${BASE_URL}/api/db`)).json;
    assert.equal(db.tables.some((t) => t.tableNumber === "T-7"), false, "T-7 must be deleted after becoming available");

    console.log("8. Testing direct Munimji SALES_BILL ('Create cash bill 2 <dish>') writes type === 'sale'...");
    const salesRes = await callMunimji(`Create cash bill 2 ${dosaDish.name}`, "en");
    assert.equal(salesRes.status, 200);
    assert.equal(salesRes.json.intent, "SALES_BILL");
    db = (await fetchJson(`${BASE_URL}/api/db`)).json;
    const directBill = db.invoices[db.invoices.length - 1];
    assert.equal(directBill.type, "sale", "CRITICAL BUGFIX: Direct Munimji sales invoice must have type === 'sale'");
    assert.equal(directBill.paymentType, "cash");
    assert.ok(directBill.totalAmount > 0, "Direct bill totalAmount must be > 0");

    console.log("9. Testing UI MunimjiDrawer interactive table_list card & 1-click Open Table POS...");
    // Add an item to T-2 so UI shows an occupied table too
    const t2OrderRes = await callMunimji(`Add 1 ${dosaDish.name} to table T-2`, "en");
    assert.equal(t2OrderRes.status, 200);
    db = (await fetchJson(`${BASE_URL}/api/db`)).json;
    const t2Check = db.tables.find((t) => String(t.tableNumber).toUpperCase() === "T-2");
    assert.equal(t2Check?.status, "occupied", `Expected T-2 occupied before opening UI, got: ${JSON.stringify(t2Check)} / resp: ${JSON.stringify(t2OrderRes.json)}`);

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    const page = await context.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.locator("#auth-input-username").waitFor({ state: "visible", timeout: 15000 });
    await page.locator("#auth-input-username").fill("admin");
    await page.locator("#auth-input-password").fill("admin123");
    await page.locator("#auth-submit-btn").click();
    await page.locator("#sidebar-tables-btn").waitFor({ state: "visible", timeout: 15000 });

    // Open Munimji drawer via Alt+M shortcut
    await page.keyboard.press("Alt+m");
    const cmdInput = page.locator('input[placeholder*="Type command"], input[placeholder*="आदेश टाइप"]');
    await cmdInput.waitFor({ state: "visible", timeout: 10000 });
    await cmdInput.fill("Show all restaurant tables status");
    const [uiResp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/munimji/process") && r.request().method() === "POST", { timeout: 30000 }),
      page.locator('button[title="Send"]').click()
    ]);
    assert.equal(uiResp.status(), 200, "UI Munimji process endpoint must return 200");
    const uiJson = await uiResp.json();
    const uiTableCard = (uiJson.displayCards || []).find((c) => c.type === "table_list");
    assert.ok(uiTableCard && Array.isArray(uiTableCard.data?.tables), `Expected populated table_list card in UI response, got: ${JSON.stringify(uiJson)}`);

    // Wait for table_list card and click Open Bill on T-2
    const t2OpenBtn = page.getByRole("button", { name: /^Open Bill$/i }).first();
    await t2OpenBtn.waitFor({ state: "visible", timeout: 10000 });
    await t2OpenBtn.click();

    // Verify POS Terminal opened with T-2 selected and running dish restored
    await page.locator("#pos-terminal-root").waitFor({ state: "visible", timeout: 10000 });
    assert.equal(await page.locator("#pos-table-select").inputValue(), "tbl_2", "1-click Open Bill in Munimji must open T-2 in Sales POS");
    await page.locator("tbody tr").first().waitFor({ state: "visible", timeout: 10000 });
    const rowText = await page.locator("tbody tr").first().innerText();
    assert.ok(rowText.includes(dosaDish.name), `Expected POS cart row for '${dosaDish.name}', got: ${rowText}`);
    assert.deepEqual(pageErrors, [], `Unexpected page errors: ${pageErrors.join("; ")}`);

    console.log("ALL DIGITAL MUNIMJI RESTAURANT & SALES VERIFICATION TESTS PASSED!");
  } finally {
    if (browser) await browser.close();
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
  console.error("MUNIMJI E2E TEST FAILED:", err);
  process.exit(1);
});
