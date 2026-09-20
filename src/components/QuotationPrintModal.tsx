/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Quotation, BusinessProfile } from "../types.js";
import { Printer, X, FileText, CheckCircle2, Calendar, ShieldCheck, ArrowRight } from "lucide-react";

interface QuotationPrintModalProps {
  quotation: Quotation;
  business: BusinessProfile;
  onClose: () => void;
  onConvertToInvoice?: (quotation: Quotation) => void;
}

export default function QuotationPrintModal({
  quotation,
  business,
  onClose,
  onConvertToInvoice
}: QuotationPrintModalProps) {
  const [pageSize, setPageSize] = useState<'a4' | 'a5'>('a4');

  const formatINR = (val: number) => {
    return "₹" + (val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const isInterstate = () => {
    if (!quotation.partyState || !business.state) return false;
    return quotation.partyState.trim().toLowerCase() !== business.state.trim().toLowerCase();
  };

  const handlePrint = () => {
    window.print();
  };

  // Convert numbers to Indian Rupees Words
  const numberToWords = (n: number): string => {
    const num = Math.round(n);
    if (num === 0) return "Zero Rupees Only";

    const a = [
      "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ",
      "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "
    ];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    function inWords(numVal: number): string {
      let str = "";
      if (numVal > 99) {
        str += a[Math.floor(numVal / 100)] + "Hundred ";
        numVal %= 100;
      }
      if (numVal > 19) {
        str += b[Math.floor(numVal / 10)] + " " + a[numVal % 10];
      } else if (numVal > 0) {
        str += a[numVal];
      }
      return str;
    }

    let crore = Math.floor(num / 10000000);
    let lakh = Math.floor((num % 10000000) / 100000);
    let thousand = Math.floor((num % 100000) / 1000);
    let remainder = num % 1000;

    let res = "";
    if (crore > 0) res += inWords(crore) + "Crore ";
    if (lakh > 0) res += inWords(lakh) + "Lakh ";
    if (thousand > 0) res += inWords(thousand) + "Thousand ";
    if (remainder > 0) res += inWords(remainder);

    return res.trim() + " Rupees Only";
  };

  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    draft: { bg: "bg-slate-100", text: "text-slate-700", label: "DRAFT" },
    sent: { bg: "bg-blue-100", text: "text-blue-700", label: "SENT TO CLIENT" },
    accepted: { bg: "bg-emerald-100", text: "text-emerald-700", label: "ACCEPTED" },
    converted: { bg: "bg-purple-100", text: "text-purple-700", label: "CONVERTED TO INVOICE" },
    rejected: { bg: "bg-rose-100", text: "text-rose-700", label: "REJECTED" },
    expired: { bg: "bg-amber-100", text: "text-amber-700", label: "EXPIRED" }
  };

  const currentStatus = statusColors[quotation.status] || statusColors.draft;

  const getPageSetupCSS = () => {
    switch (pageSize) {
      case "a4":
        return `
          @media print {
            @page { size: A4 portrait; margin: 8mm; }
            body { font-size: 11px !important; }
            #print-area { padding: 0 !important; width: 100% !important; max-width: none !important; }
          }
        `;
      case "a5":
        return `
          @media print {
            @page { size: A5 landscape; margin: 6mm; }
            body { font-size: 9.5px !important; }
            #print-area { padding: 0 !important; width: 100% !important; max-width: none !important; }
          }
        `;
      default:
        return "";
    }
  };

  const modalContent = (
    <div
      id="print-modal-container"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static"
    >
      <style>{getPageSetupCSS()}</style>
      <div
        id="print-modal-card"
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden print:border-none print:shadow-none print:max-h-none print:max-w-none print:w-full"
      >
        
        {/* Modal Controls Header (Hidden in Print) */}
        <div
          id="print-modal-toolbar"
          className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 print:hidden"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">Quotation / Price Estimate</h3>
              <p className="text-xs text-slate-500 font-mono">{quotation.quotationNumber} • {quotation.partyName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Page Size Toggle */}
            <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg text-xs font-medium text-slate-600">
              <button
                type="button"
                onClick={() => setPageSize('a4')}
                className={`px-3 py-1 rounded-md transition ${pageSize === 'a4' ? 'bg-white text-slate-800 shadow-xs' : 'hover:text-slate-900'}`}
              >
                A4
              </button>
              <button
                type="button"
                onClick={() => setPageSize('a5')}
                className={`px-3 py-1 rounded-md transition ${pageSize === 'a5' ? 'bg-white text-slate-800 shadow-xs' : 'hover:text-slate-900'}`}
              >
                A5
              </button>
            </div>

            {/* Quick Convert Button in Modal */}
            {quotation.status !== 'converted' && onConvertToInvoice && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onConvertToInvoice(quotation);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                Convert to Invoice
              </button>
            )}

            {/* Print Trigger */}
            <button
              type="button"
              id="quotation-print-button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>

            {/* Close Modal */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div
          id="print-area"
          className="overflow-y-auto p-6 md:p-8 flex-1 bg-white print:p-0 print:overflow-visible"
        >
          <div className={`mx-auto bg-white border border-slate-300 p-8 print:border-none print:p-0 ${pageSize === 'a5' ? 'max-w-[148mm]' : 'max-w-[210mm]'}`}>
            
            {/* Document Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5 mb-5">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">
                  {business.name || "Business Firm"}
                </h1>
                <p className="text-xs text-slate-600 mt-1 max-w-sm whitespace-pre-line leading-relaxed">
                  {business.address}
                </p>
                <div className="mt-2 text-xs text-slate-600 space-y-0.5">
                  {business.phone && <p><span className="font-semibold text-slate-700">Phone:</span> {business.phone}</p>}
                  {business.email && <p><span className="font-semibold text-slate-700">Email:</span> {business.email}</p>}
                  {business.gstin && <p><span className="font-semibold text-slate-700 font-mono">GSTIN:</span> {business.gstin}</p>}
                  {business.state && <p><span className="font-semibold text-slate-700">State:</span> {business.state}</p>}
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded-sm mb-2">
                  ESTIMATE / QUOTATION
                </span>
                <div className="text-xs text-slate-600 space-y-1 mt-2">
                  <p><span className="font-semibold text-slate-700">Quotation No:</span> <span className="font-mono font-bold text-slate-900">{quotation.quotationNumber}</span></p>
                  <p><span className="font-semibold text-slate-700">Date:</span> {quotation.date}</p>
                  {quotation.validUntil && (
                    <p><span className="font-semibold text-slate-700">Valid Until:</span> <span className="font-semibold text-indigo-700">{quotation.validUntil}</span></p>
                  )}
                  <p>
                    <span className="font-semibold text-slate-700">Status: </span>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${currentStatus.bg} ${currentStatus.text}`}>
                      {currentStatus.label}
                    </span>
                  </p>
                  {quotation.convertedInvoiceNumber && (
                    <p className="text-[11px] text-purple-700 font-medium mt-1">
                      Converted into Bill #{quotation.convertedInvoiceNumber}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Client / Customer Party Information Box */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 text-xs text-slate-700">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  QUOTATION TO (CLIENT)
                </span>
                <h4 className="font-bold text-sm text-slate-900">{quotation.partyName}</h4>
                {quotation.partyAddress && (
                  <p className="mt-1 text-slate-600 leading-relaxed whitespace-pre-line">
                    {quotation.partyAddress}
                  </p>
                )}
                {quotation.partyPhone && (
                  <p className="mt-1 text-slate-600">
                    <span className="font-semibold">Phone:</span> {quotation.partyPhone}
                  </p>
                )}
                {quotation.partyEmail && (
                  <p className="text-slate-600">
                    <span className="font-semibold">Email:</span> {quotation.partyEmail}
                  </p>
                )}
              </div>
              <div className="text-right space-y-1 flex flex-col justify-start items-end">
                {quotation.partyGstin ? (
                  <p><span className="font-semibold text-slate-700">Client GSTIN:</span> <span className="font-mono font-medium">{quotation.partyGstin}</span></p>
                ) : (
                  <p className="text-slate-400 italic">Unregistered / Consumer</p>
                )}
                {quotation.partyState && (
                  <p><span className="font-semibold text-slate-700">Place of Supply:</span> {quotation.partyState}</p>
                )}
                <p><span className="font-semibold text-slate-700">Supply Type:</span> {isInterstate() ? "Inter-State (IGST)" : "Intra-State (CGST + SGST)"}</p>
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-6 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-semibold border-b border-slate-900">
                    <th className="py-2.5 px-3 text-center w-8">#</th>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 text-center">HSN</th>
                    <th className="py-2.5 px-3 text-right">Qty</th>
                    <th className="py-2.5 px-3 text-right">Rate</th>
                    <th className="py-2.5 px-3 text-right">Discount</th>
                    <th className="py-2.5 px-3 text-right">Taxable</th>
                    <th className="py-2.5 px-3 text-right">GST %</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {quotation.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {item.itemName}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-600">{item.hsn || "-"}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                        {item.quantity} {item.unit || "PCS"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">{formatINR(item.price)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                        {item.discount ? formatINR(item.discount) : "-"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700 font-medium">
                        {formatINR(item.amountBeforeTax)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {item.gstRate}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatINR(item.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations & Summary Section */}
            <div className="grid grid-cols-12 gap-6 mb-6">
              {/* Left Column: Words, Notes, Terms */}
              <div className="col-span-7 space-y-4">
                {/* Amount in words */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    AMOUNT IN WORDS
                  </span>
                  <p className="font-semibold text-slate-800 italic">
                    {numberToWords(quotation.totalAmount)}
                  </p>
                </div>

                {/* Scope of Work / Notes */}
                {quotation.notes && (
                  <div className="text-xs text-slate-600 border border-slate-200 rounded-lg p-3 bg-white">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      NOTES / DESCRIPTION
                    </span>
                    <p className="whitespace-pre-line leading-relaxed">{quotation.notes}</p>
                  </div>
                )}

                {/* Terms and Conditions */}
                {quotation.termsAndConditions && (
                  <div className="text-[11px] text-slate-600 border border-slate-200 rounded-lg p-3 bg-slate-50">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      TERMS & CONDITIONS
                    </span>
                    <p className="whitespace-pre-line leading-relaxed font-sans">{quotation.termsAndConditions}</p>
                  </div>
                )}
              </div>

              {/* Right Column: Financial Totals */}
              <div className="col-span-5">
                <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                  <div className="p-3 space-y-2 bg-slate-50">
                    <div className="flex justify-between text-slate-600">
                      <span>Taxable Value:</span>
                      <span className="font-mono font-medium text-slate-800">{formatINR(quotation.subtotal)}</span>
                    </div>

                    {isInterstate() ? (
                      <div className="flex justify-between text-slate-600">
                        <span>IGST:</span>
                        <span className="font-mono font-medium text-slate-800">{formatINR(quotation.taxAmount)}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-slate-600">
                          <span>CGST:</span>
                          <span className="font-mono font-medium text-slate-800">{formatINR(quotation.cgstTotal || (quotation.taxAmount / 2))}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>SGST:</span>
                          <span className="font-mono font-medium text-slate-800">{formatINR(quotation.sgstTotal || (quotation.taxAmount / 2))}</span>
                        </div>
                      </>
                    )}

                    {/* Extra Charges */}
                    {quotation.extraCharges && quotation.extraCharges.length > 0 && quotation.extraCharges.map((charge, cIdx) => (
                      <div key={cIdx} className="flex justify-between text-slate-600">
                        <span>{charge.title}:</span>
                        <span className="font-mono font-medium text-slate-800">{formatINR(charge.amount)}</span>
                      </div>
                    ))}

                    {/* Overall Discount */}
                    {quotation.discountAmount && quotation.discountAmount > 0 ? (
                      <div className="flex justify-between text-emerald-700 font-medium">
                        <span>Overall Discount:</span>
                        <span className="font-mono">-{formatINR(quotation.discountAmount)}</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Grand Total */}
                  <div className="p-3 bg-slate-900 text-white flex justify-between items-center font-bold text-sm">
                    <span>ESTIMATED TOTAL:</span>
                    <span className="font-mono text-base">{formatINR(quotation.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Signatures & Footer */}
            <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-2 gap-4 items-end text-xs">
              <div>
                <p className="text-[11px] text-slate-500">
                  This quotation is a price estimate subject to our terms and conditions above. It does not constitute a tax invoice.
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs font-semibold text-slate-800">For {business.name}</p>
                <div className="h-16 flex items-end justify-end">
                  <span className="text-[11px] text-slate-400 border-t border-slate-300 px-6 pt-1">
                    Authorized Signatory
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return modalContent;
  }
  return createPortal(modalContent, document.body);
}
