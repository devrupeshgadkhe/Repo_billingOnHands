/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { DeliveryChallan, BusinessProfile } from "../types.js";
import { Printer, X, FileText, CheckCircle2, Truck, Scale, ShieldCheck } from "lucide-react";

interface ChallanPrintModalProps {
  challan: DeliveryChallan;
  business: BusinessProfile;
  onClose: () => void;
}

export default function ChallanPrintModal({
  challan,
  business,
  onClose
}: ChallanPrintModalProps) {
  const [copyType, setCopyType] = useState<'consignee' | 'transporter' | 'consignor'>('consignee');
  const [pageSize, setPageSize] = useState<'a4' | 'a5'>('a4');

  const copyLabels = {
    consignee: "ORIGINAL FOR CONSIGNEE",
    transporter: "DUPLICATE FOR TRANSPORTER",
    consignor: "TRIPLICATE FOR CONSIGNOR"
  };

  const purposeLabels: Record<string, string> = {
    dispatch: "Dispatch before Invoice",
    approval: "Supply on Approval",
    job_work: "Job Work / Processing",
    branch_transfer: "Branch / Godown Transfer",
    exhibition: "Exhibition / Demonstration",
    other: "Other Transport"
  };

  const formatINR = (val: number) => {
    return "₹" + (val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden print:border-none print:shadow-none print:max-h-none print:max-w-none print:w-full">
        
        {/* Modal Controls Header (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">Print Delivery Challan</h3>
              <p className="text-xs text-slate-500 font-mono">{challan.challanNumber} • {challan.partyName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Copy Type Selector */}
            <div className="flex bg-slate-200/80 p-0.5 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setCopyType('consignee')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  copyType === 'consignee' ? 'bg-white text-blue-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Consignee
              </button>
              <button
                type="button"
                onClick={() => setCopyType('transporter')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  copyType === 'transporter' ? 'bg-white text-blue-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Transporter
              </button>
              <button
                type="button"
                onClick={() => setCopyType('consignor')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  copyType === 'consignor' ? 'bg-white text-blue-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Consignor
              </button>
            </div>

            {/* Page Size Toggle */}
            <div className="flex bg-slate-200/80 p-0.5 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setPageSize('a4')}
                className={`px-2.5 py-1.5 rounded-md transition-all ${
                  pageSize === 'a4' ? 'bg-white text-slate-800 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                A4
              </button>
              <button
                type="button"
                onClick={() => setPageSize('a5')}
                className={`px-2.5 py-1.5 rounded-md transition-all ${
                  pageSize === 'a5' ? 'bg-white text-slate-800 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                A5
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document View */}
        <div className="p-8 overflow-y-auto bg-slate-100 print:bg-white print:p-0 print:overflow-visible">
          <div className={`mx-auto bg-white border border-slate-300 shadow-xs p-8 text-slate-900 print:border-none print:shadow-none print:p-4 ${
            pageSize === 'a5' ? 'max-w-[148mm] text-xs' : 'max-w-[210mm] text-sm'
          }`}>

            {/* Sub-header Bar with Rule 55 & Copy Marker */}
            <div className="border-b-2 border-slate-900 pb-3 mb-4">
              <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-slate-600">
                <span className="font-semibold text-slate-800">Rule 55 of CGST Rules, 2017</span>
                <span className="px-2.5 py-1 bg-slate-900 text-white font-bold rounded-sm tracking-wide">
                  {copyLabels[copyType]}
                </span>
              </div>
              <div className="text-center mt-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">DELIVERY CHALLAN</h1>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-0.5">
                  Goods Transfer Note • Not a Tax Invoice
                </p>
              </div>
            </div>

            {/* Consignor (Our Business) & Challan Metadata Box */}
            <div className="grid grid-cols-2 gap-4 border border-slate-300 rounded-sm p-4 mb-4 bg-slate-50">
              {/* Left: Consignor Details */}
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Consignor (Dispatched From)</p>
                <h2 className="text-base font-bold text-slate-900 mt-1">{business.name}</h2>
                <p className="text-xs text-slate-600 mt-0.5 whitespace-pre-line leading-relaxed">{business.address}</p>
                <p className="text-xs text-slate-700 mt-1">
                  <span className="font-semibold">State:</span> {business.state}
                </p>
                <p className="text-xs text-slate-900 font-mono font-bold mt-1">
                  GSTIN: <span className="text-blue-700">{business.gstin || "URP (Unregistered)"}</span>
                </p>
                {business.phone && (
                  <p className="text-xs text-slate-600 mt-0.5">Phone: {business.phone}</p>
                )}
              </div>

              {/* Right: Challan Meta Details */}
              <div className="border-l border-slate-300 pl-4 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Challan Number:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{challan.challanNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Date of Issue:</span>
                  <span className="font-medium text-slate-900">{challan.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Purpose:</span>
                  <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                    {purposeLabels[challan.purpose] || challan.purpose}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Place of Supply / State:</span>
                  <span className="font-semibold text-slate-800">{business.state}</span>
                </div>
                {challan.status === 'converted' && (
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="text-emerald-700 font-medium">Converted to Bill:</span>
                    <span className="font-mono font-bold text-emerald-800">{challan.convertedInvoiceNumber || "Tax Invoice"}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Consignee (Recipient) Box */}
            <div className="border border-slate-300 rounded-sm p-4 mb-4 bg-white">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Consignee / Recipient (Billed / Shipped To)</p>
              <div className="grid grid-cols-2 gap-4 mt-1">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{challan.partyName}</h3>
                  <p className="text-xs text-slate-900 font-mono mt-0.5 font-semibold">
                    GSTIN: <span className="text-blue-700">{challan.partyGstin || "Unregistered / Consumer"}</span>
                  </p>
                </div>
                <div className="text-xs text-slate-600">
                  {challan.shipTo && (
                    <p><span className="font-semibold text-slate-700">Delivery Location:</span> {challan.shipTo}</p>
                  )}
                  {challan.dispatchFrom && (
                    <p><span className="font-semibold text-slate-700">Dispatch Godown:</span> {challan.dispatchFrom}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Transport, Vehicle, Weight & Logistics Specs Box */}
            <div className="grid grid-cols-3 gap-3 border border-slate-300 rounded-sm p-3.5 mb-4 bg-slate-50 text-xs">
              
              {/* Col 1: Vehicle & Transport */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
                  <Truck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Transport Details</span>
                </div>
                <p className="text-slate-600">
                  <span className="font-medium text-slate-500">Vehicle No:</span>{" "}
                  <span className="font-mono font-bold text-slate-900">{challan.vehicleNumber || "—"}</span>
                </p>
                <p className="text-slate-600">
                  <span className="font-medium text-slate-500">Transporter:</span>{" "}
                  <span className="text-slate-900 font-medium">{challan.transporterName || "—"}</span>
                </p>
                <p className="text-slate-600">
                  <span className="font-medium text-slate-500">LR / Bilty No:</span>{" "}
                  <span className="font-mono text-slate-900">{challan.lrNumber || "—"}</span>
                </p>
                <p className="text-slate-600">
                  <span className="font-medium text-slate-500">E-Way Bill No:</span>{" "}
                  <span className="font-mono font-medium text-blue-700">{challan.ewayBillNumber || "—"}</span>
                </p>
                {challan.driverName && (
                  <p className="text-slate-600">
                    <span className="font-medium text-slate-500">Driver:</span> {challan.driverName} {challan.driverPhone ? `(${challan.driverPhone})` : ""}
                  </p>
                )}
              </div>

              {/* Col 2: Weight & Packaging Details */}
              <div className="space-y-1 border-l border-slate-300 pl-3">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
                  <Scale className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Weight & Packaging</span>
                </div>
                <p className="text-slate-600">
                  <span className="font-medium text-slate-500">Gross Weight:</span>{" "}
                  <span className="font-bold text-slate-900">
                    {challan.grossWeight !== undefined && challan.grossWeight !== null ? `${challan.grossWeight} ${challan.weightUnit || 'KG'}` : "—"}
                  </span>
                </p>
                <p className="text-slate-600">
                  <span className="font-medium text-slate-500">Net Weight:</span>{" "}
                  <span className="font-bold text-slate-900">
                    {challan.netWeight !== undefined && challan.netWeight !== null ? `${challan.netWeight} ${challan.weightUnit || 'KG'}` : "—"}
                  </span>
                </p>
                <p className="text-slate-600">
                  <span className="font-medium text-slate-500">Weight Slip (काटा पावती):</span>{" "}
                  <span className="font-mono font-medium text-slate-900">{challan.weightSlipNo || "—"}</span>
                </p>
                <p className="text-slate-600">
                  <span className="font-medium text-slate-500">Total Packages:</span>{" "}
                  <span className="font-semibold text-slate-900">{challan.packageCount || "—"}</span>
                </p>
              </div>

              {/* Col 3: Hamali & Freight Details */}
              <div className="space-y-1 border-l border-slate-300 pl-3">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span>Hamali & Freight</span>
                </div>
                <p className="text-slate-600">
                  <span className="font-medium text-slate-500">Hamali / Labour:</span>{" "}
                  <span className="font-bold text-slate-900">{challan.hamaliCharge ? formatINR(challan.hamaliCharge) : "—"}</span>
                </p>
                {challan.hamaliStatus && challan.hamaliStatus !== 'not_applicable' && (
                  <p className="text-[11px] text-slate-500">
                    Status: <span className="font-semibold text-slate-800">
                      {challan.hamaliStatus === 'paid_by_us' ? 'Paid by Consignor' : 'To Pay by Consignee'}
                    </span>
                  </p>
                )}
                <p className="text-slate-600 mt-1">
                  <span className="font-medium text-slate-500">Freight:</span>{" "}
                  <span className="font-bold text-slate-900">{challan.freightCharge ? formatINR(challan.freightCharge) : "—"}</span>
                </p>
                {challan.freightStatus && challan.freightStatus !== 'not_applicable' && (
                  <p className="text-[11px] text-slate-500">
                    Status: <span className="font-semibold text-slate-800">
                      {challan.freightStatus === 'paid_by_us' ? 'Paid by Consignor' : 'To Pay by Consignee'}
                    </span>
                  </p>
                )}
              </div>

            </div>

            {/* Line Items Table */}
            <div className="border border-slate-300 rounded-sm overflow-hidden mb-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 w-20 text-center">HSN/SAC</th>
                    <th className="py-2.5 px-3 w-24 text-right">Quantity</th>
                    <th className="py-2.5 px-3 w-24 text-right">Indicative Rate</th>
                    <th className="py-2.5 px-3 w-28 text-right">Estimated Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {challan.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-100">
                      <td className="py-2 px-3 text-center font-mono text-slate-500">{idx + 1}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {item.itemName}
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-slate-600">
                        {item.hsn || "—"}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">
                        {item.quantity} <span className="text-slate-500 text-[11px] font-normal">{item.unit || "PCS"}</span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">
                        {formatINR(item.price)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        {formatINR(item.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-300 font-semibold text-slate-900">
                    <td colSpan={3} className="py-2.5 px-3 text-right text-slate-600 uppercase text-[11px] tracking-wider">
                      Total Units: {challan.items.reduce((s, i) => s + (i.quantity || 0), 0)}
                    </td>
                    <td colSpan={2} className="py-2.5 px-3 text-right uppercase text-[11px] tracking-wider text-slate-700">
                      Estimated Consignment Value:
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-sm text-slate-900">
                      {formatINR(challan.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Notes & Declarations */}
            {challan.notes && (
              <div className="border border-slate-200 rounded-sm p-3 mb-4 bg-slate-50 text-xs text-slate-700">
                <span className="font-semibold text-slate-900">Notes / Remarks:</span> {challan.notes}
              </div>
            )}

            {/* Statutory Declaration */}
            <div className="border border-slate-200 rounded-sm p-2.5 mb-6 text-[11px] text-slate-500 leading-relaxed bg-white">
              <span className="font-semibold text-slate-700">Declaration:</span> We declare that this delivery challan shows the actual quantity of the goods described and that all particulars are true and correct. The goods are being transported for the purpose stated above under Rule 55 of CGST Rules, 2017. This document does not constitute a sale until a formal Tax Invoice is issued.
            </div>

            {/* Dual Signatures & Receiver Acknowledgement */}
            <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-300">
              
              {/* Left: Receiver Acknowledgement */}
              <div className="border border-dashed border-slate-300 rounded-sm p-4 text-xs">
                <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Receiver's Acknowledgement</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Received the above mentioned goods in full quantity and good condition.
                </p>
                <div className="mt-8 pt-4 border-t border-slate-300 flex justify-between text-slate-500 text-[11px]">
                  <span>Receiver's Signature & Stamp</span>
                  <span>Date: ____/____/2026</span>
                </div>
              </div>

              {/* Right: Consignor Authorized Signature */}
              <div className="text-right flex flex-col justify-between p-4">
                <div>
                  <p className="text-xs font-semibold text-slate-600">{business.signatureText || `For ${business.name}`}</p>
                </div>
                <div className="mt-8 pt-4 border-t border-slate-300">
                  <p className="text-xs font-bold text-slate-800">Authorized Signatory</p>
                  <p className="text-[10px] text-slate-400">Signature & Official Stamp</p>
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
