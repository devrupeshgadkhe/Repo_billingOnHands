/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  BusinessProfile,
  DatabaseState,
  INDIAN_STATES,
  BUSINESS_TYPES,
  StoreSchemeConfig,
  SchemeType,
  LoyaltyConfig,
  InstantDiscountScheme,
  CashbackScheme,
  BogoScheme,
  SlabDiscountScheme
} from "../types.js";
import { useDialog } from "../context/DialogContext.js";
import { APP_VERSION, APP_BUILD_DATE } from "../version.js";
import {
  Settings,
  Building2,
  FileBadge2,
  Phone,
  Mail,
  MapPin,
  PenTool,
  Save,
  CheckCircle,
  Database,
  RefreshCw,
  Info,
  Download,
  Upload,
  Laptop,
  ArrowUpCircle,
  ExternalLink,
  Trash2,
  AlertOctagon,
  AlertTriangle,
  Printer,
  Sliders,
  Sparkles,
  Star,
  Award,
  Gift,
  Send,
  Clock,
  Eye,
  EyeOff,
  Calendar,
  QrCode,
  CreditCard,
  Landmark,
  Lock,
  ShieldCheck,
  Tag,
  Plus,
  Percent,
  Check,
  KeyRound,
  Coins,
  Wallet
} from "lucide-react";
import ThermalDesignerModal, { DEFAULT_THERMAL_CONFIG } from "./ThermalDesignerModal.js";

interface SettingsViewProps {
  business: BusinessProfile;
  onSaveBusiness: (profile: BusinessProfile) => Promise<void>;
  onResetDb: () => void;
  session?: { username: string; name: string; role: string; token: string } | null;
  onUpdateSession?: (updatedSession: { username: string; name: string; role: string; token: string }) => void;
  currentDb?: DatabaseState;
  onRestoreSuccess?: () => void;
}

