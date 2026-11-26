/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Lock,
  ShieldCheck,
  Store,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  Database
} from "lucide-react";
import { BUSINESS_TYPES, BusinessProfile, INDIAN_STATES } from "../types";

interface InstallSetupViewProps {
  existingBusiness?: BusinessProfile;
  hasExistingData?: boolean;
  onSetupComplete: () => Promise<void>;
}

const BUSINESS_ICONS: Record<string, string> = {
  kirana: "🛒",
  krishi_seva: "🌱",
  medical: "💊",
  wine_shop: "🍷",
  restaurant: "🍽️",
  garment: "👕",
  electronics: "⚡",
  mall: "🏪",
  general: "🏢"
};

export default function InstallSetupView({
  existingBusiness,
  hasExistingData = false,
  onSetupComplete
}: InstallSetupViewProps) {
  const [selectedType, setSelectedType] = useState<NonNullable<BusinessProfile["businessType"]>>(
    existingBusiness?.businessType || "kirana"
  );
  const [storeName, setStoreName] = useState(
    existingBusiness?.name && existingBusiness.name !== "Apex Electro-Tech Systems"
      ? existingBusiness.name
      : ""
  );
  const [state, setState] = useState(existingBusiness?.state || "Maharashtra");
  const [phone, setPhone] = useState(existingBusiness?.phone || "");
  const [gstin, setGstin] = useState("");
  const [setupMode, setSetupMode] = useState<"clean" | "demo" | "keep_existing">(
    hasExistingData ? "keep_existing" : "clean"
  );
  const [confirmedLock, setConfirmedLock] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedOption = BUSINESS_TYPES.find((b) => b.id === selectedType);

  const handleConfirmSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedType) {
      setErrorMsg("Please select a business mode to continue.");
      return;
    }

    if (!confirmedLock) {
      setErrorMsg("Please confirm that you understand the business mode is locked for this installation.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/install/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessType: selectedType,
          storeName: storeName.trim() || undefined,
          state,
          phone: phone.trim() || undefined,
          gstin: gstin.trim().toUpperCase() || undefined,
          setupMode
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to complete installation setup.");
      }

      await onSetupComplete();
    } catch (err: any) {
      setErrorMsg(err?.message || "Unable to save installation setup. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
              <Store className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  First-Time Installation Setup
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-1.5">
                Select Your Business Mode
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/90 mt-1">
                Configure Billing On Hand for your exact industry workflow before starting operations.
              </p>
            </div>
          </div>

          <div className="bg-slate-950/40 border border-emerald-400/25 rounded-2xl px-4 py-3 text-xs shrink-0 max-w-xs">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <Lock className="w-4 h-4 shrink-0" />
              <span>One-Time Installation Lock</span>
            </div>
            <p className="text-[11px] text-emerald-100/80 mt-1 leading-relaxed">
              This selection stays locked across all future app updates. To change it later, the application must be uninstalled and reinstalled.
            </p>
          </div>
        </div>

        <form onSubmit={handleConfirmSetup} className="p-6 sm:p-8 space-y-6">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Step 1: Business Vertical Selection Grid */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-3">
              1. Choose Your Business Vertical *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {BUSINESS_TYPES.map((bt) => {
                const isSelected = selectedType === bt.id;
                return (
                  <button
                    key={bt.id}
                    type="button"
                    onClick={() => setSelectedType(bt.id)}
                    className={`text-left p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between gap-2 ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50/70 shadow-md ring-2 ring-emerald-500/20"
                        : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl leading-none">{BUSINESS_ICONS[bt.id] || "🏢"}</span>
                        <span className="font-bold text-xs sm:text-sm text-slate-900 leading-snug">
                          {bt.label}
                        </span>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {bt.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Basic Store Details & Data Initialization Mode */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
            <div className="space-y-3.5">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                2. Store Identity (Optional — Editable Later in Settings)
              </label>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Business / Shop Trade Name
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder={`e.g. ${selectedOption?.label.split("&")[0].trim() || "My Store"}`}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    State (Place of Supply)
                  </label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:outline-none focus:border-emerald-600"
                  >
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  GSTIN (Optional)
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="15-character GSTIN (if registered)"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-mono uppercase focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="space-y-3.5">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                3. Initial Workspace Data
              </label>

              <div className="space-y-2.5">
                {hasExistingData && (
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition ${
                      setupMode === "keep_existing"
                        ? "border-emerald-600 bg-emerald-50/70"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="setupMode"
                      checked={setupMode === "keep_existing"}
                      onChange={() => setSetupMode("keep_existing")}
                      className="mt-1 text-emerald-600"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-emerald-600" />
                        Keep Existing Store Data & Apply Mode
                      </span>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Retains your existing items, parties, and invoices while locking the selected business mode.
                      </p>
                    </div>
                  </label>
                )}

                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition ${
                    setupMode === "clean"
                      ? "border-emerald-600 bg-emerald-50/70"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="setupMode"
                    checked={setupMode === "clean"}
                    onChange={() => setSetupMode("clean")}
                    className="mt-1 text-emerald-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Start Fresh (Clean Blank Store)
                    </span>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Starts with zero sample invoices/items (Restaurant mode initializes ready-to-use tables T-1 to T-4).
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition ${
                    setupMode === "demo"
                      ? "border-emerald-600 bg-emerald-50/70"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="setupMode"
                    checked={setupMode === "demo"}
                    onChange={() => setSetupMode("demo")}
                    className="mt-1 text-emerald-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Load Sample Industry Items & Parties
                    </span>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Pre-populates sample catalog items, HSN codes, and tables tailored to {selectedOption?.label}.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Lock Confirmation & Submit */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmedLock}
                onChange={(e) => setConfirmedLock(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-emerald-600 cursor-pointer"
              />
              <span className="text-xs text-amber-950 leading-relaxed">
                <strong>I understand & confirm:</strong> The selected business mode (
                <strong className="text-emerald-800">{selectedOption?.label}</strong>) will be permanently locked for this installation. It cannot be changed inside Settings or during software updates—only after uninstalling the application.
              </span>
            </label>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-amber-200/70">
              <div className="flex items-center gap-2 text-[11px] text-slate-600">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Default login after setup: username <code className="font-mono font-bold text-slate-800">admin</code></span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !confirmedLock}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold py-3 px-6 rounded-xl text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Locking & Initializing Store...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Confirm & Lock Business Mode</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
