/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Utensils, Printer, X, Clock, MapPin, Tag } from "lucide-react";
import { BusinessProfile } from "../types.js";

interface KOTLineItem {
  name: string;
  quantity: number;
  unit?: string;
  notes?: string;
}

interface KOTPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: BusinessProfile;
  tableNumber: string;
  orderType: 'dine_in' | 'takeaway' | 'delivery';
  items: KOTLineItem[];
  kotNumber?: string;
  notes?: string;
}

export default function KOTPrintModal({
  isOpen,
  onClose,
  business,
  tableNumber,
  orderType,
  items,
  kotNumber,
  notes
}: KOTPrintModalProps) {
  if (!isOpen) return null;

  const currentKotNumber = kotNumber || `KOT-${Date.now().toString().slice(-4)}`;
  const currentTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const currentDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const handlePrint = () => {
    window.print();
  };

  const orderTypeLabel = orderType === 'dine_in'
    ? 'DINE-IN'
    : orderType === 'takeaway'
    ? 'PARCEL / TAKEAWAY'
    : 'HOME DELIVERY';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-scale-in">
        
        {/* Modal Toolbar */}
        <div className="bg-amber-950 text-white p-4 flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Utensils className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">Kitchen Order Ticket (KOT)</h3>
              <p className="text-[11px] text-amber-200/80 font-mono">#{currentKotNumber} • Table {tableNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print KOT</span>
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

        {/* Printable KOT Thermal Slip */}
        <div className="p-6 overflow-y-auto bg-slate-50 flex justify-center">
          <div className="bg-white border-2 border-dashed border-slate-300 p-5 rounded-lg w-full max-w-[320px] text-black font-mono shadow-sm printable-content">
            
            {/* Header */}
            <div className="text-center pb-2 border-b-2 border-black">
              <h2 className="font-black text-sm uppercase tracking-wide">{business.name || "RESTAURANT & CAFE"}</h2>
              <div className="inline-block mt-1 px-2.5 py-0.5 bg-black text-white text-[11px] font-black uppercase tracking-wider rounded">
                KITCHEN ORDER TICKET (KOT)
              </div>
            </div>

            {/* Meta Info */}
            <div className="py-2.5 border-b border-black text-xs space-y-1">
              <div className="flex justify-between items-center text-sm font-black">
                <span>TABLE:</span>
                <span className="text-lg bg-slate-100 px-2 py-0.5 rounded border border-slate-400">{tableNumber || "Takeaway"}</span>
              </div>
              <div className="flex justify-between font-bold text-[11px]">
                <span>TYPE:</span>
                <span className="uppercase">{orderTypeLabel}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-700">
                <span>TOKEN: #{currentKotNumber}</span>
                <span>{currentDate} {currentTime}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="py-2.5 border-b-2 border-black">
              <div className="flex justify-between font-black text-xs pb-1 border-b border-black">
                <span className="w-12 text-center">QTY</span>
                <span className="flex-1 pl-2">ITEM DESCRIPTION</span>
              </div>
              <div className="divide-y divide-dashed divide-slate-300">
                {items.map((it, idx) => (
                  <div key={idx} className="flex justify-between py-1.5 text-xs">
                    <span className="w-12 text-center font-black text-sm">{it.quantity}</span>
                    <div className="flex-1 pl-2">
                      <span className="font-bold uppercase text-[12px]">{it.name}</span>
                      {it.notes && (
                        <p className="text-[10px] italic text-slate-600 mt-0.5">Note: {it.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Special Instructions / Footer */}
            {notes && (
              <div className="py-2 border-b border-black text-[11px]">
                <span className="font-bold block">Chef Instructions:</span>
                <p className="italic text-slate-800">{notes}</p>
              </div>
            )}

            <div className="pt-2 text-center text-[10px] font-bold text-slate-600 uppercase">
              *** FOR KITCHEN DISPATCH ONLY ***
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
