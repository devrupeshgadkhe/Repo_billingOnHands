/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import nodemailer from "nodemailer";
import { DatabaseState, BusinessProfile } from "../types.js";

export interface EodSummary {
  date: string;
  generatedAt: string;
  sales: {
    invoiceCount: number;
    grossSubtotal: number;
    taxAmount: number;
    cgst: number;
    sgst: number;
    igst: number;
    discountsTotal: number;
    netSalesTotal: number;
    cashCollected: number;
    bankCollected: number;
    creditPending: number;
  };
  returns: {
    returnCount: number;
    returnTotal: number;
  };
  purchases: {
    purchaseCount: number;
    purchaseTotal: number;
  };
  expenses: {
    expenseCount: number;
    expenseTotal: number;
  };
  paymentsCollected: {
    incomeCount: number;
    incomeTotal: number;
  };
  profitEstimate: {
    estimatedCogs: number;
    grossProfit: number;
    netEstimatedProfit: number;
    marginPercentage: number;
  };
  topSellingItems: Array<{
    name: string;
    quantity: number;
    amount: number;
    unit?: string;
  }>;
  lowStockItems: Array<{
    name: string;
    stock: number;
    minAlert: number;
    unit?: string;
  }>;
  nearExpiryItems: Array<{
    name: string;
    expiryDate: string;
    stock: number;
    batchNumber?: string;
  }>;
  loyalty: {
    pointsEarnedToday: number;
    pointsRedeemedToday: number;
    discountFromPoints: number;
  };
  outstandingKhata: Array<{
    name: string;
    balance: number;
    phone?: string;
  }>;
}

/**
 * Computes the End-of-Day (EOD) business metrics for a given date.
 */
