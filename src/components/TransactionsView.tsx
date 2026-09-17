/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { MiscTransaction, BusinessProfile } from "../types.js";
import { useDialog } from "../context/DialogContext.js";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Filter,
  Calendar,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Printer,
  X,
  IndianRupee,
  RefreshCw,
  FolderOpen,
  ArrowUpRight,
  ArrowDownLeft,
  BookOpen
} from "lucide-react";

interface TransactionsViewProps {
  transactions: MiscTransaction[];
  business: BusinessProfile;
  onSaveTransaction: (tx: MiscTransaction) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
  permissions?: any;
}

const EXPENSE_CATEGORIES = [
  "Tea & Snacks",
  "Staff Salary",
  "Shop Rent",
  "Electricity Bill",
  "Internet & Phone",
  "Stationery & Printing",
  "Logistics & Courier",
  "Repairs & Maintenance",
  "Misc Expense"
];

const INCOME_CATEGORIES = [
  "Interest Received",
  "Commission Received",
  "Rent Received",
  "Scrap/Raddi Sale",
  "Gift or Reward",
  "Misc Income"
];

export default function TransactionsView({
  transactions = [],
  business,
  onSaveTransaction,
  onDeleteTransaction,
  permissions
}: TransactionsViewProps) {
  
  const perms = permissions || { view: true, create: true, update: true, delete: true };
  const { showConfirm, showAlert } = useDialog();
  
  // Search and filter states
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [filterPayment, setFilterPayment] = useState<"all" | "cash" | "bank">("all");
  const [dateRange, setDateRange] = useState<"all" | "today" | "thisMonth" | "custom">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // CRUD modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<MiscTransaction | null>(null);

  // Form states
  const [formType, setFormType] = useState<"income" | "expense">("expense");
  const [formCategory, setFormCategory] = useState("");
  const [formAmount, setFormAmount] = useState<number | "">("");
  const [formPaymentType, setFormPaymentType] = useState<"cash" | "bank">("cash");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [formNotes, setFormNotes] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  // Print Preview state
  const [isPrintPreview, setIsPrintPreview] = useState(false);

  // Stats
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    transactions.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === "income") {
        income += amt;
      } else {
        expense += amt;
      }
    });
    return {
      totalIncome: income,
      totalExpense: expense,
      netBalance: income - expense
    };
  }, [transactions]);

  // Open modal for Add
  const handleOpenAdd = () => {
    setEditingTransaction(null);
    setFormType("expense");
    setFormCategory(EXPENSE_CATEGORIES[0]);
    setFormAmount("");
    setFormPaymentType("cash");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormNotes("");
    setIsCustomCategory(false);
    setCustomCategory("");
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (tx: MiscTransaction) => {
    setEditingTransaction(tx);
    setFormType(tx.type);
    
    const categories = tx.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    if (categories.includes(tx.category)) {
      setFormCategory(tx.category);
      setIsCustomCategory(false);
    } else {
      setFormCategory("other");
      setIsCustomCategory(true);
      setCustomCategory(tx.category);
    }
    
    setFormAmount(tx.amount);
    setFormPaymentType(tx.paymentType);
    setFormDate(tx.date);
    setFormNotes(tx.notes);
    setIsModalOpen(true);
  };

  // Handle Form submitting
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(formAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      await showAlert({
        title: "अवैध रक्कम (Invalid Amount)",
        message: "कृपया शून्यपेक्षा जास्त वैध रक्कम टाका (Amount must be greater than zero).",
        variant: "warning"
      });
      return;
    }

    const finalCategory = isCustomCategory ? customCategory.trim() : formCategory;
    if (!finalCategory.trim()) {
      await showAlert({
        title: "कॅटेगरी आवश्यक (Category Required)",
        message: "कृपया योग्य कॅटेगरी निवडा किंवा टाका (Please select or enter category).",
        variant: "warning"
      });
      return;
    }

    const payload: MiscTransaction = {
      id: editingTransaction?.id || "",
      type: formType,
      category: finalCategory,
      amount: amountNum,
      paymentType: formPaymentType,
      date: formDate,
      notes: formNotes.trim()
    };

    await onSaveTransaction(payload);
    setIsModalOpen(false);
  };

  // Handle deletion
  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm({
      title: "व्यवहार नोंद हटवा (Delete Transaction)",
      message: "तुम्हाला खात्री आहे का ही उत्पन्न/खर्च व्यवहार नोंद कायमची हटवायची आहे?",
      confirmText: "नोंद हटवा",
      variant: "danger"
    });
    if (confirmed) {
      await onDeleteTransaction(id);
    }
  };

  // Quick switch of transaction type in form (sync categories)
  const handleFormTypeChange = (type: "income" | "expense") => {
    setFormType(type);
    const defaultCat = type === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0];
    setFormCategory(defaultCat);
    setIsCustomCategory(false);
    setCustomCategory("");
  };

  // Filters computed logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Type filter
      if (filterType !== "all" && t.type !== filterType) return false;

      // Payment filter
      if (filterPayment !== "all" && t.paymentType !== filterPayment) return false;

      // Search match (category or notes)
      if (searchText.trim()) {
        const query = searchText.toLowerCase();
        const catMatch = t.category.toLowerCase().includes(query);
        const notesMatch = t.notes.toLowerCase().includes(query);
        if (!catMatch && !notesMatch) return false;
      }

      // Date Range filter
      if (dateRange === "today") {
        const today = new Date().toISOString().split("T")[0];
        if (t.date !== today) return false;
      } else if (dateRange === "thisMonth") {
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        if (!t.date.startsWith(currentMonth)) return false;
      } else if (dateRange === "custom") {
        if (startDate && t.date < startDate) return false;
        if (endDate && t.date > endDate) return false;
      }

      return true;
    }).sort((a, b) => b.date.localeCompare(a.date)); // Sort by date descending
  }, [transactions, searchText, filterType, filterPayment, dateRange, startDate, endDate]);

  // Aggregate stats of filtered transactions
  const filteredStats = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === "income") {
        income += amt;
      } else {
        expense += amt;
      }
    });
    return {
      income,
      expense,
      net: income - expense
    };
  }, [filteredTransactions]);

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="v-transactions-page" className="space-y-6">
      
      {/* View Title */}
      <div className="pb-3 border-b border-slate-100 flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Miscellaneous Transactions Cash Book</h1>
          <p className="text-xs text-slate-500 mt-1">Track off-ledger business expenses (Staff, Rent, refreshments) and auxiliary incomes with immediate tax and ledger isolation</p>
        </div>
        <div className="flex items-center space-x-2.5">
          <button
            id="print-tx-ledger-btn"
            onClick={() => setIsPrintPreview(!isPrintPreview)}
            className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2 px-3.5 rounded-lg text-xs flex items-center space-x-2 shadow-sm transition cursor-pointer select-none"
          >
            <Printer className="w-4 h-4" />
            <span>{isPrintPreview ? "Back to Ledger View" : "Generate Report / Print"}</span>
          </button>
          {perms.create && (
            <button
              id="add-tx-btn"
              onClick={handleOpenAdd}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg text-xs tracking-wide uppercase shadow hover:shadow-md transition flex items-center space-x-2 cursor-pointer select-none"
            >
              <Plus className="w-4.5 h-4.5" />
              <span>Record New cash Entry</span>
            </button>
          )}
        </div>
      </div>

      {isPrintPreview ? (
        /* ==================== PRINT PREVIEW REPORT ==================== */
        <div id="tx-report-print-sheet" className="bg-white border border-slate-300 rounded-xl p-8 max-w-4xl mx-auto shadow-md">
          {/* Print/Back Action Header */}
          <div className="print:hidden pb-4 mb-6 border-b border-slate-150 flex items-center justify-between bg-amber-50 p-4 rounded-lg text-xs text-amber-900">
            <span className="font-semibold">⚠️ Print margins will reflect perfectly on a standard A4 sheet portrait scale.</span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsPrintPreview(false)}
                className="bg-slate-200 hover:bg-slate-300 px-3 py-1.5 rounded text-slate-850 font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handlePrint}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded font-bold flex items-center space-x-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Report</span>
              </button>
            </div>
          </div>

          {/* Official Business Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-350 pb-6 mb-6">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                {business.logoUrl && (
                  <img
                    src={business.logoUrl}
                    referrerPolicy="no-referrer"
                    alt="Store Logo"
                    className="w-12 h-12 object-contain bg-white rounded border border-slate-150 p-0.5 inline-block mr-1"
                  />
                )}
                <h2 className="text-xl font-extrabold text-slate-900">{business.name}</h2>
              </div>
              <p className="text-xs text-slate-500 font-semibold">{business.address}</p>
              <p className="text-[10px] text-slate-450 font-mono">
                {business.phone && `Phone: ${business.phone}`} {business.email && `• Email: ${business.email}`}
              </p>
              <p className="text-[10px] text-slate-450 font-mono font-bold">
                STATE CODE PLACE OF SUPPLY: {business.state.toUpperCase()}
              </p>
            </div>
            {business.gstin && (
              <div className="text-right">
                <span className="px-2.5 py-1 bg-slate-100 rounded text-[10px] font-mono font-bold text-slate-800 tracking-wide border border-slate-200">
                  GSTIN: {business.gstin.toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Report Title Banner */}
          <div className="text-center mb-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-705 border-b border-slate-200 pb-2">Miscellaneous Cash Book Ledger Journal</h3>
            <div className="flex justify-center space-x-6 text-[11px] text-slate-500 mt-2 font-mono">
              <span>Generate Date: {new Date().toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
              <span>• Filters applied: Type: {filterType.toUpperCase()}, Mode: {filterPayment.toUpperCase()}</span>
            </div>
          </div>

          {/* Ledger Stats Summary metrics */}
          <div className="grid grid-cols-3 gap-4 border-2 border-slate-200 rounded-lg p-3 bg-slate-50/50 mb-6 text-center">
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase">Filtered Receipts (+)</p>
              <p className="text-sm font-extrabold text-emerald-600 font-mono">₹ {filteredStats.income.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase">Filtered Disbursements (-)</p>
              <p className="text-sm font-extrabold text-rose-600 font-mono">₹ {filteredStats.expense.toLocaleString()}</p>
            </div>
            <div className="border-l border-slate-200">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Net Flow Balance</p>
              <p className={`text-sm font-extrabold font-mono ${filteredStats.net >= 0 ? "text-slate-800" : "text-rose-700"}`}>
                ₹ {filteredStats.net.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Table list */}
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[9px] border-b-2 border-slate-300">
                <th className="py-2.5 px-3 font-bold">Date</th>
                <th className="py-2.5 px-3 font-bold">Category</th>
                <th className="py-2.5 px-3 font-bold">Mode</th>
                <th className="py-2.5 px-3 font-bold">Notes</th>
                <th className="py-2.5 px-3 text-right font-bold">Receipt (IN)</th>
                <th className="py-2.5 px-3 text-right font-bold">Payment (OUT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400 font-mono">No matching journal cash entries found for current selection.</td>
                </tr>
              ) : (
                filteredTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 font-mono">
                    <td className="py-2 px-3 text-slate-750 font-semibold">{t.date}</td>
                    <td className="py-2 px-3 text-slate-900 font-bold font-sans">{t.category}</td>
                    <td className="py-2 px-3 text-[10px] text-slate-500 uppercase">{t.paymentType}</td>
                    <td className="py-2 px-3 text-slate-500 font-sans italic max-w-xs truncate">{t.notes || "-"}</td>
                    <td className="py-2 px-3 text-right text-emerald-600 font-bold">
                      {t.type === "income" ? `+ ₹${t.amount.toLocaleString()}` : "-"}
                    </td>
                    <td className="py-2 px-3 text-right text-rose-600 font-bold">
                      {t.type === "expense" ? `- ₹${t.amount.toLocaleString()}` : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Signatory blocks */}
          <div className="mt-14 flex justify-between text-slate-700 font-sans text-[10px]">
            <div>
              <p className="font-bold border-t border-slate-300 pt-1 text-center w-36">Audited / Checked By</p>
            </div>
            <div className="text-right">
              {business.signatureText && (
                <p className="font-mono text-slate-500 mb-6 italic">{business.signatureText}</p>
              )}
              <p className="font-bold border-t border-slate-300 pt-1 text-center w-40 inline-block">Authorized Signature</p>
            </div>
          </div>
        </div>
      ) : (
        /* ==================== CORE JOURNAL DASHBOARD ==================== */
        <>
          {/* Top Aggregated Balance metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Total Incomes card */}
            <div className="bg-white border border-slate-150 rounded-xl p-5 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Aux Incomes</span>
                  <span className="text-xl font-extrabold text-teal-600 font-mono tracking-tight">₹ {stats.totalIncome.toLocaleString()}</span>
                </div>
                <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 text-[10px] text-slate-400 font-mono leading-none flex items-center space-x-1">
                <TrendingUp className="w-3.5 h-3.5 text-teal-500" />
                <span>Auxiliary retail entries</span>
              </div>
            </div>

            {/* Total Expenses card */}
            <div className="bg-white border border-slate-150 rounded-xl p-5 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Cash Expenses</span>
                  <span className="text-xl font-extrabold text-rose-600 font-mono tracking-tight">₹ {stats.totalExpense.toLocaleString()}</span>
                </div>
                <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 text-[10px] text-slate-400 font-mono leading-none flex items-center space-x-1">
                <TrendingDown className="w-3.5 h-3.5 text-rose-450" />
                <span>Tea snacks, salaries, rent ledger</span>
              </div>
            </div>

            {/* In-Hand Balance card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Net Cash Book Flow</span>
                  <span className={`text-xl font-extrabold font-mono tracking-tight ${stats.netBalance >= 0 ? "text-slate-50" : "text-rose-400"}`}>
                    ₹ {stats.netBalance.toLocaleString()}
                  </span>
                </div>
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 text-[10px] text-slate-400 font-mono leading-none">
                <span>Total Net Profit/Loss impact statement</span>
              </div>
            </div>
          </div>

          {/* Search, filters & Ledger table layout */}
          <div className="bg-white border border-slate-205 rounded-xl p-5 shadow-sm space-y-4">
            
            {/* Advanced Filters section */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              {/* Search text */}
              <div className="relative flex-1 max-w-md">
                <input
                  id="tx-search-input"
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search cash book categories, comments, descriptions..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 focus:border-emerald-550 rounded-lg text-xs outline-none bg-slate-50/50"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap items-center gap-3.5 text-xs">
                {/* Type Filter dropdown */}
                <div className="flex items-center space-x-1.5 p-1 bg-slate-50 border border-slate-200 rounded-lg">
                  <button
                    onClick={() => setFilterType("all")}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition ${filterType === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
                  >
                    All Entries
                  </button>
                  <button
                    id="filter-type-income-btn"
                    onClick={() => setFilterType("income")}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase flex items-center space-x-1 transition ${filterType === "income" ? "bg-teal-500 text-white shadow-sm font-extrabold" : "text-slate-500"}`}
                  >
                    <ArrowUpRight className="w-3 h-3" />
                    <span>Incomes</span>
                  </button>
                  <button
                    id="filter-type-expense-btn"
                    onClick={() => setFilterType("expense")}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase flex items-center space-x-1 transition ${filterType === "expense" ? "bg-rose-500 text-white shadow-sm font-extrabold" : "text-slate-500"}`}
                  >
                    <ArrowDownLeft className="w-3 h-3" />
                    <span>Expenses</span>
                  </button>
                </div>

                {/* Mode FilterDropdown */}
                <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 p-1 rounded-lg">
                  <button
                    onClick={() => setFilterPayment("all")}
                    className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold ${filterPayment === "all" ? "bg-white text-slate-850 shadow-sm" : "text-slate-500"}`}
                  >
                    All Modes
                  </button>
                  <button
                    onClick={() => setFilterPayment("cash")}
                    className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold flex items-center space-x-1 ${filterPayment === "cash" ? "bg-white text-slate-850 shadow-sm" : "text-slate-500"}`}
                  >
                    <Wallet className="w-3 h-3" />
                    <span>Cash</span>
                  </button>
                  <button
                    onClick={() => setFilterPayment("bank")}
                    className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold flex items-center space-x-1 ${filterPayment === "bank" ? "bg-white text-slate-850 shadow-sm" : "text-slate-500"}`}
                  >
                    <CreditCard className="w-3 h-3" />
                    <span>Bank</span>
                  </button>
                </div>

                {/* Date Dropdown */}
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as any)}
                  className="px-2 py-1.5 border border-slate-200 focus:border-emerald-500 bg-white outline-none rounded-lg text-xs"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today Only</option>
                  <option value="thisMonth">This Month</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>
            </div>

            {/* Custom Dates Input Drawer if selected */}
            {dateRange === "custom" && (
              <div className="p-3 bg-slate-50 border border-slate-10 border-dashed rounded-lg flex items-center space-x-4 animate-fadeIn">
                <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="flex items-center space-x-2.5 text-xs text-slate-650">
                  <span>Start Date:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border border-slate-200 px-2 py-1 rounded-md bg-white outline-none"
                  />
                  <span>to</span>
                  <span>End Date:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border border-slate-200 px-2 py-1 rounded-md bg-white outline-none"
                  />
                </div>
                <button
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                    setDateRange("all");
                  }}
                  className="text-slate-400 hover:text-rose-500 text-xs font-bold leading-none cursor-pointer"
                >
                  Clear range
                </button>
              </div>
            )}

            {/* Ledger entries statistics line */}
            <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-50 pb-2">
              <span className="font-semibold">{filteredTransactions.length} transaction entries found based on filters</span>
              <div className="flex items-center space-x-3 text-[11px] font-mono">
                <span className="text-teal-600 font-bold">IN: ₹{filteredStats.income}</span>
                <span className="text-rose-600 font-bold">OUT: ₹{filteredStats.expense}</span>
                <span className={`font-extrabold ${filteredStats.net >= 0 ? "text-slate-800" : "text-rose-600"}`}>
                  NET: ₹{filteredStats.net}
                </span>
              </div>
            </div>

            {/* Core Ledger list Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-150 py-2">
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Receipt Date</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Record Type</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Sub-Category</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Payment Mode</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase">Official notes</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase text-right">Cash Amount (₹)</th>
                    <th className="py-3 px-4 font-bold text-[10px] uppercase text-center print:hidden">Operation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400 font-medium">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <FolderOpen className="w-8 h-8 text-slate-300" />
                          <p>No transactions found for the selection filters.</p>
                          <button
                            onClick={handleOpenAdd}
                            className="text-emerald-600 hover:underline font-bold text-xs"
                          >
                            + Click here to add your very first entry
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50/55 transition items-center">
                        <td className="py-3 px-4 text-slate-650 font-mono font-semibold">{t.date}</td>
                        <td className="py-3 px-4">
                          {t.type === "income" ? (
                            <span className="inline-flex items-center space-x-1 bg-teal-50 text-teal-850 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              <ArrowUpRight className="w-3 h-3" />
                              <span>INCOME</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 bg-rose-50 text-rose-850 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              <ArrowDownLeft className="w-3 h-3" />
                              <span>EXPENSE</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">{t.category}</td>
                        <td className="py-3 px-4 uppercase text-slate-500 font-mono text-[10px]">
                          {t.paymentType === "cash" ? (
                            <span className="inline-flex items-center space-x-1 text-slate-650">
                              <Wallet className="w-3 h-3 text-slate-400" />
                              <span>Cash</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-slate-650">
                              <CreditCard className="w-3 h-3 text-slate-404" />
                              <span>Bank</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500 truncate max-w-xs" title={t.notes}>
                          {t.notes || <span className="text-slate-300 italic">No description</span>}
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold font-mono">
                          <span className={t.type === "income" ? "text-teal-600" : "text-rose-600"}>
                            {t.type === "income" ? "+" : "-"} ₹ {t.amount.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center print:hidden">
                          <div className="flex items-center justify-center space-x-2">
                            {perms.update && (
                              <button
                                id={`edit-tx-${t.id}-btn`}
                                onClick={() => handleOpenEdit(t)}
                                className="p-1 px-1.5 border border-slate-200 hover:border-slate-350 hover:bg-white text-slate-550 hover:text-slate-800 rounded-md transition cursor-pointer"
                                title="Edit transaction record"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {perms.delete && (
                              <button
                                id={`delete-tx-${t.id}-btn`}
                                onClick={() => handleDelete(t.id)}
                                className="p-1 px-1.5 border border-slate-200 hover:border-rose-400 hover:bg-rose-50 text-slate-450 hover:text-rose-650 rounded-md transition cursor-pointer"
                                title="Delete transaction record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </>
      )}

      {/* ==================== CREATE / EDIT MODAL DRAWER ==================== */}
      {isModalOpen && (
        <div id="tx-modal" className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white border border-slate-300 rounded-xl max-w-md w-full shadow-xl overflow-hidden animate-scaleIn">
            
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingTransaction ? "Edit Transaction Register Entry" : "Record Cash Book Entries"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-5 space-y-4">
              
              {/* Type toggle: Income (+in) / Expense (-out) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Entry Mode</label>
                <div className="grid grid-cols-2 gap-2.5 p-1 bg-slate-100 rounded-lg">
                  <button
                    id="modal-type-expense-btn"
                    type="button"
                    onClick={() => handleFormTypeChange("expense")}
                    className={`py-2 rounded-md text-xs font-bold transition flex items-center justify-center space-x-1 cursor-pointer select-none ${formType === "expense" ? "bg-rose-500 text-white shadow-sm" : "text-slate-650 hover:bg-slate-200"}`}
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>Business Expense (-)</span>
                  </button>
                  <button
                    id="modal-type-income-btn"
                    type="button"
                    onClick={() => handleFormTypeChange("income")}
                    className={`py-2 rounded-md text-xs font-bold transition flex items-center justify-center space-x-1 cursor-pointer select-none ${formType === "income" ? "bg-teal-500 text-white shadow-sm" : "text-slate-650 hover:bg-slate-200"}`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Auxiliary Income (+)</span>
                  </button>
                </div>
              </div>

              {/* Amount side-by-side with date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-1.5 label-required font-sans">Amount in ₹</label>
                  <div className="relative">
                    <input
                      id="tx-amount-input"
                      type="number"
                      required
                      min={1}
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="Amount ₹"
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none font-bold font-mono"
                    />
                    <div className="absolute left-3 top-2.5 text-slate-400">
                      <IndianRupee className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-1.5 label-required">Date</label>
                  <input
                    id="tx-date-input"
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none font-mono"
                  />
                </div>
              </div>

              {/* Category Dropdown */}
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-1.5 label-required">Sub-Category</label>
                <div className="flex items-center space-x-2">
                  <select
                    id="tx-category-select"
                    value={isCustomCategory ? "other" : formCategory}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "other") {
                        setIsCustomCategory(true);
                        setFormCategory("other");
                        setCustomCategory("");
                      } else {
                        setIsCustomCategory(false);
                        setFormCategory(val);
                      }
                    }}
                    className="w-full px-2.5 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs bg-white outline-none"
                  >
                    {formType === "income" ? (
                      <>
                        {INCOME_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </>
                    ) : (
                      <>
                        {EXPENSE_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </>
                    )}
                    <option value="other">✍️ Write Other Category...</option>
                  </select>
                </div>

                {/* Custom Category input box */}
                {isCustomCategory && (
                  <input
                    id="tx-custom-category-input"
                    type="text"
                    required
                    maxLength={35}
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Enter custom category name..."
                    className="w-full mt-2 px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none font-bold"
                  />
                )}
              </div>

              {/* Payment Type Toggle */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Cash Type</label>
                <div className="grid grid-cols-2 gap-2 border border-slate-200 p-1 bg-slate-50/50 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setFormPaymentType("cash")}
                    className={`py-1.5 rounded-md flex items-center justify-center space-x-1.5 font-bold transition select-none cursor-pointer ${formPaymentType === "cash" ? "bg-slate-900 text-white" : "text-slate-500"}`}
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>In-Hand Cash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormPaymentType("bank")}
                    className={`py-1.5 rounded-md flex items-center justify-center space-x-1.5 font-bold transition select-none cursor-pointer ${formPaymentType === "bank" ? "bg-slate-900 text-white" : "text-slate-500"}`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Bank Transfer / UPI</span>
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-1.5">Official details or comments</label>
                <textarea
                  id="tx-notes-input"
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Paid sweet packet boxes for VIP visitor checks..."
                  className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:border-slate-350 hover:bg-slate-50 font-bold rounded-lg text-xs tracking-wide text-slate-750 select-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="save-tx-modal-btn"
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs tracking-wide shadow-sm hover:shadow transition select-none cursor-pointer"
                >
                  <span>{editingTransaction ? "Save Changes" : "Commit entry"}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
