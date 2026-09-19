/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Electron Main Process for Billing On Hand
 */

const { app, BrowserWindow, Menu, ipcMain, shell } = require("electron");
const path = require("path");
const net = require("net");
const { autoUpdater } = require("electron-updater");

// Configure Auto-Updater
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowPrerelease = false;

// Dynamic free port resolution to allow multiple instances or handle blocked ports gracefully
function getFreePort(startPort, callback) {
  const server = net.createServer();
  server.listen(startPort, "127.0.0.1", () => {
    const address = server.address();
    const port = address ? address.port : startPort;
    server.close(() => callback(port));
  });
  server.on("error", () => {
    getFreePort(startPort + 1, callback);
  });
}

let mainWindow = null;
let updateDownloadedInfo = null;

function sendToWindow(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

function setupAutoUpdater() {
  autoUpdater.on("checking-for-update", () => {
    console.log("[AutoUpdater] Checking for updates...");
    sendToWindow("updater:status", { state: "checking" });
  });

  autoUpdater.on("update-available", (info) => {
    console.log(`[AutoUpdater] Update available: v${info.version}`);
    sendToWindow("updater:status", {
      state: "available",
      version: info.version,
      releaseDate: info.releaseDate
    });
  });

  autoUpdater.on("update-not-available", (info) => {
    console.log("[AutoUpdater] Application is up to date.");
    sendToWindow("updater:status", {
      state: "up-to-date",
      currentVersion: app.getVersion()
    });
  });

  autoUpdater.on("error", (err) => {
    console.error("[AutoUpdater] Error in auto-updater:", err == null ? "unknown" : (err.stack || err).toString());
    sendToWindow("updater:status", {
      state: "error",
      message: err?.message || "Check failed"
    });
  });

  autoUpdater.on("download-progress", (progressObj) => {
    const percent = Math.round(progressObj.percent || 0);
    console.log(`[AutoUpdater] Download progress: ${percent}%`);
    sendToWindow("updater:status", {
      state: "downloading",
      percent,
      bytesPerSecond: progressObj.bytesPerSecond,
      transferred: progressObj.transferred,
      total: progressObj.total
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    console.log(`[AutoUpdater] Update v${info.version} downloaded successfully!`);
    updateDownloadedInfo = info;
    sendToWindow("updater:status", {
      state: "downloaded",
      version: info.version
    });

    // Auto install and restart after 4 seconds (as requested:
    // "नवीन व्हर्जनची ईएक्सई आली असेल, तर आपल्या सॉफ्टवेअरने ऑटो अपडेट करायला पाहिजे आणि नंतर ॲप्लिकेशन रीस्टार्ट करायला पाहिजे")
    setTimeout(() => {
      console.log("[AutoUpdater] Triggering quit and install update...");
      autoUpdater.quitAndInstall(false, true);
    }, 4000);
  });
}

function resolveAppIcon() {
  const fs = require("fs");
  const candidates = [
    path.join(__dirname, "build", "icon.ico"),
    path.join(__dirname, "assets", "icon.ico"),
    path.join(__dirname, "public", "favicon.ico"),
    path.join(__dirname, "build", "icon.png"),
    path.join(__dirname, "assets", "icon.png"),
    path.join(__dirname, "public", "icon.png")
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return path.join(__dirname, "build", "icon.ico");
}

function createWindow(port) {
  const appIcon = resolveAppIcon();
  console.log(`[Electron] Using application icon from: ${appIcon}`);

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 900,
    minHeight: 650,
    title: "Billing On Hand - Offline Retail & GST ERP",
    icon: appIcon,
    autoHideMenuBar: true,
    backgroundColor: "#f8fafc", // Light crisp canvas background matches the app theme perfectly
    show: false, // Prevent white screen flash while painting initial frames
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  // Gracefully show window once ready or on fallback timer
  let isShown = false;
  const showSafely = () => {
    if (!isShown && mainWindow && !mainWindow.isDestroyed()) {
      isShown = true;
      mainWindow.show();
      mainWindow.focus();
    }
  };

  mainWindow.once("ready-to-show", showSafely);
  setTimeout(showSafely, 1500); // Safety fallback so window always reveals

  // Load the running server URL
  const appUrl = `http://127.0.0.1:${port}`;
  console.log(`[Electron] Loading application URL: ${appUrl}`);
  mainWindow.loadURL(appUrl);

  // Automatic retry if loading fails before server is ready
  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    console.warn(`[Electron] Failed to load ${validatedURL} (${errorCode}: ${errorDescription}). Retrying in 400ms...`);
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(validatedURL);
      }
    }, 400);
  });

  // F12 or Ctrl+Shift+I to toggle DevTools if user or support needs to inspect
  mainWindow.webContents.on("before-input-event", (_event, input) => {
    if (input.key === "F12" || (input.control && input.shift && input.key.toLowerCase() === "i")) {
      if (mainWindow) {
        mainWindow.webContents.toggleDevTools();
      }
    }
  });

  // Handle crash recoveries elegantly
  mainWindow.webContents.on("render-process-gone", (event, detailed) => {
    console.error("App render process gone:", detailed.reason);
    if (mainWindow) {
      mainWindow.reload();
    }
  });

  mainWindow.webContents.on("unresponsive", () => {
    console.warn("App became unresponsive... reloading");
    if (mainWindow) {
      mainWindow.reload();
    }
  });

  // Background auto-updater checking lifecycle
  function checkForAppUpdates() {
    if (!app.isPackaged) {
      console.log("[AutoUpdater] Running in unpackaged dev environment; skipping background check.");
      return;
    }
    console.log("[AutoUpdater] Checking for updates on GitHub...");
    autoUpdater.checkForUpdates().catch((err) => {
      console.warn("[AutoUpdater] Update check notice (network/offline):", err.message);
    });
  }

  // Initial check 4 seconds after window finishes loading
  mainWindow.webContents.once("did-finish-load", () => {
    setTimeout(checkForAppUpdates, 4000);
  });

  // Recurring check every 45 minutes while app is running if connected to internet
  const autoUpdateInterval = setInterval(checkForAppUpdates, 45 * 60 * 1000);

  mainWindow.on("closed", () => {
    clearInterval(autoUpdateInterval);
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle("app:get-version", () => {
  return app.getVersion();
});

ipcMain.handle("app:check-for-updates", async () => {
  if (!app.isPackaged) {
    return { success: false, error: "Auto-updater operates in packaged desktop production mode." };
  }
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("app:restart-and-install", () => {
  autoUpdater.quitAndInstall(false, true);
});

ipcMain.handle("app:open-external", (_event, url) => {
  if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
    shell.openExternal(url);
  }
});

// Helper to poll the local health endpoint
function pollServerReady(port, maxRetries = 25) {
  const http = require("http");
  return new Promise((resolve) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else if (attempts < maxRetries) {
          setTimeout(check, 100);
        } else {
          resolve(false);
        }
      });
      req.on("error", () => {
        if (attempts < maxRetries) {
          setTimeout(check, 100);
        } else {
          resolve(false);
        }
      });
      req.setTimeout(300, () => {
        req.destroy();
        if (attempts < maxRetries) {
          setTimeout(check, 100);
        } else {
          resolve(false);
        }
      });
    };
    check();
  });
}

