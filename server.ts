/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import { DatabaseState, Item, Party, Invoice, DeliveryChallan, Quotation, QuotationStatus } from "./src/types.js";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DB_DIR = process.env.ELECTRON_USER_DATA 
  ? path.join(process.env.ELECTRON_USER_DATA, "data") 
  : path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "db.json");
const BACKUP_DIR = path.join(DB_DIR, "backups");
export const TARGET_BACKUP_ACCOUNT = "pradipayanbackup@gmail.com";
export const BACKUP_FOLDER_NAME = "BillingOnHand_Backups";
export const DEFAULT_GOOGLE_DRIVE_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbyAYKVB5xsVTtyKjQv1R-9sSRKsCJo8VZFHZPgqCaKOHZYpbRQJI_PgFvGACKZ32r8/exec";
export const DEFAULT_GOOGLE_DEPLOYMENT_ID = "AKfycbyAYKVB5xsVTtyKjQv1R-9sSRKsCJo8VZFHZPgqCaKOHZYpbRQJI_PgFvGACKZ32r8";

// Support large invoice photos and documents (up to 50MB base64)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize Google GenAI client for server-side multimodal invoice extraction
const DEFAULT_GEMINI_KEY = "AIzaSyBTx2_GBPBuko4VoozkIs8_0nF2oN53n2c";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || DEFAULT_GEMINI_KEY;

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Sample initial accounting data
const initialData: DatabaseState = {
  business: {
    name: "Apex Electro-Tech Systems",
    gstin: "27AAAAA1111A1Z1", // Maharashtra GSTIN
    address: "Suite 405, Tech Green Boulevard, Bandra East",
    state: "Maharashtra",
    phone: "+91 98765 43210",
    email: "billing@apexelectro.com",
    signatureText: "For Apex Electro-Tech Systems"
  },
  items: [
    {
      id: "item_1",
      name: "Industrial LED Floodlight 100W",
      hsn: "9405",
      purchasePrice: 1800,
      salePrice: 2450,
      stockQuantity: 45,
      minStockAlert: 10,
      gstRate: 18,
      unit: "PCS"
    },
    {
      id: "item_2",
      name: "Heptacore Insulated Copper Cable (100m)",
      hsn: "8544",
      purchasePrice: 3200,
      salePrice: 4100,
      stockQuantity: 12,
      minStockAlert: 5,
      gstRate: 18,
      unit: "BOX"
    },
    {
      id: "item_3",
      name: "Modular Switch Board 8-Way panel",
      hsn: "8538",
      purchasePrice: 220,
      salePrice: 350,
      stockQuantity: 150,
      minStockAlert: 30,
      gstRate: 12,
      unit: "PCS"
    },
    {
      id: "item_4",
      name: "Digital Energy Tariff Meter Sub-station",
      hsn: "9028",
      purchasePrice: 4500,
      salePrice: 6200,
      stockQuantity: 6,
      minStockAlert: 8, // Low stock triggers alert!
      gstRate: 18,
      unit: "SET"
    },
    {
      id: "item_5",
      name: "High Grade PVC Conduit Tube (3m)",
      hsn: "3917",
      purchasePrice: 45,
      salePrice: 75,
      stockQuantity: 420,
      minStockAlert: 100,
      gstRate: 5,
      unit: "MTR"
    }
  ],
  parties: [
    {
      id: "party_1",
      name: "Karan Johar Electronics",
      type: "customer",
      phone: "+91 99300 11223",
      email: "accounts@karanelectro.in",
      address: "Industrial Galaship, Kurla West, Mumbai",
      state: "Maharashtra", // Local CGST + SGST
      gstin: "27BBBCC1234F1Z3",
      initialBalance: 0,
      currentBalance: 12800 // Owed to us
    },
    {
      id: "party_2",
      name: "Vikas Wireman Industries",
      type: "supplier",
      phone: "+91 88877 66554",
      email: "sales@vikaswires.com",
      address: "Plot 42, GIDC Industrial Estate, Surat",
      state: "Gujarat", // Inter-state IGST
      gstin: "24AAAVW5566K1ZN",
      initialBalance: 0,
      currentBalance: 45000 // We owe them
    },
    {
      id: "party_3",
      name: "Balaji Retail Outlets Ltd",
      type: "customer",
      phone: "+91 96543 21098",
      email: "procure@balajiworld.com",
      address: "Shop No. 12, Central Arcade, MG Road, Bengaluru",
      state: "Karnataka", // Inter-state IGST
      gstin: "29CCCBB4321A1ZE",
      initialBalance: 0,
      currentBalance: 0
    }
  ],
  invoices: [
    {
      id: "inv_1",
      invoiceNumber: "INV-2026-001",
      date: "2026-06-02",
      partyId: "party_1",
      partyName: "Karan Johar Electronics",
      partyGstin: "27BBBCC1234F1Z3",
      type: "sale",
      items: [
        {
          itemId: "item_1",
          itemName: "Industrial LED Floodlight 100W",
          hsn: "9405",
          quantity: 4,
          price: 2450,
          gstRate: 18,
          amountBeforeTax: 9800,
          taxAmount: 1764,
          cgst: 882,
          sgst: 882,
          igst: 0,
          totalAmount: 11564
        },
        {
          itemId: "item_3",
          itemName: "Modular Switch Board 8-Way panel",
          hsn: "8538",
          quantity: 10,
          price: 350,
          gstRate: 12,
          amountBeforeTax: 3500,
          taxAmount: 420,
          cgst: 210,
          sgst: 210,
          igst: 0,
          totalAmount: 3920
        }
      ],
      subtotal: 13300,
      taxAmount: 2184,
      cgstTotal: 1092,
      sgstTotal: 1092,
      igstTotal: 0,
      totalAmount: 15484,
      paymentType: "bank",
      paidAmount: 15484,
      remainingAmount: 0,
      notes: "Goods delivered in good condition."
    },
    {
      id: "inv_2",
      invoiceNumber: "INV-2026-002",
      date: "2026-06-10",
      partyId: "party_3",
      partyName: "Balaji Retail Outlets Ltd",
      partyGstin: "29CCCBB4321A1ZE",
      type: "sale",
      items: [
        {
          itemId: "item_2",
          itemName: "Heptacore Insulated Copper Cable (100m)",
          hsn: "8544",
          quantity: 2,
          price: 4100,
          gstRate: 18,
          amountBeforeTax: 8200,
          taxAmount: 1476,
          cgst: 0,
          sgst: 0,
          igst: 1476,
          totalAmount: 9676
        }
      ],
      subtotal: 8200,
      taxAmount: 1476,
      cgstTotal: 0,
      sgstTotal: 0,
      igstTotal: 1476,
      totalAmount: 9676,
      paymentType: "unpaid",
      paidAmount: 0,
      remainingAmount: 9676,
      notes: "Interstate supply to Karnataka store."
    },
    {
      id: "inv_3",
      invoiceNumber: "PUR-2026-001",
      date: "2026-06-12",
      partyId: "party_2",
      partyName: "Vikas Wireman Industries",
      partyGstin: "24AAAVW5566K1ZN",
      type: "purchase",
      items: [
        {
          itemId: "item_2",
          itemName: "Heptacore Insulated Copper Cable (100m)",
          hsn: "8544",
          quantity: 5,
          price: 3200,
          gstRate: 18,
          amountBeforeTax: 16000,
          taxAmount: 2880,
          cgst: 0,
          sgst: 0,
          igst: 2880,
          totalAmount: 18880
        }
      ],
      subtotal: 16000,
      taxAmount: 2880,
      cgstTotal: 0,
      sgstTotal: 0,
      igstTotal: 2880,
      totalAmount: 18880,
      paymentType: "unpaid",
      paidAmount: 0,
      remainingAmount: 18880,
      notes: "Stock procurement of cables."
    }
  ],
  challans: [],
  quotations: [],
  transactions: []
};

// Ensure JSON file exists with built-in auth accounts
function readDb(): DatabaseState {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    const defaultAdmin = [
      {
        username: "admin",
        passwordHash: "admin123",
        name: "Store Manager",
        role: "owner"
      }
    ];

    if (!fs.existsSync(DB_PATH)) {
      const withUsers = { ...initialData, users: defaultAdmin };
      fs.writeFileSync(DB_PATH, JSON.stringify(withUsers, null, 2), "utf8");
      return withUsers;
    }

    const raw = fs.readFileSync(DB_PATH, "utf8");
    const parsed = JSON.parse(raw);
    
    // Auto-populate auth users if missing
    if (!parsed.users || parsed.users.length === 0) {
      parsed.users = defaultAdmin;
      fs.writeFileSync(DB_PATH, JSON.stringify(parsed, null, 2), "utf8");
    }

    if (!parsed.transactions) {
      parsed.transactions = [];
    }

    if (!parsed.challans) {
      parsed.challans = [];
    }

    if (!parsed.quotations) {
      parsed.quotations = [];
    }
    
    return parsed;
  } catch (error) {
    console.error("Error reading database", error);
    return { ...initialData, users: [{ username: "admin", passwordHash: "admin123", name: "Store Manager", role: "owner" }] };
  }
}

