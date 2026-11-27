/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import {
  Item,
  TAX_RATES,
  UNITS,
  RESTAURANT_UNITS,
  RESTAURANT_CATEGORIES,
  KITCHEN_STATIONS,
  BusinessProfile,
  BarcodeEntry
} from "../types.js";
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
  Clock,
  AlertCircle,
  CalendarOff,
  Printer,
  Barcode,
  X,
  Utensils,
  ChefHat,
  CheckCircle2,
  Ban,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import ItemsScanModal from "./ItemsScanModal.js";
import DataMigrationModal from "./DataMigrationModal.js";
import BarcodePrintModal from "./BarcodePrintModal.js";
import { BarcodeSvg, generateCustomBarcode, checkDuplicateBarcode } from "../utils/barcodeUtils.js";

export function DietaryMark({ type }: { type?: Item['dietaryType'] }) {
  const effective = type || 'veg';
  if (effective === 'non_veg') {
    return (
      <span
        title="Non-Veg"
        className="w-4 h-4 rounded-[3px] border-[1.5px] border-rose-600 bg-white inline-flex items-center justify-center shrink-0"
      >
        <span className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[7px] border-b-rose-600" />
      </span>
    );
  }
  if (effective === 'egg') {
    return (
      <span
        title="Contains Egg"
        className="w-4 h-4 rounded-[3px] border-[1.5px] border-amber-600 bg-white inline-flex items-center justify-center shrink-0"
      >
        <span className="w-2 h-2 rounded-full bg-amber-600" />
      </span>
    );
  }
  if (effective === 'beverage') {
    return (
      <span
        title="Beverage / Drink"
        className="w-4 h-4 rounded-[3px] border-[1.5px] border-sky-600 bg-white inline-flex items-center justify-center shrink-0"
      >
        <span className="w-2 h-2 rounded-full bg-sky-600" />
      </span>
    );
  }
  return (
    <span
      title="Pure Veg"
      className="w-4 h-4 rounded-[3px] border-[1.5px] border-emerald-600 bg-white inline-flex items-center justify-center shrink-0"
    >
      <span className="w-2 h-2 rounded-full bg-emerald-600" />
    </span>
  );
}

export function getExpiryStatus(expiryDate?: string): {
  status: 'none' | 'valid' | 'expiring_soon' | 'expired';
  daysRemaining: number | null;
  label: string;
} {
  if (!expiryDate || !expiryDate.trim()) return { status: 'none', daysRemaining: null, label: '' };
  try {
    const raw = expiryDate.trim();
    const dateStr = raw.length === 7 ? `${raw}-01` : raw;
    const expDate = new Date(dateStr);
    if (isNaN(expDate.getTime())) return { status: 'none', daysRemaining: null, label: '' };
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    expDate.setHours(0, 0, 0, 0);
    const diffTime = expDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { status: 'expired', daysRemaining: diffDays, label: `Expired (${Math.abs(diffDays)}d ago)` };
    } else if (diffDays <= 45) {
      return { status: 'expiring_soon', daysRemaining: diffDays, label: `Expires in ${diffDays}d` };
    } else {
      return { status: 'valid', daysRemaining: diffDays, label: `Valid for ${diffDays}d` };
    }
  } catch {
    return { status: 'none', daysRemaining: null, label: '' };
  }
}

interface ItemsViewProps {
  items: Item[];
  onSaveItem: (item: Item) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onRefreshDb?: () => Promise<void>;
  permissions?: any;
  business?: BusinessProfile;
}