// Ensure the app boots successfully
app.whenReady().then(() => {
  // Set production and data directories before booting server
  process.env.NODE_ENV = "production";
  process.env.ELECTRON_ENV = "true";
  process.env.ELECTRON_USER_DATA = app.getPath("userData");

  setupAutoUpdater();

  getFreePort(3000, async (assignedPort) => {
    process.env.PORT = assignedPort.toString();
    console.log(`[Electron] Starting Express on 127.0.0.1:${assignedPort}`);

    // Boot the packaged Express backend server
    try {
      const serverModule = require(path.join(__dirname, "dist", "server.cjs"));
      if (serverModule && typeof serverModule.startServer === "function") {
        await serverModule.startServer(assignedPort);
      }
    } catch (err) {
      console.error("[Electron] Failed to require packaged server module:", err);
    }

    // Wait until Express server responds to health check
    const isReady = await pollServerReady(assignedPort);
    if (isReady) {
      console.log(`[Electron] Express server verified active and healthy on port ${assignedPort}`);
    } else {
      console.warn(`[Electron] Health check timed out, launching window anyway with retry listener...`);
    }

    createWindow(assignedPort);
  });
});

app.on("window-all-closed", () => {
  // On Desktop environments, quit completely when all windows close
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    const activePort = process.env.PORT || "3000";
    createWindow(parseInt(activePort, 10));
  }
});