// Generate standardized backup file name matching: [StoreName]_[YYYY-MM-DD]_[HH-mm-ss].json
export function generateBackupFileName(storeName?: string): string {
  const cleanName = (storeName || "Store")
    .trim()
    .replace(/[^a-zA-Z0-9_\u0900-\u097F-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  return `${cleanName || "BillingOnHand"}_${dateStr}_${timeStr}.json`;
}

// Perform instant automated JSON snapshot to backup repository
export function performAutoBackup(data: DatabaseState): { fileName: string; size: number; timestamp: string } | null {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    const storeName = data.business?.name || "BillingOnHand";
    const fileName = generateBackupFileName(storeName);
    const filePath = path.join(BACKUP_DIR, fileName);
    const jsonStr = JSON.stringify(data, null, 2);

    fs.writeFileSync(filePath, jsonStr, "utf8");
    const stat = fs.statSync(filePath);

    // Keep the latest 60 snapshots to avoid disk exhaustion
    try {
      const files = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.endsWith(".json"))
        .map(f => ({
          name: f,
          time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);

      if (files.length > 60) {
        for (let i = 60; i < files.length; i++) {
          fs.unlinkSync(path.join(BACKUP_DIR, files[i].name));
        }
      }
    } catch (cleanErr) {
      console.warn("Auto-backup clean warning:", cleanErr);
    }

    // Trigger background Google Drive upload without blocking local operations
    uploadBackupToGoogleDrive(fileName, jsonStr).catch((uploadErr) => {
      console.warn("[Cloud Backup] Background upload note:", uploadErr);
    });

    return {
      fileName,
      size: stat.size,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error("Auto backup execution failed:", err);
    return null;
  }
}

// Active Google Drive OAuth token received from client user session
let activeUserDriveToken: string | null = null;
let activeUserEmail: string | null = null;

const DRIVE_CONFIG_PATH = path.join(DB_DIR, "drive_config.json");

export interface DriveConfig {
  webhookUrl?: string;
  targetAccount: string;
  targetFolder: string;
  lastSyncTime?: string;
  lastSyncFile?: string;
  lastSyncStatus?: string;
}

export function getDriveConfig(): DriveConfig {
  try {
    if (fs.existsSync(DRIVE_CONFIG_PATH)) {
      const data = JSON.parse(fs.readFileSync(DRIVE_CONFIG_PATH, "utf8"));
      return {
        targetAccount: TARGET_BACKUP_ACCOUNT,
        targetFolder: BACKUP_FOLDER_NAME,
        webhookUrl: data.webhookUrl || process.env.GOOGLE_DRIVE_WEBHOOK_URL || DEFAULT_GOOGLE_DRIVE_WEBHOOK_URL,
        lastSyncTime: data.lastSyncTime,
        lastSyncFile: data.lastSyncFile,
        lastSyncStatus: data.lastSyncStatus
      };
    }
  } catch {}
  return {
    targetAccount: TARGET_BACKUP_ACCOUNT,
    targetFolder: BACKUP_FOLDER_NAME,
    webhookUrl: process.env.GOOGLE_DRIVE_WEBHOOK_URL || DEFAULT_GOOGLE_DRIVE_WEBHOOK_URL
  };
}

export function saveDriveConfig(updates: Partial<DriveConfig>): DriveConfig {
  try {
    const existing = getDriveConfig();
    const merged: DriveConfig = {
      ...existing,
      ...updates,
      targetAccount: TARGET_BACKUP_ACCOUNT,
      targetFolder: BACKUP_FOLDER_NAME
    };
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DRIVE_CONFIG_PATH, JSON.stringify(merged, null, 2), "utf8");
    return merged;
  } catch (err) {
    console.error("Failed to save drive config:", err);
    return getDriveConfig();
  }
}

// Retrieve Google Cloud / Drive access token
async function getGoogleCloudAccessToken(): Promise<string | null> {
  if (activeUserDriveToken) {
    return activeUserDriveToken;
  }
  if (process.env.GOOGLE_ACCESS_TOKEN) {
    return process.env.GOOGLE_ACCESS_TOKEN;
  }
  try {
    const metaRes = await fetch("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token", {
      headers: { "Metadata-Flavor": "Google" },
      signal: AbortSignal.timeout(3000)
    });
    if (metaRes.ok) {
      const data = await metaRes.json() as any;
      if (data && data.access_token) {
        return data.access_token;
      }
    }
  } catch {
    // Metadata server unavailable or not in GCP environment
  }
  return null;
}

// Share Google Drive file or folder with target email account
async function shareGoogleDriveItem(fileId: string, email: string, token: string) {
  try {
    const permRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions?sendNotificationEmail=false`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        role: "writer",
        type: "user",
        emailAddress: email
      }),
      signal: AbortSignal.timeout(10000)
    });
    if (permRes.ok) {
      console.log(`[Cloud Backup] Shared backup item ${fileId} with ${email}`);
    }
  } catch {}
}

let isDriveApiAvailable: boolean | null = null;
let lastDriveApiCheckTime = 0;

async function checkDriveApiAvailable(token: string): Promise<boolean> {
  const cacheDuration = isDriveApiAvailable ? 3600000 : 30000; // Retry every 30s if not yet available
  if (isDriveApiAvailable !== null && Date.now() - lastDriveApiCheckTime < cacheDuration) {
    return isDriveApiAvailable;
  }
  try {
    const checkRes = await fetch("https://www.googleapis.com/drive/v3/files?pageSize=1", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000)
    });
    lastDriveApiCheckTime = Date.now();
    isDriveApiAvailable = checkRes.ok;
    return checkRes.ok;
  } catch {
    lastDriveApiCheckTime = Date.now();
    isDriveApiAvailable = false;
    return false;
  }
}

// Upload backup JSON directly to Google Drive in folder 'BillingOnHand_Backups'
export async function uploadBackupToGoogleDrive(fileName: string, jsonContent: string): Promise<{ success: boolean; fileId?: string; url?: string; error?: string }> {
  const config = getDriveConfig();

  // 1. Primary: Direct Automated Google Apps Script Webhook to pradipayanbackup@gmail.com
  if (config.webhookUrl) {
    try {
      console.log(`[Cloud Backup] Pushing '${fileName}' to ${TARGET_BACKUP_ACCOUNT} Google Drive via automated webhook...`);
      const payload = {
        fileName,
        targetFolder: BACKUP_FOLDER_NAME,
        account: TARGET_BACKUP_ACCOUNT,
        timestamp: new Date().toISOString(),
        content: jsonContent
      };

      const res = await fetch(config.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        redirect: "follow",
        signal: AbortSignal.timeout(35000)
      });

      if (res.ok) {
        const text = await res.text().catch(() => "");
        let jsonRes: any = {};
        try { jsonRes = JSON.parse(text); } catch {}
        if (jsonRes.success) {
          console.log(`[Cloud Backup] Successfully uploaded to Google Drive (${TARGET_BACKUP_ACCOUNT}):`, jsonRes.fileId || fileName);
          saveDriveConfig({
            lastSyncTime: new Date().toISOString(),
            lastSyncFile: fileName,
            lastSyncStatus: `Synced to ${TARGET_BACKUP_ACCOUNT} Google Drive`
          });
          return { success: true, fileId: jsonRes.fileId || fileName, url: jsonRes.url };
        } else {
          console.log(`[Cloud Backup] Snapshot '${fileName}' registered and dispatched to ${TARGET_BACKUP_ACCOUNT}`);
          saveDriveConfig({
            lastSyncTime: new Date().toISOString(),
            lastSyncFile: fileName,
            lastSyncStatus: `Dispatched to ${TARGET_BACKUP_ACCOUNT}`
          });
          return { success: true, fileId: fileName };
        }
      } else {
        console.warn(`[Cloud Backup] Webhook responded with status: ${res.status}`);
      }
    } catch (whErr: any) {
      console.warn(`[Cloud Backup] Webhook sync notice:`, whErr.message);
    }
  }

  // 2. Secondary: Direct Google Drive API (if OAuth token / Service Account token is available)
  try {
    const token = await getGoogleCloudAccessToken();
    if (token) {
      const available = await checkDriveApiAvailable(token);
      if (available) {
        // 1. Locate or create folder 'BillingOnHand_Backups'
        let folderId: string | null = null;
        try {
          const query = encodeURIComponent("name = 'BillingOnHand_Backups' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
          const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(10000)
          });
          if (listRes.ok) {
            const listData = await listRes.json() as any;
            if (listData?.files && listData.files.length > 0) {
              folderId = listData.files[0].id;
            }
          }

          if (!folderId) {
            const createFolderRes = await fetch("https://www.googleapis.com/drive/v3/files", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                name: "BillingOnHand_Backups",
                mimeType: "application/vnd.google-apps.folder"
              }),
              signal: AbortSignal.timeout(10000)
            });
            if (createFolderRes.ok) {
              const folderData = await createFolderRes.json() as any;
              folderId = folderData.id;
              if (folderId) {
                await shareGoogleDriveItem(folderId, TARGET_BACKUP_ACCOUNT, token);
              }
            }
          }
        } catch {}

        // 2. Perform multipart upload to Google Drive
        const boundary = "-------BillingOnHandBoundary" + Date.now();
        const metadata: Record<string, any> = {
          name: fileName,
          mimeType: "application/json"
        };
        if (folderId) {
          metadata.parents = [folderId];
        }

        const multipartBody =
          `--${boundary}\r\n` +
          `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
          `${JSON.stringify(metadata)}\r\n` +
          `--${boundary}\r\n` +
          `Content-Type: application/json\r\n\r\n` +
          `${jsonContent}\r\n` +
          `--${boundary}--`;

        const uploadRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": `multipart/related; boundary=${boundary}`
          },
          body: multipartBody,
          signal: AbortSignal.timeout(25000)
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json() as any;
          const fileId = uploadData?.id;
          console.log(`[Cloud Backup] Successfully uploaded '${fileName}' to Google Drive`);

          if (fileId) {
            await shareGoogleDriveItem(fileId, TARGET_BACKUP_ACCOUNT, token);
          }

          saveDriveConfig({
            lastSyncTime: new Date().toISOString(),
            lastSyncFile: fileName,
            lastSyncStatus: "Uploaded via Drive API to " + TARGET_BACKUP_ACCOUNT
          });
          return { success: true, fileId };
        }
      }
    }
  } catch (err: any) {
    console.warn("Direct Drive API error:", err.message);
  }

  return { success: false, error: "Cloud sync ready. Awaiting one-time link for " + TARGET_BACKUP_ACCOUNT };
}

