const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { _electron: electron } = require("playwright");

const resultsDir = path.join(process.cwd(), "test-results");
const logPath = path.join(resultsDir, "electron-smoke.log");
const screenshotPath = path.join(resultsDir, "electron-smoke-failure.png");
const logLines = [];
let electronApp;

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  logLines.push(line);
  process.stdout.write(line + "\n");
}

async function writeDiagnostics(page, failed) {
  fs.mkdirSync(resultsDir, { recursive: true });
  fs.writeFileSync(logPath, logLines.join("\n") + "\n", "utf8");
  if (failed && page && !page.isClosed()) {
    try {
      await page.screenshot({ path: screenshotPath, fullPage: true, timeout: 10000 });
    } catch (error) {
      log(`Could not capture failure screenshot: ${error.message}`);
      fs.writeFileSync(logPath, logLines.join("\n") + "\n", "utf8");
    }
  }
}

(async () => {
  let page;
  let failed = false;
  const pageErrors = [];

  try {
    fs.mkdirSync(resultsDir, { recursive: true });
    log("Starting Billing On Hand Electron desktop smoke test.");
    log(`Working directory: ${process.cwd()}`);
    log(`Electron binary: ${require("electron")}`);

    electronApp = await electron.launch({
      executablePath: require("electron"),
      args: [process.cwd()],
      timeout: 120000,
      env: {
        ...process.env,
        ELECTRON_IS_AUTOMATED_TEST: "1",
        ELECTRON_DISABLE_SECURITY_WARNINGS: "true"
      }
    });

    electronApp.on("console", (message) => {
      log(`Renderer console [${message.type()}]: ${message.text()}`);
    });
    electronApp.on("window", (window) => {
      log(`Electron window opened: ${window.url()}`);
    });

    page = await electronApp.firstWindow();
    page.setDefaultTimeout(60000);
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
      log(`Renderer page error: ${error.message}`);
    });

    await page.waitForLoadState("domcontentloaded");
    await page.locator("#root").waitFor({ state: "attached" });
    await page.waitForFunction(() => {
      const root = document.querySelector("#root");
      return Boolean(root && root.childElementCount > 0);
    }, null, { timeout: 90000 });

    const appUrl = page.url();
    const title = await page.title();
    log(`Application URL: ${appUrl}`);
    log(`Application title: ${title || "(empty title)"}`);

    assert.match(appUrl, /^http:\/\/127\.0\.0\.1:\d+\//, "Electron window should load the local application server.");

    const healthStatus = await page.evaluate(async () => {
      const response = await fetch("/api/health");
      return response.status;
    });
    log(`Local Express health endpoint status: ${healthStatus}`);
    assert.equal(healthStatus, 200, "Local Express backend health endpoint must return HTTP 200.");
    assert.deepEqual(pageErrors, [], "Renderer must not emit uncaught page errors.");

    log("PASS: Electron window rendered and local backend health check succeeded.");
  } catch (error) {
    failed = true;
    log(`FAIL: ${error && error.stack ? error.stack : String(error)}`);
    throw error;
  } finally {
    await writeDiagnostics(page, failed);
    if (electronApp) {
      try {
        await electronApp.close();
        log("Electron application closed.");
      } catch (closeError) {
        log(`Electron close warning: ${closeError.message}`);
      }
    }
    fs.writeFileSync(logPath, logLines.join("\n") + "\n", "utf8");
  }
})().catch((error) => {
  process.stderr.write(`Electron smoke test failed: ${error.message}\n`);
  process.exitCode = 1;
});
