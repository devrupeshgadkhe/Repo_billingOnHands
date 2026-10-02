/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { Item, TAX_RATES, UNITS } from "../types.js";
import { useDialog } from "../context/DialogContext.js";
import {
  Search,
  Plus,
  AlertTriangle,
  Sparkles,
  Edit2,
  Trash2,
  Tag,
  Boxes,
  ArrowRight,
  Database,
  Camera,
  FileSpreadsheet
} from "lucide-react";
import ItemsScanModal from "./ItemsScanModal.js";
import DataMigrationModal from "./DataMigrationModal.js";

interface ItemsViewProps {
  items: Item[];
  onSaveItem: (item: Item) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onRefreshDb?: () => Promise<void>;
  permissions?: any;
}

export default function ItemsView({
  items,
  onSaveItem,
  onDeleteItem,
  onRefreshDb,
  permissions
}: ItemsViewProps) {
  
  const perms = permissions || { view: true, create: true, update: true, delete: true };
  const { showConfirm } = useDialog();

  // State managers
  const [searchQuery, setSearchQuery] = useState("");
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [barcodeInputText, setBarcodeInputText] = useState("");

  // Form State
  const [formData, setFormData] = useState<Omit<Item, "id">>({
    name: "",
    hsn: "",
    purchasePrice: 0,
    salePrice: 0,
    mrp: 0,
    wholesalePrice: 0,
    minWholesaleQty: 5,
    boxPackingRatio: 0,
    boxUnit: "BOX",
    category: "",
    brand: "",
    stockQuantity: 0,
    minStockAlert: 5,
    gstRate: 18,
    unit: "PCS",
    barcodes: []
  });

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const lowerQuery = searchQuery.toLowerCase();
      const matchesSearch =
        item.name.toLowerCase().includes(lowerQuery) ||
        item.hsn.toLowerCase().includes(lowerQuery) ||
        (item.brand && item.brand.toLowerCase().includes(lowerQuery)) ||
        (item.category && item.category.toLowerCase().includes(lowerQuery)) ||
        (item.barcodes && item.barcodes.some(b => b.toLowerCase().includes(lowerQuery)));
      
      const matchesLowStock = lowStockFilter ? item.stockQuantity <= item.minStockAlert : true;
      
      return matchesSearch && matchesLowStock;
    });
  }, [items, searchQuery, lowStockFilter]);

  const openAddModal = () => {
    setEditingItem(null);
    setBarcodeInputText("");
    setFormData({
      name: "",
      hsn: "",
      purchasePrice: 0,
      salePrice: 0,
      mrp: 0,
      wholesalePrice: 0,
      minWholesaleQty: 5,
      boxPackingRatio: 0,
      boxUnit: "BOX",
      category: "",
      brand: "",
      stockQuantity: 0,
      minStockAlert: 5,
      gstRate: 18,
      unit: "PCS",
      barcodes: []
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: Item) => {
    setEditingItem(item);
    setBarcodeInputText(item.barcodes ? item.barcodes.join(", ") : "");
    setFormData({
      name: item.name,
      hsn: item.hsn,
      purchasePrice: item.purchasePrice,
      salePrice: item.salePrice,
      mrp: item.mrp || item.salePrice,
      wholesalePrice: item.wholesalePrice || 0,
      minWholesaleQty: item.minWholesaleQty || 5,
      boxPackingRatio: item.boxPackingRatio || 0,
      boxUnit: item.boxUnit || "BOX",
      category: item.category || "",
      brand: item.brand || "",
      stockQuantity: item.stockQuantity,
      minStockAlert: item.minStockAlert,
      gstRate: item.gstRate,
      unit: item.unit,
      barcodes: item.barcodes || []
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "name" || name === "hsn" || name === "unit" || name === "boxUnit" || name === "category" || name === "brand"
        ? value
        : parseFloat(value) || 0
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const parsedBarcodes = barcodeInputText
      .split(",")
      .map(b => b.trim())
      .filter(Boolean);

    const payload: Item = {
      ...formData,
      barcodes: parsedBarcodes,
      id: editingItem ? editingItem.id : ""
    };

    await onSaveItem(payload);
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await showConfirm({
      title: "Delete Item",
      message: `Are you sure you want to delete "${name}" from inventory?`,
      confirmText: "Delete Item",
      variant: "danger"
    });
    if (confirmed) {
      await onDeleteItem(id);
    }
  };

  const handleBatchImportScannedItems = async (scannedList: Omit<Item, "id">[]) => {
    for (const it of scannedList) {
      await onSaveItem({
        ...it,
        id: "item_" + Date.now() + "_" + Math.floor(Math.random() * 1000)
      });
    }
    if (onRefreshDb) await onRefreshDb();
  };

  return (
    <div id="v-items-container" className="space-y-6">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inventory Management</h1>
          <p className="text-xs text-slate-500 mt-1">Configure stock items, trigger supply alerts, and regulate tax/GST HSN codes</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5">
          {perms.create && (
            <>
              {/* AI Handwritten / Printed Scan Button */}
              <button
                id="scan-items-list-btn"
                type="button"
                onClick={() => setIsScanModalOpen(true)}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 select-none px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span>AI हँडरिटन लिस्ट स्कॅन (Scan List)</span>
              </button>

              {/* Data Migration Import Button */}
              <button
                id="data-migration-btn"
                type="button"
                onClick={() => setIsMigrationModalOpen(true)}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 select-none px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 text-indigo-600" />
                <span>डेटा मायग्रेशन (Import CSV)</span>
              </button>

              {/* Manual Add Product */}
              <button
                id="add-item-btn"
                type="button"
                onClick={openAddModal}
                className="bg-emerald-600 hover:bg-emerald-700 text-white select-none px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md hover:shadow-lg transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Product</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter and search deck */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        {/* Search input */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input
            id="item-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items by name or HSN code..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 focus:border-emerald-500 rounded-xl text-xs outline-none font-medium transition"
          />
        </div>

        {/* Low Stock filter checkbox */}
        <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-semibold text-slate-600 select-none pb-1 sm:pb-0">
          <input
            id="low-stock-check"
            type="checkbox"
            checked={lowStockFilter}
            onChange={(e) => setLowStockFilter(e.target.checked)}
            className="accent-emerald-600 w-4 h-4 rounded border-slate-300"
          />
          <span className="flex items-center space-x-1">
            <AlertTriangle className={`w-4 h-4 ${lowStockFilter ? "text-amber-500" : "text-slate-400"}`} />
            <span>Show Low Stock Only ({items.filter(i => i.stockQuantity <= i.minStockAlert).length})</span>
          </span>
        </label>
      </div>

      {/* Main Catalog inventory table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
            <Boxes className="w-16 h-16 text-slate-200 mb-2" />
            <p className="text-sm font-bold text-slate-700">No Inventory Match Found</p>
            <p className="text-xs text-slate-450 mt-1 max-w-xs">Try clearing filters or type a different search name.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-55 border-b border-slate-200 font-bold uppercase text-slate-500">
                <th className="py-3 px-4">Product / Item Code</th>
                <th className="py-3 px-3 text-center">HSN / Brand</th>
                <th className="py-3 px-3 text-right">Purchase (खरेदी)</th>
                <th className="py-3 px-3 text-right">Retail (किरकोळ)</th>
                <th className="py-3 px-3 text-right">Wholesale (घाऊक)</th>
                <th className="py-3 px-3 text-center">Tax Rate</th>
                <th className="py-3 px-4 text-center">Stock (साठा)</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => {
                const isShortage = item.stockQuantity <= item.minStockAlert;
                return (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                    {/* Item Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                          <Tag className="w-4 h-4" />
                        </div>
                        <div>
                          <p id={`item-row-${item.id}-name`} className="font-bold text-slate-800 text-sm">{item.name}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-400">Unit: <span className="font-mono font-semibold">{item.unit}</span></span>
                            {item.boxPackingRatio && item.boxPackingRatio > 0 && (
                              <span className="text-[9px] text-blue-700 font-bold bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">
                                1 {item.boxUnit || "BOX"} = {item.boxPackingRatio} {item.unit}
                              </span>
                            )}
                            {item.brand && (
                              <span className="text-[9px] text-purple-700 font-bold bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded">
                                {item.brand}
                              </span>
                            )}
                            {item.barcodes && item.barcodes.length > 0 && (
                              <span className="text-[9px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 px-1.5 py-0.2 px-1 rounded font-mono">
                                Barcodes: {item.barcodes.join(", ")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* HSN & Brand */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="font-mono text-slate-700 font-bold">{item.hsn || "-"}</div>
                      {item.category && <div className="text-[10px] text-slate-400">{item.category}</div>}
                    </td>

                    {/* Purchase Price */}
                    <td className="py-3.5 px-3 text-right font-mono text-slate-700">₹{(item.purchasePrice).toFixed(2)}</td>

                    {/* Retail Selling price */}
                    <td className="py-3.5 px-3 text-right font-mono text-slate-900 font-semibold">
                      ₹{(item.salePrice).toFixed(2)}
                      {item.mrp && item.mrp > item.salePrice ? (
                        <div className="text-[10px] text-slate-400 line-through">MRP: ₹{item.mrp}</div>
                      ) : null}
                    </td>

                    {/* Wholesale price */}
                    <td className="py-3.5 px-3 text-right font-mono">
                      {item.wholesalePrice && item.wholesalePrice > 0 ? (
                        <div>
                          <span className="text-blue-700 font-bold">₹{item.wholesalePrice.toFixed(2)}</span>
                          <div className="text-[9px] text-slate-400 font-sans">MOQ: {item.minWholesaleQty || 5} {item.unit}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>

                    {/* GST Rate */}
                    <td className="py-3.5 px-3 text-center">
                      <span className="font-bold bg-slate-100 text-slate-700 text-[10px] py-1 px-2 rounded-full">
                        {item.gstRate}% GST
                      </span>
                    </td>

                    {/* Stock quantity */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <span id={`item-row-${item.id}-quantity`} className={`font-mono text-sm font-black px-2 py-0.5 rounded-lg ${
                          isShortage
                            ? "bg-rose-50 text-rose-600 border border-rose-100"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        }`}>
                          {item.stockQuantity} {item.unit}
                        </span>
                        {isShortage && (
                          <span className="text-[9px] text-rose-500 font-bold mt-1 flex items-center space-x-0.5">
                            <AlertTriangle className="w-3 h-3 text-rose-500" />
                            <span>Shortage (≤{item.minStockAlert})</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Action buttons */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        {perms.update && (
                          <button
                            id={`edit-item-${item.id}-btn`}
                            onClick={() => openEditModal(item)}
                            className="p-1 px-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition"
                            title="Edit Item"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {perms.delete && (
                          <button
                            id={`delete-item-${item.id}-btn`}
                            onClick={() => handleDelete(item.id, item.name)}
                            className="p-1 px-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                            title="Delete Item"
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

      {/* Item Modal Popup Form: Drawer sliding effect */}
      {isModalOpen && (
        <div id="item-modal-container" className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 flex items-center justify-end">
          <div id="item-modal-drawer" className="bg-white w-full max-w-lg h-screen flex flex-col shadow-2xl p-6 overflow-y-auto">
            
            {/* Modal header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center space-x-2">
                <Boxes className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-905 font-sans text-base">
                  {editingItem ? "Edit Inventory Item" : "New Inventory record"}
                </h3>
              </div>
              <button
                id="close-item-modal-btn"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold select-none bg-slate-100 rounded px-2 py-1"
              >
                Close
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Product Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 label-required">Item / Catalog Name *</label>
                  <input
                    id="modal-item-name"
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. महाधन 10:26:26 (50kg Bag) / Denim Stretch Blue Jeans"
                    className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none font-bold"
                  />
                </div>

                {/* Brand & Category side-by-side */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Brand / Company (ब्रँड)</label>
                    <input
                      type="text"
                      name="brand"
                      value={formData.brand}
                      onChange={handleInputChange}
                      placeholder="e.g. Mahadhan / Bayer / Raymond"
                      className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Category (कॅटेगरी)</label>
                    <input
                      type="text"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      placeholder="e.g. Fertilizers / Apparel / Seeds"
                      className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none"
                    />
                  </div>
                </div>

                {/* Multiple Barcodes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 font-medium">Product Barcodes (Comma-separated)</label>
                  <input
                    id="modal-item-barcodes"
                    type="text"
                    value={barcodeInputText}
                    onChange={(e) => setBarcodeInputText(e.target.value)}
                    placeholder="e.g. 5013, 8901235432, APEX-170"
                    className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none font-mono"
                  />
                </div>

                {/* HSN Code & Unit side-by-side */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">HSN Code</label>
                    <input
                      id="modal-item-hsn"
                      type="text"
                      name="hsn"
                      maxLength={8}
                      value={formData.hsn}
                      onChange={handleInputChange}
                      placeholder="e.g. 3105"
                      className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Commercial Unit</label>
                    <select
                      id="modal-item-unit"
                      name="unit"
                      value={formData.unit}
                      onChange={handleInputChange}
                      className="w-full px-2 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs bg-white outline-none font-bold"
                    >
                      {UNITS.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Multi-Tier Pricing Card */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                    💰 मल्टि-टियर दर (Multi-Tier Pricing)
                  </span>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Purchase (खरेदी)</label>
                      <input
                        type="number"
                        name="purchasePrice"
                        min="0"
                        value={formData.purchasePrice || ""}
                        onChange={handleInputChange}
                        placeholder="₹ 1200"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">MRP (छापील)</label>
                      <input
                        type="number"
                        name="mrp"
                        min="0"
                        value={formData.mrp || ""}
                        onChange={handleInputChange}
                        placeholder="₹ 1500"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-emerald-800 uppercase mb-1">Retail Sale (किरकोळ) *</label>
                      <input
                        type="number"
                        name="salePrice"
                        min="0"
                        required
                        value={formData.salePrice || ""}
                        onChange={handleInputChange}
                        placeholder="₹ 1400"
                        className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-bold text-emerald-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/80">
                    <div>
                      <label className="block text-[10px] font-bold text-blue-800 uppercase mb-1">Wholesale Rate (घाऊक दर)</label>
                      <input
                        type="number"
                        name="wholesalePrice"
                        min="0"
                        value={formData.wholesalePrice || ""}
                        onChange={handleInputChange}
                        placeholder="₹ 1320"
                        className="w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-mono font-bold text-blue-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-blue-800 uppercase mb-1">Min Wholesale Qty (MOQ)</label>
                      <input
                        type="number"
                        name="minWholesaleQty"
                        min="1"
                        value={formData.minWholesaleQty || ""}
                        onChange={handleInputChange}
                        placeholder="5 नग"
                        className="w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Box Packing Ratio Conversion */}
                <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-blue-900 uppercase mb-1">1 पेटी / बॉक्समध्ये नग (Packing Ratio)</label>
                    <input
                      type="number"
                      name="boxPackingRatio"
                      min="0"
                      value={formData.boxPackingRatio || ""}
                      onChange={handleInputChange}
                      placeholder="उदा. 24 नग"
                      className="w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-blue-900 uppercase mb-1">बॉक्सचे नाव (Packaging Unit)</label>
                    <select
                      name="boxUnit"
                      value={formData.boxUnit}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-bold text-blue-900"
                    >
                      <option value="BOX">BOX (खोका)</option>
                      <option value="BAG">BAG (पोते/बॅग)</option>
                      <option value="CARTON">CARTON (कार्टन)</option>
                      <option value="CASE">CASE (केस/पेटी)</option>
                    </select>
                  </div>
                </div>

                {/* GST Tax Rate Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">GST Rate (%)</label>
                  <select
                    id="modal-item-gstrate"
                    name="gstRate"
                    value={formData.gstRate}
                    onChange={handleInputChange}
                    className="w-full px-2 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs bg-white outline-none font-bold"
                  >
                    {TAX_RATES.map(rate => (
                      <option key={rate} value={rate}>{rate}% Tax Bracket</option>
                    ))}
                  </select>
                </div>

                {/* Inventories: Current stock, min alerts */}
                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Opening Stock</label>
                    <input
                      id="modal-item-stock-qty"
                      type="number"
                      name="stockQuantity"
                      value={formData.stockQuantity}
                      onChange={handleInputChange}
                      placeholder="e.g. 50"
                      className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Low Stock Limit</label>
                    <input
                      id="modal-item-min-alert"
                      type="number"
                      name="minStockAlert"
                      min="0"
                      value={formData.minStockAlert}
                      onChange={handleInputChange}
                      placeholder="e.g. 5"
                      className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-6 border-t border-slate-100">
                <button
                  id="save-item-modal-btn"
                  type="submit"
                  className="w-full bg-emerald-650 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs tracking-wider uppercase shadow transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>Save Record</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* AI Handwritten / Printed Items Scan Modal */}
      <ItemsScanModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onItemsImported={handleBatchImportScannedItems}
        existingItems={items}
      />

      {/* Universal Data Migration / CSV Modal */}
      <DataMigrationModal
        isOpen={isMigrationModalOpen}
        onClose={() => setIsMigrationModalOpen(false)}
        onImportCompleted={async () => {
          if (onRefreshDb) await onRefreshDb();
        }}
        existingItems={items}
      />

    </div>
  );
}