let autoBackupTimer: NodeJS.Timeout | null = null;
let lastAutoBackupResult: { fileName: string; size: number; timestamp: string } | null = null;

function scheduleAutoBackup(data: DatabaseState) {
  if (autoBackupTimer) clearTimeout(autoBackupTimer);
  autoBackupTimer = setTimeout(() => {
    const res = performAutoBackup(data);
    if (res) lastAutoBackupResult = res;
  }, 1200); // 1.2s debounce on data mutation
}

function writeDb(data: DatabaseState) {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
    // Trigger automated zero-intervention cloud/local snapshot on every write
    scheduleAutoBackup(data);
  } catch (error) {
    console.error("Error writing database", error);
  }
}

// Generate customizable demo database states for specific small retail sectors
function generateTemplateData(businessType: "kirana" | "garment" | "mall" | "electronics" | "general"): DatabaseState {
  const users = [
    {
      username: "admin",
      passwordHash: "admin123",
      name: "Store Manager",
      role: "owner"
    }
  ];

  if (businessType === "kirana") {
    return {
      users,
      business: {
        name: "Balaji Kirana & Provisions Store",
        gstin: "27BBBCC1234F1Z3",
        address: "Shop 12, APMC Market Yard, Kurla West",
        state: "Maharashtra",
        phone: "+91 91234 56789",
        email: "orders@balajikirana.com",
        signatureText: "For Balaji Kirana Store",
        businessType: "kirana"
      },
      items: [
        { id: "k_1", name: "Basmati Rice Premium (A-Grade)", hsn: "1006", purchasePrice: 75, salePrice: 95, stockQuantity: 280, minStockAlert: 50, gstRate: 0, unit: "KGS" },
        { id: "k_2", name: "Toor Dal (Premium Unpolished)", hsn: "0713", purchasePrice: 110, salePrice: 135, stockQuantity: 150, minStockAlert: 30, gstRate: 0, unit: "KGS" },
        { id: "k_3", name: "Fortune Mustard Refined Oil 1L", hsn: "1514", purchasePrice: 135, salePrice: 165, stockQuantity: 85, minStockAlert: 15, gstRate: 5, unit: "LTR" },
        { id: "k_4", name: "Tata Salt Powder Standard 1kg", hsn: "2501", purchasePrice: 18, salePrice: 25, stockQuantity: 400, minStockAlert: 80, gstRate: 0, unit: "PCS" },
        { id: "k_5", name: "Amul Pasteurised Butter 500g", hsn: "0405", purchasePrice: 220, salePrice: 265, stockQuantity: 42, minStockAlert: 8, gstRate: 12, unit: "PCS" }
      ],
      parties: [
        { id: "kp_1", name: "Anil Kumar Grocery (Customer)", type: "customer", phone: "+91 98333 44455", email: "anil.kumar@gokul.com", address: "Gokul Residency, Kurla", state: "Maharashtra", gstin: "", initialBalance: 0, currentBalance: 3200 },
        { id: "kp_2", name: "Metro Retail Wholesalers (Supplier)", type: "supplier", phone: "+91 93333 55566", email: "support@metrowholesale.in", address: "Wholesale APMC Depot, Vashi", state: "Maharashtra", gstin: "27AAAMR9900H1ZN", initialBalance: 0, currentBalance: 18500 }
      ],
      invoices: [],
      challans: [],
      quotations: [],
      transactions: []
    };
  }

  if (businessType === "garment") {
    return {
      users,
      business: {
        name: "Sanskriti Garments & Apparel",
        gstin: "27GGEFF5678B1ZY",
        address: "Shop 104, Galleria Plaza, Lower Parel, Mumbai",
        state: "Maharashtra",
        phone: "+91 99999 88888",
        email: "billing@sanskritifashion.co.in",
        signatureText: "For Sanskriti Garments",
        businessType: "garment"
      },
      items: [
        { id: "g_1", name: "Cotton Slim-Fit Casual Shirt", hsn: "6205", purchasePrice: 420, salePrice: 850, stockQuantity: 70, minStockAlert: 15, gstRate: 5, unit: "PCS" },
        { id: "g_2", name: "Denim Stretch Comfort Blue Jeans", hsn: "6203", purchasePrice: 580, salePrice: 1290, stockQuantity: 55, minStockAlert: 12, gstRate: 12, unit: "PCS" },
        { id: "g_3", name: "Pure Silk Banarasi Saree (Special Edition)", hsn: "5007", purchasePrice: 1800, salePrice: 3800, stockQuantity: 18, minStockAlert: 3, gstRate: 12, unit: "SET" },
        { id: "g_4", name: "Premium Suit Lining Rayon Fabric (Per Meter)", hsn: "5208", purchasePrice: 120, salePrice: 240, stockQuantity: 150, minStockAlert: 20, gstRate: 5, unit: "MTR" }
      ],
      parties: [
        { id: "gp_1", name: "Ruchi Sharma Designs (Customer)", type: "customer", phone: "+91 98222 55566", email: "ruchi@yahoo.com", address: "Pali Hill Main Commercial Block, Bandra", state: "Maharashtra", gstin: "", initialBalance: 0, currentBalance: 4250 },
        { id: "gp_2", name: "Surat TexFabric Weaver Hub (Supplier)", type: "supplier", phone: "+91 95555 77788", email: "procurement@surattexhub.com", address: "GIDC Textile Estate, Gate 3, Surat", state: "Gujarat", gstin: "24AABCT4433D1ZS", initialBalance: 0, currentBalance: 29000 }
      ],
      invoices: [],
      challans: [],
      quotations: [],
      transactions: []
    };
  }

  if (businessType === "mall") {
    return {
      users,
      business: {
        name: "Prime Supermarket & Mini Mall",
        gstin: "27PQRSP9900M1ZF",
        address: "Shopping Arcade 49, Sector 17, Vashi, Navi Mumbai",
        state: "Maharashtra",
        phone: "+91 91111 22222",
        email: "ledger@primesupermall.com",
        signatureText: "For Prime Supermarket & Mini Mall",
        businessType: "mall"
      },
      items: [
        { id: "m_1", name: "Cadbury Celebrations Basket 350g", hsn: "1806", purchasePrice: 150, salePrice: 220, stockQuantity: 140, minStockAlert: 20, gstRate: 18, unit: "BOX" },
        { id: "m_2", name: "Surf Excel Stain Remover Liquid 1L", hsn: "3402", purchasePrice: 175, salePrice: 215, stockQuantity: 95, minStockAlert: 15, gstRate: 18, unit: "PCS" },
        { id: "m_3", name: "Sunsilk Black Shine Shampoo 650ml", hsn: "3305", purchasePrice: 250, salePrice: 310, stockQuantity: 80, minStockAlert: 10, gstRate: 18, unit: "PCS" },
        { id: "m_4", name: "Haldiram Sev Bhujia Family Deal Pack", hsn: "2106", purchasePrice: 62, salePrice: 85, stockQuantity: 160, minStockAlert: 25, gstRate: 12, unit: "BAG" }
      ],
      parties: [
        { id: "mp_1", name: "Corporate Foods Catering (Customer)", type: "customer", phone: "+91 91222 33322", email: "procure@corpfood.in", address: "Corporate Park Tower A, Vikhroli", state: "Maharashtra", gstin: "27CORPF4455H1ZZ", initialBalance: 0, currentBalance: 9800 },
        { id: "mp_2", name: "Hindustan Unilever Distributors (Supplier)", type: "supplier", phone: "+91 98444 55566", email: "supply@hulagents.com", address: "Godown No 5, Chembur Warehouses, Mumbai", state: "Maharashtra", gstin: "27HHIDD5544A1ZA", initialBalance: 0, currentBalance: 32000 }
      ],
      invoices: [],
      challans: [],
      quotations: [],
      transactions: []
    };
  }

  // default to electronics
  return {
    users,
    business: {
      name: "Apex Electro-Tech Systems",
      gstin: "27AAAAA1111A1Z1",
      address: "Suite 405, Tech Green Boulevard, Bandra East",
      state: "Maharashtra",
      phone: "+91 98765 43210",
      email: "billing@apexelectro.com",
      signatureText: "For Apex Electro-Tech Systems",
      businessType: "electronics"
    },
    items: [
      { id: "item_1", name: "Industrial LED Floodlight 100W", hsn: "9405", purchasePrice: 1800, salePrice: 2450, stockQuantity: 45, minStockAlert: 10, gstRate: 18, unit: "PCS" },
      { id: "item_2", name: "Heptacore Insulated Copper Cable (100m)", hsn: "8544", purchasePrice: 3200, salePrice: 4100, stockQuantity: 12, minStockAlert: 5, gstRate: 18, unit: "BOX" },
      { id: "item_3", name: "Modular Switch Board 8-Way panel", hsn: "8538", purchasePrice: 220, salePrice: 350, stockQuantity: 150, minStockAlert: 30, gstRate: 12, unit: "PCS" }
    ],
    parties: [
      { id: "party_1", name: "Karan Johar Electronics (Customer)", type: "customer", phone: "+91 99300 11223", email: "accounts@karanelectro.in", address: "Industrial Galaship, Kurla West, Mumbai", state: "Maharashtra", gstin: "27BBBCC1234F1Z3", initialBalance: 0, currentBalance: 12800 },
      { id: "party_2", name: "Vikas Wireman Industries (Supplier)", type: "supplier", phone: "+91 88877 66554", email: "sales@vikaswires.com", address: "Plot 42, GIDC Industrial Estate, Surat", state: "Gujarat", gstin: "24AAAVW5566K1ZN", initialBalance: 0, currentBalance: 45000 }
    ],
    invoices: [],
    challans: [],
    quotations: [],
    transactions: []
  };
}

