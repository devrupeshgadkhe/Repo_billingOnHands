/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Invoice, BusinessProfile, Party } from "../types.js";
import { Printer, X } from "lucide-react";

interface InvoicePrintModalProps {
  invoice: Invoice;
  business: BusinessProfile;
  party: Party | undefined;
  onClose: () => void;
}

type PrintSize = "A4" | "A5" | "thermal_72" | "thermal_58" | "letter";

export default function InvoicePrintModal({
  invoice,
  business,
  party,
  onClose
}: InvoicePrintModalProps) {
  const [printSize, setPrintSize] = useState<PrintSize>("A4");

  // Format currency in Indian Rupees format (e.g., ₹1,50,000.00)
  const formatRupees = (num: number) => {
    const dec = (num || 0).toFixed(2);
    const parts = dec.split(".");
    let integerPart = parts[0];
    const decimalPart = parts[1];

    let lastThree = integerPart.substring(integerPart.length - 3);
    const otherBits = integerPart.substring(0, integerPart.length - 3);
    if (otherBits !== "") {
      lastThree = "," + lastThree;
    }
    const formattedInt = otherBits.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
    return "₹" + formattedInt + "." + decimalPart;
  };

  // Check if CGST / SGST is used or IGST is used
  const isInterstate = (invoice.igstTotal || 0) > 0;

  // Clean customer/supplier display name (strip redundant '(Customer)' or '(Supplier)' if in raw text)
  const cleanPartyName = (invoice.partyName || "").replace(/\s*\((Customer|Supplier)\)/gi, "").trim();

  // Compile HSN summary
  const hsnSummary = invoice.items.reduce((acc, item) => {
    const existing = acc.find(h => h.hsn === item.hsn && h.gstRate === item.gstRate);
    if (existing) {
      existing.amountBeforeTax += item.amountBeforeTax;
      existing.taxAmount += item.taxAmount;
      existing.cgst += item.cgst;
      existing.sgst += item.sgst;
      existing.igst += item.igst;
    } else {
      acc.push({
        hsn: item.hsn || "N/A",
        gstRate: item.gstRate,
        amountBeforeTax: item.amountBeforeTax,
        taxAmount: item.taxAmount,
        cgst: item.cgst,
        sgst: item.sgst,
        igst: item.igst
      });
    }
    return acc;
  }, [] as Array<{
    hsn: string;
    gstRate: number;
    amountBeforeTax: number;
    taxAmount: number;
    cgst: number;
    sgst: number;
    igst: number;
  }>);

  const handlePrint = () => {
    window.print();
  };

  // CSS rules for clean single page printing
  const getPageSetupCSS = () => {
    switch (printSize) {
      case "A4":
        return `
          @media print {
            @page { size: A4 portrait; margin: 8mm; }
            body { font-size: 11px !important; }
            #print-area { padding: 0 !important; width: 100% !important; max-width: none !important; }
          }
        `;
      case "A5":
        return `
          @media print {
            @page { size: A5 landscape; margin: 6mm; }
            body { font-size: 9.5px !important; }
            #print-area { padding: 0 !important; width: 100% !important; max-width: none !important; }
          }
        `;
      case "letter":
        return `
          @media print {
            @page { size: letter portrait; margin: 8mm; }
            body { font-size: 11px !important; }
            #print-area { padding: 0 !important; width: 100% !important; max-width: none !important; }
          }
        `;
      case "thermal_72":
        return `
          @media print {
            @page { size: 72mm auto; margin: 2mm 3mm; }
            body { font-size: 9.5px !important; background: white; color: black; }
            #print-area { padding: 0 !important; width: 66mm !important; max-width: none !important; }
          }
        `;
      case "thermal_58":
        return `
          @media print {
            @page { size: 58mm auto; margin: 1mm 2mm; }
            body { font-size: 8.5px !important; background: white; color: black; }
            #print-area { padding: 0 !important; width: 54mm !important; max-width: none !important; }
          }
        `;
      default:
        return "";
    }
  };

  const getContainerWidthClass = () => {
    switch (printSize) {
      case "thermal_58":
        return "max-w-[320px] w-full";
      case "thermal_72":
        return "max-w-[380px] w-full";
      case "A5":
        return "max-w-2xl w-full";
      case "A4":
      case "letter":
      default:
        return "max-w-4xl w-full";
    }
  };

  // Readable Payment Mode string
  const getPaymentModeLabel = (mode: string, type?: string) => {
    const isReturn = type?.includes("return");
    switch ((mode || "").toLowerCase()) {
      case "cash": return isReturn ? "Immediate Cash Refund" : "Cash";
      case "bank": return isReturn ? "Bank / UPI Refund" : "Bank Transfer / UPI";
      case "unpaid": return isReturn ? "Adjusted on Account" : "Credit (Unpaid)";
      default: return mode ? mode.toUpperCase() : "Cash";
    }
  };

  return (
    <div
      id="print-modal-container"
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static"
    >
      <style>{getPageSetupCSS()}</style>

      <div
        id="print-modal-card"
        className={`bg-white rounded-xl shadow-2xl flex flex-col print:shadow-none print:w-full print:rounded-none transition-all duration-200 ${getContainerWidthClass()} max-h-[94vh]`}
      >
        {/* Modal Toolbar (Hidden during print) */}
        <div
          id="print-modal-toolbar"
          className="flex flex-wrap items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-slate-50 rounded-t-xl print:hidden gap-3"
        >
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="font-semibold text-slate-800 text-sm">Invoice Preview & Print</span>
          </div>

          <div className="flex items-center space-x-2.5">
            <div className="flex items-center space-x-1 border border-slate-300 rounded-lg bg-white px-2 py-1">
              <span className="text-[11px] font-medium text-slate-500">Paper:</span>
              <select
                id="receipt-print-size-select"
                value={printSize}
                onChange={(e) => setPrintSize(e.target.value as PrintSize)}
                className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="A4">A4 (Standard)</option>
                <option value="A5">A5 (Half Page)</option>
                <option value="letter">Letter</option>
                <option value="thermal_72">Thermal 72mm (3 inch)</option>
                <option value="thermal_58">Thermal 58mm (2 inch)</option>
              </select>
            </div>

            <button
              id="print-btn"
              onClick={handlePrint}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1.5 px-4 rounded-lg text-xs tracking-wide shadow transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Bill</span>
            </button>

            <button
              id="close-print-modal-btn"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition cursor-pointer"
              title="Close Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div
          id="print-area"
          className="p-6 sm:p-8 overflow-y-auto flex-1 text-slate-800 font-sans print:p-0 print:overflow-visible bg-white"
        >
          {printSize.startsWith("thermal") ? (
            /* ========================================================
               THERMAL RECEIPT (58mm / 72mm) - SIMPLE & NEAT
               ======================================================== */
            <div className={`mx-auto ${printSize === "thermal_58" ? "max-w-[250px] text-[10px]" : "max-w-[320px] text-[11px]"} font-mono text-slate-900`}>
              {/* Header */}
              <div className="text-center space-y-1 mb-2">
                <h2 className="text-sm font-bold uppercase">{business.name}</h2>
                <p className="whitespace-pre-wrap leading-tight text-slate-600 text-[10px]">{business.address}</p>
                <div className="text-[10px] text-slate-600 space-y-0.5">
                  {business.gstin && <p>GSTIN: {business.gstin}</p>}
                  {business.phone && <p>Phone: {business.phone}</p>}
                </div>
              </div>

              <div className="border-t border-dashed border-slate-400 my-2"></div>

              {/* Invoice Info */}
              <div className="space-y-0.5 text-[10.5px]">
                <div className="flex justify-between">
                  <span>{invoice.type.includes("return") ? (invoice.type === "sale_return" ? "Credit Note No:" : "Debit Note No:") : "Bill No:"} <strong>#{invoice.invoiceNumber}</strong></span>
                  <span>Date: {invoice.date}</span>
                </div>
                {invoice.originalInvoiceNumber && (
                  <div className="flex justify-between text-slate-600">
                    <span>Original Bill Ref:</span>
                    <strong>#{invoice.originalInvoiceNumber}</strong>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>{invoice.type.includes("return") ? "Settlement:" : "Payment:"} <strong>{getPaymentModeLabel(invoice.paymentType, invoice.type)}</strong></span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-400 my-2"></div>

              {/* Customer Info */}
              <div className="space-y-0.5 text-[10.5px]">
                <p className="text-[9px] uppercase font-bold text-slate-500">Customer Details:</p>
                <p className="font-bold text-slate-900">{cleanPartyName}</p>
                {invoice.partyGstin && <p className="text-[10px]">GSTIN: {invoice.partyGstin}</p>}
                {party?.phone && <p className="text-[10px]">Phone: {party.phone}</p>}
              </div>

              <div className="border-t border-dashed border-slate-400 my-2"></div>

              {/* Items List */}
              <div className="space-y-2">
                <div className="flex justify-between font-bold text-[10px] uppercase text-slate-600 pb-1 border-b border-slate-200">
                  <span>Item & Qty</span>
                  <span>Amount</span>
                </div>

                {invoice.items.map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="font-bold text-slate-900 leading-tight">
                      {idx + 1}. {item.itemName}
                    </div>
                    <div className="flex justify-between text-slate-700 text-[10px]">
                      <span>
                        {item.quantity} x ₹{item.price.toFixed(2)} [GST {item.gstRate}%]
                      </span>
                      <span className="font-bold">
                        ₹{item.totalAmount.toFixed(2)}
                      </span>
                    </div>
                    {item.discount && item.discount > 0 ? (
                      <div className="text-[9.5px] text-slate-500 pl-3">
                        Discount: -₹{item.discount.toFixed(2)}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-slate-400 my-2.5"></div>

              {/* Calculations */}
              <div className="space-y-1 font-mono text-right text-[10.5px]">
                <div className="flex justify-between">
                  <span>Subtotal (Taxable):</span>
                  <span>₹{invoice.subtotal.toFixed(2)}</span>
                </div>
                {!isInterstate ? (
                  <>
                    <div className="flex justify-between">
                      <span>CGST:</span>
                      <span>₹{(invoice.cgstTotal || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SGST:</span>
                      <span>₹{(invoice.sgstTotal || 0).toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span>IGST:</span>
                    <span>₹{(invoice.igstTotal || 0).toFixed(2)}</span>
                  </div>
                )}
                {invoice.extraCharges && invoice.extraCharges.length > 0 && (
                  <>
                    {invoice.extraCharges.map((ch, i) => (
                      <div key={i} className="flex justify-between text-slate-600">
                        <span>{ch.title}:</span>
                        <span>₹{ch.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </>
                )}

                <div className="border-t border-dashed border-slate-400 my-1"></div>
                <div className="flex justify-between font-bold text-xs bg-slate-100 p-1 rounded">
                  <span>TOTAL AMOUNT:</span>
                  <span>₹{invoice.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600 pt-0.5">
                  <span>Paid Amount:</span>
                  <span>₹{invoice.paidAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Balance Due:</span>
                  <span>₹{invoice.remainingAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-400 my-3"></div>

              <div className="text-center space-y-1 text-[10px] text-slate-600">
                <p className="font-semibold">Thank you for your business!</p>
                <p className="text-[9px] text-slate-500 pt-1">{business.signatureText || `For ${business.name}`}</p>
              </div>
            </div>
          ) : (
            /* ========================================================
               STANDARD INVOICE (A4 / A5 / LETTER) - NEAT & PROFESSIONAL
               ======================================================== */
            <div className="space-y-5 text-slate-800">
              
              {/* Top Title Bar */}
              <div className="text-center border-b-2 border-slate-800 pb-2 mb-4">
                <h1 className="text-xl font-bold tracking-wider text-slate-900 uppercase">
                  {invoice.type === "sale_return" ? "CREDIT NOTE" :
                   invoice.type === "purchase_return" ? "DEBIT NOTE" :
                   invoice.type === "purchase" ? "PURCHASE BILL" : "TAX INVOICE"}
                </h1>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">
                  {invoice.type === "sale_return" ? "Sales Return Voucher" :
                   invoice.type === "purchase_return" ? "Purchase Return Voucher" : "Original for Recipient"}
                </p>
              </div>

              {/* Billed By & Invoice Details */}
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-200 text-xs">
                
                {/* Left: Company Details */}
                <div className="space-y-1 pr-3 border-r border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Billed By</span>
                  <div className="flex items-start space-x-3">
                    {business.logoUrl && (
                      <img
                        src={business.logoUrl}
                        referrerPolicy="no-referrer"
                        alt="Logo"
                        className="w-11 h-11 object-contain rounded border border-slate-200 p-0.5 shrink-0"
                      />
                    )}
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 leading-tight">{business.name}</h2>
                      <p className="text-slate-600 whitespace-pre-wrap leading-relaxed mt-0.5">{business.address}</p>
                    </div>
                  </div>
                  <div className="pt-1.5 space-y-0.5 text-slate-700">
                    <p><span className="font-semibold text-slate-900">GSTIN:</span> {business.gstin || "Unregistered"}</p>
                    <p><span className="font-semibold text-slate-900">State:</span> {business.state}</p>
                    {business.phone && <p><span className="font-semibold text-slate-900">Phone:</span> {business.phone}</p>}
                    {business.email && <p><span className="font-semibold text-slate-900">Email:</span> {business.email}</p>}
                  </div>
                </div>

                {/* Right: Invoice Meta & Customer Details */}
                <div className="space-y-3 pl-3 flex flex-col justify-between">
                  <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-600">
                        {invoice.type.includes("return") ? (invoice.type === "sale_return" ? "Credit Note No:" : "Debit Note No:") : "Invoice No:"}
                      </span>
                      <span className="font-bold text-emerald-800 text-sm">#{invoice.invoiceNumber}</span>
                    </div>
                    {invoice.originalInvoiceNumber && (
                      <div className="flex justify-between items-center text-indigo-700 bg-indigo-50/70 px-1.5 py-0.5 rounded">
                        <span className="font-semibold text-[11px]">Original Bill Ref:</span>
                        <span className="font-bold text-xs font-mono">#{invoice.originalInvoiceNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-600">Date:</span>
                      <span className="font-medium text-slate-800">{invoice.date}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-600">
                        {invoice.type.includes("return") ? "Settlement Mode:" : "Payment Mode:"}
                      </span>
                      <span className="font-semibold text-slate-800 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[11px]">
                        {getPaymentModeLabel(invoice.paymentType, invoice.type)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {invoice.type === "purchase" ? "Billed From (Supplier)" : "Billed To (Customer)"}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{cleanPartyName}</h3>
                    {party?.address && (
                      <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">{party.address}</p>
                    )}
                    <div className="space-y-0.5 pt-0.5 text-slate-700">
                      <p><span className="font-semibold text-slate-900">GSTIN:</span> {invoice.partyGstin || "Unregistered (URP)"}</p>
                      {party?.state && <p><span className="font-semibold text-slate-900">Place of Supply:</span> {party.state}</p>}
                      {party?.phone && <p><span className="font-semibold text-slate-900">Phone:</span> {party.phone}</p>}
                    </div>
                  </div>
                </div>

              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-y border-slate-300 text-slate-800 font-bold uppercase text-[10px]">
                      <th className="py-2 px-2 text-center w-8">#</th>
                      <th className="py-2 px-2">Item Description</th>
                      <th className="py-2 px-2 text-center w-16">HSN</th>
                      <th className="py-2 px-2 text-right w-14">Qty</th>
                      <th className="py-2 px-2 text-right w-20">Rate</th>
                      <th className="py-2 px-2 text-right w-24">Taxable Amt</th>
                      <th className="py-2 px-2 text-center w-14">GST %</th>
                      {!isInterstate ? (
                        <>
                          <th className="py-2 px-2 text-right w-18">CGST</th>
                          <th className="py-2 px-2 text-right w-18">SGST</th>
                        </>
                      ) : (
                        <th className="py-2 px-2 text-right w-20">IGST</th>
                      )}
                      <th className="py-2 px-2 text-right w-24">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {invoice.items.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/60">
                        <td className="py-2 px-2 text-center text-slate-500 font-mono">{index + 1}</td>
                        <td className="py-2 px-2 font-medium text-slate-900">
                          <div>{item.itemName}</div>
                          {item.discount && item.discount > 0 ? (
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Discount: -₹{item.discount.toFixed(2)}
                            </div>
                          ) : null}
                        </td>
                        <td className="py-2 px-2 text-center text-slate-600 font-mono">{item.hsn || "-"}</td>
                        <td className="py-2 px-2 text-right font-semibold text-slate-900 font-mono">{item.quantity}</td>
                        <td className="py-2 px-2 text-right font-mono">₹{item.price.toFixed(2)}</td>
                        <td className="py-2 px-2 text-right font-mono">₹{item.amountBeforeTax.toFixed(2)}</td>
                        <td className="py-2 px-2 text-center font-mono text-slate-700">{item.gstRate}%</td>
                        {!isInterstate ? (
                          <>
                            <td className="py-2 px-2 text-right font-mono text-slate-600">
                              ₹{(item.cgst || 0).toFixed(2)}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-slate-600">
                              ₹{(item.sgst || 0).toFixed(2)}
                            </td>
                          </>
                        ) : (
                          <td className="py-2 px-2 text-right font-mono text-slate-600">
                            ₹{(item.igst || 0).toFixed(2)}
                          </td>
                        )}
                        <td className="py-2 px-2 text-right font-bold font-mono text-slate-900">
                          ₹{item.totalAmount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Section (Payment details + Bill total) */}
              <div className="grid grid-cols-2 gap-6 pt-2">
                
                {/* Left Box: Payment Details */}
                <div className="border border-slate-200 rounded-lg p-3 text-xs bg-slate-50/50 space-y-2">
                  <h4 className="font-bold text-slate-800 uppercase text-[11px] pb-1 border-b border-slate-200">
                    {invoice.type.includes("return") ? "Settlement Details" : "Payment Details"}
                  </h4>
                  <div className="space-y-1.5 text-slate-700">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">{invoice.type.includes("return") ? "Settlement Mode:" : "Payment Mode:"}</span>
                      <span className="font-semibold text-slate-900">{getPaymentModeLabel(invoice.paymentType, invoice.type)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">{invoice.type.includes("return") ? "Refund Paid / Received:" : "Amount Paid:"}</span>
                      <span className="font-bold text-slate-900">{formatRupees(invoice.paidAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                      <span className="text-slate-600">{invoice.type.includes("return") ? "Adjusted on Account:" : "Balance Due:"}</span>
                      <span className={`font-bold ${invoice.remainingAmount > 0 ? (invoice.type.includes("return") ? "text-indigo-700" : "text-rose-600") : "text-emerald-700"}`}>
                        {formatRupees(invoice.remainingAmount)}
                      </span>
                    </div>
                    {invoice.notes && (
                      <div className="pt-2 border-t border-slate-200 text-slate-600 text-[11px]">
                        <span className="font-semibold text-slate-700 block mb-0.5">Notes:</span>
                        <p className="italic">"{invoice.notes}"</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Box: Bill Amount Calculations */}
                <div className="text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-700">
                    <span>Taxable Amount (Subtotal):</span>
                    <span className="font-semibold font-mono">{formatRupees(invoice.subtotal)}</span>
                  </div>

                  {!isInterstate ? (
                    <>
                      <div className="flex justify-between text-slate-700">
                        <span>CGST Total:</span>
                        <span className="font-mono">{formatRupees(invoice.cgstTotal || 0)}</span>
                      </div>
                      <div className="flex justify-between text-slate-700">
                        <span>SGST Total:</span>
                        <span className="font-mono">{formatRupees(invoice.sgstTotal || 0)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-slate-700">
                      <span>IGST Total:</span>
                      <span className="font-mono">{formatRupees(invoice.igstTotal || 0)}</span>
                    </div>
                  )}

                  {invoice.extraCharges && invoice.extraCharges.length > 0 && (
                    <div className="space-y-1 border-t border-dashed border-slate-200 pt-1">
                      {invoice.extraCharges.map((ch, idx) => (
                        <div key={idx} className="flex justify-between text-slate-600 text-[11px]">
                          <span>{ch.title}:</span>
                          <span className="font-mono">{formatRupees(ch.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center text-sm font-bold bg-slate-900 text-white rounded-lg px-3 py-2 mt-2">
                    <span>Grand Total:</span>
                    <span className="font-mono text-base">{formatRupees(invoice.totalAmount)}</span>
                  </div>
                </div>

              </div>

              {/* HSN Wise Tax Summary */}
              {hsnSummary.length > 0 && (
                <div className="border border-slate-200 rounded-lg overflow-hidden text-[10.5px]">
                  <div className="bg-slate-100 py-1.5 px-3 border-b border-slate-200">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                      Tax Summary (HSN Wise)
                    </span>
                  </div>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[9.5px]">
                        <th className="py-1.5 px-3">HSN Code</th>
                        <th className="py-1.5 px-2 text-right">Taxable Value</th>
                        <th className="py-1.5 px-2 text-center">GST Rate</th>
                        {!isInterstate ? (
                          <>
                            <th className="py-1.5 px-2 text-right">CGST</th>
                            <th className="py-1.5 px-2 text-right">SGST</th>
                          </>
                        ) : (
                          <th className="py-1.5 px-2 text-right">IGST</th>
                        )}
                        <th className="py-1.5 px-3 text-right">Total Tax</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 font-mono">
                      {hsnSummary.map((sum, idx) => (
                        <tr key={idx} className="text-slate-700">
                          <td className="py-1.5 px-3 font-semibold text-slate-900">{sum.hsn}</td>
                          <td className="py-1.5 px-2 text-right">₹{sum.amountBeforeTax.toFixed(2)}</td>
                          <td className="py-1.5 px-2 text-center">{sum.gstRate}%</td>
                          {!isInterstate ? (
                            <>
                              <td className="py-1.5 px-2 text-right">₹{sum.cgst.toFixed(2)}</td>
                              <td className="py-1.5 px-2 text-right">₹{sum.sgst.toFixed(2)}</td>
                            </>
                          ) : (
                            <td className="py-1.5 px-2 text-right">₹{sum.igst.toFixed(2)}</td>
                          )}
                          <td className="py-1.5 px-3 text-right font-bold text-slate-900">₹{sum.taxAmount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Bottom Terms & Signature */}
              <div className="grid grid-cols-2 gap-6 pt-3 border-t border-slate-200 text-[11px] text-slate-600">
                <div>
                  <h5 className="font-bold text-slate-800 uppercase text-[10px] mb-1 tracking-wider">
                    Terms & Conditions
                  </h5>
                  <ol className="list-decimal list-inside space-y-0.5 text-slate-600 leading-relaxed text-[10.5px]">
                    <li>Goods once sold will not be taken back without bill.</li>
                    <li>Please make payment on or before the due date.</li>
                    <li>Subject to {business.state || "local"} jurisdiction only.</li>
                  </ol>
                </div>

                <div className="flex flex-col items-end justify-between min-h-[70px] text-right">
                  <p className="font-bold text-slate-800 uppercase text-[11px]">
                    {business.signatureText || `For ${business.name}`}
                  </p>
                  <div className="border-t border-slate-400 w-44 text-center pt-1 text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                    Authorized Signatory
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
