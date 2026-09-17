/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { Party, Invoice, INDIAN_STATES } from "../types.js";
import {
  Search,
  Plus,
  Users,
  Building2,
  Phone,
  MapPin,
  FileSpreadsheet,
  Edit2,
  Trash2,
  Contact2,
  Coins,
  ArrowRight,
  ArrowLeft,
  Printer,
  Calendar,
  IndianRupee,
  Receipt,
  FileText,
  CreditCard,
  PlusCircle,
  Clock,
  Briefcase,
  CheckCircle
} from "lucide-react";

interface PartiesViewProps {
  parties: Party[];
  invoices: Invoice[];
  onSaveParty: (party: Party) => Promise<void>;
  onDeleteParty: (id: string) => Promise<void>;
  onSaveInvoice?: (invoice: Invoice) => Promise<void>;
  onOpenInvoice?: (invoice: Invoice) => void;
  permissions?: any;
}

export default function PartiesView({
  parties,
  invoices = [],
  onSaveParty,
  onDeleteParty,
  onSaveInvoice,
  onOpenInvoice,
  permissions
}: PartiesViewProps) {
  
  const perms = permissions || { view: true, create: true, update: true, delete: true };

  // Tab/Screen state
  const [selectedLedgerParty, setSelectedLedgerParty] = useState<Party | null>(null);
  
  // State managers for filter
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<'all' | 'customer' | 'supplier'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);

  // Quick Payment Recorder form inside ledger
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "bank">("cash");
  const [payNotes, setPayNotes] = useState("");
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paySuccessMsg, setPaySuccessMsg] = useState(false);

  // Form State for Party creation
  const [formData, setFormData] = useState<Omit<Party, "id" | "currentBalance">>({
    name: "",
    type: "customer",
    phone: "",
    email: "",
    address: "",
    state: "Maharashtra",
    gstin: "",
    initialBalance: 0
  });

  // Filter parties
  const filteredParties = useMemo(() => {
    return parties.filter(p => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.gstin.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = typeFilter === "all" ? true : p.type === typeFilter;
      
      return matchesSearch && matchesType;
    });
  }, [parties, searchQuery, typeFilter]);

  // Aggregate stats
  const receivables = useMemo(() => {
    return parties
      .filter(p => p.type === "customer")
      .reduce((sum, p) => sum + Math.max(0, p.currentBalance), 0);
  }, [parties]);

  const payables = useMemo(() => {
    return parties
      .filter(p => p.type === "supplier")
      .reduce((sum, p) => sum + Math.max(0, p.currentBalance), 0);
  }, [parties]);

  // Modal actions
  const openAddModal = () => {
    setEditingParty(null);
    setFormData({
      name: "",
      type: "customer",
      phone: "",
      email: "",
      address: "",
      state: "Maharashtra",
      gstin: "",
      initialBalance: 0
    });
    setIsModalOpen(true);
  };

  const openEditModal = (party: Party) => {
    setEditingParty(party);
    setFormData({
      name: party.name,
      type: party.type,
      phone: party.phone,
      email: party.email,
      address: party.address,
      state: party.state,
      gstin: party.gstin,
      initialBalance: party.initialBalance
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "initialBalance" ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const payload: Party = {
      ...formData,
      id: editingParty ? editingParty.id : "",
      currentBalance: editingParty ? editingParty.currentBalance : formData.initialBalance
    };

    await onSaveParty(payload);
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering row click selection
    if (confirm(`Are you sure you want to delete ${name}? All transaction relationships with this contact will be severed.`)) {
      await onDeleteParty(id);
    }
  };

  // Reconstruct chronological sub-ledger transactions
  const ledgerEntries = useMemo(() => {
    if (!selectedLedgerParty) return [];

    const isCustomer = selectedLedgerParty.type === "customer";
    const initialBal = selectedLedgerParty.initialBalance || 0;
    
    // 1. Initial Opening Setup
    const entries: any[] = [
      {
        id: "opening",
        date: "Original",
        particulars: "Opening Outstanding Balance",
        refNumber: "LED-00000",
        type: "opening",
        paymentType: "-",
        debit: isCustomer ? (initialBal >= 0 ? initialBal : 0) : (initialBal < 0 ? Math.abs(initialBal) : 0),
        credit: isCustomer ? (initialBal < 0 ? Math.abs(initialBal) : 0) : (initialBal >= 0 ? initialBal : 0),
        runningBalance: initialBal
      }
    ];

    // Related invoices
    const partyInvoices = invoices.filter(inv => inv.partyId === selectedLedgerParty.id);
    const sortedInvoices = [...partyInvoices].sort((a, b) => a.date.localeCompare(b.date));

    let currentBal = initialBal;

    sortedInvoices.forEach(inv => {
      const isSale = inv.type === "sale";

      // If viewing a customer ledger:
      if (isCustomer) {
        if (isSale) {
          // A Sale Invoice creates receivable DEBIT
          if (inv.totalAmount > 0) {
            currentBal += inv.totalAmount;
            entries.push({
              id: `${inv.id}_invoice`,
              date: inv.date,
              particulars: "Sales Invoice Booked",
              refNumber: inv.invoiceNumber,
              type: "invoice",
              paymentType: inv.paymentType,
              debit: inv.totalAmount,
              credit: 0,
              runningBalance: currentBal,
              invoiceObj: inv
            });
          }
          // Immediate payment creates receipt CREDIT
          if (inv.paidAmount > 0) {
            currentBal -= inv.paidAmount;
            entries.push({
              id: `${inv.id}_receipt`,
              date: inv.date,
              particulars: `Payment Collected [${inv.paymentType.toUpperCase()}]`,
              refNumber: inv.invoiceNumber,
              type: "receipt",
              paymentType: inv.paymentType,
              debit: 0,
              credit: inv.paidAmount,
              runningBalance: currentBal,
              invoiceObj: inv
            });
          }
        } else {
          // Unusual customer buying (treated as reverse offset entry)
          if (inv.totalAmount > 0) {
            currentBal -= inv.totalAmount;
            entries.push({
              id: `${inv.id}_offset`,
              date: inv.date,
              particulars: "Reverse Sale Adjustment",
              refNumber: inv.invoiceNumber,
              type: "invoice",
              paymentType: inv.paymentType,
              debit: 0,
              credit: inv.totalAmount,
              runningBalance: currentBal,
              invoiceObj: inv
            });
          }
        }
      } else {
        // If viewing a supplier ledger:
        // A Purchase Bill creates payable CREDIT
        if (!isSale) {
          if (inv.totalAmount > 0) {
            currentBal += inv.totalAmount;
            entries.push({
              id: `${inv.id}_invoice`,
              date: inv.date,
              particulars: "Purchase Bill Booked",
              refNumber: inv.invoiceNumber,
              type: "invoice",
              paymentType: inv.paymentType,
              debit: 0,
              credit: inv.totalAmount,
              runningBalance: currentBal,
              invoiceObj: inv
            });
          }
          // Immediate payment paid to supplier creates DEBIT
          if (inv.paidAmount > 0) {
            currentBal -= inv.paidAmount;
            entries.push({
              id: `${inv.id}_payment`,
              date: inv.date,
              particulars: `Payment Settlement [${inv.paymentType.toUpperCase()}]`,
              refNumber: inv.invoiceNumber,
              type: "payment",
              paymentType: inv.paymentType,
              debit: inv.paidAmount,
              credit: 0,
              runningBalance: currentBal,
              invoiceObj: inv
            });
          }
        } else {
          // Supplier buying (treated as reverse offset)
          if (inv.totalAmount > 0) {
            currentBal -= inv.totalAmount;
            entries.push({
              id: `${inv.id}_offset`,
              date: inv.date,
              particulars: "Reverse Supplier Offset",
              refNumber: inv.invoiceNumber,
              type: "invoice",
              paymentType: inv.paymentType,
              debit: inv.totalAmount,
              credit: 0,
              runningBalance: currentBal,
              invoiceObj: inv
            });
          }
        }
      }
    });

    return entries;
  }, [selectedLedgerParty, invoices]);

  // Aggregate metrics for active sub-ledger
  const ledgerMetrics = useMemo(() => {
    if (!selectedLedgerParty) return { totalDebited: 0, totalCredited: 0, transactionCount: 0 };
    
    // Exclude original opening setup
    const activityList = ledgerEntries.slice(1);
    const totalDebited = activityList.reduce((sum, item) => sum + item.debit, 0);
    const totalCredited = activityList.reduce((sum, item) => sum + item.credit, 0);

    return {
      totalDebited,
      totalCredited,
      transactionCount: activityList.length
    };
  }, [ledgerEntries, selectedLedgerParty]);

  // Submit quick settlement payment entry direct into the sub ledger
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLedgerParty || !onSaveInvoice) return;
    
    const amountVal = parseFloat(payAmount);
    if (!amountVal || amountVal <= 0) {
      alert("Please provide a valid cash payment value.");
      return;
    }

    setRecordingPayment(true);
    try {
      const isCustomer = selectedLedgerParty.type === "customer";
      
      const payload: Invoice = {
        id: (isCustomer ? "rcpt_" : "sett_") + Date.now(),
        invoiceNumber: (isCustomer ? "REC-26-" : "PAY-26-") + Date.now().toString().slice(-4),
        date: new Date().toISOString().split("T")[0],
        partyId: selectedLedgerParty.id,
        partyName: selectedLedgerParty.name,
        partyGstin: selectedLedgerParty.gstin || "",
        type: isCustomer ? "sale" : "purchase",
        items: [], // pure accounts ledger settlement
        subtotal: 0,
        taxAmount: 0,
        cgstTotal: 0,
        sgstTotal: 0,
        igstTotal: 0,
        totalAmount: 0, // payment increases paidAmount and puts remainingAmount in negative (for signed balance offsets!)
        paymentType: payMethod,
        paidAmount: amountVal,
        remainingAmount: -amountVal,
        notes: payNotes.trim() || `Ledger balance credit adjustment - Recorded by operator`
      };

      await onSaveInvoice(payload);
      
      setPayAmount("");
      setPayNotes("");
      setPaySuccessMsg(true);
      
      // Update the active state reference to receive backend's latest balances
      const updatedParty = parties.find(p => p.id === selectedLedgerParty.id);
      if (updatedParty) {
        setSelectedLedgerParty(updatedParty);
      }

      setTimeout(() => {
        setPaySuccessMsg(false);
      }, 4000);

    } catch (err) {
      console.error(err);
      alert("Ledger could not register transaction.");
    } finally {
      setRecordingPayment(false);
    }
  };

  // Sync state if selected ledger party edited/changed
  const activePartyInLedger = useMemo(() => {
    if (!selectedLedgerParty) return null;
    return parties.find(p => p.id === selectedLedgerParty.id) || selectedLedgerParty;
  }, [parties, selectedLedgerParty]);

  // View: Chronological ledger display
  if (selectedLedgerParty && activePartyInLedger) {
    const isCustomer = activePartyInLedger.type === "customer";
    
    return (
      <div id="v-subledger-container" className="space-y-6 animate-fade-in font-sans">
        
        {/* Navigation Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100 print:hidden select-none">
          <button
            id="back-to-contacts-btn"
            onClick={() => setSelectedLedgerParty(null)}
            className="flex items-center space-x-2 text-slate-500 hover:text-slate-800 text-xs font-bold uppercase tracking-wider bg-white py-2 px-4 shadow-xs border border-slate-200/80 rounded-xl hover:shadow cursor-pointer transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Contacts</span>
          </button>

          <div className="flex items-center space-x-3">
            <span className="text-[10px] font-bold text-slate-400 font-mono">Secure Ledger</span>
            <button
              id="subledger-print-btn"
              onClick={() => window.print()}
              className="flex items-center space-x-2 bg-slate-900 border border-slate-800 text-white font-bold tracking-wider text-[10px] uppercase py-2 px-4 rounded-xl shadow cursor-pointer hover:bg-slate-800 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Statement</span>
            </button>
          </div>
        </div>

        {/* Company and Partner Header Info */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-950 text-white p-6 rounded-2xl shadow border-2 border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 print:hidden">
              Account Sub Ledger
            </span>
            <h2 id="subledger-partner-name" className="text-xl font-bold tracking-tight mt-2">{activePartyInLedger.name}</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 mt-3 text-xs text-slate-400 print:text-slate-700">
              <span className="flex items-center space-x-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>Mobile: {activePartyInLedger.phone || "No direct phone"}</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>Place of Supply: {activePartyInLedger.state}</span>
              </span>
              {activePartyInLedger.gstin && (
                <span className="flex items-center space-x-1.5 font-mono">
                  <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                  <span>GSTIN Status: <strong className="text-slate-200 print:text-black">{activePartyInLedger.gstin}</strong></span>
                </span>
              )}
            </div>
          </div>

          <div className="text-right flex flex-col items-end print:text-right">
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">Closing Balance Due</span>
            <span id="subledger-partner-closing-balance" className={`text-2xl font-black font-mono block mt-1.5 ${
              activePartyInLedger.currentBalance > 0
                ? isCustomer ? "text-emerald-400 print:text-emerald-700" : "text-rose-450 print:text-rose-700"
                : "text-slate-400"
            }`}>
              ₹{activePartyInLedger.currentBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[9px] font-medium text-slate-500 block uppercase block mt-1">
              {activePartyInLedger.currentBalance > 0 
                ? isCustomer ? "Customer Receivable (Debit)" : "Supplier Payable (Credit)"
                : "Accounts Settled"
              }
            </span>
          </div>
        </div>

        {/* Ledger Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 print:grid-cols-3">
          
          <div className="p-4 bg-white border border-slate-150 rounded-xl shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Opening Account balance</span>
            <span className="text-base font-black font-mono block mt-1 text-slate-700">
              ₹{(activePartyInLedger.initialBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="p-4 bg-white border border-slate-150 rounded-xl shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Bilable Value Booked</span>
            <span className="text-base font-black font-mono block mt-1 text-slate-700">
              ₹{ledgerMetrics.totalDebited.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[8.5px] text-slate-400 block mt-1 uppercase font-semibold">
              {isCustomer ? "Processed Sales Invoices" : "Processed Procurement Bills"}
            </span>
          </div>

          <div className="p-4 bg-white border border-slate-150 rounded-xl shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Receipts / Settlements</span>
            <span className="text-base font-black font-mono block mt-1 text-emerald-700">
              ₹{ledgerMetrics.totalCredited.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[8.5px] text-slate-400 block mt-1 uppercase font-semibold">
              {isCustomer ? "Cash Received" : "Cash Disbursed"}
            </span>
          </div>

        </div>

        {/* Sub-Ledger Layout Split Screen (Ledger statement + pay settling portal) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* Main Statement Ledger Table Card */}
          <div className="bg-white border border-slate-150 rounded-xl shadow-sm overflow-hidden lg:col-span-3">
            
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-55 select-none print:hidden">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Chronological Transaction Statement Ledger</span>
              </span>
              <span className="text-[10px] font-mono text-slate-450 bg-slate-100 rounded px-2.5 py-0.5">
                {ledgerEntries.length} Records
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-55 border-b border-indigo-50/50 font-bold uppercase text-slate-500">
                    <th className="py-3 px-4">Booking Date</th>
                    <th className="py-3 px-3">Ledger Particulars</th>
                    <th className="py-3 px-3 text-center">Ref doc #</th>
                    <th className="py-3 px-3 text-center">Mode</th>
                    <th className="py-3 px-3 text-right">Debit (Dr)</th>
                    <th className="py-3 px-3 text-right">Credit (Cr)</th>
                    <th className="py-3 px-4 text-right">Outstanding Bal</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerEntries.map((entry, idx) => {
                    const isOpening = entry.id === "opening";
                    
                    return (
                      <tr
                        key={entry.id}
                        className={`border-b border-slate-100 hover:bg-slate-50/40 transition ${
                          isOpening ? "bg-slate-50/70" : ""
                        }`}
                      >
                        {/* Transaction Date */}
                        <td className="py-3 px-4 font-mono font-medium text-slate-500 text-[11px]">
                          {entry.date}
                        </td>

                        {/* Particular Log Description */}
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          {entry.particulars}
                        </td>

                        {/* Invoice reference link popup triggers */}
                        <td className="py-3 px-3 text-center font-mono">
                          {entry.invoiceObj && onOpenInvoice ? (
                            <button
                              id={`ledger-link-${entry.id}`}
                              onClick={() => {
                                if (entry.invoiceObj) onOpenInvoice(entry.invoiceObj);
                              }}
                              className="text-emerald-600 hover:text-emerald-700 font-bold hover:underline inline-flex items-center space-x-1 border-b border-dashed border-emerald-250 cursor-pointer"
                              title="Click to view and print receipt voucher"
                            >
                              <FileText className="w-3 h-3 text-emerald-500 mr-0.5" />
                              <span>{entry.refNumber}</span>
                            </button>
                          ) : (
                            <span className="text-slate-400">{entry.refNumber}</span>
                          )}
                        </td>

                        {/* Cash vs Bank */}
                        <td className="py-3 px-3 text-center text-[10px] font-bold text-slate-600 uppercase font-mono">
                          {entry.paymentType !== "-" ? (
                            <span className="px-1.5 py-0.5 bg-slate-50 text-slate-600 rounded border border-slate-100 uppercase tracking-wider text-[9px]">
                              {entry.paymentType}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>

                        {/* Debit (Dr) */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-700">
                          {entry.debit > 0 ? (
                            <span>₹{entry.debit.toFixed(2)}</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Credit (Cr) */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-750">
                          {entry.credit > 0 ? (
                            <span>₹{entry.credit.toFixed(2)}</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Progress Running Balance */}
                        <td className="py-3 px-4 text-right">
                          <span className={`font-mono font-black text-sm ${
                            entry.runningBalance > 0
                              ? isCustomer ? "text-emerald-700" : "text-rose-600"
                              : entry.runningBalance < 0
                                ? isCustomer ? "text-rose-600" : "text-emerald-600"
                                : "text-slate-400"
                          }`}>
                            ₹{entry.runningBalance.toFixed(2)}
                          </span>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>

          {/* Quick Payment Cash/Bank Settle Form - Panel Right Side */}
          <div className="bg-white border border-slate-150 rounded-xl p-5 shadow-xs font-sans print:hidden">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 mb-4 select-none">
              <Receipt className="w-4.5 h-4.5 text-indigo-600" />
              <h4 className="font-bold text-slate-900 text-sm">
                Record Cash/Bank Settle
              </h4>
            </div>

            {paySuccessMsg && (
              <div id="payment-recorded-success" className="mb-4 p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold rounded-lg flex items-center space-x-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Leger adjusted! Balance updated.</span>
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="space-y-4">
              {/* Payment Amount */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Settled Amount (₹)
                </label>
                <div className="relative">
                  <input
                    id="settle-amount-input"
                    type="number"
                    step="0.01"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="Enter collected amount..."
                    className="w-full pl-7 pr-3 py-2 border border-slate-200 focus:border-indigo-500 rounded-lg text-xs font-mono font-bold outline-none"
                  />
                  <IndianRupee className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
                </div>
              </div>

              {/* Settle Mode */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Payment Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="settle-mode-cash"
                    type="button"
                    onClick={() => setPayMethod("cash")}
                    className={`py-1.5 px-3 border rounded-lg text-[10px] font-bold uppercase transition text-center cursor-pointer select-none ${
                      payMethod === "cash"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-500 border-slate-205 hover:bg-slate-50"
                    }`}
                  >
                    Cash Desk
                  </button>
                  <button
                    id="settle-mode-bank"
                    type="button"
                    onClick={() => setPayMethod("bank")}
                    className={`py-1.5 px-3 border rounded-lg text-[10px] font-bold uppercase transition text-center cursor-pointer select-none ${
                      payMethod === "bank"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-500 border-slate-205 hover:bg-slate-50"
                    }`}
                  >
                    Bank / UPI
                  </button>
                </div>
              </div>

              {/* Remarks/Notes */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Reference Record / Notes
                </label>
                <textarea
                  id="settle-notes-input"
                  rows={2}
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Cleared pending bill invoice..."
                  className="w-full px-3 py-2 border border-slate-200 focus:border-indigo-500 rounded-lg text-xs outline-none"
                />
              </div>

              {/* Submit Payment Settle */}
              <button
                id="sumit-settle-btn"
                type="submit"
                disabled={recordingPayment}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-bold py-2 px-4 rounded-lg text-[10px] uppercase tracking-wider shadow cursor-pointer transition text-center flex items-center justify-center space-x-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>
                  {recordingPayment ? "Saving Ledger Adjustment..." : `Record Settle Receipt`}
                </span>
              </button>
            </form>
          </div>

        </div>

      </div>
    );
  }

  return (
    <div id="v-parties-container" className="space-y-6">
      
      {/* Page Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Parties (Customers & Suppliers)</h1>
          <p className="text-xs text-slate-500 mt-1">Manage accounts receivables, trade debts, contact states, and business GSTIN records. Click any contact to open their sub-ledger.</p>
        </div>
        
        {perms.create && (
          <button
            id="add-party-btn"
            onClick={openAddModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center space-x-2 shadow-md hover:shadow-lg transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer / Supplier</span>
          </button>
        )}
      </div>

      {/* Mini-ledger overview summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-4">
        <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/20 text-emerald-900 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Total Outstanding Receivables</span>
            <span className="font-sans font-black text-lg mt-1 block">₹{receivables.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
          <Coins className="w-8 h-8 text-emerald-500/30" />
        </div>
        <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/20 text-rose-900 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">Total Outstanding Payables</span>
            <span className="font-sans font-black text-lg mt-1 block">₹{payables.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
          <Building2 className="w-8 h-8 text-rose-500/30" />
        </div>
      </div>

      {/* Filter panel */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-150 shadow-xs">
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input
            id="party-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search party by name, telephone, state, or GSTIN..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 focus:border-emerald-500 rounded-xl text-xs outline-none font-medium transition"
          />
        </div>

        {/* Tab buttons */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          {(["all", "customer", "supplier"] as const).map(tab => (
            <button
              id={`party-filter-${tab}-btn`}
              key={tab}
              onClick={() => setTypeFilter(tab)}
              className={`flex-1 md:flex-none uppercase tracking-wider text-[10px] font-black px-4 py-1.5 rounded-lg select-none transition ${
                typeFilter === tab
                  ? "bg-white text-slate-800 shadow"
                  : "text-slate-450 hover:text-slate-800"
              }`}
            >
              {tab === "all" ? "All Contacts" : tab === "customer" ? "Customers Only" : "Suppliers Only"}
            </button>
          ))}
        </div>
      </div>

      {/* Parties Catalog Table */}
      <div className="bg-white border border-slate-150 rounded-xl shadow-sm overflow-hidden">
        {filteredParties.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center font-sans">
            <Contact2 className="w-16 h-16 text-slate-205 mb-2" />
            <p className="text-sm font-bold text-slate-700">No Party Match Found</p>
            <p className="text-xs text-slate-450 mt-1">Add a new partner or expand search terms.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-55 border-b border-slate-200 font-bold uppercase text-slate-500 select-none">
                <th className="py-3 px-4">Contact Name</th>
                <th className="py-3 px-3 text-center">Type</th>
                <th className="py-3 px-3">State / POS</th>
                <th className="py-3 px-3 text-center">GSTIN</th>
                <th className="py-3 px-4 text-right">Outstanding Balance</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredParties.map(p => {
                const isCustomer = p.type === "customer";
                const hasBalance = p.currentBalance > 0;
                
                return (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedLedgerParty(p)}
                    className="border-b border-slate-101 hover:bg-indigo-50/10 cursor-pointer group transition duration-150"
                    title="Click to view chronological statement ledgers for this store contact"
                  >
                    
                    {/* Contact details */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg transition duration-200 group-hover:scale-105 ${
                          isCustomer ? "bg-emerald-55 text-emerald-650" : "bg-indigo-50 text-indigo-600"
                        }`}>
                          {isCustomer ? <Contact2 className="w-4 h-4 animate-pulse-slow" /> : <Building2 className="w-4 h-4 animate-pulse-slow" />}
                        </div>
                        <div>
                          <p id={`party-row-${p.id}-name`} className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition flex items-center space-x-1">
                            <span>{p.name}</span>
                            <span className="hidden group-hover:inline-block text-[9px] font-mono font-bold leading-none bg-indigo-50 text-indigo-600 px-1 py-0.5 rounded uppercase mt-0.5 ml-2.5 shadow-xs">
                              🔗 Ledger Table
                            </span>
                          </p>
                          <p className="text-[10px] text-slate-505 mt-0.5 flex items-center space-x-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{p.phone || "No Mob"}</span>
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Customer vs Supplier */}
                    <td className="py-3.5 px-3 text-center">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wide ${
                        isCustomer ? "bg-emerald-50 text-emerald-600" : "bg-purple-50 text-purple-600"
                      }`}>
                        {p.type}
                      </span>
                    </td>

                    {/* State place of supply */}
                    <td className="py-3.5 px-3 font-medium text-slate-700">
                      <span className="flex items-center space-x-1 max-w-[150px] truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{p.state}</span>
                      </span>
                    </td>

                    {/* GSTIN */}
                    <td className="py-3.5 px-3 text-center font-mono text-slate-600 font-medium">
                      {p.gstin ? (
                        <span className="text-slate-800 font-semibold">{p.gstin}</span>
                      ) : (
                        <span className="text-slate-400 italic">URP (Consumers)</span>
                      )}
                    </td>

                    {/* Balance */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex flex-col items-end">
                        <span id={`party-row-${p.id}-balance`} className={`font-mono text-sm font-black ${
                          hasBalance 
                            ? isCustomer 
                              ? "text-emerald-700" 
                              : "text-rose-600"
                            : "text-slate-400"
                        }`}>
                          ₹{(p.currentBalance).toFixed(2)}
                        </span>
                        {hasBalance && (
                          <span className="text-[9px] text-slate-400 mt-0.5">
                            {isCustomer ? "Due (Receivable)" : "Due (Payable)"}
                          </span>
                        )}
                        {!hasBalance && (
                          <span className="text-[9px] text-slate-400 mt-0.5">Settled</span>
                        )}
                      </div>
                    </td>

                    {/* Action buttons */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        {perms.update && (
                          <button
                            id={`edit-party-${p.id}-btn`}
                            onClick={(e) => {
                              e.stopPropagation(); // preserve click boundaries
                              openEditModal(p);
                            }}
                            className="p-1 px-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition cursor-pointer"
                            title="Edit Contact Profile"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {perms.delete && (
                          <button
                            id={`delete-party-${p.id}-btn`}
                            onClick={(e) => handleDelete(p.id, p.name, e)}
                            className="p-1 px-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                            title="Delete Contact Profile"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Modal drawer form */}
      {isModalOpen && (
        <div id="party-modal-container" className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 flex items-center justify-end font-sans">
          <div id="party-modal-drawer" className="bg-white w-full max-w-md h-screen flex flex-col shadow-2xl p-6 overflow-y-auto">
            
            {/* Modal header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-101 mb-6">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {editingParty ? "Edit Contact Ledger" : "New Party Registration"}
                </h3>
              </div>
              <button
                id="close-party-modal-btn"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-450 hover:text-slate-700 text-xs font-bold bg-slate-100 rounded px-3 py-1 cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Party Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-750 uppercase tracking-wide mb-1.5 label-required">Business / Client Name</label>
                  <input
                    id="modal-party-name"
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Balaji Trade Outlets Ltd"
                    className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none"
                  />
                </div>

                {/* Class Type Customer vs Supplier */}
                <div>
                  <label className="block text-xs font-bold text-slate-750 uppercase tracking-wide mb-1.5 label-required">Contact Category</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      id="modal-party-category-customer"
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, type: "customer" }))}
                      className={`py-2 px-4 shadow-sm border rounded-lg text-xs font-bold uppercase transition select-none cursor-pointer text-center ${
                        formData.type === "customer"
                          ? "bg-emerald-50 border-emerald-550 text-emerald-700"
                          : "bg-white border-slate-205 text-slate-500"
                      }`}
                    >
                      Customer (Receivable)
                    </button>
                    <button
                      id="modal-party-category-supplier"
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, type: "supplier" }))}
                      className={`py-2 px-4 shadow-sm border rounded-lg text-xs font-bold uppercase transition select-none cursor-pointer text-center ${
                        formData.type === "supplier"
                          ? "bg-purple-50 border-purple-555 text-purple-700"
                          : "bg-white border-slate-205 text-slate-500"
                      }`}
                    >
                      Supplier (Payable)
                    </button>
                  </div>
                </div>

                {/* Mobile and Email */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-750 uppercase tracking-wide mb-1.5">Mobile Phone No.</label>
                    <input
                      id="modal-party-phone"
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="e.g. +91 9988776655"
                      className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-750 uppercase tracking-wide mb-1.5">Email Address</label>
                    <input
                      id="modal-party-email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="e.g. billing@client.com"
                      className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none"
                    />
                  </div>
                </div>

                {/* Indian States Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-slate-750 uppercase tracking-wide mb-1.5 label-required">State (Place of Supply)</label>
                  <select
                    id="modal-party-state"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="w-full px-2 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs bg-white outline-none"
                  >
                    {INDIAN_STATES.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>

                {/* GSTIN (optional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-755 uppercase tracking-wide mb-1.5 text-slate-720">Client GSTIN (15 Digits)</label>
                  <input
                    id="modal-party-gstin"
                    type="text"
                    name="gstin"
                    maxLength={15}
                    value={formData.gstin}
                    onChange={handleInputChange}
                    placeholder="e.g. 27BBBCC1234F1Z3"
                    className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none font-mono uppercase"
                  />
                </div>

                {/* Opening balance - Omit if editing to protect ledgers */}
                {!editingParty && (
                  <div>
                    <label className="block text-xs font-bold text-slate-750 uppercase tracking-wide mb-1.5">Opening Balance Receivable/Payable (₹)</label>
                    <input
                      id="modal-party-initial-balance"
                      type="number"
                      name="initialBalance"
                      value={formData.initialBalance || ""}
                      onChange={handleInputChange}
                      placeholder="Outstanding starting debt..."
                      className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-6 border-t border-slate-100">
                <button
                  id="save-party-modal-btn"
                  type="submit"
                  className="w-full bg-emerald-650 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs tracking-wider uppercase shadow transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>Register Contact</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
