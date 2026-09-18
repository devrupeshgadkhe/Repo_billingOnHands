/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from "react";
import { Item, Party, Invoice } from "../types.js";
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  Package,
  AlertOctagon,
  ArrowRight,
  TrendingDown,
  CalendarDays
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

interface DashboardViewProps {
  items: Item[];
  parties: Party[];
  invoices: Invoice[];
  onNavigateTab: (tab: string) => void;
  onOpenInvoice: (invoice: Invoice) => void;
}

export default function DashboardView({
  items,
  parties,
  invoices,
  onNavigateTab,
  onOpenInvoice
}: DashboardViewProps) {
  
  // Format Indian Rupees (e.g. ₹1,50,000.00)
  const formatRupees = (num: number) => {
    const formatted = parseFloat((num || 0).toFixed(2));
    return "₹" + formatted.toLocaleString("en-IN", { minimumFractionDigits: 2 });
  };

  // Compute standard KPIs
  const metrics = useMemo(() => {
    const receivables = parties
      .filter(p => p.type === "customer")
      .reduce((sum, p) => sum + Math.max(0, p.currentBalance), 0);

    const payables = parties
      .filter(p => p.type === "supplier")
      .reduce((sum, p) => sum + Math.max(0, p.currentBalance), 0);

    // Initial business float + Sales Paid amount - Purchase Paid Amount
    let cashAndBank = 750000;
    invoices.forEach(inv => {
      if (inv.type === "sale") {
        cashAndBank += inv.paidAmount;
      } else {
        cashAndBank -= inv.paidAmount;
      }
    });

    // Total Stock asset value
    const stockAssetValue = items.reduce((sum, item) => sum + (item.stockQuantity * item.purchasePrice), 0);

    // Alerts
    const lowStockItems = items.filter(item => item.stockQuantity <= item.minStockAlert);

    return {
      receivables,
      payables,
      cashAndBank,
      stockAssetValue,
      lowStockCount: lowStockItems.length,
      lowStockItems: lowStockItems.slice(0, 5)
    };
  }, [items, parties, invoices]);

  // Aggregate monthly Sales vs Purchases for chart
  const chartData = useMemo(() => {
    const dateMap: { [key: string]: { date: string; Sales: number; Purchases: number } } = {};
    
    const dates = Array.from({ length: 10 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    }).reverse();

    dates.forEach(date => {
      dateMap[date] = { date, Sales: 0, Purchases: 0 };
    });

    invoices.forEach(inv => {
      const date = inv.date;
      if (!dateMap[date]) {
        dateMap[date] = { date, Sales: 0, Purchases: 0 };
      }
      if (inv.type === "sale") {
        dateMap[date].Sales += inv.totalAmount;
      } else {
        dateMap[date].Purchases += inv.totalAmount;
      }
    });

    return Object.values(dateMap).sort((a,b) => a.date.localeCompare(b.date));
  }, [invoices]);

  // Total Sales & Purchases
  const totalSales = invoices.filter(i => i.type === "sale").reduce((s, i) => s + i.totalAmount, 0);
  const totalPurchases = invoices.filter(i => i.type === "purchase").reduce((s, i) => s + i.totalAmount, 0);
  const estProfit = totalSales - totalPurchases;

  return (
    <div id="v-dashboard-container" className="space-y-6">
      
      {/* Page Title Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold font-sans tracking-tight text-slate-900">
            Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">Overview of your sales, purchases, stock, and balances</p>
        </div>
        <div className="flex items-center space-x-2 bg-slate-100 px-3 py-1.5 rounded-lg text-slate-700 text-xs font-semibold">
          <CalendarDays className="w-4 h-4 text-slate-500" />
          <span>F.Y. 2026-27</span>
        </div>
      </div>

      {/* KPI Counters Deck */}
      <div id="kpi-cards" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Receivables CARD */}
        <div
          id="receivables-card"
          onClick={() => onNavigateTab("parties")}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition cursor-pointer select-none relative overflow-hidden group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">To Receive</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 transition group-hover:bg-emerald-500 group-hover:text-white">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="font-sans text-xl font-bold text-slate-900 tracking-tight">
            {formatRupees(metrics.receivables)}
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center space-x-1.5">
            <span className="text-emerald-500 font-bold">●</span>
            <span>From Customers</span>
          </p>
        </div>

        {/* Payables CARD */}
        <div
          id="payables-card"
          onClick={() => onNavigateTab("parties")}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition cursor-pointer select-none relative overflow-hidden group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">To Pay</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600 transition group-hover:bg-rose-500 group-hover:text-white">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="font-sans text-xl font-bold text-slate-900 tracking-tight">
            {formatRupees(metrics.payables)}
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center space-x-1.5">
            <span className="text-rose-500 font-bold">●</span>
            <span>To Suppliers</span>
          </p>
        </div>

        {/* Cash In Hand / Bank CARD */}
        <div
          id="cash-liquidity-card"
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs relative overflow-hidden select-none"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cash & Bank</span>
            <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="font-sans text-xl font-bold text-slate-900 tracking-tight">
            {formatRupees(metrics.cashAndBank)}
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center space-x-1.5">
            <span className="text-teal-500 font-bold">●</span>
            <span>Available Balance</span>
          </p>
        </div>

        {/* Stock Valuation CARD */}
        <div
          id="stock-asset-card"
          onClick={() => onNavigateTab("items")}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition cursor-pointer select-none relative overflow-hidden group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stock Value</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-500 group-hover:text-white">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="font-sans text-xl font-bold text-slate-900 tracking-tight">
            {formatRupees(metrics.stockAssetValue)}
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center space-x-1.5">
            <span className={`font-bold ${metrics.lowStockCount > 0 ? "text-amber-500" : "text-emerald-500"}`}>●</span>
            <span>{metrics.lowStockCount > 0 ? `${metrics.lowStockCount} items low in stock` : "Stock is healthy"}</span>
          </p>
        </div>

      </div>

      {/* Main Charts & Financial Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sales / Purchases Graph */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-800 tracking-tight text-base">Sales vs Purchases</h3>
              <p className="text-xs text-slate-400 mt-0.5">Comparison of sales and purchases over time</p>
            </div>
            
            <div className="flex items-center space-x-4 text-xs font-medium">
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span>
                <span className="text-slate-600">Sales</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded bg-rose-400 inline-block"></span>
                <span className="text-slate-600">Purchases</span>
              </div>
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  style={{ fontSize: "10px" }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  style={{ fontSize: "10px" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "12px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)"
                  }}
                  itemStyle={{ color: "#fff" }}
                  labelStyle={{ color: "#94a3b8", fontWeight: "bold" }}
                />
                <Area type="monotone" dataKey="Sales" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="Purchases" stroke="#f43f5e" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPurchases)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 tracking-tight text-base mb-6">Financial Summary</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                  <span className="text-xs text-slate-600 font-medium">Total Sales</span>
                </div>
                <span className="text-sm font-bold text-emerald-700">{formatRupees(totalSales)}</span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                    <ArrowDownLeft className="w-4 h-4" />
                  </div>
                  <span className="text-xs text-slate-600 font-medium">Total Purchases</span>
                </div>
                <span className="text-sm font-bold text-rose-600">{formatRupees(totalPurchases)}</span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center space-x-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${estProfit >= 0 ? "bg-teal-50 text-teal-600" : "bg-rose-50 text-rose-600"}`}>
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <span className="text-xs text-slate-600 font-medium">Estimated Profit</span>
                </div>
                <span className={`text-base font-bold ${estProfit >= 0 ? "text-slate-900" : "text-rose-600"}`}>
                  {formatRupees(estProfit)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100">
            <div className={`p-3.5 rounded-xl flex items-center justify-between text-xs ${estProfit >= 0 ? "bg-teal-50 text-teal-800" : "bg-rose-50 text-rose-800"}`}>
              <span className="font-semibold">Business Status:</span>
              <span className="font-bold flex items-center space-x-1">
                {estProfit >= 0 ? (
                  <>
                    <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                    <span>In Profit</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                    <span>In Loss</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Low Stock Alerts + Recent Bills */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Low Stock Alerts */}
        <div id="low-stock-panel" className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col h-[23.5rem]">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4 h-12">
            <div>
              <h3 className="font-bold text-slate-800 tracking-tight text-sm">Low Stock Alert</h3>
              <p className="text-[10px] text-slate-400">Items that need to be reordered</p>
            </div>
            <button
              id="view-inv-shortage-btn"
              onClick={() => onNavigateTab("items")}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center space-x-1"
            >
              <span>View All Items</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {metrics.lowStockItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <Package className="w-12 h-12 text-slate-200 mb-2" />
              <p className="text-xs font-medium text-slate-600">All items have sufficient stock.</p>
              <p className="text-[10px] text-slate-400 mt-1">No low stock warnings.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {metrics.lowStockItems.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-amber-100 bg-amber-50/20 hover:bg-amber-50/40 transition shadow-2xs"
                >
                  <div className="flex items-start space-x-3 min-w-0">
                    <div className="p-2 rounded-lg bg-amber-50 text-amber-600 mt-0.5">
                      <AlertOctagon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 truncate">{item.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">HSN: {item.hsn} · Unit: {item.unit}</p>
                    </div>
                  </div>
                  <div className="text-right min-w-[70px]">
                    <span className="text-xs font-bold text-amber-600 block">{item.stockQuantity}</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">Alert at ≤{item.minStockAlert}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Bills */}
        <div id="recent-bills-panel" className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col h-[23.5rem]">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4 h-12">
            <div>
              <h3 className="font-bold text-slate-800 tracking-tight text-sm">Recent Bills</h3>
              <p className="text-[10px] text-slate-400">Latest sales invoices and purchase bills</p>
            </div>
            <button
              id="view-all-inv-btn"
              onClick={() => onNavigateTab("reports")}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center space-x-1"
            >
              <span>View All Bills</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {invoices.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <CalendarDays className="w-12 h-12 text-slate-200 mb-2" />
              <p className="text-xs font-medium text-slate-600">No bills or invoices created yet.</p>
              <button
                id="init-first-sale-btn"
                onClick={() => onNavigateTab("sales")}
                className="mt-3 bg-emerald-600 text-white font-medium py-1.5 px-3.5 rounded-lg text-xs hover:bg-emerald-700 shadow transition"
              >
                Create First Bill
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {invoices.slice(-5).reverse().map(inv => (
                <div
                  key={inv.id}
                  onClick={() => onOpenInvoice(inv)}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-50 hover:border-slate-200 transition cursor-pointer group"
                >
                  <div className="min-w-0">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wide ${inv.type === "sale" ? "bg-emerald-50 text-emerald-700" : "bg-purple-50 text-purple-700"}`}>
                      {inv.type === "sale" ? "SALE INVOICE" : "PURCHASE BILL"}
                    </span>
                    <h4 className="text-xs font-bold text-slate-800 mt-1.5 truncate">
                      {inv.partyName.replace(/\s*\((Customer|Supplier)\)/gi, "")}
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">{inv.invoiceNumber} · {inv.date}</p>
                  </div>
                  <div className="text-right min-w-[100px]">
                    <span className="text-xs font-bold text-slate-900 block group-hover:text-emerald-600">
                      {formatRupees(inv.totalAmount)}
                    </span>
                    <span className={`text-[9.5px] mt-0.5 inline-block font-semibold ${inv.remainingAmount === 0 ? "text-emerald-600" : "text-amber-600"}`}>
                      {inv.remainingAmount === 0 ? "PAID" : `UNPAID (${formatRupees(inv.remainingAmount)})`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