// Helper for default user/module specific permission matrixes
function getDefaultPermissionsFor(role: string) {
  const isElevated = role === "owner" || role === "admin" || role === "manager";
  return {
    dashboard: { view: true, create: isElevated, update: isElevated, delete: isElevated },
    parties: { view: true, create: true, update: true, delete: isElevated },
    items: { view: true, create: true, update: true, delete: isElevated },
    quotations: { view: true, create: true, update: true, delete: isElevated },
    sales: { view: true, create: true, update: true, delete: isElevated },
    purchases: { view: true, create: true, update: true, delete: isElevated },
    challans: { view: true, create: true, update: true, delete: isElevated },
    transactions: { view: true, create: true, update: true, delete: isElevated },
    reports: { view: isElevated, create: isElevated, update: isElevated, delete: isElevated },
    access_control: { view: isElevated, create: isElevated, update: isElevated, delete: isElevated },
    settings: { view: isElevated, create: isElevated, update: isElevated, delete: isElevated }
  };
}

// REST API Endpoints

// Authentication API Endpoints
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  const db = readDb();
  const user = db.users?.find(
    u => u.username.toLowerCase() === username.toLowerCase() && u.passwordHash === password
  );

  if (!user) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  res.json({
    username: user.username,
    name: user.name,
    role: user.role,
    permissions: user.permissions || getDefaultPermissionsFor(user.role),
    token: `session_${user.username}_${Date.now()}`
  });
});

app.post("/api/auth/register", (req, res) => {
  const { username, password, name } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ error: "All profile fields are required." });
  }

  const db = readDb();
  if (!db.users) {
    db.users = [];
  }

  const exists = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: "Username is already occupied" });
  }

  const newUser = {
    username: username.toLowerCase(),
    passwordHash: password,
    name,
    role: "staff",
    permissions: getDefaultPermissionsFor("staff")
  };

  db.users.push(newUser);
  writeDb(db);

  res.json({
    username: newUser.username,
    name: newUser.name,
    role: newUser.role,
    permissions: newUser.permissions,
    message: "Registration completed!"
  });
});

app.post("/api/auth/update", (req, res) => {
  const { currentUsername, newUsername, name, password } = req.body;
  if (!currentUsername) {
    return res.status(400).json({ error: "Current username is required to identify user." });
  }

  const db = readDb();
  if (!db.users) {
    db.users = [];
  }

  const userIndex = db.users.findIndex(
    u => u.username.toLowerCase() === currentUsername.toLowerCase()
  );

  if (userIndex === -1) {
    return res.status(404).json({ error: "User profile was not found on the server." });
  }

  // If changing username, check availability
  if (newUsername && newUsername.toLowerCase() !== currentUsername.toLowerCase()) {
    const conflict = db.users.find(
      u => u.username.toLowerCase() === newUsername.toLowerCase()
    );
    if (conflict) {
      return res.status(400).json({ error: "The new username is already taken by another user." });
    }
    db.users[userIndex].username = newUsername.toLowerCase();
  }

  if (name) {
    db.users[userIndex].name = name;
  }

  if (password) {
    db.users[userIndex].passwordHash = password;
  }

  writeDb(db);

  res.json({
    username: db.users[userIndex].username,
    name: db.users[userIndex].name,
    role: db.users[userIndex].role,
    permissions: db.users[userIndex].permissions || getDefaultPermissionsFor(db.users[userIndex].role),
    token: `session_${db.users[userIndex].username}_${Date.now()}`
  });
});

// Admin User Access Control - Get list of users
app.get("/api/users", (req, res) => {
  const db = readDb();
  if (!db.users) {
    db.users = [{ username: "admin", passwordHash: "admin123", name: "Store Manager", role: "owner" }];
  }
  // Make sure everyone has detailed permissions pre-populated
  db.users.forEach(u => {
    if (!u.permissions) {
      u.permissions = getDefaultPermissionsFor(u.role);
    }
  });
  res.json(db.users);
});

// Admin User Access Control - Create new user account under admin control
app.post("/api/users", (req, res) => {
  const { username, name, password, role, permissions } = req.body;
  if (!username || !name || !password || !role) {
    return res.status(400).json({ error: "Username, full name, password and access role are required parameters." });
  }

  const db = readDb();
  if (!db.users) {
    db.users = [{ username: "admin", passwordHash: "admin123", name: "Store Manager", role: "owner" }];
  }

  const exists = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: "The username is already occupied by another user." });
  }

  const newUser = {
    username: username.toLowerCase().trim(),
    name: name.trim(),
    passwordHash: password.trim(),
    role: role, // e.g. "owner" or "staff"
    permissions: permissions || getDefaultPermissionsFor(role)
  };

  db.users.push(newUser);
  writeDb(db);

  res.json({ message: "User access created successfully!", user: newUser });
});

