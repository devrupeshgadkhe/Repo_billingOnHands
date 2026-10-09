/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 6: Custom Thermal Bill Designer (58mm & 80mm)
 * Drag-and-drop / customizable thermal receipt editor with live preview,
 * bilingual Marathi/English labels, dynamic UPI QR code generator, and preset templates.
 */

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { BusinessProfile, ThermalPrintConfig, Invoice } from "../types.js";
import { printThermalElement } from "../utils/thermalPrinter.js";
import {
  X,
  Printer,
  Sliders,
  Sparkles,
  QrCode,
  Building2,
  Receipt,
  FileText,
  Layers,
  CheckCircle2,
  RotateCcw,
  Download,
  Eye,
  Info,
  Smartphone,
  CreditCard,
  Percent,
  Check,
  Tag,
  Palette,
  AlignLeft,
  AlignCenter
} from "lucide-react";

export const DEFAULT_THERMAL_CONFIG: ThermalPrintConfig = {
  paperWidth: "80mm",
  templatePreset: "retail_standard",
  fontFamily: "monospace",
  fontSize: "medium",
  language: "bilingual",

  // Header
  showLogo: true,
  logoHeight: 50,
  headerGreeting: "|| श्री गणेशाय नमः ||",
  showBusinessName: true,
  businessNameSize: "large",
  showAddress: true,
  showPhone: true,
  showEmail: false,
  showGstin: true,
  showFssai: false,
  showDrugLicense: false,
  customHeaderNote: "",

  // Invoice & Customer
  showBillNo: true,
  showDate: true,
  showTime: true,
  showCashierName: true,
  showCustomerName: true,
  showCustomerPhone: true,
  showCustomerAddress: false,
  showCustomerGstin: true,
  showPreviousBalance: true,
  showTotalBalance: true,

  // Items
  showItemIndex: true,
  showHsn: true,
  showBatch: true,
  showExpiry: true,
  showRate: true,
  showDiscount: true,
  showGstPercent: true,
  wrapItemName: true,
  itemSpacing: "comfortable",

  // Totals & Taxes
  showTaxBreakdown: true,
  showSavingsBanner: true,
  showPaymentMode: true,
  showCashTendered: true,
  showChangeReturned: true,

  // Footer & UPI
  showUpiQrCode: true,
  upiId: "",
  upiMerchantName: "",
  showBankDetails: false,
  bankName: "",
  bankAccountNo: "",
  bankIfsc: "",
  bankBranch: "",
  showTerms: true,
  termsAndConditions: "१. विकलेला माल बिलाशिवाय परत घेतला जाणार नाही.\n२. सर्व वाद स्थानिक न्यायालयाच्या अधिकार कक्षेत.",
  footerNote: "धन्यवाद! पुन्हा भेट द्या • Thank You! Visit Again!",
  showBarcode: true,
  cutterFeedLines: 2
};

export const PRESET_CONFIGS: Record<string, Partial<ThermalPrintConfig>> = {
  retail_standard: {
    paperWidth: "80mm",
    templatePreset: "retail_standard",
    headerGreeting: "|| श्री गणेशाय नमः ||",
    language: "bilingual",
    showLogo: true,
    showHsn: true,
    showBatch: true,
    showExpiry: true,
    showUpiQrCode: true,
    showSavingsBanner: true,
    showTerms: true
  },
  supermarket_compact: {
    paperWidth: "80mm",
    templatePreset: "supermarket_compact",
    headerGreeting: "WELCOME TO SUPERMARKET",
    language: "en",
    showLogo: true,
    showHsn: false,
    showBatch: false,
    showExpiry: false,
    itemSpacing: "compact",
    showUpiQrCode: true,
    showSavingsBanner: true,
    showBarcode: true
  },
  medical_batch: {
    paperWidth: "80mm",
    templatePreset: "medical_batch",
    headerGreeting: "|| श्री स्वामी समर्थ ||",
    language: "bilingual",
    showDrugLicense: true,
    showBatch: true,
    showExpiry: true,
    showHsn: true,
    showGstPercent: true,
    showTaxBreakdown: true,
    showUpiQrCode: true
  },
  restaurant_kot: {
    paperWidth: "58mm",
    templatePreset: "restaurant_kot",
    headerGreeting: "THANK YOU FOR DINING",
    language: "en",
    showLogo: false,
    showHsn: false,
    showBatch: false,
    showExpiry: false,
    showFssai: true,
    showUpiQrCode: true,
    showTaxBreakdown: false
  },
  minimal: {
    paperWidth: "58mm",
    templatePreset: "minimal",
    headerGreeting: "",
    language: "en",
    showLogo: false,
    showHsn: false,
    showBatch: false,
    showExpiry: false,
    showGstPercent: false,
    showTaxBreakdown: false,
    showUpiQrCode: false,
    showTerms: false,
    showBarcode: false,
    itemSpacing: "compact"
  }
};

