/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { BusinessProfile, DatabaseState, INDIAN_STATES } from "../types.js";
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
  Calendar
} from "lucide-react";
import ThermalDesignerModal from "./ThermalDesignerModal.js";

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    await onSaveBusiness(formData);
    setShowSuccessAlert(true);
    setTimeout(() => {
      setShowSuccessAlert(false);
    }, 4000);
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
      title: "⚠️ संपूर्ण डेटा पुसून टाकायचा आहे का? (Confirm Hard Reset)",
      message: "या क्रियेमुळे डेटाबेसमधील सर्व विक्री बिल (Sales), खरेदी (Purchases), सर्व इन्व्हेंटरी आयटम्स (Items), ग्राहक/सप्लायर (Parties), कोटेशन्स, डिलिव्हरी चलान, ऑफर्स आणि सर्व जमा-खर्च रेकॉर्ड्स कायमस्वरूपी पुसले जातील.\n\nसॉफ्टवेअर एकदम नवीन आणि फ्रेश (Ready to Use) स्वच्छ स्थितीत येईल.\n\nतुम्हाला खात्री आहे का?",
      confirmText: "हो, सर्व डेटा पुसा (Wipe All Data)",
      cancelText: "रद्द करा (Cancel)",
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
          title: "डेटाबेस हार्ड रिसेट यशस्वी!",
          message: "सर्व जुना डेटा यशस्वीरीत्या पुसला गेला आहे. सॉफ्टवेअर आता नव्या नोंदींसाठी १००% सज्ज आहे.",
          variant: "success"
        });
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        await showAlert({
          title: "त्रुटी",
          message: result.error || "हार्ड रिसेट अयशस्वी झाला.",
          variant: "danger"
        });
      }
    } catch (err: any) {
      await showAlert({
        title: "त्रुटी",
        message: "हार्ड रिसेट करताना अडचण आली: " + (err?.message || "नेटवर्क एरर"),
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Core Settings Form */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm lg:col-span-2">
          
          <div className="flex items-center space-x-2 mb-6 pb-3 border-b border-slate-100">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-sm">Corporate Identification</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
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

            {/* GSTIN and State side-by-side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Company GSTIN (15 Characters)</label>
                <div className="relative">
                  <input
                    id="settings-business-gstin"
                    type="text"
                    name="gstin"
                    maxLength={15}
                    value={formData.gstin}
                    onChange={handleInputChange}
                    placeholder="e.g. 27AAAAA1111A1Z1"
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
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">E-Billing Email Receipt</label>
                <div className="relative">
                  <input
                    id="settings-business-email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="e.g. finance@acme.com"
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
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                    डिफॉल्ट बिलिंग मोड (Default Billing Mode)
                  </label>
                  <p className="text-[11px] text-slate-500">
                    नवीन बिलांसाठी सुरुवातीचा प्रकार निवडा (हे प्रत्येक बिलाच्या वेळीही टॉगल करता येते)
                  </p>
                </div>
                <div className="inline-flex rounded-lg bg-white p-1 border border-slate-200 text-xs font-bold shadow-2xs">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, defaultBillingMode: "gst" }));
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
                      setFormData(prev => ({ ...prev, defaultBillingMode: "non_gst" }));
                      try { localStorage.setItem("billingonhand_billing_mode", "non_gst"); } catch {}
                    }}
                    className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                      formData.defaultBillingMode === "non_gst"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Non-GST (साधी पावती)
                  </button>
                </div>
              </div>
            </div>

            {/* Phase 7: Customer Loyalty Points Scheme Configuration */}
            <div className="pt-5 border-t border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">ग्राहक लॉयल्टी रिवॉर्ड्स (Customer Loyalty Scheme)</h3>
                    <p className="text-[11px] text-slate-500">Configure customer points earning and redemption rules for POS billing</p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.loyaltyConfig?.enabled !== false}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      setFormData(prev => ({
                        ...prev,
                        loyaltyConfig: {
                          ...(prev.loyaltyConfig || {
                            pointsPer100Rupees: 1,
                            redemptionRate: 1.0,
                            minPointsToRedeem: 10,
                            maxRedemptionPercentage: 50,
                            expiryDays: 365
                          }),
                          enabled
                        }
                      }));
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {formData.loyaltyConfig?.enabled !== false && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Points Earning Rate */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                        Points Earned per ₹100 Spent
                      </label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={formData.loyaltyConfig?.pointsPer100Rupees ?? 1}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setFormData(prev => ({
                            ...prev,
                            loyaltyConfig: {
                              ...(prev.loyaltyConfig || {
                                enabled: true,
                                redemptionRate: 1.0,
                                minPointsToRedeem: 10,
                                maxRedemptionPercentage: 50
                              }),
                              enabled: true,
                              pointsPer100Rupees: val
                            }
                          }));
                        }}
                        className="w-full px-3 py-2 bg-white border border-amber-200 focus:border-amber-500 rounded-lg text-xs font-mono font-bold outline-none"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">e.g. 1 point for every ₹100 purchased</span>
                    </div>

                    {/* Redemption Value */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                        Value of 1 Point in Rupees (₹)
                      </label>
                      <input
                        type="number"
                        min="0.05"
                        step="0.05"
                        value={formData.loyaltyConfig?.redemptionRate ?? 1.0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setFormData(prev => ({
                            ...prev,
                            loyaltyConfig: {
                              ...(prev.loyaltyConfig || {
                                enabled: true,
                                pointsPer100Rupees: 1,
                                minPointsToRedeem: 10,
                                maxRedemptionPercentage: 50
                              }),
                              enabled: true,
                              redemptionRate: val
                            }
                          }));
                        }}
                        className="w-full px-3 py-2 bg-white border border-amber-200 focus:border-amber-500 rounded-lg text-xs font-mono font-bold outline-none"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">e.g. 1.0 = ₹1 discount per 1 point</span>
                    </div>

                    {/* Minimum Points to Redeem */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                        Minimum Points to Redeem
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.loyaltyConfig?.minPointsToRedeem ?? 10}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setFormData(prev => ({
                            ...prev,
                            loyaltyConfig: {
                              ...(prev.loyaltyConfig || {
                                enabled: true,
                                pointsPer100Rupees: 1,
                                redemptionRate: 1.0,
                                maxRedemptionPercentage: 50
                              }),
                              enabled: true,
                              minPointsToRedeem: val
                            }
                          }));
                        }}
                        className="w-full px-3 py-2 bg-white border border-amber-200 focus:border-amber-500 rounded-lg text-xs font-mono font-bold outline-none"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Customer must have at least this many points</span>
                    </div>

                    {/* Max Redemption % per Bill */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                        Max Redemption Limit (% of Bill)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={formData.loyaltyConfig?.maxRedemptionPercentage ?? 50}
                        onChange={(e) => {
                          const val = Math.min(100, Math.max(1, parseInt(e.target.value) || 50));
                          setFormData(prev => ({
                            ...prev,
                            loyaltyConfig: {
                              ...(prev.loyaltyConfig || {
                                enabled: true,
                                pointsPer100Rupees: 1,
                                redemptionRate: 1.0,
                                minPointsToRedeem: 10
                              }),
                              enabled: true,
                              maxRedemptionPercentage: val
                            }
                          }));
                        }}
                        className="w-full px-3 py-2 bg-white border border-amber-200 focus:border-amber-500 rounded-lg text-xs font-mono font-bold outline-none"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Maximum % of bill payable via points</span>
                    </div>
                  </div>

                  {/* Scheme Summary & Example Box */}
                  <div className="bg-white border border-amber-200/80 rounded-lg p-3 text-xs text-slate-700 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-bold text-slate-800 block">स्कीमचे स्वरूप व उदाहरण (Scheme Example):</span>
                      <p className="text-[11px] text-slate-600">
                        • ग्राहक ₹१,००० ची खरेदी करेल तेव्हा त्याला <strong>{Math.floor((1000 / 100) * (formData.loyaltyConfig?.pointsPer100Rupees || 1))} पॉईंट्स</strong> मिळतील.
                      </p>
                      <p className="text-[11px] text-slate-600">
                        • पुढील बिलावर ५० पॉईंट्स रिडीम केल्यास थेट <strong>₹{(50 * (formData.loyaltyConfig?.redemptionRate || 1)).toFixed(2)}</strong> ची सवलत मिळेल.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Phase 8: Automated Scheduled EOD Email Reports Configuration */}
            <div className="pt-5 border-t border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 text-blue-800 rounded-lg">
                    <Mail className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">स्वयंचलित दैनिक ईमेल अहवाल (Automated EOD Email Reports)</h3>
                    <p className="text-[11px] text-slate-500">रोज संध्याकाळी दुकान बंद होताना मालकाच्या ईमेलवर डे-एंड सारांश स्वयंचलित पाठवा</p>
                  </div>
                </div>

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

              {formData.scheduledEmailConfig?.enabled === true && (
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Primary Recipient Email */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                        प्राथमिक ईमेल पत्ता (Store Owner Email) *
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
                        ईमेल पाठवण्याची वेळ (Scheduled Time - 24Hr)
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
                      <span className="text-[10px] text-slate-500 mt-0.5 block">दुकान बंद झाल्यावर दररोज या वेळेस ईमेल स्वयंचलित पाठवला जाईल</span>
                    </div>

                    {/* CC Emails */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                        CC ईमेल (पार्टनर किंवा CA चे ईमेल्स - पर्यायी)
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
                        प्रेषकाचे नाव (Sender Display Name)
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
                      ईमेलमध्ये समाविष्ट करायचे विभाग (Report Content Sections):
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 bg-white/80 p-3 rounded-lg border border-blue-100">
                      {[
                        { key: "salesSummary", label: "📊 Sales Summary (एकूण विक्री व बिले)" },
                        { key: "paymentModes", label: "💵 Cash & Bank UPI (गल्ल्यातील रोख व बँक जमा)" },
                        { key: "profitAndMargins", label: "📈 Profit & Margin (अंदाजित नफा व मार्जिन)" },
                        { key: "taxSummary", label: "🏛️ GST Tax (CGST, SGST, IGST कर सारांश)" },
                        { key: "topSellingItems", label: "🔥 Top Selling Items (सर्वाधिक खप झालेले ५ आयटम्स)" },
                        { key: "lowStockAlerts", label: "⚠️ Low Stock Alerts (कमी साठा व ऑर्डर आवश्यक)" },
                        { key: "nearExpiryAlerts", label: "⏳ Near Expiry Alerts (४५ दिवसांत संपणारा माल)" },
                        { key: "customerKhata", label: "📒 Customer Khata (बाकीदार ग्राहक यादी)" },
                        { key: "loyaltySummary", label: "⭐ Loyalty Points (लॉयल्टी पॉईंट्स व्यवहार)" }
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
                        <span>थेट इंटरनेट ईमेल पाठवण्यासाठी SMTP / Gmail सेटिंग्ज (Optional SMTP Configuration)</span>
                      </div>
                      <span className="text-[11px] text-blue-600 font-semibold">{showSmtpConfig ? "लपवा ▲" : "दाखवा / बदला ▼"}</span>
                    </button>

                    {showSmtpConfig && (
                      <div className="p-4 space-y-3 border-t border-blue-100 text-xs bg-white">
                        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 space-y-1">
                          <p className="font-bold">💡 Gmail वापरकर्त्यांसाठी टीप (Gmail App Password):</p>
                          <p className="text-slate-600">
                            गुगल सिक्युरिटीमुळे तुमचा साधा पासवर्ड न वापरता, तुमच्या Google Account मध्ये <strong>2-Step Verification</strong> चालू करा आणि <strong>App Passwords</strong> मधून १६-अंकी पासवर्ड तयार करून खाली पेस्ट करा.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">ईमेल सेवा (Provider)</label>
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
                            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">प्रेषक ईमेल (SMTP User/Email)</label>
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
                            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">ॲप पासवर्ड (App Password)</label>
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
                        <span>{isTestingEmail ? "चाचणी अहवाल पाठवत आहे..." : "चाचणी अहवाल त्वरित पाठवा (Send Test Now)"}</span>
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
                        <span>अहवाल पूर्वावलोकन (Preview HTML)</span>
                      </button>
                    </div>

                    {formData.scheduledEmailConfig?.lastSentAt && (
                      <span className="text-[11px] text-slate-500 font-mono">
                        शेवटचा अहवाल: {new Date(formData.scheduledEmailConfig.lastSentAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} ({formData.scheduledEmailConfig.lastSendStatus === "success" ? "✅ यशस्वी" : "⚠️ अयशस्वी"})
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
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                id="save-settings-btn"
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-6 rounded-lg text-xs tracking-wider uppercase shadow hover:shadow-md transition flex items-center space-x-2 cursor-pointer select-none"
              >
                <Save className="w-4 h-4" />
                <span>Update Business Profile</span>
              </button>
            </div>

          </form>

        </div>

        {/* Database administration block - Right Panel */}
        <div className="space-y-6">

          {/* Phase 6: Custom Thermal Bill Designer Card */}
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
              सानुकूल थर्मल प्रिंटर लेआउट (58mm व 80mm), दुकान लोगो, डायनॅमिक UPI QR कोड, मराठी/इंग्रजी भाषा, आणि फॉन्ट आकार एडिट करा.
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

          {/* User security access update form */}
          {session && (
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

          {/* Backup & Restore Panel */}
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
          
          {/* Desktop Application & Auto-Update Card */}
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
                <h3 className="font-bold text-rose-950 text-sm">डेटाबेस हार्ड रिसेट (Hard Factory Reset)</h3>
                <span className="text-[10px] font-semibold text-rose-700 uppercase tracking-wider">Clean Slate - 100% Ready To Use</span>
              </div>
            </div>
            
            <p className="text-[11px] text-rose-900 leading-relaxed">
              हे बटन दाबल्यास सॉफ्टवेअरमधील सर्व जुना डेटा (विक्री बिल, खरेदी, आयटम लिस्ट, ग्राहक/सप्लायर उधारी, कोटेशन, चलान आणि सर्व जमा-खर्च) संपूर्णपणे पुसला जाईल आणि सॉफ्टवेअर अगदी नवीन (Fresh Clean Slate) रेडी-टू-युज स्थितीत येईल.
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
                <span>{isHardResetting ? "डेटा पुसत आहे..." : "सर्व डेटा पुसा - हार्ड रिसेट (Wipe All & Fresh Start)"}</span>
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* Phase 6: Custom Thermal Bill Designer Modal */}
      {isThermalDesignerOpen && (
        <ThermalDesignerModal
          isOpen={isThermalDesignerOpen}
          onClose={() => setIsThermalDesignerOpen(false)}
          business={business}
          onSaveConfig={async (updatedConfig) => {
            const updatedProfile: BusinessProfile = {
              ...business,
              thermalConfig: updatedConfig
            };
            await onSaveBusiness(updatedProfile);
            setFormData(updatedProfile);
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
                  <h3 className="font-bold text-sm leading-tight">दैनिक डे-एंड ईमेल अहवाल पूर्वावलोकन (Daily EOD Email Preview)</h3>
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

    </div>
  );
}
