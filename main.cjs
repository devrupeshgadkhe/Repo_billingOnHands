/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");
const net = require("net");

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

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "Billing On Hand - Offline Retail & GST ERP",
    icon: path.join(__dirname, "public", "favicon.ico"), // standard icon fallback
    autoHideMenuBar: true, // keeps the interface ultra-sleek, clean, and app-like
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  // Load the running server URL
  const appUrl = `http://127.0.0.1:${port}`;
  mainWindow.loadURL(appUrl);

  mainWindow.on("closed", () => {
    mainWindow = null;
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
}

// Ensure the app boots successfully
app.whenReady().then(() => {
  // Set production and data directories before booting server
  process.env.NODE_ENV = "production";
  process.env.ELECTRON_USER_DATA = app.getPath("userData");

  getFreePort(3000, (assignedPort) => {
    process.env.PORT = assignedPort.toString();
    console.log(`Electron environment starting Express on 127.0.0.1:${assignedPort}`);

    // Boot the packaged Express backend server
    try {
      require(path.join(__dirname, "dist", "server.cjs"));
    } catch (err) {
      console.error("Failed to require packaged server module:", err);
    }

    // Give express a brief instant to start listening
    setTimeout(() => {
      createWindow(assignedPort);
    }, 250);
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
    // If running port is already set, restore window
    const activePort = process.env.PORT || "3000";
    createWindow(parseInt(activePort, 10));
  }
});
