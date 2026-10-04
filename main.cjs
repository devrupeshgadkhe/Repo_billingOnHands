/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Electron Main Process for Billing On Hand
 */

const { app, BrowserWindow, Menu, ipcMain, shell, session, systemPreferences } = require("electron");
const path = require("path");
const net = require("net");
const { autoUpdater } = require("electron-updater");

// Configure Auto-Updater
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowPrerelease = false;
autoUpdater.allowDowngrade = false;
autoUpdater.logger = console;
// Disable differential download to avoid blockmap corruption/hangs
autoUpdater.disableDifferentialDownload = true;
autoUpdater.disableWebInstaller = true;
// Explicitly set GitHub feed
try {
  autoUpdater.setFeedURL({
    provider: "github",
    owner: "devrupeshgadkhe",
    repo: "Repo_billingOnHands"
  });
} catch {}
// Bypass code signature check so unsigned releases install smoothly without hanging at 100%
autoUpdater.verifyUpdateCodeSignature = () => Promise.resolve(null);

// Safe uncaught exception handling to prevent silent main-process halts
process.on("uncaughtException", (err) => {
  console.error("[Electron Main] Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[Electron Main] Unhandled Rejection:", reason);
});

// Configure Chromium switches to guarantee loopback connectivity and avoid GPU white screen hangs
try {
  // 1. Bypass any system/corporate/VPN proxy for local server connection (prevents white screen)
  app.commandLine.appendSwitch("proxy-bypass-list", "<-loopback>;127.0.0.1;localhost");
  // 2. Hardware acceleration & rendering stability
  app.commandLine.appendSwitch("disable-gpu-sandbox");
  // 3. Audio & Media Stream permissions for Munimji voice
  app.commandLine.appendSwitch("use-fake-ui-for-media-stream");
  app.commandLine.appendSwitch("enable-features", "AudioServiceOutOfProcess");
} catch {}

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
let isCheckingUpdate = false;
let isDownloadingUpdate = false;
let isExecutingInstall = false;

