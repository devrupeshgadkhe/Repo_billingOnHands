/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import {
  Upload,
  Sparkles,
  Camera,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Package,
  Plus,
  Trash2,
  Boxes,
  Tag,
  Check,
  RotateCcw
} from "lucide-react";
import { Item, UNITS, TAX_RATES } from "../types.js";
import CameraScannerModal from "./CameraScannerModal.js";

interface ItemsScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onItemsImported: (items: Omit<Item, "id">[]) => Promise<void>;
  existingItems?: Item[];
}

export const ItemsScanModal: React.FC<ItemsScanModalProps> = ({
  isOpen,
  onClose,
  onItemsImported,
  existingItems = []
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parsedItems, setParsedItems] = useState<any[]>([]);
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      setErrorMessage("कृपया JPG, PNG किंवा PDF फॉरमॅटमधील फोटो निवडा.");
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  const executeDirectItemsParse = async (base64Data: string, mimeType: string) => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/ai/parse-items-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileBase64: base64Data,
          mimeType: mimeType || "image/jpeg"
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "आयटम लिस्ट स्कॅन करताना अडचण आली.");
      }

      if (!data.items || data.items.length === 0) {
        throw new Error("फोटोमधून कोणतेही आयटम वाचता आले नाहीत. कृपया स्पष्ट फोटो निवडा.");
      }

      setParsedItems(
        data.items.map((it: any, idx: number) => ({
          id: `temp_${Date.now()}_${idx}`,
          selected: true,
          name: it.name || "",
          hsn: it.hsn || "",
          purchasePrice: Number(it.purchasePrice) || 0,
          salePrice: Number(it.salePrice) || Number(it.purchasePrice) || 0,
          mrp: Number(it.mrp) || Number(it.salePrice) || 0,
          wholesalePrice: Number(it.wholesalePrice) || 0,
          minWholesaleQty: Number(it.minWholesaleQty) || 5,
          boxPackingRatio: Number(it.boxPackingRatio) || 0,
          boxUnit: it.boxUnit || "BOX",
          stockQuantity: Number(it.stockQuantity) || 0,
          minStockAlert: Number(it.minStockAlert) || 5,
          gstRate: Number(it.gstRate) || 0,
          unit: it.unit ? it.unit.toUpperCase() : "PCS",
          brand: it.brand || "",
          category: it.category || ""
        }))
      );
      setStep("review");
    } catch (innerErr: any) {
      setErrorMessage(innerErr.message || "स्कॅनिंग अयशस्वी झाले.");
    } finally {
      setIsProcessing(false);
    }
  };

  const processScan = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = (e.target?.result as string).split(",")[1];
        await executeDirectItemsParse(base64Data, selectedFile.type);
      };
      reader.readAsDataURL(selectedFile);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || "फाईल वाचताना अडचण आली.");
    }
  };

  const handleCameraCapture = (file: File, base64: string) => {
    setSelectedFile(file);
    setPreviewUrl(`data:image/jpeg;base64,${base64}`);
    setIsCameraModalOpen(false);
    executeDirectItemsParse(base64, "image/jpeg");
  };

  const handleRowChange = (index: number, field: string, value: any) => {
    setParsedItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleToggleRow = (index: number) => {
    setParsedItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], selected: !copy[index].selected };
      return copy;
    });
  };

  const handleDeleteRow = (index: number) => {
    setParsedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImportAll = async () => {
    const selectedRows = parsedItems.filter((i) => i.selected && i.name.trim().length > 0);
    if (selectedRows.length === 0) {
      setErrorMessage("कृपया किमान एक योग्य आयटम सिलेक्ट करा.");
      return;
    }

    setIsSaving(true);
    try {
      const payload: Omit<Item, "id">[] = selectedRows.map((r) => ({
        name: r.name.trim(),
        hsn: r.hsn ? r.hsn.trim() : "",
        purchasePrice: Number(r.purchasePrice) || 0,
        salePrice: Number(r.salePrice) || 0,
        mrp: Number(r.mrp) || Number(r.salePrice) || 0,
        wholesalePrice: Number(r.wholesalePrice) || 0,
        minWholesaleQty: Number(r.minWholesaleQty) || 5,
        boxPackingRatio: Number(r.boxPackingRatio) || 0,
        boxUnit: r.boxUnit || "BOX",
        category: r.category || "",
        brand: r.brand || "",
        stockQuantity: Number(r.stockQuantity) || 0,
        minStockAlert: Number(r.minStockAlert) || 5,
        gstRate: Number(r.gstRate) || 0,
        unit: r.unit || "PCS",
        barcodes: []
      }));

      await onItemsImported(payload);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "इन्व्हेंटरीमध्ये ॲड करताना त्रुटी आली.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl">
              <Sparkles className="w-5 h-5 text-emerald-200 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold">हँडरिटन व प्रिंटेड आयटम स्कॅनर (AI Item List Scanner)</h2>
              <p className="text-[11px] text-emerald-100">कागदावर लिहिलेली लिस्ट, वहीतील नोंद किंवा कॅटलॉगचा फोटो काढून थेट इन्व्हेंटरीमध्ये ॲड करा</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {step === "upload" ? (
            <div className="space-y-6">
              {previewUrl ? (
                <div className="border-2 border-emerald-500 bg-emerald-50/30 rounded-2xl p-6 text-center">
                  <div className="flex flex-col items-center space-y-3">
                    <img
                      src={previewUrl}
                      alt="Selected item list"
                      className="max-h-56 rounded-xl shadow-md object-contain border border-slate-200"
                    />
                    <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{selectedFile?.name} ({Math.round((selectedFile?.size || 0) / 1024)} KB)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                      className="text-xs text-rose-600 hover:text-rose-700 font-bold underline cursor-pointer"
                    >
                      दुसरा फोटो किंवा कॅमेरा निवडा
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 1. Live Camera / Webcam Option */}
                  <button
                    type="button"
                    onClick={() => setIsCameraModalOpen(true)}
                    className="border-2 border-emerald-500/60 bg-emerald-50/50 hover:bg-emerald-100/70 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2.5 shadow-xs group hover:scale-[1.01]"
                  >
                    <div className="w-13 h-13 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">थेट वेबकॅमने फोटो काढा</p>
                      <p className="text-[11px] text-emerald-800/80 mt-0.5">कॅमेरासमोर कागद किंवा यादी धरा व 1-क्लिकमध्ये स्कॅन करा</p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-full shadow-xs">
                      📷 Live Camera Scan
                    </span>
                  </button>

                  {/* 2. File / Photo Upload Option */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50/80 bg-white rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2.5"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileSelect(f);
                      }}
                      className="hidden"
                    />
                    <div className="w-13 h-13 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 shadow-xs">
                      <Upload className="w-6 h-6 text-slate-700" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">गॅलरी / फाईलमधून फोटो निवडा</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">JPG, PNG किंवा PDF फॉरमॅटमधील यादी</p>
                    </div>
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold rounded-full">
                      📁 Browse File
                    </span>
                  </div>
                </div>
              )}

              {/* Instructions Pill */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-600">
                <p className="font-bold text-slate-800 flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>AI स्कॅनरचे फायदे:</span>
                </p>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 pl-1">
                  <li>हस्तलिखित (Handwritten) वही, रजिस्टर किंवा कागदावरील मालाची यादी ओळखते.</li>
                  <li>वस्तूचे नाव, खरेदी किंमत, विक्री दर, साठा (Qty), युनिट (KGS, PCS, BOX, LTR) आपोआप भरते.</li>
                  <li>इन्व्हेंटरीमध्ये ॲड करण्याआधी सर्व दर व माहिती तपासता व एडिट करता येते.</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Boxes className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-xs text-slate-800">
                    वाचलेले प्रॉडक्ट्स ({parsedItems.filter((i) => i.selected).length}/{parsedItems.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep("upload");
                    setParsedItems([]);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1 font-semibold"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>दुसरा फोटो स्कॅन करा</span>
                </button>
              </div>

              {/* Table of Parsed Items */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 sticky top-0 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 text-center w-10">
                        <input
                          type="checkbox"
                          checked={parsedItems.every((i) => i.selected)}
                          onChange={(e) =>
                            setParsedItems((prev) =>
                              prev.map((i) => ({ ...i, selected: e.target.checked }))
                            )
                          }
                          className="accent-emerald-600 rounded"
                        />
                      </th>
                      <th className="p-2.5">वस्तूचे नाव (Item Name)</th>
                      <th className="p-2.5 text-right w-24">खरेदी (Purchase)</th>
                      <th className="p-2.5 text-right w-24">विक्री (Retail)</th>
                      <th className="p-2.5 text-right w-24">घाऊक (Wholesale)</th>
                      <th className="p-2.5 text-center w-20">साठा (Stock)</th>
                      <th className="p-2.5 text-center w-20">युनिट</th>
                      <th className="p-2.5 text-center w-20">GST %</th>
                      <th className="p-2.5 text-center w-12">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {parsedItems.map((row, idx) => (
                      <tr key={row.id} className={row.selected ? "bg-white hover:bg-slate-50" : "bg-slate-50/60 opacity-60"}>
                        <td className="p-2 text-center">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={() => handleToggleRow(idx)}
                            className="accent-emerald-600 rounded"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) => handleRowChange(idx, "name", e.target.value)}
                            placeholder="प्रॉडक्ट नाव"
                            className="w-full px-2 py-1 border border-slate-200 focus:border-emerald-500 rounded text-xs outline-none font-semibold text-slate-800"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={row.purchasePrice}
                            onChange={(e) => handleRowChange(idx, "purchasePrice", parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-slate-200 focus:border-emerald-500 rounded text-xs outline-none font-mono text-right"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={row.salePrice}
                            onChange={(e) => handleRowChange(idx, "salePrice", parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-slate-200 focus:border-emerald-500 rounded text-xs outline-none font-mono text-right font-bold text-emerald-700"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={row.wholesalePrice}
                            onChange={(e) => handleRowChange(idx, "wholesalePrice", parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-slate-200 focus:border-emerald-500 rounded text-xs outline-none font-mono text-right text-blue-700"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={row.stockQuantity}
                            onChange={(e) => handleRowChange(idx, "stockQuantity", parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-slate-200 focus:border-emerald-500 rounded text-xs outline-none font-mono text-center"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={row.unit}
                            onChange={(e) => handleRowChange(idx, "unit", e.target.value)}
                            className="w-full px-1.5 py-1 border border-slate-200 focus:border-emerald-500 rounded text-xs outline-none font-mono text-center"
                          >
                            {UNITS.map((u) => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <select
                            value={row.gstRate}
                            onChange={(e) => handleRowChange(idx, "gstRate", Number(e.target.value))}
                            className="w-full px-1 py-1 border border-slate-200 focus:border-emerald-500 rounded text-xs outline-none font-mono text-center"
                          >
                            {TAX_RATES.map((t) => (
                              <option key={t} value={t}>{t}%</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            रद्द करा (Cancel)
          </button>

          {step === "upload" ? (
            <button
              type="button"
              disabled={!selectedFile || isProcessing}
              onClick={processScan}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold py-2.5 px-6 rounded-xl text-xs tracking-wider uppercase transition cursor-pointer flex items-center space-x-2 shadow-md"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI वाचत आहे (Analyzing List)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>स्कॅन सुरू करा (Scan Items)</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              disabled={isSaving || parsedItems.filter((i) => i.selected).length === 0}
              onClick={handleImportAll}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold py-2.5 px-6 rounded-xl text-xs tracking-wider uppercase transition cursor-pointer flex items-center space-x-2 shadow-md"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>इन्व्हेंटरीमध्ये ॲड करत आहे...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>सर्व आयटम इन्व्हेंटरीमध्ये जोडा ({parsedItems.filter((i) => i.selected).length} Items)</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>

      {/* Live Camera Scanner Modal for Item Lists */}
      <CameraScannerModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={handleCameraCapture}
        title="थेट कॅमेऱ्याने मालाची / आयटम यादी स्कॅन करा"
        description="हस्तलिखित किंवा छापिल आयटम यादीचा फोटो काढा. AI सर्व आयटम्स वाचून इन्व्हेंटरीमध्ये ॲड करेल."
      />
    </div>
  );
};
export default ItemsScanModal;