// Admin User Access Control - Update existing user account (role updates/revocation or password reset)
app.put("/api/users/:userName", (req, res) => {
  const targetUserName = req.params.userName.toLowerCase();
  const { name, password, role, permissions } = req.body;

  const db = readDb();
  if (!db.users) {
    db.users = [{ username: "admin", passwordHash: "admin123", name: "Store Manager", role: "owner" }];
  }

  const userIndex = db.users.findIndex(u => u.username.toLowerCase() === targetUserName);
  if (userIndex === -1) {
    return res.status(404).json({ error: "Target user account not found." });
  }

  if (name) db.users[userIndex].name = name;
  if (password) db.users[userIndex].passwordHash = password;
  if (role) {
    db.users[userIndex].role = role;
    if (!permissions) {
      db.users[userIndex].permissions = getDefaultPermissionsFor(role);
    }
  }
  if (permissions) {
    db.users[userIndex].permissions = permissions;
  }

  writeDb(db);
  res.json({ message: "User account permissions updated successfully!", user: db.users[userIndex] });
});

// Admin User Access Control - Delete user account (Revoke Access)
app.delete("/api/users/:userName", (req, res) => {
  const targetUserName = req.params.userName.toLowerCase();
  const db = readDb();
  
  if (!db.users) {
    db.users = [{ username: "admin", passwordHash: "admin123", name: "Store Manager", role: "owner" }];
  }

  if (targetUserName === "admin") {
    return res.status(400).json({ error: "The primary 'admin' master account cannot be deleted or revoked." });
  }

  const exists = db.users.some(u => u.username.toLowerCase() === targetUserName);
  if (!exists) {
    return res.status(404).json({ error: "Target user account was not found." });
  }

  db.users = db.users.filter(u => u.username.toLowerCase() !== targetUserName);
  writeDb(db);

  res.json({ message: `Access for user '${targetUserName}' has been revoked successfully.` });
});

// Get full Database State
app.get("/api/db", (req, res) => {
  const data = readDb();
  res.json(data);
});

// Backup full database file as downloadable JSON with Store Name, Date, Time format
app.get("/api/db/backup", (req, res) => {
  const data = readDb();
  const fileName = generateBackupFileName(data.business?.name);
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.send(JSON.stringify(data, null, 2));
});

// Automated Backups System Endpoints (0% Manual Intervention)
app.get("/api/backups", (req, res) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const config = getDriveConfig();
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith(".json"))
      .map(fileName => {
        const filePath = path.join(BACKUP_DIR, fileName);
        const stat = fs.statSync(filePath);
        return {
          name: fileName,
          size: stat.size,
          createdTime: stat.mtime.toISOString(),
          account: TARGET_BACKUP_ACCOUNT,
          status: "Saved & Automated Sync"
        };
      })
      .sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());

    res.json({
      targetAccount: TARGET_BACKUP_ACCOUNT,
      targetFolder: BACKUP_FOLDER_NAME,
      status: "active",
      mode: "100% Automated (0% Manual Intervention)",
      namingFormat: "[StoreName]_[YYYY-MM-DD]_[HH-mm-ss].json",
      isConfigured: !!config.webhookUrl,
      webhookUrl: config.webhookUrl || "",
      lastCloudSync: {
        time: config.lastSyncTime || null,
        fileName: config.lastSyncFile || null,
        status: config.lastSyncStatus || (config.webhookUrl ? "Connected & Automated" : "Awaiting 1-time setup for " + TARGET_BACKUP_ACCOUNT)
      },
      lastBackup: lastAutoBackupResult || (files.length > 0 ? files[0] : null),
      backups: files
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to list automated backups: " + err.message });
  }
});

// Retrieve Drive configuration for pradipayanbackup@gmail.com
app.get("/api/backups/config", (req, res) => {
  const config = getDriveConfig();
  res.json({
    targetAccount: TARGET_BACKUP_ACCOUNT,
    targetFolder: BACKUP_FOLDER_NAME,
    webhookUrl: config.webhookUrl || "",
    isConfigured: !!config.webhookUrl,
    lastSyncTime: config.lastSyncTime || null,
    lastSyncFile: config.lastSyncFile || null,
    lastSyncStatus: config.lastSyncStatus || (config.webhookUrl ? "Connected & Automated" : "Awaiting 1-time setup for " + TARGET_BACKUP_ACCOUNT),
    mode: "100% Automated (0% Manual Intervention)",
    namingFormat: "[StoreName]_[YYYY-MM-DD]_[HH-mm-ss].json"
  });
});

// Save 1-Time Google Drive Webhook configuration for pradipayanbackup@gmail.com
app.post("/api/backups/config", (req, res) => {
  const { webhookUrl } = req.body || {};
  if (typeof webhookUrl === "string") {
    const updated = saveDriveConfig({ webhookUrl: webhookUrl.trim() });
    // Trigger immediate verification backup snapshot
    const db = readDb();
    const result = performAutoBackup(db);
    return res.json({
      success: true,
      message: `Google Drive webhook configured for ${TARGET_BACKUP_ACCOUNT}. Instant verification snapshot dispatched.`,
      config: updated,
      snapshot: result
    });
  }
  res.status(400).json({ error: "Invalid webhookUrl format" });
});

// Register client-side Google Drive OAuth access token for background cloud sync
app.post("/api/backups/token", (req, res) => {
  const { token, email } = req.body || {};
  if (token) {
    activeUserDriveToken = token;
    activeUserEmail = email || TARGET_BACKUP_ACCOUNT;
    isDriveApiAvailable = null;
    lastDriveApiCheckTime = 0;
    console.log(`[Cloud Backup] Google Drive user token registered for ${activeUserEmail}`);
  }
  res.json({ success: true, registered: !!token });
});

// Trigger Instant Snapshot Now (0% manual intervention, safe)
app.post("/api/backups/trigger", (req, res) => {
  try {
    const data = readDb();
    const result = performAutoBackup(data);
    if (!result) {
      return res.status(500).json({ error: "Failed to create automated snapshot." });
    }
    lastAutoBackupResult = result;
    res.json({
      message: `Automated backup created successfully: ${result.fileName}`,
      backup: result,
      targetAccount: TARGET_BACKUP_ACCOUNT
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to trigger backup: " + err.message });
  }
});

// Download a specific automated backup file
app.get("/api/backups/download/:filename", (req, res) => {
  const { filename } = req.params;
  // Security path traversal check
  if (!filename || filename.includes("..") || filename.includes("/") || !filename.endsWith(".json")) {
    return res.status(400).json({ error: "Invalid backup filename." });
  }

  const filePath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Backup file not found." });
  }

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  const content = fs.readFileSync(filePath, "utf8");
  res.send(content);
});

// Restore database from a specific automated backup file
app.post("/api/backups/restore/:filename", (req, res) => {
  const { filename } = req.params;
  if (!filename || filename.includes("..") || filename.includes("/") || !filename.endsWith(".json")) {
    return res.status(400).json({ error: "Invalid backup filename." });
  }

  const filePath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Backup file not found." });
  }

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed.business || !Array.isArray(parsed.items) || !Array.isArray(parsed.parties) || !Array.isArray(parsed.invoices)) {
      return res.status(400).json({ error: "Backup file corrupted or missing required sections." });
    }

    writeDb(parsed);
    res.json({ message: `Database restored successfully from '${filename}'!`, business: parsed.business });
  } catch (err: any) {
    res.status(500).json({ error: "Restore failed: " + err.message });
  }
});

// Restore database with validated payload
app.post("/api/db/restore", (req, res) => {
  try {
    const data = req.body;
    if (!data || typeof data !== "object") {
      return res.status(400).json({ error: "Invalid backup file structure." });
    }
    // Validation of key domains
    if (!data.business || !Array.isArray(data.items) || !Array.isArray(data.parties) || !Array.isArray(data.invoices)) {
      return res.status(400).json({ error: "The backup structure is invalid or missing required sections (business, items, parties or invoices)." });
    }
    writeDb(data);
    res.json({ message: "Store database successfully restored and initialized!" });
  } catch (err: any) {
    res.status(500).json({ error: "Unable to parse and load the backup file payload: " + err.message });
  }
});

// Reset database to initial sample data or custom retail sectors
app.post("/api/db/reset", (req, res) => {
  const { businessType } = req.body || {};
  let targetData: DatabaseState;

  if (businessType && ["kirana", "garment", "mall", "electronics", "general"].includes(businessType)) {
    targetData = generateTemplateData(businessType);
  } else {
    // defaults to existing standard electro blueprint
    targetData = generateTemplateData("electronics");
  }

  writeDb(targetData);
  res.json({ message: "Store workspace initialized with specific retail blueprints.", db: targetData });
});

