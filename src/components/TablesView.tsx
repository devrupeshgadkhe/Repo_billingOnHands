/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { UtensilsCrossed, Plus, Users, Receipt, Edit, Trash2, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { RestaurantTable } from "../types.js";
import { useDialog } from "../context/DialogContext.js";

interface TablesViewProps {
  tables: RestaurantTable[];
  onSaveTable: (table: RestaurantTable) => Promise<void>;
  onDeleteTable: (tableId: string) => Promise<void>;
  onSeedTables?: () => Promise<void>;
  onOpenTablePOS: (table: RestaurantTable) => void;
}

export default function TablesView({
  tables,
  onSaveTable,
  onDeleteTable,
  onSeedTables,
  onOpenTablePOS
}: TablesViewProps) {
  const { showAlert } = useDialog();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  const [tableNumber, setTableNumber] = useState("");
  const [section, setSection] = useState("Main Dining");
  const [capacity, setCapacity] = useState(4);
  const [status, setStatus] = useState<'available' | 'occupied' | 'reserved' | 'cleaning'>('available');

  const handleOpenAdd = () => {
    setEditingTable(null);
    setTableNumber(`T-${tables.length + 1}`);
    setSection("Main Dining");
    setCapacity(4);
    setStatus("available");
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (t: RestaurantTable) => {
    setEditingTable(t);
    setTableNumber(t.tableNumber);
    setSection(t.section || "Main Dining");
    setCapacity(t.capacity || 4);
    setStatus(t.status);
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleSeedDefaultTables = async () => {
    if (!onSeedTables) return;
    setIsSubmitting(true);
    try {
      await onSeedTables();
    } catch (err: any) {
      await showAlert({
        title: "Error Loading Sample Tables",
        message: err?.message || "Failed to load sample tables.",
        variant: "danger"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkCleaned = async (t: RestaurantTable) => {
    setActionBusyId(t.id);
    try {
      await onSaveTable({
        ...t,
        status: "available",
        currentOrderId: undefined,
        currentOrderTotal: 0,
        runningItemsSummary: ""
      });
    } catch (err: any) {
      await showAlert({
        title: "Error Updating Table",
        message: err?.message || "Could not mark table as cleaned.",
        variant: "danger"
      });
    } finally {
      setActionBusyId(null);
    }
  };

  const sections = Array.from(new Set(tables.map(t => t.section || "Main Dining"))).filter(Boolean);
  const filteredTables = selectedSection === "all"
    ? tables
    : tables.filter(t => (t.section || "Main Dining") === selectedSection);

  const availableCount = tables.filter(t => t.status === "available").length;
  const occupiedCount = tables.filter(t => t.status === "occupied").length;
  const reservedCount = tables.filter(t => t.status === "reserved").length;
  const cleaningCount = tables.filter(t => t.status === "cleaning").length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber.trim()) {
      setFormError("Please enter a valid table name or number.");
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    const newTable: RestaurantTable = {
      id: editingTable?.id || `tbl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      tableNumber: tableNumber.trim(),
      section: section.trim() || "Main Dining",
      capacity: Math.max(1, Number(capacity) || 4),
      status,
      currentOrderId: status === "available" || status === "cleaning" ? undefined : editingTable?.currentOrderId,
      currentOrderTotal: status === "available" || status === "cleaning" ? 0 : (editingTable?.currentOrderTotal || 0),
      runningItemsSummary: status === "available" || status === "cleaning" ? "" : (editingTable?.runningItemsSummary || "")
    };

    try {
      await onSaveTable(newTable);
      setIsAddModalOpen(false);
    } catch (err: any) {
      setFormError(err?.message || "Failed to save table. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-emerald-600" />
            <span>Restaurant Table Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure dining tables, track Table Cleaning after bill settlement, and manage KOT orders.
          </p>
          <div className="flex flex-wrap items-center gap-2.5 mt-3 text-xs font-bold">
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
              🟢 {availableCount} Available
            </span>
            <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
              🔴 {occupiedCount} Occupied
            </span>
            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg">
              🟡 {reservedCount} Reserved
            </span>
            <span className="px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-200 rounded-lg">
              🧹 {cleaningCount} Cleaning
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {tables.length === 0 && onSeedTables && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSeedDefaultTables}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Load Sample Tables</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleOpenAdd}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-5 rounded-xl text-xs flex items-center gap-2 shadow-md transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Table</span>
          </button>
        </div>
      </div>

      {/* Section Filter Tabs */}
      {sections.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setSelectedSection("all")}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition ${
              selectedSection === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            All Sections ({tables.length})
          </button>
          {sections.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setSelectedSection(s)}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition whitespace-nowrap ${
                selectedSection === s
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {s} ({tables.filter(t => (t.section || "Main Dining") === s).length})
            </button>
          ))}
        </div>
      )}

      {/* Tables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredTables.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-dashed border-slate-300">
            <UtensilsCrossed className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">No tables configured yet</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">Add your first table or load 6 pre-configured restaurant tables.</p>
            <div className="flex items-center justify-center gap-3">
              {onSeedTables && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSeedDefaultTables}
                  className="bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold py-2 px-4 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Load 6 Sample Tables (T-1 to T-6)</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenAdd}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg text-xs cursor-pointer shadow-xs"
              >
                Create Custom Table
              </button>
            </div>
          </div>
        ) : (
          filteredTables.map((t) => {
            const isOccupied = t.status === 'occupied';
            const isReserved = t.status === 'reserved';
            const isCleaning = t.status === 'cleaning';
            return (
              <div
                key={t.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between transition shadow-sm bg-white ${
                  isOccupied
                    ? "border-rose-300 ring-2 ring-rose-500/20"
                    : isReserved
                    ? "border-amber-300 ring-2 ring-amber-500/20"
                    : isCleaning
                    ? "border-sky-300 ring-2 ring-sky-500/20"
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
                          : isCleaning
                          ? "bg-sky-100 text-sky-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {isCleaning ? "Needs Cleaning" : t.status}
                    </span>
                  </div>

                  <div className="py-3 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <span>Section:</span>
                      <span className="font-semibold text-slate-800">{t.section || "Main Dining"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Users className="w-3.5 h-3.5" />
                      <span>Capacity:</span>
                      <span className="font-semibold text-slate-800">{t.capacity || 4} Persons</span>
                    </div>
                    {isOccupied && (
                      <div className="pt-2 border-t border-dashed border-slate-200">
                        <span className="text-[10px] text-slate-400 uppercase block font-semibold">Running Order / Bill:</span>
                        <span className="font-bold font-mono text-emerald-700 text-sm">₹{(t.currentOrderTotal || 0).toFixed(2)}</span>
                        {t.runningItemsSummary && (
                          <p className="text-[11px] text-slate-600 truncate mt-0.5">{t.runningItemsSummary}</p>
                        )}
                      </div>
                    )}
                    {isCleaning && (
                      <div className="pt-2 border-t border-dashed border-sky-200 text-[11px] text-sky-800 font-medium">
                        Bill settled. Clear & sanitize table before next guests arrive.
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  {isCleaning ? (
                    <button
                      type="button"
                      disabled={actionBusyId === t.id}
                      onClick={() => handleMarkCleaned(t)}
                      className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{actionBusyId === t.id ? "Updating..." : "Mark Cleaned"}</span>
                    </button>
                  ) : (
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
                      <span>{isOccupied ? "View Order / Bill" : "Take Order"}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(t)}
                    className="p-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl transition cursor-pointer"
                    title="Edit Table"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      setActionBusyId(t.id);
                      try {
                        await onDeleteTable(t.id);
                      } catch (err: any) {
                        await showAlert({
                          title: "Error Deleting Table",
                          message: err?.message || "Failed to delete table.",
                          variant: "danger"
                        });
                      } finally {
                        setActionBusyId(null);
                      }
                    }}
                    disabled={actionBusyId === t.id}
                    className="p-2 border border-rose-200 hover:bg-rose-50 disabled:opacity-60 text-rose-600 rounded-xl transition cursor-pointer"
                    title="Delete Table"
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
              {editingTable ? "Edit Table" : "Create Table"}
            </h3>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Table Name / Number</label>
                <input
                  type="text"
                  required
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="e.g. Table 1 or AC-3"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Section / Hall</label>
                <input
                  type="text"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  placeholder="e.g. Main Dining, AC Hall, Family Room"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Capacity (Persons)</label>
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
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-emerald-500 bg-white"
                >
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="reserved">Reserved</option>
                  <option value="cleaning">Needs Cleaning</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  {isSubmitting ? "Saving..." : "Save Table"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
