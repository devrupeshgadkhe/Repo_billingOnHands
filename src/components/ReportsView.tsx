/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import { Invoice, BusinessProfile, Party, Item, MiscTransaction } from "../types.js";
import {
  FileSpreadsheet,
  FileCheck2,
  CalendarDays,
  Printer,
  Trash2,
  ListTodo,
  TrendingUp,
  Receipt,
  Download,
  AlertCircle,
  Edit2,
  RotateCcw,
  Search,
  Filter,
  Info,
  Package,
  Layers,
  Coins,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownLeft,
  X
} from "lucide-react";

interface ReportsViewProps {
  invoices: Invoice[];
  parties: Party[];
  items: Item[];
  transactions: MiscTransaction[];
  business: BusinessProfile;
  onOpenInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (id: string) => Promise<void>;
  onEditInvoice?: (invoice: Invoice) => void;
  onReturnInvoice?: (invoice: Invoice) => void;
  salesPermissions?: any;
  purchasesPermissions?: any;
}

export default function ReportsView({
  invoices,
  parties,
  items,
  transactions,
  business,
  onOpenInvoice,
  onDeleteInvoice,
  onEditInvoice,
  onReturnInvoice,
  salesPermissions,
  purchasesPermissions
}: ReportsViewProps) {
  
  const sPerms = salesPermissions || { view: true, create: true, update: true, delete: true };
  const pPerms = purchasesPermissions || { view: true, create: true, update: true, delete: true };

  // Tab within Reports view
  const [reportSubTab, setReportSubTab] = useState<'daybook' | 'sales' | 'purchases' | 'items' | 'incomes_expenses' | 'pl_account' | 'gstr1' | 'gstr2'>('daybook');

  // Shared / General Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [partyFilter, setPartyFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [gstRateFilter, setGstRateFilter] = useState("");
  const [stockLevelFilter, setStockLevelFilter] = useState("");
  const [itemSortFilter, setItemSortFilter] = useState("bestselling");
  const [miscCategoryFilter, setMiscCategoryFilter] = useState("");
  const [miscTypeFilter, setMiscTypeFilter] = useState("");

  const [expandedInvoiceIds, setExpandedInvoiceIds] = useState<Record<string, boolean>>({});

  const formatINR = (val: number) => {
    return "₹" + val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setPartyFilter("");
    setPaymentFilter("");
    setSearchQuery("");
    setGstRateFilter("");
    setStockLevelFilter("");
    setMiscCategoryFilter("");
    setMiscTypeFilter("");
  };

  const handleDeleteInvoice = async (id: string, invoiceNumber: string) => {
    if (confirm(`CRITICAL WARNING: Deleting ${invoiceNumber} will automatically reverse all ledger changes. It will RESTORE item inventory stock lines and SUBTRACT party outstanding debts immediately. Continue?`)) {
      await onDeleteInvoice(id);
    }
  };

  // --------------------------------------------------------
  // Sales Report Calculations & Filtering
  // --------------------------------------------------------
  const filteredSales = useMemo(() => {
    const rawSales = invoices.filter(inv => inv.type === "sale" || inv.type === "sale_return");
    return rawSales.filter(inv => {
      if (startDate && inv.date < startDate) return false;
      if (endDate && inv.date > endDate) return false;
      if (partyFilter && inv.partyId !== partyFilter) return false;
      if (paymentFilter && inv.paymentType !== paymentFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesNum = inv.invoiceNumber.toLowerCase().includes(query);
        const matchesParty = inv.partyName.toLowerCase().includes(query);
        if (!matchesNum && !matchesParty) return false;
      }
      if (gstRateFilter) {
        const rate = parseFloat(gstRateFilter);
        const hasRate = inv.items.some(i => i.gstRate === rate);
        if (!hasRate) return false;
      }
      return true;
    });
  }, [invoices, startDate, endDate, partyFilter, paymentFilter, searchQuery, gstRateFilter]);

  const salesReportStats = useMemo(() => {
    let grossValue = 0;
    let netTaxable = 0;
    let totalTax = 0;
    let totalDiscounts = 0;
    let totalCharges = 0;

    filteredSales.forEach(inv => {
      const isReturn = inv.type === "sale_return";
      const f = isReturn ? -1 : 1;

      grossValue += inv.totalAmount * f;
      netTaxable += inv.subtotal * f;
      totalTax += inv.taxAmount * f;
      totalCharges += (inv.extraCharges || []).reduce((s, c) => s + (c.amount || 0), 0) * f;
      totalDiscounts += inv.items.reduce((s, curr) => s + (curr.discount || 0), 0) * f;
    });

    return { grossValue, netTaxable, totalTax, totalDiscounts, totalCharges };
  }, [filteredSales]);

  // --------------------------------------------------------
  // Purchases Report Calculations & Filtering
  // --------------------------------------------------------
  const filteredPurchases = useMemo(() => {
    const rawPurchases = invoices.filter(inv => inv.type === "purchase" || inv.type === "purchase_return");
    return rawPurchases.filter(inv => {
      if (startDate && inv.date < startDate) return false;
      if (endDate && inv.date > endDate) return false;
      if (partyFilter && inv.partyId !== partyFilter) return false;
      if (paymentFilter && inv.paymentType !== paymentFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesNum = inv.invoiceNumber.toLowerCase().includes(query);
        const matchesParty = inv.partyName.toLowerCase().includes(query);
        if (!matchesNum && !matchesParty) return false;
      }
      if (gstRateFilter) {
        const rate = parseFloat(gstRateFilter);
        const hasRate = inv.items.some(i => i.gstRate === rate);
        if (!hasRate) return false;
      }
      return true;
    });
  }, [invoices, startDate, endDate, partyFilter, paymentFilter, searchQuery, gstRateFilter]);

  const purchaseReportStats = useMemo(() => {
    let grossValue = 0;
    let netTaxable = 0;
    let totalTax = 0;
    let totalDiscounts = 0;
    let totalCharges = 0;

    filteredPurchases.forEach(inv => {
      const isReturn = inv.type === "purchase_return";
      const f = isReturn ? -1 : 1;

      grossValue += inv.totalAmount * f;
      netTaxable += inv.subtotal * f;
      totalTax += inv.taxAmount * f;
      totalCharges += (inv.extraCharges || []).reduce((s, c) => s + (c.amount || 0), 0) * f;
      totalDiscounts += inv.items.reduce((s, curr) => s + (curr.discount || 0), 0) * f;
    });

    return { grossValue, netTaxable, totalTax, totalDiscounts, totalCharges };
  }, [filteredPurchases]);

  // --------------------------------------------------------
  // Items Report Analysis & Calculations
  // --------------------------------------------------------
  const itemsReportPerformance = useMemo(() => {
    const records = items.map(p => {
      let qtySold = 0;
      let revenueExclTax = 0;
      let qtyPurchased = 0;
      let costExclTax = 0;

      invoices.forEach(inv => {
        const isSale = inv.type === "sale";
        const isSaleReturn = inv.type === "sale_return";
        const isPurchase = inv.type === "purchase";
        const isPurchaseReturn = inv.type === "purchase_return";

        inv.items.forEach(line => {
          if (line.itemId === p.id) {
            if (isSale) {
              qtySold += line.quantity;
              revenueExclTax += line.amountBeforeTax;
            } else if (isSaleReturn) {
              qtySold -= line.quantity;
              revenueExclTax -= line.amountBeforeTax;
            } else if (isPurchase) {
              qtyPurchased += line.quantity;
              costExclTax += line.amountBeforeTax;
            } else if (isPurchaseReturn) {
              qtyPurchased -= line.quantity;
              costExclTax -= line.amountBeforeTax;
            }
          }
        });
      });

      const stockStatus = p.stockQuantity <= 0 ? "outofstock" : (p.stockQuantity <= p.minStockAlert ? "lowstock" : "instock");
      return {
        item: p,
        qtySold,
        revenueExclTax,
        qtyPurchased,
        costExclTax,
        stockStatus
      };
    });

    let filtered = records.filter(row => {
      if (stockLevelFilter && row.stockStatus !== stockLevelFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = row.item.name.toLowerCase().includes(query);
        const matchesHsn = (row.item.hsn || "").toLowerCase().includes(query);
        if (!matchesName && !matchesHsn) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      if (itemSortFilter === "bestselling") return b.qtySold - a.qtySold;
      if (itemSortFilter === "revenue") return b.revenueExclTax - a.revenueExclTax;
      if (itemSortFilter === "higheststock") return b.item.stockQuantity - a.item.stockQuantity;
      return a.item.name.localeCompare(b.item.name);
    });

    return filtered;
  }, [items, invoices, stockLevelFilter, searchQuery, itemSortFilter]);

  const itemsInventoryTotals = useMemo(() => {
    let carryingValue = 0;
    items.forEach(it => {
      carryingValue += it.stockQuantity * it.purchasePrice;
    });
    return carryingValue;
  }, [items]);

  // --------------------------------------------------------
  // Incomes & Expenses Calculations
  // --------------------------------------------------------
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (startDate && tx.date < startDate) return false;
      if (endDate && tx.date > endDate) return false;
      if (miscCategoryFilter && tx.category !== miscCategoryFilter) return false;
      if (miscTypeFilter && tx.type !== miscTypeFilter) return false;
      if (paymentFilter && tx.paymentType !== paymentFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesCat = tx.category.toLowerCase().includes(query);
        const matchesNotes = (tx.notes || "").toLowerCase().includes(query);
        if (!matchesCat && !matchesNotes) return false;
      }
      return true;
    });
  }, [transactions, startDate, endDate, miscCategoryFilter, miscTypeFilter, paymentFilter, searchQuery]);

  const transactionSummary = useMemo(() => {
    let incomeSum = 0;
    let expenseSum = 0;
    filteredTransactions.forEach(t => {
      if (t.type === "income") incomeSum += t.amount;
      else expenseSum += t.amount;
    });
    return { incomeSum, expenseSum, balance: incomeSum - expenseSum };
  }, [filteredTransactions]);

  const miscCategories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(t => { if (t.category) set.add(t.category); });
    return Array.from(set);
  }, [transactions]);

  // --------------------------------------------------------
  // Consolidated Profits & Losses Statement (Overall Profit & Loss)
  // --------------------------------------------------------
  const plReportData = useMemo(() => {
    let grossSales = 0;
    let salesReturns = 0;
    let grossPurchases = 0;
    let purchaseReturns = 0;

    let totalSalesDiscounts = 0;
    let totalPurchaseDiscounts = 0;

    let salesAdditionalSurcharges = 0;
    let purchaseAdditionalSurcharges = 0;

    invoices.forEach(inv => {
      if (startDate && inv.date < startDate) return;
      if (endDate && inv.date > endDate) return;

      const innerDiscounts = inv.items.reduce((s, c) => s + (c.discount || 0), 0);
      const innerCharges = (inv.extraCharges || []).reduce((s, c) => s + (c.amount || 0), 0);

      if (inv.type === "sale") {
        grossSales += inv.subtotal;
        totalSalesDiscounts += innerDiscounts;
        salesAdditionalSurcharges += innerCharges;
      } else if (inv.type === "sale_return") {
        salesReturns += inv.subtotal;
        totalSalesDiscounts -= innerDiscounts;
        salesAdditionalSurcharges -= innerCharges;
      } else if (inv.type === "purchase") {
        grossPurchases += inv.subtotal;
        totalPurchaseDiscounts += innerDiscounts;
        purchaseAdditionalSurcharges += innerCharges;
      } else if (inv.type === "purchase_return") {
        purchaseReturns += inv.subtotal;
        totalPurchaseDiscounts -= innerDiscounts;
        purchaseAdditionalSurcharges -= innerCharges;
      }
    });

    // Indirect non-invoice Incomes & Expenses
    let otherMiscIncomes = 0;
    let totalMiscExpenses = 0;
    const expenseBreakdown: Record<string, number> = {};

    transactions.forEach(tx => {
      if (startDate && tx.date < startDate) return;
      if (endDate && tx.date > endDate) return;

      if (tx.type === "income") {
        otherMiscIncomes += tx.amount;
      } else {
        totalMiscExpenses += tx.amount;
        const cat = tx.category || "General Overhead";
        expenseBreakdown[cat] = (expenseBreakdown[cat] || 0) + tx.amount;
      }
    });

    const netOperationalSales = Math.max(0, grossSales - salesReturns - totalSalesDiscounts);
    const netOperationalPurchases = Math.max(0, grossPurchases - purchaseReturns - totalPurchaseDiscounts);
    const grossProfitVal = netOperationalSales - netOperationalPurchases;
    const netAdditionalFeeRevenue = salesAdditionalSurcharges - purchaseAdditionalSurcharges;
    const netPLVal = grossProfitVal + otherMiscIncomes + netAdditionalFeeRevenue - totalMiscExpenses;

    return {
      grossSales,
      salesReturns,
      totalSalesDiscounts,
      netOperationalSales,
      grossPurchases,
      purchaseReturns,
      totalPurchaseDiscounts,
      netOperationalPurchases,
      grossProfitVal,
      salesAdditionalSurcharges,
      purchaseAdditionalSurcharges,
      netAdditionalFeeRevenue,
      otherMiscIncomes,
      totalMiscExpenses,
      expenseBreakdown,
      netPLVal
    };
  }, [invoices, transactions, startDate, endDate]);

  // Enhanced GSTR-1 and GSTR-2 aggregates with dynamic date filters
  const gstr1Details = useMemo(() => {
    const salesInvoices = invoices.filter(inv => {
      if (inv.type !== "sale") return false;
      if (startDate && inv.date < startDate) return false;
      if (endDate && inv.date > endDate) return false;
      return true;
    });
    let totalSalesTurnover = 0;
    let totalTaxableTurnover = 0;
    let totalCgstLiability = 0;
    let totalSgstLiability = 0;
    let totalIgstLiability = 0;
    let b2bSales: Invoice[] = [];
    let b2cSales: Invoice[] = [];

    salesInvoices.forEach(inv => {
      totalSalesTurnover += inv.totalAmount;
      totalTaxableTurnover += inv.subtotal;
      totalCgstLiability += inv.cgstTotal;
      totalSgstLiability += inv.sgstTotal;
      totalIgstLiability += inv.igstTotal;

      if (inv.partyGstin && inv.partyGstin.trim().length === 15) b2bSales.push(inv);
      else b2cSales.push(inv);
    });

    return {
      salesCount: salesInvoices.length,
      totalSalesTurnover,
      totalTaxableTurnover,
      totalTaxLiability: totalCgstLiability + totalSgstLiability + totalIgstLiability,
      totalCgstLiability,
      totalSgstLiability,
      totalIgstLiability,
      b2bSales,
      b2cSales
    };
  }, [invoices, startDate, endDate]);

  const gstr2Details = useMemo(() => {
    const purchaseBills = invoices.filter(inv => {
      if (inv.type !== "purchase") return false;
      if (startDate && inv.date < startDate) return false;
      if (endDate && inv.date > endDate) return false;
      return true;
    });
    let totalProcurement = 0;
    let totalTaxableValue = 0;
    let totalCgstCredit = 0;
    let totalSgstCredit = 0;
    let totalIgstCredit = 0;

    purchaseBills.forEach(inv => {
      totalProcurement += inv.totalAmount;
      totalTaxableValue += inv.subtotal;
      totalCgstCredit += inv.cgstTotal;
      totalSgstCredit += inv.sgstTotal;
      totalIgstCredit += inv.igstTotal;
    });

    return {
      purchasesCount: purchaseBills.length,
      totalProcurement,
      totalTaxableValue,
      totalInputTaxCredit: totalCgstCredit + totalSgstCredit + totalIgstCredit,
      totalCgstCredit,
      totalSgstCredit,
      totalIgstCredit,
      purchaseBills
    };
  }, [invoices, startDate, endDate]);

  const toggleInvoiceExpanded = (id: string) => {
    setExpandedInvoiceIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleExportToCSV = () => {
    let csvRows: string[][] = [];
    
    // Header information
    csvRows.push([business.name]);
    csvRows.push([business.address || ""]);
    if (business.gstin) csvRows.push([`GSTIN: ${business.gstin}`]);
    csvRows.push([`Report: ${reportSubTab.toUpperCase()}`]);
    csvRows.push([`Period: ${startDate || "All-Time"} to ${endDate || "All-Time"}`]);
    csvRows.push([]); // blank separator

    if (reportSubTab === "daybook") {
      csvRows.push(["Invoice No / Ref", "Date", "Party Name", "Type", "Status", "Total Amount (INR)"]);
      invoices.forEach(inv => {
        csvRows.push([
          inv.invoiceNumber,
          inv.date,
          inv.partyName,
          inv.type.toUpperCase(),
          inv.paymentType.toUpperCase(),
          inv.totalAmount.toString()
        ]);
      });
    } else if (reportSubTab === "sales") {
      csvRows.push(["Invoice No", "Date", "Party Name", "GSTIN", "Payment", "Subtotal (INR)", "Tax (INR)", "Total (INR)"]);
      filteredSales.forEach(inv => {
        csvRows.push([
          inv.invoiceNumber,
          inv.date,
          inv.partyName,
          inv.partyGstin || "N/A",
          inv.paymentType.toUpperCase(),
          inv.subtotal.toString(),
          inv.taxAmount.toString(),
          inv.totalAmount.toString()
        ]);
      });
    } else if (reportSubTab === "purchases") {
      csvRows.push(["Bill No", "Date", "Supplier", "GSTIN", "Payment", "Subtotal (INR)", "Tax (INR)", "Total (INR)"]);
      filteredPurchases.forEach(inv => {
        csvRows.push([
          inv.invoiceNumber,
          inv.date,
          inv.partyName,
          inv.partyGstin || "N/A",
          inv.paymentType.toUpperCase(),
          inv.subtotal.toString(),
          inv.taxAmount.toString(),
          inv.totalAmount.toString()
        ]);
      });
    } else if (reportSubTab === "items") {
      csvRows.push(["Item Name", "HSN/SAC", "Stock Qty", "Min Alert", "Purchase Price (INR)", "Sale Price (INR)", "Qty Sold", "Gross Sales Revenue (INR)"]);
      itemsReportPerformance.forEach(row => {
        csvRows.push([
          row.item.name,
          row.item.hsn || "N/A",
          row.item.stockQuantity.toString(),
          row.item.minStockAlert.toString(),
          row.item.purchasePrice.toString(),
          row.item.sellingPrice.toString(),
          row.qtySold.toString(),
          row.revenueExclTax.toString()
        ]);
      });
    } else if (reportSubTab === "incomes_expenses") {
      csvRows.push(["Date", "Ref Voucher", "Type", "Category", "Amount (INR)", "Payment", "Notes"]);
      filteredTransactions.forEach(t => {
        csvRows.push([
          t.date,
          t.voucherNumber || "N/A",
          t.type.toUpperCase(),
          t.category,
          t.amount.toString(),
          t.paymentType.toUpperCase(),
          t.notes || ""
        ]);
      });
    } else if (reportSubTab === "pl_account") {
      csvRows.push(["Account Ledger Label", "Type", "Amount (INR)"]);
      csvRows.push(["Gross Sales Revenue", "Credit", plReportData.grossSales.toString()]);
      csvRows.push(["Sales Returns Deduction", "Debit", plReportData.salesReturns.toString()]);
      csvRows.push(["Outward Aggregate Discounts", "Debit", plReportData.totalSalesDiscounts.toString()]);
      csvRows.push(["Net Operational Sales", "Credit", plReportData.netOperationalSales.toString()]);
      csvRows.push(["Gross Inward Purchases", "Debit", plReportData.grossPurchases.toString()]);
      csvRows.push(["Purchase Returns Deductions", "Credit", plReportData.purchaseReturns.toString()]);
      csvRows.push(["Inward Received Discounts", "Credit", plReportData.totalPurchaseDiscounts.toString()]);
      csvRows.push(["Net Operational Purchases", "Debit", plReportData.netOperationalPurchases.toString()]);
      csvRows.push(["Gross Margin Operational Profit", "Summary", plReportData.grossProfitVal.toString()]);
      csvRows.push(["Other Non-Invoice Misc Revenue", "Credit", plReportData.otherMiscIncomes.toString()]);
      csvRows.push(["Operating Overhead Expenses", "Debit", plReportData.totalMiscExpenses.toString()]);
      Object.entries(plReportData.expenseBreakdown).forEach(([cat, amt]) => {
        csvRows.push([`  - Overhead: ${cat}`, "Debit", amt.toString()]);
      });
      csvRows.push(["Net Profit / Loss Account", "Summary", plReportData.netPLVal.toString()]);
    } else if (reportSubTab === "gstr1") {
      csvRows.push(["Schedule Type", "Inv/Ref", "Recipient", "GSTIN", "Taxable Value (INR)", "CGST (INR)", "SGST (INR)", "IGST (INR)", "Total Invoice (INR)"]);
      gstr1Details.b2bSales.forEach(inv => {
        csvRows.push([
          "Registered B2B Supplies",
          inv.invoiceNumber,
          inv.partyName,
          inv.partyGstin,
          inv.subtotal.toString(),
          inv.cgstTotal.toString(),
          inv.sgstTotal.toString(),
          inv.igstTotal.toString(),
          inv.totalAmount.toString()
        ]);
      });
      gstr1Details.b2cSales.forEach(inv => {
        csvRows.push([
          "Unregistered B2C Consumers",
          inv.invoiceNumber,
          "Walk-in consumer",
          "N/A",
          inv.subtotal.toString(),
          inv.cgstTotal.toString(),
          inv.sgstTotal.toString(),
          inv.igstTotal.toString(),
          inv.totalAmount.toString()
        ]);
      });
    } else if (reportSubTab === "gstr2") {
      csvRows.push(["Bill No", "Supplier Name", "Supplier GSTIN", "Taxable Value (INR)", "CGST ITC Claim (INR)", "SGST ITC Claim (INR)", "IGST ITC Claim (INR)", "Total Value (INR)"]);
      gstr2Details.purchaseBills.forEach(inv => {
        csvRows.push([
          inv.invoiceNumber,
          inv.partyName,
          inv.partyGstin || "Unregistered Supplier",
          inv.subtotal.toString(),
          inv.cgstTotal.toString(),
          inv.sgstTotal.toString(),
          inv.igstTotal.toString(),
          inv.totalAmount.toString()
        ]);
      });
    }

    const csvString = csvRows
      .map(row => row.map(cell => {
        const escaped = (cell || "").replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(","))
      .join("\n");

    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${reportSubTab}_report_${startDate || 'all'}_to_${endDate || 'all'}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="v-reports-container" className="space-y-6">

      {/* Print-Only Header with Store Profile & Logo */}
      <div className="hidden print:flex flex-col border-b-2 border-slate-900 pb-5 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-start space-x-4">
            {business.logoUrl ? (
              <img
                src={business.logoUrl}
                referrerPolicy="no-referrer"
                alt="Logo"
                className="w-16 h-16 object-contain bg-white border border-slate-200 p-1 rounded-xl shadow-sm shrink-0"
              />
            ) : (
              <div className="w-16 h-16 bg-slate-900 rounded-xl flex items-center justify-center font-bold text-white text-xl uppercase shrink-0">
                {business.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-slate-900">{business.name}</h1>
              <p className="text-xs text-slate-600 font-medium whitespace-pre-line leading-relaxed max-w-lg mt-1">{business.address}</p>
              <div className="mt-2 text-[11px] font-sans text-slate-700 flex flex-wrap gap-x-4">
                {business.gstin && <p><span className="font-semibold text-slate-900">GSTIN:</span> {business.gstin}</p>}
                {business.phone && <p><span className="font-semibold text-slate-900">Phone:</span> {business.phone}</p>}
                {business.email && <p><span className="font-semibold text-slate-900">Email:</span> {business.email}</p>}
              </div>
            </div>
          </div>
          <div className="text-right flex flex-col justify-between h-full">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-widest font-mono">BUSINESS STATEMENT</span>
              <h2 className="text-lg font-black text-slate-800 uppercase mt-1">
                {reportSubTab === "daybook" ? "Day Book" : ""}
                {reportSubTab === "sales" ? "Sales Ledger" : ""}
                {reportSubTab === "purchases" ? "Purchases Ledger" : ""}
                {reportSubTab === "items" ? "Inventory & Products" : ""}
                {reportSubTab === "incomes_expenses" ? "Incomes & Expenses" : ""}
                {reportSubTab === "pl_account" ? "Profit & Loss Account font-sans" : ""}
                {reportSubTab === "gstr1" ? "GSTR-1 Outward Return" : ""}
                {reportSubTab === "gstr2" ? "GSTR-2 Inward (ITC) Return" : ""}
              </h2>
            </div>
            <div className="mt-4 font-mono text-[10px] text-slate-500">
              <p>Period: {startDate || "All-Time"} to {endDate || "All-Time"}</p>
              <p>Printed on: {new Date().toLocaleDateString("en-IN")}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div className="flex items-center space-x-3">
          {business.logoUrl ? (
            <img
              src={business.logoUrl}
              referrerPolicy="no-referrer"
              alt="Logo"
              className="w-12 h-12 object-contain bg-white border border-slate-200 p-0.5 rounded-xl shadow-sm animate-fadeIn"
            />
          ) : (
            <div className="w-12 h-12 bg-gradient-to-tr from-emerald-650 to-indigo-650 rounded-xl flex items-center justify-center font-bold text-white font-sans text-sm shadow-sm shrink-0">
              {business.name.substring(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Custom Reports & Analytics</h1>
            <p className="text-xs text-slate-500 mt-0.5">Filterable Sales, Purchases, Stock Performance, Cash ledger, and overall Profit & Loss account</p>
          </div>
        </div>
        
        {/* Quick actions & export tools */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleClearFilters}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center space-x-1 border border-slate-200 transition cursor-pointer select-none"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
          
          <button
            onClick={handleExportToCSV}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center space-x-1 shadow-xs transition cursor-pointer select-none"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => window.print()}
            className="bg-slate-900 hover:bg-slate-800 text-white border border-slate-950 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center space-x-1 shadow-xs transition cursor-pointer select-none"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Export PDF (Print)</span>
          </button>
        </div>
      </div>

      {/* Responsive sub-tab selector buttons */}
      <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl gap-1">
        {[
          { tab: "daybook", label: "Day Book" },
          { tab: "sales", label: "Sales" },
          { tab: "purchases", label: "Purchases" },
          { tab: "items", label: "Products performance" },
          { tab: "incomes_expenses", label: "Incomes/Expenses" },
          { tab: "pl_account", label: "Overall P/L" },
          { tab: "gstr1", label: "GSTR-1 (Outward)" },
          { tab: "gstr2", label: "GSTR-2 (Inbound)" }
        ].map(item => (
          <button
            id={`reports-subtab-${item.tab}-btn`}
            key={item.tab}
            onClick={() => {
              setReportSubTab(item.tab as any);
              setExpandedInvoiceIds({}); // reset expansions
            }}
            className={`text-[11px] font-bold py-2 px-3 rounded-lg select-none transition ${
              reportSubTab === item.tab
                ? "bg-white text-slate-950 shadow-xs font-extrabold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* FILTER PANEL: Displayed on tabs that supports custom parameters */}
      {reportSubTab !== "pl_account" && (
        <div id="filter-controls-panel" className="bg-white border border-slate-150 p-4 rounded-xl shadow-xs space-y-3.5">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 uppercase tracking-wide">
            <Filter className="w-4 h-4 text-emerald-600" />
            <span>Customize Report Criteria</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Common Date range filters */}
            {["daybook", "sales", "purchases", "incomes_expenses"].includes(reportSubTab) && (
              <>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-55 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-55 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none"
                  />
                </div>
              </>
            )}

            {/* Invoicing party selector filter */}
            {["sales", "purchases"].includes(reportSubTab) && (
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Filter Party</label>
                <select
                  value={partyFilter}
                  onChange={(e) => setPartyFilter(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-55 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none font-medium"
                >
                  <option value="">-- All Parties --</option>
                  {parties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Invoicing / Misc payment type filter */}
            {["daybook", "sales", "purchases", "incomes_expenses"].includes(reportSubTab) && (
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Payment Type</label>
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-55 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none font-medium"
                >
                  <option value="">-- All Payments --</option>
                  <option value="cash">Cash Mode</option>
                  <option value="bank">Bank/UPI Mode</option>
                  {["sales", "purchases"].includes(reportSubTab) && <option value="unpaid">Unpaid / Credit</option>}
                </select>
              </div>
            )}

            {/* GST Rate filter for sales and purchases */}
            {["sales", "purchases"].includes(reportSubTab) && (
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">GST Tax Slab</label>
                <select
                  value={gstRateFilter}
                  onChange={(e) => setGstRateFilter(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-55 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none"
                >
                  <option value="">-- All Tax Slabs --</option>
                  <option value="0">0% Excluded</option>
                  <option value="5">5% rate</option>
                  <option value="12">12% rate</option>
                  <option value="18">18% rate</option>
                  <option value="28">28% rate</option>
                </select>
              </div>
            )}

            {/* Items stock status & sorts */}
            {reportSubTab === "items" && (
              <>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Stock Position</label>
                  <select
                    value={stockLevelFilter}
                    onChange={(e) => setStockLevelFilter(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-55 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none"
                  >
                    <option value="">-- All Stocks --</option>
                    <option value="instock">In Stock Only</option>
                    <option value="lowstock">Is Low Stock Warning</option>
                    <option value="outofstock">Out of Stock (Zero)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Rank Metrics</label>
                  <select
                    value={itemSortFilter}
                    onChange={(e) => setItemSortFilter(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-55 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none font-bold"
                  >
                    <option value="bestselling">Best Selling Units</option>
                    <option value="revenue">Gross Income Value</option>
                    <option value="higheststock">Highest Stock Quantities</option>
                    <option value="alphabetical">Alphabetical sorting</option>
                  </select>
                </div>
              </>
            )}

            {/* Income and expenses options */}
            {reportSubTab === "incomes_expenses" && (
              <>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Category type</label>
                  <select
                    value={miscCategoryFilter}
                    onChange={(e) => setMiscCategoryFilter(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-55 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none font-medium"
                  >
                    <option value="">-- All Categories --</option>
                    {miscCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Ledger Side</label>
                  <select
                    value={miscTypeFilter}
                    onChange={(e) => setMiscTypeFilter(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-55 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none"
                  >
                    <option value="">-- Income & Expense --</option>
                    <option value="income">Incoming Profit Assets</option>
                    <option value="expense">Operating Expenditures Only</option>
                  </select>
                </div>
              </>
            )}

            {/* Universal Search filter */}
            {["daybook", "sales", "purchases", "items", "incomes_expenses"].includes(reportSubTab) && (
              <div className="col-span-2 md:col-span-1">
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Text keyword</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-2.5">
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search query..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 bg-slate-55 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Tab: Day Book */}
      {/* ======================================================== */}
      {reportSubTab === "daybook" && (
        <div id="re-daybook" className="space-y-4">
          <div className="bg-white border border-slate-150 rounded-xl p-4 shadow-xs flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <ListTodo className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Invoicing Day Book</h3>
                <p className="text-[10px] text-slate-400 font-medium">All historical transactions sorted chronologically</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Aggregates</span>
              <span className="block font-sans font-black text-slate-800 text-xs">{invoices.length} invoices entries</span>
            </div>
          </div>

          <div className="bg-white border border-slate-150 rounded-xl overflow-hidden shadow-xs">
            {invoices.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Receipt className="w-12 h-12 text-slate-200 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-slate-600">No transactions recorded inside daybook.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-3">Num</th>
                    <th className="py-2.5 px-3">Party Name</th>
                    <th className="py-2.5 px-3 text-center">Type</th>
                    <th className="py-2.5 px-3 text-right">Tax Value</th>
                    <th className="py-2.5 px-4 text-right">Invoice Sum</th>
                    <th className="py-2.5 px-4 text-center">Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.slice().reverse().map(inv => {
                    const isSale = inv.type === "sale";
                    const isSaleReturn = inv.type === "sale_return";
                    const isPurchase = inv.type === "purchase";
                    const isPurchaseReturn = inv.type === "purchase_return";

                    return (
                      <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50/50 hover:border-slate-200 font-sans transition">
                        <td className="py-3 px-4 font-mono text-slate-550">{inv.date}</td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-850">{inv.invoiceNumber}</td>
                        <td className="py-3 px-3 font-medium text-slate-700">{inv.partyName}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold font-mono ${
                            isSale ? "bg-emerald-50 text-emerald-700" :
                            isSaleReturn ? "bg-amber-100 text-amber-700" :
                            isPurchase ? "bg-purple-100 text-purple-700" :
                            "bg-rose-100 text-rose-700"
                          }`}>
                            {isSale ? "SALE" : isSaleReturn ? "CN (SALE RET)" : isPurchase ? "PURCH" : "DN (PUR RET)"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-500">{formatINR(inv.taxAmount)}</td>
                        <td className="py-3 px-4 text-right font-bold font-mono text-slate-900">{formatINR(inv.totalAmount)}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              id={`daybook-print-${inv.id}-btn`}
                              onClick={() => onOpenInvoice(inv)}
                              className="text-slate-600 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 p-1 rounded transition border border-transparent cursor-pointer"
                              title="Print Layout"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {onEditInvoice && (isSale ? sPerms.update : pPerms.update) && (
                              <button
                                id={`daybook-edit-${inv.id}-btn`}
                                onClick={() => onEditInvoice(inv)}
                                className="text-emerald-600 bg-slate-100 hover:bg-emerald-50 p-1 rounded transition"
                                title="Edit Ledger Details"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {(isSale || isPurchase) && onReturnInvoice && (isSale ? sPerms.create : pPerms.create) && (
                              <button
                                id={`daybook-return-${inv.id}-btn`}
                                onClick={() => onReturnInvoice(inv)}
                                className="text-amber-600 bg-slate-100 hover:bg-amber-50 p-1 rounded transition"
                                title="Process Credit/Debit Return"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {(isSale ? sPerms.delete : pPerms.delete) && (
                              <button
                                id={`daybook-delete-${inv.id}-btn`}
                                onClick={() => handleDeleteInvoice(inv.id, inv.invoiceNumber)}
                                className="text-slate-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded transition"
                                title="Trash Invoice"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Tab: Sales Report */}
      {/* ======================================================== */}
      {reportSubTab === "sales" && (
        <div id="re-sales-report" className="space-y-4 font-sans block">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white border border-slate-150 p-4 rounded-xl shadow-xs">
            <div className="border-r border-slate-100 pr-2">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Net Sales Turnover</span>
              <span className="block font-bold text-base text-slate-900 mt-1 font-mono">{formatINR(salesReportStats.netTaxable)}</span>
            </div>
            <div className="border-r border-slate-100 pr-2 md:pl-2">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Output GST Levy</span>
              <span className="block font-bold text-base text-slate-900 mt-1 font-mono">{formatINR(salesReportStats.totalTax)}</span>
            </div>
            <div className="border-r border-slate-100 pr-2 md:pl-2">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Discounts Allowed</span>
              <span className="block font-bold text-base text-rose-600 mt-1 font-mono">{formatINR(salesReportStats.totalDiscounts)}</span>
            </div>
            <div className="md:pl-2">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Surcharges / Fees</span>
              <span className="block font-bold text-base text-indigo-600 mt-1 font-mono">{formatINR(salesReportStats.totalCharges)}</span>
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-xl p-3 flex justify-between items-center px-4 font-mono">
            <span className="text-xs font-bold text-slate-350">Aggregate Gross Sales Sum (Taxes and Surcharges inclusive):</span>
            <span className="text-sm font-black text-emerald-400">{formatINR(salesReportStats.grossValue)}</span>
          </div>

          {/* Details list */}
          <div className="bg-white border border-slate-150 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-4 w-8"></th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Invoice No</th>
                  <th className="py-2.5 px-3">Customer / Party</th>
                  <th className="py-2.5 px-3 text-center">Pay Type</th>
                  <th className="py-2.5 px-3 text-right">Tax Amt</th>
                  <th className="py-2.5 px-3 text-right">Discount</th>
                  <th className="py-2.5 px-4 text-right">Grand Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map(inv => {
                  const isExpanded = !!expandedInvoiceIds[inv.id];
                  const invoiceLineDiscounts = inv.items.reduce((sum, curr) => sum + (curr.discount || 0), 0);
                  const isReturn = inv.type === "sale_return";

                  return (
                    <>
                      <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => toggleInvoiceExpanded(inv.id)}
                            className="p-1 hover:bg-slate-100 rounded transition text-slate-500 cursor-pointer"
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-550">{inv.date}</td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 group-hover:underline">
                          <span className={isReturn ? "text-rose-600 font-semibold" : ""}>{inv.invoiceNumber}</span>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-700">
                          {inv.partyName}
                          {isReturn && <span className="text-[9px] font-bold text-rose-500 ml-1.5 uppercase bg-rose-50 px-1 py-0.5 rounded">Return</span>}
                        </td>
                        <td className="py-3 px-3 text-center uppercase text-[10px] font-bold text-slate-550">{inv.paymentType}</td>
                        <td className="py-3 px-3 text-right font-mono text-slate-500">{formatINR(inv.taxAmount)}</td>
                        <td className="py-3 px-3 text-right font-mono text-rose-550">-{formatINR(invoiceLineDiscounts)}</td>
                        <td className={`py-3 px-4 text-right font-bold font-mono ${isReturn ? "text-rose-600" : "text-slate-950"}`}>{formatINR(inv.totalAmount * (isReturn ? -1 : 1))}</td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50/70 border-b border-slate-100">
                          <td colSpan={8} className="p-4 pl-12">
                            <div className="space-y-2 border-l-2 border-emerald-500 pl-4 py-1">
                              <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Line Item Specifications</h5>
                              <table className="w-full text-left text-[11px] font-mono border-collapse bg-white border border-slate-200 rounded-lg">
                                <thead>
                                  <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 uppercase text-[9px]">
                                    <th className="py-1 px-2">Item Name</th>
                                    <th className="py-1 px-2 text-right">Qty</th>
                                    <th className="py-1 px-2 text-right">Price</th>
                                    <th className="py-1 px-2 text-right">Discount</th>
                                    <th className="py-1 px-2 text-center">GST</th>
                                    <th className="py-1 px-2 text-right">Line Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {inv.items.map((it, lIdx) => (
                                    <tr key={lIdx} className="border-b border-slate-100 text-slate-700">
                                      <td className="py-1 px-2 font-sans font-semibold text-slate-800">{it.itemName}</td>
                                      <td className="py-1 px-2 text-right font-bold">{it.quantity}</td>
                                      <td className="py-1 px-2 text-right">{it.price.toFixed(2)}</td>
                                      <td className="py-1 px-2 text-right text-rose-600">-{it.discount ? it.discount.toFixed(2) : "0.00"}</td>
                                      <td className="py-1 px-2 text-center">{it.gstRate}%</td>
                                      <td className="py-1 px-2 text-right font-bold text-slate-900">{it.totalWithTax.toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {inv.extraCharges && inv.extraCharges.length > 0 && (
                                <div className="mt-2 text-[10px]">
                                  <span className="font-bold text-slate-500 uppercase block mb-1">Additional Fees & surcharges:</span>
                                  <div className="flex flex-wrap gap-2">
                                    {inv.extraCharges.map((c, cIdx) => (
                                      <span key={cIdx} className="bg-indigo-50 border border-indigo-100 text-indigo-700 py-0.5 px-2 rounded-md font-bold">
                                        {c.title}: +{formatINR(c.amount)}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Tab: Purchase Report */}
      {/* ======================================================== */}
      {reportSubTab === "purchases" && (
        <div id="re-purchase-report" className="space-y-4 font-sans block">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white border border-slate-150 p-4 rounded-xl shadow-xs">
            <div className="border-r border-slate-100 pr-2">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Procurement Cost</span>
              <span className="block font-bold text-base text-slate-900 mt-1 font-mono">{formatINR(purchaseReportStats.netTaxable)}</span>
            </div>
            <div className="border-r border-slate-100 pr-2 md:pl-2">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Purchases ITC Credit</span>
              <span className="block font-bold text-base text-purple-700 mt-1 font-mono">{formatINR(purchaseReportStats.totalTax)}</span>
            </div>
            <div className="border-r border-slate-100 pr-2 md:pl-2">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Discounts Received</span>
              <span className="block font-bold text-base text-emerald-600 mt-1 font-mono">{formatINR(purchaseReportStats.totalDiscounts)}</span>
            </div>
            <div className="md:pl-2">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Surcharges Paid</span>
              <span className="block font-bold text-base text-slate-950 mt-1 font-mono">{formatINR(purchaseReportStats.totalCharges)}</span>
            </div>
          </div>

          <div className="bg-purple-950 text-white rounded-xl p-3 flex justify-between items-center px-4 font-mono">
            <span className="text-xs font-bold text-purple-200">Aggregate Gross Purchases (Taxes and Surcharges inclusive):</span>
            <span className="text-sm font-black text-purple-300">{formatINR(purchaseReportStats.grossValue)}</span>
          </div>

          {/* Details list */}
          <div className="bg-white border border-slate-150 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-55 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-4 w-8"></th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Bill Number</th>
                  <th className="py-2.5 px-3">Supplier Name</th>
                  <th className="py-2.5 px-3 text-center">Pay Type</th>
                  <th className="py-2.5 px-3 text-right">ITC Amount</th>
                  <th className="py-2.5 px-3 text-right">Discount Recd</th>
                  <th className="py-2.5 px-4 text-right">Total Invoice</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.map(inv => {
                  const isExpanded = !!expandedInvoiceIds[inv.id];
                  const invoiceLineDiscounts = inv.items.reduce((sum, curr) => sum + (curr.discount || 0), 0);
                  const isReturn = inv.type === "purchase_return";

                  return (
                    <>
                      <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => toggleInvoiceExpanded(inv.id)}
                            className="p-1 hover:bg-slate-100 rounded transition text-slate-500 cursor-pointer"
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-550">{inv.date}</td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">
                          <span className={isReturn ? "text-rose-600 font-semibold" : ""}>{inv.invoiceNumber}</span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700">
                          {inv.partyName}
                          {isReturn && <span className="text-[9px] font-bold text-rose-500 ml-1.5 uppercase bg-rose-50 px-1 py-0.5 rounded">Return</span>}
                        </td>
                        <td className="py-3 px-3 text-center uppercase text-[10px] font-bold text-slate-550">{inv.paymentType}</td>
                        <td className="py-3 px-3 text-right font-mono text-purple-700 font-bold">{formatINR(inv.taxAmount)}</td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-600 font-semibold">-{formatINR(invoiceLineDiscounts)}</td>
                        <td className={`py-3 px-4 text-right font-bold font-mono ${isReturn ? "text-rose-600" : "text-slate-950"}`}>{formatINR(inv.totalAmount * (isReturn ? -1 : 1))}</td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50/70 border-b border-slate-100">
                          <td colSpan={8} className="p-4 pl-12 font-sans">
                            <div className="space-y-2 border-l-2 border-purple-500 pl-4 py-1">
                              <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Purchased Line Items</h5>
                              <table className="w-full text-left text-[11px] font-mono border-collapse bg-white border border-slate-200 rounded-lg animate-fadeIn">
                                <thead>
                                  <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 uppercase text-[9px]">
                                    <th className="py-1 px-2">Item Name</th>
                                    <th className="py-1 px-2 text-right">Qty</th>
                                    <th className="py-1 px-2 text-right">Price</th>
                                    <th className="py-1 px-2 text-right font-bold">Discount</th>
                                    <th className="py-1 px-2 text-center">GST</th>
                                    <th className="py-1 px-2 text-right">Total (excl. Tax)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {inv.items.map((it, lIdx) => (
                                    <tr key={lIdx} className="border-b border-slate-100 text-slate-700">
                                      <td className="py-1 px-2 font-sans font-semibold text-slate-800">{it.itemName}</td>
                                      <td className="py-1 px-2 text-right font-bold">{it.quantity}</td>
                                      <td className="py-1 px-2 text-right">{it.price.toFixed(2)}</td>
                                      <td className="py-1 px-2 text-right text-emerald-600 font-bold">-{it.discount ? it.discount.toFixed(2) : "0.00"}</td>
                                      <td className="py-1 px-2 text-center">{it.gstRate}%</td>
                                      <td className="py-1 px-2 text-right font-bold text-slate-900">{(it.totalWithTax - it.taxAmount).toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {inv.extraCharges && inv.extraCharges.length > 0 && (
                                <div className="mt-2 text-[10px]">
                                  <span className="font-bold text-slate-500 uppercase block mb-1">Additional Fees & charges:</span>
                                  <div className="flex flex-wrap gap-2">
                                    {inv.extraCharges.map((c, cIdx) => (
                                      <span key={cIdx} className="bg-indigo-50 border border-indigo-100 text-indigo-700 py-0.5 px-2 rounded-md font-bold">
                                        {c.title}: +{formatINR(c.amount)}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Tab: Products performance */}
      {/* ======================================================== */}
      {reportSubTab === "items" && (
        <div id="re-items-report" className="space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="bg-white border border-slate-150 p-4 rounded-xl shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Inventory Assests Value</span>
                <span className="block font-bold text-xl text-slate-950 mt-1 font-mono">{formatINR(itemsInventoryTotals)}</span>
              </div>
              <Package className="w-10 h-10 text-emerald-200" />
            </div>
            
            <div className="bg-white border border-slate-150 p-4 rounded-xl shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Catalog Records</span>
                <span className="block font-bold text-xl text-slate-950 mt-1 font-mono">{items.length} items logged</span>
              </div>
              <Layers className="w-10 h-10 text-indigo-200" />
            </div>
          </div>

          <div className="bg-white border border-slate-150 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-4">Catalog Product Name</th>
                  <th className="py-2.5 px-3">HSN Code</th>
                  <th className="py-2.5 px-3 text-right">Units Sold</th>
                  <th className="py-2.5 px-3 text-right">Revenue Generated</th>
                  <th className="py-2.5 px-3 text-right">Units Sourced</th>
                  <th className="py-2.5 px-4 text-center">Available Stock</th>
                </tr>
              </thead>
              <tbody>
                {itemsReportPerformance.map(row => {
                  return (
                    <tr key={row.item.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        <div>{row.item.name}</div>
                        <span className="text-[9px] text-slate-400 block font-normal font-sans">S: {formatINR(row.item.salePrice)} | P: {formatINR(row.item.purchasePrice)}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">{row.item.hsn || "-"}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-indigo-700">{row.qtySold} {row.item.unit}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-900">{formatINR(row.revenueExclTax)}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-650">{row.qtyPurchased} {row.item.unit}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
                          row.stockStatus === "outofstock" ? "bg-rose-100 text-rose-800" :
                          row.stockStatus === "lowstock" ? "bg-amber-100 text-amber-800" :
                          "bg-emerald-50 text-emerald-800"
                        }`}>
                          {row.item.stockQuantity} {row.item.unit}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* Tab: Incomes and Expenses */}
      {/* ======================================================== */}
      {reportSubTab === "incomes_expenses" && (
        <div id="re-misctransactions" className="space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="bg-white border border-slate-150 p-4 rounded-xl shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Independent Misc Revenue</span>
              <span className="block font-black text-xl text-emerald-600 mt-1 font-mono flex items-center space-x-1">
                <ArrowUpRight className="w-5 h-5" />
                <span>{formatINR(transactionSummary.incomeSum)}</span>
              </span>
            </div>
            
            <div className="bg-white border border-slate-150 p-4 rounded-xl shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Expenditures / Surcharges</span>
              <span className="block font-black text-xl text-rose-600 mt-1 font-mono flex items-center space-x-1">
                <ArrowDownLeft className="w-5 h-5" />
                <span>{formatINR(transactionSummary.expenseSum)}</span>
              </span>
            </div>

            <div className="bg-white border border-slate-150 p-4 rounded-xl shadow-xs font-mono bg-slate-50/50">
              <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Net Cash flow / Misc Ledger Balance</span>
              <span className={`block font-black text-xl mt-1 ${transactionSummary.balance >= 0 ? "text-slate-900" : "text-rose-700"}`}>
                {formatINR(transactionSummary.balance)}
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-150 rounded-xl overflow-hidden shadow-xs">
            {filteredTransactions.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Coins className="w-12 h-12 text-slate-200 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-slate-600">No independent miscellaneous cash ledger entries catalogued.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-4">Receipt Date</th>
                    <th className="py-2.5 px-3">Category classification</th>
                    <th className="py-2.5 px-3">Description / Note</th>
                    <th className="py-2.5 px-3 text-center">Route</th>
                    <th className="py-2.5 px-3 text-center">Type Badging</th>
                    <th className="py-2.5 px-4 text-right">Ledger Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map(tx => (
                    <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition font-sans">
                      <td className="py-3 px-4 font-mono text-slate-550">{tx.date}</td>
                      <td className="py-3 px-3 font-semibold text-slate-800 uppercase tracking-wide text-[10px]">{tx.category}</td>
                      <td className="py-3 px-3 text-slate-600 max-w-sm truncate">{tx.notes || "-"}</td>
                      <td className="py-3 px-3 text-center capitalize text-slate-500 font-mono text-[10px]">{tx.paymentType}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase font-mono ${
                          tx.type === "income" ? "bg-teal-50 text-teal-800 border border-teal-100" : "bg-rose-50 text-rose-800 border border-rose-100"
                        }`}>
                          {tx.type === "income" ? "INCOME" : "EXPENSE"}
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-right font-bold font-mono ${tx.type === "income" ? "text-emerald-700" : "text-rose-700"}`}>
                        {tx.type === "income" ? "+" : "-"}{formatINR(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Tab: Overall P/L Statement Account */}
      {/* ======================================================== */}
      {reportSubTab === "pl_account" && (
        <div id="re-profitandloss-sheet" className="space-y-6 animate-fadeIn">
          
          {/* Section Summary Panel */}
          <div className="bg-white border border-slate-205 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <TrendingUp className="w-5.5 h-5.5 text-emerald-600 animate-pulse" />
                <div>
                  <h3 className="font-bold text-slate-905 text-sm uppercase tracking-wider">Statement of Profit or Loss (P&L Ledger)</h3>
                  <p className="text-[10px] text-slate-400 font-medium">For the selected billing calendar intervals</p>
                </div>
              </div>
              
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-black block">Report Generation Interleave</span>
                <span className="text-xs bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md text-slate-600 font-mono font-bold mt-1 inline-block">
                  {startDate || "Opening"} ➔ {endDate || "Closing / Live"}
                </span>
              </div>
            </div>

            {/* Financial Ledger grid */}
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              {/* Table header */}
              <div className="bg-slate-900 text-white font-sans font-bold flex p-3 uppercase tracking-wider text-[10px]">
                <div className="flex-1">Corporate Accounting Group Schedule</div>
                <div className="w-32 text-right">Debit Assets (₹)</div>
                <div className="w-32 text-right">Credit Ledger (₹)</div>
              </div>

              {/* Group 1: Revenue from operations */}
              <div className="bg-slate-50/50 p-2.5 font-bold text-slate-800 uppercase tracking-wider text-[10px] border-b border-slate-200">
                1. Earnings & Surcharges from Operations
              </div>
              <div className="flex p-3 border-b border-slate-100 font-sans">
                <div className="flex-1 pl-4 text-slate-700">Gross Sales Invoiced (excluding returned values)</div>
                <div className="w-32 text-right text-slate-400">-</div>
                <div className="w-32 text-right font-mono text-slate-900">{formatINR(plReportData.grossSales)}</div>
              </div>
              <div className="flex p-3 border-b border-slate-110 font-sans bg-rose-50/15">
                <div className="flex-1 pl-4 text-rose-800 font-medium">LESS: Sales returns logged / Credit Notes</div>
                <div className="w-32 text-right font-mono text-rose-700">-{formatINR(plReportData.salesReturns)}</div>
                <div className="w-32 text-right text-slate-400">-</div>
              </div>
              <div className="flex p-3 border-b border-slate-110 font-sans bg-rose-50/15">
                <div className="flex-1 pl-4 text-rose-800 font-medium">LESS: Cumulative flat trade discounts allowed</div>
                <div className="w-32 text-right font-mono text-rose-700">-{formatINR(plReportData.totalSalesDiscounts)}</div>
                <div className="w-32 text-right text-slate-400">-</div>
              </div>
              <div className="flex p-3 border-b border-slate-200 font-bold bg-slate-50">
                <div className="flex-1 text-slate-900 pl-4 uppercase text-[10px]">Net Operational Revenue (Realized)</div>
                <div className="w-32 text-right text-slate-400">-</div>
                <div className="w-32 text-right font-mono text-slate-950 font-extrabold underline">{formatINR(plReportData.netOperationalSales)}</div>
              </div>

              {/* Group 2: Sourcing expenditure */}
              <div className="bg-slate-50/50 p-2.5 font-bold text-slate-800 uppercase tracking-wider text-[10px] border-b border-slate-200">
                2. Wholesale Product Sourcing Expenditures
              </div>
              <div className="flex p-3 border-b border-slate-100 font-sans">
                <div className="flex-1 pl-4 text-slate-700">Gross wholesale procurement purchases</div>
                <div className="w-32 text-right font-mono text-slate-900">{formatINR(plReportData.grossPurchases)}</div>
                <div className="w-32 text-right text-slate-400">-</div>
              </div>
              <div className="flex p-3 border-b border-slate-110 font-sans bg-emerald-50/15">
                <div className="flex-1 pl-4 text-emerald-800 font-medium">LESS: Procurement returns / Debit notes from suppliers</div>
                <div className="w-32 text-right text-slate-400">-</div>
                <div className="w-32 text-right font-mono text-emerald-700">-{formatINR(plReportData.purchaseReturns)}</div>
              </div>
              <div className="flex p-3 border-b border-slate-110 font-sans bg-emerald-50/15">
                <div className="flex-1 pl-4 text-emerald-800 font-medium">LESS: Cumulative prompt payment discounts received</div>
                <div className="w-32 text-right text-slate-400">-</div>
                <div className="w-32 text-right font-mono text-emerald-700">-{formatINR(plReportData.totalPurchaseDiscounts)}</div>
              </div>
              <div className="flex p-3 border-b border-slate-200 font-bold bg-slate-50">
                <div className="flex-1 text-slate-900 pl-4 uppercase text-[10px]">Net Sourcing Costs (COGS)</div>
                <div className="w-32 text-right font-mono text-slate-950 font-extrabold underline">{formatINR(plReportData.netOperationalPurchases)}</div>
                <div className="w-32 text-right text-slate-400">-</div>
              </div>

              {/* TRADING MARGIN SUB-TOTAL */}
              <div className="flex p-3 border-b border-slate-250 font-sans bg-emerald-50/20 font-bold text-emerald-950">
                <div className="flex-1 text-[11px] uppercase tracking-wide">Gross Trading Margin / Profit</div>
                <div className="w-32 text-right text-slate-400">-</div>
                <div className="w-32 text-right font-mono text-emerald-800 font-black text-sm">{formatINR(plReportData.grossProfitVal)}</div>
              </div>

              {/* Group 3: Surcharges & Misc other gains */}
              <div className="bg-slate-50/50 p-2.5 font-bold text-slate-800 uppercase tracking-wider text-[10px] border-b border-slate-200">
                3. Subsidiary Incomes & Dynamic Surcharges
              </div>
              <div className="flex p-3 border-b border-slate-100 font-sans">
                <div className="flex-1 pl-4 text-slate-700">Custom Shipping/Loading surcharges sum collected from customers</div>
                <div className="w-32 text-right text-slate-400">-</div>
                <div className="w-32 text-right font-mono text-slate-950">{formatINR(plReportData.salesAdditionalSurcharges)}</div>
              </div>
              <div className="flex p-3 border-b border-slate-100 font-sans">
                <div className="flex-1 pl-4 text-slate-700">Independent miscellaneous cash/bank business receipts</div>
                <div className="w-32 text-right text-slate-400">-</div>
                <div className="w-32 text-right font-mono text-slate-950">{formatINR(plReportData.otherMiscIncomes)}</div>
              </div>
              <div className="flex p-3 border-b border-slate-200 font-sans text-rose-800 bg-rose-50/15">
                <div className="flex-1 pl-4 font-medium">LESS: Extra delivery/packaging fees paid to wholesalers</div>
                <div className="w-32 text-right font-mono text-rose-700">{formatINR(plReportData.purchaseAdditionalSurcharges)}</div>
                <div className="w-32 text-right text-slate-400">-</div>
              </div>

              {/* Group 4: Indirect overhead expenditures */}
              {plReportData.totalMiscExpenses > 0 && (
                <>
                  <div className="bg-slate-55 p-2.5 font-bold text-slate-800 uppercase tracking-wider text-[10px] border-b border-slate-200">
                    4. General Indirect Operating Expenditures (Overheads)
                  </div>
                  {Object.entries(plReportData.expenseBreakdown).map(([category, amount]) => (
                    <div key={category} className="flex p-3 border-b border-slate-100 font-sans">
                      <div className="flex-1 pl-4 text-slate-650 font-medium lowercase first-letter:uppercase">{category} costs</div>
                      <div className="w-32 text-right font-mono text-slate-700">{formatINR(amount as number)}</div>
                      <div className="w-32 text-right text-slate-400">-</div>
                    </div>
                  ))}
                  <div className="flex p-3 border-b border-slate-200 font-bold bg-slate-50">
                    <div className="flex-1 text-slate-900 pl-4 uppercase text-[10px]">Aggregate Operating Overhead</div>
                    <div className="w-32 text-right font-mono text-slate-950 font-extrabold underline">{formatINR(plReportData.totalMiscExpenses)}</div>
                    <div className="w-32 text-right text-slate-400">-</div>
                  </div>
                </>
              )}

              {/* TAX LIABILITY FOR INFORMATION (Double underline, does not hit direct cost) */}
              <div className="bg-amber-50/20 text-amber-900 p-3 flex border-b border-slate-200 font-sans text-[11px] items-center italic">
                <span className="flex-1 font-bold">Government Tax Liability Indicator (For reference, excluded from P&L net score):</span>
                <span className="font-mono">Output GST Paid: {formatINR(plReportData.grossProfitVal * 0.18)} (Est.) | Net output-input balance to settle</span>
              </div>

              {/* BOTTOM LINE NET EARNED STATEMENT */}
              <div className={`p-4 flex text-white font-sans font-black text-sm tracking-wide ${plReportData.netPLVal >= 0 ? "bg-emerald-600" : "bg-rose-600"}`}>
                <span className="flex-1 uppercase">Dynamic Consolidated Net Profit / (Loss)</span>
                <span id="overall-pl-net-badge" className="font-mono text-base border-b-2 border-white">{formatINR(plReportData.netPLVal)}</span>
              </div>
            </div>
          </div>

          {/* Quick statement details footer card */}
          {plReportData.netPLVal >= 0 ? (
            <div className="bg-emerald-50 border border-emerald-250 p-4 rounded-xl flex items-start space-x-3 text-emerald-900 text-xs shadow-xs animate-fadeIn">
              <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Outstanding Performance Recorded</span>
                <p className="mt-0.5 text-emerald-800 leading-relaxed font-sans">
                  The enterprise is currently performing on positive net surpluses of **{formatINR(plReportData.netPLVal)}**! High trading turnover is contributing stable operational growth while net business costs/discounts are kept under strategic limits.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-rose-55 border border-rose-250 p-4 rounded-xl flex items-start space-x-3 text-rose-900 text-xs shadow-xs">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Operational Deficit / Outflow Warning</span>
                <p className="mt-0.5 text-rose-800 leading-relaxed font-sans font-medium">
                  The enterprise is presently experiencing a fiscal deficit of **{formatINR(plReportData.netPLVal)}**. Consider reviewing the cost of wholesale purchase supplies, maximizing discounts from wholesalers, or curtailing indirect expense categories to re-establish capital sanity.
                </p>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* Tab: GSTR-1 (Sales schedules) */}
      {/* ======================================================== */}
      {reportSubTab === "gstr1" && (
        <div id="re-gstr1" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white border border-slate-150 p-4 rounded-xl shadow-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Gross Booked Sales</span>
              <span className="font-sans font-black text-xl mt-1 block text-slate-800 font-mono">{formatINR(gstr1Details.totalSalesTurnover)}</span>
              <p className="text-[10px] text-slate-500 mt-2 font-mono">{gstr1Details.salesCount} sale invoices recorded</p>
            </div>
            
            <div className="bg-white border border-slate-150 p-4 rounded-xl shadow-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Net Taxable Value</span>
              <span className="font-sans font-black text-xl mt-1 block text-slate-800 font-mono">{formatINR(gstr1Details.totalTaxableTurnover)}</span>
              <p className="text-[10px] text-slate-500 mt-2 font-mono">Excludes all aggregate levies</p>
            </div>

            <div className="bg-white border border-slate-150 p-4 rounded-xl shadow-xs bg-emerald-50/10">
              <span className="text-[10px] text-emerald-600 font-bold uppercase block tracking-wider">Aggregate GST liability</span>
              <span className="font-sans font-black text-xl mt-1 block text-emerald-800 font-mono">{formatINR(gstr1Details.totalTaxLiability)}</span>
              <div className="text-[10px] text-slate-500 mt-2 font-mono flex items-center justify-between">
                <span>CGST+SGST: {formatINR(gstr1Details.totalCgstLiability * 2)}</span>
                <span>IGST: {formatINR(gstr1Details.totalIgstLiability)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-150 rounded-xl shadow-sm p-5 space-y-6">
            <div>
              <div className="border-b border-indigo-100 pb-2 mb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-indigo-900 text-sm">Schedule 4A: B2B Supplies (Registered parties)</h3>
                  <p className="text-[10px] text-slate-400">Outward taxable supplies made to registered business entities in possession of a valid GSTIN</p>
                </div>
                <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black py-0.5 px-2 rounded-full font-mono">
                  {gstr1Details.b2bSales.length} Entries
                </span>
              </div>

              {gstr1Details.b2bSales.length === 0 ? (
                <div className="py-6 text-center text-[11px] text-slate-404 italic">No outward registered B2B transactions catalogued.</div>
              ) : (
                <table className="w-full text-left text-[11px] font-mono border-collapse bg-white">
                  <thead>
                    <tr className="bg-indigo-55 text-indigo-900 font-bold border-b border-indigo-100">
                      <th className="py-2 px-3">Inv Number</th>
                      <th className="py-2 px-2">Recipient Name</th>
                      <th className="py-2 px-2 text-center">GSTIN</th>
                      <th className="py-2 px-2 text-right">Taxable Val</th>
                      <th className="py-2 px-2 text-right">CGST</th>
                      <th className="py-2 px-2 text-right">SGST</th>
                      <th className="py-2 px-2 text-right">IGST</th>
                      <th className="py-2 px-3 text-right">Total Invoice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gstr1Details.b2bSales.map(inv => (
                      <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50/20">
                        <td className="py-2 px-3 font-bold">{inv.invoiceNumber}</td>
                        <td className="py-2 px-2 font-sans">{inv.partyName}</td>
                        <td className="py-2 px-2 text-center font-bold text-slate-800">{inv.partyGstin}</td>
                        <td className="py-2 px-2 text-right">{inv.subtotal.toFixed(2)}</td>
                        <td className="py-2 px-2 text-right text-slate-500">{inv.cgstTotal.toFixed(2)}</td>
                        <td className="py-2 px-2 text-right text-slate-500">{inv.sgstTotal.toFixed(2)}</td>
                        <td className="py-2 px-2 text-right text-slate-500">{inv.igstTotal.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">{inv.totalAmount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100">
              <div className="border-b border-amber-100 pb-2 mb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-amber-900 text-sm font-sans">Schedule 5: B2C Supplies (Unregistered consumers)</h3>
                  <p className="text-[10px] text-slate-400">Outward taxable supplies made to consumers who do not possess a valid GSTIN.</p>
                </div>
                <span className="bg-amber-50 text-amber-700 text-[10px] font-black py-0.5 px-2 rounded-full font-mono">
                  {gstr1Details.b2cSales.length} Entries
                </span>
              </div>

              {gstr1Details.b2cSales.length === 0 ? (
                <div className="py-6 text-center text-[11px] text-slate-404 italic font-medium">No registered retail B2C transactions recorded.</div>
              ) : (
                <table className="w-full text-left text-[11px] font-mono border-collapse">
                  <thead>
                    <tr className="bg-amber-55 text-amber-900 font-bold border-b border-amber-100">
                      <th className="py-2 px-3">Inv Number</th>
                      <th className="py-2 px-2">Consumer</th>
                      <th className="py-2 px-2 text-right">Taxable Val</th>
                      <th className="py-2 px-2 text-right">CGST</th>
                      <th className="py-2 px-2 text-right">SGST</th>
                      <th className="py-2 px-2 text-right">IGST</th>
                      <th className="py-2 px-3 text-right">Total Invoice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gstr1Details.b2cSales.map(inv => (
                      <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50/20">
                        <td className="py-2 px-3 font-bold">{inv.invoiceNumber}</td>
                        <td className="py-2 px-2 font-sans text-slate-500 italic">Walk-in retail buyer</td>
                        <td className="py-2 px-2 text-right">{inv.subtotal.toFixed(2)}</td>
                        <td className="py-2 px-2 text-right text-slate-500">{inv.cgstTotal.toFixed(2)}</td>
                        <td className="py-2 px-2 text-right text-slate-500">{inv.sgstTotal.toFixed(2)}</td>
                        <td className="py-2 px-2 text-right text-slate-500">{inv.igstTotal.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">{inv.totalAmount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Tab: GSTR-2 (Purchases schedules) */}
      {/* ======================================================== */}
      {reportSubTab === "gstr2" && (
        <div id="re-gstr2" className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white border border-slate-150 p-4 rounded-xl shadow-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Gross purchases value</span>
              <span className="font-sans font-black text-xl mt-1 block text-slate-800 font-mono">{formatINR(gstr2Details.totalProcurement)}</span>
              <p className="text-[10px] text-slate-500 mt-2 font-mono">{gstr2Details.purchasesCount} wholesale purchase bills logged</p>
            </div>
            
            <div className="bg-white border border-slate-150 p-4 rounded-xl shadow-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Taxable supplies</span>
              <span className="font-sans font-black text-xl mt-1 block text-slate-800 font-mono">{formatINR(gstr2Details.totalTaxableValue)}</span>
              <p className="text-[10px] text-slate-500 mt-2 font-mono">Excludes ITC credits</p>
            </div>

            <div className="bg-white border border-slate-150 p-4 rounded-xl shadow-xs bg-purple-50/10">
              <span className="text-[10px] text-purple-600 font-bold uppercase block tracking-wider">Input Tax Credit (ITC) Available</span>
              <span className="font-sans font-black text-xl mt-1 block text-purple-800 font-mono">{formatINR(gstr2Details.totalInputTaxCredit)}</span>
              <div className="text-[10px] text-slate-500 mt-2 font-mono flex items-center justify-between">
                <span>ITC CGST+SGST: {formatINR(gstr2Details.totalCgstCredit * 2)}</span>
                <span>ITC IGST: {formatINR(gstr2Details.totalIgstCredit)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-150 rounded-xl shadow-sm p-5">
            <div className="border-b border-purple-100 pb-2 mb-3.5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-purple-900 text-sm font-sans">Schedule 3: Input Tax Credit (ITC) on Inward Supplies</h3>
                <p className="text-[10px] text-slate-400">Input Tax Credit claims available on taxable purchases from registered suppliers.</p>
              </div>
              <span className="bg-purple-50 text-purple-700 text-[10px] font-black py-0.5 px-2 rounded-full font-mono">
                {gstr2Details.purchaseBills.length} bills
              </span>
            </div>

            {gstr2Details.purchaseBills.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <FileCheck2 className="w-12 h-12 text-slate-120 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-slate-600">No procurement invoice/bill recorded to claim Input Tax Credit.</p>
              </div>
            ) : (
              <table className="w-full text-left text-[11px] font-mono border-collapse">
                <thead>
                  <tr className="bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold border-b border-purple-100">
                    <th className="py-2.5 px-3">Bill Number</th>
                    <th className="py-2.5 px-2">Supplier Name</th>
                    <th className="py-2.5 px-2 text-center">Supplier GSTIN</th>
                    <th className="py-2.5 px-2 text-right">Taxable Val</th>
                    <th className="py-2.5 px-2 text-right">C-ITC</th>
                    <th className="py-2.5 px-2 text-right">S-ITC</th>
                    <th className="py-2.5 px-2 text-right">I-ITC</th>
                    <th className="py-2.5 px-3 text-right">Total Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {gstr2Details.purchaseBills.map(inv => (
                    <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50/20">
                      <td className="py-2.5 px-3 font-bold text-slate-800">{inv.invoiceNumber}</td>
                      <td className="py-2.5 px-2 font-sans">{inv.partyName}</td>
                      <td className="py-2.5 px-2 text-center text-slate-700">{inv.partyGstin || "Unregistered Supplier"}</td>
                      <td className="py-2.5 px-2 text-right">{inv.subtotal.toFixed(2)}</td>
                      <td className="py-2.5 px-2 text-right font-bold text-purple-700">{inv.cgstTotal.toFixed(2)}</td>
                      <td className="py-2.5 px-2 text-right font-bold text-purple-700">{inv.sgstTotal.toFixed(2)}</td>
                      <td className="py-2.5 px-2 text-right font-bold text-purple-700">{inv.igstTotal.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">{inv.totalAmount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
