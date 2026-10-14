/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { StockTransferVoucher, BusinessProfile } from "../types.js";
import { Printer, X, Download, Truck, ArrowRight, Building, CheckCircle2 } from "lucide-react";

interface StockTransferPrintModalProps {
  voucher: StockTransferVoucher | null;
  business: BusinessProfile;
  onClose: () => void;
}

export default function StockTransferPrintModal({
  voucher,
  business,
  onClose
}: StockTransferPrintModalProps) {
  if (!voucher) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-scale-in">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">स्टॉक ट्रान्सफर चलन (Stock Transfer Challan / Pass)</h3>
              <p className="text-[11px] text-slate-400 font-mono">Voucher #{voucher.voucherNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Transfer Pass</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Pass Content */}
        <div className="p-6 overflow-y-auto bg-slate-50 printable-content">
          <div className="bg-white border border-slate-300 rounded-xl p-6 shadow-xs space-y-5 text-slate-800 font-sans">
            
            {/* Header / Business Details */}
            <div className="text-center border-b border-slate-200 pb-4 space-y-1">
              <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase">{business.name || "Billing On Hand Store"}</h2>
              <p className="text-xs text-slate-600">{business.address} {business.city ? `• ${business.city}` : ""}</p>
              <p className="text-xs text-slate-500">
                GSTIN: <strong>{business.gstin || "Unregistered"}</strong> {business.phone ? `| 📞 ${business.phone}` : ""}
              </p>
              <div className="inline-block px-3 py-0.5 bg-slate-900 text-white text-[11px] font-bold rounded-full mt-2 uppercase tracking-wider">
                Internal Stock Transfer Delivery Pass (अंतर्गत माल वाहतूक पास)
              </div>
            </div>

            {/* Voucher Metadata */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Voucher Number</span>
                <span className="font-bold font-mono text-slate-900 text-sm">{voucher.voucherNumber}</span>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mt-2">Transfer Date</span>
                <span className="font-semibold text-slate-800">{voucher.date}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Vehicle Number</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{voucher.vehicleNumber || "Local Handover"}</span>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mt-2">Driver / Transporter</span>
                <span className="font-semibold text-slate-800">{voucher.driverName || "Store Staff"}</span>
              </div>
            </div>

            {/* From Godown -> To Godown Movement Banner */}
            <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">Source (माल पाठवणारे गोदाम)</span>
                <div className="flex items-center gap-1.5 font-bold text-emerald-950 text-sm">
                  <Building className="w-4 h-4 text-emerald-600" />
                  <span>{voucher.sourceGodownName}</span>
                </div>
              </div>

              <div className="w-8 h-8 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-600">
                <ArrowRight className="w-4 h-4" />
              </div>

              <div className="space-y-0.5 text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block">Destination (प्राप्त गोदाम)</span>
                <div className="flex items-center justify-end gap-1.5 font-bold text-blue-950 text-sm">
                  <Building className="w-4 h-4 text-blue-600" />
                  <span>{voucher.destGodownName}</span>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-2">Batch / Lot</th>
                    <th className="py-2.5 px-2">Expiry</th>
                    <th className="py-2.5 px-3 text-right">Qty Transferred</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {voucher.items.map((item, idx) => (
                    <tr key={item.itemId || idx} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{item.itemName}</td>
                      <td className="py-2.5 px-2 font-mono text-slate-600">{item.batchNumber || "—"}</td>
                      <td className="py-2.5 px-2 font-mono text-slate-600">{item.expiryDate || "—"}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-900">
                        {item.quantity} {item.unit || "PCS"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold border-t border-slate-200">
                    <td colSpan={4} className="py-2.5 px-3 text-right text-slate-700">Total Transferred Quantity:</td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-slate-950 text-sm">
                      {voucher.totalQuantity} Units
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Notes */}
            {voucher.notes && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                <span className="font-bold block text-slate-700">Notes / Remarks:</span>
                <p className="mt-0.5">{voucher.notes}</p>
              </div>
            )}

            {/* Signatures Section */}
            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-dashed border-slate-300 text-center text-xs text-slate-600">
              <div>
                <div className="border-b border-slate-400 h-8 mb-1.5"></div>
                <span className="font-bold text-slate-800 block">Dispatched By (Source In-charge)</span>
                <span className="text-[10px] text-slate-400">स्वाक्षरी / शिक्का</span>
              </div>
              <div>
                <div className="border-b border-slate-400 h-8 mb-1.5"></div>
                <span className="font-bold text-slate-800 block">Driver / Handover In-charge</span>
                <span className="text-[10px] text-slate-400">स्वाक्षरी</span>
              </div>
              <div>
                <div className="border-b border-slate-400 h-8 mb-1.5"></div>
                <span className="font-bold text-slate-800 block">Received By (Destination In-charge)</span>
                <span className="text-[10px] text-slate-400">माल मिळाल्याची स्वाक्षरी</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
