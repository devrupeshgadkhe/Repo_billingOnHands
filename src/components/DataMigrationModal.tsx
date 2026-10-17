/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import {
  Upload,
  Database,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Package,
  Users,
  Download,
  FileCheck,
  Check,
  RotateCcw
} from "lucide-react";
import { Item, Party } from "../types.js";

interface DataMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshDb?: () => Promise<void>;
  onImportCompleted?: () => Promise<void>;
  existingItems?: Item[];
  existingParties?: Party[];
}

export const DataMigrationModal: React.FC<DataMigrationModalProps> = ({
  isOpen,
  onClose,
  onRefreshDb,
  onImportCompleted,
  existingItems = [],
  existingParties = []
}) => {
  const [importType, setImportType] = useState<"items" | "parties">("items");
  const [step, setStep] = useState<"select_file" | "map_preview" | "done">("select_file");
  const [fileName, setFileName] = useState<string>("");
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importStats, setImportStats] = useState<{ total: number; added: number; updated: number }>({
    total: 0,
    added: 0,
    updated: 0
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCsvText = (csvText: string) => {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      throw new Error("CSV file must contain at least a header row and data rows.");
    }

    const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, "").toLowerCase());
    const dataRows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const rowRegex = /(?:^|,)(?:"([^"]*)"|([^,]*))/g;
      const values: string[] = [];
      let match;
      while ((match = rowRegex.exec(lines[i])) !== null) {
        let val = match[1] !== undefined ? match[1] : match[2];
        if (val !== undefined) values.push(val.trim());
      }

      if (values.length === 0 || values.every((v) => !v)) continue;

      if (importType === "items") {
        const itemObj: any = {
          name: "",
          hsn: "",
          purchasePrice: 0,
          salePrice: 0,
          mrp: 0,
          wholesalePrice: 0,
          stockQuantity: 0,
          unit: "PCS",
          gstRate: 0,
          brand: "",
          category: "",
          selected: true
        };

        headers.forEach((h, idx) => {
          const val = values[idx] || "";
          if (h.includes("name") || h.includes("item") || h.includes("product") || h.includes("description")) {
            if (!itemObj.name) itemObj.name = val;
          } else if (h.includes("hsn") || h.includes("sac")) {
            itemObj.hsn = val;
          } else if (h.includes("purchase") || h.includes("cost") || h.includes("buy")) {
            itemObj.purchasePrice = parseFloat(val) || 0;
          } else if (h.includes("sale") || h.includes("retail") || h.includes("rate") || h.includes("price")) {
            itemObj.salePrice = parseFloat(val) || 0;
          } else if (h.includes("mrp")) {
            itemObj.mrp = parseFloat(val) || 0;
          } else if (h.includes("wholesale") || h.includes("trade")) {
            itemObj.wholesalePrice = parseFloat(val) || 0;
          } else if (h.includes("stock") || h.includes("qty") || h.includes("quantity")) {
            itemObj.stockQuantity = parseFloat(val) || 0;
          } else if (h.includes("unit") || h.includes("uom")) {
            itemObj.unit = val.toUpperCase() || "PCS";
          } else if (h.includes("gst") || h.includes("tax")) {
            itemObj.gstRate = parseFloat(val) || 0;
          } else if (h.includes("brand") || h.includes("company")) {
            itemObj.brand = val;
          } else if (h.includes("category") || h.includes("group")) {
            itemObj.category = val;
          }
        });

        if (itemObj.name) {
          if (!itemObj.salePrice && itemObj.purchasePrice) itemObj.salePrice = itemObj.purchasePrice;
          if (!itemObj.mrp) itemObj.mrp = itemObj.salePrice;
          dataRows.push(itemObj);
        }
      } else {
        // Parties
        const partyObj: any = {
          name: "",
          type: "customer",
          phone: "",
          email: "",
          address: "",
          state: "Maharashtra",
          gstin: "",
          currentBalance: 0,
          selected: true
        };

        headers.forEach((h, idx) => {
          const val = values[idx] || "";
          if (h.includes("name") || h.includes("party") || h.includes("customer") || h.includes("supplier")) {
            if (!partyObj.name) partyObj.name = val;
          } else if (h.includes("type")) {
            partyObj.type = val.toLowerCase().includes("supp") ? "supplier" : "customer";
          } else if (h.includes("phone") || h.includes("mobile") || h.includes("contact")) {
            partyObj.phone = val;
          } else if (h.includes("gstin") || h.includes("gst")) {
            partyObj.gstin = val;
          } else if (h.includes("address") || h.includes("city")) {
            partyObj.address = val;
          } else if (h.includes("balance") || h.includes("opening") || h.includes("due")) {
            partyObj.currentBalance = parseFloat(val) || 0;
          }
        });

        if (partyObj.name) {
          dataRows.push(partyObj);
        }
      }
    }

    return dataRows;
  };

  const handleFileUpload = (file: File) => {
    if (!file) return;
    setErrorMessage(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        let rows: any[] = [];

        if (file.name.endsWith(".json")) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            rows = parsed.map((r) => ({ ...r, selected: true }));
          } else if (parsed.items && importType === "items") {
            rows = parsed.items.map((r: any) => ({ ...r, selected: true }));
          } else if (parsed.parties && importType === "parties") {
            rows = parsed.parties.map((r: any) => ({ ...r, selected: true }));
          }
        } else {
          rows = parseCsvText(text);
        }

        if (rows.length === 0) {
          throw new Error("No valid records found in file.");
        }

        setParsedRows(rows);
        setStep("map_preview");
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to read file.");
      }
    };
    reader.readAsText(file);
  };

  const downloadSampleTemplate = () => {
    let csvHeader = "";
    let csvSample = "";
    if (importType === "items") {
      csvHeader = "Item Name,Purchase Price,Sale Price,Wholesale Price,Stock Quantity,Unit,GST Rate,HSN,Brand,Category\n";
      csvSample =
        'Fertilizer 10:26:26 (50kg),1400,1470,1430,50,BAG,5,3105,Mahadhan,Fertilizer\n' +
        'Jeans Pants 32 Size,450,799,600,20,PCS,5,6203,Killer,Garments\n' +
        'Parle-G Biscuit 100g,8,10,9,100,PCS,0,1905,Parle,Kirana\n';
    } else {
      csvHeader = "Party Name,Type,Phone,GSTIN,Address,Opening Balance\n";
      csvSample =
        'Ramesh Patil,customer,9876543210,,At Post Vadgaon,15000\n' +
        'Shree Agro Traders,supplier,9822114455,27AAACG1234F1Z5,Pune Market Yard,0\n';
    }

    const blob = new Blob([csvHeader + csvSample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sample_${importType}_import_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const executeImport = async () => {
    const selectedRows = parsedRows.filter((r) => r.selected);
    if (selectedRows.length === 0) {
      setErrorMessage("Please select at least 1 record to import.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/migration/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: importType,
          data: selectedRows
        })
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Migration import failed.");
      }

      setImportStats({
        total: selectedRows.length,
        added: result.added || selectedRows.length,
        updated: result.updated || 0
      });

      if (onRefreshDb) await onRefreshDb();
      if (onImportCompleted) await onImportCompleted();
      setStep("done");
    } catch (err: any) {
      setErrorMessage(err.message || "Error importing data.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl">
              <Database className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <h2 className="text-base font-bold">Data Migration & Bulk Import</h2>
              <p className="text-[11px] text-indigo-100">Import master data directly from Tally, Marg ERP, Vyapar, Busy, or Excel</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition">
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

          {step === "select_file" && (
            <div className="space-y-6">
              {/* Type selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  1. Select Import Category:
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setImportType("items")}
                    className={`p-4 rounded-xl border-2 text-left flex items-start space-x-3 transition cursor-pointer ${
                      importType === "items"
                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-950"
                        : "border-slate-200 hover:border-slate-300 text-slate-700"
                    }`}
                  >
                    <Package className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-sm">Product Catalog (Inventory)</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Item names, purchase & retail prices, stock quantity, units, and HSN codes</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportType("parties")}
                    className={`p-4 rounded-xl border-2 text-left flex items-start space-x-3 transition cursor-pointer ${
                      importType === "parties"
                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-950"
                        : "border-slate-200 hover:border-slate-300 text-slate-700"
                    }`}
                  >
                    <Users className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-sm">Customers & Suppliers (Parties)</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Party names, phone numbers, addresses, GSTIN, and opening balances</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    2. Select CSV / Excel / JSON File:
                  </label>
                  <button
                    type="button"
                    onClick={downloadSampleTemplate}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Sample CSV Template</span>
                  </button>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-slate-50 rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv, .json, text/csv"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f);
                    }}
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <FileSpreadsheet className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Drag CSV file here or click to browse</p>
                    <p className="text-xs text-slate-500 mt-1">Directly supports CSV exported from Tally, Marg, Busy or Excel</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === "map_preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <FileCheck className="w-4 h-4 text-indigo-600" />
                  <span className="font-bold text-xs text-slate-800">
                    Import Preview ({parsedRows.filter((r) => r.selected).length}/{parsedRows.length} Records)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep("select_file");
                    setParsedRows([]);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1 font-semibold"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Choose Another File</span>
                </button>
              </div>

              {/* Preview table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 sticky top-0 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 text-center w-10">
                        <input
                          type="checkbox"
                          checked={parsedRows.every((r) => r.selected)}
                          onChange={(e) =>
                            setParsedRows((prev) => prev.map((r) => ({ ...r, selected: e.target.checked })))
                          }
                          className="accent-indigo-600 rounded"
                        />
                      </th>
                      {importType === "items" ? (
                        <>
                          <th className="p-2.5">Item Name</th>
                          <th className="p-2.5 text-right">Purchase Price</th>
                          <th className="p-2.5 text-right">Sale Price</th>
                          <th className="p-2.5 text-center">Stock Qty</th>
                          <th className="p-2.5 text-center">Unit</th>
                          <th className="p-2.5 text-center">HSN</th>
                        </>
                      ) : (
                        <>
                          <th className="p-2.5">Party Name</th>
                          <th className="p-2.5 text-center">Type</th>
                          <th className="p-2.5">Phone</th>
                          <th className="p-2.5">GSTIN</th>
                          <th className="p-2.5 text-right">Opening Balance</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} className={row.selected ? "bg-white hover:bg-slate-50" : "bg-slate-50/60 opacity-60"}>
                        <td className="p-2 text-center">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={() =>
                              setParsedRows((prev) => {
                                const copy = [...prev];
                                copy[idx] = { ...copy[idx], selected: !copy[idx].selected };
                                return copy;
                              })
                            }
                            className="accent-indigo-600 rounded"
                          />
                        </td>
                        {importType === "items" ? (
                          <>
                            <td className="p-2 font-bold text-slate-800">{row.name}</td>
                            <td className="p-2 text-right font-mono">₹{row.purchasePrice}</td>
                            <td className="p-2 text-right font-mono font-bold text-emerald-700">₹{row.salePrice}</td>
                            <td className="p-2 text-center font-mono">{row.stockQuantity}</td>
                            <td className="p-2 text-center font-mono font-semibold">{row.unit}</td>
                            <td className="p-2 text-center font-mono">{row.hsn || "-"}</td>
                          </>
                        ) : (
                          <>
                            <td className="p-2 font-bold text-slate-800">{row.name}</td>
                            <td className="p-2 text-center font-semibold">
                              <span className={`px-2 py-0.5 rounded text-[10px] ${row.type === "supplier" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                                {row.type === "supplier" ? "Supplier" : "Customer"}
                              </span>
                            </td>
                            <td className="p-2 font-mono">{row.phone || "-"}</td>
                            <td className="p-2 font-mono">{row.gstin || "-"}</td>
                            <td className="p-2 text-right font-mono font-bold text-rose-700">₹{row.currentBalance}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Data Imported Successfully!</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  A total of <strong>{importStats.total}</strong> records have been merged into your live database.
                </p>
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
            {step === "done" ? "Close" : "Cancel"}
          </button>

          {step === "map_preview" && (
            <button
              type="button"
              disabled={isProcessing || parsedRows.filter((r) => r.selected).length === 0}
              onClick={executeImport}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-2.5 px-6 rounded-xl text-xs tracking-wider uppercase transition cursor-pointer flex items-center space-x-2 shadow-md"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Importing Data...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Import Data ({parsedRows.filter((r) => r.selected).length} Records)</span>
                </>
              )}
            </button>
          )}

          {step === "done" && (
            <button
              type="button"
              onClick={onClose}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-xl text-xs uppercase shadow transition cursor-pointer"
            >
              Done
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
export default DataMigrationModal;
