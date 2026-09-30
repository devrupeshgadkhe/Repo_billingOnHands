/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { Quotation, QuotationItem, QuotationStatus, Party, Item, BusinessProfile } from "../types.js";
import { useDialog } from "../context/DialogContext.js";
import {
  FileText,
  Plus,
  Search,
  Filter,
  Printer,
  FileCheck2,
  Trash2,
  Edit2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  X,
  Package,
  CalendarDays,
  User,
  Info,
  Layers,
  Receipt,
  Clock,
  Send,
  Check,
  Ban,
  FileSpreadsheet
} from "lucide-react";
import QuotationPrintModal from "./QuotationPrintModal.js";

interface QuotationsViewProps {
  quotations: Quotation[];
  parties: Party[];
  items: Item[];
  business: BusinessProfile;
  onSaveQuotation: (quotation: Quotation) => Promise<void>;
  onDeleteQuotation: (id: string) => Promise<void>;
  onUpdateQuotationStatus: (id: string, status: QuotationStatus) => Promise<void>;
  onConvertToInvoice: (quotation: Quotation) => void;
  permissions?: any;
}

export default function QuotationsView({
  quotations,
  parties,
  items,
  business,
  onSaveQuotation,
  onDeleteQuotation,
  onUpdateQuotationStatus,
  onConvertToInvoice,
  permissions
}: QuotationsViewProps) {
  const perms = permissions || { view: true, create: true, update: true, delete: true };
  const { showConfirm, showAlert } = useDialog();

  // View mode: 'list' vs 'create' vs 'edit'
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit'>('list');
  const [quotationToEdit, setQuotationToEdit] = useState<Quotation | null>(null);
  const [printQuotation, setPrintQuotation] = useState<Quotation | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | QuotationStatus>('all');
  const [partyFilter, setPartyFilter] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Form State
  const [quotationNumber, setQuotationNumber] = useState("");
  const [quotationDate, setQuotationDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split("T")[0];
  });
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [partySearchText, setPartySearchText] = useState("");
  const [isPartySearchOpen, setIsPartySearchOpen] = useState(false);
  const [status, setStatus] = useState<QuotationStatus>('draft');

  // Line items state
  const [lineItems, setLineItems] = useState<Array<{
    itemId: string;
    quantity: number;
    price: number;
    discount: number;
    gstRate: number;
    unit: string;
  }>>([{ itemId: "", quantity: 1, price: 0, discount: 0, gstRate: 0, unit: "PCS" }]);

  // Extra charges state
  const [extraCharges, setExtraCharges] = useState<Array<{ title: string; amount: number }>>([]);
  const [extraChargeTitle, setExtraChargeTitle] = useState("");
  const [extraChargeAmount, setExtraChargeAmount] = useState<string>("");

  // Overall Discount
  const [discountAmount, setDiscountAmount] = useState<string>("");

  // Terms and Notes
  const defaultTerms = "1. Quotation is valid for 15 days from the date of issue.\n2. Payment terms: 50% advance with confirmed order, balance on delivery.\n3. Delivery within 7-10 business days upon confirmation.\n4. GST and freight applicable as specified above.";
  const [termsAndConditions, setTermsAndConditions] = useState(defaultTerms);
  const [notes, setNotes] = useState("");

  const [errorText, setErrorText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const customerParties = useMemo(() => {
    return parties.filter(p => p.type === 'customer');
  }, [parties]);

  const activeParty = useMemo(() => {
    return parties.find(p => p.id === selectedPartyId);
  }, [parties, selectedPartyId]);

  const isInterstateParty = useMemo(() => {
    if (!activeParty?.state || !business.state) return false;
    return activeParty.state.trim().toLowerCase() !== business.state.trim().toLowerCase();
  }, [activeParty, business.state]);

  // Generate a next sequential quotation number
  const generateQuotationNumber = () => {
    const currentYear = new Date().getFullYear();
    const count = quotations.length + 1;
    const padded = String(count).padStart(3, '0');
    return `QT-${currentYear}-${padded}`;
  };

  const handleOpenCreate = () => {
    setQuotationToEdit(null);
    setQuotationNumber(generateQuotationNumber());
    setQuotationDate(new Date().toISOString().split("T")[0]);
    const d = new Date();
    d.setDate(d.getDate() + 15);
    setValidUntil(d.toISOString().split("T")[0]);
    setSelectedPartyId(customerParties[0]?.id || "");
    setPartySearchText("");
    setStatus('draft');
    setLineItems([{ itemId: "", quantity: 1, price: 0, discount: 0, gstRate: 0, unit: "PCS" }]);
    setExtraCharges([]);
    setDiscountAmount("");
    setTermsAndConditions(defaultTerms);
    setNotes("");
    setErrorText("");
    setViewMode('create');
  };

  const handleOpenEdit = (quotation: Quotation) => {
    if (quotation.status === 'converted') {
      showAlert({
        title: "Converted Quotation",
        message: `This quotation was already converted into Sales Invoice #${quotation.convertedInvoiceNumber || ""}. It cannot be edited directly.`,
        variant: "warning"
      });
      return;
    }

    setQuotationToEdit(quotation);
    setQuotationNumber(quotation.quotationNumber);
    setQuotationDate(quotation.date);
    setValidUntil(quotation.validUntil || "");
    setSelectedPartyId(quotation.partyId);
    setPartySearchText("");
    setStatus(quotation.status);
    setLineItems(quotation.items.map(item => ({
      itemId: item.itemId,
      quantity: item.quantity,
      price: item.price,
      discount: item.discount || 0,
      gstRate: item.gstRate,
      unit: item.unit || "PCS"
    })));
    setExtraCharges(quotation.extraCharges || []);
    setDiscountAmount(quotation.discountAmount ? String(quotation.discountAmount) : "");
    setTermsAndConditions(quotation.termsAndConditions || defaultTerms);
    setNotes(quotation.notes || "");
    setErrorText("");
    setViewMode('edit');
  };

  // Line items handlers
  const handleLineItemChange = (index: number, field: string, val: any) => {
    setLineItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: val };

      if (field === "itemId") {
        const found = items.find(i => i.id === val);
        if (found) {
          item.price = found.salePrice;
          item.gstRate = found.gstRate;
          item.unit = found.unit || "PCS";
        }
      }
      updated[index] = item;
      return updated;
    });
  };

  const handleAddLineItem = () => {
    setLineItems(prev => [...prev, { itemId: "", quantity: 1, price: 0, discount: 0, gstRate: 0, unit: "PCS" }]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length === 1) {
      showAlert({
        title: "Line Item Required",
        message: "At least one item row is required in the quotation.",
        variant: "info"
      });
      return;
    }
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  // Extra charges handlers
  const handleAddExtraCharge = () => {
    if (!extraChargeTitle.trim()) {
      setErrorText("Please enter charge title (e.g., Freight / Delivery).");
      return;
    }
    const amt = parseFloat(extraChargeAmount) || 0;
    if (amt <= 0) {
      setErrorText("Charge amount must be greater than 0.");
      return;
    }
    setExtraCharges(prev => [...prev, { title: extraChargeTitle.trim(), amount: amt }]);
    setExtraChargeTitle("");
    setExtraChargeAmount("");
    setErrorText("");
  };

  const handleRemoveExtraCharge = (index: number) => {
    setExtraCharges(prev => prev.filter((_, i) => i !== index));
  };

  // Form Calculations
  const calculatedItems = useMemo(() => {
    return lineItems.map(li => {
      const itemData = items.find(i => i.id === li.itemId);
      const itemName = itemData ? itemData.name : "Custom Item";
      const hsn = itemData ? itemData.hsn : "";
      const quantity = Math.max(0, li.quantity || 0);
      const price = Math.max(0, li.price || 0);
      const discount = Math.max(0, li.discount || 0);

      const grossAmount = quantity * price;
      const amountBeforeTax = Math.max(0, grossAmount - discount);
      const taxRate = li.gstRate || 0;
      const taxAmount = (amountBeforeTax * taxRate) / 100;
      const totalAmount = amountBeforeTax + taxAmount;

      const cgst = isInterstateParty ? 0 : taxAmount / 2;
      const sgst = isInterstateParty ? 0 : taxAmount / 2;
      const igst = isInterstateParty ? taxAmount : 0;

      return {
        itemId: li.itemId,
        itemName,
        hsn,
        quantity,
        unit: li.unit || itemData?.unit || "PCS",
        price,
        discount,
        gstRate: taxRate,
        amountBeforeTax,
        taxAmount,
        cgst,
        sgst,
        igst,
        totalAmount
      };
    });
  }, [lineItems, items, isInterstateParty]);

  const summary = useMemo(() => {
    const subtotal = calculatedItems.reduce((sum, item) => sum + item.amountBeforeTax, 0);
    const taxAmount = calculatedItems.reduce((sum, item) => sum + item.taxAmount, 0);
    const cgstTotal = calculatedItems.reduce((sum, item) => sum + item.cgst, 0);
    const sgstTotal = calculatedItems.reduce((sum, item) => sum + item.sgst, 0);
    const igstTotal = calculatedItems.reduce((sum, item) => sum + item.igst, 0);

    const extraChargesTotal = extraCharges.reduce((sum, c) => sum + c.amount, 0);
    const overallDiscount = Math.max(0, parseFloat(discountAmount) || 0);

    const totalAmount = Math.max(0, subtotal + taxAmount + extraChargesTotal - overallDiscount);

    return {
      subtotal,
      taxAmount,
      cgstTotal,
      sgstTotal,
      igstTotal,
      extraChargesTotal,
      overallDiscount,
      totalAmount
    };
  }, [calculatedItems, extraCharges, discountAmount]);

  // Form Save
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText("");

    if (!quotationNumber.trim()) {
      setErrorText("Quotation number is required.");
      return;
    }

    if (!selectedPartyId) {
      setErrorText("Please select a customer party.");
      return;
    }

    const party = parties.find(p => p.id === selectedPartyId);
    if (!party) {
      setErrorText("Selected customer party not found.");
      return;
    }

    const validLineItems = calculatedItems.filter(i => i.itemId);
    if (validLineItems.length === 0) {
      setErrorText("Please add at least one item from the catalog.");
      return;
    }

    setIsSaving(true);
    try {
      const quotationData: Quotation = {
        id: quotationToEdit?.id || `quot_${Date.now()}`,
        quotationNumber: quotationNumber.trim(),
        date: quotationDate,
        validUntil,
        partyId: party.id,
        partyName: party.name,
        partyGstin: party.gstin || "",
        partyPhone: party.phone,
        partyEmail: party.email,
        partyAddress: party.address,
        partyState: party.state,
        items: validLineItems,
        subtotal: summary.subtotal,
        taxAmount: summary.taxAmount,
        cgstTotal: summary.cgstTotal,
        sgstTotal: summary.sgstTotal,
        igstTotal: summary.igstTotal,
        extraCharges,
        discountAmount: summary.overallDiscount,
        totalAmount: summary.totalAmount,
        status,
        convertedInvoiceId: quotationToEdit?.convertedInvoiceId,
        convertedInvoiceNumber: quotationToEdit?.convertedInvoiceNumber,
        termsAndConditions: termsAndConditions.trim(),
        notes: notes.trim()
      };

      await onSaveQuotation(quotationData);
      setViewMode('list');
      showAlert({
        title: "Quotation Saved",
        message: `Quotation ${quotationData.quotationNumber} has been saved successfully.`,
        variant: "success"
      });
    } catch (err: any) {
      setErrorText(err.message || "Failed to save quotation.");
    } finally {
      setIsSaving(false);
    }
  };

  // Convert to Sales Invoice handler
  const handleConvertToInvoice = async (quotation: Quotation) => {
    if (quotation.status === 'converted') {
      showAlert({
        title: "Already Converted",
        message: `This quotation is already converted to Sales Invoice #${quotation.convertedInvoiceNumber || ""}.`,
        variant: "info"
      });
      return;
    }

    const confirmed = await showConfirm({
      title: "Convert to Sales Invoice",
      message: `Convert Quotation ${quotation.quotationNumber} for "${quotation.partyName}" into a Sales Invoice?\n\nThis will transfer all line items, rates, taxes, and customer details into the Sales Billing screen.`,
      confirmText: "Yes, Convert to Invoice",
      cancelText: "Cancel",
      variant: "info"
    });

    if (confirmed) {
      onConvertToInvoice(quotation);
    }
  };

  // Quick Status update
  const handleQuickStatusChange = async (quotation: Quotation, newStatus: QuotationStatus) => {
    if (quotation.status === 'converted') {
      showAlert({
        title: "Quotation Converted",
        message: "Status cannot be changed because this quotation has already been converted to a sales bill.",
        variant: "warning"
      });
      return;
    }

    try {
      await onUpdateQuotationStatus(quotation.id, newStatus);
    } catch (err: any) {
      showAlert({
        title: "Error",
        message: err.message || "Failed to update quotation status.",
        variant: "danger"
      });
    }
  };

  // Delete Quotation handler
  const handleDelete = async (quotation: Quotation) => {
    if (quotation.status === 'converted') {
      showAlert({
        title: "Cannot Delete",
        message: `This quotation was converted into active Sales Invoice #${quotation.convertedInvoiceNumber || ""}. Please delete or edit the Sales Invoice first.`,
        variant: "warning"
      });
      return;
    }

    const confirmed = await showConfirm({
      title: "Delete Quotation",
      message: `Are you sure you want to delete Quotation ${quotation.quotationNumber} for "${quotation.partyName}"? This action cannot be undone.`,
      confirmText: "Yes, Delete",
      cancelText: "Cancel",
      variant: "danger"
    });

    if (confirmed) {
      try {
        await onDeleteQuotation(quotation.id);
        showAlert({
          title: "Quotation Deleted",
          message: `Quotation ${quotation.quotationNumber} deleted successfully.`,
          variant: "success"
        });
      } catch (err: any) {
        showAlert({
          title: "Error",
          message: err.message || "Failed to delete quotation.",
          variant: "danger"
        });
      }
    }
  };

  // Filtered Quotations
  const filteredQuotations = useMemo(() => {
    return quotations.filter(q => {
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesNo = q.quotationNumber.toLowerCase().includes(query);
        const matchesParty = q.partyName.toLowerCase().includes(query);
        const matchesPhone = q.partyPhone?.toLowerCase().includes(query) || false;
        const matchesItem = q.items.some(it => it.itemName.toLowerCase().includes(query));
        if (!matchesNo && !matchesParty && !matchesPhone && !matchesItem) return false;
      }

      // Status
      if (statusFilter !== 'all' && q.status !== statusFilter) {
        return false;
      }

      // Party
      if (partyFilter && q.partyId !== partyFilter) {
        return false;
      }

      // Date Range
      if (startDate && q.date < startDate) return false;
      if (endDate && q.date > endDate) return false;

      return true;
    });
  }, [quotations, searchQuery, statusFilter, partyFilter, startDate, endDate]);

  // High-Level Metrics
  const metrics = useMemo(() => {
    const totalCount = quotations.length;
    const totalValue = quotations.reduce((sum, q) => sum + (q.totalAmount || 0), 0);
    const activeCount = quotations.filter(q => q.status === 'draft' || q.status === 'sent').length;
    const acceptedCount = quotations.filter(q => q.status === 'accepted').length;
    const convertedCount = quotations.filter(q => q.status === 'converted').length;
    const convertedValue = quotations
      .filter(q => q.status === 'converted')
      .reduce((sum, q) => sum + (q.totalAmount || 0), 0);

    return {
      totalCount,
      totalValue,
      activeCount,
      acceptedCount,
      convertedCount,
      convertedValue
    };
  }, [quotations]);

  const formatINR = (val: number) => {
    return "₹" + (val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getStatusBadge = (st: QuotationStatus) => {
    switch (st) {
      case 'draft':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">Draft</span>;
      case 'sent':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">Sent to Client</span>;
      case 'accepted':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Accepted</span>;
      case 'converted':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">Converted to Bill</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">Rejected</span>;
      case 'expired':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">Expired</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{st}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header & Metric Cards */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            Quotations & Price Estimates
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Prepare customized client quotations, specify terms & validity, and seamlessly convert to sales bills.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {viewMode !== 'list' ? (
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-xs"
            >
              Back to Quotations List
            </button>
          ) : (
            perms.create && (
              <button
                type="button"
                id="create-quotation-button"
                onClick={handleOpenCreate}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Create Quotation
              </button>
            )
          )}
        </div>
      </div>

      {/* KPI Cards (Shown on list view) */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total Quotations</span>
              <FileSpreadsheet className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2 text-xl font-bold text-slate-900">{metrics.totalCount}</div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">{formatINR(metrics.totalValue)} gross</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-600">Active / Sent</span>
              <Clock className="w-4 h-4 text-blue-500" />
            </div>
            <div className="mt-2 text-xl font-bold text-blue-900">{metrics.activeCount}</div>
            <div className="text-[11px] text-blue-600 mt-0.5">Pending client feedback</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-600">Accepted</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-xl font-bold text-emerald-900">{metrics.acceptedCount}</div>
            <div className="text-[11px] text-emerald-600 mt-0.5">Ready to convert to bill</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-purple-600">Converted to Sales</span>
              <Receipt className="w-4 h-4 text-purple-500" />
            </div>
            <div className="mt-2 text-xl font-bold text-purple-900">{metrics.convertedCount}</div>
            <div className="text-[11px] text-purple-700 font-mono mt-0.5">{formatINR(metrics.convertedValue)} billed</div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT FORM */}
      {viewMode !== 'list' && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                <FileText className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold text-slate-800">
                {viewMode === 'create' ? "New Quotation / Estimate" : `Edit Quotation: ${quotationNumber}`}
              </h3>
            </div>
            <div className="text-xs text-slate-500">
              * Quotations do not deduct stock until converted into a Sales Bill.
            </div>
          </div>

          <div className="p-6 space-y-6">
            {errorText && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorText}</span>
              </div>
            )}

            {/* Basic Info: Number, Date, Validity, Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Quotation Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={quotationNumber}
                  onChange={e => setQuotationNumber(e.target.value)}
                  placeholder="QT-2026-001"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Quotation Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={quotationDate}
                  onChange={e => setQuotationDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Valid Until <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={validUntil}
                  onChange={e => setValidUntil(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Initial Status
                </label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as QuotationStatus)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="draft">Draft (Preparing)</option>
                  <option value="sent">Sent to Client</option>
                  <option value="accepted">Accepted by Client</option>
                  <option value="rejected">Rejected</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>

            {/* Customer Party Selection */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-xs font-semibold text-slate-800 mb-2">
                Select Customer / Client <span className="text-rose-500">*</span>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <select
                    value={selectedPartyId}
                    onChange={e => setSelectedPartyId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Choose Customer --</option>
                    {customerParties.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.phone ? `(${p.phone})` : ""} {p.state ? `• ${p.state}` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Need a new customer? You can add them under Parties module.
                  </p>
                </div>

                {activeParty && (
                  <div className="text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                    <p className="font-semibold text-slate-800">{activeParty.name}</p>
                    {activeParty.phone && <p>Phone: {activeParty.phone}</p>}
                    {activeParty.gstin ? (
                      <p className="font-mono">GSTIN: {activeParty.gstin}</p>
                    ) : (
                      <p className="text-slate-400 italic">Unregistered Consumer</p>
                    )}
                    {activeParty.address && <p className="text-[11px] text-slate-500">{activeParty.address}</p>}
                    <div className="pt-1 flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">
                        State: {activeParty.state || "Default"}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${isInterstateParty ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        {isInterstateParty ? "Inter-State (IGST)" : "Intra-State (CGST + SGST)"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Quotation Line Items ({lineItems.length})
                </h4>
                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Line Item
                </button>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3 min-w-[200px]">Item / Product</th>
                      <th className="py-2.5 px-3 w-28">Quantity</th>
                      <th className="py-2.5 px-3 w-28">Rate (₹)</th>
                      <th className="py-2.5 px-3 w-24">Disc (₹)</th>
                      <th className="py-2.5 px-3 w-24">GST %</th>
                      <th className="py-2.5 px-3 w-32 text-right">Total (₹)</th>
                      <th className="py-2.5 px-3 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lineItems.map((item, idx) => {
                      const calculated = calculatedItems[idx];
                      const currentItem = items.find(i => i.id === item.itemId);

                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-2 px-3">
                            <select
                              value={item.itemId}
                              onChange={e => handleLineItemChange(idx, "itemId", e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="">-- Choose Item from Inventory --</option>
                              {items.map(i => (
                                <option key={i.id} value={i.id}>
                                  {i.name} (HSN: {i.hsn || "-"} • Stock: {i.stockQuantity} {i.unit || "PCS"})
                                </option>
                              ))}
                            </select>
                            {currentItem && (
                              <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                                <span>Stock: <strong className="text-slate-700">{currentItem.stockQuantity} {currentItem.unit || "PCS"}</strong></span>
                                <span>HSN: <span className="font-mono">{currentItem.hsn || "-"}</span></span>
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center">
                              <input
                                type="number"
                                min="1"
                                step="any"
                                value={item.quantity}
                                onChange={e => handleLineItemChange(idx, "quantity", parseFloat(e.target.value) || 0)}
                                className="w-16 px-2 py-1.5 border border-slate-200 rounded-l-lg text-xs font-mono text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                              <span className="px-2 py-1.5 bg-slate-100 border border-l-0 border-slate-200 rounded-r-lg text-[11px] text-slate-600 font-medium">
                                {item.unit || "PCS"}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.price}
                              onChange={e => handleLineItemChange(idx, "price", parseFloat(e.target.value) || 0)}
                              className="w-24 px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.discount}
                              onChange={e => handleLineItemChange(idx, "discount", parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={item.gstRate}
                              onChange={e => handleLineItemChange(idx, "gstRate", parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="0">0%</option>
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                            </select>
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800">
                            {formatINR(calculated ? calculated.totalAmount : 0)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLineItem(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                              title="Remove item"
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
            </div>

            {/* Extra Charges, Overall Discount, Terms, and Totals */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
              {/* Left Column: Extra Charges, Terms, Notes */}
              <div className="lg:col-span-7 space-y-4">
                {/* Additional Charges (Freight, Packaging, Labour) */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-800 block mb-2">
                    Additional Charges (Freight, Labour, Installation)
                  </span>

                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Charge Title (e.g. Freight / Delivery)"
                      value={extraChargeTitle}
                      onChange={e => setExtraChargeTitle(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <input
                      type="number"
                      placeholder="Amount (₹)"
                      value={extraChargeAmount}
                      onChange={e => setExtraChargeAmount(e.target.value)}
                      className="w-28 px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddExtraCharge}
                      className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 transition"
                    >
                      Add
                    </button>
                  </div>

                  {extraCharges.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {extraCharges.map((charge, cIdx) => (
                        <div key={cIdx} className="flex items-center justify-between px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs">
                          <span className="font-medium text-slate-700">{charge.title}</span>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-slate-800">{formatINR(charge.amount)}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveExtraCharge(cIdx)}
                              className="text-slate-400 hover:text-rose-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Terms and Conditions */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Terms & Conditions
                  </label>
                  <textarea
                    rows={4}
                    value={termsAndConditions}
                    onChange={e => setTermsAndConditions(e.target.value)}
                    placeholder="Enter validity, payment terms, delivery timelines..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Scope of Work / Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Quotation Scope / Description / Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="E.g., Quotation for comprehensive electrical wiring and ceiling illumination setup..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Right Column: Financial Totals Breakdown */}
              <div className="lg:col-span-5">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-2">
                    Estimate Summary
                  </h4>

                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Taxable Subtotal:</span>
                    <span className="font-mono font-medium text-slate-800">{formatINR(summary.subtotal)}</span>
                  </div>

                  {isInterstateParty ? (
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>IGST:</span>
                      <span className="font-mono font-medium text-slate-800">{formatINR(summary.igstTotal)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>CGST:</span>
                        <span className="font-mono font-medium text-slate-800">{formatINR(summary.cgstTotal)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>SGST:</span>
                        <span className="font-mono font-medium text-slate-800">{formatINR(summary.sgstTotal)}</span>
                      </div>
                    </>
                  )}

                  {summary.extraChargesTotal > 0 && (
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Extra Charges:</span>
                      <span className="font-mono font-medium text-slate-800">{formatINR(summary.extraChargesTotal)}</span>
                    </div>
                  )}

                  {/* Overall Discount Input */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-700">Special Discount (₹):</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0.00"
                      value={discountAmount}
                      onChange={e => setDiscountAmount(e.target.value)}
                      className="w-28 px-2 py-1 text-xs border border-slate-200 rounded-lg text-right font-mono bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Grand Total */}
                  <div className="pt-3 border-t-2 border-slate-300 flex justify-between items-center text-slate-900 font-bold">
                    <span className="text-sm">Estimated Total:</span>
                    <span className="text-lg font-mono text-indigo-700">{formatINR(summary.totalAmount)}</span>
                  </div>
                </div>

                {/* Form Submit & Cancel Actions */}
                <div className="mt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving}
                    id="save-quotation-submit-btn"
                    className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition active:scale-95 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isSaving ? "Saving..." : (viewMode === 'create' ? "Save Quotation" : "Update Quotation")}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </form>
      )}

      {/* QUOTATIONS LIST TABLE (Shown when viewMode === 'list') */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Filters and Search Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search quotation no, customer, item..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="converted">Converted to Bill</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
              </select>

              {/* Party Filter */}
              <select
                value={partyFilter}
                onChange={e => setPartyFilter(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 max-w-[180px] truncate"
              >
                <option value="">All Customers</option>
                {customerParties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              {/* Date Filters */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span>to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {(searchQuery || statusFilter !== 'all' || partyFilter || startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter('all');
                  setPartyFilter("");
                  setStartDate("");
                  setEndDate("");
                }}
                className="text-xs text-slate-500 hover:text-slate-800 underline"
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-3 px-4">Quotation No. & Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Validity</th>
                  <th className="py-3 px-4">Items Summary</th>
                  <th className="py-3 px-4 text-right">Estimated Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuotations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="font-medium text-slate-600">No quotations found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {quotations.length === 0 ? "Click '+ Create Quotation' above to create your first estimate." : "Try adjusting your search or filters."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredQuotations.map(q => {
                    const isExpired = q.validUntil && new Date(q.date) < new Date() && q.validUntil < new Date().toISOString().split("T")[0];

                    return (
                      <tr key={q.id} className="hover:bg-slate-100 transition">
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-slate-800">{q.quotationNumber}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <CalendarDays className="w-3 h-3" />
                            {q.date}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{q.partyName}</div>
                          <div className="text-[11px] text-slate-500">
                            {q.partyPhone || (q.partyGstin ? `GSTIN: ${q.partyGstin}` : "Unregistered")}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {q.validUntil ? (
                            <div>
                              <div className="font-mono text-slate-700">{q.validUntil}</div>
                              {isExpired && q.status !== 'converted' && (
                                <span className="text-[10px] text-rose-600 font-medium">Expired</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        <td className="py-3 px-4 max-w-[200px]">
                          <div className="text-slate-700 font-medium truncate">
                            {q.items.length} {q.items.length === 1 ? "Item" : "Items"}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {q.items.map(it => it.itemName).join(", ")}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="font-mono font-bold text-slate-900">{formatINR(q.totalAmount)}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Tax: {formatINR(q.taxAmount)}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          {getStatusBadge(q.status)}
                          {q.convertedInvoiceNumber && (
                            <div className="text-[10px] text-purple-700 font-medium mt-0.5">
                              Bill #{q.convertedInvoiceNumber}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Convert to Sales Invoice Button */}
                            {q.status !== 'converted' ? (
                              <button
                                type="button"
                                onClick={() => handleConvertToInvoice(q)}
                                title="Convert this quotation to a Sales Invoice"
                                className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold border border-emerald-200 transition active:scale-95"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                                Convert to Invoice
                              </button>
                            ) : (
                              <span className="text-[11px] text-purple-700 font-medium px-2 py-1 bg-purple-50 rounded border border-purple-200">
                                Billed
                              </span>
                            )}

                            {/* Print / View */}
                            <button
                              type="button"
                              onClick={() => setPrintQuotation(q)}
                              title="Print / View Quotation"
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {/* Quick Status Dropdown */}
                            {q.status !== 'converted' && perms.update && (
                              <select
                                value={q.status}
                                onChange={e => handleQuickStatusChange(q, e.target.value as QuotationStatus)}
                                className="px-1.5 py-1 text-[11px] border border-slate-200 rounded bg-white text-slate-600 focus:outline-none"
                                title="Change status"
                              >
                                <option value="draft">Draft</option>
                                <option value="sent">Sent</option>
                                <option value="accepted">Accepted</option>
                                <option value="rejected">Rejected</option>
                                <option value="expired">Expired</option>
                              </select>
                            )}

                            {/* Edit */}
                            {perms.update && q.status !== 'converted' && (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(q)}
                                title="Edit Quotation"
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}

                            {/* Delete */}
                            {perms.delete && (
                              <button
                                type="button"
                                onClick={() => handleDelete(q)}
                                title="Delete Quotation"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          {filteredQuotations.length > 0 && (
            <div className="p-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex justify-between items-center">
              <span>Showing {filteredQuotations.length} of {quotations.length} quotation(s)</span>
              <span className="font-mono font-medium text-slate-700">
                Filtered Total: {formatINR(filteredQuotations.reduce((s, q) => s + q.totalAmount, 0))}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Print Preview Modal */}
      {printQuotation && (
        <QuotationPrintModal
          quotation={printQuotation}
          business={business}
          onClose={() => setPrintQuotation(null)}
          onConvertToInvoice={handleConvertToInvoice}
        />
      )}
    </div>
  );
}