export function generateEodSummary(db: DatabaseState, targetDate?: string): EodSummary {
  const date = targetDate || new Date().toISOString().split("T")[0];
  const invoices = db.invoices || [];
  const items = db.items || [];
  const parties = db.parties || [];
  const transactions = (db as any).transactions || [];

  // Filter invoices for today
  const todaySales = invoices.filter(inv => inv.type === "sale" && inv.date === date);
  const todayReturns = invoices.filter(inv => inv.type === "sale_return" && inv.date === date);
  const todayPurchases = invoices.filter(inv => inv.type === "purchase" && inv.date === date);

  // Sales aggregates
  let grossSubtotal = 0;
  let taxAmount = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  let discountsTotal = 0;
  let netSalesTotal = 0;
  let cashCollected = 0;
  let bankCollected = 0;
  let creditPending = 0;
  let pointsEarnedToday = 0;
  let pointsRedeemedToday = 0;
  let discountFromPoints = 0;

  const itemSalesMap = new Map<string, { name: string; quantity: number; amount: number; unit?: string }>();
  let totalCogs = 0;

  for (const inv of todaySales) {
    grossSubtotal += inv.subtotal || 0;
    taxAmount += inv.taxAmount || 0;
    cgst += inv.cgstTotal || 0;
    sgst += inv.sgstTotal || 0;
    igst += inv.igstTotal || 0;
    netSalesTotal += inv.totalAmount || 0;

    if (inv.paymentType === "cash") {
      cashCollected += inv.paidAmount || inv.totalAmount || 0;
    } else if (inv.paymentType === "bank") {
      bankCollected += inv.paidAmount || inv.totalAmount || 0;
    }
    creditPending += inv.remainingAmount || 0;

    pointsEarnedToday += inv.pointsEarned || 0;
    pointsRedeemedToday += inv.pointsRedeemed || 0;
    discountFromPoints += inv.pointsDiscount || 0;

    // Line items processing
    if (Array.isArray(inv.items)) {
      for (const line of inv.items) {
        discountsTotal += line.discount || 0;
        const current = itemSalesMap.get(line.itemId) || {
          name: line.itemName || "Item",
          quantity: 0,
          amount: 0,
          unit: line.unit || "PCS"
        };
        current.quantity += line.quantity || 0;
        current.amount += line.totalAmount || 0;
        itemSalesMap.set(line.itemId, current);

        // Find cost for COGS estimation
        const dbItem = items.find(i => i.id === line.itemId);
        const costPrice = dbItem ? dbItem.purchasePrice : (line.price * 0.7);
        totalCogs += costPrice * (line.quantity || 0);
      }
    }
  }

  discountsTotal += discountFromPoints;

  // Returns aggregates
  let returnCount = todayReturns.length;
  let returnTotal = todayReturns.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

  // Purchases aggregates
  let purchaseCount = todayPurchases.length;
  let purchaseTotal = todayPurchases.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

  // Expenses & Incomes
  const todayExpenses = transactions.filter((t: any) => t.type === "expense" && t.date === date);
  const expenseTotal = todayExpenses.reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);

  const todayIncome = transactions.filter((t: any) => t.type === "income" && t.date === date);
  const incomeTotal = todayIncome.reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);

  // Profit calculations
  const grossProfit = Math.max(0, netSalesTotal - totalCogs);
  const netEstimatedProfit = grossProfit - expenseTotal;
  const marginPercentage = netSalesTotal > 0 ? (grossProfit / netSalesTotal) * 100 : 0;

  // Top Selling Items (top 5 by quantity)
  const topSellingItems = Array.from(itemSalesMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Low Stock Items
  const lowStockItems = items
    .filter(i => (i.stockQuantity || 0) <= (i.minStockAlert || 5))
    .slice(0, 8)
    .map(i => ({
      name: i.name,
      stock: i.stockQuantity || 0,
      minAlert: i.minStockAlert || 5,
      unit: i.unit || "PCS"
    }));

  // Near Expiry Items (within 45 days)
  const now = new Date();
  const fortyFiveDaysLater = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
  const fortyFiveDaysStr = fortyFiveDaysLater.toISOString().split("T")[0];

  const nearExpiryItems = items
    .filter(i => i.expiryDate && i.expiryDate <= fortyFiveDaysStr && (i.stockQuantity || 0) > 0)
    .slice(0, 6)
    .map(i => ({
      name: i.name,
      expiryDate: i.expiryDate!,
      stock: i.stockQuantity || 0,
      batchNumber: i.batchNumber
    }));

  // Top Customer Khata Balance
  const outstandingKhata = parties
    .filter(p => p.type === "customer" && (p.currentBalance || 0) > 0)
    .sort((a, b) => (b.currentBalance || 0) - (a.currentBalance || 0))
    .slice(0, 5)
    .map(p => ({
      name: p.name,
      balance: p.currentBalance || 0,
      phone: p.phone
    }));

  return {
    date,
    generatedAt: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
    sales: {
      invoiceCount: todaySales.length,
      grossSubtotal,
      taxAmount,
      cgst,
      sgst,
      igst,
      discountsTotal,
      netSalesTotal,
      cashCollected,
      bankCollected,
      creditPending
    },
    returns: {
      returnCount,
      returnTotal
    },
    purchases: {
      purchaseCount,
      purchaseTotal
    },
    expenses: {
      expenseCount: todayExpenses.length,
      expenseTotal
    },
    paymentsCollected: {
      incomeCount: todayIncome.length,
      incomeTotal
    },
    profitEstimate: {
      estimatedCogs: totalCogs,
      grossProfit,
      netEstimatedProfit,
      marginPercentage
    },
    topSellingItems,
    lowStockItems,
    nearExpiryItems,
    loyalty: {
      pointsEarnedToday,
      pointsRedeemedToday,
      discountFromPoints
    },
    outstandingKhata
  };
}

/**
 * Builds a clean, responsive, high-converting HTML email report for the business owner.
 */