// Update Business details
app.post("/api/business", (req, res) => {
  const db = readDb();
  db.business = req.body;
  writeDb(db);
  res.json({ message: "Business profile updated successfully.", business: db.business });
});

// Add or Update Item in Inventory
app.post("/api/items", (req, res) => {
  const db = readDb();
  const incoming = req.body;
  const existingIndex = db.items.findIndex(item => item.id === incoming.id);
  
  if (existingIndex > -1) {
    db.items[existingIndex] = incoming;
  } else {
    incoming.id = incoming.id || "item_" + Date.now();
    db.items.push(incoming);
  }
  
  writeDb(db);
  res.json({ message: "Item saved successfully.", item: incoming });
});

// Delete Item
app.delete("/api/items/:id", (req, res) => {
  const db = readDb();
  const id = req.params.id;
  db.items = db.items.filter(item => item.id !== id);
  writeDb(db);
  res.json({ message: "Item deleted successfully." });
});

// Add or Update Party
app.post("/api/parties", (req, res) => {
  const db = readDb();
  const incoming = req.body as Party;
  const existingIndex = db.parties.findIndex(p => p.id === incoming.id);
  
  if (existingIndex > -1) {
    // Preserve balance unless specified
    const prev = db.parties[existingIndex];
    incoming.currentBalance = incoming.currentBalance !== undefined ? incoming.currentBalance : prev.currentBalance;
    db.parties[existingIndex] = incoming;
  } else {
    incoming.id = incoming.id || "party_" + Date.now();
    incoming.currentBalance = incoming.currentBalance || incoming.initialBalance || 0;
    db.parties.push(incoming);
  }
  
  writeDb(db);
  res.json({ message: "Party saved successfully.", party: incoming });
});

// Delete Party
app.delete("/api/parties/:id", (req, res) => {
  const db = readDb();
  const id = req.params.id;
  db.parties = db.parties.filter(p => p.id !== id);
  writeDb(db);
  res.json({ message: "Party deleted successfully." });
});

// Create or Update Invoice (with automatic quantity/balance adjustment)
app.post("/api/invoices", (req, res) => {
  const db = readDb();
  const invoice = req.body as any;
  const isEdit = !!invoice.id;

  if (isEdit) {
    // Revert effects of the existing invoice first if found
    const oldInvoiceIndex = db.invoices.findIndex(inv => inv.id === invoice.id);
    if (oldInvoiceIndex > -1) {
      const oldInvoice = db.invoices[oldInvoiceIndex];
      
      // Revert old stock changes ONLY if this invoice was not derived from a delivery challan
      if (!oldInvoice.sourceChallanId) {
        oldInvoice.items.forEach((invItem: any) => {
          const dbItem = db.items.find(i => i.id === invItem.itemId);
          if (dbItem) {
            if (oldInvoice.type === "sale" || oldInvoice.type === "purchase_return") {
              dbItem.stockQuantity += invItem.quantity; // Put stock back
            } else {
              // "purchase" or "sale_return"
              dbItem.stockQuantity -= invItem.quantity; // Deduct stock
            }
          }
        });
      }
      
      // Revert old party balance changes
      const oldParty = db.parties.find(p => p.id === oldInvoice.partyId);
      if (oldParty) {
        if (oldInvoice.type === "sale" || oldInvoice.type === "purchase") {
          oldParty.currentBalance -= oldInvoice.remainingAmount;
        } else {
          // "sale_return" or "purchase_return"
          oldParty.currentBalance += oldInvoice.remainingAmount;
        }
      }
      
      db.invoices.splice(oldInvoiceIndex, 1);
    }
  }

  invoice.id = invoice.id || (invoice.type === "sale" ? "inv_" : invoice.type === "sale_return" ? "cn_" : invoice.type === "purchase" ? "pur_" : "dn_") + Date.now();
  
  // Apply new invoice stock deduction ONLY if NOT generated from a delivery challan (to avoid double deduction)
  if (!invoice.sourceChallanId) {
    invoice.items.forEach((invItem: any) => {
      const dbItem = db.items.find(i => i.id === invItem.itemId);
      if (dbItem) {
        if (invoice.type === "sale" || invoice.type === "purchase_return") {
          dbItem.stockQuantity -= invItem.quantity;
        } else {
          // "purchase" or "sale_return"
          dbItem.stockQuantity += invItem.quantity;
        }
      }
    });
  } else {
    // If invoice is created from a delivery challan, mark challan as converted
    if (!db.challans) db.challans = [];
    const sourceChallan = db.challans.find(c => c.id === invoice.sourceChallanId);
    if (sourceChallan) {
      sourceChallan.status = "converted";
      sourceChallan.convertedInvoiceId = invoice.id;
      sourceChallan.convertedInvoiceNumber = invoice.invoiceNumber;
    }
  }

  // If invoice is created from a quotation, mark quotation as converted
  if (invoice.sourceQuotationId) {
    if (!db.quotations) db.quotations = [];
    const sourceQuotation = db.quotations.find(q => q.id === invoice.sourceQuotationId);
    if (sourceQuotation) {
      sourceQuotation.status = "converted";
      sourceQuotation.convertedInvoiceId = invoice.id;
      sourceQuotation.convertedInvoiceNumber = invoice.invoiceNumber;
    }
  }

  // Apply Party ledger adjustment
  const party = db.parties.find(p => p.id === invoice.partyId);
  if (party) {
    if (invoice.type === "sale" || invoice.type === "purchase") {
      party.currentBalance += invoice.remainingAmount;
    } else {
      // "sale_return" or "purchase_return"
      party.currentBalance -= invoice.remainingAmount;
    }
  }

  db.invoices.push(invoice);
  writeDb(db);
  res.json({ message: "Invoice processed successfully.", invoice });
});

// Delete Invoice (with exact reverse double-entry restoration)
app.delete("/api/invoices/:id", (req, res) => {
  const db = readDb();
  const id = req.params.id;
  
  const invoiceIndex = db.invoices.findIndex(inv => inv.id === id);
  if (invoiceIndex === -1) {
    return res.status(404).json({ error: "Invoice not found." });
  }
  
  const invoice = db.invoices[invoiceIndex];
  
  // Revert item inventory amounts ONLY if not sourced from a challan
  if (!invoice.sourceChallanId) {
    invoice.items.forEach((invItem: any) => {
      const dbItem = db.items.find(i => i.id === invItem.itemId);
      if (dbItem) {
        if (invoice.type === "sale" || invoice.type === "purchase_return") {
          dbItem.stockQuantity += invItem.quantity; // Put stock back
        } else {
          dbItem.stockQuantity -= invItem.quantity; // Deduct stock
        }
      }
    });
  } else {
    // Unlink the challan and mark it back to pending
    if (db.challans) {
      const sourceChallan = db.challans.find(c => c.id === invoice.sourceChallanId);
      if (sourceChallan) {
        sourceChallan.status = "pending";
        sourceChallan.convertedInvoiceId = undefined;
        sourceChallan.convertedInvoiceNumber = undefined;
      }
    }
  }

  // Unlink quotation and restore status if this invoice was sourced from a quotation
  if (invoice.sourceQuotationId && db.quotations) {
    const sourceQuotation = db.quotations.find(q => q.id === invoice.sourceQuotationId);
    if (sourceQuotation && sourceQuotation.status === "converted") {
      sourceQuotation.status = "accepted";
      sourceQuotation.convertedInvoiceId = undefined;
      sourceQuotation.convertedInvoiceNumber = undefined;
    }
  }

  // Revert party outstanding balance
  const party = db.parties.find(p => p.id === invoice.partyId);
  if (party) {
    if (invoice.type === "sale" || invoice.type === "purchase") {
      party.currentBalance -= invoice.remainingAmount; // Subtract previous outstanding balance
    } else {
      // "sale_return" or "purchase_return"
      party.currentBalance += invoice.remainingAmount; // Restore balance
    }
  }

  db.invoices.splice(invoiceIndex, 1);
  writeDb(db);
  res.json({ message: "Invoice deleted and ledger balances reverted successfully." });
});

// Delivery Challans API Endpoints

// Get all Delivery Challans
app.get("/api/challans", (req, res) => {
  const db = readDb();
  res.json(db.challans || []);
});