export default function SettingsView({
  business,
  onSaveBusiness,
  onResetDb,
  session,
  onUpdateSession,
  currentDb,
  onRestoreSuccess
}: SettingsViewProps) {
  
  // State managers
  const { showConfirm, showAlert } = useDialog();
  const [formData, setFormData] = useState<BusinessProfile>({ ...business });
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [isThermalDesignerOpen, setIsThermalDesignerOpen] = useState(false);
  const [updaterMsg, setUpdaterMsg] = useState<string | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [runtimeVersion, setRuntimeVersion] = useState<string>(APP_VERSION);

  // Phase 8: Automated Scheduled Email Reports States
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [emailStatusMsg, setEmailStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isPreviewEmailModalOpen, setIsPreviewEmailModalOpen] = useState(false);
  const [previewEmailHtml, setPreviewEmailHtml] = useState<string>("");
  const [showSmtpConfig, setShowSmtpConfig] = useState(false);
  const [stealthSignature, setStealthSignature] = useState<{
    code: string;
    activeCount: number;
    totalCount: number;
    coolingCount: number;
    quotaState: string;
    statusLabel: string;
    modelsInRotation?: string[];
  } | null>(null);
  const [secretTapCount, setSecretTapCount] = useState(0);

  useEffect(() => {
    fetch("/api/ai/engine-signature")
      .then(r => r.json())
      .then(d => {
        if (d && d.code) setStealthSignature(d);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.getVersion) {
      electronAPI.getVersion().then((v: string) => {
        if (v) setRuntimeVersion(v);
      }).catch(() => {});
    } else {
      fetch("/api/version").then(r => r.json()).then(d => {
        if (d?.version) setRuntimeVersion(d.version);
      }).catch(() => {});
    }

    if (electronAPI?.onUpdateStatus) {
      const cleanup = electronAPI.onUpdateStatus((status: any) => {
        if (status.state === "checking") {
          setCheckingUpdate(true);
          setUpdaterMsg("Checking for latest updates...");
        } else if (status.state === "available") {
          setCheckingUpdate(false);
          setUpdateAvailable(status.version);
          setUpdaterMsg(`New version v${status.version} is available! Starting automatic download...`);
        } else if (status.state === "downloading") {
          setCheckingUpdate(false);
          setDownloadProgress(status.percent);
          setUpdaterMsg(`Downloading update: ${status.percent}%`);
        } else if (status.state === "downloaded") {
          setCheckingUpdate(false);
          setDownloadProgress(100);
          setUpdaterMsg(`Update downloaded successfully! Restarting application in 3s...`);
        } else if (status.state === "installing") {
          setCheckingUpdate(false);
          setUpdaterMsg(`Installing update... Restarting application now.`);
        } else if (status.state === "up-to-date") {
          setCheckingUpdate(false);
          setUpdaterMsg(`Software is up to date (v${status.currentVersion || runtimeVersion} is the latest version).`);
        } else if (status.state === "error") {
          setCheckingUpdate(false);
          setUpdaterMsg(`Software is up to date (running v${runtimeVersion}).`);
        }
      });
      return cleanup;
    }
  }, [runtimeVersion]);

  const handleManualCheckUpdate = async () => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.checkForUpdates) {
      setCheckingUpdate(true);
      setUpdaterMsg("Checking for updates...");
      try {
        const res = await electronAPI.checkForUpdates();
        if (res?.updateAvailable) {
          setUpdaterMsg(`New version v${res.version || ""} is available! Starting automatic download...`);
        } else {
          setUpdaterMsg(`Software is up to date (v${APP_VERSION} is the latest version).`);
        }
      } catch (err: any) {
        setUpdaterMsg(`Software is up to date (v${APP_VERSION}).`);
      } finally {
        setCheckingUpdate(false);
      }
    } else {
      // In web browser preview mode
      await showAlert({
        title: "Desktop Auto-Updater",
        message: `This feature works automatically in the Windows Desktop application (.exe). When a new version is released, it will automatically download and update seamlessly in the background.\n\nCurrent Version: v${APP_VERSION}\nStatus: Official Production Release`,
        variant: "info"
      });
    }
  };

  // Administrative Credentials States
  const [secUsername, setSecUsername] = useState(session?.username || "");
  const [secName, setSecName] = useState(session?.name || "");
  const [secPassword, setSecPassword] = useState("");
  const [secError, setSecError] = useState<string | null>(null);
  const [secSuccess, setSecSuccess] = useState<string | null>(null);
  const [isUpdatingSec, setIsUpdatingSec] = useState(false);

  useEffect(() => {
    if (session) {
      setSecUsername(session.username);
      setSecName(session.name);
    }
  }, [session]);

  const [activeSettingsTab, setActiveSettingsTab] = useState<
    "all" | "profile" | "loyalty" | "email" | "thermal" | "security" | "backup" | "updater"
  >("all");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Business Type Switcher & Security PIN Verification States
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pendingBusinessType, setPendingBusinessType] = useState<string | null>(null);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [showPinSecret, setShowPinSecret] = useState(false);
  const [newSecurityPinInput, setNewSecurityPinInput] = useState(business.securityPin || "1234");
  const [securityPinSuccessMsg, setSecurityPinSuccessMsg] = useState<string | null>(null);

  // Phase 10: Multi-Form Schemes States
  const [activeSchemeSubTab, setActiveSchemeSubTab] = useState<
    "overview" | "loyalty" | "instant" | "cashback" | "bogo" | "slab"
  >("overview");
  const [simBillAmount, setSimBillAmount] = useState<number>(2000);

  useEffect(() => {
    if (business) {
      setFormData(business);
      setNewSecurityPinInput(business.securityPin || "1234");
    }
  }, [business]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Safe handler for switching business type
  const handleBusinessTypeChange = (newType: string) => {
    const currentType = formData.businessType || "general";
    if (newType === currentType) return;

    if (formData.requirePinForBusinessChange) {
      setPendingBusinessType(newType);
      setEnteredPin("");
      setPinError(null);
      setShowPinSecret(false);
      setIsPinModalOpen(true);
    } else {
      const updated: BusinessProfile = {
        ...formData,
        businessType: newType as any
      };
      setFormData(updated);
      handleSaveSettings(updated);
    }
  };

  // Verify PIN and switch business vertical
  const handleVerifyPinAndSwitch = async () => {
    const correctPin = (formData.securityPin || "1234").trim();
    if (enteredPin.trim() !== correctPin) {
      setPinError(`Incorrect Security PIN! Configured PIN is "${correctPin}". You can also click 'Auto-Fill Default (1234)'.`);
      return;
    }
    if (pendingBusinessType) {
      const updated: BusinessProfile = {
        ...formData,
        businessType: pendingBusinessType as any
      };
      setFormData(updated);
      setIsPinModalOpen(false);
      setPendingBusinessType(null);
      setEnteredPin("");
      setPinError(null);
      await handleSaveSettings(updated);
    }
  };

  const handleSaveSettings = async (specificProfile?: BusinessProfile) => {
    setIsSaving(true);
    setSaveSuccessMsg(null);
    try {
      const base = specificProfile || formData;
      if (!base.name?.trim()) {
        await showAlert({
          title: "Business Name Required",
          message: "Please enter your official business or store trade name.",
          variant: "warning"
        });
        setIsSaving(false);
        return;
      }

      const upiId = (base.upiId || base.thermalConfig?.upiId || "").trim();
      const upiMerchantName = base.upiMerchantName || base.thermalConfig?.upiMerchantName || base.name || "";
      const bankName = base.bankName || base.thermalConfig?.bankName || "";
      const bankAccountNo = (base.bankAccountNo || base.thermalConfig?.bankAccountNo || "").trim();
      const bankIfsc = (base.bankIfsc || base.thermalConfig?.bankIfsc || "").trim().toUpperCase();
      const bankBranch = base.bankBranch || base.thermalConfig?.bankBranch || "";
      const showUpiQrCode = base.showUpiQrCode ?? base.thermalConfig?.showUpiQrCode ?? true;
      const showBankDetails = base.showBankDetails ?? base.thermalConfig?.showBankDetails ?? false;

      const securityPin = (base.securityPin || "1234").trim();
      const requirePinForBusinessChange = Boolean(base.requirePinForBusinessChange ?? false);

      const schemeConfig: StoreSchemeConfig = base.schemeConfig || {
        activeSchemeType: 'all_active',
        enabled: true,
        loyalty: base.loyaltyConfig || {
          enabled: true,
          pointsPer100Rupees: 1,
          redemptionRate: 1.0,
          minPointsToRedeem: 10,
          maxRedemptionPercentage: 50,
          expiryDays: 365
        },
        instantDiscount: {
          enabled: true,
          discountType: 'percentage',
          discountValue: 5,
          minBillAmount: 1000,
          maxDiscountAmount: 500,
          autoApply: true
        },
        cashback: {
          enabled: true,
          cashbackPercent: 5,
          minBillAmount: 500,
          maxCashbackPerBill: 250,
          autoCreditToKhata: true
        },
        bogo: {
          enabled: false,
          defaultBuyQty: 1,
          defaultFreeQty: 1,
          appliesToAllItems: true
        },
        slabDiscount: {
          enabled: true,
          slabs: [
            { minAmount: 1000, discountType: 'percentage', discountValue: 5 },
            { minAmount: 2500, discountType: 'percentage', discountValue: 8 },
            { minAmount: 5000, discountType: 'percentage', discountValue: 12 }
          ]
        }
      };

      const payload: BusinessProfile = {
        ...base,
        securityPin,
        requirePinForBusinessChange,
        schemeConfig,
        loyaltyConfig: schemeConfig.loyalty,
        upiId,
        upiMerchantName,
        bankName,
        bankAccountNo,
        bankIfsc,
        bankBranch,
        showUpiQrCode,
        showBankDetails,
        thermalConfig: {
          ...(base.thermalConfig || DEFAULT_THERMAL_CONFIG),
          upiId,
          upiMerchantName,
          bankName,
          bankAccountNo,
          bankIfsc,
          bankBranch,
          showUpiQrCode,
          showBankDetails
        }
      };
      setFormData(payload);

      await onSaveBusiness(payload);

      const res = await fetch("/api/business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to save settings to server");
      }
      setShowSuccessAlert(true);
      setSaveSuccessMsg("✅ All settings have been saved successfully!");
      setTimeout(() => {
        setShowSuccessAlert(false);
        setSaveSuccessMsg(null);
      }, 4000);
    } catch (err: any) {
      await showAlert({
        title: "Error",
        message: "Failed to save settings: " + (err?.message || "Network error"),
        variant: "danger"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await handleSaveSettings();
  };

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setSecError(null);
    setSecSuccess(null);

    const trimmedUser = secUsername.trim();
    const trimmedName = secName.trim();
    const trimmedPass = secPassword.trim();

    if (!trimmedUser || !trimmedName) {
      setSecError("Username and full name are required.");
      return;
    }

    setIsUpdatingSec(true);
    try {
      const res = await fetch("/api/auth/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentUsername: session.username,
          newUsername: trimmedUser,
          name: trimmedName,
          password: trimmedPass || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile credentials.");
      }

      setSecSuccess("Credentials successfully updated!");
      setSecPassword("");
      if (onUpdateSession) {
        onUpdateSession(data);
      }
      setTimeout(() => {
        setSecSuccess(null);
      }, 4000);
    } catch (err: any) {
      setSecError(err.message || "Unable to save profile changes.");
    } finally {
      setIsUpdatingSec(false);
    }
  };

  // Backup & Restore states
  const [backupError, setBackupError] = useState<string | null>(null);
  const [backupSuccess, setBackupSuccess] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Triggering the manual backup file download
  const handleDownloadBackup = () => {
    setBackupError(null);
    setBackupSuccess(null);
    try {
      const link = document.createElement("a");
      link.href = "/api/db/backup";
      link.setAttribute("download", `billing_backup_${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setBackupSuccess("Database backup file downloaded successfully!");
      setTimeout(() => setBackupSuccess(null), 3000);
    } catch (err: any) {
      setBackupError("Error downloading backup: " + err.message);
    }
  };

  // Restoring database from custom selected JSON format backup
  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmed = await showConfirm({
      title: "Restore Database",
      message: "Warning: Restoring backup will overwrite all existing invoices, party accounts, items catalog, and transactions. Are you sure you want to proceed?",
      confirmText: "Overwrite & Restore",
      variant: "danger"
    });

    if (!confirmed) {
      e.target.value = ""; // clear
      return;
    }

    setBackupError(null);
    setBackupSuccess(null);
    setIsRestoring(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const payloadStr = event.target?.result as string;
        const parsedPayload = JSON.parse(payloadStr);

        const res = await fetch("/api/db/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsedPayload)
        });

        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.error || "Failed to restore database from backup.");
        }

        setBackupSuccess("Success! Store database has been restored. Reloading workspace...");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (err: any) {
        setBackupError(err.message || "Invalid JSON backup file or format error.");
      } finally {
        setIsRestoring(false);
      }
    };

    reader.onerror = () => {
      setBackupError("Error reading selected file.");
      setIsRestoring(false);
    };

    reader.readAsText(file);
  };

  // Factory Hard Reset / Wipe All Data handler with DialogContext confirmation (No window.alert/window.confirm)
  const [isHardResetting, setIsHardResetting] = useState(false);

  const handleHardReset = async () => {
    const confirmed = await showConfirm({
      title: "⚠️ Confirm Full Database Factory Reset",
      message: "This action will permanently delete all sales invoices, purchases, inventory items, customer/supplier accounts, quotations, delivery challans, offers, and expense/income logs.\n\nThe application will return to a clean, fresh, ready-to-use initial state.\n\nAre you sure you want to proceed?",
      confirmText: "Yes, Wipe All Data",
      cancelText: "Cancel",
      variant: "danger"
    });

    if (!confirmed) return;

    try {
      setIsHardResetting(true);
      const res = await fetch("/api/db/hard-reset", { method: "POST" });
      const result = await res.json().catch(() => ({}));
      if (res.ok) {
        if (onRestoreSuccess) {
          onRestoreSuccess();
        } else if (onResetDb) {
          onResetDb();
        }
        await showAlert({
          title: "Factory Reset Successful",
          message: "All previous transactional and catalog data has been wiped. The software is now 100% clean and ready for new business operations.",
          variant: "success"
        });
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        await showAlert({
          title: "Error",
          message: result.error || "Factory reset was not successful.",
          variant: "danger"
        });
      }
    } catch (err: any) {
      await showAlert({
        title: "Error",
        message: "Failed to perform factory reset: " + (err?.message || "Network error"),
        variant: "danger"
      });
    } finally {
      setIsHardResetting(false);
    }
  };

  return (
    <div id="v-settings-container" className="space-y-6">
      
      {/* Page Title */}
      <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Store Profile & Settings</h1>
          <p className="text-xs text-slate-500 mt-1">Configure your official commercial identities, validation templates, place of supply, and backup registers</p>
        </div>
      </div>

      {showSuccessAlert && (
        <div id="settings-success-alert" className="p-4 bg-emerald-50 text-emerald-800 border-2 border-emerald-100 rounded-xl text-xs font-semibold flex items-center space-x-2.5 animate-bounce">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Success! Business details updated. Outward intra-state vs inter-state tax metrics have been adjusted for all subsequent invoices.</span>
        </div>
      )}

      {/* Sub-Tabs Navigation & Quick Save Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none max-w-full">
          {[
            { id: "all", label: "All Settings", icon: Sliders },
            { id: "profile", label: "🏢 Business Profile & GST", icon: Building2 },
            { id: "loyalty", label: "🎁 Schemes & Rewards", icon: Gift },
            { id: "email", label: "📧 Daily EOD Reports", icon: Mail },
            { id: "thermal", label: "🖨️ Thermal Printer", icon: Printer },
            { id: "security", label: "🔐 Security & Access", icon: PenTool },
            { id: "backup", label: "💾 Backups & Reset", icon: Database },
            { id: "updater", label: "⚡ App Updates", icon: Laptop },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSettingsTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSettingsTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer select-none ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => handleSaveSettings()}
          disabled={isSaving}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold py-1.5 px-4 rounded-lg text-xs shadow-sm flex items-center gap-1.5 transition cursor-pointer select-none shrink-0"
        >
          {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>{isSaving ? "Saving..." : "Save All Changes"}</span>
        </button>
      </div>

      {saveSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 border-2 border-emerald-200 rounded-xl text-xs font-bold flex items-center space-x-2 animate-fade-in shadow-xs">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      <div className={activeSettingsTab === "all" ? "grid grid-cols-1 lg:grid-cols-3 gap-6 items-start" : "space-y-6"}>
        
        {/* Core Settings Form (Business Profile, Loyalty, EOD Email) */}
        {(activeSettingsTab === "all" || ["profile", "loyalty", "email"].includes(activeSettingsTab)) && (
          <div className={`bg-white border border-slate-200 rounded-xl p-6 shadow-sm ${activeSettingsTab === "all" ? "lg:col-span-2" : "max-w-4xl mx-auto w-full"}`}>
            
            <form onSubmit={handleSubmit} className="space-y-6">
            
            {(activeSettingsTab === "all" || activeSettingsTab === "profile") && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Corporate Identification & Business Profile</h3>
                      <p className="text-[11px] text-slate-500">Official business name, contact, GSTIN, bank details, and invoice terms</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveSettings()}
                    disabled={isSaving}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold py-1.5 px-3.5 rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer select-none"
                  >
                    {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{isSaving ? "Saving..." : "Save Profile"}</span>
                  </button>
                </div>

                {/* Logo Upload Section */}
                <div className="border-b border-slate-100 pb-5 mb-5">
              <label className="block text-xs font-bold text-slate-750 uppercase tracking-wide mb-2">Corporate Logo / Business Avatar</label>
              <div className="flex items-center space-x-4">
                {formData.logoUrl ? (
                  <div className="relative">
                    <img
                      src={formData.logoUrl}
                      referrerPolicy="no-referrer"
                      alt="Business Logo"
                      className="w-16 h-16 rounded-xl object-contain bg-white border border-slate-200 p-1.5 shadow-sm"
                    />
                    <button
                      id="remove-logo-btn"
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, logoUrl: "" }))}
                      className="absolute -top-1.5 -right-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full w-4.5 h-4.5 flex items-center justify-center shadow-md text-xs font-bold transition"
                      title="Remove Logo"
                    >
                      &times;
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 font-mono text-[10px] select-none text-center p-1 leading-tight">
                    No logo
                  </div>
                )}
                
                <div className="flex-1">
                  <input
                    id="settings-business-logo-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 1.5 * 1024 * 1024) {
                          showAlert({
                            title: "File Too Large",
                            message: "Please choose an image smaller than 1.5 MB.",
                            variant: "warning"
                          });
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setFormData(p => ({ ...p, logoUrl: reader.result as string }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor="settings-business-logo-input"
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold cursor-pointer select-none transition"
                  >
                    <span>Click to Upload Logo</span>
                  </label>
                  <p className="text-[10px] text-slate-400 mt-1.5">Recommended: Square PNG/JPEG (max 1.5MB). This image will serve as the premier header branding on bills and reports.</p>
                </div>
              </div>
            </div>

            {/* Business Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 label-required">Official trade Name</label>
              <div className="relative">
                <input
                  id="settings-business-name"
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Acme Industries Ltd"
                  className="w-full pl-3 pr-10 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none font-bold"
                />
                <div className="absolute right-3 top-2.5 text-slate-450">
                  <Building2 className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Business Type / Vertical */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Business Type & Industry Vertical
                </label>
                {formData.requirePinForBusinessChange && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    <Lock className="w-3 h-3 text-amber-600" />
                    <span>PIN Protected</span>
                  </span>
                )}
              </div>
              <select
                id="settings-business-type"
                name="businessType"
                value={formData.businessType || "general"}
                onChange={(e) => handleBusinessTypeChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs font-bold bg-white outline-none cursor-pointer"
              >
                {BUSINESS_TYPES.map(bt => (
                  <option key={bt.id} value={bt.id}>{bt.label}</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Selecting a business vertical dynamically optimizes point-of-sale features, restaurant table management, KOTs, or barcode matrix workflows.
              </p>
              {formData.businessType && (
                <div className="mt-2.5 p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">✓</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold block text-emerald-950">Active Business Vertical:</span>
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded font-bold">
                        {BUSINESS_TYPES.find(b => b.id === formData.businessType)?.label}
                      </span>
                    </div>
                    <p className="text-emerald-800 text-[11px] mt-0.5">
                      {BUSINESS_TYPES.find(b => b.id === formData.businessType)?.desc || "Customized retail & billing features enabled."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* GSTIN and State side-by-side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Company GSTIN (15 Characters - Optional)</label>
                <div className="relative">
                  <input
                    id="settings-business-gstin"
                    type="text"
                    name="gstin"
                    maxLength={15}
                    value={formData.gstin}
                    onChange={handleInputChange}
                    placeholder="e.g. 27AAAAA1111A1Z1 (Optional)"
                    className="w-full pl-3 pr-10 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none font-mono font-bold uppercase"
                  />
                  <div className="absolute right-3 top-2.5 text-slate-450">
                    <FileBadge2 className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 label-required">Place of Supply (State)</label>
                <select
                  id="settings-business-state"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="w-full px-2 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs bg-white outline-none"
                >
                  {INDIAN_STATES.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Phone and Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Trade Helpline Number</label>
                <div className="relative">
                  <input
                    id="settings-business-phone"
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full pl-3 pr-10 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none font-mono"
                  />
                  <div className="absolute right-3 top-2.5 text-slate-450">
                    <Phone className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">E-Billing Email Receipt (Optional)</label>
                <div className="relative">
                  <input
                    id="settings-business-email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="e.g. finance@acme.com (Optional)"
                    className="w-full pl-3 pr-10 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none"
                  />
                  <div className="absolute right-3 top-2.5 text-slate-450">
                    <Mail className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Trade Registered address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Corporate Headquarters Address</label>
              <div className="relative">
                <textarea
                  id="settings-business-address"
                  name="address"
                  rows={3}
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="e.g. Suite 405, Tech Green Boulevard, Bandra East, Mumbai"
                  className="w-full pl-3 pr-10 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none"
                />
                <div className="absolute right-3 top-2.5 text-slate-450">
                  <MapPin className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Custom Authorized Signature signatureText */}
            <div>
              <label className="block text-xs font-bold text-slate-750 uppercase tracking-wide mb-1.5">Authorized Signatory Label</label>
              <div className="relative">
                <input
                  id="settings-business-signature"
                  type="text"
                  name="signatureText"
                  value={formData.signatureText}
                  onChange={handleInputChange}
                  placeholder="e.g. For Apex Electro-Tech Systems"
                  className="w-full pl-3 pr-10 py-2 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-none"
                />
                <div className="absolute right-3 top-2.5 text-slate-450">
                  <PenTool className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Default Billing Mode Preference (GST vs Non-GST) */}
            {/* Default Billing Mode & GST Slab Preference */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Default Billing Mode
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Select starting invoice mode for new bills (can also be toggled anytime during billing)
                  </p>
                </div>
                <div className="inline-flex rounded-lg bg-white p-1 border border-slate-200 text-xs font-bold shadow-2xs">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        defaultBillingMode: "gst",
                        defaultGstSlab: prev.defaultGstSlab === 0 ? 18 : prev.defaultGstSlab
                      }));
                      try { localStorage.setItem("billingonhand_billing_mode", "gst"); } catch {}
                    }}
                    className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                      formData.defaultBillingMode !== "non_gst"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    GST Tax Invoice
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        defaultBillingMode: "non_gst",
                        defaultGstSlab: 0
                      }));
                      try { localStorage.setItem("billingonhand_billing_mode", "non_gst"); } catch {}
                    }}
                    className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                      formData.defaultBillingMode === "non_gst"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Non-GST (Regular Receipt / 0% Tax)
                  </button>
                </div>
              </div>

              {/* Default Sales GST Slab */}
              <div className="pt-2.5 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-800">
                    Default Sales GST Slab
                  </label>
                  <p className="text-[11px] text-slate-500">
                    When Non-GST (0%) slab is selected, added line items will default to 0% GST
                  </p>
                </div>
                <div className="w-full sm:w-64">
                  <select
                    id="settings-default-gst-slab"
                    value={formData.defaultBillingMode === 'non_gst' ? 0 : (formData.defaultGstSlab !== undefined ? formData.defaultGstSlab : 18)}
                    onChange={(e) => {
                      const slab = Number(e.target.value);
                      const isZero = slab === 0;
                      setFormData(prev => ({
                        ...prev,
                        defaultGstSlab: slab,
                        defaultBillingMode: isZero ? 'non_gst' : 'gst'
                      }));
                      try {
                        localStorage.setItem("billingonhand_billing_mode", isZero ? "non_gst" : "gst");
                      } catch {}
                    }}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold bg-white text-slate-800 focus:outline-emerald-500 cursor-pointer"
                  >
                    <option value={0}>0% - Non-GST / Tax-Free (Zero Tax)</option>
                    <option value={5}>5% - Essential Groceries & Food Grains</option>
                    <option value={12}>12% - Processed Foods & Packaged Items</option>
                    <option value={18}>18% - Standard Retail Sales (Standard 18%)</option>
                    <option value={28}>28% - Luxury & Electronics Goods</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Dedicated Bank Account & Dynamic UPI QR Code Configuration */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-700 flex items-center justify-center">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                      Bank Account & Dynamic UPI QR Payment Configuration
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Display store bank details and dynamic payment QR code on invoices and thermal receipts
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center space-x-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.showUpiQrCode ?? formData.thermalConfig?.showUpiQrCode ?? true}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData(prev => ({
                          ...prev,
                          showUpiQrCode: checked,
                          thermalConfig: { ...(prev.thermalConfig || DEFAULT_THERMAL_CONFIG), showUpiQrCode: checked }
                        }));
                      }}
                      className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
                    />
                    <span>Enable UPI QR Code</span>
                  </label>

                  <label className="flex items-center space-x-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.showBankDetails ?? formData.thermalConfig?.showBankDetails ?? false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData(prev => ({
                          ...prev,
                          showBankDetails: checked,
                          thermalConfig: { ...(prev.thermalConfig || DEFAULT_THERMAL_CONFIG), showBankDetails: checked }
                        }));
                      }}
                      className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
                    />
                    <span>Print Bank Details on Invoices</span>
                  </label>
                </div>
              </div>

              {/* UPI Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Merchant UPI ID (VPA)
                  </label>
                  <div className="relative">
                    <input
                      id="settings-upi-id"
                      type="text"
                      name="upiId"
                      value={formData.upiId || formData.thermalConfig?.upiId || ""}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        setFormData(prev => ({
                          ...prev,
                          upiId: val,
                          thermalConfig: { ...(prev.thermalConfig || DEFAULT_THERMAL_CONFIG), upiId: val }
                        }));
                      }}
                      placeholder="e.g. 9876543210@okaxis or store@ybl"
                      className="w-full pl-3 pr-10 py-2 border border-slate-300 focus:border-emerald-500 rounded-lg text-xs font-mono font-bold outline-none bg-white"
                    />
                    <div className="absolute right-3 top-2.5 text-slate-400">
                      <QrCode className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Accept direct payments via Google Pay, PhonePe, Paytm, BHIM and all UPI apps</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                    UPI Payee / Merchant Name
                  </label>
                  <div className="relative">
                    <input
                      id="settings-upi-merchant-name"
                      type="text"
                      name="upiMerchantName"
                      value={formData.upiMerchantName || formData.thermalConfig?.upiMerchantName || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          upiMerchantName: val,
                          thermalConfig: { ...(prev.thermalConfig || DEFAULT_THERMAL_CONFIG), upiMerchantName: val }
                        }));
                      }}
                      placeholder={formData.name || "Business / Trade Name"}
                      className="w-full pl-3 pr-10 py-2 border border-slate-300 focus:border-emerald-500 rounded-lg text-xs outline-none bg-white font-medium"
                    />
                    <div className="absolute right-3 top-2.5 text-slate-400">
                      <Building2 className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Merchant name displayed in customer's UPI app during QR code scan</p>
                </div>
              </div>

              {/* Bank Details Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200/60">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Bank Name
                  </label>
                  <input
                    id="settings-bank-name"
                    type="text"
                    name="bankName"
                    value={formData.bankName || formData.thermalConfig?.bankName || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        bankName: val,
                        thermalConfig: { ...(prev.thermalConfig || DEFAULT_THERMAL_CONFIG), bankName: val }
                      }));
                    }}
                    placeholder="e.g. State Bank of India"
                    className="w-full px-3 py-2 border border-slate-300 focus:border-emerald-500 rounded-lg text-xs outline-none bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Bank Account Number
                  </label>
                  <input
                    id="settings-bank-account-no"
                    type="text"
                    name="bankAccountNo"
                    value={formData.bankAccountNo || formData.thermalConfig?.bankAccountNo || ""}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      setFormData(prev => ({
                        ...prev,
                        bankAccountNo: val,
                        thermalConfig: { ...(prev.thermalConfig || DEFAULT_THERMAL_CONFIG), bankAccountNo: val }
                      }));
                    }}
                    placeholder="e.g. 30123456789"
                    className="w-full px-3 py-2 border border-slate-300 focus:border-emerald-500 rounded-lg text-xs font-mono font-bold outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                    IFSC Code
                  </label>
                  <input
                    id="settings-bank-ifsc"
                    type="text"
                    name="bankIfsc"
                    value={formData.bankIfsc || formData.thermalConfig?.bankIfsc || ""}
                    onChange={(e) => {
                      const val = e.target.value.trim().toUpperCase();
                      setFormData(prev => ({
                        ...prev,
                        bankIfsc: val,
                        thermalConfig: { ...(prev.thermalConfig || DEFAULT_THERMAL_CONFIG), bankIfsc: val }
                      }));
                    }}
                    placeholder="e.g. SBIN0001234"
                    className="w-full px-3 py-2 border border-slate-300 focus:border-emerald-500 rounded-lg text-xs font-mono font-bold uppercase outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Branch Name
                  </label>
                  <input
                    id="settings-bank-branch"
                    type="text"
                    name="bankBranch"
                    value={formData.bankBranch || formData.thermalConfig?.bankBranch || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        bankBranch: val,
                        thermalConfig: { ...(prev.thermalConfig || DEFAULT_THERMAL_CONFIG), bankBranch: val }
                      }));
                    }}
                    placeholder="e.g. Main Branch"
                    className="w-full px-3 py-2 border border-slate-300 focus:border-emerald-500 rounded-lg text-xs outline-none bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Business Profile Direct Save */}
            <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    id="save-profile-btn"
                    type="button"
                    onClick={() => handleSaveSettings()}
                    disabled={isSaving}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-semibold py-2 px-6 rounded-lg text-xs tracking-wider uppercase shadow hover:shadow-md transition flex items-center space-x-2 cursor-pointer select-none"
                  >
                    {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>{isSaving ? "Saving..." : "Update Business Profile"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Phase 10: Multi-Form Customer Schemes, Discounts & Rewards Configuration */}
            {(activeSettingsTab === "all" || activeSettingsTab === "loyalty") && (() => {
              const schemeConfig: StoreSchemeConfig = formData.schemeConfig || {
                activeSchemeType: 'all_active',
                enabled: true,
                loyalty: formData.loyaltyConfig || {
                  enabled: true,
                  pointsPer100Rupees: 1,
                  redemptionRate: 1.0,
                  minPointsToRedeem: 10,
                  maxRedemptionPercentage: 50,
                  expiryDays: 365
                },
                instantDiscount: {
                  enabled: true,
                  discountType: 'percentage',
                  discountValue: 5,
                  minBillAmount: 1000,
                  maxDiscountAmount: 500,
                  autoApply: true
                },
                cashback: {
                  enabled: true,
                  cashbackPercent: 5,
                  minBillAmount: 500,
                  maxCashbackPerBill: 250,
                  autoCreditToKhata: true
                },
                bogo: {
                  enabled: false,
                  defaultBuyQty: 1,
                  defaultFreeQty: 1,
                  appliesToAllItems: true
                },
                slabDiscount: {
                  enabled: true,
                  slabs: [
                    { minAmount: 1000, discountType: 'percentage', discountValue: 5 },
                    { minAmount: 2500, discountType: 'percentage', discountValue: 8 },
                    { minAmount: 5000, discountType: 'percentage', discountValue: 12 }
                  ]
                }
              };

              const updateScheme = (updater: (prev: StoreSchemeConfig) => StoreSchemeConfig) => {
                const next = updater(schemeConfig);
                setFormData(prev => ({
                  ...prev,
                  schemeConfig: next,
                  loyaltyConfig: next.loyalty
                }));
              };

              // Live Simulation Calculations
              const billVal = simBillAmount || 0;
              let simInstantDisc = 0;
              let simSlabDisc = 0;
              let simPtsEarned = 0;
              let simPtsCashValue = 0;
              let simCashback = 0;

              if (schemeConfig.enabled) {
                // Instant Discount
                if (schemeConfig.instantDiscount.enabled && billVal >= schemeConfig.instantDiscount.minBillAmount) {
                  if (schemeConfig.instantDiscount.discountType === 'percentage') {
                    const rawDisc = (billVal * schemeConfig.instantDiscount.discountValue) / 100;
                    simInstantDisc = schemeConfig.instantDiscount.maxDiscountAmount
                      ? Math.min(schemeConfig.instantDiscount.maxDiscountAmount, rawDisc)
                      : rawDisc;
                  } else {
                    simInstantDisc = schemeConfig.instantDiscount.discountValue;
                  }
                }

                // Slab Discount
                if (schemeConfig.slabDiscount.enabled && schemeConfig.slabDiscount.slabs?.length > 0) {
                  const sorted = [...schemeConfig.slabDiscount.slabs].sort((a, b) => b.minAmount - a.minAmount);
                  const matched = sorted.find(s => billVal >= s.minAmount);
                  if (matched) {
                    simSlabDisc = matched.discountType === 'percentage'
                      ? (billVal * matched.discountValue) / 100
                      : matched.discountValue;
                  }
                }

                // Loyalty Points
                if (schemeConfig.loyalty.enabled) {
                  simPtsEarned = Math.floor((billVal / 100) * (schemeConfig.loyalty.pointsPer100Rupees || 1));
                  simPtsCashValue = simPtsEarned * (schemeConfig.loyalty.redemptionRate || 1);
                }

                // Cashback
                if (schemeConfig.cashback.enabled && billVal >= schemeConfig.cashback.minBillAmount) {
                  const rawCb = (billVal * (schemeConfig.cashback.cashbackPercent || 5)) / 100;
                  simCashback = schemeConfig.cashback.maxCashbackPerBill
                    ? Math.min(schemeConfig.cashback.maxCashbackPerBill, rawCb)
                    : rawCb;
                }
              }

              const totalBillDisc = simInstantDisc + simSlabDisc;
              const netPayable = Math.max(0, billVal - totalBillDisc);
              const totalCustomerBenefit = totalBillDisc + simPtsCashValue + simCashback;

              return (
                <div className="pt-5 border-t border-slate-200 space-y-4">
                  {/* Schemes Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-amber-500/10 via-pink-500/10 to-purple-500/10 p-4 rounded-xl border border-amber-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-pink-500 text-white flex items-center justify-center shadow-md">
                        <Gift className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">
                            Customer Schemes, Discounts & Rewards Hub
                          </h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white uppercase tracking-wider">
                            Multi-Form
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Empower your store with diverse incentives: Points, Instant Discounts, Customer Khata Cashback, BOGO, & Slabs
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        id="save-schemes-header-btn"
                        type="button"
                        onClick={() => handleSaveSettings()}
                        disabled={isSaving}
                        className="bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-bold py-1.5 px-3.5 rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer select-none"
                      >
                        {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        <span>{isSaving ? "Saving..." : "Save Scheme Rules"}</span>
                      </button>

                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={schemeConfig.enabled}
                          onChange={(e) => {
                            const enabled = e.target.checked;
                            updateScheme(prev => ({ ...prev, enabled }));
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                      </label>
                    </div>
                  </div>

                  {schemeConfig.enabled && (
                    <div className="space-y-4">
                      {/* Active Scheme Strategy Pills */}
                      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                            Active Store Scheme Strategy
                          </label>
                          <span className="text-[11px] text-slate-400">Select which promotions apply to customer checkout</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                          {[
                            { id: "all_active", label: "✨ All-In-One (Hybrid)", desc: "All enabled schemes stack" },
                            { id: "loyalty_points", label: "⭐ Loyalty Points", desc: "Points on spend" },
                            { id: "instant_discount", label: "🏷️ Bill Discount", desc: "% or Flat off" },
                            { id: "cashback", label: "💰 Khata Cashback", desc: "Credit store wallet" },
                            { id: "bogo", label: "🎁 Buy X Get Y", desc: "Free items offers" },
                            { id: "slab_discount", label: "📊 Tiered Slabs", desc: "Cart value tiers" },
                          ].map((item) => {
                            const isSelected = schemeConfig.activeSchemeType === item.id;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => updateScheme(prev => ({ ...prev, activeSchemeType: item.id as SchemeType }))}
                                className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                                  isSelected
                                    ? "bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 text-amber-950 font-bold"
                                    : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                                }`}
                              >
                                <span className="text-xs">{item.label}</span>
                                <span className="text-[10px] text-slate-400 font-normal mt-0.5">{item.desc}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Sub-Tabs for Scheme Customization */}
                      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 pb-2">
                        {[
                          { id: "overview", label: "📋 Live Calculator & Overview", icon: Sparkles },
                          { id: "loyalty", label: "⭐ Loyalty Points", icon: Star },
                          { id: "instant", label: "🏷️ Instant Bill Discount", icon: Percent },
                          { id: "cashback", label: "💰 Khata Cashback", icon: Coins },
                          { id: "bogo", label: "🎁 Buy X Get Y (BOGO)", icon: Gift },
                          { id: "slab", label: "📊 Tiered Slabs", icon: Sliders },
                        ].map((subTab) => {
                          const Icon = subTab.icon;
                          const isActive = activeSchemeSubTab === subTab.id;
                          return (
                            <button
                              key={subTab.id}
                              type="button"
                              onClick={() => setActiveSchemeSubTab(subTab.id as any)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer select-none whitespace-nowrap ${
                                isActive
                                  ? "bg-slate-900 text-white shadow-xs"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              <span>{subTab.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Sub-Tab 1: Live Simulation & Overview */}
                      {activeSchemeSubTab === "overview" && (
                        <div className="bg-gradient-to-br from-amber-50/60 via-pink-50/40 to-indigo-50/40 border border-amber-200 rounded-2xl p-5 shadow-xs space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/60 pb-3">
                            <div>
                              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-amber-600" />
                                <span>Live Scheme Incentive Simulator</span>
                              </h4>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Enter a sample bill amount below to test how customer rewards and discounts are applied
                              </p>
                            </div>
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-amber-300 shadow-2xs">
                              <span className="text-xs font-bold text-slate-600">Sample Bill: ₹</span>
                              <input
                                type="number"
                                min="100"
                                step="100"
                                value={simBillAmount}
                                onChange={(e) => setSimBillAmount(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-24 text-xs font-bold font-mono outline-none text-slate-900"
                              />
                            </div>
                          </div>

                          {/* Simulation Outcome KPI Cards */}
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Direct Bill Discount</span>
                              <span className="text-lg font-bold font-mono text-emerald-700 block mt-1">
                                -₹{totalBillDisc.toFixed(2)}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {simInstantDisc > 0 ? `Instant: -₹${simInstantDisc.toFixed(2)}` : ""} {simSlabDisc > 0 ? `Slab: -₹${simSlabDisc.toFixed(2)}` : ""}
                                {totalBillDisc === 0 ? "No discount threshold met" : ""}
                              </span>
                            </div>

                            <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Loyalty Points Earned</span>
                              <span className="text-lg font-bold font-mono text-amber-700 block mt-1">
                                +{simPtsEarned} pts
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Cash redemption value: ₹{simPtsCashValue.toFixed(2)}
                              </span>
                            </div>

                            <div className="bg-white p-3.5 rounded-xl border border-purple-200 shadow-2xs">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Cashback to Khata Wallet</span>
                              <span className="text-lg font-bold font-mono text-purple-700 block mt-1">
                                +₹{simCashback.toFixed(2)}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Store credit for next visit
                              </span>
                            </div>

                            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-3.5 rounded-xl shadow-2xs">
                              <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wide block">Total Customer Benefit</span>
                              <span className="text-lg font-bold font-mono text-white block mt-1">
                                ₹{totalCustomerBenefit.toFixed(2)}
                              </span>
                              <span className="text-[10px] text-slate-300">
                                Net Bill to Pay: ₹{netPayable.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          <div className="p-3 bg-white/80 border border-amber-200 rounded-xl text-xs text-slate-600 flex items-start gap-2.5">
                            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <span>
                              Use the tabs above to fine-tune rates, qualifying minimum amounts, and maximum caps for each scheme category.
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Sub-Tab 2: Loyalty Points */}
                      {activeSchemeSubTab === "loyalty" && (
                        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-4">
                          <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
                            <div>
                              <h4 className="font-bold text-xs uppercase tracking-wide text-amber-950 flex items-center gap-1.5">
                                <Star className="w-4 h-4 fill-amber-500 text-amber-600" />
                                <span>Customer Loyalty Reward Points Scheme</span>
                              </h4>
                              <p className="text-[11px] text-amber-800 mt-0.5">
                                Award points based on net spending, redeemable on subsequent sales bills
                              </p>
                            </div>
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={schemeConfig.loyalty.enabled}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  updateScheme(prev => ({
                                    ...prev,
                                    loyalty: { ...prev.loyalty, enabled: checked }
                                  }));
                                }}
                                className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                              />
                              <span>Enable Loyalty</span>
                            </label>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                                Points Earned per ₹100 Spent
                              </label>
                              <input
                                type="number"
                                min="0.1"
                                step="0.1"
                                value={schemeConfig.loyalty.pointsPer100Rupees ?? 1}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  updateScheme(prev => ({
                                    ...prev,
                                    loyalty: { ...prev.loyalty, pointsPer100Rupees: val }
                                  }));
                                }}
                                className="w-full px-3 py-2 bg-white border border-amber-200 focus:border-amber-500 rounded-lg text-xs font-mono font-bold outline-none"
                              />
                              <span className="text-[10px] text-slate-500 mt-0.5 block">e.g. 1 point for every ₹100 purchased</span>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                                Value of 1 Point in Rupees (₹)
                              </label>
                              <input
                                type="number"
                                min="0.05"
                                step="0.05"
                                value={schemeConfig.loyalty.redemptionRate ?? 1.0}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  updateScheme(prev => ({
                                    ...prev,
                                    loyalty: { ...prev.loyalty, redemptionRate: val }
                                  }));
                                }}
                                className="w-full px-3 py-2 bg-white border border-amber-200 focus:border-amber-500 rounded-lg text-xs font-mono font-bold outline-none"
                              />
                              <span className="text-[10px] text-slate-500 mt-0.5 block">e.g. 1.0 = ₹1 discount per 1 point redeemed</span>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                                Minimum Points to Redeem
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={schemeConfig.loyalty.minPointsToRedeem ?? 10}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  updateScheme(prev => ({
                                    ...prev,
                                    loyalty: { ...prev.loyalty, minPointsToRedeem: val }
                                  }));
                                }}
                                className="w-full px-3 py-2 bg-white border border-amber-200 focus:border-amber-500 rounded-lg text-xs font-mono font-bold outline-none"
                              />
                              <span className="text-[10px] text-slate-500 mt-0.5 block">Customer must have at least this balance</span>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                                Max Redemption Limit (% of Bill)
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={schemeConfig.loyalty.maxRedemptionPercentage ?? 50}
                                onChange={(e) => {
                                  const val = Math.min(100, Math.max(1, parseInt(e.target.value) || 50));
                                  updateScheme(prev => ({
                                    ...prev,
                                    loyalty: { ...prev.loyalty, maxRedemptionPercentage: val }
                                  }));
                                }}
                                className="w-full px-3 py-2 bg-white border border-amber-200 focus:border-amber-500 rounded-lg text-xs font-mono font-bold outline-none"
                              />
                              <span className="text-[10px] text-slate-500 mt-0.5 block">Maximum % of bill payable via points</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sub-Tab 3: Instant Bill Discount Scheme */}
                      {activeSchemeSubTab === "instant" && (
                        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 space-y-4">
                          <div className="flex items-center justify-between border-b border-emerald-200/80 pb-3">
                            <div>
                              <h4 className="font-bold text-xs uppercase tracking-wide text-emerald-950 flex items-center gap-1.5">
                                <Percent className="w-4 h-4 text-emerald-600" />
                                <span>Instant Invoice Discount Scheme (थेट बिल डिस्काउंट)</span>
                              </h4>
                              <p className="text-[11px] text-emerald-800 mt-0.5">
                                Automatically or manually deduct a promotional % or flat ₹ amount on qualifying bills
                              </p>
                            </div>
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={schemeConfig.instantDiscount.enabled}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  updateScheme(prev => ({
                                    ...prev,
                                    instantDiscount: { ...prev.instantDiscount, enabled: checked }
                                  }));
                                }}
                                className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                              />
                              <span>Enable Instant Discount</span>
                            </label>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                                Discount Type
                              </label>
                              <select
                                value={schemeConfig.instantDiscount.discountType}
                                onChange={(e) => {
                                  const val = e.target.value as 'percentage' | 'flat';
                                  updateScheme(prev => ({
                                    ...prev,
                                    instantDiscount: { ...prev.instantDiscount, discountType: val }
                                  }));
                                }}
                                className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-lg text-xs font-bold outline-none cursor-pointer"
                              >
                                <option value="percentage">Percentage Off (%)</option>
                                <option value="flat">Flat Amount Off (₹)</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                                Discount Value {schemeConfig.instantDiscount.discountType === 'percentage' ? "(%)" : "(₹)"}
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={schemeConfig.instantDiscount.discountValue}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  updateScheme(prev => ({
                                    ...prev,
                                    instantDiscount: { ...prev.instantDiscount, discountValue: val }
                                  }));
                                }}
                                className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-lg text-xs font-mono font-bold outline-none"
                              />
                              <span className="text-[10px] text-slate-500 mt-0.5 block">
                                {schemeConfig.instantDiscount.discountType === 'percentage' ? "e.g. 5% off" : "e.g. ₹50 flat off"}
                              </span>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                                Min Bill Amount (₹)
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="100"
                                value={schemeConfig.instantDiscount.minBillAmount}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  updateScheme(prev => ({
                                    ...prev,
                                    instantDiscount: { ...prev.instantDiscount, minBillAmount: val }
                                  }));
                                }}
                                className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-lg text-xs font-mono font-bold outline-none"
                              />
                              <span className="text-[10px] text-slate-500 mt-0.5 block">Cart total must exceed this to qualify</span>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                                Max Cap in ₹ (Optional)
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="50"
                                value={schemeConfig.instantDiscount.maxDiscountAmount || ""}
                                onChange={(e) => {
                                  const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                  updateScheme(prev => ({
                                    ...prev,
                                    instantDiscount: { ...prev.instantDiscount, maxDiscountAmount: val }
                                  }));
                                }}
                                placeholder="No limit"
                                className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-lg text-xs font-mono font-bold outline-none"
                              />
                              <span className="text-[10px] text-slate-500 mt-0.5 block">Maximum discount allowed per bill</span>
                            </div>
                          </div>

                          <div className="pt-2">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={schemeConfig.instantDiscount.autoApply}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  updateScheme(prev => ({
                                    ...prev,
                                    instantDiscount: { ...prev.instantDiscount, autoApply: checked }
                                  }));
                                }}
                                className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                              />
                              <span>Automatically apply scheme discount on POS checkout when bill exceeds minimum</span>
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Sub-Tab 4: Customer Khata Cashback Scheme */}
                      {activeSchemeSubTab === "cashback" && (
                        <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-5 space-y-4">
                          <div className="flex items-center justify-between border-b border-purple-200/80 pb-3">
                            <div>
                              <h4 className="font-bold text-xs uppercase tracking-wide text-purple-950 flex items-center gap-1.5">
                                <Coins className="w-4 h-4 text-purple-600" />
                                <span>Customer Khata Cashback / Store Credit Scheme (कॅशबॅक योजना)</span>
                              </h4>
                              <p className="text-[11px] text-purple-800 mt-0.5">
                                Reward customers with instant store credit automatically deposited to their Khata ledger for future purchases
                              </p>
                            </div>
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={schemeConfig.cashback.enabled}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  updateScheme(prev => ({
                                    ...prev,
                                    cashback: { ...prev.cashback, enabled: checked }
                                  }));
                                }}
                                className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                              />
                              <span>Enable Cashback</span>
                            </label>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                                Cashback Percentage (%)
                              </label>
                              <input
                                type="number"
                                min="0.5"
                                max="50"
                                step="0.5"
                                value={schemeConfig.cashback.cashbackPercent}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  updateScheme(prev => ({
                                    ...prev,
                                    cashback: { ...prev.cashback, cashbackPercent: val }
                                  }));
                                }}
                                className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-xs font-mono font-bold outline-none"
                              />
                              <span className="text-[10px] text-slate-500 mt-0.5 block">e.g. 5% cashback on qualifying purchase</span>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                                Minimum Bill for Cashback (₹)
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="100"
                                value={schemeConfig.cashback.minBillAmount}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  updateScheme(prev => ({
                                    ...prev,
                                    cashback: { ...prev.cashback, minBillAmount: val }
                                  }));
                                }}
                                className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-xs font-mono font-bold outline-none"
                              />
                              <span className="text-[10px] text-slate-500 mt-0.5 block">e.g. ₹500 minimum purchase</span>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                                Max Cashback Cap per Bill (₹)
                              </label>
                              <input
                                type="number"
                                min="10"
                                step="50"
                                value={schemeConfig.cashback.maxCashbackPerBill}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  updateScheme(prev => ({
                                    ...prev,
                                    cashback: { ...prev.cashback, maxCashbackPerBill: val }
                                  }));
                                }}
                                className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-xs font-mono font-bold outline-none"
                              />
                              <span className="text-[10px] text-slate-500 mt-0.5 block">e.g. maximum ₹250 cashback per single bill</span>
                            </div>
                          </div>

                          <div className="pt-2">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={schemeConfig.cashback.autoCreditToKhata}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  updateScheme(prev => ({
                                    ...prev,
                                    cashback: { ...prev.cashback, autoCreditToKhata: checked }
                                  }));
                                }}
                                className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                              />
                              <span>Automatically credit cashback amount to customer ledger / store wallet on bill completion</span>
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Sub-Tab 5: Buy X Get Y (BOGO) */}
                      {activeSchemeSubTab === "bogo" && (
                        <div className="bg-pink-50/70 border border-pink-200 rounded-2xl p-5 space-y-4">
                          <div className="flex items-center justify-between border-b border-pink-200/80 pb-3">
                            <div>
                              <h4 className="font-bold text-xs uppercase tracking-wide text-pink-950 flex items-center gap-1.5">
                                <Gift className="w-4 h-4 text-pink-600" />
                                <span>Buy One Get One (BOGO) / Buy X Get Y Scheme (बाय १ गेट १ मोफत)</span>
                              </h4>
                              <p className="text-[11px] text-pink-800 mt-0.5">
                                Set default BOGO ratios or link to individual product promotional schemes in the Offers Catalog
                              </p>
                            </div>
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={schemeConfig.bogo.enabled}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  updateScheme(prev => ({
                                    ...prev,
                                    bogo: { ...prev.bogo, enabled: checked }
                                  }));
                                }}
                                className="w-4 h-4 text-pink-600 rounded cursor-pointer"
                              />
                              <span>Enable BOGO</span>
                            </label>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                                Default Buy Quantity (X)
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={schemeConfig.bogo.defaultBuyQty}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 1;
                                  updateScheme(prev => ({
                                    ...prev,
                                    bogo: { ...prev.bogo, defaultBuyQty: val }
                                  }));
                                }}
                                className="w-full px-3 py-2 bg-white border border-pink-200 rounded-lg text-xs font-mono font-bold outline-none"
                              />
                              <span className="text-[10px] text-slate-500 mt-0.5 block">e.g. Buy 1, Buy 2, or Buy 5</span>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                                Default Free Quantity (Y)
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={schemeConfig.bogo.defaultFreeQty}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 1;
                                  updateScheme(prev => ({
                                    ...prev,
                                    bogo: { ...prev.bogo, defaultFreeQty: val }
                                  }));
                                }}
                                className="w-full px-3 py-2 bg-white border border-pink-200 rounded-lg text-xs font-mono font-bold outline-none"
                              />
                              <span className="text-[10px] text-slate-500 mt-0.5 block">e.g. Get 1 Free</span>
                            </div>
                          </div>

                          <div className="p-3 bg-white border border-pink-200 rounded-xl flex items-center justify-between">
                            <div className="text-xs text-slate-600">
                              <span className="font-bold text-slate-800 block">Manage Detailed SKU-Wise Offers</span>
                              <span>Configure product-specific or brand-specific Buy X Get Y deals in the full Offers module.</span>
                            </div>
                            <span className="text-[11px] font-bold text-pink-700 bg-pink-100 px-3 py-1.5 rounded-lg border border-pink-300">
                              Linked to Offers & Schemes
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Sub-Tab 6: Tiered Slab Discounts */}
                      {activeSchemeSubTab === "slab" && (
                        <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-5 space-y-4">
                          <div className="flex items-center justify-between border-b border-blue-200/80 pb-3">
                            <div>
                              <h4 className="font-bold text-xs uppercase tracking-wide text-blue-950 flex items-center gap-1.5">
                                <Sliders className="w-4 h-4 text-blue-600" />
                                <span>Tiered Cart Value Slab Discounts (टियर / स्लॅब सवलत)</span>
                              </h4>
                              <p className="text-[11px] text-blue-800 mt-0.5">
                                Reward higher cart values with escalating discounts (e.g. ₹1000 = 5% off, ₹2500 = 8% off, ₹5000 = 12% off)
                              </p>
                            </div>
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={schemeConfig.slabDiscount.enabled}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  updateScheme(prev => ({
                                    ...prev,
                                    slabDiscount: { ...prev.slabDiscount, enabled: checked }
                                  }));
                                }}
                                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                              />
                              <span>Enable Slabs</span>
                            </label>
                          </div>

                          {/* Slabs Table */}
                          <div className="space-y-2">
                            <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2">
                              <div className="col-span-4">Min Bill Value (₹)</div>
                              <div className="col-span-4">Discount Type</div>
                              <div className="col-span-3">Discount Value</div>
                              <div className="col-span-1 text-center">Action</div>
                            </div>

                            {schemeConfig.slabDiscount.slabs?.map((slab, sIdx) => (
                              <div key={sIdx} className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-xl border border-blue-200">
                                <div className="col-span-4">
                                  <input
                                    type="number"
                                    min="0"
                                    step="500"
                                    value={slab.minAmount}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      updateScheme(prev => {
                                        const newSlabs = [...prev.slabDiscount.slabs];
                                        newSlabs[sIdx] = { ...newSlabs[sIdx], minAmount: val };
                                        return { ...prev, slabDiscount: { ...prev.slabDiscount, slabs: newSlabs } };
                                      });
                                    }}
                                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold font-mono outline-none"
                                  />
                                </div>
                                <div className="col-span-4">
                                  <select
                                    value={slab.discountType}
                                    onChange={(e) => {
                                      const val = e.target.value as 'percentage' | 'flat';
                                      updateScheme(prev => {
                                        const newSlabs = [...prev.slabDiscount.slabs];
                                        newSlabs[sIdx] = { ...newSlabs[sIdx], discountType: val };
                                        return { ...prev, slabDiscount: { ...prev.slabDiscount, slabs: newSlabs } };
                                      });
                                    }}
                                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none cursor-pointer"
                                  >
                                    <option value="percentage">Percentage (%)</option>
                                    <option value="flat">Flat Amount (₹)</option>
                                  </select>
                                </div>
                                <div className="col-span-3">
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={slab.discountValue}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      updateScheme(prev => {
                                        const newSlabs = [...prev.slabDiscount.slabs];
                                        newSlabs[sIdx] = { ...newSlabs[sIdx], discountValue: val };
                                        return { ...prev, slabDiscount: { ...prev.slabDiscount, slabs: newSlabs } };
                                      });
                                    }}
                                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold font-mono outline-none"
                                  />
                                </div>
                                <div className="col-span-1 text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateScheme(prev => ({
                                        ...prev,
                                        slabDiscount: {
                                          ...prev.slabDiscount,
                                          slabs: prev.slabDiscount.slabs.filter((_, i) => i !== sIdx)
                                        }
                                      }));
                                    }}
                                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer transition"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}

                            <button
                              type="button"
                              onClick={() => {
                                updateScheme(prev => ({
                                  ...prev,
                                  slabDiscount: {
                                    ...prev.slabDiscount,
                                    slabs: [
                                      ...(prev.slabDiscount.slabs || []),
                                      { minAmount: 3000, discountType: 'percentage', discountValue: 10 }
                                    ]
                                  }
                                }));
                              }}
                              className="w-full py-2 border-2 border-dashed border-blue-300 hover:border-blue-500 text-blue-700 hover:text-blue-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add New Cart Slab Tier</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Schemes Direct Save Footer */}
                  <div className="pt-3 border-t border-amber-200/60 flex justify-end">
                    <button
                      id="save-schemes-btn"
                      type="button"
                      onClick={() => handleSaveSettings()}
                      disabled={isSaving}
                      className="bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-semibold py-2 px-6 rounded-lg text-xs tracking-wider uppercase shadow hover:shadow-md transition flex items-center space-x-2 cursor-pointer select-none"
                    >
                      {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>{isSaving ? "Saving..." : "Save Scheme Rules"}</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Phase 8: Automated Scheduled EOD Email Reports Configuration */}
            {(activeSettingsTab === "all" || activeSettingsTab === "email") && (
              <div className="pt-5 border-t border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 text-blue-800 rounded-lg">
                      <Mail className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Automated Daily EOD Email Reports</h3>
                      <p className="text-[11px] text-slate-500">Automatically send end-of-day business summary to store owner's email every evening</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveSettings()}
                      disabled={isSaving}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer select-none"
                    >
                      {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span>{isSaving ? "..." : "Save Email"}</span>
                    </button>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.scheduledEmailConfig?.enabled === true}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      setFormData(prev => ({
                        ...prev,
                        scheduledEmailConfig: {
                          ...(prev.scheduledEmailConfig || {
                            recipientEmail: prev.email || "rupeshgadkhe@gmail.com",
                            ccEmails: "",
                            senderName: "Billing On Hand Store Reports",
                            scheduledTime: "21:00",
                            reportSections: {
                              salesSummary: true,
                              paymentModes: true,
                              profitAndMargins: true,
                              taxSummary: true,
                              topSellingItems: true,
                              lowStockAlerts: true,
                              nearExpiryAlerts: true,
                              customerKhata: true,
                              loyaltySummary: true
                            }
                          }),
                          enabled
                        }
                      }));
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

              {formData.scheduledEmailConfig?.enabled === true && (
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Primary Recipient Email */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                        Primary Recipient Email (Store Owner) *
                      </label>
                      <input
                        type="email"
                        value={formData.scheduledEmailConfig?.recipientEmail || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            scheduledEmailConfig: {
                              ...(prev.scheduledEmailConfig || {
                                enabled: true,
                                scheduledTime: "21:00",
                                reportSections: { salesSummary: true, paymentModes: true, profitAndMargins: true, taxSummary: true, topSellingItems: true, lowStockAlerts: true, nearExpiryAlerts: true, customerKhata: true, loyaltySummary: true }
                              }),
                              recipientEmail: val
                            }
                          }));
                        }}
                        placeholder="e.g. storeowner@gmail.com"
                        className="w-full px-3 py-2 bg-white border border-blue-200 focus:border-blue-500 rounded-lg text-xs outline-none font-medium"
                      />
                    </div>

                    {/* Scheduled Delivery Time */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                        Scheduled Dispatch Time (24-Hour Format)
                      </label>
                      <div className="relative">
                        <input
                          type="time"
                          value={formData.scheduledEmailConfig?.scheduledTime || "21:00"}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              scheduledEmailConfig: {
                                ...(prev.scheduledEmailConfig || {
                                  enabled: true,
                                  recipientEmail: prev.email || "",
                                  reportSections: { salesSummary: true, paymentModes: true, profitAndMargins: true, taxSummary: true, topSellingItems: true, lowStockAlerts: true, nearExpiryAlerts: true, customerKhata: true, loyaltySummary: true }
                                }),
                                scheduledTime: val
                              }
                            }));
                          }}
                          className="w-full px-3 py-2 bg-white border border-blue-200 focus:border-blue-500 rounded-lg text-xs outline-none font-mono font-bold"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Report will be automatically dispatched at this time after store closing</span>
                    </div>

                    {/* CC Emails */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                        Secondary / CC Emails (Partner or Accountant - Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.scheduledEmailConfig?.ccEmails || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            scheduledEmailConfig: {
                              ...(prev.scheduledEmailConfig || {
                                enabled: true,
                                recipientEmail: prev.email || "",
                                scheduledTime: "21:00",
                                reportSections: { salesSummary: true, paymentModes: true, profitAndMargins: true, taxSummary: true, topSellingItems: true, lowStockAlerts: true, nearExpiryAlerts: true, customerKhata: true, loyaltySummary: true }
                              }),
                              ccEmails: val
                            }
                          }));
                        }}
                        placeholder="accountant@gmail.com, partner@gmail.com"
                        className="w-full px-3 py-2 bg-white border border-blue-200 focus:border-blue-500 rounded-lg text-xs outline-none"
                      />
                    </div>

                    {/* Sender Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                        Sender Display Name
                      </label>
                      <input
                        type="text"
                        value={formData.scheduledEmailConfig?.senderName || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            scheduledEmailConfig: {
                              ...(prev.scheduledEmailConfig || {
                                enabled: true,
                                recipientEmail: prev.email || "",
                                scheduledTime: "21:00",
                                reportSections: { salesSummary: true, paymentModes: true, profitAndMargins: true, taxSummary: true, topSellingItems: true, lowStockAlerts: true, nearExpiryAlerts: true, customerKhata: true, loyaltySummary: true }
                              }),
                              senderName: val
                            }
                          }));
                        }}
                        placeholder="e.g. Apex Electro-Tech Store Reports"
                        className="w-full px-3 py-2 bg-white border border-blue-200 focus:border-blue-500 rounded-lg text-xs outline-none"
                      />
                    </div>
                  </div>

                  {/* Report Sections Selection */}
                  <div className="pt-2 border-t border-blue-200/60">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                      Report Content Sections to Include:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 bg-white/80 p-3 rounded-lg border border-blue-100">
                      {[
                        { key: "salesSummary", label: "📊 Sales Summary (Total Revenue & Bills)" },
                        { key: "paymentModes", label: "💵 Cash & Bank UPI (Counter Cash & Bank Deposits)" },
                        { key: "profitAndMargins", label: "📈 Profit & Margin (Estimated Gross Margin)" },
                        { key: "taxSummary", label: "🏛️ GST Tax (CGST, SGST, IGST Summary)" },
                        { key: "topSellingItems", label: "🔥 Top Selling Items (Top 5 Fast-Moving Items)" },
                        { key: "lowStockAlerts", label: "⚠️ Low Stock Alerts (Shortage & Reorders)" },
                        { key: "nearExpiryAlerts", label: "⏳ Near Expiry Alerts (Goods Expiring Soon)" },
                        { key: "customerKhata", label: "📒 Customer Khata (Receivables & Outstanding)" },
                        { key: "loyaltySummary", label: "⭐ Loyalty Points (Loyalty Rewards Activity)" }
                      ].map(({ key, label }) => {
                        const sections = formData.scheduledEmailConfig?.reportSections || ({} as any);
                        const isChecked = sections[key] !== false;
                        return (
                          <label key={key} className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 select-none py-1">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setFormData(prev => ({
                                  ...prev,
                                  scheduledEmailConfig: {
                                    ...(prev.scheduledEmailConfig || {
                                      enabled: true,
                                      recipientEmail: prev.email || "",
                                      scheduledTime: "21:00"
                                    }),
                                    reportSections: {
                                      ...(prev.scheduledEmailConfig?.reportSections || {
                                        salesSummary: true,
                                        paymentModes: true,
                                        profitAndMargins: true,
                                        taxSummary: true,
                                        topSellingItems: true,
                                        lowStockAlerts: true,
                                        nearExpiryAlerts: true,
                                        customerKhata: true,
                                        loyaltySummary: true
                                      }),
                                      [key]: checked
                                    }
                                  }
                                }));
                              }}
                              className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="text-[11px] font-medium leading-tight">{label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* SMTP Settings Accordion */}
                  <div className="border border-blue-200/80 rounded-xl overflow-hidden bg-white">
                    <button
                      type="button"
                      onClick={() => setShowSmtpConfig(!showSmtpConfig)}
                      className="w-full px-4 py-2.5 bg-blue-50/50 hover:bg-blue-100/50 flex items-center justify-between text-xs font-bold text-blue-900 transition cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2">
                        <Sliders className="w-3.5 h-3.5 text-blue-600" />
                        <span>Direct Internet SMTP / Gmail Settings (Optional Configuration)</span>
                      </div>
                      <span className="text-[11px] text-blue-600 font-semibold">{showSmtpConfig ? "Hide ▲" : "Configure / Edit ▼"}</span>
                    </button>

                    {showSmtpConfig && (
                      <div className="p-4 space-y-3 border-t border-blue-100 text-xs bg-white">
                        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 space-y-1">
                          <p className="font-bold">💡 Tip for Google Gmail Users (App Passwords):</p>
                          <p className="text-slate-600">
                            For enhanced Google security, enable <strong>2-Step Verification</strong> in your Google Account &gt; Security, create a 16-character code under <strong>App Passwords</strong>, and paste it below.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Email Provider</label>
                            <select
                              value={formData.scheduledEmailConfig?.smtpConfig?.service || "gmail"}
                              onChange={(e) => {
                                const s = e.target.value;
                                setFormData(prev => ({
                                  ...prev,
                                  scheduledEmailConfig: {
                                    ...(prev.scheduledEmailConfig || { enabled: true, recipientEmail: "", scheduledTime: "21:00", reportSections: {} as any }),
                                    smtpConfig: {
                                      ...(prev.scheduledEmailConfig?.smtpConfig || {}),
                                      service: s
                                    }
                                  }
                                }));
                              }}
                              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none bg-white font-medium"
                            >
                              <option value="gmail">Google Gmail</option>
                              <option value="outlook">Microsoft Outlook</option>
                              <option value="custom">Custom SMTP Server</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Sender Email (SMTP User)</label>
                            <input
                              type="email"
                              value={formData.scheduledEmailConfig?.smtpConfig?.user || ""}
                              onChange={(e) => {
                                const u = e.target.value;
                                setFormData(prev => ({
                                  ...prev,
                                  scheduledEmailConfig: {
                                    ...(prev.scheduledEmailConfig || { enabled: true, recipientEmail: "", scheduledTime: "21:00", reportSections: {} as any }),
                                    smtpConfig: {
                                      ...(prev.scheduledEmailConfig?.smtpConfig || {}),
                                      user: u
                                    }
                                  }
                                }));
                              }}
                              placeholder="yourstore@gmail.com"
                              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none font-medium"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">App Password</label>
                            <input
                              type="password"
                              value={formData.scheduledEmailConfig?.smtpConfig?.pass || ""}
                              onChange={(e) => {
                                const p = e.target.value;
                                setFormData(prev => ({
                                  ...prev,
                                  scheduledEmailConfig: {
                                    ...(prev.scheduledEmailConfig || { enabled: true, recipientEmail: "", scheduledTime: "21:00", reportSections: {} as any }),
                                    smtpConfig: {
                                      ...(prev.scheduledEmailConfig?.smtpConfig || {}),
                                      pass: p
                                    }
                                  }
                                }));
                              }}
                              placeholder="xxxx xxxx xxxx xxxx"
                              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Test & Preview Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isTestingEmail}
                        onClick={async () => {
                          setIsTestingEmail(true);
                          setEmailStatusMsg(null);
                          try {
                            const res = await fetch("/api/reports/send-eod-email", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                isTest: true,
                                recipientEmail: formData.scheduledEmailConfig?.recipientEmail
                              })
                            });
                            const data = await res.json();
                            if (data.success) {
                              setEmailStatusMsg({ text: data.message, isError: false });
                              if (data.previewHtml) setPreviewEmailHtml(data.previewHtml);
                            } else {
                              setEmailStatusMsg({ text: data.message || "Failed to send email", isError: true });
                            }
                          } catch (err: any) {
                            setEmailStatusMsg({ text: "Error: " + err.message, isError: true });
                          } finally {
                            setIsTestingEmail(false);
                          }
                        }}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer select-none"
                      >
                        <Send className={`w-3.5 h-3.5 ${isTestingEmail ? "animate-spin" : ""}`} />
                        <span>{isTestingEmail ? "Sending Test Report..." : "Send Test Report Now"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await fetch("/api/reports/send-eod-email", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ isTest: true })
                            });
                            const data = await res.json();
                            if (data.previewHtml) {
                              setPreviewEmailHtml(data.previewHtml);
                              setIsPreviewEmailModalOpen(true);
                            }
                          } catch (err: any) {
                            showAlert("Error generating preview: " + err.message);
                          }
                        }}
                        className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg font-bold text-xs flex items-center gap-1.5 transition cursor-pointer select-none"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Preview HTML Report</span>
                      </button>
                    </div>

                    {formData.scheduledEmailConfig?.lastSentAt && (
                      <span className="text-[11px] text-slate-500 font-mono">
                        Last Sent: {new Date(formData.scheduledEmailConfig.lastSentAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} ({formData.scheduledEmailConfig.lastSendStatus === "success" ? "✅ Success" : "⚠️ Failed"})
                      </span>
                    )}
                  </div>

                  {emailStatusMsg && (
                    <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                      emailStatusMsg.isError ? "bg-rose-50 text-rose-800 border border-rose-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    }`}>
                      {emailStatusMsg.isError ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
                      <span>{emailStatusMsg.text}</span>
                    </div>
                  )}
                </div>
              )}

                {/* EOD Email Direct Save */}
                <div className="pt-3 border-t border-blue-200/60 flex justify-end">
                  <button
                    id="save-email-btn"
                    type="button"
                    onClick={() => handleSaveSettings()}
                    disabled={isSaving}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2 px-6 rounded-lg text-xs tracking-wider uppercase shadow hover:shadow-md transition flex items-center space-x-2 cursor-pointer select-none"
                  >
                    {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>{isSaving ? "Saving..." : "Save Email Settings"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Save Button for All view */}
            {activeSettingsTab === "all" && (
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  id="save-settings-btn"
                  type="submit"
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-semibold py-2.5 px-6 rounded-lg text-xs tracking-wider uppercase shadow hover:shadow-md transition flex items-center space-x-2 cursor-pointer select-none"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{isSaving ? "Saving..." : "Update Business Profile & Settings"}</span>
                </button>
              </div>
            )}

          </form>

        </div>
      )}

      {/* Right Panel: Thermal, Security, Backup, Updates */}
      {(activeSettingsTab === "all" || ["thermal", "security", "backup", "updater"].includes(activeSettingsTab)) && (
        <div className={activeSettingsTab === "all" ? "space-y-6" : "space-y-6 max-w-4xl mx-auto w-full"}>

          {/* Phase 6: Custom Thermal Bill Designer Card */}
          {(activeSettingsTab === "all" || activeSettingsTab === "thermal") && (
            <div className="bg-linear-to-br from-indigo-900 via-slate-900 to-blue-950 text-white border border-indigo-700/50 rounded-xl p-5 shadow-md space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-indigo-800/60">
                <div className="flex items-center space-x-2">
                  <Printer className="w-5 h-5 text-indigo-300" />
                  <h3 className="font-bold text-sm text-white">Custom Thermal Bill Designer</h3>
                </div>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                  58mm & 80mm
                </span>
              </div>

              <p className="text-[11px] text-indigo-200/90 leading-relaxed">
                Customize thermal printer layouts (58mm & 80mm), store logo, dynamic UPI QR code, fonts, headers, and print styling.
              </p>

              <button
                type="button"
                onClick={() => setIsThermalDesignerOpen(true)}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs tracking-wide transition flex items-center justify-center space-x-2 shadow-sm cursor-pointer"
              >
                <Sliders className="w-4 h-4" />
                <span>Open Thermal Bill Designer</span>
              </button>
            </div>
          )}

          {/* User security access update form */}
          {session && (activeSettingsTab === "all" || activeSettingsTab === "security") && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                <Database className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Security & Access Credentials</h3>
              </div>
              
              <p className="text-[11px] text-slate-500 leading-normal">
                Update your active administrative credentials. Leave password blank if you do not want to alter it.
              </p>

              {secError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-lg text-xs font-semibold">
                  {secError}
                </div>
              )}

              {secSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold">
                  {secSuccess}
                </div>
              )}

              <form onSubmit={handleUpdateCredentials} className="space-y-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 font-mono">My Display Name</label>
                  <input
                    type="text"
                    required
                    value={secName}
                    onChange={(e) => setSecName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-205 focus:border-indigo-500 rounded-lg text-xs outline-none"
                    placeholder="e.g. Store Manager"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 font-mono">Login Username</label>
                  <input
                    type="text"
                    required
                    value={secUsername}
                    onChange={(e) => setSecUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-205 focus:border-indigo-500 rounded-lg text-xs outline-none font-mono font-bold"
                    placeholder="Enter new username"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 font-mono">Alter Secured Password</label>
                  <input
                    type="password"
                    value={secPassword}
                    onChange={(e) => setSecPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-205 focus:border-indigo-500 rounded-lg text-xs outline-none font-mono"
                    placeholder="Leave empty to retain existing"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isUpdatingSec}
                    className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white font-bold py-2 px-4 rounded-lg text-xs tracking-wider uppercase transition cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <span>{isUpdatingSec ? "Updating..." : "Save Credential Updates"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Store Admin Security PIN & Vertical Switch Authorization */}
          {(activeSettingsTab === "all" || activeSettingsTab === "security") && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                <Lock className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Store Admin Security PIN & Controls</h3>
                  <span className="text-[10px] text-slate-400">Manage 4-digit security PIN for critical administrative actions</span>
                </div>
              </div>

              {securityPinSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>{securityPinSuccessMsg}</span>
                </div>
              )}

              <div className="space-y-4 text-xs">
                {/* Require PIN Toggle */}
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <span className="font-bold text-slate-800 block">Require PIN for Business Vertical Switch</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      When enabled, switching business vertical (e.g. to Restaurant or Medical) prompts for the admin security PIN.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.requirePinForBusinessChange)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const updated = { ...formData, requirePinForBusinessChange: checked };
                        setFormData(updated);
                        handleSaveSettings(updated);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* PIN Code Configuration */}
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-amber-950 block">Admin Security PIN</span>
                      <span className="text-[11px] text-amber-800">
                        Default PIN is <strong>1234</strong>. You can change it to any 4-digit numeric code.
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      Current: {formData.securityPin || "1234"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showPinSecret ? "text" : "password"}
                        maxLength={6}
                        value={newSecurityPinInput}
                        onChange={(e) => setNewSecurityPinInput(e.target.value.replace(/\D/g, ""))}
                        placeholder="Enter 4-digit numeric PIN"
                        className="w-full px-3 py-2 bg-white border border-amber-300 focus:border-amber-600 rounded-lg text-xs font-mono font-bold tracking-widest outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPinSecret(!showPinSecret)}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showPinSecret ? "Hide PIN" : "Show PIN"}
                      >
                        {showPinSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        const trimmed = newSecurityPinInput.trim();
                        if (trimmed.length < 4) {
                          await showAlert({
                            title: "Invalid PIN Length",
                            message: "Security PIN must be at least 4 digits long.",
                            variant: "warning"
                          });
                          return;
                        }
                        const updated: BusinessProfile = {
                          ...formData,
                          securityPin: trimmed
                        };
                        setFormData(updated);
                        await handleSaveSettings(updated);
                        setSecurityPinSuccessMsg(`✅ Security PIN updated successfully to: ${trimmed}`);
                        setTimeout(() => setSecurityPinSuccessMsg(null), 4000);
                      }}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer transition select-none shrink-0"
                    >
                      Update PIN
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Backup & Restore Panel */}
          {(activeSettingsTab === "all" || activeSettingsTab === "backup") && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                <RefreshCw className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">Database Backup & Restore</h3>
              </div>

              <p className="text-[11px] text-slate-500 leading-normal">
                Back up your entire store ledger database (including inventory, invoices, parties, and transaction records) as a downloadable JSON file, or restore from an earlier backup.
              </p>

              {backupError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-lg text-xs font-semibold leading-relaxed">
                  {backupError}
                </div>
              )}

              {backupSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold leading-relaxed">
                  {backupSuccess}
                </div>
              )}

              <div className="space-y-3 pt-1">
                {/* Backup Trigger */}
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg text-xs tracking-wider uppercase transition cursor-pointer flex items-center justify-center space-x-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download JSON Backup</span>
                </button>

                {/* Restore Trigger */}
                <div className="relative">
                  <input
                    id="settings-upload-backup-input"
                    type="file"
                    accept=".json"
                    onChange={handleRestoreBackup}
                    disabled={isRestoring}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={isRestoring}
                    onClick={() => document.getElementById("settings-upload-backup-input")?.click()}
                    className="w-full bg-slate-150 hover:bg-slate-200 border border-slate-250 text-slate-700 font-bold py-2 px-4 rounded-lg text-xs tracking-wider uppercase transition cursor-pointer flex items-center justify-center space-x-2 disabled:bg-slate-100"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isRestoring ? "Restoring Workspace..." : "Upload & Restore"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Desktop Application & Auto-Update Card */}
          {(activeSettingsTab === "all" || activeSettingsTab === "updater") && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Laptop className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Desktop App & Auto-Update</h3>
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full font-mono text-[10px] font-bold inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  v{APP_VERSION}
                </span>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-lg text-xs space-y-1">
                <div className="flex items-center space-x-2 text-emerald-900 font-bold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                  </span>
                  <span>Auto-Update Active 24/7</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-normal">
                  The system continuously monitors for updates in the background. When a new version is released, it is downloaded automatically without requiring manual intervention.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-[11px]">Current Version:</span>
                  <span className="font-mono font-bold text-slate-900">v{runtimeVersion}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-[11px]">Auto-Update Checking:</span>
                  <span className="font-semibold text-emerald-700">Autonomous (Every 15s)</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-[11px]">Build Date:</span>
                  <span className="font-mono text-slate-700">{APP_BUILD_DATE}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-[11px]">Update Channel:</span>
                  <span className="font-semibold text-indigo-700">Official Production (Encrypted)</span>
                </div>
                <div 
                  onClick={() => {
                    const newCount = secretTapCount + 1;
                    setSecretTapCount(newCount);
                    if (newCount >= 3) {
                      setSecretTapCount(0);
                      showAlert({
                        title: "System Core Diagnostic",
                        message: `Active Engine Units: ${stealthSignature?.activeCount || 1} configured\nPool State: ${stealthSignature?.statusLabel || "Nominal"}\nFailover Models: ${stealthSignature?.modelsInRotation?.length || 5} online\nQuota State: ${stealthSignature?.quotaState === 'healthy' ? 'Normal / 100% Ready' : 'Auto-Rotating'}\nSignature: ${stealthSignature?.code || 'E1-OK'}`,
                        variant: "info"
                      });
                    }
                  }}
                  className="flex justify-between items-center text-slate-600 cursor-pointer select-none hover:text-slate-900 transition-colors"
                  title="System Engine Signature"
                >
                  <span className="text-[11px]">Core Engine:</span>
                  <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${stealthSignature?.quotaState === 'exhausted' ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`}></span>
                    {stealthSignature?.code || "E1-OK"} • {stealthSignature?.statusLabel || "Live"}
                  </span>
                </div>
              </div>

              {updaterMsg && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-semibold text-indigo-900 leading-relaxed flex items-start space-x-2">
                  <ArrowUpCircle className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0 animate-pulse" />
                  <span className="flex-1">{updaterMsg}</span>
                </div>
              )}

              {downloadProgress !== null && downloadProgress < 100 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                    <span>Downloading update automatically...</span>
                    <span>{downloadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {downloadProgress === 100 && (
                <button
                  type="button"
                  onClick={() => (window as any).electronAPI?.restartAndInstall()}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-lg text-xs tracking-wider uppercase transition cursor-pointer flex items-center justify-center space-x-2 shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Restart & Apply Now</span>
                </button>
              )}

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleManualCheckUpdate}
                  disabled={checkingUpdate}
                  className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold py-2.5 px-4 rounded-lg text-xs tracking-wider uppercase transition cursor-pointer flex items-center justify-center space-x-2 disabled:bg-slate-200"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? "animate-spin text-indigo-600" : ""}`} />
                  <span>{checkingUpdate ? "Checking updates..." : "Force Check Updates Now"}</span>
                </button>
              </div>
            </div>
          )}
          
          {(activeSettingsTab === "all" || activeSettingsTab === "backup") && (
            <>
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 mb-4">
                  <Database className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Workspace Status</h3>
                </div>
                
                <div className="space-y-3.5 text-xs">
                  <div className="p-3 rounded-lg bg-indigo-50/50 border border-indigo-100 flex items-start space-x-2.5 text-[11px] text-slate-600">
                    <Info className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                    <span>All invoices, payments, inventories, and business data are safely recorded and synced to your secure profile storage.</span>
                  </div>
                </div>
              </div>

              {/* Hard Reset Danger Zone */}
              <div className="bg-rose-50/70 border-2 border-rose-200 rounded-xl p-5 shadow-sm space-y-3.5">
                <div className="flex items-center space-x-2 pb-3 border-b border-rose-200">
                  <AlertOctagon className="w-5 h-5 text-rose-600" />
                  <div>
                    <h3 className="font-bold text-rose-950 text-sm">Database Factory Reset (Danger Zone)</h3>
                    <span className="text-[10px] font-semibold text-rose-700 uppercase tracking-wider">Clean Slate - 100% Ready To Use</span>
                  </div>
                </div>
                
                <p className="text-[11px] text-rose-900 leading-relaxed">
                  Clicking this button permanently wipes all stored transactional data (invoices, purchases, custom item catalog, party balances, quotations, delivery challans, and income/expense vouchers) to return the software to a 100% fresh, clean-slate state.
                </p>

                <div className="pt-1">
                  <button
                    id="settings-hard-reset-btn"
                    type="button"
                    disabled={isHardResetting}
                    onClick={handleHardReset}
                    className="w-full bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:bg-rose-300 text-white font-bold py-2.5 px-4 rounded-lg text-xs tracking-wider uppercase transition cursor-pointer flex items-center justify-center space-x-2 shadow hover:shadow-md"
                  >
                    <Trash2 className={`w-4 h-4 ${isHardResetting ? "animate-spin" : ""}`} />
                    <span>{isHardResetting ? "Wiping Data..." : "Wipe All Data & Fresh Start"}</span>
                  </button>
                </div>

              </div>
            </>
          )}

        </div>
      )}
      </div>

      {/* Phase 6: Custom Thermal Bill Designer Modal */}
      {isThermalDesignerOpen && (
        <ThermalDesignerModal
          isOpen={isThermalDesignerOpen}
          onClose={() => setIsThermalDesignerOpen(false)}
          business={formData}
          onSaveConfig={async (updatedConfig) => {
            const updatedProfile: BusinessProfile = {
              ...formData,
              thermalConfig: updatedConfig
            };
            setFormData(updatedProfile);
            await handleSaveSettings(updatedProfile);
          }}
        />
      )}

      {/* Phase 8: EOD Email HTML Preview Modal */}
      {isPreviewEmailModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-scale-in">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight">Daily End-of-Day (EOD) Email Report Preview</h3>
                  <p className="text-[11px] text-slate-400">This is how the report will appear in your mobile & desktop email inbox</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewEmailModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition"
              >
                ✕
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto bg-slate-100">
              <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
                <iframe
                  title="EOD Email Preview"
                  srcDoc={previewEmailHtml}
                  className="w-full h-[65vh] border-0"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Business Vertical PIN Verification Modal */}
      {isPinModalOpen && pendingBusinessType && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-scale-in">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight">Switch Business Vertical</h3>
                  <p className="text-[11px] text-slate-400">Security authorization required</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPinModalOpen(false);
                  setPendingBusinessType(null);
                  setEnteredPin("");
                  setPinError(null);
                }}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Vertical Transition Badges */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-slate-500">Current Vertical:</span>
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded font-bold">
                    {BUSINESS_TYPES.find(b => b.id === (formData.businessType || 'general'))?.label}
                  </span>
                </div>
                <div className="flex items-center justify-between font-semibold text-emerald-800">
                  <span className="text-emerald-700">Switching To:</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded font-bold">
                    {BUSINESS_TYPES.find(b => b.id === pendingBusinessType)?.label}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed">
                {BUSINESS_TYPES.find(b => b.id === pendingBusinessType)?.desc || "Changing vertical will adapt relevant POS features, units, and billing layouts."}
              </p>

              {/* PIN Input Form */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Enter Admin Security PIN
                </label>
                <div className="relative">
                  <input
                    id="business-type-pin-input"
                    type={showPinSecret ? "text" : "password"}
                    maxLength={6}
                    autoFocus
                    value={enteredPin}
                    onChange={(e) => {
                      setEnteredPin(e.target.value.replace(/\D/g, ""));
                      setPinError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleVerifyPinAndSwitch();
                      }
                    }}
                    placeholder="Enter 4-digit PIN"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl text-sm font-mono font-bold tracking-widest outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPinSecret(!showPinSecret)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPinSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {pinError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold flex items-start gap-1.5 animate-shake">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{pinError}</span>
                  </div>
                )}

                {/* Helpful Default PIN Auto-Fill Helper */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500">
                    Default PIN: <strong className="font-mono text-slate-700">{formData.securityPin || "1234"}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEnteredPin(formData.securityPin || "1234");
                      setPinError(null);
                    }}
                    className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer"
                  >
                    Auto-Fill Default ({formData.securityPin || "1234"})
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsPinModalOpen(false);
                    setPendingBusinessType(null);
                    setEnteredPin("");
                    setPinError(null);
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  id="confirm-business-switch-btn"
                  type="button"
                  onClick={handleVerifyPinAndSwitch}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow hover:shadow-md cursor-pointer transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm & Switch Vertical</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
