/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  LayoutDashboard,
  Users,
  PackageCheck,
  FileSpreadsheet,
  ReceiptIndianRupee,
  Settings,
  AlertTriangle,
  Building2,
  RefreshCw,
  Coins,
  ShieldCheck,
  Truck,
  X
} from "lucide-react";
import { BusinessProfile } from "../types.js";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  business: BusinessProfile;
  lowStockCount: number;
  unpaidCount: number;
  pendingChallansCount?: number;
  onResetDb: () => void;
  isOpen: boolean;
  onClose: () => void;
  sessionRole?: string;
  sessionPermissions?: any;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  business,
  lowStockCount,
  unpaidCount,
  pendingChallansCount,
  onResetDb,
  isOpen,
  onClose,
  sessionRole,
  sessionPermissions
}: SidebarProps) {
  
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, badge: 0 },
    { id: "parties", label: "Parties", icon: Users, badge: unpaidCount },
    { id: "items", label: "Items & Stock", icon: PackageCheck, badge: lowStockCount },
    { id: "sales", label: "Sales Invoices", icon: ReceiptIndianRupee, badge: 0 },
    { id: "challans", label: "Delivery Challans", icon: Truck, badge: pendingChallansCount || 0 },
    { id: "purchases", label: "Purchase Bills", icon: Building2, badge: 0 },
    { id: "transactions", label: "Income & Expenses", icon: Coins, badge: 0 },
    { id: "reports", label: "Reports & GST", icon: FileSpreadsheet, badge: 0 },
  ];

  // If user is owner or admin, append the User Access module
  if (sessionRole === "owner" || sessionRole === "admin" || sessionRole === "manager") {
    menuItems.push({ id: "access_control", label: "User Access", icon: ShieldCheck, badge: 0 });
  }

  // Always append Settings at the bottom
  menuItems.push({ id: "settings", label: "Settings", icon: Settings, badge: 0 });

  // Filter menu items dynamically according to fine-grained view permissions
  const filteredMenuItems = menuItems.filter(item => {
    if (!sessionPermissions) return true;
    const block = sessionPermissions[item.id];
    if (block && typeof block === "object") {
      return block.view;
    }
    return true;
  });

  // Derive business initials for beautiful custom avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "BP";
  };

  return (
    <>
      {/* Mobile background overlay */}
      {isOpen && (
        <div
          id="v-sidebar-overlay"
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 z-25 lg:hidden transition-opacity print:hidden"
        />
      )}

      <div
        id="v-sidebar"
        className={`w-68 bg-emerald-950 text-emerald-100 border-r border-emerald-900 flex flex-col h-screen fixed top-0 left-0 z-30 print:hidden select-none transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        
        {/* Brand logo & Profile summary */}
        <div id="v-sidebar-header" className="p-5 border-b border-emerald-900 flex items-center justify-between bg-emerald-950">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            {business.logoUrl ? (
              <img
                id="sidebar-business-logo"
                src={business.logoUrl}
                referrerPolicy="no-referrer"
                alt="Business Logo"
                className="w-10 h-10 rounded-xl object-contain bg-white p-1 shadow-md ring-2 ring-emerald-500/20 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-slate-900 text-lg shadow-md ring-2 ring-emerald-500/20 shrink-0">
                {getInitials(business.name)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-slate-50 truncate tracking-wide">
                {business.name || "My Business"}
              </h2>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span className="text-[10px] font-mono tracking-widest text-emerald-400">
                  {business.gstin ? "GSTIN ACTIVE" : "GST COMPLIANT"}
                </span>
              </div>
            </div>
          </div>

          {/* Close button for mobile screens */}
          <button
            id="v-sidebar-close-btn"
            onClick={onClose}
            className="lg:hidden p-1.5 hover:bg-emerald-900 rounded-lg text-emerald-300 hover:text-white transition cursor-pointer ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation menu items */}
        <nav id="v-sidebar-menu" className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredMenuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                id={`sidebar-${item.id}-btn`}
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition duration-155 ease-out select-none group font-medium ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/40"
                    : "text-emerald-300 hover:bg-emerald-900/40 hover:text-emerald-50"
                }`}
              >
                <div className="flex items-center space-x-3.5">
                  <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-105 ${isActive ? "text-white" : "text-emerald-300 group-hover:text-emerald-50"}`} />
                  <span className="text-sm tracking-wide">{item.label}</span>
                </div>
                
                {/* Dynamic notification badge */}
                {item.badge > 0 && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex items-center justify-center ${
                    isActive 
                      ? "bg-emerald-950/40 text-white" 
                      : item.id === "items" 
                          ? "bg-amber-500/20 text-amber-400" 
                          : "bg-rose-500/20 text-rose-450"
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Brand version info */}
        <div id="v-sidebar-footer" className="p-4 border-t border-emerald-900 bg-emerald-950/40 text-center">
          <span className="text-[9px] text-emerald-400 font-mono tracking-wide">Billing On Hand v2.6</span>
        </div>

      </div>
    </>
  );
}
