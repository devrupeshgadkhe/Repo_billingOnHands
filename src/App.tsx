/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import Sidebar from "./components/Sidebar";
import DashboardView from "./components/DashboardView";
import ItemsView from "./components/ItemsView";
import PartiesView from "./components/PartiesView";
import InvoicingView from "./components/InvoicingView";
import ReportsView from "./components/ReportsView";
import SettingsView from "./components/SettingsView";
import InvoicePrintModal from "./components/InvoicePrintModal";
import LoginView from "./components/LoginView";
import TransactionsView from "./components/TransactionsView";
import AccessControlView from "./components/AccessControlView";
import DeliveryChallansView from "./components/DeliveryChallansView";
import QuotationsView from "./components/QuotationsView";
import { DatabaseState, Invoice, Item, Party, BusinessProfile, MiscTransaction, DeliveryChallan, Quotation, QuotationStatus } from "./types";
import { RefreshCw, LayoutGrid, CheckCircle, LogOut, Menu } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [dbState, setDbState] = useState<DatabaseState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
  const [isReturnMode, setIsReturnMode] = useState<boolean>(false);
  const [session, setSession] = useState<{ username: string; name: string; role: string; token: string } | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  // Fetch full data state from Express JSON API
  const fetchState = async () => {
    try {
      const res = await fetch("/api/db");
      if (!res.ok) throw new Error("Server communication fault");
      const data: DatabaseState = await res.json();
      setDbState(data);
    } catch (err) {
      console.error("Failed to load business databases", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("billingonhand_session") || localStorage.getItem("vyapaar_session");
    if (saved) {
      try {
        setSession(JSON.parse(saved));
      } catch (err) {
        localStorage.removeItem("billingonhand_session");
        localStorage.removeItem("vyapaar_session");
      }
    }
    fetchState();
  }, []);

  // Update business profile
  const handleSaveBusiness = async (profile: BusinessProfile) => {
    try {
      const res = await fetch("/api/business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile)
      });
      if (res.ok) await fetchState();
    } catch (err) {
      console.error("Failed to update business profile", err);
    }
  };

  // Add/Modify Stock Item
  const handleSaveItem = async (item: Item) => {
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item)
      });
      if (res.ok) await fetchState();
    } catch (err) {
      console.error("Failed to persist item change", err);
    }
  };

  // Delete Stock Item
  const handleDeleteItem = async (id: string) => {
    try {
      const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
      if (res.ok) await fetchState();
    } catch (err) {
      console.error("Failed to delete stock item", err);
    }
  };

  // Add/Modify Party Contact
  const handleSaveParty = async (party: Party) => {
    try {
      const res = await fetch("/api/parties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(party)
      });
      if (res.ok) await fetchState();
    } catch (err) {
      console.error("Failed to persist party change", err);
    }
  };

  // Delete Party Contact
  const handleDeleteParty = async (id: string) => {
    try {
      const res = await fetch(`/api/parties/${id}`, { method: "DELETE" });
      if (res.ok) await fetchState();
    } catch (err) {
      console.error("Failed to delete contact", err);
    }
  };

  // Process Sales / Purchases Invoices
  const handleSaveInvoice = async (invoice: Invoice) => {
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoice)
      });
      if (res.ok) {
        const result = await res.json();
        await fetchState();
        // Automatically trigger print popup mockup on newly booked invoice!
        setSelectedInvoice(result.invoice);
      } else {
        throw new Error("Unable to save transaction.");
      }
    } catch (err) {
      console.error("Failed to log billing transaction", err);
      throw err;
    }
  };

  // Delete Invoice with ledger state restoration
  const handleDeleteInvoice = async (id: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (res.ok) await fetchState();
    } catch (err) {
      console.error("Failed to revert billing invoice", err);
    }
  };

  // Delivery Challan Operations
  const handleSaveChallan = async (challan: DeliveryChallan) => {
    try {
      const res = await fetch("/api/challans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(challan)
      });
      if (res.ok) {
        await fetchState();
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save delivery challan.");
      }
    } catch (err) {
      console.error("Failed to save delivery challan", err);
      throw err;
    }
  };

  const handleCancelChallan = async (id: string) => {
    try {
      const res = await fetch(`/api/challans/${id}/cancel`, {
        method: "POST"
      });
      if (res.ok) {
        await fetchState();
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to cancel delivery challan.");
      }
    } catch (err) {
      console.error("Failed to cancel delivery challan", err);
      throw err;
    }
  };

  const handleDeleteChallan = async (id: string) => {
    try {
      const res = await fetch(`/api/challans/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        await fetchState();
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to delete delivery challan.");
      }
    } catch (err) {
      console.error("Failed to delete delivery challan", err);
      throw err;
    }
  };

  const handleConvertChallanToInvoice = (challan: DeliveryChallan) => {
    const extraCharges: { title: string; amount: number }[] = [];
    if (challan.hamaliCharge && challan.hamaliStatus === "paid_by_us") {
      extraCharges.push({ title: "Hamali / Labour Charge", amount: challan.hamaliCharge });
    }
    if (challan.freightCharge && challan.freightStatus === "paid_by_us") {
      extraCharges.push({ title: "Freight / Transport Charge", amount: challan.freightCharge });
    }

    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const draftInvoice: Invoice = {
      id: "",
      invoiceNumber: `INV-2026-${randomSuffix}`,
      date: new Date().toISOString().split("T")[0],
      partyId: challan.partyId,
      partyName: challan.partyName,
      partyGstin: challan.partyGstin,
      type: "sale",
      items: challan.items.map(ci => ({
        itemId: ci.itemId,
        itemName: ci.itemName,
        hsn: ci.hsn,
        quantity: ci.quantity,
        price: ci.price,
        gstRate: ci.gstRate,
        amountBeforeTax: ci.amountBeforeTax,
        taxAmount: ci.taxAmount,
        cgst: ci.taxAmount / 2,
        sgst: ci.taxAmount / 2,
        igst: 0,
        totalAmount: ci.totalAmount
      })),
      subtotal: challan.subtotal,
      taxAmount: challan.taxAmount,
      cgstTotal: challan.taxAmount / 2,
      sgstTotal: challan.taxAmount / 2,
      igstTotal: 0,
      extraCharges,
      totalAmount: challan.totalAmount + extraCharges.reduce((s, c) => s + c.amount, 0),
      paymentType: "unpaid",
      paidAmount: 0,
      remainingAmount: challan.totalAmount + extraCharges.reduce((s, c) => s + c.amount, 0),
      notes: `Billed against Delivery Challan: ${challan.challanNumber}` + (challan.vehicleNumber ? ` (Vehicle: ${challan.vehicleNumber})` : ""),
      sourceChallanId: challan.id,
      sourceChallanNumber: challan.challanNumber
    };

    setInvoiceToEdit(draftInvoice);
    setIsReturnMode(false);
    setActiveTab("sales");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Convert Quotation into Sales Invoice
  const handleConvertQuotationToInvoice = (quotation: Quotation) => {
    const extraCharges: { title: string; amount: number }[] = quotation.extraCharges || [];

    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const draftInvoice: Invoice = {
      id: "",
      invoiceNumber: `INV-${new Date().getFullYear()}-${randomSuffix}`,
      date: new Date().toISOString().split("T")[0],
      partyId: quotation.partyId,
      partyName: quotation.partyName,
      partyGstin: quotation.partyGstin,
      type: "sale",
      items: quotation.items.map(qi => ({
        itemId: qi.itemId,
        itemName: qi.itemName,
        hsn: qi.hsn,
        quantity: qi.quantity,
        price: qi.price,
        discount: qi.discount,
        gstRate: qi.gstRate,
        amountBeforeTax: qi.amountBeforeTax,
        taxAmount: qi.taxAmount,
        cgst: qi.cgst,
        sgst: qi.sgst,
        igst: qi.igst,
        totalAmount: qi.totalAmount
      })),
      subtotal: quotation.subtotal,
      taxAmount: quotation.taxAmount,
      cgstTotal: quotation.cgstTotal,
      sgstTotal: quotation.sgstTotal,
      igstTotal: quotation.igstTotal,
      extraCharges,
      totalAmount: quotation.totalAmount,
      paymentType: "unpaid",
      paidAmount: 0,
      remainingAmount: quotation.totalAmount,
      notes: `Billed against Quotation: ${quotation.quotationNumber}` + (quotation.notes ? ` (${quotation.notes})` : ""),
      sourceQuotationId: quotation.id,
      sourceQuotationNumber: quotation.quotationNumber
    };

    setInvoiceToEdit(draftInvoice);
    setIsReturnMode(false);
    setActiveTab("sales");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Quotation CRUD handlers
  const handleSaveQuotation = async (quotation: Quotation) => {
    try {
      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quotation)
      });
      if (res.ok) {
        await fetchState();
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save quotation");
      }
    } catch (err) {
      console.error("Failed to save quotation", err);
      throw err;
    }
  };

  const handleDeleteQuotation = async (id: string) => {
    try {
      const res = await fetch(`/api/quotations/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchState();
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete quotation");
      }
    } catch (err) {
      console.error("Failed to delete quotation", err);
      throw err;
    }
  };

  const handleUpdateQuotationStatus = async (id: string, status: QuotationStatus) => {
    try {
      const res = await fetch(`/api/quotations/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        await fetchState();
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update quotation status");
      }
    } catch (err) {
      console.error("Failed to update quotation status", err);
      throw err;
    }
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setInvoiceToEdit(invoice);
    setIsReturnMode(invoice.type === "sale_return" || invoice.type === "purchase_return");
    if (invoice.type === "sale" || invoice.type === "sale_return") {
      setActiveTab("sales");
    } else {
      setActiveTab("purchases");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReturnInvoice = (invoice: Invoice) => {
    const returnType = invoice.type === "sale" ? "sale_return" : "purchase_return";
    const prefix = returnType === "sale_return" ? "CN" : "DN";
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const returnInv: Invoice = {
      ...invoice,
      id: "", // Clear so it creates as a NEW transaction
      invoiceNumber: `${prefix}-${new Date().getFullYear()}-${randomSuffix}`,
      originalInvoiceNumber: invoice.invoiceNumber,
      type: returnType,
      date: new Date().toISOString().split("T")[0],
      paymentType: "unpaid",
      paidAmount: 0,
      remainingAmount: invoice.totalAmount,
      notes: `Return against bill #${invoice.invoiceNumber}`
    };
    setInvoiceToEdit(returnInv);
    setIsReturnMode(true);
    if (returnType === "sale_return") {
      setActiveTab("sales");
    } else {
      setActiveTab("purchases");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Add or Update Misc Transaction
  const handleSaveTransaction = async (tx: MiscTransaction) => {
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tx)
      });
      if (res.ok) await fetchState();
    } catch (err) {
      console.error("Failed to save transaction record", err);
    }
  };

  // Delete Misc Transaction
  const handleDeleteTransaction = async (id: string) => {
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (res.ok) await fetchState();
    } catch (err) {
      console.error("Failed to delete transaction record", err);
    }
  };

  // Factory reset to clean blueprints sample ledger
  const handleResetDb = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/db/reset", { method: "POST" });
      if (res.ok) await fetchState();
    } catch (err) {
      console.error("Failed to reset ledger data", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Derive warning tallies for sidebar notifications
  const lowStockCount = useMemo(() => {
    if (!dbState) return 0;
    return dbState.items.filter(item => item.stockQuantity <= item.minStockAlert).length;
  }, [dbState]);

  const unpaidCount = useMemo(() => {
    if (!dbState) return 0;
    return dbState.parties.filter(p => p.currentBalance > 0).length;
  }, [dbState]);

  const pendingChallansCount = useMemo(() => {
    if (!dbState || !dbState.challans) return 0;
    return dbState.challans.filter(c => c.status === "pending").length;
  }, [dbState]);

  const pendingQuotationsCount = useMemo(() => {
    if (!dbState || !dbState.quotations) return 0;
    return dbState.quotations.filter(q => q.status === "draft" || q.status === "sent").length;
  }, [dbState]);

  // Loading phase rendering
  if (isLoading || !dbState) {
    return (
      <div id="v-app-loader" className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-350">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin" />
          <h2 className="text-sm font-bold tracking-widest text-slate-205 uppercase font-mono animate-pulse">
            Booting Billing On Hand Engine...
          </h2>
          <p className="text-xs text-slate-500">Connecting file-based databases & tax compliance rules</p>
        </div>
      </div>
    );
  }

  // Authentication gate
  if (!session) {
    return <LoginView onLoginSuccess={(sess) => setSession(sess)} />;
  }

  // Find related contact for printable receipt
  const invoiceSelectedParty = selectedInvoice
    ? dbState.parties.find(p => p.id === selectedInvoice.partyId)
    : undefined;

  return (
    <div id="v-app-grid" className="min-h-screen bg-slate-50/50 flex">
      
      {/* Sidebar - Fix position */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        business={dbState.business}
        lowStockCount={lowStockCount}
        unpaidCount={unpaidCount}
        pendingChallansCount={pendingChallansCount}
        pendingQuotationsCount={pendingQuotationsCount}
        onResetDb={handleResetDb}
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        sessionRole={session?.role}
        sessionPermissions={session?.permissions}
      />

      {/* Main Dynamic View Panels - Shifted right by 272px (w-68) on large screens */}
      <main id="v-app-main" className={`flex-1 min-w-0 pl-0 lg:pl-68 min-h-screen flex flex-col pb-10 print:hidden ${selectedInvoice ? "print:hidden" : ""}`}>
        
        {/* Global Toolbar Header - Hidden in printable invoices */}
        <header id="v-app-toolbar" className="bg-white border-b border-slate-150 h-16 flex items-center justify-between px-4 sm:px-8 select-none print:hidden shadow-xs shrink-0 sticky top-0 z-10 font-sans">
          <div className="flex items-center space-x-2 sm:space-x-3.5">
            {/* Hamburger menu trigger */}
            <button
              id="v-mobile-menu-trigger"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
              title="Open Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 hidden sm:inline-block"></span>
            <span className="text-xs font-semibold text-slate-600 font-sans truncate max-w-[150px] sm:max-w-none">
              Online {dbState.business?.businessType ? `• ${dbState.business.businessType}` : ""}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {/* Authenticated User Profile */}
            <div className="px-2 sm:px-3 py-1 bg-slate-50 border border-slate-200/60 rounded-xl text-right flex items-center space-x-2 sm:space-x-3">
              <div className="text-right">
                <span className="text-[11px] font-bold text-slate-800 block truncate max-w-[90px] sm:max-w-[130px]">{session.name}</span>
                <span className="text-[9px] font-medium text-emerald-700 block capitalize">{session.role}</span>
              </div>
              <button
                id="header-logout-btn"
                onClick={() => {
                  localStorage.removeItem("billingonhand_session");
                  localStorage.removeItem("vyapaar_session");
                  setSession(null);
                }}
                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-right hidden sm:block">
              <span className="text-[10px] font-medium text-slate-400 block uppercase">GST Verified</span>
              <span className="text-xs font-bold text-slate-800 block">{dbState.business.gstin || "GST Ready"}</span>
            </div>
          </div>
        </header>

        {/* Core Screen Router */}
        <div id="v-active-canvas" className="p-4 sm:p-8 max-w-7xl w-full mx-auto flex-1 print:p-0">
          {activeTab === "dashboard" && (
            <DashboardView
              items={dbState.items}
              parties={dbState.parties}
              invoices={dbState.invoices}
              onNavigateTab={(tab) => {
                setActiveTab(tab);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onOpenInvoice={(inv) => setSelectedInvoice(inv)}
            />
          )}

          {activeTab === "items" && (
            <ItemsView
              items={dbState.items}
              onSaveItem={handleSaveItem}
              onDeleteItem={handleDeleteItem}
              permissions={session?.permissions?.items}
            />
          )}

          {activeTab === "parties" && (
            <PartiesView
              parties={dbState.parties}
              invoices={dbState.invoices}
              onSaveParty={handleSaveParty}
              onDeleteParty={handleDeleteParty}
              onSaveInvoice={handleSaveInvoice}
              onOpenInvoice={(inv) => setSelectedInvoice(inv)}
              permissions={session?.permissions?.parties}
            />
          )}

          {activeTab === "quotations" && (
            <QuotationsView
              quotations={dbState.quotations || []}
              parties={dbState.parties}
              items={dbState.items}
              business={dbState.business}
              onSaveQuotation={handleSaveQuotation}
              onDeleteQuotation={handleDeleteQuotation}
              onUpdateQuotationStatus={handleUpdateQuotationStatus}
              onConvertToInvoice={handleConvertQuotationToInvoice}
              permissions={session?.permissions?.quotations || session?.permissions?.sales}
            />
          )}

          {activeTab === "sales" && (
            <InvoicingView
              type="sale"
              items={dbState.items}
              parties={dbState.parties}
              business={dbState.business}
              invoiceToEdit={invoiceToEdit}
              isReturnMode={isReturnMode}
              onSaveInvoice={async (inv) => {
                await handleSaveInvoice(inv);
                setInvoiceToEdit(null);
                setIsReturnMode(false);
              }}
              onCancelEdit={() => {
                setInvoiceToEdit(null);
                setIsReturnMode(false);
              }}
              onNavigateTab={(tab) => {
                setActiveTab(tab);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              permissions={session?.permissions?.sales}
            />
          )}

          {activeTab === "challans" && (
            <DeliveryChallansView
              challans={dbState.challans || []}
              parties={dbState.parties}
              items={dbState.items}
              business={dbState.business}
              onSaveChallan={handleSaveChallan}
              onCancelChallan={handleCancelChallan}
              onDeleteChallan={handleDeleteChallan}
              onConvertToInvoice={handleConvertChallanToInvoice}
              permissions={session?.permissions?.challans || session?.permissions?.sales}
            />
          )}

          {activeTab === "purchases" && (
            <InvoicingView
              type="purchase"
              items={dbState.items}
              parties={dbState.parties}
              business={dbState.business}
              invoiceToEdit={invoiceToEdit}
              isReturnMode={isReturnMode}
              onSaveInvoice={async (inv) => {
                await handleSaveInvoice(inv);
                setInvoiceToEdit(null);
                setIsReturnMode(false);
              }}
              onCancelEdit={() => {
                setInvoiceToEdit(null);
                setIsReturnMode(false);
              }}
              onNavigateTab={(tab) => {
                setActiveTab(tab);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              permissions={session?.permissions?.purchases}
            />
          )}

          {activeTab === "transactions" && (
            <TransactionsView
              transactions={dbState.transactions || []}
              business={dbState.business}
              onSaveTransaction={handleSaveTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              permissions={session?.permissions?.transactions}
            />
          )}

          {activeTab === "reports" && (
            <ReportsView
              invoices={dbState.invoices}
              parties={dbState.parties}
              items={dbState.items}
              transactions={dbState.transactions || []}
              business={dbState.business}
              onOpenInvoice={(inv) => setSelectedInvoice(inv)}
              onDeleteInvoice={handleDeleteInvoice}
              onEditInvoice={handleEditInvoice}
              onReturnInvoice={handleReturnInvoice}
              salesPermissions={session?.permissions?.sales}
              purchasesPermissions={session?.permissions?.purchases}
            />
          )}

          {activeTab === "settings" && (
            <SettingsView
              business={dbState.business}
              onSaveBusiness={handleSaveBusiness}
              onResetDb={handleResetDb}
              session={session}
              onUpdateSession={(updatedSession) => {
                setSession(updatedSession);
                localStorage.setItem("billingonhand_session", JSON.stringify(updatedSession));
              }}
            />
          )}

          {activeTab === "access_control" && (
            <AccessControlView 
              activeSession={session} 
              onUpdateSession={(updatedSession) => {
                setSession(updatedSession);
                localStorage.setItem("billingonhand_session", JSON.stringify(updatedSession));
              }}
            />
          )}
        </div>

      </main>

      {/* Portal Modal: Printable PDF invoice rendering */}
      {selectedInvoice && (
        <InvoicePrintModal
          invoice={selectedInvoice}
          business={dbState.business}
          party={invoiceSelectedParty}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

    </div>
  );
}
