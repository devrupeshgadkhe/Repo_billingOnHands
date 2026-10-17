/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useMemo } from "react";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  ScanLine,
  AlertCircle,
  X,
  CheckCircle2,
  Loader2,
  FileCheck,
  Building2,
  Package,
  Calendar,
  Hash,
  RotateCcw,
  Check,
  Plus,
  Camera
} from "lucide-react";
import { Party, Item, TAX_RATES } from "../types.js";
import CameraScannerModal from "./CameraScannerModal.js";

export interface ParsedItem {
  name: string;
  hsn?: string;
  quantity: number;
  unit?: string;
  rate: number;
  discount?: number;
  gstRate: number;
  taxableAmount?: number;
  totalAmount: number;
}

export interface ParsedInvoiceData {
  supplierName: string;
  supplierGstin?: string;
  supplierAddress?: string;
  supplierState?: string;
  supplierPhone?: string;
  supplierEmail?: string;
  buyerGstin?: string;
  invoiceNumber: string;
  invoiceDate: string;
  items: ParsedItem[];
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
}

interface InvoiceUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvoiceParsed: (data: ParsedInvoiceData) => void;
  onQuotaExceeded?: () => void;
  existingParties?: Party[];
  existingItems?: Item[];
}

export const InvoiceUploadModal: React.FC<InvoiceUploadModalProps> = ({
  isOpen,
  onClose,
  onInvoiceParsed,
  onQuotaExceeded,
  existingParties = [],
  existingItems = []
}) => {
  // 1. All useState hooks (must run unconditionally on every render)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modalStep, setModalStep] = useState<"upload" | "review">("upload");
  const [reviewedData, setReviewedData] = useState<ParsedInvoiceData | null>(null);

  // 2. All useRef hooks
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 3. All useMemo hooks (must run unconditionally before any early returns)
  const matchedSupplier = useMemo(() => {
    if (!reviewedData || !Array.isArray(existingParties)) return null;
    const cleanGst = (reviewedData.supplierGstin || "").trim().toUpperCase();
    if (cleanGst) {
      const byGst = existingParties.find(
        p => p && p.type === "supplier" && p.gstin && p.gstin.trim().toUpperCase() === cleanGst
      );
      if (byGst) return byGst;
    }
    const cleanName = (reviewedData.supplierName || "").trim().toLowerCase();
    if (cleanName) {
      const byName = existingParties.find(
        p => p && p.type === "supplier" && p.name && (
          p.name.toLowerCase().includes(cleanName) ||
          cleanName.includes(p.name.toLowerCase())
        )
      );
      if (byName) return byName;
    }
    return null;
  }, [reviewedData, existingParties]);

  const itemStatuses = useMemo(() => {
    if (!reviewedData || !Array.isArray(reviewedData.items)) return [];
    const safeExisting = Array.isArray(existingItems) ? existingItems : [];
    return reviewedData.items.map(item => {
      if (!item) return { item: { name: "", rate: 0, quantity: 1, gstRate: 0, totalAmount: 0 }, exists: false, matchedItem: null };
      const cleanName = (item.name || "").trim().toLowerCase();
      const cleanHsn = (item.hsn || "").trim();
      const matched = safeExisting.find(dbItem => {
        if (!dbItem || !dbItem.name) return false;
        const dbName = dbItem.name.toLowerCase().trim();
        return (
          dbName === cleanName ||
          dbName.includes(cleanName) ||
          cleanName.includes(dbName) ||
          (cleanHsn && dbItem.hsn && dbItem.hsn.trim() === cleanHsn)
        );
      });
      return {
        item,
        exists: Boolean(matched),
        matchedItem: matched || null
      };
    });
  }, [reviewedData, existingItems]);

  // Safe formatting helper to prevent any .toFixed() crash
  const formatNum = (val: any): string => {
    const num = Number(val);
    return isNaN(num) ? "0.00" : num.toFixed(2);
  };

  const handleFileSelect = (file: File) => {
    setErrorMessage(null);
    const validMimes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validMimes.includes(file.type)) {
      setErrorMessage("Please select a valid format: JPG, PNG, WEBP or PDF document.");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage("File size is too large (Maximum 25 MB).");
      return;
    }

    setSelectedFile(file);

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  const executeDirectParse = async (base64Data: string, mimeType: string, fileName: string) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setProcessingStep("Reading invoice and extracting details...");

    try {
      const response = await fetch("/api/ai/parse-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileBase64: base64Data,
          mimeType: mimeType || "image/jpeg",
          fileName: fileName || "camera_scan.jpg"
        })
      });

      const result = await response.json();

      if (response.ok && result.invoice) {
        setProcessingStep("Details extracted. Opening review screen...");
        // Sanitize invoice numbers and fields to guarantee no undefined
        const inv = result.invoice;
        inv.items = Array.isArray(inv.items) ? inv.items.map((it: any) => {
          const quantity = Number(it.quantity) || 1;
          const rate = Number(it.rate) || 0;
          const discount = Number(it.discount) || 0;
          const gstRate = it.gstRate !== undefined && it.gstRate !== null ? Number(it.gstRate) : 0;
          const taxableAmount = it.taxableAmount !== undefined && Number(it.taxableAmount) > 0
            ? Number(it.taxableAmount)
            : Math.round(((quantity * rate) - discount) * 100) / 100;
          const tax = Math.round(((taxableAmount * gstRate) / 100) * 100) / 100;
          const totalAmount = it.totalAmount !== undefined && Number(it.totalAmount) > 0
            ? Number(it.totalAmount)
            : Math.round((taxableAmount + tax) * 100) / 100;
          return {
            ...it,
            quantity,
            rate,
            discount,
            gstRate,
            taxableAmount,
            totalAmount
          };
        }) : [];

        const calculatedSubtotal = Math.round(inv.items.reduce((sum: number, it: any) => sum + (it.taxableAmount || (it.quantity * it.rate)), 0) * 100) / 100;
        const calculatedTax = Math.round(inv.items.reduce((sum: number, it: any) => sum + (((it.taxableAmount || (it.quantity * it.rate)) * (Number(it.gstRate) || 0)) / 100), 0) * 100) / 100;

        inv.subtotal = inv.subtotal ? Number(inv.subtotal) : calculatedSubtotal;
        inv.taxAmount = inv.taxAmount !== undefined && inv.taxAmount !== null ? Number(inv.taxAmount) : calculatedTax;
        inv.grandTotal = inv.grandTotal ? Number(inv.grandTotal) : Math.round((inv.subtotal + inv.taxAmount) * 100) / 100;

        setReviewedData(inv);
        setModalStep("review");
        return;
      }

      if (response.status === 429 || response.status === 403) {
        onQuotaExceeded?.();
      }

      setErrorMessage(result.error || "Failed to read invoice. Please provide a clear, well-lit photo of the bill.");
    } catch (err: any) {
      setErrorMessage(err?.message || "Could not connect to server. Please try again.");
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  };

  const handleExtract = async () => {
    if (!selectedFile) {
      setErrorMessage("Please select an invoice photo or PDF first.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setProcessingStep("Preparing document...");

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.includes(",") ? result.split(",")[1] : result;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      await executeDirectParse(base64Data, selectedFile.type, selectedFile.name);
    } catch (err: any) {
      setErrorMessage(err?.message || "Could not connect to server. Please try again.");
      setIsProcessing(false);
      setProcessingStep("");
    }
  };

  const handleCameraCapture = (file: File, base64: string) => {
    setSelectedFile(file);
    setPreviewUrl(`data:image/jpeg;base64,${base64}`);
    setErrorMessage(null);
    setIsCameraModalOpen(false);
    executeDirectParse(base64, "image/jpeg", file.name);
  };

  const handleReset = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setErrorMessage(null);
    setModalStep("upload");
    setReviewedData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpdateItem = (index: number, field: keyof ParsedItem, val: any) => {
    if (!reviewedData || !reviewedData.items) return;
    const updated = [...reviewedData.items];
    updated[index] = { ...updated[index], [field]: val };

    const qty = Number(updated[index].quantity) || 1;
    const rate = Number(updated[index].rate) || 0;
    const discount = Number(updated[index].discount) || 0;
    const gstRate = updated[index].gstRate !== undefined && updated[index].gstRate !== null ? Number(updated[index].gstRate) : 0;
    const taxable = Math.round(((qty * rate) - discount) * 100) / 100;
    const tax = Math.round(((taxable * gstRate) / 100) * 100) / 100;
    updated[index].taxableAmount = taxable;
    updated[index].totalAmount = Math.round((taxable + tax) * 100) / 100;

    const subtotal = Math.round(updated.reduce((sum, it) => sum + (it.taxableAmount || (it.quantity * it.rate)), 0) * 100) / 100;
    const taxAmount = Math.round(updated.reduce((sum, it) => sum + (((it.taxableAmount || (it.quantity * it.rate)) * (Number(it.gstRate) || 0)) / 100), 0) * 100) / 100;
    const grandTotal = Math.round((subtotal + taxAmount) * 100) / 100;

    setReviewedData({
      ...reviewedData,
      items: updated,
      subtotal,
      taxAmount,
      grandTotal
    });
  };

  const handleConfirmAndApply = () => {
    if (!reviewedData) return;
    onInvoiceParsed(reviewedData);
    handleReset();
    onClose();
  };

  // 4. Early return strictly AFTER all hooks are called
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`bg-white rounded-2xl shadow-2xl w-full border border-slate-200 overflow-hidden flex flex-col transition-all duration-200 ${
        modalStep === "review" ? "max-w-3xl max-h-[92vh]" : "max-w-lg max-h-[90vh]"
      }`}>
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-emerald-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {modalStep === "review" ? "Review Supplier Bill Details" : "Scan Supplier Invoice"}
              </h3>
              <p className="text-xs text-slate-500">
                {modalStep === "review"
                  ? "Verify extracted details. New suppliers and products will automatically be created in system."
                  : "Upload a photo or PDF of the supplier bill; items and financial totals will be automatically extracted."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {modalStep === "upload" ? (
            /* UPLOAD STEP */
            <>
              {!selectedFile ? (
                /* Dual Options: Live Camera Scan or File/PDF Upload */
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* 1. Live Camera / Webcam Scanner Option */}
                    <button
                      type="button"
                      onClick={() => setIsCameraModalOpen(true)}
                      className="border-2 border-emerald-500/60 bg-emerald-50/50 hover:bg-emerald-100/70 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2.5 shadow-xs group hover:scale-[1.01]"
                    >
                      <div className="w-13 h-13 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                        <Camera className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-emerald-950">Scan Live with Webcam / Camera</p>
                        <p className="text-[11px] text-emerald-800/80 mt-0.5">Hold bill before camera and capture in 1-click</p>
                      </div>
                      <span className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-full shadow-xs">
                        📷 Live Camera Scan
                      </span>
                    </button>

                    {/* 2. File / PDF Upload Option */}
                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center space-y-2.5 ${
                        isDragOver
                          ? "border-emerald-500 bg-emerald-50/60 scale-[0.99]"
                          : "border-slate-300 hover:border-slate-400 hover:bg-slate-50/80 bg-white"
                      }`}
                    >
                      <div className="w-13 h-13 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 shadow-xs">
                        <Upload className="w-6 h-6 text-slate-700" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">Upload File / PDF</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">JPG, PNG, WEBP or Supplier PDF Invoice</p>
                      </div>
                      <span className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold rounded-full">
                        📁 Browse / Drop File
                      </span>
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                  />
                </div>
              ) : (
                /* Selected File Preview */
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      <span>Selected File:</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleReset}
                      disabled={isProcessing}
                      className="text-xs text-slate-500 hover:text-rose-600 font-semibold cursor-pointer transition disabled:opacity-50"
                    >
                      Change File
                    </button>
                  </div>

                  <div className="flex items-center space-x-3 bg-white p-3 rounded-xl border border-slate-200">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Invoice Preview"
                        className="w-16 h-16 object-cover rounded-lg border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 flex flex-col items-center justify-center shrink-0">
                        <FileText className="w-7 h-7" />
                        <span className="text-[9px] font-bold uppercase mt-0.5">PDF</span>
                      </div>
                    )}
                    <div className="overflow-hidden flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate">{selectedFile.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type || "Document"}
                      </p>
                      <span className="inline-flex items-center text-[10px] text-emerald-700 font-semibold mt-1">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Ready to Scan
                      </span>
                    </div>
                  </div>

                  {isProcessing && (
                    <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2">
                      <div className="flex items-center space-x-2 text-xs font-bold text-emerald-900">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                        <span>{processingStep}</span>
                      </div>
                      <div className="w-full bg-emerald-200/60 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-emerald-600 h-1.5 rounded-full animate-pulse w-3/4"></div>
                      </div>
                      <p className="text-[10px] text-emerald-700">
                        Extracting supplier details, GST number, line items, rates and tax...
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Feature hints */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">💡 Features:</p>
                <p>
                  • A <strong>Verification & Review Screen</strong> opens before items are added to invoice.
                  <br />
                  • <strong>New Supplier:</strong> Automatically created with GSTIN and contact details if not found.
                  <br />
                  • <strong>New Products:</strong> Automatically registered into your inventory with correct purchase price.
                </p>
              </div>
            </>
          ) : (
            /* REVIEW STEP */
            reviewedData && (
              <div className="space-y-4">
                {/* Supplier Information Card */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-emerald-600" />
                      <span>Supplier Details:</span>
                    </span>
                    {matchedSupplier ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-700" />
                        <span>Registered Supplier</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300 flex items-center gap-1">
                        <Plus className="w-3 h-3 text-indigo-700" />
                        <span>New Supplier (Auto-registered)</span>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Supplier Name</label>
                      <input
                        type="text"
                        value={reviewedData.supplierName || ""}
                        onChange={(e) => setReviewedData({ ...reviewedData, supplierName: e.target.value })}
                        className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">GSTIN</label>
                      <input
                        type="text"
                        value={reviewedData.supplierGstin || ""}
                        placeholder="GSTIN Not Available"
                        onChange={(e) => setReviewedData({ ...reviewedData, supplierGstin: e.target.value.toUpperCase() })}
                        className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-medium focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Phone Number</label>
                      <input
                        type="text"
                        value={reviewedData.supplierPhone || ""}
                        placeholder="e.g. 9876543210"
                        onChange={(e) => setReviewedData({ ...reviewedData, supplierPhone: e.target.value })}
                        className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Address</label>
                      <input
                        type="text"
                        value={reviewedData.supplierAddress || ""}
                        placeholder="Supplier Address"
                        onChange={(e) => setReviewedData({ ...reviewedData, supplierAddress: e.target.value })}
                        className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">State</label>
                      <input
                        type="text"
                        value={reviewedData.supplierState || ""}
                        placeholder="e.g. Maharashtra"
                        onChange={(e) => setReviewedData({ ...reviewedData, supplierState: e.target.value })}
                        className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Bill Meta Details (Invoice No, Date) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      <Hash className="w-3 h-3 text-slate-400" />
                      <span>Invoice / Bill No</span>
                    </label>
                    <input
                      type="text"
                      value={reviewedData.invoiceNumber || ""}
                      onChange={(e) => setReviewedData({ ...reviewedData, invoiceNumber: e.target.value })}
                      className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>Date</span>
                    </label>
                    <input
                      type="date"
                      value={reviewedData.invoiceDate || ""}
                      onChange={(e) => setReviewedData({ ...reviewedData, invoiceDate: e.target.value })}
                      className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Taxable Amount</span>
                    <span className="font-bold text-slate-800 text-sm block mt-1">₹{formatNum(reviewedData.subtotal)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Grand Total</span>
                    <span className="font-extrabold text-emerald-700 text-base block mt-0.5">₹{formatNum(reviewedData.grandTotal)}</span>
                  </div>
                </div>

                {/* Items Review Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-100/90 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-emerald-600" />
                      <span>Item List ({reviewedData.items?.length || 0} Items):</span>
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      You can adjust rate, quantity and tax before confirming
                    </span>
                  </div>

                  <div className="overflow-x-auto max-h-56">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold sticky top-0">
                        <tr>
                          <th className="py-2 px-3">Item Name</th>
                          <th className="py-2 px-2">HSN</th>
                          <th className="py-2 px-2 w-20">Quantity</th>
                          <th className="py-2 px-2 w-24">Purchase Rate</th>
                          <th className="py-2 px-2 w-20">GST %</th>
                          <th className="py-2 px-3 text-right">Total</th>
                          <th className="py-2 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {itemStatuses.map(({ item, exists }, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={item.name || ""}
                                onChange={(e) => handleUpdateItem(idx, "name", e.target.value)}
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-medium focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={item.hsn || ""}
                                placeholder="HSN"
                                onChange={(e) => handleUpdateItem(idx, "hsn", e.target.value)}
                                className="w-16 px-1.5 py-1 bg-white border border-slate-200 rounded text-xs font-mono"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                min="0.01"
                                step="any"
                                value={item.quantity || 1}
                                onChange={(e) => handleUpdateItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                                className="w-16 px-1.5 py-1 bg-white border border-slate-200 rounded text-xs font-bold text-center"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.rate || 0}
                                onChange={(e) => handleUpdateItem(idx, "rate", parseFloat(e.target.value) || 0)}
                                className="w-20 px-1.5 py-1 bg-white border border-slate-200 rounded text-xs font-bold"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <select
                                value={item.gstRate !== undefined && item.gstRate !== null ? item.gstRate : 0}
                                onChange={(e) => handleUpdateItem(idx, "gstRate", parseFloat(e.target.value) || 0)}
                                className="w-18 px-1.5 py-1 bg-white border border-slate-200 rounded text-xs font-bold text-slate-800"
                              >
                                {TAX_RATES.map((t) => (
                                  <option key={t} value={t}>{t}%</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-slate-800">
                              ₹{formatNum(item.totalAmount)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {exists ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Existing
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  + New Item
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
          {modalStep === "review" ? (
            <>
              <button
                type="button"
                onClick={() => setModalStep("upload")}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Scan Again</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAndApply}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm Details & Load into Bill</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div></div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExtract}
                  disabled={!selectedFile || isProcessing}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Scanning...</span>
                    </>
                  ) : (
                    <>
                      <ScanLine className="w-4 h-4" />
                      <span>Scan Bill</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Live Camera Scanner Modal */}
      <CameraScannerModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={handleCameraCapture}
        title="Live Camera Supplier Bill Scanner"
        description="Hold supplier bill steadily before camera and capture."
      />
    </div>
  );
};
