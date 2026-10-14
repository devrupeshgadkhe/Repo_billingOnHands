/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { Godown, StockTransferVoucher, StockTransferItem, Item, BusinessProfile } from "../types.js";
import { useDialog } from "../context/DialogContext.js";
import {
  Building,
  Truck,
  Plus,
  Trash2,
  Edit2,
  Printer,
  Search,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Layers,
  MapPin,
  Phone,
  User,
  History,
  Boxes,
  FileText,
  X,
  Clock,
  ShieldAlert
} from "lucide-react";
import StockTransferPrintModal from "./StockTransferPrintModal.js";

interface GodownsViewProps {
  godowns: Godown[];
  stockTransfers: StockTransferVoucher[];
  items: Item[];
  business: BusinessProfile;
  onSaveGodown: (godown: Godown) => Promise<void>;
  onDeleteGodown: (id: string) => Promise<void>;
  onCreateTransfer: (voucher: StockTransferVoucher) => Promise<void>;
  onCancelTransfer: (id: string) => Promise<void>;
  permissions?: any;
}

export default function GodownsView({
  godowns = [],
  stockTransfers = [],
  items = [],
  business,
  onSaveGodown,
  onDeleteGodown,
  onCreateTransfer,
  onCancelTransfer,
  permissions
}: GodownsViewProps) {
  const { showConfirm, showAlert } = useDialog();
  const perms = permissions || { view: true, create: true, update: true, delete: true };

  // Main Active Tab
  const [activeTab, setActiveTab] = useState<'godowns' | 'transfer' | 'history'>('godowns');

  // Godown Modal State
  const [isGodownModalOpen, setIsGodownModalOpen] = useState(false);
  const [editingGodown, setEditingGodown] = useState<Godown | null>(null);
  const [godownForm, setGodownForm] = useState<Partial<Godown>>({
    name: "",
    address: "",
    managerName: "",
    phone: "",
    notes: ""
  });

  // Stock Transfer Form State
  const defaultSource = godowns[0]?.id || "godown_main";
  const defaultDest = godowns.length > 1 ? godowns[1]?.id : "";
  const [sourceGodownId, setSourceGodownId] = useState<string>(defaultSource);
  const [destGodownId, setDestGodownId] = useState<string>(defaultDest);
  const [transferDate, setTransferDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [vehicleNumber, setVehicleNumber] = useState<string>("");
  const [driverName, setDriverName] = useState<string>("");
  const [transferNotes, setTransferNotes] = useState<string>("");
  const [transferLines, setTransferLines] = useState<Array<{
    itemId: string;
    itemName: string;
    quantity: number;
    unit: string;
    batchNumber?: string;
    expiryDate?: string;
    maxAvailable: number;
  }>>([]);

  // Item Search / Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGodownFilter, setSelectedGodownFilter] = useState<string>("all");

  // Print Pass Modal
  const [printVoucher, setPrintVoucher] = useState<StockTransferVoucher | null>(null);

  // Loading State
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Open Godown Modal
  const handleOpenGodownModal = (godown?: Godown) => {
    if (godown) {
      setEditingGodown(godown);
      setGodownForm({ ...godown });
    } else {
      setEditingGodown(null);
      setGodownForm({
        name: "",
        address: "",
        managerName: "",
        phone: "",
        notes: ""
      });
    }
    setIsGodownModalOpen(true);
  };

  // Submit Godown Form
  const handleSubmitGodown = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!godownForm.name?.trim()) {
      showAlert("Godown name is required.");
      return;
    }

    const payload: Godown = {
      id: editingGodown?.id || "godown_" + Date.now(),
      name: godownForm.name.trim(),
      address: godownForm.address?.trim() || "",
      managerName: godownForm.managerName?.trim() || "",
      phone: godownForm.phone?.trim() || "",
      notes: godownForm.notes?.trim() || "",
      isDefault: editingGodown?.isDefault || false,
      createdAt: editingGodown?.createdAt || new Date().toISOString().split("T")[0]
    };

    setIsSubmitting(true);
    try {
      await onSaveGodown(payload);
      setIsGodownModalOpen(false);
    } catch (err: any) {
      showAlert("Error saving godown: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add line to Transfer
  const handleAddTransferLine = () => {
    setTransferLines(prev => [
      ...prev,
      {
        itemId: "",
        itemName: "",
        quantity: 1,
        unit: "PCS",
        maxAvailable: 0
      }
    ]);
  };

  // Update line in Transfer
  const handleTransferLineChange = (idx: number, itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    // Determine available stock in selected source godown
    const stockAtSource = item.godownStock?.[sourceGodownId] !== undefined
      ? item.godownStock[sourceGodownId]
      : (sourceGodownId === (godowns[0]?.id || "godown_main") ? (item.stockQuantity || 0) : 0);

    setTransferLines(prev => {
      const copy = [...prev];
      copy[idx] = {
        itemId: item.id,
        itemName: item.name,
        quantity: Math.min(1, stockAtSource),
        unit: item.unit || "PCS",
        batchNumber: item.batchNumber || "",
        expiryDate: item.expiryDate || "",
        maxAvailable: stockAtSource
      };
      return copy;
    });
  };

  const handleUpdateLineQty = (idx: number, qty: number) => {
    setTransferLines(prev => {
      const copy = [...prev];
      copy[idx].quantity = Math.max(0, qty);
      return copy;
    });
  };

  const handleRemoveTransferLine = (idx: number) => {
    setTransferLines(prev => prev.filter((_, i) => i !== idx));
  };

  // Submit Stock Transfer Voucher
  const handleSubmitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceGodownId || !destGodownId) {
      showAlert("Please select both Source and Destination Godowns.");
      return;
    }
    if (sourceGodownId === destGodownId) {
      showAlert("Source and Destination Godowns cannot be the same.");
      return;
    }
    if (transferLines.length === 0) {
      showAlert("Please add at least one item to transfer.");
      return;
    }

    const invalidLines = transferLines.filter(l => !l.itemId || l.quantity <= 0);
    if (invalidLines.length > 0) {
      showAlert("Please ensure all items are selected with valid quantities.");
      return;
    }

    // Check for stock shortages
    for (const line of transferLines) {
      if (line.quantity > line.maxAvailable) {
        showAlert(`Insufficient stock for "${line.itemName}" at source godown. Available: ${line.maxAvailable}, Requested: ${line.quantity}.`);
        return;
      }
    }

    const sourceGodown = godowns.find(g => g.id === sourceGodownId);
    const destGodown = godowns.find(g => g.id === destGodownId);

    const itemsPayload: StockTransferItem[] = transferLines.map(l => ({
      itemId: l.itemId,
      itemName: l.itemName,
      quantity: l.quantity,
      unit: l.unit,
      batchNumber: l.batchNumber,
      expiryDate: l.expiryDate
    }));

    const totalQuantity = transferLines.reduce((acc, curr) => acc + curr.quantity, 0);

    const voucher: StockTransferVoucher = {
      id: "stv_" + Date.now(),
      voucherNumber: `STV-${new Date().getFullYear()}/${String(stockTransfers.length + 1).padStart(3, "0")}`,
      date: transferDate,
      sourceGodownId,
      sourceGodownName: sourceGodown?.name || "Source Godown",
      destGodownId,
      destGodownName: destGodown?.name || "Destination Godown",
      items: itemsPayload,
      totalQuantity,
      driverName: driverName.trim(),
      vehicleNumber: vehicleNumber.trim(),
      notes: transferNotes.trim(),
      status: "completed",
      createdAt: new Date().toISOString()
    };

    setIsSubmitting(true);
    try {
      await onCreateTransfer(voucher);
      setTransferLines([]);
      setVehicleNumber("");
      setDriverName("");
      setTransferNotes("");
      setActiveTab("history");
      setPrintVoucher(voucher);
    } catch (err: any) {
      showAlert("Error creating stock transfer: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compute total items and stock breakdown per godown
  const godownStats = useMemo(() => {
    return godowns.map(g => {
      let totalUnits = 0;
      let itemCount = 0;
      items.forEach(item => {
        const stockInThisGodown = item.godownStock?.[g.id] !== undefined
          ? item.godownStock[g.id]
          : (g.isDefault ? (item.stockQuantity || 0) : 0);
        
        if (stockInThisGodown > 0) {
          totalUnits += stockInThisGodown;
          itemCount++;
        }
      });
      return {
        ...g,
        totalUnits,
        itemCount
      };
    });
  }, [godowns, items]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">मल्टि-गोदाम व स्टॉक ट्रान्सफर (Multi-Godown ERP)</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Multi-warehouse inventory tracking and intra-godown stock transfer delivery vouchers
            </p>
          </div>
        </div>

        {/* Action button */}
        {perms.create && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenGodownModal()}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>नवीन गोदाम जोडा (Add Godown)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('transfer');
                if (transferLines.length === 0) handleAddTransferLine();
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Truck className="w-4 h-4" />
              <span>स्टॉक ट्रान्सफर करा (Transfer Stock)</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap bg-slate-100 p-1.5 rounded-xl gap-1 border border-slate-200 shadow-2xs">
        {[
          { id: 'godowns', label: '🏢 गोदाम यादी व साठा (Godowns & Stock Matrix)', count: godowns.length },
          { id: 'transfer', label: '🚚 नवीन स्टॉक ट्रान्सफर व्हॉउचर (New Transfer)', count: null },
          { id: 'history', label: '📋 ट्रान्सफर इतिहास व चलन (Transfer History)', count: stockTransfers.length }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 min-w-[200px] py-2.5 px-4 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 select-none cursor-pointer ${
              activeTab === tab.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== null && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                activeTab === tab.id ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: GODOWNS LIST & INVENTORY MATRIX */}
      {activeTab === 'godowns' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Godown Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {godownStats.map((godown) => (
              <div
                key={godown.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition space-y-3.5 relative overflow-hidden"
              >
                {godown.isDefault && (
                  <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-bold px-3 py-0.5 rounded-bl-lg uppercase tracking-wider">
                    Primary Store (मुख्य दुकान)
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{godown.name}</h3>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{godown.address || "Main City Location"}</span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Items</span>
                    <span className="font-mono font-bold text-slate-900 text-sm block mt-0.5">{godown.itemCount} SKUs</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Units In Stock</span>
                    <span className="font-mono font-black text-emerald-800 text-sm block mt-0.5">{godown.totalUnits} Units</span>
                  </div>
                </div>

                <div className="text-xs space-y-1 text-slate-600 pt-1">
                  {godown.managerName && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>Incharge: <strong>{godown.managerName}</strong></span>
                    </div>
                  )}
                  {godown.phone && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>Phone: <strong>{godown.phone}</strong></span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                  {perms.update && (
                    <button
                      type="button"
                      onClick={() => handleOpenGodownModal(godown)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                      title="Edit Godown"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {perms.delete && !godown.isDefault && (
                    <button
                      type="button"
                      onClick={async () => {
                        const confirmed = await showConfirm(
                          `Do you want to delete warehouse "${godown.name}"? (Only possible if 0 stock is stored).`
                        );
                        if (confirmed) {
                          try {
                            await onDeleteGodown(godown.id);
                          } catch (err: any) {
                            showAlert(err.message);
                          }
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Delete Godown"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Godown-wise Inventory Stock Matrix Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">गोदामनिहाय इन्व्हेंटरी साठा (Godown-wise Stock Matrix)</h3>
                <p className="text-xs text-slate-500">Real-time inventory levels across all warehouse storage locations</p>
              </div>

              {/* Search & Filter */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search product..."
                    className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-2">HSN</th>
                    <th className="py-2.5 px-2 text-right font-mono">Total Company Stock</th>
                    {godowns.map(g => (
                      <th key={g.id} className="py-2.5 px-2 text-right font-mono text-emerald-950">
                        {g.name}
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-center">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {items
                    .filter(i => !searchQuery || i.name.toLowerCase().includes(searchQuery.toLowerCase()) || (i.hsn && i.hsn.includes(searchQuery)))
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{item.name}</td>
                        <td className="py-2.5 px-2 font-mono text-slate-500">{item.hsn || "—"}</td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900">
                          {item.stockQuantity || 0}
                        </td>
                        {godowns.map(g => {
                          const stockInThis = item.godownStock?.[g.id] !== undefined
                            ? item.godownStock[g.id]
                            : (g.isDefault ? (item.stockQuantity || 0) : 0);
                          return (
                            <td key={g.id} className="py-2.5 px-2 text-right font-mono">
                              <span className={`px-2 py-0.5 rounded font-bold ${
                                stockInThis > 0 ? "bg-emerald-50 text-emerald-900 border border-emerald-200" : "text-slate-400"
                              }`}>
                                {stockInThis}
                              </span>
                            </td>
                          );
                        })}
                        <td className="py-2.5 px-3 text-center font-mono text-slate-500">{item.unit || "PCS"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: NEW STOCK TRANSFER VOUCHER FORM */}
      {activeTab === 'transfer' && (
        <form onSubmit={handleSubmitTransfer} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6 animate-fade-in">
          
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-600" />
              <span>नवीन स्टॉक ट्रान्सफर व्हॉउचर (Create Inter-Godown Stock Movement)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Deduct inventory from source warehouse and transfer into destination storage location
            </p>
          </div>

          {/* Top Parameters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Source Godown */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                माल पाठवणारे गोदाम (Source Godown) *
              </label>
              <select
                value={sourceGodownId}
                onChange={(e) => {
                  setSourceGodownId(e.target.value);
                  setTransferLines([]); // reset lines to recalculate available stocks
                }}
                className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs bg-white outline-none font-bold text-slate-800"
              >
                {godowns.map(g => (
                  <option key={g.id} value={g.id}>{g.name} {g.isDefault ? "(Main Store)" : ""}</option>
                ))}
              </select>
            </div>

            {/* Destination Godown */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                प्राप्त गोदाम (Destination Godown) *
              </label>
              <select
                value={destGodownId}
                onChange={(e) => setDestGodownId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs bg-white outline-none font-bold text-slate-800"
              >
                <option value="">-- गोदाम निवडा (Select Godown) --</option>
                {godowns.filter(g => g.id !== sourceGodownId).map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            {/* Transfer Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                तारीख (Transfer Date)
              </label>
              <input
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs bg-white outline-none font-bold font-mono"
              />
            </div>

            {/* Vehicle Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                गाडी क्रमांक (Vehicle No.)
              </label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="e.g. MH 12 AB 1234"
                className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs bg-white outline-none uppercase font-mono font-bold"
              />
            </div>
          </div>

          {/* Driver Name & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                ड्रायव्हर / हँडओव्हर व्यक्ती (Driver / Handover Person)
              </label>
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="e.g. Ramesh Shinde"
                className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs bg-white outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                शेरा / ट्रान्सफर कारण (Transfer Notes / Reason)
              </label>
              <input
                type="text"
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder="e.g. Stock replenishment for main retail counter"
                className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs bg-white outline-none"
              />
            </div>
          </div>

          {/* Transfer Line Items Table */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                ट्रान्सफर करायचा माल (Items to Transfer)
              </span>
              <button
                type="button"
                onClick={handleAddTransferLine}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ आयटम जोडा (Add Item)</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-2 text-center">Available at Source</th>
                    <th className="py-2.5 px-2">Batch / Lot</th>
                    <th className="py-2.5 px-3 text-right">Transfer Quantity</th>
                    <th className="py-2.5 px-2 text-center">Unit</th>
                    <th className="py-2.5 px-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transferLines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3">
                        <select
                          value={line.itemId}
                          onChange={(e) => handleTransferLineChange(idx, e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none bg-white font-medium"
                        >
                          <option value="">-- Select Product --</option>
                          {items.map(item => (
                            <option key={item.id} value={item.id}>
                              {item.name} (Stock: {item.godownStock?.[sourceGodownId] !== undefined ? item.godownStock[sourceGodownId] : (item.stockQuantity || 0)})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-bold text-slate-700">
                        {line.maxAvailable}
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={line.batchNumber || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTransferLines(prev => {
                              const c = [...prev];
                              c[idx].batchNumber = val;
                              return c;
                            });
                          }}
                          placeholder="Optional Batch"
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs outline-none font-mono"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min="1"
                          max={line.maxAvailable || 999999}
                          value={line.quantity}
                          onChange={(e) => handleUpdateLineQty(idx, parseFloat(e.target.value) || 0)}
                          className="w-24 text-right px-2 py-1 border border-slate-200 focus:border-emerald-500 rounded font-mono font-bold text-xs outline-none"
                        />
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-slate-500">
                        {line.unit || "PCS"}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveTransferLine(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {transferLines.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                        No items added yet. Click <strong>"+ आयटम जोडा (Add Item)"</strong> to begin.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveTab('godowns')}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
            >
              रद्द करा (Cancel)
            </button>
            <button
              type="submit"
              disabled={isSubmitting || transferLines.length === 0}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-emerald-300 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow hover:shadow-md transition cursor-pointer"
            >
              <Truck className="w-4 h-4" />
              <span>{isSubmitting ? "ट्रान्सफर सेव्ह होत आहे..." : "स्टॉक ट्रान्सफर पूर्ण करा व चलन प्रिंट करा"}</span>
            </button>
          </div>

        </form>
      )}

      {/* TAB 3: TRANSFER HISTORY & DELIVERY PASSES */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">स्टॉक ट्रान्सफर इतिहास व चलन नोंदी (Transfer Vouchers History)</h3>
              <p className="text-xs text-slate-500">Audit trail of all inter-godown transfers with delivery pass print options</p>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Voucher #</th>
                  <th className="py-2.5 px-3">Source &rarr; Destination</th>
                  <th className="py-2.5 px-2 text-center">Items</th>
                  <th className="py-2.5 px-3 text-right">Total Units</th>
                  <th className="py-2.5 px-2">Vehicle / Driver</th>
                  <th className="py-2.5 px-2 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockTransfers.map((voucher) => (
                  <tr key={voucher.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">{voucher.date}</td>
                    <td className="py-3 px-3 font-bold font-mono text-slate-900">{voucher.voucherNumber}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800 text-[11px]">
                        <span className="text-emerald-700 font-bold">{voucher.sourceGodownName}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="text-blue-700 font-bold">{voucher.destGodownName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center font-mono">{voucher.items?.length || 0}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-950">
                      {voucher.totalQuantity} Units
                    </td>
                    <td className="py-3 px-2 text-slate-600 text-[11px]">
                      {voucher.vehicleNumber ? `🚗 ${voucher.vehicleNumber}` : "—"} {voucher.driverName ? `(${voucher.driverName})` : ""}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        voucher.status === "completed"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        {voucher.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-1 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setPrintVoucher(voucher)}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 transition cursor-pointer"
                        title="Print Transfer Pass"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Print Pass</span>
                      </button>
                      {perms.delete && voucher.status !== "cancelled" && (
                        <button
                          type="button"
                          onClick={async () => {
                            const confirmed = await showConfirm(
                              `Cancel transfer voucher ${voucher.voucherNumber} and revert stock back to "${voucher.sourceGodownName}"?`
                            );
                            if (confirmed) {
                              try {
                                await onCancelTransfer(voucher.id);
                              } catch (err: any) {
                                showAlert(err.message);
                              }
                            }
                          }}
                          className="px-2 py-1 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                          title="Cancel and Revert Stock"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Revert</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {stockTransfers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                      No stock transfers recorded yet. Create your first transfer using the tab above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Godown Add / Edit Modal */}
      {isGodownModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-scale-in">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">
                  {editingGodown ? "गोदाम माहिती बदला (Edit Godown)" : "नवीन गोदाम जोडा (Add New Godown)"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsGodownModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitGodown} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  गोदामाचे नाव (Godown / Warehouse Name) *
                </label>
                <input
                  type="text"
                  required
                  value={godownForm.name || ""}
                  onChange={(e) => setGodownForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. MIDC Warehouse 1, Cold Storage, etc."
                  className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  पत्ता / लोकेशन (Location Address)
                </label>
                <input
                  type="text"
                  value={godownForm.address || ""}
                  onChange={(e) => setGodownForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="e.g. Plot No 42, MIDC Industrial Area"
                  className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                    इंचार्ज / मॅनेजर नाव (Manager)
                  </label>
                  <input
                    type="text"
                    value={godownForm.managerName || ""}
                    onChange={(e) => setGodownForm(prev => ({ ...prev, managerName: e.target.value }))}
                    placeholder="e.g. Vijay Patil"
                    className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                    मोबाईल नंबर (Phone)
                  </label>
                  <input
                    type="text"
                    value={godownForm.phone || ""}
                    onChange={(e) => setGodownForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  शेरा / टीप (Notes)
                </label>
                <input
                  type="text"
                  value={godownForm.notes || ""}
                  onChange={(e) => setGodownForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g. Fertilizer & seed storage"
                  className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsGodownModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  रद्द करा (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition cursor-pointer"
                >
                  {isSubmitting ? "जतन करत आहे..." : "गोदाम सेव्ह करा (Save)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Transfer Pass Print Modal */}
      {printVoucher && (
        <StockTransferPrintModal
          voucher={printVoucher}
          business={business}
          onClose={() => setPrintVoucher(null)}
        />
      )}

    </div>
  );
}