function sendToWindow(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

function installAndRelaunch() {
  if (isExecutingInstall) {
    console.log("[AutoUpdater] Installation already initiated, skipping duplicate trigger.");
    return;
  }
  isExecutingInstall = true;
  console.log("[AutoUpdater] Launching update installer via quitAndInstall...");

  sendToWindow("updater:status", {
    state: "installing",
    message: "Installing update and restarting application..."
  });

  // Short delay allowing IPC event to flush before terminating application
  setTimeout(() => {
    try {
      // isSilent: true (unattended 1-click update), isForceRunAfter: true (auto-restart new version)
      autoUpdater.quitAndInstall(true, true);
    } catch (err) {
      console.error("[AutoUpdater] Silent quitAndInstall encountered issue, falling back to standard:", err);
      try {
        autoUpdater.quitAndInstall(false, true);
      } catch (fatalErr) {
        console.error("[AutoUpdater] Fatal error executing quitAndInstall:", fatalErr);
        app.quit();
      }
    }
  }, 400);
}

function setupAutoUpdater() {
  autoUpdater.on("checking-for-update", () => {
    isCheckingUpdate = true;
    console.log("[AutoUpdater] Checking for updates...");
    sendToWindow("updater:status", { state: "checking" });
  });

  autoUpdater.on("update-available", (info) => {
    isCheckingUpdate = false;
    isDownloadingUpdate = true;
    console.log(`[AutoUpdater] Update available: v${info.version}`);
    sendToWindow("updater:status", {
      state: "available",
      version: info.version,
      releaseDate: info.releaseDate
    });
  });

  autoUpdater.on("update-not-available", (info) => {
    isCheckingUpdate = false;
    isDownloadingUpdate = false;
    sendToWindow("updater:status", {
      state: "up-to-date",
      currentVersion: app.getVersion()
    });
  });

  autoUpdater.on("error", (err) => {
    isCheckingUpdate = false;
    isDownloadingUpdate = false;
    const rawMsg = (err == null ? "unknown" : (err.message || String(err))).toString();
    console.error("[AutoUpdater] Background notice in auto-updater:", rawMsg);
    
    // User-friendly status, preventing technical raw dumps
    let friendly = "Software is up to date.";
    const lower = rawMsg.toLowerCase();
    if (lower.includes("net::err") || lower.includes("enotfound") || lower.includes("etimedout")) {
      friendly = "No internet connection. Please check your network.";
    }
    
    sendToWindow("updater:status", {
      state: "up-to-date",
      message: friendly
    });
  });

  autoUpdater.on("download-progress", (progressObj) => {
    isDownloadingUpdate = true;
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
    isCheckingUpdate = false;
    isDownloadingUpdate = false;
    console.log(`[AutoUpdater] Update v${info.version} downloaded successfully! Scheduling install in 3.5s...`);
    updateDownloadedInfo = info;
    sendToWindow("updater:status", {
      state: "downloaded",
      version: info.version,
      autoRestartIn: 3
    });

    // Auto install and restart after 3.5 seconds countdown
    setTimeout(() => {
      installAndRelaunch();
    }, 3500);
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

  // Disable default application menu to prevent DevTools menu items
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 900,
    minHeight: 650,
    title: "Billing On Hand - Offline Retail & GST ERP",
    icon: appIcon,
    autoHideMenuBar: true,
    backgroundColor: "#0f172a", // Deep slate background matching the splash and dark theme (prevents white screen flash)
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      devTools: false
    }
  });

  // Security: Immediately close DevTools if opened by any mechanism
  mainWindow.webContents.on("devtools-opened", () => {
    try {
      mainWindow.webContents.closeDevTools();
    } catch {}
  });

  // Security: Prevent context menu inspection
  mainWindow.webContents.on("context-menu", (event) => {
    event.preventDefault();
  });

  // Gracefully show window once ready or when initial content finished rendering
  let isShown = false;
  const showSafely = () => {
    if (!isShown && mainWindow && !mainWindow.isDestroyed()) {
      isShown = true;
      mainWindow.show();
      mainWindow.focus();
    }
  };

  mainWindow.once("ready-to-show", showSafely);
  mainWindow.webContents.once("did-finish-load", showSafely);
  setTimeout(showSafely, 3000); // Safety fallback timer

  // Load the running server URL
  const appUrl = `http://127.0.0.1:${port}`;
  console.log(`[Electron] Loading application URL: ${appUrl}`);
  mainWindow.loadURL(appUrl);

  let failLoadCount = 0;
  // Automatic retry if loading fails before server is ready
  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    if (errorCode === -3) {
      // ERR_ABORTED: Normal when navigation is redirected or canceled
      return;
    }
    failLoadCount++;
    console.warn(`[Electron] Failed to load ${validatedURL} (${errorCode}: ${errorDescription}) [attempt ${failLoadCount}]. Retrying in 600ms...`);
    
    if (failLoadCount >= 4) {
      // Load sleek inline recovery UI instead of blank white canvas
      const fallbackHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Billing On Hand - Connecting</title>
            <style>
              body { margin:0; height:100vh; display:flex; align-items:center; justify-content:center; background:#0f172a; color:#f8fafc; font-family:system-ui,-apple-system,sans-serif; text-align:center; }
              .box { background:#1e293b; padding:36px; border-radius:20px; border:1px solid #334155; max-width:440px; box-shadow:0 15px 35px rgba(0,0,0,0.4); }
              .spinner { width:36px; height:36px; border:3px solid #334155; border-top-color:#10b981; border-radius:50%; animation:spin 1s linear infinite; margin:0 auto 16px; }
              @keyframes spin { to { transform:rotate(360deg); } }
              h2 { margin:0 0 10px; color:#f8fafc; font-size:18px; font-weight:700; }
              p { color:#94a3b8; font-size:13px; line-height:1.6; margin:0 0 20px; }
              button { background:#10b981; color:#0f172a; border:none; padding:10px 22px; border-radius:10px; font-weight:700; cursor:pointer; font-size:13px; transition:0.2s; }
              button:hover { background:#059669; color:#ffffff; }
            </style>
          </head>
          <body>
            <div class="box">
              <div class="spinner"></div>
              <h2>Connecting to Billing Engine</h2>
              <p>Preparing local offline database and GST tax compliance services...</p>
              <button onclick="window.location.href='${appUrl}'">Refresh Page</button>
            </div>
            <script>
              setTimeout(function() { window.location.href = '${appUrl}'; }, 1500);
            </script>
          </body>
        </html>
      `;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fallbackHtml)}`);
      }
      return;
    }

    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(validatedURL);
      }
    }, 600);
  });

  // Security: Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U to protect application integrity
  mainWindow.webContents.on("before-input-event", (event, input) => {
    // Block F12 (DevTools)
    if (input.key === "F12") {
      event.preventDefault();
      return;
    }
    // Block Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (DevTools inspect / console)
    if ((input.control || input.meta) && input.shift && ["i", "j", "c"].includes(input.key.toLowerCase())) {
      event.preventDefault();
      return;
    }
    // Block Ctrl+U (View source)
    if ((input.control || input.meta) && input.key.toLowerCase() === "u") {
      event.preventDefault();
      return;
    }
    // Allow F5 / Ctrl+R for safe application reload
    if (input.key === "F5" || (input.control && input.key.toLowerCase() === "r")) {
      if (mainWindow) {
        mainWindow.reload();
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

  // Background auto-updater checking lifecycle (continuous autonomous checking)
  function checkForAppUpdates() {
    if (!app.isPackaged) {
      return;
    }
    if (isCheckingUpdate || isDownloadingUpdate || updateDownloadedInfo) {
      // Avoid overlapping checks while download is active or update already ready
      return;
    }
    isCheckingUpdate = true;
    console.log("[AutoUpdater] Autonomous background check for updates...");
    autoUpdater.checkForUpdates()
      .catch((err) => {
        console.warn("[AutoUpdater] Background update check notice:", err.message);
      })
      .finally(() => {
        isCheckingUpdate = false;
      });
  }

  // Initial check 1.5 seconds after window finishes loading
  mainWindow.webContents.once("did-finish-load", () => {
    setTimeout(checkForAppUpdates, 1500);
  });

  // Check whenever application window receives focus
  mainWindow.on("focus", () => {
    checkForAppUpdates();
  });

  // Recurring autonomous check every 15 seconds while app is running
  const autoUpdateInterval = setInterval(checkForAppUpdates, 15 * 1000);

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
    return { 
      success: true, 
      isUpToDate: true, 
      message: "Software is up to date." 
    };
  }
  if (isDownloadingUpdate) {
    return {
      success: true,
      updateAvailable: true,
      message: "Update is currently downloading in background..."
    };
  }
  if (updateDownloadedInfo) {
    return {
      success: true,
      updateAvailable: true,
      version: updateDownloadedInfo.version,
      message: `Update v${updateDownloadedInfo.version} downloaded! Restarting automatically...`
    };
  }
  try {
    const result = await autoUpdater.checkForUpdates();
    const updateAvailable = Boolean(result && result.updateInfo && result.updateInfo.version && result.updateInfo.version !== app.getVersion());
    return { 
      success: true, 
      updateAvailable,
      version: result?.updateInfo?.version || app.getVersion(),
      message: updateAvailable ? `New version v${result?.updateInfo?.version} is available! Downloading automatically...` : "Software is up to date." 
    };
  } catch (err) {
    const rawMsg = String(err?.message || "").toLowerCase();
    console.warn("[AutoUpdater] Update check notice:", err?.message);
    
    // User-friendly English message without technical jargon or raw HTTP 404 dumps
    let cleanMessage = "Software is up to date.";
    if (rawMsg.includes("net::err") || rawMsg.includes("enotfound") || rawMsg.includes("etimedout")) {
      cleanMessage = "Please check your internet connection.";
    }
    
    return { 
      success: true, 
      isUpToDate: true, 
      updateAvailable: false,
      message: cleanMessage 
    };
  }
});

ipcMain.handle("app:restart-and-install", () => {
  console.log("[AutoUpdater] User triggered manual restart-and-install");
  installAndRelaunch();
});

ipcMain.handle("app:open-external", (_event, url) => {
  if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
    shell.openExternal(url);
  }
});

// Helper to poll the local health endpoint
function pollServerReady(port, maxRetries = 50) {
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
      req.setTimeout(400, () => {
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

function resolveServerModulePath() {
  const fs = require("fs");
  const candidates = [
    path.join(__dirname, "dist", "server.cjs"),
    path.join(__dirname, "server.cjs"),
    process.resourcesPath ? path.join(process.resourcesPath, "app.asar", "dist", "server.cjs") : null,
    process.resourcesPath ? path.join(process.resourcesPath, "app", "dist", "server.cjs") : null
  ].filter(Boolean);

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  return path.join(__dirname, "dist", "server.cjs");
}

// Ensure the app boots successfully
app.whenReady().then(() => {
  // Set production and data directories before booting server
  process.env.NODE_ENV = "production";
  process.env.ELECTRON_ENV = "true";
  process.env.ELECTRON_USER_DATA = app.getPath("userData");

  // Digital Munimji: Explicitly grant microphone and audio hardware permissions in Electron
  if (session && session.defaultSession) {
    const isMicrophoneMediaRequest = (permission, details) => {
      if (permission === "media" || permission === "microphone" || permission === "audioCapture") {
        if (!details) return true;
        const mediaTypes = Array.isArray(details.mediaTypes) ? details.mediaTypes : [];
        const mediaType = details.mediaType;
        if (mediaType) return mediaType === "audio" || mediaType === "microphone";
        if (mediaTypes.length) return mediaTypes.includes("audio") || mediaTypes.includes("microphone");
        return true;
      }
      return false;
    };

    session.defaultSession.setPermissionCheckHandler(
      (_webContents, permission, requestingOrigin, details) => {
        const allowed = isMicrophoneMediaRequest(permission, details);
        return allowed;
      }
    );

    session.defaultSession.setPermissionRequestHandler(
      (_webContents, permission, callback, details) => {
        const allowed = isMicrophoneMediaRequest(permission, details);
        callback(allowed);
      }
    );

    if (session.defaultSession.setDevicePermissionHandler) {
      session.defaultSession.setDevicePermissionHandler((details) => {
        // Unconditionally allow microphone hardware devices
        return true;
      });
    }
  }

  if (process.platform === "darwin" && systemPreferences && systemPreferences.askForMediaAccess) {
    systemPreferences.askForMediaAccess("microphone").catch(() => {});
  }

  setupAutoUpdater();

  getFreePort(3000, async (assignedPort) => {
    process.env.PORT = assignedPort.toString();
    console.log(`[Electron] Starting Express on 127.0.0.1:${assignedPort}`);

    let activePort = assignedPort;
    const serverModulePath = resolveServerModulePath();
    console.log(`[Electron] Loading server module from: ${serverModulePath}`);

    // Boot the packaged Express backend server
    try {
      const serverModule = require(serverModulePath);
      if (serverModule && typeof serverModule.startServer === "function") {
        const startResult = await serverModule.startServer(assignedPort);
        if (startResult && startResult.port) {
          activePort = startResult.port;
          process.env.PORT = activePort.toString();
        }
      }
    } catch (err) {
      console.error("[Electron] Failed to require or boot server module:", err);
    }

    // Wait until Express server responds to health check
    const isReady = await pollServerReady(activePort, 50);
    if (isReady) {
      console.log(`[Electron] Express server verified active and healthy on port ${activePort}`);
    } else {
      console.warn(`[Electron] Health check timed out, launching window with automatic retry listener...`);
    }

    createWindow(activePort);
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