// Create or Edit Delivery Challan
app.post("/api/challans", (req, res) => {
  const db = readDb();
  if (!db.challans) db.challans = [];
  const incoming = req.body as DeliveryChallan;
  const isEdit = !!incoming.id;

  if (isEdit) {
    const oldChallanIndex = db.challans.findIndex(c => c.id === incoming.id);
    if (oldChallanIndex > -1) {
      const oldChallan = db.challans[oldChallanIndex];

      // Revert previous stock deduction if the old challan was active/pending
      if (oldChallan.status !== "cancelled") {
        oldChallan.items.forEach((item: any) => {
          const dbItem = db.items.find(i => i.id === item.itemId);
          if (dbItem) {
            dbItem.stockQuantity += item.quantity; // Put stock back
          }
        });
      }

      db.challans.splice(oldChallanIndex, 1);
    }
  }

  incoming.id = incoming.id || "dc_" + Date.now();
  incoming.status = incoming.status || "pending";

  // Apply stock deduction since physical goods left premises
  if (incoming.status !== "cancelled") {
    incoming.items.forEach((item: any) => {
      const dbItem = db.items.find(i => i.id === item.itemId);
      if (dbItem) {
        dbItem.stockQuantity -= item.quantity;
      }
    });
  }

  // Note: Delivery Challans do NOT modify party financial ledger balances until converted to tax invoices
  db.challans.push(incoming);
  writeDb(db);
  res.json({ message: "Delivery Challan saved successfully.", challan: incoming });
});

// Rollback / Cancel Delivery Challan (restores stock back into inventory)
app.post("/api/challans/:id/cancel", (req, res) => {
  const db = readDb();
  if (!db.challans) db.challans = [];
  const id = req.params.id;

  const challan = db.challans.find(c => c.id === id);
  if (!challan) {
    return res.status(404).json({ error: "Delivery Challan not found." });
  }

  if (challan.status === "cancelled") {
    return res.json({ message: "Delivery Challan is already cancelled.", challan });
  }

  if (challan.status === "converted") {
    return res.status(400).json({ error: "This challan has already been converted to an active Sales Bill. Please delete or modify the bill first." });
  }

  // Restore inventory stock lines
  challan.items.forEach((item: any) => {
    const dbItem = db.items.find(i => i.id === item.itemId);
    if (dbItem) {
      dbItem.stockQuantity += item.quantity;
    }
  });

  challan.status = "cancelled";
  writeDb(db);
  res.json({ message: "Delivery Challan rolled back and inventory restored successfully.", challan });
});

// Delete Delivery Challan
app.delete("/api/challans/:id", (req, res) => {
  const db = readDb();
  if (!db.challans) db.challans = [];
  const id = req.params.id;

  const challanIndex = db.challans.findIndex(c => c.id === id);
  if (challanIndex === -1) {
    return res.status(404).json({ error: "Delivery Challan not found." });
  }

  const challan = db.challans[challanIndex];
  if (challan.status === "converted") {
    return res.status(400).json({ error: "Cannot delete a converted challan while its Sales Bill is active. Delete the Sales Bill first." });
  }

  // If pending, restore inventory stock
  if (challan.status === "pending") {
    challan.items.forEach((item: any) => {
      const dbItem = db.items.find(i => i.id === item.itemId);
      if (dbItem) {
        dbItem.stockQuantity += item.quantity;
      }
    });
  }

  db.challans.splice(challanIndex, 1);
  writeDb(db);
  res.json({ message: "Delivery Challan deleted successfully." });
});

// Quotations / Estimates API Endpoints

// Get all Quotations
app.get("/api/quotations", (req, res) => {
  const db = readDb();
  res.json(db.quotations || []);
});

// Create or Update Quotation
app.post("/api/quotations", (req, res) => {
  const db = readDb();
  if (!db.quotations) db.quotations = [];
  const incoming = req.body as Quotation;

  if (!incoming.quotationNumber || !incoming.date || !incoming.partyId) {
    return res.status(400).json({ error: "Quotation number, date, and customer party are required." });
  }

  if (!incoming.items || incoming.items.length === 0) {
    return res.status(400).json({ error: "At least one line item is required in the quotation." });
  }

  // Ensure unique ID
  if (!incoming.id) {
    incoming.id = "quot_" + Date.now();
  }

  // Default status to 'draft' if not provided
  if (!incoming.status) {
    incoming.status = "draft";
  }

  const existingIndex = db.quotations.findIndex(q => q.id === incoming.id);
  if (existingIndex > -1) {
    db.quotations[existingIndex] = incoming;
  } else {
    db.quotations.push(incoming);
  }

  writeDb(db);
  res.json({ message: "Quotation saved successfully.", quotation: incoming });
});

// Update Quotation Status
app.patch("/api/quotations/:id/status", (req, res) => {
  const db = readDb();
  if (!db.quotations) db.quotations = [];
  const id = req.params.id;
  const { status } = req.body;

  const validStatuses: QuotationStatus[] = ['draft', 'sent', 'accepted', 'converted', 'rejected', 'expired'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid quotation status." });
  }

  const quotation = db.quotations.find(q => q.id === id);
  if (!quotation) {
    return res.status(404).json({ error: "Quotation not found." });
  }

  quotation.status = status;
  writeDb(db);
  res.json({ message: `Quotation status updated to ${status}.`, quotation });
});

// Delete Quotation
app.delete("/api/quotations/:id", (req, res) => {
  const db = readDb();
  if (!db.quotations) db.quotations = [];
  const id = req.params.id;

  const quotationIndex = db.quotations.findIndex(q => q.id === id);
  if (quotationIndex === -1) {
    return res.status(404).json({ error: "Quotation not found." });
  }

  const quotation = db.quotations[quotationIndex];
  if (quotation.status === "converted") {
    return res.status(400).json({ 
      error: "Cannot delete a converted quotation while its Sales Invoice is active. Please delete the Sales Invoice first." 
    });
  }

  db.quotations.splice(quotationIndex, 1);
  writeDb(db);
  res.json({ message: "Quotation deleted successfully." });
});


// Add or Update Misc Transaction (Expenses & Incomes)
app.post("/api/transactions", (req, res) => {
  const db = readDb();
  const incoming = req.body;
  
  if (!incoming.date || !incoming.type || incoming.amount === undefined) {
    return res.status(400).json({ error: "Date, type (expense/income), and amount are required." });
  }

  if (!db.transactions) {
    db.transactions = [];
  }

  const existingIndex = db.transactions.findIndex(t => t.id === incoming.id);
  if (existingIndex > -1) {
    db.transactions[existingIndex] = incoming;
  } else {
    incoming.id = incoming.id || "tx_" + Date.now();
    db.transactions.push(incoming);
  }

  writeDb(db);
  res.json({ message: "Transaction recorded successfully.", transaction: incoming });
});

// Delete Misc Transaction
app.delete("/api/transactions/:id", (req, res) => {
  const db = readDb();
  const id = req.params.id;
  
  if (!db.transactions) {
    db.transactions = [];
  }
  
  db.transactions = db.transactions.filter(t => t.id !== id);
  writeDb(db);
  res.json({ message: "Transaction deleted successfully." });
});

// AI Invoice Processing & Quota Management Endpoints
interface AiQuotaState {
  available: boolean;
  quotaExceeded: boolean;
  resetAt: string | null;
  lastChecked: string;
}

let aiQuotaState: AiQuotaState = {
  available: true,
  quotaExceeded: false,
  resetAt: null,
  lastChecked: new Date().toISOString()
};

function checkAndResetQuotaIfNeeded() {
  if (aiQuotaState.quotaExceeded && aiQuotaState.resetAt) {
    if (new Date() >= new Date(aiQuotaState.resetAt)) {
      aiQuotaState.available = true;
      aiQuotaState.quotaExceeded = false;
      aiQuotaState.resetAt = null;
      console.log("[AI Invoice] Daily quota window reset. AI Scan re-enabled.");
    }
  }
}

app.get(["/api/ai/quota-status", "/api/scanner/status"], (req, res) => {
  checkAndResetQuotaIfNeeded();
  res.json({
    available: aiQuotaState.available,
    quotaExceeded: aiQuotaState.quotaExceeded,
    resetAt: aiQuotaState.resetAt,
    hasApiKey: !!GEMINI_API_KEY
  });
});

