/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import {
  Upload,
  FileSpreadsheet,
  Database,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Package,
  Users,
  FileText,
  RotateCcw,
  Check,
  HelpCircle,
  Download,
  FileCheck
} from "lucide-react";
import { Item, Party, UNITS, TAX_RATES } from "../types.js";

interface DataMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportCompleted: () => Promise<void>;
  existingItems?: Item[];
  existingParties?: Party[];
}

export const DataMigrationModal: React.FC<DataMigrationModalProps> = ({
  isOpen,
  onClose,
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
      throw new Error("CSV फाईलमध्ये किमान एक हेडर ओळ आणि डेटा ओळी असणे आवश्यक आहे.");
    }

    const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, "").toLowerCase());
    const dataRows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      // Basic CSV splitter respecting quotes
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
          if (h.includes("name") || h.includes("item") || h.includes("product") || h.includes("वस्तू") || h.includes("माल") || h.includes("description")) {
            if (!itemObj.name) itemObj.name = val;
          } else if (h.includes("hsn") || h.includes("sac")) {
            itemObj.hsn = val;
          } else if (h.includes("purchase") || h.includes("cost") || h.includes("खरेदी") || h.includes("buy")) {
            itemObj.purchasePrice = parseFloat(val) || 0;
          } else if (h.includes("sale") || h.includes("retail") || h.includes("विक्री") || h.includes("rate") || h.includes("price")) {
            itemObj.salePrice = parseFloat(val) || 0;
          } else if (h.includes("mrp")) {
            itemObj.mrp = parseFloat(val) || 0;
          } else if (h.includes("wholesale") || h.includes("घाऊक") || h.includes("trade")) {
            itemObj.wholesalePrice = parseFloat(val) || 0;
          } else if (h.includes("stock") || h.includes("qty") || h.includes("quantity") || h.includes("साठा") || h.includes("नग")) {
            itemObj.stockQuantity = parseFloat(val) || 0;
          } else if (h.includes("unit") || h.includes("युनिट") || h.includes("uom")) {
            itemObj.unit = val.toUpperCase() || "PCS";
          } else if (h.includes("gst") || h.includes("tax")) {
            itemObj.gstRate = parseFloat(val) || 0;
          } else if (h.includes("brand") || h.includes("ब्रँड") || h.includes("company")) {
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
          if (h.includes("name") || h.includes("party") || h.includes("customer") || h.includes("supplier") || h.includes("नाव")) {
            if (!partyObj.name) partyObj.name = val;
          } else if (h.includes("type") || h.includes("प्रकार")) {
            partyObj.type = val.toLowerCase().includes("supp") ? "supplier" : "customer";
          } else if (h.includes("phone") || h.includes("mobile") || h.includes("contact") || h.includes("फोन")) {
            partyObj.phone = val;
          } else if (h.includes("gstin") || h.includes("gst")) {
            partyObj.gstin = val;
          } else if (h.includes("address") || h.includes("पत्ता") || h.includes("city")) {
            partyObj.address = val;
          } else if (h.includes("balance") || h.includes("opening") || h.includes("उधारी") || h.includes("बाकी")) {
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
          throw new Error("फाईलमध्ये कोणतेही वैध रेकॉर्ड्स आढळले नाहीत.");
        }

        setParsedRows(rows);
        setStep("map_preview");
      } catch (err: any) {
        setErrorMessage(err.message || "फाईल वाचताना अडचण आली.");
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
        'महाधन १०:२६:२६ (50kg),1400,1470,1430,50,BAG,5,3105,Mahadhan,Fertilizer\n' +
        'जीन्स पॅन्ट 32 Size,450,799,600,20,PCS,5,6203,Killer,Garments\n' +
        'Parle-G Biscuit 100g,8,10,9,100,PCS,0,1905,Parle,Kirana\n';
    } else {
      csvHeader = "Party Name,Type,Phone,GSTIN,Address,Opening Balance\n";
      csvSample =
        'रमेश पाटील (शेतकरी),customer,9876543210,,मु.पो. वडगाव,15000\n' +
        'श्री कृषी ट्रेडर्स,supplier,9822114455,27AAACG1234F1Z5,पुणे मार्केट यार्ड,0\n';
    }

    const blob = new Blob([csvHeader + csvSample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `sample_${importType}_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const executeImport = async () => {
    const selectedRows = parsedRows.filter((r) => r.selected);
    if (selectedRows.length === 0) {
      setErrorMessage("कृपया आयात करण्यासाठी किमान १ रेकॉर्ड सिलेक्ट करा.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const payload = importType === "items" ? { items: selectedRows } : { parties: selectedRows };

      const res = await fetch("/api/migration/import-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "मायग्रेशन आयात अयशस्वी झाली.");
      }

      setImportStats({
        total: selectedRows.length,
        added: result.added || selectedRows.length,
        updated: result.updated || 0
      });
      setStep("done");
      await onImportCompleted();
    } catch (err: any) {
      setErrorMessage(err.message || "डेटा आयात करताना अडचण आली.");
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
              <h2 className="text-base font-bold">डेटा मायग्रेशन सिस्टिम (Data Migration & Bulk Import)</h2>
              <p className="text-[11px] text-indigo-100">Tally, Marg ERP, Vyapar, Busy किंवा Excel मधील डेटा थेट आयात करा</p>
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
                  १. काय आयात करायचे आहे ते निवडा (Select Import Category):
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
                      <h4 className="font-bold text-sm">इन्व्हेंटरी आयटम यादी (Product Catalog)</h4>
                      <p className="text-xs text-slate-500 mt-0.5">मालाची नावे, खरेदी/विक्री दर, साठा, युनिट्स, HSN कोड</p>
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
                      <h4 className="font-bold text-sm">ग्राहक व सप्लायर यादी (Parties & Dues)</h4>
                      <p className="text-xs text-slate-500 mt-0.5">ग्राहकांची नावे, फोन नंबर, पत्ते, GSTIN व जुनी उधारी शिल्लक</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    २. CSV / Excel / JSON फाईल निवडा:
                  </label>
                  <button
                    type="button"
                    onClick={downloadSampleTemplate}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>नमुना टेम्प्लेट डाऊनलोड करा (Sample CSV)</span>
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
                    <p className="font-bold text-slate-800 text-sm">CSV फाईल येथे ड्रॅग करा किंवा क्लिक करा</p>
                    <p className="text-xs text-slate-500 mt-1">Tally, Marg किंवा Excel मधून Export केलेले CSV थेट सपोर्टेड आहे</p>
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
                    आयात पूर्वदृश्य (Preview - {parsedRows.filter((r) => r.selected).length}/{parsedRows.length} Records)
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
                  <span>दुसरी फाईल निवडा</span>
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
                          <th className="p-2.5">वस्तूचे नाव (Name)</th>
                          <th className="p-2.5 text-right">खरेदी दर</th>
                          <th className="p-2.5 text-right">विक्री दर</th>
                          <th className="p-2.5 text-center">साठा (Qty)</th>
                          <th className="p-2.5 text-center">युनिट</th>
                          <th className="p-2.5 text-center">HSN</th>
                        </>
                      ) : (
                        <>
                          <th className="p-2.5">पार्टीचे नाव (Party Name)</th>
                          <th className="p-2.5 text-center">प्रकार (Type)</th>
                          <th className="p-2.5">फोन नंबर</th>
                          <th className="p-2.5">GSTIN</th>
                          <th className="p-2.5 text-right">उधारी शिल्लक (Balance)</th>
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
                <h3 className="text-xl font-bold text-slate-900">डेटा यशस्वीरीत्या आयात झाला!</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  एकूण <strong>{importStats.total}</strong> रेकॉर्ड्स तुमच्या डेटाबेसमध्ये यशस्वीरीत्या समाविष्ट करण्यात आले आहेत.
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
            {step === "done" ? "बंद करा (Close)" : "रद्द करा (Cancel)"}
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
                  <span>आयात करत आहे...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>डेटा आयात करा ({parsedRows.filter((r) => r.selected).length} Records)</span>
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
              पूर्ण झाले (Done)
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
export default DataMigrationModal;