interface ThermalDesignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: BusinessProfile;
  onSaveConfig: (updatedConfig: ThermalPrintConfig) => Promise<void>;
  sampleInvoice?: Invoice;
}

export default function ThermalDesignerModal({
  isOpen,
  onClose,
  business,
  onSaveConfig,
  sampleInvoice
}: ThermalDesignerModalProps) {
  const [config, setConfig] = useState<ThermalPrintConfig>(() => ({
    ...DEFAULT_THERMAL_CONFIG,
    ...(business.thermalConfig || {}),
    upiId: (business.thermalConfig?.upiId || business.upiId) || (business.phone ? `${business.phone}@upi` : ""),
    upiMerchantName: (business.thermalConfig?.upiMerchantName || business.upiMerchantName) || business.name || "BillingOnHand Store",
    bankName: business.thermalConfig?.bankName || business.bankName || "",
    bankAccountNo: business.thermalConfig?.bankAccountNo || business.bankAccountNo || "",
    bankIfsc: business.thermalConfig?.bankIfsc || business.bankIfsc || "",
    bankBranch: business.thermalConfig?.bankBranch || business.bankBranch || "",
    showBankDetails: business.thermalConfig?.showBankDetails ?? business.showBankDetails ?? false
  }));

  // Re-sync config whenever modal is opened or business profile changes
  useEffect(() => {
    if (isOpen) {
      setConfig({
        ...DEFAULT_THERMAL_CONFIG,
        ...(business.thermalConfig || {}),
        upiId: (business.thermalConfig?.upiId || business.upiId) || (business.phone ? `${business.phone}@upi` : ""),
        upiMerchantName: (business.thermalConfig?.upiMerchantName || business.upiMerchantName) || business.name || "BillingOnHand Store",
        bankName: business.thermalConfig?.bankName || business.bankName || "",
        bankAccountNo: business.thermalConfig?.bankAccountNo || business.bankAccountNo || "",
        bankIfsc: business.thermalConfig?.bankIfsc || business.bankIfsc || "",
        bankBranch: business.thermalConfig?.bankBranch || business.bankBranch || "",
        showBankDetails: business.thermalConfig?.showBankDetails ?? business.showBankDetails ?? false
      });
    }
  }, [isOpen, business]);

  const [activeTab, setActiveTab] = useState<'presets' | 'header' | 'customer' | 'items' | 'totals' | 'footer'>('presets');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sample dummy invoice data for live realistic rendering if no live invoice is provided
  const dummyInvoice: Invoice = sampleInvoice || {
    id: "inv_sample_thermal",
    invoiceNumber: "INV-2026-089",
    date: new Date().toISOString().split("T")[0],
    partyId: "p_1",
    partyName: "राजेश पाटील (Rajesh Patil)",
    partyGstin: "27AABCP1234F1Z5",
    type: "sale",
    items: [
      {
        itemId: "it_1",
        itemName: "फॉर्च्युन सनफ्लॉवर तेल (1L)",
        hsn: "1512",
        quantity: 2,
        unit: "LTR",
        price: 160,
        gstRate: 5,
        discount: 10,
        amountBeforeTax: 304.76,
        taxAmount: 15.24,
        cgst: 7.62,
        sgst: 7.62,
        igst: 0,
        totalAmount: 320,
        batchNumber: "F-OCT26",
        expiryDate: "2027-04"
      },
      {
        itemId: "it_2",
        itemName: "पतंजली गायीचे तूप (500g)",
        hsn: "0405",
        quantity: 1,
        unit: "PCS",
        price: 350,
        gstRate: 12,
        discount: 20,
        amountBeforeTax: 294.64,
        taxAmount: 35.36,
        cgst: 17.68,
        sgst: 17.68,
        igst: 0,
        totalAmount: 330,
        batchNumber: "P-882",
        expiryDate: "2027-02"
      },
      {
        itemId: "it_3",
        itemName: "टाटा मीठ (Tata Salt 1kg)",
        hsn: "2501",
        quantity: 3,
        unit: "PCS",
        price: 28,
        gstRate: 0,
        discount: 0,
        amountBeforeTax: 84,
        taxAmount: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalAmount: 84
      }
    ],
    subtotal: 683.4,
    taxAmount: 50.6,
    cgstTotal: 25.3,
    sgstTotal: 25.3,
    igstTotal: 0,
    totalAmount: 734,
    paymentType: "cash",
    paidAmount: 734,
    remainingAmount: 0,
    notes: "Home Delivery Request"
  };

  const updateConfig = (key: keyof ThermalPrintConfig, val: any) => {
    setConfig(prev => ({ ...prev, [key]: val }));
  };

  const applyPreset = (presetKey: string) => {
    const preset = PRESET_CONFIGS[presetKey];
    if (preset) {
      setConfig(prev => ({ ...prev, ...preset, templatePreset: presetKey as any }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveConfig(config);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error("Save thermal config error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintTestSlip = () => {
    printThermalElement("thermal-receipt-preview", config.paperWidth);
  };

  // Generate UPI QR String: upi://pay?pa=VPA&pn=NAME&am=AMOUNT&cu=INR
  const upiVpa = config.upiId || (business.phone ? `${business.phone}@upi` : "store@upi");
  const upiName = encodeURIComponent(config.upiMerchantName || business.name || "Store");
  const upiQrPayload = `upi://pay?pa=${upiVpa}&pn=${upiName}&am=${dummyInvoice.totalAmount}&cu=INR&tn=Bill-${dummyInvoice.invoiceNumber}`;
  const upiQrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiQrPayload)}`;

  if (!isOpen) return null;

  return createPortal(
    <div
      id="thermal-designer-portal"
      className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:block"
    >
      <style>{`
        @media print {
          @page {
            size: ${config.paperWidth === "58mm" ? "58mm auto" : "80mm auto"};
            margin: 0 !important;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            font-size: ${config.paperWidth === "58mm" ? "9px" : "10px"} !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body > #root {
            display: none !important;
            height: 0 !important;
            min-height: 0 !important;
            overflow: hidden !important;
          }
          *, *::before, *::after {
            box-shadow: none !important;
            -webkit-box-shadow: none !important;
            text-shadow: none !important;
          }
          #thermal-designer-header,
          #thermal-designer-controls,
          #thermal-designer-footer,
          #thermal-designer-preview-header,
          .print\\:hidden,
          .no-print {
            display: none !important;
          }
          #thermal-designer-portal {
            position: static !important;
            inset: auto !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            display: block !important;
            width: 100% !important;
          }
          #thermal-designer-modal-box {
            position: static !important;
            background: #ffffff !important;
            border: none !important;
            box-shadow: none !important;
            max-width: none !important;
            max-height: none !important;
            width: 100% !important;
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          #thermal-designer-preview-wrapper {
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            display: block !important;
            border: none !important;
            box-shadow: none !important;
          }
          #thermal-receipt-preview {
            margin: 0 auto !important;
            padding: 2mm 3mm !important;
            border: none !important;
            border-top: none !important;
            box-shadow: none !important;
            -webkit-box-shadow: none !important;
            border-radius: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            width: ${config.paperWidth === "58mm" ? "52mm" : "74mm"} !important;
            max-width: ${config.paperWidth === "58mm" ? "52mm" : "74mm"} !important;
            display: block !important;
          }
        }
      `}</style>

      <div
        id="thermal-designer-modal-box"
        className="bg-white rounded-2xl max-w-6xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] print:shadow-none print:border-none print:max-h-none print:w-full print:block"
      >
        
        {/* Header Bar */}
        <div
          id="thermal-designer-header"
          className="bg-linear-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0 print:hidden"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shadow-inner">
              <Printer className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold tracking-tight">Custom Thermal Bill Designer</h2>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                  58mm & 80mm
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                सानुकूल थर्मल प्रिंटर लेआउट, लोगो, QR कोड, आणि मराठी/इंग्रजी पावती एडिटर
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Content (Split View: Controls on Left, Realistic Live Preview on Right) */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          
          {/* LEFT: Configuration Tabs & Controls */}
          <div
            id="thermal-designer-controls"
            className="w-full lg:w-3/5 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col overflow-hidden bg-slate-50/50 print:hidden"
          >
            
            {/* Tab Navigation */}
            <div className="bg-slate-100 p-2 border-b border-slate-200 flex items-center gap-1 overflow-x-auto shrink-0 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('presets')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'presets' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Presets (थीम्स)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('header')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'header' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Header (शीर्षक)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('customer')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'customer' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Customer & Meta</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('items')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'items' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Items Table</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('totals')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'totals' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Percent className="w-3.5 h-3.5" />
                <span>Totals & Tax</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('footer')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'footer' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>UPI QR & Footer</span>
              </button>
            </div>

            {/* Scrollable Controls Area */}
            <div className="p-5 overflow-y-auto flex-1 space-y-5 text-xs">
              
              {/* TAB: Presets & Paper Width */}
              {activeTab === 'presets' && (
                <div className="space-y-4">
                  <div className="p-4 bg-indigo-50/60 border border-indigo-200/80 rounded-xl space-y-3">
                    <h4 className="font-bold text-indigo-950 flex items-center space-x-1.5">
                      <Sliders className="w-4 h-4 text-indigo-600" />
                      <span>Printer Hardware & Page Dimensions</span>
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Paper Width</label>
                        <select
                          value={config.paperWidth}
                          onChange={(e) => updateConfig('paperWidth', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold"
                        >
                          <option value="80mm">80mm (3-inch Standard POS Printer)</option>
                          <option value="58mm">58mm (2-inch Portable Bluetooth/USB Printer)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Receipt Language</label>
                        <select
                          value={config.language}
                          onChange={(e) => updateConfig('language', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold"
                        >
                          <option value="bilingual">मराठी + English (Bilingual Standard)</option>
                          <option value="mr">केवळ मराठी (Marathi Only)</option>
                          <option value="en">English Only</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2 flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Ready-Made Industry Templates (१-क्लिक लेआउट)</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { key: "retail_standard", title: "🛒 Retail & Grocery Standard", desc: "Logo, Greeting, HSN, Batch, Savings Banner, UPI QR" },
                        { key: "supermarket_compact", title: "🏬 Supermarket Speed POS", desc: "Compact lines, barcode at bottom, quick scan checkout" },
                        { key: "medical_batch", title: "💊 Medical & Pharmacy Batch", desc: "Batch No, Expiry, Drug License, Tax summary table" },
                        { key: "restaurant_kot", title: "🍽️ Restaurant & Cafe Receipt", desc: "58mm compact, Table & Token details, Greeting" },
                        { key: "minimal", title: "🧾 Ultra-Minimal Paper Saver", desc: "No graphics, purely condensed item amounts for 2-inch roll" }
                      ].map((tpl) => (
                        <button
                          key={tpl.key}
                          type="button"
                          onClick={() => applyPreset(tpl.key)}
                          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                            config.templatePreset === tpl.key
                              ? "bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-200"
                              : "bg-white border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-xs">{tpl.title}</span>
                            {config.templatePreset === tpl.key && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">{tpl.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: Header Configuration */}
              {activeTab === 'header' && (
                <div className="space-y-4">
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-800 text-xs border-b pb-2">Header Greeting & Branding</h4>
                    
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Auspicious Greeting / Religious Top Line</label>
                      <input
                        type="text"
                        value={config.headerGreeting}
                        onChange={(e) => updateConfig('headerGreeting', e.target.value)}
                        placeholder="e.g. || श्री गणेशाय नमः || or WELCOME"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.showLogo}
                          onChange={(e) => updateConfig('showLogo', e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600"
                        />
                        <span className="font-semibold text-slate-700">Show Store Logo</span>
                      </label>

                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.showBusinessName}
                          onChange={(e) => updateConfig('showBusinessName', e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600"
                        />
                        <span className="font-semibold text-slate-700">Show Shop / Firm Name</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.showAddress}
                          onChange={(e) => updateConfig('showAddress', e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600"
                        />
                        <span className="text-slate-700">Show Shop Address</span>
                      </label>

                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.showPhone}
                          onChange={(e) => updateConfig('showPhone', e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600"
                        />
                        <span className="text-slate-700">Show Contact Phone</span>
                      </label>

                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.showGstin}
                          onChange={(e) => updateConfig('showGstin', e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600"
                        />
                        <span className="text-slate-700">Show GSTIN</span>
                      </label>

                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.showDrugLicense}
                          onChange={(e) => updateConfig('showDrugLicense', e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600"
                        />
                        <span className="text-slate-700">Show Drug License No</span>
                      </label>

                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.showFssai}
                          onChange={(e) => updateConfig('showFssai', e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600"
                        />
                        <span className="text-slate-700">Show FSSAI No</span>
                      </label>

                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.showEmail}
                          onChange={(e) => updateConfig('showEmail', e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600"
                        />
                        <span className="text-slate-700">Show Store Email</span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Custom Header Subtitle / Tagline</label>
                      <input
                        type="text"
                        value={config.customHeaderNote || ""}
                        onChange={(e) => updateConfig('customHeaderNote', e.target.value)}
                        placeholder="e.g. सर्व प्रकारच्या किराणा व धान्याचे ठोक व किरकोळ विक्रेते"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: Customer & Meta Info */}
              {activeTab === 'customer' && (
                <div className="space-y-4">
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-800 text-xs border-b pb-2">Bill Metadata & Customer Details</h4>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.showBillNo}
                          onChange={(e) => updateConfig('showBillNo', e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600"
                        />
                        <span className="text-slate-700 font-semibold">Show Bill No</span>
                      </label>

                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.showDate}
                          onChange={(e) => updateConfig('showDate', e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600"
                        />
                        <span className="text-slate-700">Show Bill Date</span>
                      </label>

                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.showTime}
                          onChange={(e) => updateConfig('showTime', e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600"
                        />
                        <span className="text-slate-700">Show Time Stamp</span>
                      </label>

                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.showCashierName}
                          onChange={(e) => updateConfig('showCashierName', e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600"
                        />
                        <span className="text-slate-700">Show Cashier / Operator</span>
                      </label>

                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.showCustomerName}
                          onChange={(e) => updateConfig('showCustomerName', e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600"
                        />
                        <span className="text-slate-700 font-semibold">Show Customer Name</span>
                      </label>

                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.showCustomerPhone}
                          onChange={(e) => updateConfig('showCustomerPhone', e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600"
                        />
                        <span className="text-slate-700">Show Customer Mobile</span>
                      </label>

                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.showCustomerGstin}
                          onChange={(e) => updateConfig('showCustomerGstin', e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600"
                        />
                        <span className="text-slate-700">Show Customer GSTIN</span>
                      </label>

                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.showTotalBalance}
                          onChange={(e) => updateConfig('showTotalBalance', e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600"
                        />
                        <span className="text-slate-700">Show Total Khata Balance</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: Item Table Configuration */}
              {activeTab === 'items' && (
                <div className="space-y-4">
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-800 text-xs border-b pb-2">Line Items Table Formatting</h4>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.showItemIndex}
                          onChange={(e) => updateConfig('showItemIndex', e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600"
                        />
                        <span className="text-slate-700">Show Serial Numbers (#)</span>
                      </label>

                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.showRate}
                          onChange={(e) => updateConfig('showRate', e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600"
                        />
                        <span className="text-slate-700">Show Unit Rate (दर)</span>
                      </label>

                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.showHsn}
                          onChange={(e) => updateConfig('showHsn', e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600"
                        />
                        <span className="text-slate-700">Show HSN Codes</span>
                      </label>

                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.showBatch}
                          onChange={(e) => updateConfig('showBatch', e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600"
                        />
                        <span className="text-slate-700">Show Batch Number</span>
                      </label>

                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.showExpiry}
                          onChange={(e) => updateConfig('showExpiry', e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600"
                        />
                        <span className="text-slate-700">Show Expiry Date</span>
                      </label>

                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.showGstPercent}
                          onChange={(e) => updateConfig('showGstPercent', e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600"
                        />
                        <span className="text-slate-700">Show GST % per item</span>
                      </label>

                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.showDiscount}
                          onChange={(e) => updateConfig('showDiscount', e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600"
                        />
                        <span className="text-slate-700">Show Item Discounts</span>
                      </label>

                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.wrapItemName}
                          onChange={(e) => updateConfig('wrapItemName', e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600"
                        />
                        <span className="text-slate-700">Wrap Long Product Names</span>
                      </label>
                    </div>

                    <div className="pt-2">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Item Row Spacing</label>
                      <select
                        value={config.itemSpacing}
                        onChange={(e) => updateConfig('itemSpacing', e.target.value as any)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="comfortable">Comfortable Spacing (वाचायला सोपे)</option>
                        <option value="compact">Ultra-Compact (कमी कागद खर्च)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: Totals & Tax */}
              {activeTab === 'totals' && (
                <div className="space-y-4">
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-800 text-xs border-b pb-2">Calculations, Tax & Savings Banner</h4>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.showTaxBreakdown}
                          onChange={(e) => updateConfig('showTaxBreakdown', e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600"
                        />
                        <span className="text-slate-700 font-semibold">Show CGST & SGST Split</span>
                      </label>

                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.showSavingsBanner}
                          onChange={(e) => updateConfig('showSavingsBanner', e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600"
                        />
                        <span className="text-slate-700 font-semibold">Show "You Saved ₹X" Banner</span>
                      </label>

                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.showPaymentMode}
                          onChange={(e) => updateConfig('showPaymentMode', e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600"
                        />
                        <span className="text-slate-700">Show Payment Mode (Cash/UPI/Khata)</span>
                      </label>

                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.showChangeReturned}
                          onChange={(e) => updateConfig('showChangeReturned', e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600"
                        />
                        <span className="text-slate-700">Show Change Due to Customer</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: Footer, Dynamic UPI QR Code & Barcode */}
              {activeTab === 'footer' && (
                <div className="space-y-4">
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-800 text-xs border-b pb-2">Dynamic UPI QR Code & Bank Settlement</h4>

                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.showUpiQrCode}
                        onChange={(e) => updateConfig('showUpiQrCode', e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600"
                      />
                      <span className="text-slate-900 font-bold">Print Dynamic Scan-to-Pay UPI QR Code on Receipts</span>
                    </label>

                    {config.showUpiQrCode && (
                      <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/60 border border-blue-200/80 rounded-xl">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Merchant UPI ID (VPA)</label>
                          <input
                            type="text"
                            value={config.upiId || ""}
                            onChange={(e) => updateConfig('upiId', e.target.value.trim())}
                            placeholder="e.g. 9876543210@okaxis or yourstore@ybl"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Payee Name in UPI Apps</label>
                          <input
                            type="text"
                            value={config.upiMerchantName || ""}
                            onChange={(e) => updateConfig('upiMerchantName', e.target.value)}
                            placeholder="e.g. Ganpati Trading Co."
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                          />
                        </div>
                      </div>
                    )}

                    {/* Bank Details Configuration */}
                    <div className="pt-2 border-t border-slate-200">
                      <label className="flex items-center space-x-2 cursor-pointer mb-2">
                        <input
                          type="checkbox"
                          checked={config.showBankDetails}
                          onChange={(e) => updateConfig('showBankDetails', e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600"
                        />
                        <span className="text-slate-900 font-bold">Print Bank Account Details on Receipts</span>
                      </label>

                      {config.showBankDetails && (
                        <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">बँकेचे नाव (Bank Name)</label>
                            <input
                              type="text"
                              value={config.bankName || ""}
                              onChange={(e) => updateConfig('bankName', e.target.value)}
                              placeholder="उदा. State Bank of India"
                              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">खाते क्रमांक (Account Number)</label>
                            <input
                              type="text"
                              value={config.bankAccountNo || ""}
                              onChange={(e) => updateConfig('bankAccountNo', e.target.value)}
                              placeholder="उदा. 30123456789"
                              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-mono font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">IFSC कोड (IFSC Code)</label>
                            <input
                              type="text"
                              value={config.bankIfsc || ""}
                              onChange={(e) => updateConfig('bankIfsc', e.target.value.toUpperCase())}
                              placeholder="उदा. SBIN0001234"
                              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-mono font-bold uppercase"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">बँक शाखा (Branch)</label>
                            <input
                              type="text"
                              value={config.bankBranch || ""}
                              onChange={(e) => updateConfig('bankBranch', e.target.value)}
                              placeholder="उदा. Main Market Branch"
                              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Terms & Conditions (अटी व शर्ती)</label>
                      <textarea
                        rows={2}
                        value={config.termsAndConditions}
                        onChange={(e) => updateConfig('termsAndConditions', e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Footer Farewell Message</label>
                      <input
                        type="text"
                        value={config.footerNote}
                        onChange={(e) => updateConfig('footerNote', e.target.value)}
                        placeholder="e.g. धन्यवाद! पुन्हा भेट द्या • Thank You! Visit Again!"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.showBarcode}
                          onChange={(e) => updateConfig('showBarcode', e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600"
                        />
                        <span className="text-slate-700">Print Bill Barcode at Bottom</span>
                      </label>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">Paper Cut Feed Lines</label>
                        <input
                          type="number"
                          min={1}
                          max={6}
                          value={config.cutterFeedLines}
                          onChange={(e) => updateConfig('cutterFeedLines', parseInt(e.target.value) || 2)}
                          className="w-20 px-2 py-1 border border-slate-300 rounded font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* RIGHT: Live Realistic Thermal Receipt Simulator */}
          <div
            id="thermal-designer-preview-wrapper"
            className="w-full lg:w-2/5 p-4 sm:p-6 bg-slate-200/90 overflow-y-auto flex flex-col items-center justify-start shrink-0 print:bg-white print:p-0 print:m-0 print:w-full print:block"
          >
            <div
              id="thermal-designer-preview-header"
              className="w-full flex items-center justify-between mb-3 text-xs print:hidden"
            >
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-indigo-600" />
                <span>Live Thermal Slip Simulator ({config.paperWidth})</span>
              </span>

              <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border text-slate-500">
                {config.paperWidth === "58mm" ? "32 Chars/Line" : "48 Chars/Line"}
              </span>
            </div>

            {/* Simulated Paper Roll Dispenser (Preview only) */}
            <div className={`h-2 bg-slate-400 rounded-t-md print:hidden shrink-0 ${config.paperWidth === "58mm" ? "w-[260px]" : "w-[340px]"}`} />

            {/* Clean Thermal Receipt Slip (Borderless in print) */}
            <div
              id="thermal-receipt-preview"
              className={`bg-white text-black p-4 sm:p-5 rounded-b-sm border border-slate-200 font-mono text-xs transition-all duration-300 select-none print:border-none print:shadow-none print:p-0 print:m-0 print:w-full ${
                config.paperWidth === "58mm" ? "w-[260px] text-[10px]" : "w-[340px] text-[11px]"
              }`}
              style={{
                fontFamily: config.fontFamily === "monospace" ? "'Courier New', Courier, monospace" : "inherit",
                lineHeight: "1.3"
              }}
            >
              
              {/* Auspicious Top Greeting */}
              {config.headerGreeting && (
                <div className="text-center font-bold text-[10px] tracking-wider mb-1">
                  {config.headerGreeting}
                </div>
              )}

              {/* Store Logo */}
              {config.showLogo && business.logoUrl && (
                <div className="flex justify-center mb-1.5">
                  <img
                    src={business.logoUrl}
                    alt="Logo"
                    className="object-contain max-h-12 filter grayscale contrast-200"
                  />
                </div>
              )}

              {/* Shop Name & Header */}
              {config.showBusinessName && (
                <div className="text-center font-black text-sm uppercase tracking-tight mb-0.5">
                  {business.name || "BILLING ON HAND STORE"}
                </div>
              )}

              {config.customHeaderNote && (
                <div className="text-center text-[9.5px] italic text-slate-600 mb-1">
                  {config.customHeaderNote}
                </div>
              )}

              <div className="text-center text-[10px] space-y-0.5 text-slate-700">
                {config.showAddress && <p className="leading-tight">{business.address || "Main Market, City"}</p>}
                {config.showPhone && <p>Ph: {business.phone || "9876543210"}</p>}
                {config.showGstin && business.gstin && <p className="font-bold">GSTIN: {business.gstin}</p>}
                {config.showDrugLicense && business.drugLicenseNo && <p>D.L. No: {business.drugLicenseNo}</p>}
                {config.showFssai && business.fssaiNo && <p>FSSAI: {business.fssaiNo}</p>}
              </div>

              {/* Divider */}
              <div className="border-t border-dashed border-black my-2"></div>

              {/* Invoice & Customer Meta */}
              <div className="text-[10px] space-y-0.5">
                <div className="flex justify-between">
                  {config.showBillNo && <span><strong>Bill:</strong> #{dummyInvoice.invoiceNumber}</span>}
                  {config.showDate && <span>{dummyInvoice.date}</span>}
                </div>
                {config.showTime && (
                  <div className="flex justify-between text-slate-600 text-[9px]">
                    <span>Time: 12:45 PM</span>
                    {config.showCashierName && <span>Cashier: Admin</span>}
                  </div>
                )}
                {config.showCustomerName && (
                  <div className="pt-0.5 font-bold text-slate-900">
                    <span>Cust: {dummyInvoice.partyName}</span>
                  </div>
                )}
                {config.showCustomerGstin && dummyInvoice.partyGstin && (
                  <div className="text-[9px]">
                    <span>GSTIN: {dummyInvoice.partyGstin}</span>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-dashed border-black my-2"></div>

              {/* Items Table Header */}
              <div className="flex justify-between font-bold text-[10px] border-b border-black pb-0.5">
                <span>{config.language === "mr" ? "तपशील / वस्तू" : "Item Description"}</span>
                <span>{config.language === "mr" ? "रक्कम" : "Amount"}</span>
              </div>

              {/* Items Rows */}
              <div className={`space-y-${config.itemSpacing === "compact" ? "1" : "1.5"} py-1.5`}>
                {dummyInvoice.items.map((it, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="font-bold text-black flex items-baseline justify-between">
                      <span className={config.wrapItemName ? "break-words leading-tight" : "truncate"}>
                        {config.showItemIndex ? `${idx + 1}. ` : ""}{it.itemName}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-700 pl-2">
                      <span>
                        {it.quantity} x ₹{it.price.toFixed(2)}
                        {config.showGstPercent && it.gstRate ? ` [${it.gstRate}%]` : ""}
                      </span>
                      <span className="font-bold font-mono">₹{it.totalAmount.toFixed(2)}</span>
                    </div>
                    {(config.showBatch && it.batchNumber || config.showExpiry && it.expiryDate || config.showHsn && it.hsn) && (
                      <div className="text-[9px] text-slate-600 pl-2 flex flex-wrap gap-1 font-mono">
                        {config.showHsn && it.hsn && <span>HSN:{it.hsn}</span>}
                        {config.showBatch && it.batchNumber && <span>B:{it.batchNumber}</span>}
                        {config.showExpiry && it.expiryDate && <span>Exp:{it.expiryDate}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Totals Divider */}
              <div className="border-t border-dashed border-black my-2"></div>

              {/* Totals Breakdown */}
              <div className="text-[10.5px] space-y-0.5">
                <div className="flex justify-between">
                  <span>Subtotal (Taxable):</span>
                  <span>₹{dummyInvoice.subtotal.toFixed(2)}</span>
                </div>
                {config.showTaxBreakdown && (
                  <>
                    <div className="flex justify-between text-[10px]">
                      <span>CGST Total:</span>
                      <span>₹{(dummyInvoice.cgstTotal || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span>SGST Total:</span>
                      <span>₹{(dummyInvoice.sgstTotal || 0).toFixed(2)}</span>
                    </div>
                  </>
                )}
                
                {/* Hero Grand Total */}
                <div className="border-t-2 border-black my-1 pt-1 flex justify-between font-black text-xs">
                  <span>{config.language === "mr" ? "एकूण रक्कम (TOTAL):" : "GRAND TOTAL:"}</span>
                  <span className="text-sm font-mono">₹{dummyInvoice.totalAmount.toFixed(2)}</span>
                </div>

                {config.showPaymentMode && (
                  <div className="flex justify-between text-[10px] text-slate-700">
                    <span>Paid Mode: CASH</span>
                    <span>Paid: ₹{dummyInvoice.paidAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Savings Banner */}
              {config.showSavingsBanner && (
                <div className="my-2 p-1 border border-black text-center font-bold text-[10px]">
                  ★ You Saved ₹30.00 Today! ★
                </div>
              )}

              {/* Dynamic Scan-to-Pay UPI QR Code */}
              {config.showUpiQrCode && (
                <div className="my-3 text-center flex flex-col items-center justify-center p-2 border border-dashed border-slate-400 rounded-sm">
                  <p className="font-bold text-[10px] uppercase mb-1">Scan & Pay via UPI</p>
                  <img
                    src={upiQrImgUrl}
                    alt="UPI QR Code"
                    className="w-24 h-24 object-contain"
                  />
                  <p className="text-[8.5px] text-slate-600 font-mono mt-1">{upiVpa}</p>
                </div>
              )}

              {/* Bank Account Settlement Details */}
              {config.showBankDetails && (config.bankName || config.bankAccountNo) && (
                <div className="my-2 p-1.5 border border-dashed border-black rounded-xs text-[9px] font-mono leading-tight bg-white">
                  <p className="font-bold uppercase text-[9px] mb-0.5 text-center">Bank Account Details</p>
                  {config.bankName && <p><strong>Bank:</strong> {config.bankName}</p>}
                  {config.bankAccountNo && <p><strong>A/C:</strong> {config.bankAccountNo}</p>}
                  {config.bankIfsc && <p><strong>IFSC:</strong> {config.bankIfsc}</p>}
                  {config.bankBranch && <p><strong>Branch:</strong> {config.bankBranch}</p>}
                </div>
              )}

              {/* Terms & Conditions */}
              {config.showTerms && config.termsAndConditions && (
                <div className="text-[8.5px] text-slate-600 my-2 leading-tight border-t border-dashed border-black pt-1">
                  <p className="font-bold uppercase text-[9px]">Terms & Conditions:</p>
                  <p className="whitespace-pre-line">{config.termsAndConditions}</p>
                </div>
              )}

              {/* Farewell Footer */}
              {config.footerNote && (
                <div className="text-center font-bold text-[9.5px] my-2">
                  {config.footerNote}
                </div>
              )}

              {/* Barcode representation */}
              {config.showBarcode && (
                <div className="text-center my-2">
                  <div className="font-mono text-base tracking-widest leading-none font-bold">
                    |||||| | |||| ||||| | |||||
                  </div>
                  <p className="text-[8px] font-mono">{dummyInvoice.invoiceNumber}</p>
                </div>
              )}

              {/* Feed spacer for scissors cut */}
              <div style={{ height: `${(config.cutterFeedLines || 2) * 12}px` }}></div>

            </div>
          </div>

        </div>

        {/* Modal Bottom Action Bar */}
        <div
          id="thermal-designer-footer"
          className="bg-slate-50 border-t border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 print:hidden"
        >
          <div className="flex items-center space-x-2 text-xs text-slate-600">
            {savedSuccess && (
              <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full font-bold flex items-center gap-1 animate-bounce">
                <Check className="w-3.5 h-3.5" />
                <span>थर्मल लेआउट यशस्वीरीत्या सेव्ह झाला!</span>
              </span>
            )}
            {!savedSuccess && (
              <span>थर्मल डिझाइन बदलल्यास ते आपोआप सर्व बिलांवर लागू होईल.</span>
            )}
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setConfig(DEFAULT_THERMAL_CONFIG)}
              className="px-3.5 py-2 text-slate-600 hover:text-slate-900 border border-slate-300 rounded-xl font-bold text-xs flex items-center justify-center space-x-1 hover:bg-slate-100 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>

            <button
              type="button"
              onClick={handlePrintTestSlip}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print Test Slip</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? "Saving..." : "Save Thermal Layout"}</span>
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