export function buildEodHtmlEmail(business: BusinessProfile, summary: EodSummary): string {
  const storeName = business.name || "Billing On Hand Store";
  const gstin = business.gstin || "Unregistered";
  const phone = business.phone || "";
  const address = business.address || "";
  const emailCfg = business.scheduledEmailConfig?.reportSections || {
    salesSummary: true,
    paymentModes: true,
    profitAndMargins: true,
    taxSummary: true,
    topSellingItems: true,
    lowStockAlerts: true,
    nearExpiryAlerts: true,
    customerKhata: true,
    loyaltySummary: true
  };

  const formatRupees = (val: number) => `₹${(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Business Summary - ${storeName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9; color: #1e293b; }
    .container { max-width: 650px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06); }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0 0 4px 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 2px 0; font-size: 12px; color: #94a3b8; }
    .badge-date { display: inline-block; background: #3b82f6; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; margin-top: 8px; text-transform: uppercase; }
    
    .content { padding: 20px 24px; }
    .kpi-grid { display: table; width: 100%; margin-bottom: 20px; }
    .kpi-cell { display: table-cell; width: 50%; padding: 6px; }
    .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; text-align: center; }
    .kpi-card.hero { background: #ecfdf5; border-color: #a7f3d0; }
    .kpi-card.cash { background: #eff6ff; border-color: #bfdbfe; }
    .kpi-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
    .kpi-val { font-size: 20px; font-weight: 800; font-family: monospace; color: #0f172a; }
    .kpi-sub { font-size: 11px; color: #475569; margin-top: 2px; }

    .section-title { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #334155; margin: 24px 0 10px 0; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; display: flex; align-items: center; }
    .table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
    .table th { background: #f1f5f9; color: #475569; text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; font-weight: 700; border-bottom: 1px solid #cbd5e1; }
    .table td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
    .table tr:last-child td { border-bottom: none; }
    .text-right { text-align: right; }
    .font-mono { font-family: monospace; }
    .font-bold { font-weight: 700; }
    
    .pill { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; }
    .pill-red { background: #fee2e2; color: #991b1b; }
    .pill-amber { background: #fef3c7; color: #92400e; }
    .pill-green { background: #dcfce7; color: #166534; }
    .pill-blue { background: #dbeafe; color: #1e40af; }

    .footer { background: #f8fafc; padding: 18px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; }
    .footer strong { color: #0f172a; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>${storeName}</h1>
      <p>GSTIN: <strong>${gstin}</strong> ${phone ? `| 📞 ${phone}` : ""} ${address ? `| 📍 ${address}` : ""}</p>
      <div class="badge-date">Daily Business Report • ${summary.date} (${summary.generatedAt})</div>
    </div>

    <div class="content">
      <!-- KPI Highlights -->
      <div class="kpi-grid">
        <div class="kpi-cell">
          <div class="kpi-card hero">
            <div class="kpi-label">Total Net Sales</div>
            <div class="kpi-val" style="color: #059669;">${formatRupees(summary.sales.netSalesTotal)}</div>
            <div class="kpi-sub">${summary.sales.invoiceCount} Bills Generated</div>
          </div>
        </div>
        <div class="kpi-cell">
          <div class="kpi-card cash">
            <div class="kpi-label">Cash In Drawer / Counter</div>
            <div class="kpi-val" style="color: #2563eb;">${formatRupees(summary.sales.cashCollected)}</div>
            <div class="kpi-sub">Ready for Safe Deposit</div>
          </div>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-cell">
          <div class="kpi-card">
            <div class="kpi-label">Bank / UPI Received</div>
            <div class="kpi-val" style="color: #7c3aed;">${formatRupees(summary.sales.bankCollected)}</div>
            <div class="kpi-sub">Direct Bank Credits</div>
          </div>
        </div>
        <div class="kpi-cell">
          <div class="kpi-card" style="background: ${summary.profitEstimate.netEstimatedProfit >= 0 ? '#f0fdf4' : '#fef2f2'}; border-color: ${summary.profitEstimate.netEstimatedProfit >= 0 ? '#bbf7d0' : '#fecaca'};">
            <div class="kpi-label">Estimated Day Profit</div>
            <div class="kpi-val" style="color: ${summary.profitEstimate.netEstimatedProfit >= 0 ? '#15803d' : '#b91c1c'};">${formatRupees(summary.profitEstimate.netEstimatedProfit)}</div>
            <div class="kpi-sub">Margin: ~${summary.profitEstimate.marginPercentage.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      <!-- Payment Collections & Sales Summary -->
      ${emailCfg.paymentModes ? `
      <div class="section-title">📊 Revenue & Payment Collections</div>
      <table class="table">
        <tr>
          <td>Cash Collection (रोख विक्री)</td>
          <td class="text-right font-mono font-bold" style="color: #2563eb;">${formatRupees(summary.sales.cashCollected)}</td>
        </tr>
        <tr>
          <td>UPI & Bank Online (बँक / QR जमा)</td>
          <td class="text-right font-mono font-bold" style="color: #7c3aed;">${formatRupees(summary.sales.bankCollected)}</td>
        </tr>
        <tr>
          <td>Unpaid Khata / Credit Given (उधारी बिल)</td>
          <td class="text-right font-mono font-bold" style="color: #d97706;">${formatRupees(summary.sales.creditPending)}</td>
        </tr>
        <tr>
          <td>Customer Returns (परत आलेला माल - ${summary.returns.returnCount})</td>
          <td class="text-right font-mono font-bold" style="color: #e11d48;">- ${formatRupees(summary.returns.returnTotal)}</td>
        </tr>
        ${summary.expenses.expenseTotal > 0 ? `
        <tr>
          <td>Today's Shop Expenses (दुकान खर्च - ${summary.expenses.expenseCount})</td>
          <td class="text-right font-mono font-bold" style="color: #dc2626;">- ${formatRupees(summary.expenses.expenseTotal)}</td>
        </tr>` : ""}
        <tr style="background: #f8fafc; font-weight: bold;">
          <td>Total Net Revenue (एकूण निव्वळ विक्री)</td>
          <td class="text-right font-mono" style="font-size: 14px; color: #0f172a;">${formatRupees(summary.sales.netSalesTotal)}</td>
        </tr>
      </table>
      ` : ""}

      <!-- GST Tax Summary -->
      ${emailCfg.taxSummary && summary.sales.taxAmount > 0 ? `
      <div class="section-title">🏛️ GST Tax Collections Breakdown</div>
      <table class="table">
        <tr>
          <td>CGST (Central Tax)</td>
          <td class="text-right font-mono">${formatRupees(summary.sales.cgst)}</td>
        </tr>
        <tr>
          <td>SGST (State Tax)</td>
          <td class="text-right font-mono">${formatRupees(summary.sales.sgst)}</td>
        </tr>
        ${summary.sales.igst > 0 ? `
        <tr>
          <td>IGST (Integrated Tax)</td>
          <td class="text-right font-mono">${formatRupees(summary.sales.igst)}</td>
        </tr>` : ""}
        <tr style="background: #f8fafc; font-weight: bold;">
          <td>Total Tax Collected (एकूण गोळा झालेला GST)</td>
          <td class="text-right font-mono font-bold">${formatRupees(summary.sales.taxAmount)}</td>
        </tr>
      </table>
      ` : ""}

      <!-- Top Selling Products -->
      ${emailCfg.topSellingItems && summary.topSellingItems.length > 0 ? `
      <div class="section-title">🔥 Top Selling Products Today</div>
      <table class="table">
        <thead>
          <tr>
            <th>Product Name</th>
            <th class="text-right">Qty Sold</th>
            <th class="text-right">Total ₹</th>
          </tr>
        </thead>
        <tbody>
          ${summary.topSellingItems.map(item => `
          <tr>
            <td><strong>${item.name}</strong></td>
            <td class="text-right font-mono font-bold">${item.quantity} ${item.unit || "PCS"}</td>
            <td class="text-right font-mono">${formatRupees(item.amount)}</td>
          </tr>
          `).join("")}
        </tbody>
      </table>
      ` : ""}

      <!-- Low Stock Alerts -->
      ${emailCfg.lowStockAlerts && summary.lowStockItems.length > 0 ? `
      <div class="section-title" style="color: #dc2626;">⚠️ Low Stock Restock Alerts (ऑर्डर आवश्यक)</div>
      <table class="table">
        <thead>
          <tr>
            <th>Item Name</th>
            <th class="text-right">Current Stock</th>
            <th class="text-right">Min Threshold</th>
          </tr>
        </thead>
        <tbody>
          ${summary.lowStockItems.map(item => `
          <tr>
            <td>${item.name}</td>
            <td class="text-right font-mono"><span class="pill pill-red">${item.stock} ${item.unit || "PCS"}</span></td>
            <td class="text-right font-mono text-slate-500">${item.minAlert} ${item.unit || "PCS"}</td>
          </tr>
          `).join("")}
        </tbody>
      </table>
      ` : ""}

      <!-- Near Expiry Items -->
      ${emailCfg.nearExpiryAlerts && summary.nearExpiryItems.length > 0 ? `
      <div class="section-title" style="color: #d97706;">⏳ Near Expiry Batch Alerts (४५ दिवसांत संपणारा माल)</div>
      <table class="table">
        <thead>
          <tr>
            <th>Product Name</th>
            <th>Batch No.</th>
            <th>Expiry Date</th>
            <th class="text-right">Stock</th>
          </tr>
        </thead>
        <tbody>
          ${summary.nearExpiryItems.map(item => `
          <tr>
            <td>${item.name}</td>
            <td class="font-mono text-slate-600">${item.batchNumber || "Default"}</td>
            <td class="font-mono font-bold" style="color: #b45309;">${item.expiryDate}</td>
            <td class="text-right font-mono"><span class="pill pill-amber">${item.stock}</span></td>
          </tr>
          `).join("")}
        </tbody>
      </table>
      ` : ""}

      <!-- Loyalty & Rewards Summary -->
      ${emailCfg.loyaltySummary && (summary.loyalty.pointsEarnedToday > 0 || summary.loyalty.pointsRedeemedToday > 0) ? `
      <div class="section-title">⭐ Customer Loyalty Points Activity</div>
      <table class="table">
        <tr>
          <td>Points Awarded to Customers Today</td>
          <td class="text-right font-mono font-bold" style="color: #059669;">+${summary.loyalty.pointsEarnedToday} Pts</td>
        </tr>
        <tr>
          <td>Points Redeemed Today</td>
          <td class="text-right font-mono font-bold" style="color: #b45309;">-${summary.loyalty.pointsRedeemedToday} Pts</td>
        </tr>
        <tr>
          <td>Instant Discount Given for Points</td>
          <td class="text-right font-mono font-bold" style="color: #b45309;">${formatRupees(summary.loyalty.discountFromPoints)}</td>
        </tr>
      </table>
      ` : ""}

      <!-- Outstanding Khata Debtors -->
      ${emailCfg.customerKhata && summary.outstandingKhata.length > 0 ? `
      <div class="section-title">📒 Top Outstanding Customer Khata</div>
      <table class="table">
        <thead>
          <tr>
            <th>Customer Name</th>
            <th>Mobile</th>
            <th class="text-right">Outstanding Due</th>
          </tr>
        </thead>
        <tbody>
          ${summary.outstandingKhata.map(c => `
          <tr>
            <td><strong>${c.name}</strong></td>
            <td class="font-mono text-slate-500">${c.phone || "—"}</td>
            <td class="text-right font-mono font-bold" style="color: #dc2626;">${formatRupees(c.balance)}</td>
          </tr>
          `).join("")}
        </tbody>
      </table>
      ` : ""}
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>This automated end-of-day summary was generated by <strong>Billing On Hand</strong>.</p>
      <p style="margin-top: 4px; font-size: 10px; color: #94a3b8;">100% Offline-Ready GST ERP • Author: Rupesh Gadkhe</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Sends or simulates the EOD email report.
 */
export async function sendEodEmailReport(
  db: DatabaseState,
  options: {
    targetDate?: string;
    overrideRecipient?: string;
    isTest?: boolean;
  } = {}
): Promise<{
  success: boolean;
  message: string;
  summary: EodSummary;
  previewHtml: string;
  recipient: string;
  mode: "smtp" | "simulation";
}> {
  const summary = generateEodSummary(db, options.targetDate);
  const previewHtml = buildEodHtmlEmail(db.business, summary);
  const emailCfg = db.business.scheduledEmailConfig;

  const recipient = (
    options.overrideRecipient ||
    emailCfg?.recipientEmail ||
    db.business.email ||
    "rupeshgadkhe@gmail.com"
  ).trim();

  const senderName = emailCfg?.senderName || `${db.business.name || "Billing On Hand"} Reports`;
  const subject = `[Daily EOD Summary] ${db.business.name || "Store"} - ${summary.date} (Net Sales: ₹${summary.sales.netSalesTotal.toFixed(2)})`;

  // Check if SMTP is configured
  const smtp = emailCfg?.smtpConfig;
  const hasSmtpCredentials = smtp && smtp.user && smtp.pass;

  if (hasSmtpCredentials) {
    try {
      let transporter;
      if (smtp.service === "gmail") {
        transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: smtp.user,
            pass: smtp.pass
          }
        });
      } else {
        transporter = nodemailer.createTransport({
          host: smtp.host || "smtp.gmail.com",
          port: smtp.port || 587,
          secure: smtp.secure !== undefined ? smtp.secure : false,
          auth: {
            user: smtp.user,
            pass: smtp.pass
          }
        });
      }

      await transporter.sendMail({
        from: `"${senderName}" <${smtp.user}>`,
        to: recipient,
        cc: emailCfg?.ccEmails ? emailCfg.ccEmails.split(",").map(e => e.trim()).filter(Boolean) : undefined,
        subject,
        html: previewHtml
      });

      // Update state
      if (emailCfg) {
        emailCfg.lastSentDate = summary.date;
        emailCfg.lastSentAt = new Date().toISOString();
        emailCfg.lastSendStatus = "success";
        emailCfg.lastSendError = undefined;
      }

      return {
        success: true,
        message: `EOD Email report successfully sent via SMTP to ${recipient}!`,
        summary,
        previewHtml,
        recipient,
        mode: "smtp"
      };
    } catch (err: any) {
      console.error("[EOD Email Error]:", err);
      if (emailCfg) {
        emailCfg.lastSendStatus = "failed";
        emailCfg.lastSendError = err.message || "Failed to send email via SMTP";
      }
      return {
        success: false,
        message: `SMTP Email error: ${err.message}. Please check your SMTP host, port or Gmail App Password in Settings.`,
        summary,
        previewHtml,
        recipient,
        mode: "smtp"
      };
    }
  }

  // Graceful simulation / test mode if SMTP credentials are not yet entered
  console.log(`[EOD Email Simulation] Report generated for ${summary.date} addressed to ${recipient}`);
  if (emailCfg) {
    emailCfg.lastSentDate = summary.date;
    emailCfg.lastSentAt = new Date().toISOString();
    emailCfg.lastSendStatus = "success";
    emailCfg.lastSendError = undefined;
  }

  return {
    success: true,
    message: `EOD report generated and verified successfully for ${recipient}! (Add SMTP/Gmail credentials in Settings to send live internet emails).`,
    summary,
    previewHtml,
    recipient,
    mode: "simulation"
  };
}

/**
 * Background scheduled job checker to be invoked periodically (e.g. every minute)
 */
export async function checkScheduledEodEmailJob(
  readDbFn: () => DatabaseState,
  writeDbFn: (db: DatabaseState) => void
): Promise<void> {
  try {
    const db = readDbFn();
    const emailCfg = db.business?.scheduledEmailConfig;
    if (!emailCfg || !emailCfg.enabled) return;

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    // Already sent for today?
    if (emailCfg.lastSentDate === todayStr && emailCfg.lastSendStatus === "success") {
      return;
    }

    const scheduledTime = emailCfg.scheduledTime || "21:00"; // HH:MM
    const currentHours = String(now.getHours()).padStart(2, "0");
    const currentMinutes = String(now.getMinutes()).padStart(2, "0");
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    // Check if it is time to trigger (current time matches or is within 5 minutes after scheduled time)
    if (currentTimeStr >= scheduledTime) {
      console.log(`[Scheduled EOD Job] Triggering automated daily report at ${currentTimeStr} for ${todayStr}...`);
      await sendEodEmailReport(db, { targetDate: todayStr });
      writeDbFn(db);
    }
  } catch (err) {
    console.warn("[Scheduled EOD Job Error]:", err);
  }
}