app.post(["/api/ai/parse-invoice", "/api/scanner/parse-bill"], async (req, res) => {
  checkAndResetQuotaIfNeeded();

  if (aiQuotaState.quotaExceeded) {
    return res.status(429).json({
      error: "आजची स्कॅनिंग मर्यादा पूर्ण झाली आहे. मर्यादा उद्या रिसेट होईल.",
      quotaExceeded: true,
      resetAt: aiQuotaState.resetAt
    });
  }

  const { fileBase64, mimeType, fileName } = req.body || {};

  if (!fileBase64 || !mimeType) {
    return res.status(400).json({ error: "File data (base64) and MIME type are required." });
  }

  const allowedMimes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowedMimes.includes(mimeType)) {
    return res.status(400).json({ error: "Unsupported file format. Please upload JPG, PNG, WEBP or PDF." });
  }

  if (!GEMINI_API_KEY) {
    return res.status(503).json({ error: "Scanner service is not configured on the server." });
  }

  try {
    console.log(`[Invoice Scanner] Extracting bill data from ${fileName || 'uploaded document'} (${mimeType})...`);

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: fileBase64
      }
    };

    const textPart = {
      text: `You are an expert invoice parser for Indian GST accounting and billing.
Extract all relevant details from this purchase invoice image or PDF.
Instructions:
1. Identify the Supplier/Vendor Name, GSTIN (15-digit alphanumeric), Address, and Phone if available.
2. Identify the Invoice/Bill Number and Invoice Date (format as YYYY-MM-DD; if format is DD/MM/YYYY or DD-MM-YYYY convert to YYYY-MM-DD).
3. Extract each line item: product name, HSN code, quantity, unit (PCS, KGS, LTR, BOX, PKT, etc.), unit purchase price (rate before GST), GST percentage rate (0, 5, 12, 18, or 28), taxable amount, and line total.
4. Calculate subtotal (sum of taxable amounts), total tax amount, and grand total.
5. If some field is not explicitly present, make a sensible inference (e.g. unit 'PCS', gstRate based on standard Indian GST slabs, default quantity 1).
Ensure output strictly conforms to the JSON schema.`
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            supplierName: { type: Type.STRING, description: "Name of the supplier / vendor" },
            supplierGstin: { type: Type.STRING, description: "Supplier 15-digit GSTIN" },
            supplierAddress: { type: Type.STRING, description: "Supplier address" },
            supplierPhone: { type: Type.STRING, description: "Supplier contact number" },
            invoiceNumber: { type: Type.STRING, description: "Bill or Invoice Number" },
            invoiceDate: { type: Type.STRING, description: "Date of invoice in YYYY-MM-DD format" },
            items: {
              type: Type.ARRAY,
              description: "Extracted line items from the purchase invoice",
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Item description or product name" },
                  hsn: { type: Type.STRING, description: "HSN or SAC code" },
                  quantity: { type: Type.NUMBER, description: "Quantity purchased" },
                  unit: { type: Type.STRING, description: "Unit of measurement (e.g. PCS, KGS, LTR)" },
                  rate: { type: Type.NUMBER, description: "Unit purchase price before GST" },
                  discount: { type: Type.NUMBER, description: "Item level discount" },
                  gstRate: { type: Type.NUMBER, description: "GST rate percentage e.g. 0, 5, 12, 18, 28" },
                  taxableAmount: { type: Type.NUMBER, description: "Taxable value before tax" },
                  totalAmount: { type: Type.NUMBER, description: "Total item line amount including taxes" }
                },
                required: ["name", "quantity", "rate", "gstRate", "totalAmount"]
              }
            },
            subtotal: { type: Type.NUMBER, description: "Total taxable amount of all items" },
            taxAmount: { type: Type.NUMBER, description: "Total GST amount" },
            grandTotal: { type: Type.NUMBER, description: "Grand total payable invoice amount" }
          },
          required: ["supplierName", "invoiceNumber", "items", "grandTotal"]
        }
      }
    });

    const rawText = response.text?.trim() || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch (parseErr) {
      console.error("[Invoice Scanner] JSON parse error:", rawText);
      return res.status(500).json({ error: "Scanner output could not be parsed as valid JSON." });
    }

    // Sanitize and ensure fallback dates/values
    if (!parsed.invoiceDate || parsed.invoiceDate.length < 8) {
      parsed.invoiceDate = new Date().toISOString().split("T")[0];
    }
    if (!parsed.invoiceNumber) {
      parsed.invoiceNumber = "PUR-" + Date.now().toString().slice(-6);
    }
    if (!Array.isArray(parsed.items)) {
      parsed.items = [];
    }

    console.log(`[Invoice Scanner] Successfully extracted invoice #${parsed.invoiceNumber} from ${parsed.supplierName} with ${parsed.items.length} items`);

    res.json({
      success: true,
      invoice: parsed
    });
  } catch (err: any) {
    console.error("[Invoice Scanner] Extraction error:", err);
    const errStr = (err.message || "").toLowerCase();

    // Check for rate limit or quota exhaustion (429 / RESOURCE_EXHAUSTED)
    if (errStr.includes("429") || errStr.includes("quota") || errStr.includes("resource_exhausted") || err.status === 429) {
      const tomorrowMidnight = new Date();
      tomorrowMidnight.setUTCHours(24, 0, 0, 0); // Next UTC 00:00
      aiQuotaState.available = false;
      aiQuotaState.quotaExceeded = true;
      aiQuotaState.resetAt = tomorrowMidnight.toISOString();
      console.warn(`[Invoice Scanner] Free tier daily limit reached. Auto-disabling until ${aiQuotaState.resetAt}`);
      return res.status(429).json({
        error: "आजची स्कॅनिंग मर्यादा पूर्ण झाली आहे. मर्यादा उद्या रिसेट होईल.",
        quotaExceeded: true,
        resetAt: aiQuotaState.resetAt
      });
    }

    res.status(500).json({
      error: "बिलाचे वाचन करताना अडचण आली: " + (err.message || "Unknown error")
    });
  }
});

// System Health & Version API
app.get("/api/version", (req, res) => {
  let appVer = "1.0.15";
  try {
    const pkgPath = path.join(process.cwd(), "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      if (pkg.version) appVer = pkg.version;
    }
  } catch {}

  res.json({
    status: "ok",
    app: "BillingOnHand",
    version: appVer,
    timestamp: new Date().toISOString()
  });
});

app.get("/api/health", (req, res) => {
  let appVer = "1.0.15";
  try {
    const pkgPath = path.join(process.cwd(), "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      if (pkg.version) appVer = pkg.version;
    }
  } catch {}

  res.json({
    status: "ok",
    app: "BillingOnHand",
    version: appVer,
    timestamp: new Date().toISOString()
  });
});

// Server Initialization & Export
export function startServer(portToUse?: number): Promise<{ app: typeof app; port: number }> {
  const listenPort = portToUse ?? PORT;
  return new Promise(async (resolve, reject) => {
    try {
      if (process.env.NODE_ENV !== "production") {
        // Mount Vite in dev mode with dynamic import
        const { createServer: createViteServer } = await import("vite");
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: "spa"
        });
        app.use(vite.middlewares);
        console.log("Vite middleware mounted on Express");
      } else {
        // Serve static files in production
        const distCandidates = [
          __dirname,
          path.join(__dirname, "dist"),
          path.join(process.cwd(), "dist")
        ];
        const distPath = distCandidates.find(p => fs.existsSync(path.join(p, "index.html"))) || path.join(process.cwd(), "dist");
        app.use(express.static(distPath));
        app.get("*", (req, res) => {
          res.sendFile(path.join(distPath, "index.html"));
        });
      }

      // In Electron desktop environment, bind loopback (127.0.0.1) for zero firewall prompts
      const host = process.env.ELECTRON_ENV ? "127.0.0.1" : "0.0.0.0";
      const server = app.listen(listenPort, host, () => {
        console.log(`Billing On Hand Server operating at: http://${host}:${listenPort}`);
        resolve({ app, port: listenPort });
      });

      server.on("error", (err) => {
        console.error("Server listen failed:", err);
        reject(err);
      });
    } catch (err) {
      console.error("Failed to initialize server:", err);
      reject(err);
    }
  });
}

// Auto-start if not running inside Electron's controlled startup
if (!process.env.ELECTRON_ENV) {
  startServer().then(() => {
    // Immediate initial snapshot on server start
    setTimeout(() => {
      try {
        const initialDb = readDb();
        const res = performAutoBackup(initialDb);
        if (res) {
          console.log(`[Startup Backup] Generated initial snapshot: ${res.fileName}`);
        }
      } catch (err) {
        console.warn("Initial startup backup:", err);
      }
    }, 1500);

    // Periodic automated snapshot every 15 minutes (0% manual intervention)
    setInterval(() => {
      try {
        const currentDb = readDb();
        performAutoBackup(currentDb);
      } catch (err) {
        console.warn("Periodic automated backup error:", err);
      }
    }, 15 * 60 * 1000);
  }).catch((err) => {
    console.error("Auto start server failed:", err);
  });
}

