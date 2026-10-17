/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Item, BusinessProfile, BarcodeEntry } from "../types";
import { BarcodeSvg } from "../utils/barcodeUtils";
import { Printer, X, Check, Copy, Tag, Sliders, Layers, Sparkles } from "lucide-react";

interface BarcodePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item | null;
  business?: BusinessProfile;
}

export default function BarcodePrintModal({
  isOpen,
  onClose,
  item,
  business
}: BarcodePrintModalProps) {
  if (!isOpen || !item) return null;

  // Selected barcode from multiple barcodes
  const allBarcodes = Array.isArray(item.barcodes) && item.barcodes.length > 0 
    ? item.barcodes 
    : [item.id || "SAMPLE-1234"];
  
  const [selectedBarcode, setSelectedBarcode] = useState<string>(allBarcodes[0] || "");
  const [copies, setCopies] = useState<number>(Math.max(1, Math.min(item.stockQuantity || 1, 100)));
  const [labelSize, setLabelSize] = useState<"thermal_50x25" | "thermal_38x25" | "thermal_50x30" | "a4_sheet">("thermal_50x25");
  const [showBusinessName, setShowBusinessName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showItemName, setShowItemName] = useState(true);
  const [priceType, setPriceType] = useState<"salePrice" | "wholesalePrice">("salePrice");

  const businessName = business?.name || "Retail Store";
  const displayPrice = priceType === "wholesalePrice" && item.wholesalePrice 
    ? item.wholesalePrice 
    : item.salePrice;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Print Product Barcode Labels</h3>
              <p className="text-xs text-slate-500">Configure sticker layout and print thermal labels for {item.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Barcode Selection if multiple barcodes exist */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-600" />
              Select Barcode to Print ({allBarcodes.length} Available)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {allBarcodes.map((code, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedBarcode(code)}
                  className={`px-3 py-2.5 rounded-xl border text-left text-xs font-mono transition flex items-center justify-between ${
                    selectedBarcode === code
                      ? "border-emerald-500 bg-emerald-50/60 text-emerald-900 font-bold ring-2 ring-emerald-500/20"
                      : "border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="truncate">{code}</span>
                  {selectedBarcode === code && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Label Customization Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                Label Format
              </label>
              <select
                value={labelSize}
                onChange={(e) => setLabelSize(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium bg-white outline-none focus:border-emerald-500"
              >
                <option value="thermal_50x25">Thermal Roll (50mm × 25mm)</option>
                <option value="thermal_38x25">Thermal Roll (38mm × 25mm)</option>
                <option value="thermal_50x30">Thermal Roll (50mm × 30mm)</option>
                <option value="a4_sheet">A4 Sheet (24 Labels / Page)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                Number of Stickers / Copies
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold bg-white outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setCopies(Math.max(1, Math.floor(item.stockQuantity || 1)))}
                  className="px-2.5 py-2 border border-slate-200 hover:bg-white text-[11px] font-medium text-slate-600 rounded-lg whitespace-nowrap shadow-sm"
                  title="Match current item stock"
                >
                  Stock ({item.stockQuantity || 0})
                </button>
              </div>
            </div>

            {/* Toggles */}
            <div className="sm:col-span-2 flex flex-wrap gap-4 pt-1">
              <label className="flex items-center space-x-2 cursor-pointer text-xs text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={showBusinessName}
                  onChange={(e) => setShowBusinessName(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Store Name ({businessName})</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer text-xs text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={showItemName}
                  onChange={(e) => setShowItemName(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Product Name</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer text-xs text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Sale Price (₹{displayPrice.toFixed(2)})</span>
              </label>
            </div>
          </div>

          {/* Live Sticker Preview Box */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Live Sticker Preview
              </label>
              <span className="text-[11px] text-slate-400 font-mono">1 of {copies} Labels</span>
            </div>

            <div className="p-6 bg-slate-100 rounded-xl flex items-center justify-center border border-dashed border-slate-300">
              {/* Single Label Card Preview */}
              <div 
                className="bg-white border border-slate-300 shadow-md p-2.5 rounded-lg flex flex-col items-center justify-between text-center select-none"
                style={{ width: "220px", minHeight: "115px" }}
              >
                {showBusinessName && (
                  <p className="text-[10px] font-bold text-slate-800 uppercase tracking-wider truncate max-w-[200px] border-b border-slate-100 pb-0.5 w-full">
                    {businessName}
                  </p>
                )}

                {showItemName && (
                  <p className="text-[11px] font-bold text-slate-900 leading-tight truncate max-w-[200px] mt-1">
                    {item.name}
                  </p>
                )}

                <div className="my-1 w-full flex justify-center">
                  <BarcodeSvg
                    value={selectedBarcode}
                    width={180}
                    height={40}
                    fontSize={10}
                    showText={true}
                  />
                </div>

                {showPrice && (
                  <div className="flex items-center justify-center gap-2 mt-0.5">
                    <span className="text-[9px] text-slate-500 font-medium">PRICE:</span>
                    <span className="text-xs font-extrabold text-slate-950 font-mono">
                      ₹{displayPrice.toFixed(2)}
                    </span>
                    {item.unit && <span className="text-[9px] text-slate-400">/{item.unit}</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/25 transition active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Print {copies} Label{copies > 1 ? "s" : ""}</span>
          </button>
        </div>

        {/* Hidden Printable Container for Window.print */}
        <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:z-[999999] print:p-0">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: ${labelSize === "a4_sheet" ? "A4 portrait" : "50mm 25mm"};
                margin: 0;
              }
              body * {
                visibility: hidden;
              }
              .printable-label-area, .printable-label-area * {
                visibility: visible;
              }
              .printable-label-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                display: flex;
                flex-wrap: wrap;
                align-content: flex-start;
              }
              .print-single-sticker {
                page-break-inside: avoid;
                break-inside: avoid;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-align: center;
                box-sizing: border-box;
                padding: 2mm;
                ${labelSize === "a4_sheet" ? "width: 33.33%; height: 35mm; border: 0.1mm dashed #ccc;" : "width: 100vw; height: 100vh;"}
              }
            }
          ` }} />
          <div className="printable-label-area">
            {Array.from({ length: copies }).map((_, i) => (
              <div key={i} className="print-single-sticker">
                {showBusinessName && (
                  <div style={{ fontSize: "8pt", fontWeight: "bold", textTransform: "uppercase" }}>
                    {businessName}
                  </div>
                )}
                {showItemName && (
                  <div style={{ fontSize: "8pt", fontWeight: "bold", marginTop: "1mm" }}>
                    {item.name}
                  </div>
                )}
                <div style={{ margin: "1mm 0" }}>
                  <BarcodeSvg
                    value={selectedBarcode}
                    width={170}
                    height={40}
                    fontSize={9}
                    showText={true}
                  />
                </div>
                {showPrice && (
                  <div style={{ fontSize: "9pt", fontWeight: "bold", fontFamily: "monospace" }}>
                    PRICE: ₹{displayPrice.toFixed(2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
