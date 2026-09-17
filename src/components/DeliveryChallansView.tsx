/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { DeliveryChallan, DeliveryChallanItem, Party, Item, BusinessProfile, ChallanPurpose } from "../types.js";
import {
  Truck,
  Plus,
  Search,
  Filter,
  Printer,
  FileCheck2,
  RotateCcw,
  Trash2,
  Edit2,
  AlertCircle,
  ArrowRight,
  Scale,
  ShieldCheck,
  CheckCircle2,
  X,
  Package,
  CalendarDays,
  User,
  Info,
  Layers,
  Receipt
} from "lucide-react";
import ChallanPrintModal from "./ChallanPrintModal.js";

interface DeliveryChallansViewProps {
  challans: DeliveryChallan[];
  parties: Party[];
  items: Item[];
  business: BusinessProfile;
  onSaveChallan: (challan: DeliveryChallan) => Promise<void>;
  onCancelChallan: (id: string) => Promise<void>;
  onDeleteChallan: (id: string) => Promise<void>;
  onConvertToInvoice: (challan: DeliveryChallan) => void;
  permissions?: any;
}

export default function DeliveryChallansView({
  challans,
  parties,
  items,
  business,
  onSaveChallan,
  onCancelChallan,
  onDeleteChallan,
  onConvertToInvoice,
  permissions
}: DeliveryChallansViewProps) {
  const perms = permissions || { view: true, create: true, update: true, delete: true };

  // View mode: 'list' vs 'create' vs 'edit'
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit'>('list');
  const [challanToEdit, setChallanToEdit] = useState<DeliveryChallan | null>(null);
  const [printChallan, setPrintChallan] = useState<DeliveryChallan | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'converted' | 'cancelled'>('all');
  const [purposeFilter, setPurposeFilter] = useState<string>("all");
  const [partyFilter, setPartyFilter] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Form States for Create/Edit
  const [challanNumber, setChallanNumber] = useState("");
  const [challanDate, setChallanDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [partySearchText, setPartySearchText] = useState("");
  const [isPartySearchOpen, setIsPartySearchOpen] = useState(false);
  const [purpose, setPurpose] = useState<ChallanPurpose>('dispatch');
  
  // Line items state
  const [lineItems, setLineItems] = useState<Array<{
    itemId: string;
    quantity: number;
    price: number;
    gstRate: number;
  }>>([{ itemId: "", quantity: 1, price: 0, gstRate: 0 }]);

  // Transport details
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [transporterName, setTransporterName] = useState("");
  const [lrNumber, setLrNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [ewayBillNumber, setEwayBillNumber] = useState("");
  const [dispatchFrom, setDispatchFrom] = useState(business.address || "");
  const [shipTo, setShipTo] = useState("");

  // Weight & Packaging details
  const [grossWeight, setGrossWeight] = useState<string>("");
  const [netWeight, setNetWeight] = useState<string>("");
  const [weightUnit, setWeightUnit] = useState<string>("KG");
  const [weightSlipNo, setWeightSlipNo] = useState<string>("");
  const [packageCount, setPackageCount] = useState<string>("");

  // Hamali & Freight details
  const [hamaliCharge, setHamaliCharge] = useState<string>("");
  const [hamaliStatus, setHamaliStatus] = useState<'paid_by_us' | 'to_pay_by_party' | 'not_applicable'>('not_applicable');
  const [freightCharge, setFreightCharge] = useState<string>("");
  const [freightStatus, setFreightStatus] = useState<'paid_by_us' | 'to_pay_by_party' | 'not_applicable'>('not_applicable');

  const [notes, setNotes] = useState("");
  const [errorText, setErrorText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const customerParties = useMemo(() => {
    return parties.filter(p => p.type === 'customer');
  }, [parties]);

  const activeParty = useMemo(() => {
    return parties.find(p => p.id === selectedPartyId);
  }, [parties, selectedPartyId]);

  const formatINR = (val: number) => {
    return "₹" + (val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Generate next DC number
  const generateNextChallanNumber = () => {
    const year = new Date().getFullYear();
    const prefix = `DC-${year}-`;
    const existing = challans
      .filter(c => c.challanNumber && c.challanNumber.startsWith(prefix))
      .map(c => {
        const numPart = parseInt(c.challanNumber.replace(prefix, ""), 10);
        return isNaN(numPart) ? 0 : numPart;
      });
    const maxNum = existing.length > 0 ? Math.max(...existing) : 0;
    return `${prefix}${String(maxNum + 1).padStart(3, "0")}`;
  };

  const handleOpenCreate = () => {
    setChallanToEdit(null);
    setChallanNumber(generateNextChallanNumber());
    setChallanDate(new Date().toISOString().split("T")[0]);
    setSelectedPartyId("");
    setPartySearchText("");
    setPurpose("dispatch");
    setLineItems([{ itemId: "", quantity: 1, price: 0, gstRate: 0 }]);
    setVehicleNumber("");
    setTransporterName("");
    setLrNumber("");
    setDriverName("");
    setDriverPhone("");
    setEwayBillNumber("");
    setDispatchFrom(business.address || "");
    setShipTo("");
    setGrossWeight("");
    setNetWeight("");
    setWeightUnit("KG");
    setWeightSlipNo("");
    setPackageCount("");
    setHamaliCharge("");
    setHamaliStatus("not_applicable");
    setFreightCharge("");
    setFreightStatus("not_applicable");
    setNotes("");
    setErrorText("");
    setViewMode("create");
  };

  const handleOpenEdit = (challan: DeliveryChallan) => {
    setChallanToEdit(challan);
    setChallanNumber(challan.challanNumber);
    setChallanDate(challan.date);
    setSelectedPartyId(challan.partyId);
    const p = parties.find(prt => prt.id === challan.partyId);
    setPartySearchText(p ? p.name : challan.partyName);
    setPurpose(challan.purpose);
    setLineItems(
      challan.items.map(i => ({
        itemId: i.itemId,
        quantity: i.quantity,
        price: i.price,
        gstRate: i.gstRate
      }))
    );
    setVehicleNumber(challan.vehicleNumber || "");
    setTransporterName(challan.transporterName || "");
    setLrNumber(challan.lrNumber || "");
    setDriverName(challan.driverName || "");
    setDriverPhone(challan.driverPhone || "");
    setEwayBillNumber(challan.ewayBillNumber || "");
    setDispatchFrom(challan.dispatchFrom || business.address || "");
    setShipTo(challan.shipTo || "");
    setGrossWeight(challan.grossWeight !== undefined && challan.grossWeight !== null ? String(challan.grossWeight) : "");
    setNetWeight(challan.netWeight !== undefined && challan.netWeight !== null ? String(challan.netWeight) : "");
    setWeightUnit(challan.weightUnit || "KG");
    setWeightSlipNo(challan.weightSlipNo || "");
    setPackageCount(challan.packageCount || "");
    setHamaliCharge(challan.hamaliCharge ? String(challan.hamaliCharge) : "");
    setHamaliStatus(challan.hamaliStatus || "not_applicable");
    setFreightCharge(challan.freightCharge ? String(challan.freightCharge) : "");
    setFreightStatus(challan.freightStatus || "not_applicable");
    setNotes(challan.notes || "");
    setErrorText("");
    setViewMode("edit");
  };

  // Calculations for form lines
  const calculatedItems: DeliveryChallanItem[] = useMemo(() => {
    return lineItems
      .filter(l => l.itemId)
      .map(line => {
        const itemObj = items.find(i => i.id === line.itemId);
        const itemName = itemObj ? itemObj.name : "Custom Item";
        const hsn = itemObj ? itemObj.hsn : "";
        const unit = itemObj ? itemObj.unit : "PCS";
        const taxable = line.quantity * line.price;
        const tax = (taxable * line.gstRate) / 100;
        const total = taxable + tax;

        return {
          itemId: line.itemId,
          itemName,
          hsn,
          quantity: line.quantity,
          unit,
          price: line.price,
          gstRate: line.gstRate,
          amountBeforeTax: Math.round(taxable * 100) / 100,
          taxAmount: Math.round(tax * 100) / 100,
          totalAmount: Math.round(total * 100) / 100
        };
      });
  }, [lineItems, items]);

  const formSubtotal = calculatedItems.reduce((s, i) => s + i.amountBeforeTax, 0);
  const formTaxAmount = calculatedItems.reduce((s, i) => s + i.taxAmount, 0);
  const formTotalAmount = calculatedItems.reduce((s, i) => s + i.totalAmount, 0);

  const handleLineItemChange = (index: number, field: string, value: any) => {
    setLineItems(prev => {
      const copy = [...prev];
      const current = { ...copy[index] };

      if (field === "itemId") {
        current.itemId = value;
        const itm = items.find(i => i.id === value);
        if (itm) {
          current.price = itm.salePrice;
          current.gstRate = itm.gstRate || 0;
        }
      } else if (field === "quantity") {
        current.quantity = Math.max(0.01, parseFloat(value) || 0);
      } else if (field === "price") {
        current.price = Math.max(0, parseFloat(value) || 0);
      } else if (field === "gstRate") {
        current.gstRate = parseFloat(value) || 0;
      }

      copy[index] = current;
      return copy;
    });
  };

  const handleAddLine = () => {
    setLineItems(prev => [...prev, { itemId: "", quantity: 1, price: 0, gstRate: 0 }]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lineItems.length === 1) {
      setLineItems([{ itemId: "", quantity: 1, price: 0, gstRate: 0 }]);
      return;
    }
    setLineItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async (andPrint = false) => {
    setErrorText("");

    if (!selectedPartyId) {
      setErrorText("Please select a customer / consignee.");
      return;
    }

    if (!challanNumber.trim()) {
      setErrorText("Delivery Challan number is required.");
      return;
    }

    if (calculatedItems.length === 0) {
      setErrorText("Please add at least one valid line item.");
      return;
    }

    // Check available stock warnings
    for (const item of calculatedItems) {
      const dbItem = items.find(i => i.id === item.itemId);
      if (dbItem && !challanToEdit) {
        if (dbItem.stockQuantity < item.quantity) {
          const proceed = confirm(
            `Stock Alert: "${item.itemName}" only has ${dbItem.stockQuantity} ${item.unit} in stock, but challan specifies ${item.quantity}. Do you want to continue dispatching?`
          );
          if (!proceed) return;
        }
      }
    }

    const party = parties.find(p => p.id === selectedPartyId);

    const payload: DeliveryChallan = {
      id: challanToEdit ? challanToEdit.id : undefined as any,
      challanNumber: challanNumber.trim(),
      date: challanDate,
      partyId: selectedPartyId,
      partyName: party ? party.name : partySearchText,
      partyGstin: party ? party.gstin : "",
      purpose,
      items: calculatedItems,
      vehicleNumber: vehicleNumber.trim() || undefined,
      transporterName: transporterName.trim() || undefined,
      lrNumber: lrNumber.trim() || undefined,
      driverName: driverName.trim() || undefined,
      driverPhone: driverPhone.trim() || undefined,
      ewayBillNumber: ewayBillNumber.trim() || undefined,
      dispatchFrom: dispatchFrom.trim() || undefined,
      shipTo: shipTo.trim() || (party ? party.address : undefined),
      grossWeight: grossWeight ? parseFloat(grossWeight) : undefined,
      netWeight: netWeight ? parseFloat(netWeight) : undefined,
      weightUnit: weightUnit || "KG",
      weightSlipNo: weightSlipNo.trim() || undefined,
      packageCount: packageCount.trim() || undefined,
      hamaliCharge: hamaliCharge ? parseFloat(hamaliCharge) : undefined,
      hamaliStatus,
      freightCharge: freightCharge ? parseFloat(freightCharge) : undefined,
      freightStatus,
      subtotal: Math.round(formSubtotal * 100) / 100,
      taxAmount: Math.round(formTaxAmount * 100) / 100,
      totalAmount: Math.round(formTotalAmount * 100) / 100,
      status: challanToEdit ? challanToEdit.status : 'pending',
      convertedInvoiceId: challanToEdit?.convertedInvoiceId,
      convertedInvoiceNumber: challanToEdit?.convertedInvoiceNumber,
      notes: notes.trim() || undefined
    };

    setIsSaving(true);
    try {
      await onSaveChallan(payload);
      if (andPrint) {
        setPrintChallan(payload);
      }
      setViewMode("list");
      setChallanToEdit(null);
    } catch (err: any) {
      setErrorText(err.message || "Failed to save delivery challan.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRollback = async (challan: DeliveryChallan) => {
    if (confirm(`Rollback Delivery Challan ${challan.challanNumber}?\n\nThis will mark the challan as CANCELLED and RESTORE all item quantities back to available stock immediately.`)) {
      try {
        await onCancelChallan(challan.id);
      } catch (err: any) {
        alert(err.message || "Failed to rollback delivery challan.");
      }
    }
  };

  const handleDelete = async (challan: DeliveryChallan) => {
    if (confirm(`Delete Delivery Challan ${challan.challanNumber}?\n\nIf the challan is still open/pending, inventory stock will be restored to your godown. Continue?`)) {
      try {
        await onDeleteChallan(challan.id);
      } catch (err: any) {
        alert(err.message || "Failed to delete delivery challan.");
      }
    }
  };

  // Filtered Challans
  const filteredChallans = useMemo(() => {
    return challans.filter(c => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (purposeFilter !== 'all' && c.purpose !== purposeFilter) return false;
      if (partyFilter && c.partyId !== partyFilter) return false;
      if (startDate && c.date < startDate) return false;
      if (endDate && c.date > endDate) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesNum = c.challanNumber.toLowerCase().includes(q);
        const matchesParty = c.partyName.toLowerCase().includes(q);
        const matchesVeh = (c.vehicleNumber || "").toLowerCase().includes(q);
        const matchesLr = (c.lrNumber || "").toLowerCase().includes(q);
        if (!matchesNum && !matchesParty && !matchesVeh && !matchesLr) return false;
      }
      return true;
    });
  }, [challans, statusFilter, purposeFilter, partyFilter, startDate, endDate, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const totalCount = challans.length;
    const pendingChallans = challans.filter(c => c.status === 'pending');
    const pendingValue = pendingChallans.reduce((s, c) => s + c.totalAmount, 0);
    const convertedCount = challans.filter(c => c.status === 'converted').length;
    const cancelledCount = challans.filter(c => c.status === 'cancelled').length;

    return {
      totalCount,
      pendingCount: pendingChallans.length,
      pendingValue,
      convertedCount,
      cancelledCount
    };
  }, [challans]);

  const purposeLabels: Record<string, string> = {
    dispatch: "Dispatch before Invoice",
    approval: "Supply on Approval",
    job_work: "Job Work",
    branch_transfer: "Branch Transfer",
    exhibition: "Exhibition / Demo",
    other: "Other"
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600 text-white rounded-xl shadow-xs">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Delivery Challan (डिलिव्हरी चलन)
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
                Rule 55 CGST
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Goods dispatch notes with gross/net weight, hamali charges, vehicle tracking, and 1-click sales invoice conversion.
            </p>
          </div>
        </div>

        {viewMode === 'list' ? (
          perms.create && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Delivery Challan
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={() => {
              setViewMode('list');
              setChallanToEdit(null);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-medium rounded-lg transition-colors"
          >
            Back to Challans List
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* LIST VIEW                                                                 */}
      {/* ========================================================================= */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          
          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Challans */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Challans</span>
                <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{stats.totalCount}</p>
              <p className="text-xs text-slate-400 mt-0.5">Dispatched records</p>
            </div>

            {/* Pending (Open / Unbilled) */}
            <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs bg-amber-50/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Open / Pending</span>
                <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
                  <Truck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-amber-900 mt-2">{stats.pendingCount}</p>
              <p className="text-xs font-medium text-amber-700 mt-0.5">Unbilled Value: {formatINR(stats.pendingValue)}</p>
            </div>

            {/* Converted to Sales Bill */}
            <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs bg-emerald-50/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Converted to Bill</span>
                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
                  <FileCheck2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-emerald-900 mt-2">{stats.convertedCount}</p>
              <p className="text-xs font-medium text-emerald-700 mt-0.5">Billed & charged in ledger</p>
            </div>

            {/* Cancelled / Rolled Back */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cancelled / Rollback</span>
                <div className="p-2 bg-rose-100 rounded-lg text-rose-700">
                  <RotateCcw className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-700 mt-2">{stats.cancelledCount}</p>
              <p className="text-xs text-slate-400 mt-0.5">Stock restored to godown</p>
            </div>

          </div>

          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              
              {/* Search */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search Challan #, Customer, Vehicle No, LR No..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({challans.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('pending')}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    statusFilter === 'pending' ? 'bg-white text-amber-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pending ({stats.pendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('converted')}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    statusFilter === 'converted' ? 'bg-white text-emerald-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Converted ({stats.convertedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('cancelled')}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    statusFilter === 'cancelled' ? 'bg-white text-rose-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cancelled ({stats.cancelledCount})
                </button>
              </div>

              {/* Purpose Filter */}
              <select
                value={purposeFilter}
                onChange={(e) => setPurposeFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Purposes</option>
                <option value="dispatch">Dispatch before Invoice</option>
                <option value="approval">Supply on Approval</option>
                <option value="job_work">Job Work</option>
                <option value="branch_transfer">Branch Transfer</option>
                <option value="exhibition">Exhibition / Demo</option>
                <option value="other">Other</option>
              </select>

              {/* Date filters */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
                />
                <span>to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
                />
              </div>

              {(searchQuery || statusFilter !== 'all' || purposeFilter !== 'all' || startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setPurposeFilter("all");
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1"
                >
                  Clear
                </button>
              )}

            </div>
          </div>

          {/* Challans Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Challan Info</th>
                    <th className="py-3 px-4">Customer / Consignee</th>
                    <th className="py-3 px-4">Purpose</th>
                    <th className="py-3 px-4">Transport & Weight</th>
                    <th className="py-3 px-4">Items / Qty</th>
                    <th className="py-3 px-4 text-right">Est. Value</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredChallans.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Truck className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-1" />
                        <p className="text-sm font-medium text-slate-600">No Delivery Challans found</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Create a new delivery challan for goods dispatched on approval, job work, or before invoice.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredChallans.map(challan => (
                      <tr key={challan.id} className="hover:bg-slate-50/70 transition-colors">
                        
                        {/* Challan Info */}
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-slate-900 text-sm">
                            {challan.challanNumber}
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mt-0.5">
                            <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                            <span>{challan.date}</span>
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">
                            {challan.partyName}
                          </div>
                          {challan.partyGstin ? (
                            <div className="text-[11px] font-mono text-slate-500">
                              GST: {challan.partyGstin}
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400">Unregistered</div>
                          )}
                        </td>

                        {/* Purpose */}
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            {purposeLabels[challan.purpose] || challan.purpose}
                          </span>
                        </td>

                        {/* Transport & Weight */}
                        <td className="py-3 px-4 text-slate-600">
                          {challan.vehicleNumber ? (
                            <div className="font-mono font-bold text-slate-800 text-[11px] flex items-center gap-1">
                              <Truck className="w-3 h-3 text-slate-400" />
                              {challan.vehicleNumber}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">No vehicle</span>
                          )}
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {challan.grossWeight !== undefined && challan.grossWeight !== null ? (
                              <span>Wt: {challan.grossWeight} {challan.weightUnit || 'KG'}</span>
                            ) : null}
                            {challan.hamaliCharge ? (
                              <span className="ml-1.5 font-medium text-amber-700">Hamali: {formatINR(challan.hamaliCharge)}</span>
                            ) : null}
                          </div>
                        </td>

                        {/* Items / Qty */}
                        <td className="py-3 px-4">
                          <div className="text-slate-900 font-medium">
                            {challan.items.length} {challan.items.length === 1 ? 'item' : 'items'}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[160px]">
                            {challan.items.map(i => `${i.itemName} (${i.quantity})`).join(", ")}
                          </div>
                        </td>

                        {/* Estimated Value */}
                        <td className="py-3 px-4 text-right">
                          <div className="font-mono font-bold text-slate-900 text-sm">
                            {formatINR(challan.totalAmount)}
                          </div>
                          <div className="text-[10px] text-slate-400 uppercase">Est. Consignment</div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-4 text-center">
                          {challan.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                              Pending
                            </span>
                          )}
                          {challan.status === 'converted' && (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Converted
                              </span>
                              {challan.convertedInvoiceNumber && (
                                <div className="text-[10px] font-mono text-emerald-700 mt-0.5">
                                  {challan.convertedInvoiceNumber}
                                </div>
                              )}
                            </div>
                          )}
                          {challan.status === 'cancelled' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300">
                              <RotateCcw className="w-3 h-3 text-rose-500" />
                              Cancelled
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            
                            {/* Print Challan */}
                            <button
                              type="button"
                              onClick={() => setPrintChallan(challan)}
                              title="Print Rule 55 Delivery Challan"
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {/* Convert to Sales Bill (Only if pending) */}
                            {challan.status === 'pending' && perms.create && (
                              <button
                                type="button"
                                onClick={() => onConvertToInvoice(challan)}
                                title="Convert to Sales Tax Invoice (Stock won't be deducted twice)"
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-2xs transition-colors"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                                Convert to Bill
                              </button>
                            )}

                            {/* Rollback / Cancel (Only if pending) */}
                            {challan.status === 'pending' && perms.update && (
                              <button
                                type="button"
                                onClick={() => handleRollback(challan)}
                                title="Rollback / Cancel Challan (Restores items back to Stock)"
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}

                            {/* Edit (if pending) */}
                            {challan.status === 'pending' && perms.update && (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(challan)}
                                title="Edit Challan"
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}

                            {/* Delete (if not converted) */}
                            {challan.status !== 'converted' && perms.delete && (
                              <button
                                type="button"
                                onClick={() => handleDelete(challan)}
                                title="Delete Challan"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
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

        </div>
      )}

      {/* ========================================================================= */}
      {/* CREATE / EDIT FORM VIEW                                                   */}
      {/* ========================================================================= */}
      {(viewMode === 'create' || viewMode === 'edit') && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
          
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {viewMode === 'create' ? "Create Delivery Challan (नवीन डिलिव्हरी चलन)" : `Edit Delivery Challan (${challanNumber})`}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Physical goods dispatch without immediate tax charge. Saving will deduct stock lines from inventory.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {errorText && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorText}</span>
            </div>
          )}

          {/* Top Meta: Challan #, Date, Purpose, Customer */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Challan Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Challan Number *
              </label>
              <input
                type="text"
                value={challanNumber}
                onChange={(e) => setChallanNumber(e.target.value)}
                placeholder="e.g. DC-2026-001"
                className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Challan Date *
              </label>
              <input
                type="date"
                value={challanDate}
                onChange={(e) => setChallanDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Purpose */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Transportation Purpose (Rule 55) *
              </label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="dispatch">Dispatch before Invoice (बिलापूर्वी माल पाठवणे)</option>
                <option value="approval">Supply on Approval (मंजुरीवर माल देणे)</option>
                <option value="job_work">Job Work / Processing (जॉब वर्क)</option>
                <option value="branch_transfer">Branch Transfer (शाखा / गोडाऊन ट्रान्सफर)</option>
                <option value="exhibition">Exhibition / Demo (प्रदर्शन / डेमो)</option>
                <option value="other">Other Transport (इतर)</option>
              </select>
            </div>

            {/* Customer Search & Select */}
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer / Consignee (ग्राहक) *
              </label>
              <input
                type="text"
                placeholder="Type to search customer..."
                value={partySearchText}
                onFocus={() => setIsPartySearchOpen(true)}
                onChange={(e) => {
                  setPartySearchText(e.target.value);
                  setIsPartySearchOpen(true);
                  if (selectedPartyId) setSelectedPartyId("");
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />

              {isPartySearchOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-20">
                  {customerParties
                    .filter(p => p.name.toLowerCase().includes(partySearchText.toLowerCase()) || (p.phone && p.phone.includes(partySearchText)))
                    .map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedPartyId(p.id);
                          setPartySearchText(p.name);
                          if (p.address && !shipTo) setShipTo(p.address);
                          setIsPartySearchOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b border-slate-100 last:border-none flex justify-between items-center"
                      >
                        <div>
                          <p className="font-semibold text-slate-800">{p.name}</p>
                          <p className="text-[11px] text-slate-500">{p.phone || "No phone"} • {p.gstin || "Unregistered"}</p>
                        </div>
                        <span className="text-[11px] font-mono text-slate-500">
                          Bal: {formatINR(p.currentBalance)}
                        </span>
                      </button>
                    ))}
                  {customerParties.length === 0 && (
                    <div className="p-3 text-xs text-slate-400 text-center">No customers registered</div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Active Party Preview Banner */}
          {activeParty && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-slate-900">{activeParty.name}</span>
                <span className="text-slate-400">•</span>
                <span>GST: <strong className="font-mono text-slate-700">{activeParty.gstin || "URP"}</strong></span>
                <span className="text-slate-400">•</span>
                <span>State: {activeParty.state || business.state}</span>
              </div>
              <div>
                <span>Current Ledger Balance: <strong className="text-slate-900">{formatINR(activeParty.currentBalance)}</strong></span>
              </div>
            </div>
          )}

          {/* Line Items Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" />
                Dispatched Line Items (मालाची यादी)
              </h3>
              <button
                type="button"
                onClick={handleAddLine}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item Line
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3 w-8 text-center">#</th>
                    <th className="py-2.5 px-3 min-w-[220px]">Item Description *</th>
                    <th className="py-2.5 px-3 w-28 text-center">HSN</th>
                    <th className="py-2.5 px-3 w-28 text-right">Quantity *</th>
                    <th className="py-2.5 px-3 w-28 text-right">Rate / Price (₹)</th>
                    <th className="py-2.5 px-3 w-24 text-center">GST %</th>
                    <th className="py-2.5 px-3 w-32 text-right">Line Total (₹)</th>
                    <th className="py-2.5 px-3 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {lineItems.map((line, idx) => {
                    const itemObj = items.find(i => i.id === line.itemId);
                    const taxable = line.quantity * line.price;
                    const tax = (taxable * line.gstRate) / 100;
                    const lineTotal = taxable + tax;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        
                        {/* Item Select */}
                        <td className="py-2 px-3">
                          <select
                            value={line.itemId}
                            onChange={(e) => handleLineItemChange(idx, "itemId", e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                          >
                            <option value="">-- Select Product / Item --</option>
                            {items.map(itm => (
                              <option key={itm.id} value={itm.id}>
                                {itm.name} (Stock: {itm.stockQuantity} {itm.unit || "PCS"})
                              </option>
                            ))}
                          </select>
                          {itemObj && (
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Current Stock: <strong className={itemObj.stockQuantity <= 0 ? "text-rose-600" : "text-emerald-700"}>{itemObj.stockQuantity} {itemObj.unit}</strong>
                            </p>
                          )}
                        </td>

                        {/* HSN */}
                        <td className="py-2 px-3 text-center font-mono text-slate-600">
                          {itemObj?.hsn || "—"}
                        </td>

                        {/* Quantity */}
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={line.quantity}
                            onChange={(e) => handleLineItemChange(idx, "quantity", e.target.value)}
                            className="w-24 px-2 py-1 text-xs text-right border border-slate-300 rounded-md font-bold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                          />
                        </td>

                        {/* Rate */}
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={line.price}
                            onChange={(e) => handleLineItemChange(idx, "price", e.target.value)}
                            className="w-24 px-2 py-1 text-xs text-right border border-slate-300 rounded-md font-mono focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                          />
                        </td>

                        {/* GST % */}
                        <td className="py-2 px-3 text-center">
                          <select
                            value={line.gstRate}
                            onChange={(e) => handleLineItemChange(idx, "gstRate", e.target.value)}
                            className="px-2 py-1 text-xs border border-slate-300 rounded-md bg-white text-center font-mono"
                          >
                            <option value={0}>0%</option>
                            <option value={5}>5%</option>
                            <option value={12}>12%</option>
                            <option value={18}>18%</option>
                            <option value={28}>28%</option>
                          </select>
                        </td>

                        {/* Line Total */}
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {formatINR(lineTotal)}
                        </td>

                        {/* Remove */}
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
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

          {/* 3 Logistic Cards: Transport, Weight/Packaging, Hamali/Freight */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* 1. Vehicle & Transport Details */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-xs">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>Transport & Vehicle (वाहतूक तपशील)</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Vehicle Number (गाडी क्र.)
                </label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. MH-12-AB-1234"
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold uppercase border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Transporter Name
                  </label>
                  <input
                    type="text"
                    value={transporterName}
                    onChange={(e) => setTransporterName(e.target.value)}
                    placeholder="e.g. VRL Logistics"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    LR / Bilty No. (बिल्टी क्र.)
                  </label>
                  <input
                    type="text"
                    value={lrNumber}
                    onChange={(e) => setLrNumber(e.target.value)}
                    placeholder="e.g. LR-9874"
                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Driver Name
                  </label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="Driver name"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Driver Phone
                  </label>
                  <input
                    type="text"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    placeholder="e.g. 9822233445"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  E-Way Bill Number (ई-वे बिल क्र.)
                </label>
                <input
                  type="text"
                  value={ewayBillNumber}
                  onChange={(e) => setEwayBillNumber(e.target.value)}
                  placeholder="12-digit E-Way bill no"
                  className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Delivery Destination / Address
                </label>
                <input
                  type="text"
                  value={shipTo}
                  onChange={(e) => setShipTo(e.target.value)}
                  placeholder="Delivery address / Godown location"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>

            </div>

            {/* 2. Weight & Packaging Details */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-xs">
                <Scale className="w-4 h-4 text-emerald-600" />
                <span>Weight & Packaging (वजन व पॅकेजिंग)</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Gross Weight (एकूण वजन)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={grossWeight}
                    onChange={(e) => setGrossWeight(e.target.value)}
                    placeholder="उदा. 520"
                    className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Net Weight (निव्वळ वजन)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={netWeight}
                    onChange={(e) => setNetWeight(e.target.value)}
                    placeholder="उदा. 500"
                    className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Weight Unit
                  </label>
                  <select
                    value={weightUnit}
                    onChange={(e) => setWeightUnit(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="KG">Kilograms (KG)</option>
                    <option value="TON">Metric Tons (TON)</option>
                    <option value="QUINTAL">Quintals (क्विंटल)</option>
                    <option value="GRAMS">Grams (G)</option>
                    <option value="BAGS">Bags / पोती</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Weight Slip (काटा पावती क्र.)
                  </label>
                  <input
                    type="text"
                    value={weightSlipNo}
                    onChange={(e) => setWeightSlipNo(e.target.value)}
                    placeholder="उदा. WB-4091"
                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Package Count / Description (नग / पॅकेज)
                </label>
                <input
                  type="text"
                  value={packageCount}
                  onChange={(e) => setPackageCount(e.target.value)}
                  placeholder="उदा. 10 Bags, 4 Wooden Crates, 2 Bundles"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-800 leading-relaxed">
                <span className="font-bold">Pro-tip:</span> Mentioning weighbridge slip number and gross/net weight protects both consignor and consignee in case of transit disputes.
              </div>

            </div>

            {/* 3. Hamali & Freight Details */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-xs">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Hamali & Freight (हमाली व भाडे)</span>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-600">
                  Hamali / Labour Charge (हमाली)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={hamaliCharge}
                      onChange={(e) => setHamaliCharge(e.target.value)}
                      placeholder="Amount"
                      className="w-full pl-6 pr-2 py-1.5 text-xs font-bold border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <select
                    value={hamaliStatus}
                    onChange={(e) => setHamaliStatus(e.target.value as any)}
                    className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="not_applicable">Not Applicable</option>
                    <option value="paid_by_us">Paid by Us (Add to Bill)</option>
                    <option value="to_pay_by_party">To Pay by Customer</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200">
                <label className="block text-[11px] font-semibold text-slate-600">
                  Freight / Transport Charge (वाहतूक भाडे)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={freightCharge}
                      onChange={(e) => setFreightCharge(e.target.value)}
                      placeholder="Amount"
                      className="w-full pl-6 pr-2 py-1.5 text-xs font-bold border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <select
                    value={freightStatus}
                    onChange={(e) => setFreightStatus(e.target.value as any)}
                    className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="not_applicable">Not Applicable</option>
                    <option value="paid_by_us">Paid by Us</option>
                    <option value="to_pay_by_party">To Pay by Customer (To-Pay)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Notes / Instructions (शेरा)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special unloading or transit remarks..."
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>

            </div>

          </div>

          {/* Grand Totals & Submission Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 bg-slate-50/50 -mx-6 -mb-6 p-6 rounded-b-xl">
            
            <div className="text-xs text-slate-600 space-y-0.5">
              <p>Total Items: <strong className="text-slate-900">{calculatedItems.length}</strong> • Total Qty: <strong className="text-slate-900">{calculatedItems.reduce((s, i) => s + i.quantity, 0)}</strong></p>
              <p className="text-[11px] text-slate-500">
                Estimated Value: <strong className="font-mono text-sm text-slate-900">{formatINR(formTotalAmount)}</strong> (Tax: {formatINR(formTaxAmount)})
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                disabled={isSaving}
                className="flex-1 sm:flex-none px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={isSaving}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                {isSaving ? "Saving..." : "Save Challan"}
              </button>

              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                <Printer className="w-4 h-4" />
                {isSaving ? "Saving..." : "Save & Print Challan"}
              </button>
            </div>

          </div>

        </div>
      )}

      {/* Portal Print Modal */}
      {printChallan && (
        <ChallanPrintModal
          challan={printChallan}
          business={business}
          onClose={() => setPrintChallan(null)}
        />
      )}

    </div>
  );
}