export default function ItemsView({
  items,
  onSaveItem,
  onDeleteItem,
  onRefreshDb,
  permissions,
  business
}: ItemsViewProps) {
  
  const perms = permissions || { view: true, create: true, update: true, delete: true };
  const { showConfirm, showAlert } = useDialog();
  const isRestaurantMode = business?.businessType === "restaurant";

  // State managers
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<'all' | 'low_stock' | 'expiring_soon' | 'expired' | 'veg' | 'non_veg' | 'available' | 'sold_out'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [showPackagedStockSection, setShowPackagedStockSection] = useState(false);

  // Barcode Management States in Modal
  const [barcodeEntries, setBarcodeEntries] = useState<BarcodeEntry[]>([]);
  const [newBarcodeInput, setNewBarcodeInput] = useState("");
  const [newBarcodeType, setNewBarcodeType] = useState<'custom' | 'manufacturer' | 'pack' | 'variant'>('custom');
  const [barcodeWarning, setBarcodeWarning] = useState<string | null>(null);

  // Barcode Label Print Modal
  const [isBarcodePrintModalOpen, setIsBarcodePrintModalOpen] = useState(false);
  const [selectedItemForPrint, setSelectedItemForPrint] = useState<Item | null>(null);

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
    batchNumber: "",
    expiryDate: "",
    mfgDate: "",
    barcodes: [],
    dietaryType: "veg",
    halfPrice: 0,
    kitchenStation: "",
    shortCode: "",
    isAvailable: true,
    trackStock: false
  });

  // Calculate quick metrics (for both Retail & Restaurant modes)
  const {
    lowStockCount,
    expiringSoonCount,
    expiredCount,
    vegCount,
    nonVegEggCount,
    availableCount,
    soldOutCount
  } = useMemo(() => {
    let low = 0;
    let expSoon = 0;
    let exp = 0;
    let veg = 0;
    let nonVeg = 0;
    let avail = 0;
    let soldOut = 0;

    items.forEach(it => {
      if (it.trackStock !== false && (it.stockQuantity || 0) <= (it.minStockAlert || 0)) {
        low++;
      }
      const expStatus = getExpiryStatus(it.expiryDate);
      if (expStatus.status === 'expired') {
        exp++;
      } else if (expStatus.status === 'expiring_soon') {
        expSoon++;
      }

      if (it.dietaryType === 'non_veg' || it.dietaryType === 'egg') {
        nonVeg++;
      } else if (it.dietaryType === 'veg' || !it.dietaryType) {
        veg++;
      }

      if (it.isAvailable === false) {
        soldOut++;
      } else {
        avail++;
      }
    });

    return {
      lowStockCount: low,
      expiringSoonCount: expSoon,
      expiredCount: exp,
      vegCount: veg,
      nonVegEggCount: nonVeg,
      availableCount: avail,
      soldOutCount: soldOut
    };
  }, [items]);

  // Unique categories for Restaurant Course dropdown filter
  const availableMenuCategories = useMemo(() => {
    const set = new Set<string>();
    items.forEach(it => {
      if (it.category && it.category.trim()) set.add(it.category.trim());
    });
    return Array.from(set).sort();
  }, [items]);

  // Filter items based on active tab, category filter, and search query
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return items.filter(item => {
      // 1. Tab condition
      if (filterTab === 'low_stock' && (item.trackStock === false || (item.stockQuantity || 0) > (item.minStockAlert || 0))) {
        return false;
      }
      if (filterTab === 'expiring_soon' && getExpiryStatus(item.expiryDate).status !== 'expiring_soon') {
        return false;
      }
      if (filterTab === 'expired' && getExpiryStatus(item.expiryDate).status !== 'expired') {
        return false;
      }
      if (filterTab === 'veg' && item.dietaryType && item.dietaryType !== 'veg') {
        return false;
      }
      if (filterTab === 'non_veg' && item.dietaryType !== 'non_veg' && item.dietaryType !== 'egg') {
        return false;
      }
      if (filterTab === 'available' && item.isAvailable === false) {
        return false;
      }
      if (filterTab === 'sold_out' && item.isAvailable !== false) {
        return false;
      }

      // 2. Category filter (Restaurant mode)
      if (isRestaurantMode && categoryFilter !== "all") {
        if ((item.category || "").trim().toLowerCase() !== categoryFilter.trim().toLowerCase()) {
          return false;
        }
      }

      // 3. Search query condition
      if (!q) return true;
      const matchName = item.name.toLowerCase().includes(q);
      const matchShortCode = (item.shortCode || "").toLowerCase().includes(q);
      const matchCategory = (item.category || "").toLowerCase().includes(q);
      const matchStation = (item.kitchenStation || "").toLowerCase().includes(q);
      const matchHsn = (item.hsn || "").toLowerCase().includes(q);
      const matchBrand = (item.brand || "").toLowerCase().includes(q);
      const matchBatch = (item.batchNumber || "").toLowerCase().includes(q);
      const matchBarcode = Array.isArray(item.barcodes) && item.barcodes.some(b => (b || "").toLowerCase().includes(q));

      return matchName || matchShortCode || matchCategory || matchStation || matchHsn || matchBrand || matchBatch || matchBarcode;
    });
  }, [items, searchQuery, filterTab, categoryFilter, isRestaurantMode]);

  const openAddModal = () => {
    setEditingItem(null);
    if (isRestaurantMode) {
      setFormData({
        name: "",
        hsn: "2106",
        purchasePrice: 0,
        salePrice: 0,
        mrp: 0,
        wholesalePrice: 0,
        minWholesaleQty: 5,
        boxPackingRatio: 0,
        boxUnit: "BOX",
        category: "Main Course",
        brand: "",
        stockQuantity: 0,
        minStockAlert: 0,
        gstRate: business?.defaultGstSlab ?? 5,
        unit: "PLATE",
        batchNumber: "",
        expiryDate: "",
        mfgDate: "",
        barcodes: [],
        dietaryType: "veg",
        halfPrice: 0,
        kitchenStation: "Indian Kitchen",
        shortCode: "",
        isAvailable: true,
        trackStock: false
      });
      setShowPackagedStockSection(false);
    } else {
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
        batchNumber: "",
        expiryDate: "",
        mfgDate: "",
        barcodes: []
      });
    }
    setBarcodeEntries([]);
    setNewBarcodeInput("");
    setBarcodeWarning(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: Item) => {
    setEditingItem(item);

    // Initialize barcodes entries
    const existingEntries: BarcodeEntry[] = [];
    if (Array.isArray(item.barcodeEntries) && item.barcodeEntries.length > 0) {
      existingEntries.push(...item.barcodeEntries);
    } else if (Array.isArray(item.barcodes)) {
      item.barcodes.forEach((b, idx) => {
        existingEntries.push({
          code: b,
          type: idx === 0 ? "custom" : "manufacturer",
          isPrimary: idx === 0
        });
      });
    }

    setBarcodeEntries(existingEntries);
    setNewBarcodeInput("");
    setBarcodeWarning(null);

    setFormData({
      name: item.name,
      hsn: item.hsn,
      purchasePrice: item.purchasePrice,
      salePrice: item.salePrice,
      mrp: item.mrp || 0,
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
      batchNumber: item.batchNumber || "",
      expiryDate: item.expiryDate || "",
      mfgDate: item.mfgDate || "",
      barcodes: item.barcodes || [],
      dietaryType: item.dietaryType || (isRestaurantMode ? "veg" : undefined),
      halfPrice: item.halfPrice || 0,
      kitchenStation: item.kitchenStation || "",
      shortCode: item.shortCode || "",
      isAvailable: item.isAvailable !== false,
      trackStock: Boolean(item.trackStock)
    });
    setShowPackagedStockSection(Boolean(item.trackStock) || existingEntries.length > 0);
    setIsModalOpen(true);
  };

  const handleToggleMenuAvailability = async (item: Item) => {
    const nextAvailable = item.isAvailable === false ? true : false;
    await onSaveItem({
      ...item,
      isAvailable: nextAvailable
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: [
        "name",
        "hsn",
        "unit",
        "boxUnit",
        "category",
        "brand",
        "batchNumber",
        "expiryDate",
        "mfgDate",
        "kitchenStation",
        "shortCode",
        "dietaryType"
      ].includes(name)
        ? value
        : parseFloat(value) || 0
    }));
  };

  // Add barcode to list
  const handleAddBarcode = (codeToAdd?: string) => {
    const code = (codeToAdd || newBarcodeInput).trim();
    if (!code) return;

    // Check duplicate in current item
    if (barcodeEntries.some(b => b.code.toUpperCase() === code.toUpperCase())) {
      setBarcodeWarning(`Barcode "${code}" is already linked to this item.`);
      return;
    }

    // Check duplicate in other database items
    const dupCheck = checkDuplicateBarcode(code, items, editingItem?.id);
    if (dupCheck.isDuplicate && dupCheck.matchedItem) {
      setBarcodeWarning(`Warning: Barcode "${code}" is already assigned to "${dupCheck.matchedItem.name}".`);
    } else {
      setBarcodeWarning(null);
    }

    const isFirst = barcodeEntries.length === 0;
    const newEntry: BarcodeEntry = {
      code,
      type: newBarcodeType,
      isPrimary: isFirst
    };

    setBarcodeEntries(prev => [...prev, newEntry]);
    setNewBarcodeInput("");
  };

  // Auto-generate custom barcode
  const handleGenerateCustomBarcode = () => {
    const prefix = business?.name 
      ? business.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() 
      : "BOH";
    const generated = generateCustomBarcode(prefix, items);
    handleAddBarcode(generated);
  };

  const handleRemoveBarcode = (index: number) => {
    setBarcodeEntries(prev => {
      const updated = prev.filter((_, idx) => idx !== index);
      // Ensure at least one primary if items remain
      if (updated.length > 0 && !updated.some(b => b.isPrimary)) {
        updated[0].isPrimary = true;
      }
      return updated;
    });
    setBarcodeWarning(null);
  };

  const handleSetPrimaryBarcode = (index: number) => {
    setBarcodeEntries(prev => prev.map((entry, idx) => ({
      ...entry,
      isPrimary: idx === index
    })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    // Normalize barcodes list
    const primaryCodes = barcodeEntries.filter(b => b.isPrimary).map(b => b.code);
    const otherCodes = barcodeEntries.filter(b => !b.isPrimary).map(b => b.code);
    const finalBarcodes = Array.from(new Set([...primaryCodes, ...otherCodes]));

    const payload: Item = {
      ...formData,
      barcodes: finalBarcodes,
      barcodeEntries: barcodeEntries,
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
    try {
      const itemsToSave: Item[] = scannedList.map(it => ({
        ...it,
        id: "item_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6)
      }));
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemsToSave)
      });
      if (!res.ok) throw new Error("Failed to save scanned items");
      if (onRefreshDb) await onRefreshDb();
    } catch (err: any) {
      console.error(err);
      await showAlert({
        title: "Import Error",
        message: err.message || "Failed to batch import scanned items",
        variant: "danger"
      });
    }
  };

  const handleOpenPrintModal = (item: Item) => {
    setSelectedItemForPrint(item);
    setIsBarcodePrintModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top action deck */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            {isRestaurantMode ? (
              <Utensils className="w-6 h-6 text-emerald-600" />
            ) : (
              <Boxes className="w-6 h-6 text-emerald-600" />
            )}
            {isRestaurantMode ? "Restaurant Menu & Dish Catalog" : "Products & Inventory Catalog"}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isRestaurantMode
              ? "Manage hotel dishes, veg/non-veg dietary tags, half & full portions, kitchen stations, and daily availability"
              : "Manage multi-tier pricing, custom barcodes, stock levels, and batch expiry dates"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {perms.create && (
            <>
              {/* AI Handwritten / Photo Scanner */}
              <button
                id="ai-items-scanner-btn"
                type="button"
                onClick={() => setIsScanModalOpen(true)}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 select-none px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition cursor-pointer"
                title={isRestaurantMode ? "Scan printed restaurant menu card using AI" : "Scan handwritten invoices or printed product lists using AI"}
              >
                <Camera className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isRestaurantMode ? "AI Menu Scan" : "AI Invoice / List Scan"}</span>
              </button>

              {/* Data Migration Import Button */}
              <button
                id="data-migration-btn"
                type="button"
                onClick={() => setIsMigrationModalOpen(true)}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 select-none px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition cursor-pointer"
                title="Import catalog from Excel or CSV file"
              >
                <Database className="w-3.5 h-3.5 text-indigo-600" />
                <span>Import CSV / Excel</span>
              </button>

              {/* Manual Add Product / Menu Item */}
              <button
                id="add-item-btn"
                type="button"
                onClick={openAddModal}
                className="bg-emerald-600 hover:bg-emerald-700 text-white select-none px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md hover:shadow-lg transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{isRestaurantMode ? "Add Menu Item" : "Add New Product"}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 4 Interactive Quick Filter Metric Cards */}
      {isRestaurantMode ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Total Menu Items */}
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`p-4 rounded-xl border text-left transition cursor-pointer ${
              filterTab === 'all'
                ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Total Menu Items</span>
              <Utensils className={`w-4 h-4 ${filterTab === 'all' ? 'text-emerald-600' : 'text-slate-400'}`} />
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 font-mono">
              {items.length}
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Dishes, Breads & Drinks</span>
          </button>

          {/* Pure Veg */}
          <button
            type="button"
            onClick={() => setFilterTab('veg')}
            className={`p-4 rounded-xl border text-left transition cursor-pointer ${
              filterTab === 'veg'
                ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800">Veg Dishes</span>
              <DietaryMark type="veg" />
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-900 font-mono">
              {vegCount}
            </div>
            <span className="text-[10px] text-emerald-700/80 font-medium">Vegetarian Specials</span>
          </button>

          {/* Non-Veg & Egg */}
          <button
            type="button"
            onClick={() => setFilterTab('non_veg')}
            className={`p-4 rounded-xl border text-left transition cursor-pointer ${
              filterTab === 'non_veg'
                ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-rose-300 hover:bg-rose-50/30 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-800">Non-Veg & Egg</span>
              <DietaryMark type="non_veg" />
            </div>
            <div className="mt-2 text-2xl font-black text-rose-900 font-mono">
              {nonVegEggCount}
            </div>
            <span className="text-[10px] text-rose-700/80 font-medium">Meat, Seafood & Egg</span>
          </button>

          {/* Sold Out Today */}
          <button
            type="button"
            onClick={() => setFilterTab('sold_out')}
            className={`p-4 rounded-xl border text-left transition cursor-pointer ${
              filterTab === 'sold_out'
                ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/30 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-800">Sold Out / Off Menu</span>
              <Ban className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-amber-900 font-mono">
              {soldOutCount}
            </div>
            <span className="text-[10px] text-amber-700/80 font-medium">
              {availableCount} Available Now
            </span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Total Items */}
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`p-4 rounded-xl border text-left transition cursor-pointer ${
              filterTab === 'all'
                ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Total Products</span>
              <Boxes className={`w-4 h-4 ${filterTab === 'all' ? 'text-emerald-600' : 'text-slate-400'}`} />
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 font-mono">
              {items.length}
            </div>
            <span className="text-[10px] text-slate-400 font-medium">All Catalog Inventory</span>
          </button>

          {/* Low Stock */}
          <button
            type="button"
            onClick={() => setFilterTab('low_stock')}
            className={`p-4 rounded-xl border text-left transition cursor-pointer ${
              filterTab === 'low_stock'
                ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/30 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-800">Low Stock Alert</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-amber-900 font-mono">
              {lowStockCount}
            </div>
            <span className="text-[10px] text-amber-700/80 font-medium">Needs Reordering</span>
          </button>

          {/* Expiring Soon */}
          <button
            type="button"
            onClick={() => setFilterTab('expiring_soon')}
            className={`p-4 rounded-xl border text-left transition cursor-pointer ${
              filterTab === 'expiring_soon'
                ? 'bg-orange-50 border-orange-400 ring-2 ring-orange-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-orange-300 hover:bg-orange-50/30 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-orange-800">Expiring Soon</span>
              <Clock className="w-4 h-4 text-orange-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-orange-900 font-mono">
              {expiringSoonCount}
            </div>
            <span className="text-[10px] text-orange-700/80 font-medium">Within 45 Days</span>
          </button>

          {/* Expired Stock */}
          <button
            type="button"
            onClick={() => setFilterTab('expired')}
            className={`p-4 rounded-xl border text-left transition cursor-pointer ${
              filterTab === 'expired'
                ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-rose-300 hover:bg-rose-50/30 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-800">Expired Stock</span>
              <CalendarOff className="w-4 h-4 text-rose-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-rose-900 font-mono">
              {expiredCount}
            </div>
            <span className="text-[10px] text-rose-700/80 font-medium">Quarantine / Return</span>
          </button>
        </div>
      )}

      {/* Filter and search deck */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        {/* Search input */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input
              id="item-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isRestaurantMode
                  ? "Search dish by name, short code (e.g. PBM), course or kitchen..."
                  : "Search items by name, HSN, batch or barcode..."
              }
              className="w-full pl-9 pr-4 py-2 border border-slate-200 focus:border-emerald-500 rounded-xl text-xs outline-none font-medium transition"
            />
          </div>

          {isRestaurantMode && (
            <select
              id="menu-category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-xl text-xs font-semibold text-slate-700 bg-white outline-none"
            >
              <option value="all">All Courses / Categories</option>
              {availableMenuCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )}
        </div>

        {/* Tab Indicator */}
        {isRestaurantMode ? (
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterTab === 'all' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('veg')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterTab === 'veg' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Veg ({vegCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('non_veg')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterTab === 'non_veg' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Non-Veg / Egg ({nonVegEggCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('available')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterTab === 'available' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Available ({availableCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('sold_out')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterTab === 'sold_out' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sold Out ({soldOutCount})
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterTab === 'all' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('low_stock')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterTab === 'low_stock' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Low Stock ({lowStockCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('expiring_soon')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterTab === 'expiring_soon' ? 'bg-orange-500 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Expiring Soon ({expiringSoonCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('expired')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterTab === 'expired' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Expired ({expiredCount})
            </button>
          </div>
        )}
      </div>

      {/* Main Catalog / Menu table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
            {isRestaurantMode ? (
              <Utensils className="w-16 h-16 text-slate-200 mb-2" />
            ) : (
              <Boxes className="w-16 h-16 text-slate-200 mb-2" />
            )}
            <p className="text-sm font-bold text-slate-700">
              {isRestaurantMode ? "No Menu Dishes Found" : "No Items Found"}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              {isRestaurantMode
                ? "Try adjusting your course filter or add a new dish to the hotel menu."
                : "Try adjusting your filters or search by a different name, HSN or barcode."}
            </p>
          </div>
        ) : isRestaurantMode ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-500">
                  <th className="py-3 px-4">Dish & Short Code</th>
                  <th className="py-3 px-3">Course / Category</th>
                  <th className="py-3 px-3">Kitchen Station</th>
                  <th className="py-3 px-3 text-right">Menu Price (Full / Half)</th>
                  <th className="py-3 px-3 text-center">GST %</th>
                  <th className="py-3 px-4 text-center">Availability & Stock</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => {
                  const isAvailable = item.isAvailable !== false;
                  const tracksInventory = item.trackStock === true;
                  const isPackShortage = tracksInventory && (item.stockQuantity || 0) <= (item.minStockAlert || 0);
                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-slate-100 hover:bg-slate-50 transition ${!isAvailable ? "bg-slate-50/60 opacity-80" : ""}`}
                    >
                      {/* Dish & Short Code */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start space-x-3">
                          <div className="mt-0.5">
                            <DietaryMark type={item.dietaryType} />
                          </div>
                          <div>
                            <p id={`item-row-${item.id}-name`} className="font-bold text-slate-900 text-sm leading-tight">
                              {item.name}
                            </p>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {[
                                item.shortCode ? `Code: ${item.shortCode}` : null,
                                `Unit: ${item.unit || "PLATE"}`,
                                item.barcodes && item.barcodes.length > 0 ? `Barcode: ${item.barcodes[0]}` : null
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Course / Category */}
                      <td className="py-3.5 px-3 text-slate-700 font-semibold">
                        {item.category || "Uncategorized"}
                      </td>

                      {/* Kitchen Station */}
                      <td className="py-3.5 px-3 text-slate-600">
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <ChefHat className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.kitchenStation || "Main Kitchen"}</span>
                        </span>
                      </td>

                      {/* Menu Price (Full / Half) */}
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                        <div className="text-sm font-bold text-slate-900">₹{item.salePrice.toFixed(2)}</div>
                        {item.halfPrice && item.halfPrice > 0 ? (
                          <div className="text-[11px] text-slate-500">Half: ₹{item.halfPrice.toFixed(2)}</div>
                        ) : null}
                      </td>

                      {/* GST Rate */}
                      <td className="py-3.5 px-3 text-center font-mono font-semibold text-slate-700">
                        {item.gstRate}%
                      </td>

                      {/* Availability & Optional Stock */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <button
                            id={`toggle-avail-${item.id}-btn`}
                            type="button"
                            disabled={!perms.update}
                            onClick={() => handleToggleMenuAvailability(item)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                              isAvailable
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                                : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                            }`}
                            title="Click to toggle today's kitchen availability"
                          >
                            {isAvailable ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Ban className="w-3.5 h-3.5 text-rose-600" />
                            )}
                            <span>{isAvailable ? "Available" : "Sold Out"}</span>
                          </button>

                          {tracksInventory && (
                            <span
                              id={`item-row-${item.id}-quantity`}
                              className={`font-mono text-[10px] font-bold ${
                                isPackShortage ? "text-rose-600" : "text-slate-500"
                              }`}
                            >
                              Stock: {item.stockQuantity} {item.unit}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          {item.barcodes && item.barcodes.length > 0 && (
                            <button
                              id={`print-barcode-${item.id}-btn`}
                              onClick={() => handleOpenPrintModal(item)}
                              className="p-1.5 px-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                              title="Print Barcode Labels / Stickers"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          )}

                          {perms.update && (
                            <button
                              id={`edit-item-${item.id}-btn`}
                              onClick={() => openEditModal(item)}
                              className="p-1.5 px-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                              title="Edit Menu Item"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {perms.delete && (
                            <button
                              id={`delete-item-${item.id}-btn`}
                              onClick={() => handleDelete(item.id, item.name)}
                              className="p-1.5 px-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Delete Menu Item"
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
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-500">
                  <th className="py-3 px-4">Product / Item Code</th>
                  <th className="py-3 px-3 text-center">Batch & Expiry</th>
                  <th className="py-3 px-3 text-center">HSN / Brand</th>
                  <th className="py-3 px-3 text-right">Purchase Price</th>
                  <th className="py-3 px-3 text-right">Retail Price</th>
                  <th className="py-3 px-3 text-right">Wholesale Price</th>
                  <th className="py-3 px-3 text-center">Tax Rate</th>
                  <th className="py-3 px-4 text-center">Stock</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => {
                  const isShortage = (item.stockQuantity || 0) <= (item.minStockAlert || 0);
                  const exp = getExpiryStatus(item.expiryDate);
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
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
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
                                <div className="flex items-center gap-1 flex-wrap">
                                  {item.barcodes.map((bc, bIdx) => (
                                    <span key={bIdx} className="text-[9px] text-emerald-800 font-mono font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                                      <Barcode className="w-2.5 h-2.5 text-emerald-600" />
                                      {bc}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Batch & Expiry Column */}
                      <td className="py-3.5 px-3 text-center">
                        {item.batchNumber || item.expiryDate ? (
                          <div className="space-y-1">
                            {item.batchNumber && (
                              <span className="inline-block font-mono text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded">
                                Batch: {item.batchNumber}
                              </span>
                            )}
                            {item.expiryDate && (
                              <div>
                                {exp.status === 'expired' ? (
                                  <span className="inline-flex items-center gap-1 font-bold text-[9px] bg-rose-100 border border-rose-300 text-rose-800 px-1.5 py-0.5 rounded-full">
                                    <AlertCircle className="w-3 h-3 text-rose-600" />
                                    {exp.label}
                                  </span>
                                ) : exp.status === 'expiring_soon' ? (
                                  <span className="inline-flex items-center gap-1 font-bold text-[9px] bg-orange-100 border border-orange-300 text-orange-800 px-1.5 py-0.5 rounded-full">
                                    <Clock className="w-3 h-3 text-orange-600" />
                                    Exp: {item.expiryDate} ({exp.daysRemaining}d)
                                  </span>
                                ) : (
                                  <span className="inline-block text-[10px] text-slate-500 font-mono">
                                    Exp: {item.expiryDate}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 text-[11px]">-</span>
                        )}
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
                          {/* Print Barcode Label Button */}
                          <button
                            id={`print-barcode-${item.id}-btn`}
                            onClick={() => handleOpenPrintModal(item)}
                            className="p-1.5 px-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            title="Print Barcode Labels / Stickers"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {perms.update && (
                            <button
                              id={`edit-item-${item.id}-btn`}
                              onClick={() => openEditModal(item)}
                              className="p-1.5 px-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                              title="Edit Item"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {perms.delete && (
                            <button
                              id={`delete-item-${item.id}-btn`}
                              onClick={() => handleDelete(item.id, item.name)}
                              className="p-1.5 px-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
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
          </div>
        )}
      </div>

      {/* Item Modal Popup Form: Drawer sliding effect */}
      {isModalOpen && (
        <div id="item-modal-container" className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 flex items-center justify-end">
          <div id="item-modal-drawer" className="bg-white w-full max-w-xl h-screen flex flex-col shadow-2xl p-6 overflow-y-auto">
            
            {/* Modal header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center space-x-2">
                {isRestaurantMode ? (
                  <Utensils className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Boxes className="w-5 h-5 text-emerald-600" />
                )}
                <h3 className="font-bold text-slate-900 font-sans text-base">
                  {isRestaurantMode
                    ? (editingItem ? "Edit Menu Dish" : "Add New Menu Item")
                    : (editingItem ? "Edit Inventory Item" : "New Inventory Record")}
                </h3>
              </div>
              
              <div className="flex items-center space-x-2">
                {editingItem && (!isRestaurantMode || barcodeEntries.length > 0) && (
                  <button
                    type="button"
                    onClick={() => handleOpenPrintModal({ ...formData, id: editingItem.id } as Item)}
                    className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Labels</span>
                  </button>
                )}
                <button
                  id="close-item-modal-btn"
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-semibold select-none bg-slate-100 rounded-lg px-2.5 py-1 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5 flex-1 flex flex-col justify-between">
              {isRestaurantMode ? (
                <div className="space-y-4">
                  {/* Dish Name & Short Code */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Dish / Item Name *</label>
                      <input
                        id="modal-item-name"
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="e.g. Paneer Butter Masala / Masala Dosa"
                        className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Short Code</label>
                      <input
                        id="modal-item-shortcode"
                        type="text"
                        name="shortCode"
                        maxLength={10}
                        value={formData.shortCode || ""}
                        onChange={handleInputChange}
                        placeholder="e.g. PBM / 101"
                        className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none font-mono font-bold uppercase"
                      />
                    </div>
                  </div>

                  {/* Dietary Type Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Dietary Preference</label>
                    <div className="grid grid-cols-4 gap-2">
                      {([
                        { id: 'veg', label: 'Veg' },
                        { id: 'non_veg', label: 'Non-Veg' },
                        { id: 'egg', label: 'Egg' },
                        { id: 'beverage', label: 'Drink' }
                      ] as const).map(opt => {
                        const selected = (formData.dietaryType || 'veg') === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, dietaryType: opt.id }))}
                            className={`px-2.5 py-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                              selected
                                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <DietaryMark type={opt.id} />
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Course / Category & Kitchen Station */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Menu Course / Category</label>
                      <input
                        id="modal-item-category"
                        type="text"
                        name="category"
                        list="restaurant-categories-list"
                        value={formData.category || ""}
                        onChange={handleInputChange}
                        placeholder="e.g. Main Course / Starters"
                        className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none font-semibold"
                      />
                      <datalist id="restaurant-categories-list">
                        {RESTAURANT_CATEGORIES.map(c => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Kitchen / KOT Station</label>
                      <input
                        id="modal-item-station"
                        type="text"
                        name="kitchenStation"
                        list="kitchen-stations-list"
                        value={formData.kitchenStation || ""}
                        onChange={handleInputChange}
                        placeholder="e.g. Indian Kitchen / Tandoor"
                        className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none font-semibold"
                      />
                      <datalist id="kitchen-stations-list">
                        {KITCHEN_STATIONS.map(st => (
                          <option key={st} value={st} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  {/* Serving Unit & GST */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Serving Unit</label>
                      <select
                        id="modal-item-unit"
                        name="unit"
                        value={formData.unit}
                        onChange={handleInputChange}
                        className="w-full px-2.5 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs bg-white outline-none font-bold"
                      >
                        {Array.from(new Set([...RESTAURANT_UNITS, ...(formData.unit ? [formData.unit] : [])])).map(unit => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">GST Rate (%)</label>
                      <select
                        id="modal-item-gstrate"
                        name="gstRate"
                        value={formData.gstRate}
                        onChange={handleInputChange}
                        className="w-full px-2.5 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs bg-white outline-none font-bold"
                      >
                        {TAX_RATES.map(rate => (
                          <option key={rate} value={rate}>{rate}% GST</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Menu Pricing Card: Full & Optional Half Price */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                      Menu Portion Pricing
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-emerald-800 uppercase mb-1">Full / Regular Price (₹) *</label>
                        <input
                          id="modal-item-sale-price"
                          type="number"
                          name="salePrice"
                          min="0"
                          step="0.01"
                          required
                          value={formData.salePrice || ""}
                          onChange={handleInputChange}
                          placeholder="₹ 220"
                          className="w-full px-2.5 py-2 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-bold text-emerald-900 outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Half / Small Price (₹, optional)</label>
                        <input
                          id="modal-item-half-price"
                          type="number"
                          name="halfPrice"
                          min="0"
                          step="0.01"
                          value={formData.halfPrice || ""}
                          onChange={handleInputChange}
                          placeholder="₹ 140 (leave blank if N/A)"
                          className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Availability Toggle */}
                  <div className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Available on Menu Today</p>
                      <p className="text-[11px] text-slate-500">Uncheck to mark as Sold Out across POS billing tiles</p>
                    </div>
                    <button
                      id="modal-item-available-toggle"
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, isAvailable: prev.isAvailable === false ? true : false }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                        formData.isAvailable !== false
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      {formData.isAvailable !== false ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Available</span>
                        </>
                      ) : (
                        <>
                          <Ban className="w-3.5 h-3.5" />
                          <span>Sold Out</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Optional Collapsible Packaged Goods Stock & Barcode Section */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowPackagedStockSection(prev => !prev)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 transition cursor-pointer"
                    >
                      <span>Packaged Beverage / Track Stock, HSN & Barcodes (Optional)</span>
                      {showPackagedStockSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {showPackagedStockSection && (
                      <div className="p-3.5 space-y-3 bg-white border-t border-slate-200">
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                          <input
                            id="modal-item-track-stock"
                            type="checkbox"
                            checked={Boolean(formData.trackStock)}
                            onChange={(e) => setFormData(prev => ({ ...prev, trackStock: e.target.checked }))}
                            className="w-4 h-4 accent-emerald-600 rounded"
                          />
                          <span>Track stock count for this item (e.g., Water Bottles, Cold Drinks, Ice Cream)</span>
                        </label>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">HSN / SAC Code</label>
                            <input
                              id="modal-item-hsn"
                              type="text"
                              name="hsn"
                              maxLength={8}
                              value={formData.hsn}
                              onChange={handleInputChange}
                              placeholder="e.g. 2106 / 2201"
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Cost / Purchase Price (₹)</label>
                            <input
                              type="number"
                              name="purchasePrice"
                              min="0"
                              step="0.01"
                              value={formData.purchasePrice || ""}
                              onChange={handleInputChange}
                              placeholder="₹ 0"
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono outline-none"
                            />
                          </div>
                        </div>

                        {formData.trackStock && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Opening / Current Stock</label>
                              <input
                                id="modal-item-stock-qty"
                                type="number"
                                name="stockQuantity"
                                value={formData.stockQuantity}
                                onChange={handleInputChange}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Low Stock Alert Limit</label>
                              <input
                                id="modal-item-min-alert"
                                type="number"
                                name="minStockAlert"
                                min="0"
                                value={formData.minStockAlert}
                                onChange={handleInputChange}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono outline-none"
                              />
                            </div>
                          </div>
                        )}

                        {/* Compact Barcode linking for packaged bottles */}
                        <div className="pt-2 border-t border-slate-100 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                              <Barcode className="w-3.5 h-3.5 text-emerald-600" />
                              Barcodes ({barcodeEntries.length})
                            </span>
                            <button
                              type="button"
                              onClick={handleGenerateCustomBarcode}
                              className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                            >
                              + Auto-Generate
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newBarcodeInput}
                              onChange={(e) => setNewBarcodeInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddBarcode();
                                }
                              }}
                              placeholder="Scan or type barcode..."
                              className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddBarcode()}
                              className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer"
                            >
                              Add
                            </button>
                          </div>
                          {barcodeWarning && (
                            <p className="text-[11px] text-amber-700">{barcodeWarning}</p>
                          )}
                          {barcodeEntries.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {barcodeEntries.map((entry, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-[11px] font-mono text-slate-700">
                                  {entry.code}
                                  <button type="button" onClick={() => handleRemoveBarcode(idx)} className="text-slate-400 hover:text-rose-600 cursor-pointer">
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
              <div className="space-y-4">
                {/* Product Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 label-required">Product Name *</label>
                  <input
                    id="modal-item-name"
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Denim Stretch Jeans / Basmati Rice 25kg / LED Bulb 9W"
                    className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none font-bold"
                  />
                </div>

                {/* Brand & Category side-by-side */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Brand / Company</label>
                    <input
                      type="text"
                      name="brand"
                      value={formData.brand}
                      onChange={handleInputChange}
                      placeholder="e.g. Philips / Raymond / Nestle"
                      className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Category</label>
                    <input
                      type="text"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      placeholder="e.g. Electronics / Apparel / Grocery"
                      className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none"
                    />
                  </div>
                </div>

                {/* MULTIPLE BARCODES SECTION */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <Barcode className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        Product Barcodes ({barcodeEntries.length})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateCustomBarcode}
                      className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition active:scale-95 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Generate Custom Barcode</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Link multiple barcodes (e.g. Store Custom, Manufacturer EAN, Outer Box or Size/Variant). Any linked barcode can be scanned at POS checkout.
                  </p>

                  {/* Add / Scan New Barcode Input Group */}
                  <div className="flex items-center gap-2">
                    <select
                      value={newBarcodeType}
                      onChange={(e) => setNewBarcodeType(e.target.value as any)}
                      className="px-2.5 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 font-medium outline-none focus:border-emerald-500 shrink-0"
                    >
                      <option value="custom">Store Custom</option>
                      <option value="manufacturer">Manufacturer EAN</option>
                      <option value="pack">Outer Box / Pack</option>
                      <option value="variant">Size / Variant</option>
                    </select>

                    <input
                      type="text"
                      value={newBarcodeInput}
                      onChange={(e) => setNewBarcodeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddBarcode();
                        }
                      }}
                      placeholder="Scan with barcode gun or type barcode..."
                      className="flex-1 px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs font-mono outline-none bg-white"
                    />

                    <button
                      type="button"
                      onClick={() => handleAddBarcode()}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shrink-0 transition"
                    >
                      + Add
                    </button>
                  </div>

                  {/* Warning on Duplicate Barcode */}
                  {barcodeWarning && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{barcodeWarning}</span>
                    </div>
                  )}

                  {/* Linked Barcodes List */}
                  {barcodeEntries.length > 0 ? (
                    <div className="space-y-2 pt-1 max-h-48 overflow-y-auto">
                      {barcodeEntries.map((entry, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition"
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            {/* Barcode mini preview */}
                            <div className="bg-slate-50 border border-slate-100 rounded p-1 w-24 shrink-0 flex items-center justify-center">
                              <BarcodeSvg
                                value={entry.code}
                                width={85}
                                height={24}
                                fontSize={8}
                                showText={false}
                              />
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-slate-800 truncate">
                                  {entry.code}
                                </span>
                                {entry.isPrimary && (
                                  <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-1.5 py-0.2 rounded-full uppercase">
                                    Primary
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-slate-400 capitalize">
                                  {entry.type === "custom" && "🏷️ Store Custom"}
                                  {entry.type === "manufacturer" && "🏭 Manufacturer EAN"}
                                  {entry.type === "pack" && "📦 Outer Pack"}
                                  {entry.type === "variant" && "🎨 Size/Variant"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0">
                            {!entry.isPrimary && (
                              <button
                                type="button"
                                onClick={() => handleSetPrimaryBarcode(idx)}
                                className="px-2 py-1 text-[10px] font-bold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded border border-slate-200 transition"
                                title="Set as primary barcode"
                              >
                                Set Primary
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveBarcode(idx)}
                              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Remove Barcode"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl text-xs">
                      No barcodes linked yet. Click "Generate Custom Barcode" or scan with a barcode gun.
                    </div>
                  )}
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
                      placeholder="e.g. 6203 / 1006"
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
                    💰 Multi-Tier Pricing Structure
                  </span>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Purchase Price</label>
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
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Printed MRP</label>
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
                      <label className="block text-[10px] font-bold text-emerald-800 uppercase mb-1">Retail Sale Price *</label>
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
                      <label className="block text-[10px] font-bold text-blue-800 uppercase mb-1">Wholesale Rate</label>
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
                        placeholder="e.g. 5"
                        className="w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Box Packing Ratio Conversion */}
                <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-blue-900 uppercase mb-1">Units per Box / Carton</label>
                    <input
                      type="number"
                      name="boxPackingRatio"
                      min="0"
                      value={formData.boxPackingRatio || ""}
                      onChange={handleInputChange}
                      placeholder="e.g. 24"
                      className="w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-blue-900 uppercase mb-1">Packaging Unit Name</label>
                    <select
                      name="boxUnit"
                      value={formData.boxUnit}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-bold text-blue-900"
                    >
                      <option value="BOX">BOX</option>
                      <option value="BAG">BAG</option>
                      <option value="CARTON">CARTON</option>
                      <option value="CASE">CASE</option>
                    </select>
                  </div>
                </div>

                {/* Batch & Expiry Tracking Card */}
                <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      Batch & Expiry Date Tracking
                    </span>
                    <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">Pharma / FMCG / Retail</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-amber-900 uppercase mb-1">Batch Number</label>
                      <input
                        type="text"
                        name="batchNumber"
                        value={formData.batchNumber || ""}
                        onChange={handleInputChange}
                        placeholder="e.g. B-2026/09"
                        className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold text-amber-950 placeholder:font-normal"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-amber-900 uppercase mb-1">Mfg Date</label>
                      <input
                        type="date"
                        name="mfgDate"
                        value={formData.mfgDate || ""}
                        onChange={handleInputChange}
                        className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded-lg text-[11px] font-mono font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-rose-800 uppercase mb-1">Expiry Date</label>
                      <input
                        type="date"
                        name="expiryDate"
                        value={formData.expiryDate || ""}
                        onChange={handleInputChange}
                        className="w-full px-2 py-1.5 bg-white border border-rose-300 rounded-lg text-[11px] font-mono font-bold text-rose-900"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-amber-700/80 leading-tight">
                    * Batch and expiry dates will print on invoices and trigger automatic expiry alerts.
                  </p>
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
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Low Stock Alert Limit</label>
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
              )}

              {/* Submit Buttons */}
              <div className="pt-6 border-t border-slate-100">
                <button
                  id="save-item-modal-btn"
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs tracking-wider uppercase shadow transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>{isRestaurantMode ? "Save Menu Dish" : "Save Product Record"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Barcode Print Modal */}
      <BarcodePrintModal
        isOpen={isBarcodePrintModalOpen}
        onClose={() => {
          setIsBarcodePrintModalOpen(false);
          setSelectedItemForPrint(null);
        }}
        item={selectedItemForPrint}
        business={business}
      />

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
