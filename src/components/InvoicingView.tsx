/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Item, Party, Invoice, InvoiceItem, BusinessProfile } from "../types.js";
import {
  Plus,
  Minus,
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
  RotateCcw,
  Info,
  Truck,
  FileText,
  Barcode,
  CreditCard,
  Wallet,
  Banknote,
  QrCode,
  PauseCircle,
  PlayCircle,
  Check,
  CheckCircle2,
  Grid,
  List,
  Percent,
  IndianRupee,
  X,
  ChevronDown,
  ChevronUp,
  Printer
} from "lucide-react";

interface InvoicingViewProps {
  type: 'sale' | 'purchase';
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
  customPrice: number;
  discount: number;
  discountType?: 'percent' | 'amount';
  gstRate: number;
}

interface ParkedBill {
  id: string;
  timestamp: string;
  invoiceNumber: string;
  customerName: string;
  partyId: string;
  lines: InvoiceLine[];
  extraCharges: Array<{ title: string; amount: number }>;
  notes: string;
  paymentType: 'cash' | 'bank' | 'unpaid';
  totalAmount: number;
}

// Simple Web Audio API sound generator for tactile POS feedback
const playPOSSound = (type: 'beep' | 'success' | 'alert' = 'beep') => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'beep') {
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 beep
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'success') {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    }
  } catch {
    // Silent fallback if audio context blocked
  }
};

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
  const [showExtraChargesSection, setShowExtraChargesSection] = useState(false);
  const [paymentType, setPaymentType] = useState<'cash' | 'bank' | 'unpaid'>('cash');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [paidAmt, setPaidAmt] = useState<number>(0);
  const [customPaidAmount, setCustomPaidAmount] = useState<boolean>(false);
  const [notes, setNotes] = useState("");
  const [errorText, setErrorText] = useState("");
  const [sourceChallanId, setSourceChallanId] = useState<string | undefined>(undefined);
  const [sourceChallanNumber, setSourceChallanNumber] = useState<string | undefined>(undefined);
  const [sourceQuotationId, setSourceQuotationId] = useState<string | undefined>(undefined);
  const [sourceQuotationNumber, setSourceQuotationNumber] = useState<string | undefined>(undefined);

  // Quick-Pick Catalog UI state
  const [showCatalog, setShowCatalog] = useState(true);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCategory, setCatalogCategory] = useState<string>("all");

  // Party selection Autocomplete state
  const [partySearchText, setPartySearchText] = useState("");
  const [isPartySearchOpen, setIsPartySearchOpen] = useState(false);
  const [partyHighlightedIndex, setPartyHighlightedIndex] = useState(0);

  // Quick Terminal Barcode Scanner state
  const [quickQuery, setQuickQuery] = useState("");
  const [isQuickTerminalFocused, setIsQuickTerminalFocused] = useState(false);
  const [quickHighlightedIndex, setQuickHighlightedIndex] = useState(0);
  const [quickNotification, setQuickNotification] = useState("");

  // Parked / Held Bills state
  const [parkedBills, setParkedBills] = useState<ParkedBill[]>([]);
  const [isParkedModalOpen, setIsParkedModalOpen] = useState(false);

  // Notes accordion
  const [showNotes, setShowNotes] = useState(false);

  // DOM Refs
  const quickInputRef = useRef<HTMLInputElement>(null);
  const partyInputRef = useRef<HTMLInputElement>(null);

  // Resolve active selected party (including Walk-in Cash Customer fallback)
  const activeParty = useMemo(() => {
    if (selectedPartyId === "walkin_customer") {
      return {
        id: "walkin_customer",
        name: "Walk-in Customer (Cash Sale)",
        type: "customer" as const,
        phone: "Counter Sale",
        email: "",
        address: "Store Counter",
        state: business.state,
        gstin: "",
        initialBalance: 0,
        currentBalance: 0
      };
    }
    return parties.find(p => p.id === selectedPartyId);
  }, [parties, selectedPartyId, business.state]);

  // Format currency helpers
  const formatINR = (val: number) => {
    return "₹" + (val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Sync / pre-populate form on editing or reset
  useEffect(() => {
    if (invoiceToEdit) {
      setTxSubtype(invoiceToEdit.type as any);
      setSelectedPartyId(invoiceToEdit.partyId);
      const prt = parties.find(p => p.id === invoiceToEdit.partyId);
      if (prt) setPartySearchText(prt.name);
      else if (invoiceToEdit.partyName) setPartySearchText(invoiceToEdit.partyName);

      setInvoiceNumber(invoiceToEdit.invoiceNumber);
      setOriginalInvoiceNumber(invoiceToEdit.originalInvoiceNumber || "");
      setInvoiceDate(invoiceToEdit.date);
      setNotes(invoiceToEdit.notes || "");
      setSourceChallanId(invoiceToEdit.sourceChallanId);
      setSourceChallanNumber(invoiceToEdit.sourceChallanNumber);
      setSourceQuotationId(invoiceToEdit.sourceQuotationId);
      setSourceQuotationNumber(invoiceToEdit.sourceQuotationNumber);
      setPaymentType(invoiceToEdit.paymentType || (invoiceToEdit.type.includes("return") ? "unpaid" : "cash"));
      setPaidAmt(invoiceToEdit.paidAmount || 0);
      setCashTendered(invoiceToEdit.paidAmount || 0);
      setCustomPaidAmount(true);
      setExtraCharges(invoiceToEdit.extraCharges || []);
      if (invoiceToEdit.extraCharges && invoiceToEdit.extraCharges.length > 0) {
        setShowExtraChargesSection(true);
      }

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
      // Default to Walk-in Customer for instant POS counter checkout!
      const cashParty = relevantParties.find(p => p.name.toLowerCase().includes("cash") || p.name.toLowerCase().includes("walk-in"));
      if (cashParty) {
        setSelectedPartyId(cashParty.id);
        setPartySearchText(cashParty.name);
      } else if (relevantParties.length > 0) {
        setSelectedPartyId(relevantParties[0].id);
        setPartySearchText(relevantParties[0].name);
      } else {
        setSelectedPartyId("walkin_customer");
        setPartySearchText("Walk-in Customer (Cash Sale)");
      }
      setNotes("");
      setPaymentType("cash");
      setCustomPaidAmount(false);
      setExtraCharges([]);
      setInvoiceLines([]);
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const prefix = type === "sale" ? "INV" : "PUR";
      setInvoiceNumber(`${prefix}-2026-${randomSuffix}`);
      setInvoiceDate(new Date().toISOString().split("T")[0]);
    }
  }, [type, invoiceToEdit, isReturnMode, parties, relevantParties]);

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

  // Quick select Walk-in Customer
  const handleSelectWalkInCustomer = () => {
    const cashParty = relevantParties.find(p => p.name.toLowerCase().includes("cash") || p.name.toLowerCase().includes("walk-in"));
    if (cashParty) {
      setSelectedPartyId(cashParty.id);
      setPartySearchText(cashParty.name);
    } else {
      setSelectedPartyId("walkin_customer");
      setPartySearchText("Walk-in Customer (Cash Sale)");
    }
    setIsPartySearchOpen(false);
    playPOSSound('beep');
    if (quickInputRef.current) {
      quickInputRef.current.focus();
    }
  };

  // Core financial calculations for invoice
  const computedInvoiceDetails = useMemo(() => {
    let subtotal = 0;
    let taxAmount = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;
    let totalDiscountGiven = 0;

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
        lineDisc = (grossAmt * Math.min(100, rawDisc)) / 100;
      }

      const amtBeforeTax = Math.max(0, grossAmt - lineDisc);
      const rowTax = amtBeforeTax * (line.gstRate / 100);
      const rowTotal = amtBeforeTax + rowTax;

      // GST determination based on inter-state shipping rules
      let itemCgst = 0;
      let itemSgst = 0;
      let itemIgst = 0;

      const isInterstate = activeParty && activeParty.state && business.state && activeParty.state !== business.state;

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
      totalDiscountGiven += lineDisc;

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

    // Sum up dynamic extra charges
    const extraChargesSum = extraCharges.reduce((sum, curr) => sum + (curr.amount || 0), 0);
    const grandTotal = subtotal + taxAmount + extraChargesSum;
    const totalUnits = formattedLines.reduce((acc, curr) => acc + curr.quantity, 0);

    return {
      subtotal,
      taxAmount,
      cgstTotal,
      sgstTotal,
      igstTotal,
      extraChargesSum,
      totalDiscountGiven,
      grandTotal,
      itemCount: formattedLines.length,
      totalUnits,
      lines: formattedLines
    };
  }, [invoiceLines, items, activeParty, business, extraCharges]);

  // Monitor total changes to auto-update payment inputs
  useEffect(() => {
    if (!customPaidAmount) {
      if (paymentType === "unpaid") {
        setPaidAmt(0);
        setCashTendered(0);
      } else {
        const roundedTotal = parseFloat(computedInvoiceDetails.grandTotal.toFixed(2));
        setPaidAmt(roundedTotal);
        setCashTendered(roundedTotal);
      }
    }
  }, [computedInvoiceDetails.grandTotal, paymentType, customPaidAmount]);

  // Adjust remaining outstanding balance / change return
  const remainingDebt = useMemo(() => {
    const r = computedInvoiceDetails.grandTotal - paidAmt;
    return r > 0.01 ? parseFloat(r.toFixed(2)) : 0;
  }, [computedInvoiceDetails.grandTotal, paidAmt]);

  // Calculate change to return to customer when cash tendered is greater than total
  const changeToReturn = useMemo(() => {
    if (paymentType !== "cash") return 0;
    const diff = cashTendered - computedInvoiceDetails.grandTotal;
    return diff > 0.01 ? parseFloat(diff.toFixed(2)) : 0;
  }, [paymentType, cashTendered, computedInvoiceDetails.grandTotal]);

  // Add item row line
  const addLineRow = () => {
    setInvoiceLines(prev => [...prev, { itemId: "", quantity: 1, customPrice: 0, discount: 0, discountType: 'percent', gstRate: 0 }]);
  };

  // Remove row line
  const removeLineRow = (idx: number) => {
    setInvoiceLines(prev => prev.filter((_, i) => i !== idx));
    playPOSSound('beep');
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
    playPOSSound('beep');
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

  // Stepper increment / decrement
  const handleStepQuantity = (idx: number, delta: number) => {
    setInvoiceLines(prev => {
      const copy = [...prev];
      const newQty = (copy[idx].quantity || 1) + delta;
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== idx);
      }
      copy[idx] = { ...copy[idx], quantity: newQty };
      return copy;
    });
    playPOSSound('beep');
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
      const hasDirectBarcode = item.barcodes && item.barcodes.some(b => b.toLowerCase() === query.toLowerCase());
      if (hasDirectBarcode) return true;

      const nameLower = item.name.toLowerCase();
      const hsnLower = item.hsn.toLowerCase();
      
      return queryWords.every(word =>
        nameLower.includes(word) ||
        hsnLower.includes(word) ||
        (item.barcodes && item.barcodes.some(b => b.toLowerCase().includes(word)))
      );
    });
  }, [items, parsedQuickTerminal]);

  // Add Item to cart helper
  const handleAddItemToCart = (item: Item, qty: number = 1) => {
    setInvoiceLines(prev => {
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
        // Clean up leading blank row if exists
        const cleaned = prev.filter(p => p.itemId);
        return [...cleaned, newRow];
      }
    });

    playPOSSound('beep');
    setQuickNotification(`Added ${qty}x ${item.name}`);
    setTimeout(() => {
      setQuickNotification("");
    }, 1800);
  };

  // Terminal submission action
  const handleAddFromTerminal = (item: Item, qty: number) => {
    handleAddItemToCart(item, qty);
    setQuickQuery("");
    if (quickInputRef.current) {
      quickInputRef.current.focus();
    }
  };

  // Filter items for quick-pick catalog tiles
  const filteredCatalogItems = useMemo(() => {
    return items.filter(item => {
      // Search filter
      if (catalogSearch.trim()) {
        const q = catalogSearch.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesHsn = item.hsn.toLowerCase().includes(q);
        const matchesBarcode = item.barcodes && item.barcodes.some(b => b.toLowerCase().includes(q));
        if (!matchesName && !matchesHsn && !matchesBarcode) return false;
      }

      // Category filter
      if (catalogCategory === "in_stock") {
        return item.stockQuantity > 0;
      }
      if (catalogCategory === "low_stock") {
        return item.stockQuantity <= item.minStockAlert;
      }
      if (catalogCategory !== "all") {
        return item.unit.toLowerCase() === catalogCategory.toLowerCase();
      }

      return true;
    });
  }, [items, catalogSearch, catalogCategory]);

  // Unique units for category filter chips
  const itemUnits = useMemo(() => {
    const set = new Set(items.map(i => i.unit));
    return Array.from(set);
  }, [items]);

  // Get quantity of an item currently in cart
  const getItemCartQuantity = (itemId: string) => {
    const match = invoiceLines.find(l => l.itemId === itemId);
    return match ? match.quantity : 0;
  };

  // Park / Hold Current Bill
  const handleParkCurrentBill = () => {
    if (computedInvoiceDetails.lines.length === 0) {
      setErrorText("Cannot park an empty cart.");
      return;
    }

    const newParkedBill: ParkedBill = {
      id: "parked_" + Date.now(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      invoiceNumber,
      customerName: activeParty?.name || "Walk-in Customer",
      partyId: selectedPartyId,
      lines: [...invoiceLines],
      extraCharges: [...extraCharges],
      notes,
      paymentType,
      totalAmount: computedInvoiceDetails.grandTotal
    };

    setParkedBills(prev => [newParkedBill, ...prev]);
    playPOSSound('success');

    // Reset current active cart for next customer
    setInvoiceLines([]);
    setExtraCharges([]);
    setNotes("");
    setCashTendered(0);
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setInvoiceNumber(`INV-2026-${randomSuffix}`);
    setQuickNotification("Bill held successfully! Ready for next customer.");
    setTimeout(() => setQuickNotification(""), 3000);
  };

  // Resume Parked Bill
  const handleResumeParkedBill = (bill: ParkedBill) => {
    setInvoiceLines(bill.lines);
    setSelectedPartyId(bill.partyId);
    const prt = parties.find(p => p.id === bill.partyId);
    if (prt) setPartySearchText(prt.name);
    else if (bill.partyId === "walkin_customer") setPartySearchText("Walk-in Customer (Cash Sale)");
    setInvoiceNumber(bill.invoiceNumber);
    setExtraCharges(bill.extraCharges);
    setNotes(bill.notes);
    setPaymentType(bill.paymentType);
    setParkedBills(prev => prev.filter(b => b.id !== bill.id));
    setIsParkedModalOpen(false);
    playPOSSound('beep');
  };

  // Clear Cart Helper
  const handleClearCart = () => {
    if (invoiceLines.length === 0) return;
    if (window.confirm("Are you sure you want to clear the current cart?")) {
      setInvoiceLines([]);
      setExtraCharges([]);
      setPaidAmt(0);
      setCashTendered(0);
      playPOSSound('beep');
    }
  };

  // Keyboard shortcuts listener
  useEffect(() => {
    const handleInvoicingShortcuts = (e: KeyboardEvent) => {
      // F2 -> Submit / Charge Sale & Print
      if (e.key === "F2") {
        e.preventDefault();
        const submitBtn = document.getElementById("pos-checkout-btn");
        if (submitBtn) submitBtn.click();
      }
      // F3 -> Park / Hold Bill
      if (e.key === "F3") {
        e.preventDefault();
        handleParkCurrentBill();
      }
      // F4 -> Focus party search
      if (e.key === "F4") {
        e.preventDefault();
        if (partyInputRef.current) {
          partyInputRef.current.focus();
          partyInputRef.current.select();
        }
      }
      // F5 -> Cash payment mode
      if (e.key === "F5") {
        e.preventDefault();
        setPaymentType("cash");
        setCustomPaidAmount(false);
      }
      // F6 -> UPI / Bank payment mode
      if (e.key === "F6") {
        e.preventDefault();
        setPaymentType("bank");
        setCustomPaidAmount(false);
      }
      // F7 -> Credit / Khata mode
      if (e.key === "F7") {
        e.preventDefault();
        setPaymentType("unpaid");
        setCustomPaidAmount(false);
      }
      // F8 -> Focus Quick Barcode / Item Scanner
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
  }, [items, type, invoiceLines, extraCharges, invoiceNumber, activeParty, notes, paymentType, computedInvoiceDetails.grandTotal]);

  // Trigger invoice posting
  const handleInvoiceFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText("");

    if (!selectedPartyId) {
      setErrorText("Please select or assign a Customer before completing the sale.");
      return;
    }

    const validLines = computedInvoiceDetails.lines;
    if (validLines.length === 0) {
      setErrorText("Please add at least one item to the cart.");
      return;
    }

    // Determine party details
    let resolvedPartyName = activeParty?.name || "Walk-in Customer";
    let resolvedPartyGstin = activeParty?.gstin || "";
    let resolvedPartyId = selectedPartyId;

    if (selectedPartyId === "walkin_customer") {
      const existingCash = relevantParties.find(p => p.name.toLowerCase().includes("cash") || p.name.toLowerCase().includes("walk-in"));
      if (existingCash) {
        resolvedPartyId = existingCash.id;
        resolvedPartyName = existingCash.name;
        resolvedPartyGstin = existingCash.gstin || "";
      }
    }

    // For cash payment: paid amount is capped at grandTotal even if customer handed excess cash
    const finalPaidAmount = paymentType === "unpaid" ? 0 : Math.min(paidAmt, computedInvoiceDetails.grandTotal);
    const finalRemainingAmount = computedInvoiceDetails.grandTotal - finalPaidAmount;

    const processedInvoice: Invoice = {
      id: invoiceToEdit && invoiceToEdit.id ? invoiceToEdit.id : "",
      invoiceNumber,
      date: invoiceDate,
      partyId: resolvedPartyId,
      partyName: resolvedPartyName,
      partyGstin: resolvedPartyGstin,
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
      paidAmount: finalPaidAmount,
      remainingAmount: finalRemainingAmount > 0.01 ? finalRemainingAmount : 0,
      notes,
      originalInvoiceNumber: originalInvoiceNumber.trim() || undefined,
      sourceChallanId,
      sourceChallanNumber,
      sourceQuotationId,
      sourceQuotationNumber
    };

    try {
      await onSaveInvoice(processedInvoice);
      playPOSSound('success');

      // If we were editing, return to previous view
      if (invoiceToEdit) {
        onNavigateTab("dashboard");
      } else {
        // In POS mode, stay on sales and prepare for the next customer in queue!
        setInvoiceLines([]);
        setExtraCharges([]);
        setNotes("");
        setCustomPaidAmount(false);
        setSourceChallanId(undefined);
        setSourceChallanNumber(undefined);
        setSourceQuotationId(undefined);
        setSourceQuotationNumber(undefined);
        const randomSuffix = Math.floor(100 + Math.random() * 900);
        const prefix = txSubtype === "sale" ? "INV" : txSubtype === "sale_return" ? "CN" : txSubtype === "purchase" ? "PUR" : "DN";
        setInvoiceNumber(`${prefix}-2026-${randomSuffix}`);
        setQuickNotification("Sale completed successfully! Invoice ready for printing.");
        setTimeout(() => setQuickNotification(""), 3000);
      }
    } catch (err: any) {
      setErrorText(err.message || "Failed to submit billing invoice transaction.");
    }
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
    <div id="pos-terminal-root" className="space-y-4 font-sans text-slate-900 select-none">

      {/* POS Top Bar Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        
        {/* Left: Terminal Badge & Bill Status */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-3 py-1.5 rounded-xl">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold tracking-tight uppercase">
              {type === "sale" ? "POS Terminal" : "Purchase Register"}
            </span>
          </div>

          {/* Mode Pill Toggle (Standard vs Return) */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleToggleSubtype(type)}
              className={`px-3 py-1 rounded-lg transition cursor-pointer select-none ${
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
              className={`px-2.5 py-1 rounded-lg transition flex items-center space-x-1 cursor-pointer select-none ${
                txSubtype.includes("return")
                  ? "bg-indigo-600 text-white shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <RotateCcw className="w-3 h-3" />
              <span>{type === "sale" ? "Credit Note" : "Debit Note"}</span>
            </button>
          </div>

          {invoiceToEdit && (
            <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-lg text-xs font-bold uppercase">
              Editing #{invoiceToEdit.invoiceNumber}
            </span>
          )}
        </div>

        {/* Right: Parked Bills & Shortcuts Bar */}
        <div className="flex items-center space-x-2">
          {parkedBills.length > 0 && (
            <button
              type="button"
              onClick={() => setIsParkedModalOpen(true)}
              className="flex items-center space-x-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <PauseCircle className="w-4 h-4 text-amber-600" />
              <span>Held Bills ({parkedBills.length})</span>
            </button>
          )}

          {/* Quick Keyboard shortcuts modal button */}
          <div className="hidden lg:flex items-center space-x-2 text-[11px] font-mono text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Keyboard className="w-3.5 h-3.5 text-slate-400" />
            <span><kbd className="font-bold text-slate-700">F2</kbd> Pay</span>
            <span>•</span>
            <span><kbd className="font-bold text-slate-700">F3</kbd> Hold</span>
            <span>•</span>
            <span><kbd className="font-bold text-slate-700">F4</kbd> Party</span>
            <span>•</span>
            <span><kbd className="font-bold text-slate-700">F8</kbd> Scan</span>
          </div>

          {onCancelEdit && invoiceToEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </div>

      {/* Conversion Banners */}
      {sourceChallanNumber && (
        <div className="p-3 bg-blue-50 text-blue-900 border border-blue-200 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Converting Delivery Challan: <strong className="font-mono">{sourceChallanNumber}</strong>. Stock was already deducted during dispatch.</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSourceChallanId(undefined);
              setSourceChallanNumber(undefined);
            }}
            className="text-[11px] text-blue-700 hover:underline font-bold"
          >
            Detach
          </button>
        </div>
      )}

      {sourceQuotationNumber && (
        <div className="p-3 bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Converting Quotation: <strong className="font-mono">{sourceQuotationNumber}</strong>.</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSourceQuotationId(undefined);
              setSourceQuotationNumber(undefined);
            }}
            className="text-[11px] text-indigo-700 hover:underline font-bold"
          >
            Detach
          </button>
        </div>
      )}

      {errorText && (
        <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{errorText}</span>
        </div>
      )}

      {/* Main 2-Column POS Workstation */}
      <form onSubmit={handleInvoiceFormSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* =========================================================================
            LEFT COLUMN (lg:col-span-8): POS Search, Quick Catalog & Cart Table
            ========================================================================= */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Customer & Invoice Meta Control Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {txSubtype.includes("sale") ? "Customer Information" : "Supplier Information"}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                {type === "sale" && (
                  <button
                    type="button"
                    onClick={handleSelectWalkInCustomer}
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                      selectedPartyId === "walkin_customer" || activeParty?.name.toLowerCase().includes("walk-in") || activeParty?.name.toLowerCase().includes("cash")
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    ⚡ Walk-in Customer (Cash)
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              
              {/* Customer Autocomplete Dropdown Search */}
              <div className="sm:col-span-6 relative">
                <div className="relative">
                  <input
                    id="pos-party-search-input"
                    ref={partyInputRef}
                    type="text"
                    required
                    placeholder={`Search ${txSubtype.includes("sale") ? "customer" : "supplier"} (F4)...`}
                    value={partySearchText}
                    onChange={(e) => {
                      setPartySearchText(e.target.value);
                      setIsPartySearchOpen(true);
                      setPartyHighlightedIndex(0);
                      const matched = relevantParties.find(p => p.name === e.target.value);
                      if (matched) setSelectedPartyId(matched.id);
                    }}
                    onFocus={() => setIsPartySearchOpen(true)}
                    onBlur={() => {
                      setTimeout(() => setIsPartySearchOpen(false), 220);
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
                    className="w-full pl-8 pr-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-xl text-xs outline-none font-semibold bg-slate-50 focus:bg-white"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                </div>

                {/* Floating party search list */}
                {isPartySearchOpen && matchedParties.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-xl max-h-52 overflow-y-auto text-xs">
                    {matchedParties.map((p, pIdx) => (
                      <div
                        key={p.id}
                        onMouseDown={() => {
                          setSelectedPartyId(p.id);
                          setPartySearchText(p.name);
                          setIsPartySearchOpen(false);
                        }}
                        className={`p-2.5 cursor-pointer flex justify-between items-center transition border-b border-slate-50 ${
                          pIdx === partyHighlightedIndex ? "bg-emerald-50 text-emerald-950 font-bold" : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-slate-800">{p.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {p.phone || "No phone"} • GSTIN: {p.gstin || "Unregistered"}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                            p.currentBalance > 0 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
                          }`}>
                            Balance: ₹{p.currentBalance.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Invoice Number */}
              <div className="sm:col-span-3">
                <input
                  id="pos-invoice-number-input"
                  type="text"
                  required
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-2.5 py-2 border border-slate-200 focus:border-emerald-500 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none"
                  placeholder="Invoice #"
                />
              </div>

              {/* Invoice Date */}
              <div className="sm:col-span-3">
                <div className="relative">
                  <input
                    id="pos-invoice-date-input"
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full pl-2.5 pr-7 py-2 border border-slate-200 focus:border-emerald-500 rounded-xl text-xs font-mono outline-none"
                  />
                  <CalendarDays className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

            </div>

            {/* Active Customer Status Strip */}
            {activeParty && (
              <div className="flex flex-wrap items-center justify-between text-[11px] bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-slate-600 gap-2">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-800">{activeParty.name}</span>
                  {activeParty.gstin && (
                    <span className="font-mono text-slate-500">GSTIN: {activeParty.gstin}</span>
                  )}
                </div>
                <div className="flex items-center space-x-3 font-mono">
                  <span>
                    Tax: {activeParty.state === business.state ? (
                      <strong className="text-emerald-700">Local (CGST + SGST)</strong>
                    ) : (
                      <strong className="text-indigo-600">Interstate (IGST)</strong>
                    )}
                  </span>
                  {activeParty.id !== "walkin_customer" && (
                    <span>
                      Khata: <strong className={activeParty.currentBalance > 0 ? "text-amber-700" : "text-slate-700"}>
                        {formatINR(activeParty.currentBalance)}
                      </strong>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Barcode Scanner / Fast Item Terminal [F8] */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm relative">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Barcode className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200 font-sans">
                  Quick Barcode Scanner & Search
                </span>
                <span className="bg-slate-800 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded-md border border-slate-700">
                  F8
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                Type item name, scan barcode, or e.g. "ItemName 5" to add quantity
              </span>
            </div>

            <div className="relative">
              <input
                id="pos-barcode-scanner-input"
                ref={quickInputRef}
                type="text"
                placeholder="Scan barcode or type item name then press Enter [F8]..."
                value={quickQuery}
                onFocus={() => setIsQuickTerminalFocused(true)}
                onBlur={() => {
                  setTimeout(() => setIsQuickTerminalFocused(false), 220);
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
                className="w-full bg-slate-800 text-white pl-10 pr-4 py-2.5 border border-slate-700 focus:border-emerald-500 rounded-xl text-xs font-mono font-bold outline-none placeholder-slate-400"
              />
              <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3 pointer-events-none" />
            </div>

            {/* Scanner Live Dropdown */}
            {isQuickTerminalFocused && quickQuery.trim() && (
              <div className="absolute left-4 right-4 z-50 bg-white text-slate-800 border border-slate-200 rounded-xl mt-1.5 shadow-2xl max-h-64 overflow-y-auto font-mono text-xs">
                {terminalMatches.length === 0 ? (
                  <div className="p-3 text-slate-400 text-center italic font-sans">
                    No items found for "{parsedQuickTerminal.query}". Press Esc to clear.
                  </div>
                ) : (
                  <div>
                    <div className="bg-slate-50 px-3 py-1.5 text-[10px] text-slate-500 font-sans border-b border-slate-100 flex justify-between items-center">
                      <span>MATCHED ITEMS ({terminalMatches.length})</span>
                      <span>Adding Qty: <strong className="text-emerald-700 text-xs font-mono">{parsedQuickTerminal.qty}</strong></span>
                    </div>
                    {terminalMatches.map((item, mIdx) => (
                      <div
                        key={item.id}
                        onMouseDown={() => handleAddFromTerminal(item, parsedQuickTerminal.qty)}
                        className={`p-2.5 cursor-pointer flex justify-between items-center border-b border-slate-50 transition ${
                          mIdx === quickHighlightedIndex ? "bg-emerald-50 text-emerald-950 font-bold border-l-4 border-emerald-600" : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className="font-sans">
                          <p className="font-semibold text-slate-900">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            HSN: {item.hsn} • Barcode: {item.barcodes?.join(", ") || "-"}
                          </p>
                        </div>
                        <div className="text-right shrink-0 font-mono">
                          <span className="text-xs font-bold text-slate-900 block">{formatINR(item.salePrice)}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            item.stockQuantity <= item.minStockAlert ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                          }`}>
                            Stock: {item.stockQuantity} {item.unit}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Instant notification pill */}
            {quickNotification && (
              <div className="mt-2 text-xs font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-700/60 px-3 py-1.5 rounded-lg flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{quickNotification}</span>
              </div>
            )}
          </div>

          {/* Quick-Pick Touch Item Catalog Grid */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Grid className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 font-sans">
                  Quick-Pick Catalog Tiles
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  ({filteredCatalogItems.length} items)
                </span>
              </div>

              <div className="flex items-center space-x-2">
                {/* Search in catalog */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Filter catalog..."
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    className="w-36 sm:w-48 pl-7 pr-2 py-1 text-xs border border-slate-200 rounded-lg outline-none bg-white focus:border-emerald-500"
                  />
                  <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2 pointer-events-none" />
                </div>

                {/* Show/Hide Catalog Toggle */}
                <button
                  type="button"
                  onClick={() => setShowCatalog(!showCatalog)}
                  className="text-xs text-slate-600 hover:text-slate-900 font-semibold p-1 px-2 rounded-lg bg-white border border-slate-200 cursor-pointer"
                >
                  {showCatalog ? "Hide Tiles" : "Show Tiles"}
                </button>
              </div>
            </div>

            {/* Category Chips Bar */}
            {showCatalog && (
              <>
                <div className="px-3.5 py-2 border-b border-slate-100 flex flex-wrap items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setCatalogCategory("all")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      catalogCategory === "all" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    All Items
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatalogCategory("in_stock")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      catalogCategory === "in_stock" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    In Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatalogCategory("low_stock")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      catalogCategory === "low_stock" ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Low Stock
                  </button>
                  {itemUnits.map(unit => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => setCatalogCategory(unit)}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        catalogCategory === unit ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {unit}
                    </button>
                  ))}
                </div>

                {/* Touch Item Tiles Grid */}
                <div className="p-3.5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto">
                  {filteredCatalogItems.map(item => {
                    const inCartCount = getItemCartQuantity(item.id);
                    const isLowStock = item.stockQuantity <= item.minStockAlert;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleAddItemToCart(item, 1)}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition relative group flex flex-col justify-between select-none ${
                          inCartCount > 0
                            ? "border-emerald-500 bg-emerald-50/40 shadow-xs"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white"
                        }`}
                      >
                        {inCartCount > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 bg-emerald-600 text-white text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-full shadow-xs">
                            {inCartCount} in cart
                          </span>
                        )}

                        <div>
                          <p className="font-semibold text-xs text-slate-900 leading-tight line-clamp-2">
                            {item.name}
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                            HSN: {item.hsn}
                          </span>
                        </div>

                        <div className="mt-2 pt-1 border-t border-slate-100/80 flex items-center justify-between">
                          <span className="font-bold text-xs text-emerald-800 font-mono">
                            {formatINR(item.salePrice)}
                          </span>
                          <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-mono font-semibold ${
                            isLowStock ? "text-rose-700 bg-rose-50" : "text-slate-500 bg-slate-100"
                          }`}>
                            {item.stockQuantity} {item.unit}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* POS Cart Table Container */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Receipt className="w-4 h-4 text-slate-700" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 font-sans">
                  Active Cart Items ({computedInvoiceDetails.itemCount} items • {computedInvoiceDetails.totalUnits} units)
                </h3>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  id="pos-add-line-btn"
                  type="button"
                  onClick={addLineRow}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Custom Item (F9)</span>
                </button>

                {invoiceLines.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearCart}
                    className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1 px-2 rounded-lg text-xs font-semibold transition cursor-pointer"
                    title="Clear active cart"
                  >
                    Clear Cart
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            {invoiceLines.length === 0 ? (
              <div className="p-10 text-center text-slate-400 space-y-2">
                <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-medium">Your cart is currently empty.</p>
                <p className="text-[11px] text-slate-400">
                  Scan a barcode (F8), tap any product card from the catalog above, or press F9 to add an item.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="bg-slate-100/60 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3 w-8">#</th>
                      <th className="py-2.5 px-2">Item Name & Details</th>
                      <th className="py-2.5 px-2 text-center w-32">Quantity</th>
                      <th className="py-2.5 px-2 text-right w-28">Rate (₹)</th>
                      <th className="py-2.5 px-2 text-right w-28">Discount</th>
                      <th className="py-2.5 px-2 text-center w-24">GST %</th>
                      <th className="py-2.5 px-3 text-right w-28">Total</th>
                      <th className="py-2.5 px-2 text-center w-10"></th>
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
                      const lineTax = lineTotalExclGst * (line.gstRate / 100);
                      const lineTotalInclGst = lineTotalExclGst + lineTax;

                      return (
                        <tr key={idx} className="border-b border-slate-100 font-sans hover:bg-slate-50/70 transition">
                          
                          {/* Row Number */}
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                            {idx + 1}
                          </td>

                          {/* Item Selector */}
                          <td className="py-2.5 px-2">
                            {line.itemId ? (
                              <div>
                                <p className="font-bold text-slate-800 text-xs">{selectedItem?.name || "Item"}</p>
                                <span className="text-[10px] font-mono text-slate-400">
                                  HSN: {selectedItem?.hsn || "-"} • Stock: {selectedItem?.stockQuantity} {selectedItem?.unit}
                                </span>
                              </div>
                            ) : (
                              <select
                                value={line.itemId}
                                onChange={(e) => handleLineItemChange(idx, e.target.value)}
                                className="w-full px-2 py-1.5 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none bg-white font-medium"
                              >
                                <option value="">-- Choose Item --</option>
                                {items.map(item => (
                                  <option key={item.id} value={item.id}>
                                    {item.name} ({formatINR(item.salePrice)})
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>

                          {/* Quantity with Stepper */}
                          <td className="py-2.5 px-2">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                type="button"
                                onClick={() => handleStepQuantity(idx, -1)}
                                className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs transition cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                min="1"
                                required
                                value={line.quantity || ""}
                                onChange={(e) => handleLineValueChange(idx, 'quantity', parseInt(e.target.value) || 0)}
                                className="w-12 text-center py-1 border border-slate-200 rounded-md text-xs font-bold font-mono outline-none focus:border-emerald-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleStepQuantity(idx, 1)}
                                className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs transition cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <span className="text-[10px] text-slate-400 font-mono ml-0.5">
                                {selectedItem?.unit || "PCS"}
                              </span>
                            </div>
                          </td>

                          {/* Unit Price (Editable) */}
                          <td className="py-2.5 px-2 text-right">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              required
                              value={line.customPrice || ""}
                              onChange={(e) => handleLineValueChange(idx, 'customPrice', parseFloat(e.target.value) || 0)}
                              className="w-full text-right px-2 py-1 border border-slate-200 rounded-md text-xs font-mono font-bold outline-none focus:border-emerald-500"
                            />
                          </td>

                          {/* Discount with % / ₹ toggle */}
                          <td className="py-2.5 px-2">
                            <div className="flex items-center space-x-1">
                              <input
                                type="number"
                                min="0"
                                max={line.discountType === 'amount' ? undefined : 100}
                                step="0.01"
                                placeholder="0"
                                value={line.discount === 0 || !line.discount ? "" : line.discount}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                                  handleLineValueChange(idx, 'discount', isNaN(val) ? 0 : val);
                                }}
                                className="w-full text-right px-1.5 py-1 border border-slate-200 rounded-md text-xs font-mono font-semibold text-rose-600 outline-none focus:border-rose-400"
                              />
                              <button
                                type="button"
                                onClick={() => handleDiscountTypeToggle(idx)}
                                className="px-1.5 py-1 text-[10px] font-bold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 shrink-0 cursor-pointer"
                              >
                                {line.discountType === 'amount' ? '₹' : '%'}
                              </button>
                            </div>
                          </td>

                          {/* GST Rate */}
                          <td className="py-2.5 px-2 text-center">
                            <select
                              value={line.gstRate}
                              onChange={(e) => handleLineValueChange(idx, 'gstRate', parseInt(e.target.value) || 0)}
                              className="px-1.5 py-1 border border-slate-200 rounded-md text-[11px] font-mono outline-none bg-white"
                            >
                              <option value="0">0%</option>
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                            </select>
                          </td>

                          {/* Line Total */}
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {formatINR(lineTotalInclGst)}
                          </td>

                          {/* Delete Row Button */}
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeLineRow(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* =========================================================================
            RIGHT COLUMN (lg:col-span-4): THE PURE POS SIDE REGISTER CONTAINER
            "साइडला एका कंटेनरमध्ये सर्व अमाऊंट्स वगैरे दिसल्या पाहिजेत"
            ========================================================================= */}
        <div className="lg:col-span-4 sticky top-20 space-y-4">
          
          <div id="pos-amounts-register-container" className="bg-white border-2 border-slate-300/80 rounded-2xl shadow-lg p-5 space-y-4 font-sans">
            
            {/* Register Container Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  ₹
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 leading-tight">POS Register Summary</h3>
                  <span className="text-[10px] text-slate-400 font-mono">Bill #{invoiceNumber}</span>
                </div>
              </div>

              <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-bold font-mono">
                {computedInvoiceDetails.itemCount} Items
              </span>
            </div>

            {/* Active Customer Badge */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-xs flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Customer</p>
                <p className="font-bold text-slate-800 truncate max-w-[170px]">{activeParty?.name || "Walk-in Customer"}</p>
              </div>
              <div className="text-right font-mono">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Khata Balance</p>
                <p className={`font-bold ${activeParty && activeParty.currentBalance > 0 ? "text-amber-700" : "text-slate-700"}`}>
                  {formatINR(activeParty?.currentBalance || 0)}
                </p>
              </div>
            </div>

            {/* ALL AMOUNTS ITEMIZATION (The User's Core Request!) */}
            <div className="space-y-2.5 text-xs font-mono text-slate-700 pt-1">
              
              {/* Subtotal (Taxable Value) */}
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-sans">Taxable Subtotal:</span>
                <span className="font-bold text-slate-800">{formatINR(computedInvoiceDetails.subtotal)}</span>
              </div>

              {/* Total Discount (if any) */}
              {computedInvoiceDetails.totalDiscountGiven > 0 && (
                <div className="flex justify-between items-center text-rose-600">
                  <span className="font-sans flex items-center space-x-1">
                    <Percent className="w-3 h-3" />
                    <span>Total Discount:</span>
                  </span>
                  <span className="font-bold">- {formatINR(computedInvoiceDetails.totalDiscountGiven)}</span>
                </div>
              )}

              {/* GST Breakdown (CGST + SGST vs IGST) */}
              {activeParty && activeParty.state === business.state ? (
                <>
                  <div className="flex justify-between items-center text-[11px] text-slate-500 pl-2 border-l-2 border-slate-200">
                    <span>CGST (Central):</span>
                    <span>{formatINR(computedInvoiceDetails.cgstTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-500 pl-2 border-l-2 border-slate-200">
                    <span>SGST (State):</span>
                    <span>{formatINR(computedInvoiceDetails.sgstTotal)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center text-[11px] text-slate-500 pl-2 border-l-2 border-slate-200">
                  <span>IGST (Integrated):</span>
                  <span>{formatINR(computedInvoiceDetails.igstTotal)}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-slate-600 border-b border-slate-100 pb-2">
                <span className="font-sans">Total GST Tax:</span>
                <span className="font-bold text-slate-800">{formatINR(computedInvoiceDetails.taxAmount)}</span>
              </div>

              {/* Extra Charges Section (Delivery, Shipping, Hamali) */}
              <div className="space-y-1.5 pt-0.5">
                <div className="flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setShowExtraChargesSection(!showExtraChargesSection)}
                    className="text-[11px] font-sans font-bold text-indigo-700 hover:text-indigo-900 flex items-center space-x-1 cursor-pointer"
                  >
                    <span>Additional Charges ({extraCharges.length})</span>
                    {showExtraChargesSection ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  <span className="font-bold text-slate-800">{formatINR(computedInvoiceDetails.extraChargesSum)}</span>
                </div>

                {showExtraChargesSection && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-2 mt-1">
                    {extraCharges.map((charge, cIdx) => (
                      <div key={cIdx} className="flex items-center space-x-1.5">
                        <input
                          type="text"
                          required
                          placeholder="e.g. Delivery"
                          value={charge.title}
                          onChange={(e) => {
                            const copy = [...extraCharges];
                            copy[cIdx].title = e.target.value;
                            setExtraCharges(copy);
                          }}
                          className="w-1/2 px-2 py-1 border border-slate-200 rounded text-xs bg-white"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          placeholder="₹"
                          value={charge.amount || ""}
                          onChange={(e) => {
                            const copy = [...extraCharges];
                            copy[cIdx].amount = parseFloat(e.target.value) || 0;
                            setExtraCharges(copy);
                          }}
                          className="w-1/3 px-2 py-1 border border-slate-200 rounded text-xs text-right font-mono font-bold bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setExtraCharges(prev => prev.filter((_, i) => i !== cIdx))}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => setExtraCharges(prev => [...prev, { title: "", amount: 0 }])}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Extra Charge</span>
                    </button>
                  </div>
                )}
              </div>

            </div>

            {/* GRAND TOTAL HERO DISPLAY */}
            <div className="bg-slate-900 text-white rounded-xl p-4 shadow-md text-center space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans block">
                Total Payable Amount
              </span>
              <div id="pos-grand-total-amount" className="text-3xl font-black font-mono tracking-tight text-emerald-400">
                {formatINR(computedInvoiceDetails.grandTotal)}
              </div>
            </div>

            {/* Payment Method Fast Buttons */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                Payment Method
              </label>
              
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentType("cash");
                    setCustomPaidAmount(false);
                    playPOSSound('beep');
                  }}
                  className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center space-y-1 font-bold transition cursor-pointer ${
                    paymentType === "cash"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>Cash [F5]</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentType("bank");
                    setCustomPaidAmount(false);
                    playPOSSound('beep');
                  }}
                  className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center space-y-1 font-bold transition cursor-pointer ${
                    paymentType === "bank"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>UPI/Bank [F6]</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentType("unpaid");
                    setCustomPaidAmount(false);
                    playPOSSound('beep');
                  }}
                  className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center space-y-1 font-bold transition cursor-pointer ${
                    paymentType === "unpaid"
                      ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                  <span>Khata [F7]</span>
                </button>
              </div>
            </div>

            {/* Cash Tender & Change Return Calculator */}
            {paymentType === "cash" && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700 uppercase">Cash Tendered (₹):</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={cashTendered || ""}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setCashTendered(val);
                      setPaidAmt(val);
                      setCustomPaidAmount(true);
                    }}
                    className="w-28 text-right px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Fast Cash Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      const exact = parseFloat(computedInvoiceDetails.grandTotal.toFixed(2));
                      setCashTendered(exact);
                      setPaidAmt(exact);
                      setCustomPaidAmount(false);
                    }}
                    className="text-[10px] font-bold px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                  >
                    Exact
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next100 = Math.ceil(computedInvoiceDetails.grandTotal / 100) * 100;
                      setCashTendered(next100);
                      setPaidAmt(next100);
                      setCustomPaidAmount(true);
                    }}
                    className="text-[10px] font-bold px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                  >
                    Round ₹100
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next500 = Math.ceil(computedInvoiceDetails.grandTotal / 500) * 500;
                      setCashTendered(next500);
                      setPaidAmt(next500);
                      setCustomPaidAmount(true);
                    }}
                    className="text-[10px] font-bold px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                  >
                    Round ₹500
                  </button>
                </div>

                {/* Change Return Display */}
                {changeToReturn > 0 ? (
                  <div className="bg-emerald-100 border border-emerald-300 rounded-lg p-2.5 text-emerald-900 flex items-center justify-between font-mono">
                    <span className="font-sans font-bold text-xs uppercase">Change Due to Customer:</span>
                    <span className="text-base font-black text-emerald-800">{formatINR(changeToReturn)}</span>
                  </div>
                ) : remainingDebt > 0 ? (
                  <div className="bg-amber-100 border border-amber-300 rounded-lg p-2 text-amber-900 flex items-center justify-between font-mono text-xs">
                    <span className="font-sans font-semibold">Balance Due (To Khata):</span>
                    <span className="font-bold text-amber-900">{formatINR(remainingDebt)}</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-emerald-700 text-center font-semibold">
                    ✓ Exact payment amount received
                  </div>
                )}
              </div>
            )}

            {paymentType === "bank" && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-900 flex items-center justify-between font-mono">
                <span className="font-sans font-semibold">Payment Received via UPI / Bank:</span>
                <span className="font-bold text-indigo-950">{formatINR(computedInvoiceDetails.grandTotal)}</span>
              </div>
            )}

            {paymentType === "unpaid" && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                <div className="flex justify-between font-mono font-bold">
                  <span>Full Khata Credit:</span>
                  <span>{formatINR(computedInvoiceDetails.grandTotal)}</span>
                </div>
                <p className="text-[11px] text-amber-700">
                  This entire amount will be added to {activeParty?.name || "customer"}'s pending account balance.
                </p>
              </div>
            )}

            {/* Notes accordion */}
            <div>
              <button
                type="button"
                onClick={() => setShowNotes(!showNotes)}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center space-x-1 cursor-pointer"
              >
                <span>{showNotes ? "Hide Remarks" : "+ Add Bill Remarks / Notes"}</span>
              </button>

              {showNotes && (
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Delivery terms, transport details, PO reference..."
                  className="w-full mt-1.5 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500"
                />
              )}
            </div>

            {/* PRIMARY CHECKOUT ACTION BUTTON (F2) */}
            <div className="pt-2 space-y-2">
              <button
                id="pos-checkout-btn"
                type="submit"
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm tracking-wide shadow-md hover:shadow-lg transition flex items-center justify-center space-x-2 cursor-pointer select-none"
              >
                <Printer className="w-4 h-4" />
                <span>
                  {invoiceToEdit
                    ? "UPDATE SALE & PRINT [F2]"
                    : txSubtype.includes("return")
                    ? "SAVE & PRINT RETURN NOTE [F2]"
                    : "CHARGE & PRINT BILL [F2]"}
                </span>
              </button>

              {/* Quick Secondary Action Buttons */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleParkCurrentBill}
                  className="py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <PauseCircle className="w-3.5 h-3.5 text-slate-500" />
                  <span>Hold Bill (F3)</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearCart}
                  className="py-2 px-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 font-bold rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Cart</span>
                </button>
              </div>
            </div>

          </div>

        </div>

      </form>

      {/* Parked / Held Bills Slide-over Modal */}
      {isParkedModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <PauseCircle className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-sm text-slate-800">Held / Parked Bills ({parkedBills.length})</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsParkedModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 max-h-80 overflow-y-auto space-y-2.5">
              {parkedBills.map((pb) => (
                <div
                  key={pb.id}
                  className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between transition"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-xs text-slate-900">{pb.invoiceNumber}</span>
                      <span className="text-[10px] text-slate-400">{pb.timestamp}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-700 mt-0.5">{pb.customerName}</p>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {pb.lines.length} items • {formatINR(pb.totalAmount)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => handleResumeParkedBill(pb)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer"
                    >
                      Resume
                    </button>
                    <button
                      type="button"
                      onClick={() => setParkedBills(prev => prev.filter(b => b.id !== pb.id))}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 text-right">
              <button
                type="button"
                onClick={() => setIsParkedModalOpen(false)}
                className="text-xs font-bold text-slate-600 px-3 py-1 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
