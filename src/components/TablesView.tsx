/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Restaurant Table Management & KOT View
 */

import React, { useState } from "react";
import { UtensilsCrossed, Plus, Users, CheckCircle, Clock, Trash2, Edit, Receipt } from "lucide-react";
import { RestaurantTable, BusinessProfile, Item, Invoice } from "../types.js";

interface TablesViewProps {
  tables: RestaurantTable[];
  items: Item[];
  business: BusinessProfile;
  onSaveTable: (table: RestaurantTable) => Promise<void>;
  onDeleteTable: (tableId: string) => Promise<void>;
  onOpenTablePOS: (table: RestaurantTable) => void;
}

export default function TablesView({
  tables,
  items,
  business,
  onSaveTable,
  onDeleteTable,
  onOpenTablePOS
}: TablesViewProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [tableNumber, setTableNumber] = useState("");
  const [section, setSection] = useState("Main Dining");
  const [capacity, setCapacity] = useState(4);
  const [status, setStatus] = useState<'available' | 'occupied' | 'reserved'>("available");

  const handleOpenAdd = () => {
    setEditingTable(null);
    setTableNumber(`Table ${tables.length + 1}`);
    setSection("Main Dining");
    setCapacity(4);
    setStatus("available");
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (t: RestaurantTable) => {
    setEditingTable(t);
    setTableNumber(t.tableNumber);
    setSection(t.section || "Main Dining");
    setCapacity(t.capacity || 4);
    setStatus(t.status || "available");
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber.trim()) return;

    const newTable: RestaurantTable = {
      id: editingTable ? editingTable.id : `tbl_${Date.now()}`,
      tableNumber: tableNumber.trim(),
      section: section.trim(),
      capacity: Number(capacity) || 4,
      status: status,
      currentOrderId: editingTable?.currentOrderId,
      currentOrderTotal: editingTable?.currentOrderTotal || 0,
      runningItemsSummary: editingTable?.runningItemsSummary || ""
    };

    await onSaveTable(newTable);
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-emerald-600" />
            <span>हॉटेल टेबल मॅनेजमेंट (Restaurant Table Management)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            डाइन-इन टेबल्स तयार करा, त्यांची स्थिती (Available / Occupied) तपासा आणि KOT ऑर्डर्स व्यवस्थापित करा.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-5 rounded-xl text-xs flex items-center gap-2 shadow-md transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>नवीन टेबल जोडा (Add Table)</span>
        </button>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {tables.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-dashed border-slate-300">
            <UtensilsCrossed className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">कोणतीही टेबल्स जोडलेली नाहीत</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">हॉटेलच्या डाइन-इन ऑर्डर्ससाठी पहिले टेबल जोडा.</p>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="bg-emerald-600 text-white font-semibold py-2 px-4 rounded-lg text-xs"
            >
              टेबल तयार करा
            </button>
          </div>
        ) : (
          tables.map((t) => {
            const isOccupied = t.status === 'occupied';
            const isReserved = t.status === 'reserved';
            return (
              <div
                key={t.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between transition shadow-sm bg-white ${
                  isOccupied
                    ? "border-rose-300 ring-2 ring-rose-500/20"
                    : isReserved
                    ? "border-amber-300 ring-2 ring-amber-500/20"
                    : "border-slate-200 hover:border-emerald-400"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="font-bold text-base text-slate-900">{t.tableNumber}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isOccupied
                          ? "bg-rose-100 text-rose-800"
                          : isReserved
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>

                  <div className="py-3 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <span>विभाग:</span>
                      <span className="font-semibold text-slate-800">{t.section || "Main Dining"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Users className="w-3.5 h-3.5" />
                      <span>क्षमता:</span>
                      <span className="font-semibold text-slate-800">{t.capacity || 4} Persons</span>
                    </div>
                    {isOccupied && (
                      <div className="pt-2 border-t border-dashed border-slate-200">
                        <span className="text-[10px] text-slate-400 uppercase block font-semibold">चालू बिल / ऑर्डर:</span>
                        <span className="font-bold font-mono text-emerald-700 text-sm">₹{(t.currentOrderTotal || 0).toFixed(2)}</span>
                        {t.runningItemsSummary && (
                          <p className="text-[11px] text-slate-600 truncate mt-0.5">{t.runningItemsSummary}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenTablePOS(t)}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer ${
                      isOccupied
                        ? "bg-rose-600 hover:bg-rose-700 text-white"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>{isOccupied ? "ऑर्डर पहा / बिल" : "ऑर्डर घ्या (Take Order)"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(t)}
                    className="p-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl transition"
                    title="एडिट"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteTable(t.id)}
                    className="p-2 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl transition"
                    title="डिलिट"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Table Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-slate-900">
              {editingTable ? "टेबल माहिती बदला (Edit Table)" : "नवीन टेबल तयार करा (Create Table)"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">टेबल नाव / नंबर (Table Name/No)</label>
                <input
                  type="text"
                  required
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="उदा. Table 1 किंवा AC-3"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">सेक्शन / हॉल (Section)</label>
                <input
                  type="text"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  placeholder="उदा. Main Dining, AC Hall, Family Room"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">क्षमता (Capacity / Persons)</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={capacity}
                  onChange={(e) => setCapacity(parseInt(e.target.value) || 4)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">स्थिती (Status)</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-emerald-500 bg-white"
                >
                  <option value="available">Available (रिकामे)</option>
                  <option value="occupied">Occupied (व्यस्त / चालू)</option>
                  <option value="reserved">Reserved (राखून ठेवलेले)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  सेव्ह करा
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
