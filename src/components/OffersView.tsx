/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import {
  Tag,
  Percent,
  Gift,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  CheckCircle2,
  XCircle,
  Sparkles,
  Search,
  Check
} from "lucide-react";
import { OfferScheme } from "../types.js";
import { useDialog } from "../context/DialogContext.js";

interface OffersViewProps {
  offers: OfferScheme[];
  onSaveOffer: (offer: OfferScheme) => Promise<void>;
  onDeleteOffer: (offerId: string) => Promise<void>;
  onToggleOffer: (offerId: string) => Promise<void>;
  permissions?: {
    create: boolean;
    update: boolean;
    delete: boolean;
  };
}

export default function OffersView({
  offers = [],
  onSaveOffer,
  onDeleteOffer,
  onToggleOffer,
  permissions
}: OffersViewProps) {
  const { showConfirm } = useDialog();
  const perms = permissions || { create: true, update: true, delete: true };

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<OfferScheme | null>(null);

  // Form State
  const [formData, setFormData] = useState<Omit<OfferScheme, "id">>({
    title: "",
    type: "percentage_discount",
    targetType: "all",
    targetValue: "",
    discountPercent: 10,
    discountAmount: 0,
    buyQuantity: 1,
    freeQuantity: 1,
    freeItemName: "",
    minBillAmount: 0,
    minItemQty: 0,
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    isActive: true,
    notes: ""
  });

  // KPI Calculations
  const stats = useMemo(() => {
    const total = offers.length;
    const active = offers.filter((o) => o.isActive).length;
    const buyXGetY = offers.filter((o) => o.type === "buy_x_get_y" && o.isActive).length;
    const discounts = offers.filter((o) => o.type !== "buy_x_get_y" && o.isActive).length;
    return { total, active, buyXGetY, discounts };
  }, [offers]);

  // Filtered offers list
  const filteredOffers = useMemo(() => {
    return offers.filter((offer) => {
      // Search
      const matchesSearch =
        offer.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (offer.targetValue && offer.targetValue.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (offer.notes && offer.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      // Type filter
      const matchesType = filterType === "all" || offer.type === filterType;

      // Status filter
      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && offer.isActive) ||
        (filterStatus === "inactive" && !offer.isActive);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [offers, searchQuery, filterType, filterStatus]);

  // Open modal for new offer
  const openAddModal = () => {
    setEditingOffer(null);
    setFormData({
      title: "",
      type: "percentage_discount",
      targetType: "all",
      targetValue: "",
      discountPercent: 10,
      discountAmount: 0,
      buyQuantity: 5,
      freeQuantity: 1,
      freeItemName: "",
      minBillAmount: 1000,
      minItemQty: 1,
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      isActive: true,
      notes: ""
    });
    setIsModalOpen(true);
  };

  // Open modal for editing
  const openEditModal = (offer: OfferScheme) => {
    setEditingOffer(offer);
    setFormData({
      title: offer.title,
      type: offer.type,
      targetType: offer.targetType,
      targetValue: offer.targetValue || "",
      discountPercent: offer.discountPercent || 0,
      discountAmount: offer.discountAmount || 0,
      buyQuantity: offer.buyQuantity || 1,
      freeQuantity: offer.freeQuantity || 1,
      freeItemName: offer.freeItemName || "",
      minBillAmount: offer.minBillAmount || 0,
      minItemQty: offer.minItemQty || 0,
      startDate: offer.startDate || "",
      endDate: offer.endDate || "",
      isActive: offer.isActive,
      notes: offer.notes || ""
    });
    setIsModalOpen(true);
  };

  // Quick preset templates
  const applyPreset = (presetKey: 'krishi_free' | 'brand_pct' | 'bill_slab' | 'bulk_flat') => {
    if (presetKey === 'krishi_free') {
      setFormData(prev => ({
        ...prev,
        title: "Buy 5 Bags Get 1 Pack Free (Special Crop Scheme)",
        type: "buy_x_get_y",
        targetType: "brand",
        targetValue: "Fertilizers & Nutrients",
        buyQuantity: 5,
        freeQuantity: 1,
        freeItemName: "Micronutrient Supplement Pack",
        notes: "Season special promotional offer"
      }));
    } else if (presetKey === 'brand_pct') {
      setFormData(prev => ({
        ...prev,
        title: "10% Direct Discount on Premium Brands",
        type: "percentage_discount",
        targetType: "category",
        targetValue: "Pesticides",
        discountPercent: 10,
        notes: "10% off on all selected category products"
      }));
    } else if (presetKey === 'bill_slab') {
      setFormData(prev => ({
        ...prev,
        title: "₹250 Flat Discount on Bills Above ₹5,000",
        type: "bill_slab_discount",
        targetType: "all",
        minBillAmount: 5000,
        discountAmount: 250,
        notes: "Cashback slab discount for high-value purchases"
      }));
    } else if (presetKey === 'bulk_flat') {
      setFormData(prev => ({
        ...prev,
        title: "₹50 Flat Off Per Unit on 10+ Units Wholesale",
        type: "flat_discount",
        targetType: "all",
        minItemQty: 10,
        discountAmount: 50,
        notes: "Special tiered pricing for bulk buyers"
      }));
    }
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const payload: OfferScheme = {
      id: editingOffer ? editingOffer.id : "offer_" + Date.now(),
      ...formData,
      title: formData.title.trim(),
      targetValue: formData.targetValue?.trim()
    };

    await onSaveOffer(payload);
    setIsModalOpen(false);
  };

  // Delete handler with confirmation
  const handleDelete = async (offer: OfferScheme) => {
    const confirmed = await showConfirm({
      title: "Delete Scheme",
      message: `Are you sure you want to delete '${offer.title}'?`,
      confirmText: "Delete",
      variant: "warning"
    });
    if (confirmed) {
      await onDeleteOffer(offer.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 p-6 rounded-2xl text-white shadow-lg shadow-amber-900/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-6 h-6 text-amber-200" />
            <h1 className="text-2xl font-black tracking-tight">Promotional Offers & Dynamic Schemes</h1>
          </div>
          <p className="text-amber-100 text-sm font-medium">
            Configure Buy X Get Y, brand discounts, tiered flat cuts, and bill value slab discounts.
          </p>
        </div>

        {perms.create && (
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white hover:bg-amber-50 text-amber-900 font-bold text-sm rounded-xl shadow-md transition-transform active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Scheme</span>
          </button>
        )}
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Schemes</span>
            <Tag className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">All configured discount rules</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Active</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-800 mt-1">{stats.active}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Applied in active billing</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/30 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Buy X Get Y</span>
            <Gift className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-800 mt-1">{stats.buyXGetY}</div>
          <div className="text-[11px] text-blue-600 font-medium mt-0.5">Complimentary product schemes</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/30 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Discounts & Slabs</span>
            <Percent className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-800 mt-1">{stats.discounts}</div>
          <div className="text-[11px] text-amber-600 font-medium mt-0.5">% and cash discounts</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search scheme name, brand, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">All Types</option>
            <option value="buy_x_get_y">Buy X Get Y Free</option>
            <option value="percentage_discount">% Discount</option>
            <option value="flat_discount">Flat ₹ Discount</option>
            <option value="bill_slab_discount">Bill Value Slab</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Offers Cards Grid */}
      {filteredOffers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-100">
            <Tag className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No offers found</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto mt-1 mb-6">
            Create attractive promotional schemes, seasonal deals, and volume discounts to boost sales.
          </p>
          {perms.create && (
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Scheme</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOffers.map((offer) => {
            const isBuyGet = offer.type === "buy_x_get_y";
            const isSlab = offer.type === "bill_slab_discount";
            const isPct = offer.type === "percentage_discount";

            return (
              <div
                key={offer.id}
                className={`bg-white rounded-2xl border transition-all duration-200 hover:shadow-md flex flex-col justify-between overflow-hidden ${
                  offer.isActive
                    ? "border-amber-200/80 shadow-sm"
                    : "border-slate-200 bg-slate-50/40 opacity-75"
                }`}
              >
                {/* Header Banner */}
                <div className={`p-4 border-b ${
                  offer.isActive
                    ? isBuyGet
                      ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100"
                      : isSlab
                        ? "bg-gradient-to-r from-purple-50 to-pink-50 border-purple-100"
                        : "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-100"
                    : "bg-slate-100 border-slate-200"
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`p-1.5 rounded-lg text-xs font-black flex items-center gap-1 ${
                        isBuyGet
                          ? "bg-blue-600 text-white"
                          : isSlab
                            ? "bg-purple-600 text-white"
                            : "bg-amber-600 text-white"
                      }`}>
                        {isBuyGet ? <Gift className="w-3.5 h-3.5" /> : <Percent className="w-3.5 h-3.5" />}
                        {isBuyGet
                          ? "Buy X Get Y"
                          : isSlab
                            ? "Bill Slab"
                            : isPct
                              ? `${offer.discountPercent}% OFF`
                              : `₹${offer.discountAmount} OFF`}
                      </span>
                      {offer.targetType !== "all" && (
                        <span className="px-2 py-0.5 rounded-md bg-white/80 text-slate-700 text-[10px] font-bold border border-slate-200">
                          {offer.targetType === "brand" ? "Brand: " : offer.targetType === "category" ? "Category: " : "Item: "}
                          {offer.targetValue}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleOffer(offer.id)}
                      className={`text-[11px] font-black px-2.5 py-1 rounded-full transition-colors flex items-center gap-1 ${
                        offer.isActive
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200"
                          : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                      }`}
                      title="Toggle Active / Inactive"
                    >
                      {offer.isActive ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-slate-500" />}
                      {offer.isActive ? "Active" : "Inactive"}
                    </button>
                  </div>

                  <h4 className="text-base font-black text-slate-900 mt-2 line-clamp-1">
                    {offer.title}
                  </h4>
                </div>

                {/* Body Details */}
                <div className="p-4 space-y-3 flex-1">
                  {isBuyGet && (
                    <div className="bg-blue-50/50 p-2.5 rounded-xl border border-blue-100 text-xs text-blue-900 font-medium space-y-1">
                      <div>
                        Buy Quantity: <strong>{offer.buyQuantity} Units</strong>
                      </div>
                      <div>
                        Free Quantity: <strong>{offer.freeQuantity} Units {offer.freeItemName ? `(${offer.freeItemName})` : "(Same Item)"}</strong>
                      </div>
                    </div>
                  )}

                  {isSlab && (
                    <div className="bg-purple-50/50 p-2.5 rounded-xl border border-purple-100 text-xs text-purple-900 font-medium space-y-1">
                      <div>Minimum Bill Amount: <strong>₹{offer.minBillAmount?.toLocaleString("en-IN")}</strong></div>
                      <div>Direct Discount: <strong>₹{offer.discountAmount}</strong></div>
                    </div>
                  )}

                  {!isBuyGet && !isSlab && (
                    <div className="bg-amber-50/50 p-2.5 rounded-xl border border-amber-100 text-xs text-amber-900 font-medium space-y-1">
                      {isPct ? (
                        <div>Discount: <strong>{offer.discountPercent}% Off</strong></div>
                      ) : (
                        <div>Discount: <strong>₹{offer.discountAmount} Flat Off per Unit</strong></div>
                      )}
                      {offer.minItemQty ? <div>Minimum Quantity: <strong>{offer.minItemQty} Units</strong></div> : null}
                    </div>
                  )}

                  {offer.notes && (
                    <p className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                      "{offer.notes}"
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      Starts: {offer.startDate || "From Today"}
                    </span>
                    {offer.endDate && (
                      <span className="font-medium text-amber-700">
                        Expires: {offer.endDate}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-400 font-mono">
                    ID: {offer.id.slice(-6)}
                  </div>
                  <div className="flex items-center gap-1">
                    {perms.update && (
                      <button
                        type="button"
                        onClick={() => openEditModal(offer)}
                        className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Edit Scheme"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {perms.delete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(offer)}
                        className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Scheme"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Offer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-5 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-200" />
                  {editingOffer ? "Edit Scheme / Offer" : "Create Dynamic Scheme"}
                </h3>
                <p className="text-xs text-amber-100 mt-0.5">
                  Set customized discount and promotional rules across your business catalog.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Quick Templates Bar */}
            {!editingOffer && (
              <div className="p-4 bg-amber-50/70 border-b border-amber-100">
                <span className="text-[11px] font-black text-amber-900 uppercase tracking-wider block mb-2">
                  ⚡ Quick Presets:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset('krishi_free')}
                    className="p-2 bg-white hover:bg-amber-100/60 text-amber-900 text-xs font-bold rounded-lg border border-amber-200 text-left transition-colors"
                  >
                    🌾 Buy 5 Get 1 Free
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('brand_pct')}
                    className="p-2 bg-white hover:bg-amber-100/60 text-amber-900 text-xs font-bold rounded-lg border border-amber-200 text-left transition-colors"
                  >
                    🏷️ Brand 10% Off
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('bill_slab')}
                    className="p-2 bg-white hover:bg-amber-100/60 text-amber-900 text-xs font-bold rounded-lg border border-amber-200 text-left transition-colors"
                  >
                    💰 ₹250 Off on ₹5000
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('bulk_flat')}
                    className="p-2 bg-white hover:bg-amber-100/60 text-amber-900 text-xs font-bold rounded-lg border border-amber-200 text-left transition-colors"
                  >
                    📦 Wholesale Flat ₹50
                  </button>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Title */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Offer Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Seasonal Special - Buy 5 Bags Get 1 Free"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Scheme Type & Target */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                    Scheme Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="percentage_discount">Percentage Discount (% Discount)</option>
                    <option value="buy_x_get_y">Buy X Get Y Free</option>
                    <option value="flat_discount">Flat Discount (Flat ₹ per unit)</option>
                    <option value="bill_slab_discount">Bill Value Slab Discount</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                    Apply To (Target)
                  </label>
                  <select
                    value={formData.targetType}
                    onChange={(e) => setFormData({ ...formData, targetType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="all">All Products</option>
                    <option value="brand">Specific Brand</option>
                    <option value="category">Specific Category</option>
                    <option value="item">Specific Item</option>
                  </select>
                </div>
              </div>

              {/* Target Value if not all */}
              {formData.targetType !== "all" && (
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                    {formData.targetType === "brand" ? "Brand Name" : formData.targetType === "category" ? "Category Name" : "Item Name"} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={formData.targetType === "brand" ? "e.g. Mahadhan / Bayer / Raymond" : formData.targetType === "category" ? "e.g. Pesticides / Fertilizers / Clothing" : "e.g. Fortune Oil 1L"}
                    value={formData.targetValue}
                    onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              {/* Buy X Get Y Configuration */}
              {formData.type === "buy_x_get_y" && (
                <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-blue-900 uppercase mb-1">
                      Buy Quantity *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.buyQuantity || ""}
                      onChange={(e) => setFormData({ ...formData, buyQuantity: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-blue-900 uppercase mb-1">
                      Free Quantity *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.freeQuantity || ""}
                      onChange={(e) => setFormData({ ...formData, freeQuantity: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-blue-900 uppercase mb-1">
                      Free Item Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Tonic Pack (leave empty for same item)"
                      value={formData.freeItemName}
                      onChange={(e) => setFormData({ ...formData, freeItemName: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Percentage & Flat Discount Configuration */}
              {formData.type === "percentage_discount" && (
                <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 uppercase mb-1">
                      Discount Percentage (%) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        required
                        value={formData.discountPercent || ""}
                        onChange={(e) => setFormData({ ...formData, discountPercent: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-sm font-bold text-amber-900 pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-amber-700">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 uppercase mb-1">
                      Minimum Quantity (Optional)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 5 Units"
                      value={formData.minItemQty || ""}
                      onChange={(e) => setFormData({ ...formData, minItemQty: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Bill Slab Discount Configuration */}
              {formData.type === "bill_slab_discount" && (
                <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-purple-900 uppercase mb-1">
                      Minimum Bill Amount (₹) *
                    </label>
                    <input
                      type="number"
                      min="100"
                      required
                      placeholder="e.g. 5000"
                      value={formData.minBillAmount || ""}
                      onChange={(e) => setFormData({ ...formData, minBillAmount: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-purple-900 uppercase mb-1">
                      Direct Discount Amount (₹) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="e.g. 250"
                      value={formData.discountAmount || ""}
                      onChange={(e) => setFormData({ ...formData, discountAmount: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-sm font-bold text-purple-900"
                    />
                  </div>
                </div>
              )}

              {/* Flat Discount Configuration */}
              {formData.type === "flat_discount" && (
                <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-900 uppercase mb-1">
                      Flat Discount per Unit (₹) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.discountAmount || ""}
                      onChange={(e) => setFormData({ ...formData, discountAmount: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-sm font-bold text-emerald-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-900 uppercase mb-1">
                      Minimum Quantity (Units)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.minItemQty || ""}
                      onChange={(e) => setFormData({ ...formData, minItemQty: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Validity Date Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Terms & Description Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Promotional offer applicable for limited stock only"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-md transition-transform active:scale-95 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingOffer ? "Save Changes" : "Activate Scheme"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
