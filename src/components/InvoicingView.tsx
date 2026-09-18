/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Item, Party, Invoice, InvoiceItem, BusinessProfile } from "../types.js";
import {
  Plus,
  Trash2,
  CalendarDays,
  User,
  ShoppingBag,
  Building2,
  Coins,
  Receipt,
  Scale,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Keyboard,
  Search,
  HelpCircle,
  RotateCcw,
  Info,
  Truck,
  FileText
} from "lucide-react";

interface InvoicingViewProps {
  type: 'sale' | 'purchase'; // Sales vs Purchase entry!
  items: Item[];
  parties: Party[];
  business: BusinessProfile;
  invoiceToEdit?: Invoice | null;
  isReturnMode?: boolean;
  onSaveInvoice: (invoice: Invoice) => Promise<void>;
  onNavigateTab: (tab: string) => void;
  onCancelEdit?: () => void;
  permissions?: any;
}

interface InvoiceLine {
  itemId: string;
  quantity: number;
  customPrice: number; // editable unit rate
  discount: number; // discount value (percent % or flat ₹)
  discountType?: 'percent' | 'amount'; // defaults to percent %
  gstRate: number;
}

export default function InvoicingView({
  type,
  items,
  parties,
  business,
  invoiceToEdit,
  isReturnMode,
  onSaveInvoice,
  onNavigateTab,
  onCancelEdit,
  permissions
}: InvoicingViewProps) {
  
  const perms = permissions || { view: true, create: true, update: true, delete: true };
  
  // Transaction subtype: sale vs sale_return, purchase vs purchase_return
  const [txSubtype, setTxSubtype] = useState<'sale' | 'purchase' | 'sale_return' | 'purchase_return'>(
    isReturnMode ? (type === "sale" ? "sale_return" : "purchase_return") : type
  );

  // Filter parties by role
  const relevantParties = useMemo(() => {
    return parties.filter(p => p.type === (type === "sale" ? "customer" : "supplier"));
  }, [parties, type]);

  // Form states
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [originalInvoiceNumber, setOriginalInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLine[]>([
    { itemId: "", quantity: 1, customPrice: 0, discount: 0, discountType: 'percent', gstRate: 0 }
  ]);
  const [extraCharges, setExtraCharges] = useState<Array<{ title: string; amount: number }>>([]);
  const [paymentType, setPaymentType] = useState<'cash' | 'bank' | 'unpaid'>('bank');
  const [paidAmt, setPaidAmt] = useState<number>(0);
  const [customPaidAmount, setCustomPaidAmount] = useState<boolean>(false); // tracks if user typed manually
  const [notes, setNotes] = useState("");
  const [errorText, setErrorText] = useState("");
  const [sourceChallanId, setSourceChallanId] = useState<string | undefined>(undefined);
  const [sourceChallanNumber, setSourceChallanNumber] = useState<string | undefined>(undefined);
  const [sourceQuotationId, setSourceQuotationId] = useState<string | undefined>(undefined);
  const [sourceQuotationNumber, setSourceQuotationNumber] = useState<string | undefined>(undefined);

  // Autocomplete state for Parties selection list
  const [partySearchText, setPartySearchText] = useState("");
  const [isPartySearchOpen, setIsPartySearchOpen] = useState(false);
  const [partyHighlightedIndex, setPartyHighlightedIndex] = useState(0);

  // Quick Terminal state
  const [quickQuery, setQuickQuery] = useState("");
  const [isQuickTerminalFocused, setIsQuickTerminalFocused] = useState(false);
  const [quickHighlightedIndex, setQuickHighlightedIndex] = useState(0);
  const [quickNotification, setQuickNotification] = useState("");

  // DOM Refs for focal interactions
  const quickInputRef = useRef<HTMLInputElement>(null);
  const partyInputRef = useRef<HTMLInputElement>(null);

  const activeParty = useMemo(() => {
    return parties.find(p => p.id === selectedPartyId);
  }, [parties, selectedPartyId]);

  // Sync / pre-populate form on editing or reset
  useEffect(() => {
    if (invoiceToEdit) {
      setTxSubtype(invoiceToEdit.type as any);
      setSelectedPartyId(invoiceToEdit.partyId);
      const prt = parties.find(p => p.id === invoiceToEdit.partyId);
      if (prt) setPartySearchText(prt.name);
      
      setInvoiceNumber(invoiceToEdit.invoiceNumber);
      setOriginalInvoiceNumber(invoiceToEdit.originalInvoiceNumber || "");
      setInvoiceDate(invoiceToEdit.date);
      setNotes(invoiceToEdit.notes || "");
      setSourceChallanId(invoiceToEdit.sourceChallanId);
      setSourceChallanNumber(invoiceToEdit.sourceChallanNumber);
      setSourceQuotationId(invoiceToEdit.sourceQuotationId);
      setSourceQuotationNumber(invoiceToEdit.sourceQuotationNumber);
      setPaymentType(invoiceToEdit.paymentType || (invoiceToEdit.type.includes("return") ? "unpaid" : "bank"));
      setPaidAmt(invoiceToEdit.paidAmount || 0);
      setCustomPaidAmount(true);
      setExtraCharges(invoiceToEdit.extraCharges || []);
      
      if (invoiceToEdit.items && invoiceToEdit.items.length > 0) {
        setInvoiceLines(invoiceToEdit.items.map(item => {
          const discountAmt = item.discount || 0;
          const gross = (item.quantity || 0) * (item.price || 0);
          let discType: 'percent' | 'amount' = 'percent';
          let discVal = 0;

          if (discountAmt > 0) {
            if (gross > 0) {
              const pct = (discountAmt / gross) * 100;
              if (Number.isInteger(pct) || Number(pct.toFixed(2)) === pct) {
                discVal = parseFloat(pct.toFixed(2));
                discType = 'percent';
              } else {
                discVal = discountAmt;
                discType = 'amount';
              }
            } else {
              discVal = discountAmt;
              discType = 'amount';
            }
          }

          return {
            itemId: item.itemId,
            quantity: item.quantity,
            customPrice: item.price,
            discount: discVal,
            discountType: discType,
            gstRate: item.gstRate
          };
        }));
      }
    } else if (isReturnMode) {
      const returnSubtype = type === "sale" ? "sale_return" : "purchase_return";
      setTxSubtype(returnSubtype);
      setSelectedPartyId("");
      setPartySearchText("");
      setOriginalInvoiceNumber("");
      setNotes("");
      setPaymentType("unpaid");
      setCustomPaidAmount(false);
      setExtraCharges([]);
      setInvoiceLines([{ itemId: "", quantity: 1, customPrice: 0, discount: 0, discountType: 'percent', gstRate: 0 }]);
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const prefix = type === "sale" ? "CN" : "DN";
      setInvoiceNumber(`${prefix}-2026-${randomSuffix}`);
      setInvoiceDate(new Date().toISOString().split("T")[0]);
    } else {
      setTxSubtype(type);
      setOriginalInvoiceNumber("");
      setSelectedPartyId("");
      setPartySearchText("");
      setNotes("");
      setPaymentType("bank");
      setCustomPaidAmount(false);
      setExtraCharges([]);
      setInvoiceLines([{ itemId: "", quantity: 1, customPrice: 0, discount: 0, discountType: 'percent', gstRate: 0 }]);
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const prefix = type === "sale" ? "INV" : "PUR";
      setInvoiceNumber(`${prefix}-2026-${randomSuffix}`);
      setInvoiceDate(new Date().toISOString().split("T")[0]);
    }
  }, [type, invoiceToEdit, isReturnMode, parties]);

  // Subtype toggle handler
  const handleToggleSubtype = (newSub: 'sale' | 'purchase' | 'sale_return' | 'purchase_return') => {
    setTxSubtype(newSub);
    if (!invoiceToEdit || !invoiceToEdit.id) {
      const prefix = newSub === "sale_return" ? "CN" : newSub === "purchase_return" ? "DN" : newSub === "sale" ? "INV" : "PUR";
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      setInvoiceNumber(`${prefix}-2026-${randomSuffix}`);
      if (newSub.includes("return")) {
        setPaymentType("unpaid");
      }
    }
  };

  // Handle setting default paid amount when lines total changes
  const computedInvoiceDetails = useMemo(() => {
    let subtotal = 0;
    let taxAmount = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;

    const formattedLines: InvoiceItem[] = invoiceLines.map(line => {
      const originalItem = items.find(i => i.id === line.itemId);
      if (!originalItem) {
        return {
          itemId: "",
          itemName: "",
          hsn: "",
          quantity: 0,
          price: 0,
          discount: 0,
          gstRate: 0,
          amountBeforeTax: 0,
          taxAmount: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          totalAmount: 0
        };
      }

      const rate = line.customPrice || 0;
      const qty = line.quantity || 0;
      const grossAmt = qty * rate;
      const rawDisc = typeof line.discount === 'number' && !isNaN(line.discount) ? Math.max(0, line.discount) : 0;

      let lineDisc = 0;
      if (line.discountType === 'amount') {
        lineDisc = Math.min(grossAmt, rawDisc);
      } else {
        // Defaults to percent: blank or 0 is treated as 0% (₹0 discount)
        lineDisc = (grossAmt * Math.min(100, rawDisc)) / 100;
      }

      const amtBeforeTax = Math.max(0, grossAmt - lineDisc);
      const rowTax = amtBeforeTax * (line.gstRate / 100);
      const rowTotal = amtBeforeTax + rowTax;

      // GST determination based on inter-state shipping rules
      let itemCgst = 0;
      let itemSgst = 0;
      let itemIgst = 0;

      const isInterstate = activeParty && activeParty.state !== business.state;

      if (!isInterstate) {
        itemCgst = rowTax / 2;
        itemSgst = rowTax / 2;
      } else {
        itemIgst = rowTax;
      }

      subtotal += amtBeforeTax;
      taxAmount += rowTax;
      cgstTotal += itemCgst;
      sgstTotal += itemSgst;
      igstTotal += itemIgst;

      return {
        itemId: originalItem.id,
        itemName: originalItem.name,
        hsn: originalItem.hsn,
        quantity: line.quantity,
        price: rate,
        discount: lineDisc,
        gstRate: line.gstRate,
        amountBeforeTax: amtBeforeTax,
        taxAmount: rowTax,
        cgst: itemCgst,
        sgst: itemSgst,
        igst: itemIgst,
        totalAmount: rowTotal
      };
    }).filter(i => i.itemId !== "");

    // Sum up dynamic extra charges with non-empty titles and positive values
    const extraChargesSum = extraCharges.reduce((sum, curr) => sum + (curr.amount || 0), 0);
    const grandTotal = subtotal + taxAmount + extraChargesSum;

    return {
      subtotal,
      taxAmount,
      cgstTotal,
      sgstTotal,
      igstTotal,
      extraChargesSum,
      grandTotal,
      lines: formattedLines
    };
  }, [invoiceLines, items, activeParty, business, extraCharges]);

  // Monitor total changes to auto-update payment inputs
  useEffect(() => {
    if (!customPaidAmount) {
      if (paymentType === "unpaid") {
        setPaidAmt(0);
      } else {
        setPaidAmt(parseFloat(computedInvoiceDetails.grandTotal.toFixed(2)));
      }
    }
  }, [computedInvoiceDetails.grandTotal, paymentType, customPaidAmount]);

  // Adjust remaining outstanding balance
  const remainingDebt = useMemo(() => {
    const r = computedInvoiceDetails.grandTotal - paidAmt;
    return r > 0.01 ? parseFloat(r.toFixed(2)) : 0;
  }, [computedInvoiceDetails.grandTotal, paidAmt]);

  // Add item row line
  const addLineRow = () => {
    setInvoiceLines(prev => [...prev, { itemId: "", quantity: 1, customPrice: 0, discount: 0, discountType: 'percent', gstRate: 0 }]);
  };

  // Remove row line
  const removeLineRow = (idx: number) => {
    if (invoiceLines.length === 1) return;
    setInvoiceLines(prev => prev.filter((_, i) => i !== idx));
  };

  // Select Item catalog row helper
  const handleLineItemChange = (idx: number, itemId: string) => {
    const selectedItem = items.find(i => i.id === itemId);
    if (!selectedItem) return;

    setInvoiceLines(prev => {
      const copy = [...prev];
      copy[idx] = {
        itemId,
        quantity: copy[idx].quantity || 1,
        customPrice: type === "sale" ? selectedItem.salePrice : selectedItem.purchasePrice,
        discount: copy[idx].discount || 0,
        discountType: copy[idx].discountType || 'percent',
        gstRate: selectedItem.gstRate
      };
      return copy;
    });
  };

  // Generic Row input change
  const handleLineValueChange = (idx: number, field: 'quantity' | 'customPrice' | 'gstRate' | 'discount', value: number) => {
    setInvoiceLines(prev => {
      const copy = [...prev];
      copy[idx] = {
        ...copy[idx],
        [field]: isNaN(value) ? 0 : Math.max(0, value)
      };
      return copy;
    });
  };

  // Toggle discount unit (% vs ₹)
  const handleDiscountTypeToggle = (idx: number) => {
    setInvoiceLines(prev => {
      const copy = [...prev];
      const curType = copy[idx].discountType || 'percent';
      copy[idx] = {
        ...copy[idx],
        discountType: curType === 'percent' ? 'amount' : 'percent'
      };
      return copy;
    });
  };

  // Synchronized Party Autocomplete matches
  const matchedParties = useMemo(() => {
    if (!partySearchText.trim()) return relevantParties;
    const lower = partySearchText.toLowerCase();
    return relevantParties.filter(p => 
      p.name.toLowerCase().includes(lower) ||
      (p.gstin && p.gstin.toLowerCase().includes(lower)) ||
      (p.phone && p.phone.toLowerCase().includes(lower))
    );
  }, [relevantParties, partySearchText]);

  // Synchronized Quick Item Autocomplete calculations
  const parsedQuickTerminal = useMemo(() => {
    const trimmed = quickQuery.trim();
    if (!trimmed) {
      return { query: "", qty: 1 };
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length > 1) {
      const lastToken = parts[parts.length - 1];
      if (/^\s*\d+\s*$/.test(lastToken)) {
        const qty = parseInt(lastToken) || 1;
        const query = parts.slice(0, -1).join(" ");
        return { query, qty };
      }
    }
    return { query: trimmed, qty: 1 };
  }, [quickQuery]);

  const terminalMatches = useMemo(() => {
    const { query } = parsedQuickTerminal;
    if (!query) return [];
    
    const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean);
    return items.filter(item => {
      // Check explicit direct barcode match first
      const hasDirectBarcode = item.barcodes && item.barcodes.some(b => b.toLowerCase() === query.toLowerCase());
      if (hasDirectBarcode) return true;

      const nameLower = item.name.toLowerCase();
      const hsnLower = item.hsn.toLowerCase();
      
      // Word containment match: all words must find a match
      return queryWords.every(word =>
        nameLower.includes(word) ||
        hsnLower.includes(word) ||
        (item.barcodes && item.barcodes.some(b => b.toLowerCase().includes(word)))
      );
    });
  }, [items, parsedQuickTerminal]);

  // Terminal submission action
  const handleAddFromTerminal = (item: Item, qty: number) => {
    setInvoiceLines(prev => {
      const isSoloBlank = prev.length === 1 && !prev[0].itemId;
      const existingIdx = prev.findIndex(line => line.itemId === item.id);
      
      if (existingIdx > -1) {
        const copy = [...prev];
        copy[existingIdx] = {
          ...copy[existingIdx],
          quantity: copy[existingIdx].quantity + qty
        };
        return copy;
      } else {
        const newRow: InvoiceLine = {
          itemId: item.id,
          quantity: qty,
          customPrice: type === "sale" ? item.salePrice : item.purchasePrice,
          discount: 0,
          discountType: 'percent',
          gstRate: item.gstRate
        };
        if (isSoloBlank) {
          return [newRow];
        } else {
          return [...prev, newRow];
        }
      }
    });

    setQuickQuery("");
    setQuickNotification(`Added ${qty}x ${item.name} successfully!`);
    setTimeout(() => {
      setQuickNotification("");
    }, 2000);
  };

  // Keyboard events listener for fast input
  useEffect(() => {
    const handleInvoicingShortcuts = (e: KeyboardEvent) => {
      // F2 -> submit form
      if (e.key === "F2") {
        e.preventDefault();
        const submitBtn = document.getElementById("invoice-submit-btn-element");
        if (submitBtn) submitBtn.click();
      }
      // F4 -> focus party input box
      if (e.key === "F4") {
        e.preventDefault();
        if (partyInputRef.current) {
          partyInputRef.current.focus();
          partyInputRef.current.select();
        }
      }
      // F8 -> focus Quick Command terminal
      if (e.key === "F8") {
        e.preventDefault();
        if (quickInputRef.current) {
          quickInputRef.current.focus();
          quickInputRef.current.select();
        }
      }
      // F9 -> Add new empty row
      if (e.key === "F9") {
        e.preventDefault();
        addLineRow();
      }
    };

    window.addEventListener("keydown", handleInvoicingShortcuts);
    return () => window.removeEventListener("keydown", handleInvoicingShortcuts);
  }, [items, type]);

  // Trigger invoice posting
  const handleInvoiceFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText("");

    if (!selectedPartyId) {
      setErrorText("Please select or register a Party before creating an invoice.");
      return;
    }

    const validLines = computedInvoiceDetails.lines;
    if (validLines.length === 0) {
      setErrorText("Please add at least one valid stock item to this invoice.");
      return;
    }

    const processedInvoice: Invoice = {
      id: invoiceToEdit && invoiceToEdit.id ? invoiceToEdit.id : "",
      invoiceNumber,
      date: invoiceDate,
      partyId: selectedPartyId,
      partyName: activeParty?.name || "Unknown Party",
      partyGstin: activeParty?.gstin || "",
      type: txSubtype,
      items: validLines,
      subtotal: computedInvoiceDetails.subtotal,
      taxAmount: computedInvoiceDetails.taxAmount,
      cgstTotal: computedInvoiceDetails.cgstTotal,
      sgstTotal: computedInvoiceDetails.sgstTotal,
      igstTotal: computedInvoiceDetails.igstTotal,
      extraCharges: extraCharges.filter(c => c.title.trim() && c.amount > 0),
      totalAmount: computedInvoiceDetails.grandTotal,
      paymentType,
      paidAmount: paidAmt,
      remainingAmount: remainingDebt,
      notes,
      originalInvoiceNumber: originalInvoiceNumber.trim() || undefined,
      sourceChallanId,
      sourceChallanNumber,
      sourceQuotationId,
      sourceQuotationNumber
    };

    try {
      await onSaveInvoice(processedInvoice);
      
      // Reset form variables
      setSelectedPartyId("");
      setOriginalInvoiceNumber("");
      setInvoiceLines([{ itemId: "", quantity: 1, customPrice: 0, discount: 0, gstRate: 0 }]);
      setNotes("");
      setExtraCharges([]);
      setCustomPaidAmount(false);
      setSourceChallanId(undefined);
      setSourceChallanNumber(undefined);
      setSourceQuotationId(undefined);
      setSourceQuotationNumber(undefined);
      
      // Navigate users safely
      onNavigateTab("dashboard");
    } catch (err: any) {
      setErrorText(err.message || "Failed to submit billing invoice transaction.");
    }
  };

  // Format currency helpers
  const formatINR = (val: number) => {
    return "₹" + val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Safe checks if catalog registries are blank
  if (items.length === 0 || relevantParties.length === 0) {
    return (
      <div id="invoice-setup-warning" className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center max-w-lg mx-auto shadow-sm my-12">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="font-bold text-slate-800 text-lg">Prerequisites Missing</h3>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Before creating GST compliant {type === "sale" ? "Sales Invoices" : "Purchases Bills"}, you must first register items in your inventory catalog and create registered parties under contacts.
        </p>
        <div className="mt-6 flex justify-center space-x-3">
          {items.length === 0 && (
            <button
              id="warn-nav-items-btn"
              onClick={() => onNavigateTab("items")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1.5 px-3 rounded-lg text-xs transition"
            >
              Add first Item
            </button>
          )}
          {relevantParties.length === 0 && (
            <button
              id="warn-nav-parties-btn"
              onClick={() => onNavigateTab("parties")}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-1.5 px-3 rounded-lg text-xs transition"
            >
              Register a {type === "sale" ? "Customer" : "Supplier"}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div id="v-invoicing-container" className="space-y-6">

      {/* Keyboard shortcuts row */}
      <div className="bg-slate-900 text-slate-100 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between text-xs font-mono shadow-sm border border-slate-800">
        <div className="flex items-center space-x-2">
          <Keyboard className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-slate-300">Quick Shortcuts:</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-1 sm:mt-0">
          <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] border border-slate-700">
            <kbd className="font-bold text-emerald-400">F2</kbd> Save Details
          </span>
          <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] border border-slate-700">
            <kbd className="font-bold text-emerald-400">F4</kbd> Search Party
          </span>
          <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] border border-slate-700">
            <kbd className="font-bold text-emerald-400">F8</kbd> Quick Terminal
          </span>
          <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] border border-slate-700">
            <kbd className="font-bold text-emerald-400">F9</kbd> New Row
          </span>
        </div>
      </div>
      
      {/* Page Title */}
      <div className="pb-2 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 border-none flex items-center gap-2 font-sans">
            {invoiceToEdit ? (
              <span className="text-amber-600 bg-amber-50 px-2.5 py-0.5 border border-amber-200 rounded-lg text-sm font-bold uppercase shrink-0">
                EDIT BILL
              </span>
            ) : null}
            <span>
              {txSubtype === "sale" ? "Create Sales Invoice" : 
               txSubtype === "sale_return" ? "Sales Return (Credit Note)" : 
               txSubtype === "purchase" ? "Create Purchase Bill" : 
               "Purchase Return (Debit Note)"}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {invoiceToEdit ? `Modifying bill #${invoiceToEdit.invoiceNumber}` : (
              txSubtype === "sale" 
                ? "Create and print clean GST invoices for your customers." 
                : txSubtype === "sale_return"
                ? "Record sales return and adjust stock and customer balance."
                : txSubtype === "purchase"
                ? "Record purchases from suppliers and update stock."
                : "Record purchase returns and debit note."
            )}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {onCancelEdit && invoiceToEdit && (
            <button
              id="cancel-edit-btn"
              type="button"
              onClick={onCancelEdit}
              className="bg-slate-100 text-slate-700 border border-slate-200 py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer select-none hover:bg-slate-200 transition"
            >
              Cancel
            </button>
          )}

          {/* Quick toggle pill tabs for Standard vs Return */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleToggleSubtype(type)}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer select-none ${
                txSubtype === type
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {type === "sale" ? "Sales Bill" : "Purchase Bill"}
            </button>
            <button
              type="button"
              onClick={() => handleToggleSubtype(type === "sale" ? "sale_return" : "purchase_return")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 cursor-pointer select-none ${
                txSubtype.includes("return")
                  ? "bg-indigo-600 text-white shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{type === "sale" ? "Sales Return (Credit Note)" : "Purchase Return (Debit Note)"}</span>
            </button>
          </div>
        </div>
      </div>

      {errorText && (
        <div className="p-3.5 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-xs font-semibold flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <span>{errorText}</span>
        </div>
      )}

      {sourceChallanNumber && (
        <div className="p-3.5 bg-blue-50 text-blue-900 border border-blue-200 rounded-xl text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Truck className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <p className="font-bold text-slate-900">
                Converting Delivery Challan: <span className="font-mono text-blue-700">{sourceChallanNumber}</span>
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Physical goods were already deducted during challan dispatch. Saving this invoice will record tax/revenue and party ledger balance without double-deducting inventory stock.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSourceChallanId(undefined);
              setSourceChallanNumber(undefined);
            }}
            className="text-xs text-blue-700 hover:text-blue-900 font-semibold px-2.5 py-1 rounded bg-white border border-blue-200 shrink-0 ml-3"
          >
            Detach Challan
          </button>
        </div>
      )}

      {sourceQuotationNumber && (
        <div className="p-3.5 bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-xl text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
            <div>
              <p className="font-bold text-slate-900">
                Converting Quotation: <span className="font-mono text-indigo-700">{sourceQuotationNumber}</span>
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Pre-filled from confirmed quotation. Saving this invoice will record tax/revenue, deduct inventory stock, and mark the quotation as converted.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSourceQuotationId(undefined);
              setSourceQuotationNumber(undefined);
            }}
            className="text-xs text-indigo-700 hover:text-indigo-900 font-semibold px-2.5 py-1 rounded bg-white border border-indigo-200 shrink-0 ml-3"
          >
            Detach Quotation
          </button>
        </div>
      )}

      {/* Main Billing Canvas */}
      <form onSubmit={handleInvoiceFormSubmit} className="space-y-6">
        
        {/* Step 1: Party and Core Invoice Metadata */}
        <div className="bg-white border border-slate-150 rounded-xl p-5 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-5">
          
          {/* Party Dropdown selection */}
          <div className="md:col-span-2 relative">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 label-required">
              {txSubtype.includes("sale") ? "Customer Details" : "Supplier Details"} (Search - F4)
            </label>
            <div className="relative">
              <input
                id="invoice-party-autocomplete"
                ref={partyInputRef}
                type="text"
                required
                placeholder={`Search ${txSubtype.includes("sale") ? "customer" : "supplier"} name, phone or GSTIN...`}
                value={partySearchText}
                onChange={(e) => {
                  setPartySearchText(e.target.value);
                  setIsPartySearchOpen(true);
                  setPartyHighlightedIndex(0);
                  // Clear selected ID if the text doesn't match perfectly
                  const matched = relevantParties.find(p => p.name === e.target.value);
                  if (matched) setSelectedPartyId(matched.id);
                }}
                onFocus={() => setIsPartySearchOpen(true)}
                onBlur={() => {
                  setTimeout(() => {
                    setIsPartySearchOpen(false);
                  }, 200);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setPartyHighlightedIndex(prev => (prev + 1) % Math.max(1, matchedParties.length));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setPartyHighlightedIndex(prev => (prev - 1 + matchedParties.length) % Math.max(1, matchedParties.length));
                  } else if (e.key === "Enter") {
                    if (isPartySearchOpen && matchedParties[partyHighlightedIndex]) {
                      e.preventDefault();
                      const p = matchedParties[partyHighlightedIndex];
                      setSelectedPartyId(p.id);
                      setPartySearchText(p.name);
                      setIsPartySearchOpen(false);
                    }
                  } else if (e.key === "Escape") {
                    setIsPartySearchOpen(false);
                  }
                }}
                className="w-full pl-3 pr-8 py-2.5 border border-slate-200 focus:border-emerald-500 rounded-xl text-xs outline-none font-medium appearance-none"
              />
              <div className="absolute right-3 top-3 pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
            </div>

            {/* Floating list */}
            {isPartySearchOpen && matchedParties.length > 0 && (
              <div className="absolute z-55 w-full bg-white border border-slate-200 rounded-xl mt-1 shadow-lg max-h-56 overflow-y-auto font-sans text-xs">
                {matchedParties.map((p, pIdx) => (
                  <div
                    key={p.id}
                    onMouseDown={() => {
                      setSelectedPartyId(p.id);
                      setPartySearchText(p.name);
                      setIsPartySearchOpen(false);
                    }}
                    className={`p-2.5 cursor-pointer flex justify-between items-center transition ${
                      pIdx === partyHighlightedIndex ? "bg-slate-100 text-slate-900 font-bold" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div>
                      <p className="font-semibold">{p.name.replace(/\s*\((Customer|Supplier)\)/gi, "")}</p>
                      <p className="text-[10px] text-slate-400 font-mono">GSTIN: {p.gstin || "Unregistered"} | Phone: {p.phone || "No phone"}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                      Balance: ₹{p.currentBalance.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            {/* Show place of supply alert */}
            {activeParty && (
              <div className="mt-2.5 bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-[11px] text-slate-600 space-y-1">
                <p><span className="font-semibold text-slate-800">Place of Supply:</span> {activeParty.state}</p>
                <p><span className="font-semibold text-slate-800">GSTIN:</span> {activeParty.gstin || "Unregistered (URP)"}</p>
                <p><span className="font-semibold text-slate-800">Tax Type:</span>{" "}
                  {activeParty.state === business.state ? (
                    <span className="text-emerald-700 font-bold">Local State (CGST + SGST)</span>
                  ) : (
                    <span className="text-indigo-600 font-bold">Interstate (IGST)</span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Subtype Dropdown selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Bill Type
            </label>
            <select
              id="invoice-type-select"
              value={txSubtype}
              onChange={(e) => handleToggleSubtype(e.target.value as any)}
              className="w-full px-3 py-2.5 border border-slate-200 focus:border-emerald-500 rounded-xl text-xs outline-none bg-white font-semibold font-sans"
            >
              {type === "sale" ? (
                <>
                  <option value="sale">Sales Invoice</option>
                  <option value="sale_return">Sales Return (Credit Note)</option>
                </>
              ) : (
                <>
                  <option value="purchase">Purchase Bill</option>
                  <option value="purchase_return">Purchase Return (Debit Note)</option>
                </>
              )}
            </select>
          </div>

          {/* Invoice Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              {txSubtype.includes("return") ? (txSubtype === "sale_return" ? "Credit Note Number" : "Debit Note Number") : "Invoice Number"}
            </label>
            <input
              id="invoice-id-input"
              type="text"
              required
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 focus:border-emerald-500 rounded-xl text-xs outline-none font-mono font-bold"
            />
          </div>

          {/* Invoice Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              {txSubtype.includes("return") ? "Return Date" : "Invoice Date"}
            </label>
            <div className="relative">
              <input
                id="invoice-date-input"
                type="date"
                required
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 focus:border-emerald-500 rounded-xl text-xs outline-none font-mono"
              />
              <div className="pointer-events-none text-slate-400 absolute right-3 top-3">
                <CalendarDays className="w-4 h-4" />
              </div>
            </div>
          </div>

        </div>

        {/* Return Note Original Bill Reference Link Bar */}
        {txSubtype.includes("return") && (
          <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2.5 text-indigo-950">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-slate-900">
                  {txSubtype === "sale_return" ? "Sales Return (Credit Note)" : "Purchase Return (Debit Note)"} Mode
                </p>
                <p className="text-[11px] text-slate-600">
                  Returned stock will {txSubtype === "sale_return" ? "be added back into inventory" : "be deducted from inventory"}. Ledger balance will adjust automatically.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <label htmlFor="invoice-original-ref-input" className="font-bold text-slate-700 text-[11px] uppercase tracking-wide">
                Original Bill Ref #:
              </label>
              <input
                id="invoice-original-ref-input"
                type="text"
                placeholder="e.g. INV-2026-101"
                value={originalInvoiceNumber}
                onChange={(e) => setOriginalInvoiceNumber(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 focus:border-indigo-500 rounded-lg text-xs outline-none font-mono font-bold bg-white w-48 shadow-xs"
              />
            </div>
          </div>
        )}

        {/* Step 2: Line Items Grid Table */}
        <div className="bg-white border border-slate-150 rounded-xl shadow-xs overflow-hidden p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-3">
            <div>
              <h3 className="font-bold text-slate-800 tracking-tight text-sm">
                {txSubtype.includes("return") ? "Return Items" : "Items & Services"}
              </h3>
              <p className="text-[10px] text-slate-500">Select items, quantity, rate, discount, and GST</p>
            </div>
            <button
              id="add-line-row-btn"
              type="button"
              onClick={addLineRow}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 py-1.5 px-3.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer select-none"
            >
              <Plus className="w-4 h-4" />
              <span>Add Item (F9)</span>
            </button>
          </div>

          {/* Quick Command Terminal / Barcode input */}
          <div className="relative bg-slate-50 rounded-xl p-4 border border-slate-200 shadow-inner">
            <div className="flex items-center space-x-2 mb-2 text-[11px] text-slate-600 font-medium">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-slate-700">Quick Item Search / Barcode Scanner [F8]</span>
              <span className="text-slate-400">| Type item name, barcode, or e.g. "apex 170 14" to add 14 qty</span>
            </div>
            <div className="relative">
              <input
                ref={quickInputRef}
                type="text"
                placeholder="⌨️ Press F8 to search... Type item name or scan barcode, then press Enter"
                value={quickQuery}
                onFocus={() => setIsQuickTerminalFocused(true)}
                onBlur={() => {
                  setTimeout(() => {
                    setIsQuickTerminalFocused(false);
                  }, 200);
                }}
                onChange={(e) => {
                  setQuickQuery(e.target.value);
                  setQuickHighlightedIndex(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setQuickHighlightedIndex(prev => (prev + 1) % Math.max(1, terminalMatches.length));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setQuickHighlightedIndex(prev => (prev - 1 + terminalMatches.length) % Math.max(1, terminalMatches.length));
                  } else if (e.key === "Enter") {
                    if (terminalMatches.length > 0) {
                      e.preventDefault();
                      handleAddFromTerminal(terminalMatches[quickHighlightedIndex], parsedQuickTerminal.qty);
                    } else if (quickQuery.trim()) {
                      const trimmed = quickQuery.trim();
                      const matchByBarcode = items.find(it => it.barcodes && it.barcodes.some(b => b.toLowerCase() === trimmed.toLowerCase()));
                      if (matchByBarcode) {
                        e.preventDefault();
                        handleAddFromTerminal(matchByBarcode, 1);
                      }
                    }
                  } else if (e.key === "Escape") {
                    setQuickQuery("");
                  }
                }}
                className="w-full bg-white px-3.5 py-2.5 pl-9 border border-indigo-150 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 rounded-xl text-xs outline-none font-mono font-bold text-slate-800 placeholder-slate-400"
              />
              <div className="absolute left-3.5 top-3 text-indigo-500">
                <Search className="w-4 h-4" />
              </div>
            </div>

            {/* Live Autocomplete suggestions below terminal */}
            {isQuickTerminalFocused && quickQuery.trim() && (
              <div className="absolute left-4 right-4 z-55 bg-white border border-slate-200 rounded-xl mt-1.5 shadow-xl max-h-60 overflow-y-auto font-mono text-[11px] leading-relaxed">
                {terminalMatches.length === 0 ? (
                  <div className="p-3 text-slate-400 italic text-center">
                    No items found for "{parsedQuickTerminal.query}". Press Esc to clear.
                  </div>
                ) : (
                  <div>
                    <div className="bg-slate-50 p-2 text-[10px] text-slate-400 font-sans border-b border-slate-100 flex justify-between">
                      <span>MATCHED ITEMS ({terminalMatches.length})</span>
                      <span>Adding Qty: <strong className="text-indigo-600 text-xs">{parsedQuickTerminal.qty}</strong></span>
                    </div>
                    {terminalMatches.map((item, mIdx) => (
                      <div
                        key={item.id}
                        onMouseDown={() => handleAddFromTerminal(item, parsedQuickTerminal.qty)}
                        className={`p-2.5 cursor-pointer flex justify-between items-center border-b border-slate-50 transition ${
                          mIdx === quickHighlightedIndex ? "bg-indigo-50 text-indigo-950 font-bold border-l-4 border-indigo-600" : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <div className="font-sans">
                          <p className="font-semibold text-slate-800">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            HSN: {item.hsn} | Price: ₹{item.salePrice} | Barcode: {item.barcodes?.join(", ") || "-"}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] bg-indigo-100 text-indigo-800 py-1 px-2 rounded-lg font-bold font-mono">
                            Stock: {item.stockQuantity} {item.unit}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Quick adding indicator notifications */}
            {quickNotification && (
              <div className="mt-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 p-2 rounded-lg flex items-center space-x-1.5 animate-fadeIn">
                <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></span>
                <span>{quickNotification}</span>
              </div>
            )}
          </div>

          {/* Items lines table */}
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-2">Item Name</th>
                <th className="py-2.5 px-2 text-center w-24">HSN</th>
                <th className="py-2.5 px-2 text-right w-24">Qty</th>
                <th className="py-2.5 px-2 text-right w-30">Rate / Price (₹)</th>
                <th className="py-2.5 px-2 text-right w-28">Discount</th>
                <th className="py-2.5 px-2 text-center w-28">GST %</th>
                <th className="py-2.5 px-2 text-right w-32">Taxable Amount</th>
                <th className="py-2.5 px-2 text-center w-12"></th>
              </tr>
            </thead>
            <tbody>
              {invoiceLines.map((line, idx) => {
                const selectedItem = items.find(i => i.id === line.itemId);
                const rate = line.customPrice || 0;
                const qty = line.quantity || 0;
                const gross = qty * rate;
                const rawDisc = typeof line.discount === 'number' && !isNaN(line.discount) ? Math.max(0, line.discount) : 0;
                const rowDisc = line.discountType === 'amount' ? Math.min(gross, rawDisc) : (gross * Math.min(100, rawDisc)) / 100;
                const lineTotalExclGst = Math.max(0, gross - rowDisc);
                return (
                  <tr key={idx} className="border-b border-slate-100 font-mono text-slate-700">
                    
                    {/* Item Select Dropdown */}
                    <td className="py-3 px-1 font-sans">
                      <select
                        id={`invoice-line-${idx}-item-select`}
                        value={line.itemId}
                        onChange={(e) => handleLineItemChange(idx, e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none bg-white font-medium"
                      >
                        <option value="">-- Select Item --</option>
                        {items.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.name} (Stock: {item.stockQuantity} {item.unit})
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Read-only HSN code */}
                    <td className="py-3 px-2 text-center text-slate-500">
                      {selectedItem?.hsn || "-"}
                    </td>

                    {/* Quantity input */}
                    <td className="py-3 px-2">
                      <div className="flex items-center space-x-1.5">
                        <input
                          id={`invoice-line-${idx}-quantity`}
                          type="number"
                          min="1"
                          required
                          value={line.quantity || ""}
                          onChange={(e) => handleLineValueChange(idx, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-full text-right px-2 py-1 bg-slate-50 border border-slate-150 focus:bg-white focus:border-emerald-500 rounded-lg text-xs outline-none font-bold"
                        />
                        <span className="text-[10px] text-slate-400 font-sans block shrink-0">
                          {selectedItem?.unit || "PCS"}
                        </span>
                      </div>
                    </td>

                    {/* Editable Unit Price */}
                    <td className="py-3 px-2">
                      <input
                        id={`invoice-line-${idx}-price`}
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={line.customPrice || ""}
                        onChange={(e) => handleLineValueChange(idx, 'customPrice', parseFloat(e.target.value) || 0)}
                        className="w-full text-right px-2 py-1 bg-slate-50 border border-slate-150 focus:bg-white focus:border-emerald-500 rounded-lg text-xs outline-none font-bold"
                      />
                    </td>

                    {/* Editable Discount (% or ₹, blank = 0%) */}
                    <td className="py-3 px-2">
                      <div className="flex items-center space-x-1">
                        <input
                          id={`invoice-line-${idx}-discount`}
                          type="number"
                          min="0"
                          max={line.discountType === 'amount' ? undefined : 100}
                          step="0.01"
                          value={line.discount === 0 || !line.discount ? "" : line.discount}
                          onChange={(e) => {
                            const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                            handleLineValueChange(idx, 'discount', isNaN(val) ? 0 : val);
                          }}
                          className="w-full text-right px-2 py-1 bg-slate-50 border border-slate-150 focus:bg-white focus:border-emerald-500 rounded-lg text-xs outline-none font-bold text-rose-600"
                          placeholder="0"
                        />
                        <button
                          id={`invoice-line-${idx}-discount-type-btn`}
                          type="button"
                          onClick={() => handleDiscountTypeToggle(idx)}
                          className="px-1.5 py-1 text-[10px] font-bold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 shrink-0 transition cursor-pointer"
                          title="Click to toggle between % and ₹ discount"
                        >
                          {line.discountType === 'amount' ? '₹' : '%'}
                        </button>
                      </div>
                    </td>

                    {/* Editable GST rate (pre-filled) */}
                    <td className="py-3 px-2 font-sans">
                      <select
                        id={`invoice-line-${idx}-gstrate`}
                        value={line.gstRate}
                        onChange={(e) => handleLineValueChange(idx, 'gstRate', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-150 focus:bg-white focus:border-emerald-500 rounded-lg text-[11px] outline-none font-mono"
                      >
                        <option value="0">0% (Nil)</option>
                        <option value="5">5% GST</option>
                        <option value="12">12% GST</option>
                        <option value="18">18% GST</option>
                        <option value="28">28% GST</option>
                      </select>
                    </td>

                    {/* Line total excl GST */}
                    <td className="py-3 px-3 text-right text-slate-900 font-bold font-mono">
                      {formatINR(lineTotalExclGst)}
                    </td>

                    {/* Line detacher action */}
                    <td className="py-3 px-1 text-center font-sans">
                      <button
                        id={`invoice-delete-line-${idx}-btn`}
                        type="button"
                        disabled={invoiceLines.length === 1}
                        onClick={() => removeLineRow(idx)}
                        className="p-1 px-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition disabled:opacity-40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Step 3: Bottom Summary + payment allocations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          
          {/* Notes and financial status */}
          <div className="bg-white border border-slate-150 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 tracking-tight text-sm pb-1.5 border-b border-slate-100">
              Payment & Notes
            </h3>
            
            {/* Payment Type and Amount fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  {txSubtype.includes("return") ? "Settlement Mode" : "Payment Mode"}
                </label>
                <select
                  id="invoice-payment-type"
                  value={paymentType}
                  onChange={(e) => {
                    setPaymentType(e.target.value as any);
                    setCustomPaidAmount(false); // Reset paid amount lock
                  }}
                  className="w-full px-2 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs bg-white outline-none font-medium"
                >
                  {txSubtype.includes("return") ? (
                    <>
                      <option value="unpaid">Adjust on Account (Credit to Party Balance)</option>
                      <option value="cash">Immediate Cash Refund</option>
                      <option value="bank">Immediate Bank / UPI Refund</option>
                    </>
                  ) : (
                    <>
                      <option value="bank">Bank Transfer / UPI</option>
                      <option value="cash">Cash</option>
                      <option value="unpaid">Credit (Unpaid)</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  {txSubtype.includes("return") ? "Refund Paid / Received (₹)" : "Amount Paid (₹)"}
                </label>
                <input
                  id="invoice-paid-input"
                  type="number"
                  min="0"
                  step="0.01"
                  disabled={paymentType === "unpaid"}
                  value={paidAmt || ""}
                  onChange={(e) => {
                    setPaidAmt(parseFloat(e.target.value) || 0);
                    setCustomPaidAmount(true); // lock from over-writes
                  }}
                  className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none font-mono font-bold disabled:bg-slate-100"
                />
              </div>
            </div>

            {/* Remaining amount summary */}
            {paymentType !== "unpaid" && remainingDebt > 0 && (
              <div className="p-3 bg-amber-50 rounded-lg text-[11px] text-amber-800 font-semibold border border-amber-100 flex items-center space-x-1">
                <span>{txSubtype.includes("return") ? "Unrefunded Return Value:" : "Balance Due:"}</span>
                <span className="font-mono text-xs text-amber-900 font-bold">{formatINR(remainingDebt)}</span>
                <span>{txSubtype.includes("return") ? "will be credited against party's balance." : `will be added to ${txSubtype.includes("sale") ? "customer's" : "supplier's"} balance.`}</span>
              </div>
            )}
            {paymentType === "unpaid" && (
              <div className="p-3 bg-indigo-50 rounded-lg text-[11px] text-indigo-900 font-medium border border-indigo-100 flex items-center space-x-1.5">
                <RotateCcw className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  {txSubtype.includes("return")
                    ? `Full return value of ${formatINR(computedInvoiceDetails.grandTotal)} will be adjusted against the party's ledger balance.`
                    : `Full invoice amount of ${formatINR(computedInvoiceDetails.grandTotal)} is booked on credit.`}
                </span>
              </div>
            )}

            {/* Additional custom extra charges section */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Additional Charges</h4>
                  <span className="text-[10px] text-slate-400 block font-normal">Delivery, shipping, packing or other charges</span>
                </div>
                <button
                  id="add-extra-charge-row-btn"
                  type="button"
                  onClick={() => setExtraCharges(prev => [...prev, { title: "", amount: 0 }])}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 py-1 px-2.5 rounded-lg text-[11px] font-bold transition flex items-center space-x-1 cursor-pointer select-none"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Charge</span>
                </button>
              </div>

              {extraCharges.length > 0 && (
                <div id="extra-charges-inputs-container" className="space-y-2 border border-slate-100 bg-slate-50/50 p-2.5 rounded-xl max-h-40 overflow-y-auto">
                  {extraCharges.map((charge, cIdx) => (
                    <div key={cIdx} className="flex items-center space-x-2">
                      <input
                        id={`extra-charge-title-${cIdx}`}
                        type="text"
                        required
                        placeholder="Charge Name (e.g. Delivery Charge)"
                        value={charge.title}
                        onChange={(e) => {
                          const copy = [...extraCharges];
                          copy[cIdx].title = e.target.value;
                          setExtraCharges(copy);
                        }}
                        className="w-1/2 px-2.5 py-1.5 border border-slate-200 focus:border-indigo-500 rounded-lg text-xs outline-none bg-white font-medium"
                      />
                      <input
                        id={`extra-charge-amount-${cIdx}`}
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        placeholder="Amount (₹)"
                        value={charge.amount || ""}
                        onChange={(e) => {
                          const copy = [...extraCharges];
                          copy[cIdx].amount = parseFloat(e.target.value) || 0;
                          setExtraCharges(copy);
                        }}
                        className="w-1/3 px-2.5 py-1.5 border border-slate-200 focus:border-indigo-500 rounded-lg text-xs text-right outline-none bg-white font-mono font-bold"
                      />
                      <button
                        id={`extra-charge-delete-${cIdx}`}
                        type="button"
                        onClick={() => setExtraCharges(prev => prev.filter((_, idx) => idx !== cIdx))}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes box */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Notes / Remarks
              </label>
              <textarea
                id="invoice-notes-input"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Payment terms, delivery notes, etc."
                className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none font-sans"
              />
            </div>
          </div>

          {/* Live Invoice Valuation Panel */}
          <div className="bg-slate-900 text-slate-300 rounded-xl p-5 shadow-md flex flex-col justify-between font-mono text-xs">
            
            <div className="space-y-3.5 pb-4 border-b border-slate-800">
              <h3 className="font-bold font-sans text-white text-sm tracking-tight border-none pb-0">Bill Summary</h3>
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-semibold text-slate-400">
                <span>Taxable Amount:</span>
                <span>{formatINR(computedInvoiceDetails.subtotal)}</span>
              </div>

              {/* Local GST breakout display (CGST 9% + SGST 9%) vs IGST */}
              {activeParty && activeParty.state === business.state ? (
                <>
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>CGST Total:</span>
                    <span>{formatINR(computedInvoiceDetails.cgstTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>SGST Total:</span>
                    <span>{formatINR(computedInvoiceDetails.sgstTotal)}</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>IGST Total:</span>
                  <span>{formatINR(computedInvoiceDetails.igstTotal)}</span>
                </div>
              )}

              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-semibold text-slate-400">
                <span>Total GST:</span>
                <span>{formatINR(computedInvoiceDetails.taxAmount)}</span>
              </div>

              {/* Itemized Extra Charges displayed here */}
              {extraCharges.filter(c => c.title.trim() && c.amount > 0).map((c, cIdx) => (
                <div key={cIdx} className="flex items-center justify-between text-slate-300 text-[11px] font-mono hover:text-white transition">
                  <span className="truncate max-w-xs">{c.title}:</span>
                  <span>{formatINR(c.amount)}</span>
                </div>
              ))}

              {extraCharges.filter(c => c.title.trim() && c.amount > 0).length > 0 && (
                <div className="flex items-center justify-between border-t border-dashed border-slate-800 pt-1.5 font-semibold text-slate-400">
                  <span>Additional Charges Total:</span>
                  <span>{formatINR(computedInvoiceDetails.extraChargesSum)}</span>
                </div>
              )}

              <div className="flex items-center justify-between font-black text-white text-base pt-1">
                <span className="font-sans">Grand Total:</span>
                <span id="invoice-grand-total">{formatINR(computedInvoiceDetails.grandTotal)}</span>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between space-x-3">
              <div className="text-left font-mono">
                <p className="text-[10px] text-slate-500 uppercase">Balance Due</p>
                <p className="text-rose-400 font-bold block mt-0.5">{paymentType === "unpaid" ? "FULLY UNPAID" : `DUE: ${formatINR(remainingDebt)}`}</p>
              </div>

              {((invoiceToEdit && perms.update) || (!invoiceToEdit && perms.create)) ? (
                <button
                  id="invoice-submit-btn-element"
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold font-sans py-2.5 px-6 rounded-xl text-xs tracking-wider uppercase shadow hover:shadow-lg transition flex items-center space-x-2 cursor-pointer select-none"
                >
                  <span>{invoiceToEdit && invoiceToEdit.id ? "Save Changes" : txSubtype.includes("return") ? "Save & Print Return Note" : "Save & Print Bill"}</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </button>
              ) : (
                <div className="text-xs text-rose-600 font-bold bg-rose-50 border border-rose-200 px-3.5 py-2 rounded-xl font-mono">
                  No Permission to {invoiceToEdit ? "Update" : "Create"} Invoices
                </div>
              )}
            </div>

          </div>

        </div>

      </form>

    </div>
  );
}
