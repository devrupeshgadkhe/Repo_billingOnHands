# 🖥️ Billing On Hand - Standalone Offline Desktop App Setup Guide

This application has been fully configured to run completely offline as a standalone desktop application. It uses **Electron** for the window-based wrapper and **Express** as the offline local filesystem database engine (`db.json`), ensuring 100% of your retail, ERP, billing invoices, GST calculations, and user access records run with **zero internet connectivity**.

---

## 🚀 How to Run and Package on Your Local Desktop

Follow these simple steps on your local computer to run or compile the executable.

### 📋 Prerequisites
Make sure you have Node.js installed on your desktop:
- **Node.js**: [Download and Install Node.js LTS](https://nodejs.org/) (Version 18 or higher recommended).

---

### 1️⃣ Download project and Install Dependencies
Unzip or pull the project files to a local directory on your desktop, open your terminal (Command Prompt, PowerShell, or Git Bash), and run:
```bash
# Install the workspace dependencies locally
npm install
```

---

### 2️⃣ Run the App Locally in Desktop/Offline Mode
You can start the fully functional Electron desktop app instantly in development/preview mode:
```bash
# Compile code and boot the desktop application immediately
npm run electron:dev
```
This will:
- Bundle the high-speed Vite frontend.
- Package the Express backend.
- Open a native, clean desktop window with auto-hidden menus.
- Auto-resolve database storage secure paths.

---

### 3️⃣ Package into a Standalone Executable (`.exe`)
To package the app into a portable single-file executable or installer for Windows:
```bash
# Compile and build standalone installers in dist-desktop/
npm run electron:pack
```

Once the process completes, look inside the newly created **`dist-desktop/`** folder. You will find:
1. **`BillingOnHand Setup 1.0.0.exe`**: A professional, highly reliable step-by-step NSIS installer that guides the user, requests elevation dynamically, and registers uninstallation items cleanly in the Windows Control Panel.
2. **`win-unpacked`**: A directory containing raw portable/unpacked binaries which can be launched directly for testing.

---

### ⚠️ Pro-Tip for Packaging Permission Restraints
If Windows Defender, third-party antivirus, or standard Windows directory locks interfere during processing (manifesting as an `EPERM` error on `win-unpacked`), execute these steps to clean and retry:
```powershell
# Open PowerShell as Administrator, terminate any lingering Node/Electron instances, and rebuild:
taskkill /F /IM node.exe
npm run clean
npm run electron:pack
```

---

## 💾 Core Advantages of This Desktop Integration

- **100% Offline-First Protection**: No databases are hosted in the cloud. All information is written directly into `db.json` on the consumer's computer, protecting company data from outages.
- **Robust Storage Path Handling**: Uses the Electron secure `app.getPath('userData')` storage, which maps to `%APPDATA%/BillingOnHand/` on Windows. This avoids common read-only/permission bugs when running standard software directly out of `Program Files`.
- **Dynamic Port Selection**: Starts resolving ports starting from `3000`. If port 3000 is occupied by another programmer tool or background software, the application automatically increments and moves to 3001, 3002, etc., preventing crashing on startup.
- **Sleek Minimalist Frames**: Configured to auto-hide the standard web browser toolbar to preserve the modern application design.
