/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { OfferScheme, Item } from "../types.js";
import { useDialog } from "../context/DialogContext.js";
import {
  Tag,
  Plus,
  Search,
  Sparkles,
  Calendar,
  Gift,
  Percent,
  IndianRupee,
  Layers,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit2,
  Clock,
  Filter,
  ShoppingBag,
  Zap
} from "lucide-react";

interface OffersViewProps {
  offers: OfferScheme[];
  items: Item[];
  onSaveOffer: (offer: OfferScheme) => Promise<void>;
  onToggleOffer: (id: string) => Promise<void>;
  onDeleteOffer: (id: string) => Promise<void>;
  permissions?: any;
}

export default function OffersView({
  offers = [],
  items = [],
  onSaveOffer,
  onToggleOffer,
  onDeleteOffer,
  permissions
}: OffersViewProps) {
  const perms = permissions || { view: true, create: true, update: true, delete: true };
  const { showConfirm } = useDialog();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<OfferScheme | null>(null);

  // Form state
  const [formData, setFormData] = useState<Omit<OfferScheme, "id">>({
    title: "",
    type: "percentage_discount",
    targetType: "all",
    targetValue: "",
    buyQuantity: 0,
    freeQuantity: 0,
    freeItemName: "",
    discountPercent: 0,
    discountAmount: 0,
    minBillAmount: 0,
    minItemQty: 0,
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    isActive: true,
    notes: ""
  });

  // Filtered offers
  const filteredOffers = useMemo(() => {
    return offers.filter(o => {
      const matchesSearch =
        o.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.targetValue && o.targetValue.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.notes && o.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = filterType === "all" || o.type === filterType;
      const matchesStatus = filterStatus === "all" || (filterStatus === "active" ? o.isActive : !o.isActive);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [offers, searchQuery, filterType, filterStatus]);

  // Statistics
  const stats = useMemo(() => {
    const total = offers.length;
    const active = offers.filter(o => o.isActive).length;
    const buyXGetY = offers.filter(o => o.type === "buy_x_get_y" && o.isActive).length;
    const discounts = offers.filter(o => o.type !== "buy_x_get_y" && o.isActive).length;
    return { total, active, buyXGetY, discounts };
  }, [offers]);

  // Open add modal
  const openAddModal = () => {
    setEditingOffer(null);
    setFormData({
      title: "",
      type: "percentage_discount",
      targetType: "all",
      targetValue: "",
      buyQuantity: 0,
      freeQuantity: 0,
      freeItemName: "",
      discountPercent: 10,
      discountAmount: 0,
      minBillAmount: 0,
      minItemQty: 0,
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      isActive: true,
      notes: ""
    });
    setIsModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (offer: OfferScheme) => {
    setEditingOffer(offer);
    setFormData({
      title: offer.title,
      type: offer.type,
      targetType: offer.targetType,
      targetValue: offer.targetValue || "",
      buyQuantity: offer.buyQuantity || 0,
      freeQuantity: offer.freeQuantity || 0,
      freeItemName: offer.freeItemName || "",
      discountPercent: offer.discountPercent || 0,
      discountAmount: offer.discountAmount || 0,
      minBillAmount: offer.minBillAmount || 0,
      minItemQty: offer.minItemQty || 0,
      startDate: offer.startDate || new Date().toISOString().split("T")[0],
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
        title: "महाधन ५ पोत्यांवर १ पाकीट मोफत (Buy 5 Get 1 Free)",
        type: "buy_x_get_y",
        targetType: "brand",
        targetValue: "महाधन (Mahadhan)",
        buyQuantity: 5,
        freeQuantity: 1,
        freeItemName: "मायक्रोन्युट्रिएंट पाकीट (Micronutrient Pack)",
        notes: "खरीप हंगामासाठी विशेष खत स्कीम"
      }));
    } else if (presetKey === 'brand_pct') {
      setFormData(prev => ({
        ...prev,
        title: "बायेर / सिजेंटा कीटकनाशकांवर १०% थेट सवलत",
        type: "percentage_discount",
        targetType: "category",
        targetValue: "Pesticides",
        discountPercent: 10,
        notes: "सर्व कीटकनाशक उत्पादनांवर १०% सूट"
      }));
    } else if (presetKey === 'bill_slab') {
      setFormData(prev => ({
        ...prev,
        title: "₹५,००० पेक्षा जास्त बिलावर ₹२५० थेट सूट",
        type: "bill_slab_discount",
        targetType: "all",
        minBillAmount: 5000,
        discountAmount: 250,
        notes: "मोठ्या खरेदीसाठी ग्राहक कॅशबॅक सवलत"
      }));
    } else if (presetKey === 'bulk_flat') {
      setFormData(prev => ({
        ...prev,
        title: "१०+ नग घाऊक खरेदीवर प्रति नग ₹५० फ्लॅट सवलत",
        type: "flat_discount",
        targetType: "all",
        minItemQty: 10,
        discountAmount: 50,
        notes: "होलसेल बल्क खरेदीदारांसाठी विशेष स्कीम"
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
      targetValue: formData.targetValue ? formData.targetValue.trim() : undefined,
      freeItemName: formData.freeItemName ? formData.freeItemName.trim() : undefined,
      notes: formData.notes ? formData.notes.trim() : undefined
    };

    await onSaveOffer(payload);
    setIsModalOpen(false);
  };

  // Delete handler with confirmation
  const handleDelete = async (offer: OfferScheme) => {
    const confirmed = await showConfirm({
      title: "Delete Scheme",
      message: `तुम्हाला '${offer.title}' ही स्कीम/ऑफर डिलीट करायची आहे का?`,
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
            <h1 className="text-2xl font-black tracking-tight">डायनॅमिक ऑफर्स व स्कीम्स (Offers & Dynamic Schemes)</h1>
          </div>
          <p className="text-amber-100 text-sm font-medium">
            कृषी सेवा केंद्र, किराणा, कपडे व सर्व उद्योगांसाठी Buy X Get Y, ब्रँड डिस्काउंट व बिल स्लॅब सवलती तयार करा.
          </p>
        </div>

        {perms.create && (
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white hover:bg-amber-50 text-amber-900 font-bold text-sm rounded-xl shadow-md transition-transform active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>नवीन स्कीम जोडा (+ New Scheme)</span>
          </button>
        )}
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">एकूण स्कीम्स</span>
            <Tag className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">तयार केलेल्या सर्व स्कीम्स</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">सक्रिय (Active)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-800 mt-1">{stats.active}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">बिलिंगमध्ये थेट लागू</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/30 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Buy X Get Y</span>
            <Gift className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-800 mt-1">{stats.buyXGetY}</div>
          <div className="text-[11px] text-blue-600 font-medium mt-0.5">मोफत वस्तू देणाऱ्या स्कीम्स</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/30 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">डिस्काउंट व स्लॅब</span>
            <Percent className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-800 mt-1">{stats.discounts}</div>
          <div className="text-[11px] text-amber-600 font-medium mt-0.5">% व ₹ रोख सवलती</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="स्कीमचे नाव, ब्रँड किंवा कॅटेगरी शोधा..."
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
            <option value="all">सर्व प्रकार (All Types)</option>
            <option value="buy_x_get_y">Buy X Get Y Free (मोफत नग)</option>
            <option value="percentage_discount">टक्केवारी सूट (% Discount)</option>
            <option value="flat_discount">फ्लॅट रक्कम सूट (Flat ₹)</option>
            <option value="bill_slab_discount">बिल स्लॅब सवलत (Bill Value Slab)</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">सर्व स्टेटस (All)</option>
            <option value="active">फक्त सक्रिय (Active)</option>
            <option value="inactive">बंद असलेल्या (Inactive)</option>
          </select>
        </div>
      </div>

      {/* Offers Cards Grid */}
      {filteredOffers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-100">
            <Tag className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">कोणतीही ऑफर सापडली नाही</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto mt-1 mb-6">
            आपण आपल्या दुकानासाठी किंवा कृषी केंद्रासाठी नवीन हंगामी ऑफर्स व डिस्काउंट स्कीम्स तयार करू शकता.
          </p>
          {perms.create && (
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>पहिली स्कीम तयार करा</span>
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
                          {offer.targetType === "brand" ? "ब्रँड: " : offer.targetType === "category" ? "कॅटेगरी: " : "आयटम: "}
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
                      title="सक्रिय / बंद करा"
                    >
                      {offer.isActive ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-slate-500" />}
                      {offer.isActive ? "सक्रिय (Active)" : "बंद (Inactive)"}
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
                        खरेदी: <strong>{offer.buyQuantity} नग</strong>
                      </div>
                      <div>
                        मोफत: <strong>{offer.freeQuantity} नग {offer.freeItemName ? `(${offer.freeItemName})` : "(तोच आयटम)"}</strong>
                      </div>
                    </div>
                  )}

                  {isSlab && (
                    <div className="bg-purple-50/50 p-2.5 rounded-xl border border-purple-100 text-xs text-purple-900 font-medium space-y-1">
                      <div>किमान बिल रक्कम: <strong>₹{offer.minBillAmount?.toLocaleString("en-IN")}</strong></div>
                      <div>थेट सवलत: <strong>₹{offer.discountAmount}</strong></div>
                    </div>
                  )}

                  {!isBuyGet && !isSlab && (
                    <div className="bg-amber-50/50 p-2.5 rounded-xl border border-amber-100 text-xs text-amber-900 font-medium space-y-1">
                      {isPct ? (
                        <div>सवलत: <strong>{offer.discountPercent}% डिस्काउंट</strong></div>
                      ) : (
                        <div>सवलत: <strong>₹{offer.discountAmount} प्रति नग सूट</strong></div>
                      )}
                      {offer.minItemQty ? <div>किमान नग मर्यादा: <strong>{offer.minItemQty} नग</strong></div> : null}
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
                      सुरुवात: {offer.startDate || "आजपासून"}
                    </span>
                    {offer.endDate && (
                      <span className="font-medium text-amber-700">
                        अंतिम: {offer.endDate}
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
                        title="एडिट करा"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {perms.delete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(offer)}
                        className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="डिलीट करा"
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
                  {editingOffer ? "स्कीम/ऑफर एडिट करा" : "नवीन डायनॅमिक स्कीम तयार करा"}
                </h3>
                <p className="text-xs text-amber-100 mt-0.5">
                  किराणा, कृषी केंद्र व सर्व उत्पादनांसाठी कस्टमाइज्ड डिस्काउंट नियम सेट करा.
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
                  ⚡ रेडीमेड टेम्पलेट्स (Quick Presets):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset('krishi_free')}
                    className="p-2 bg-white hover:bg-amber-100/60 text-amber-900 text-xs font-bold rounded-lg border border-amber-200 text-left transition-colors"
                  >
                    🌾 5 बॅगवर 1 मोफत
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('brand_pct')}
                    className="p-2 bg-white hover:bg-amber-100/60 text-amber-900 text-xs font-bold rounded-lg border border-amber-200 text-left transition-colors"
                  >
                    🏷️ ब्रँड १०% सूट
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('bill_slab')}
                    className="p-2 bg-white hover:bg-amber-100/60 text-amber-900 text-xs font-bold rounded-lg border border-amber-200 text-left transition-colors"
                  >
                    💰 ₹५००० वर ₹२५०
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('bulk_flat')}
                    className="p-2 bg-white hover:bg-amber-100/60 text-amber-900 text-xs font-bold rounded-lg border border-amber-200 text-left transition-colors"
                  >
                    📦 घाऊक ₹५० सवलत
                  </button>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Title */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  ऑफर / स्कीमचे नाव (Offer Title) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="उदा. महाधन खरीप विशेष - ५ पोत्यांवर १ मोफत"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Scheme Type & Target */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                    ऑफरचा प्रकार (Scheme Type)
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="percentage_discount">टक्केवारी सूट (% Discount)</option>
                    <option value="buy_x_get_y">Buy X Get Y Free (नग खरेदीवर मोफत)</option>
                    <option value="flat_discount">फ्लॅट रोख सूट (Flat ₹ per unit)</option>
                    <option value="bill_slab_discount">एकूण बिलावर स्लॅब सूट (Bill Value Slab)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                    कशावर लागू करायची? (Target)
                  </label>
                  <select
                    value={formData.targetType}
                    onChange={(e) => setFormData({ ...formData, targetType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="all">सर्व वस्तूंवर (All Products)</option>
                    <option value="brand">विशिष्ट ब्रँडवर (Specific Brand)</option>
                    <option value="category">विशिष्ट कॅटेगरीवर (Specific Category)</option>
                    <option value="item">विशिष्ट वस्तूवर (Specific Item)</option>
                  </select>
                </div>
              </div>

              {/* Target Value if not all */}
              {formData.targetType !== "all" && (
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                    {formData.targetType === "brand" ? "ब्रँडचे नाव (Brand Name)" : formData.targetType === "category" ? "कॅटेगरीचे नाव (Category Name)" : "वस्तूचे नाव (Item Name)"} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={formData.targetType === "brand" ? "उदा. महाधन / बायर / रेमंड" : formData.targetType === "category" ? "उदा. कीटकनाशके / खते / कापड" : "उदा. फॉर्च्युन तेल"}
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
                      खरेदी नग (Buy Qty) *
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
                      मोफत नग (Free Qty) *
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
                      मोफत वस्तूचे नाव (Free Item)
                    </label>
                    <input
                      type="text"
                      placeholder="उदा. टॉनिक पाकीट (रिकामे ठेवल्यास तोच आयटम)"
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
                      टक्केवारी सूट (% Discount) *
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
                      किमान खरेदी नग (Min Qty)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="उदा. 5 नग (ऐच्छिक)"
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
                      किमान बिल रक्कम (Min Bill ₹) *
                    </label>
                    <input
                      type="number"
                      min="100"
                      required
                      placeholder="उदा. 5000"
                      value={formData.minBillAmount || ""}
                      onChange={(e) => setFormData({ ...formData, minBillAmount: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-purple-900 uppercase mb-1">
                      थेट सवलत रक्कम (Discount ₹) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="उदा. 250"
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
                      प्रति नग सवलत (Flat ₹ Off per Unit) *
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
                      किमान नग (Min Qty)
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
                    सुरुवात दिनांक (Start Date)
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
                    अंतिम दिनांक (End Date - ऐच्छिक)
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
                  नोंद / वर्णन (Terms & Notes)
                </label>
                <textarea
                  rows={2}
                  placeholder="उदा. खरीप हंगाम विशेष सवलत, मर्यादित साठ्यापर्यंत लागू"
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
                  रद्द करा (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-md transition-transform active:scale-95 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingOffer ? "बदल सेव्ह करा" : "स्कीम सक्रिय करा (Save Scheme)"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
