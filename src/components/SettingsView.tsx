/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { BusinessProfile, INDIAN_STATES } from "../types.js";
import { useDialog } from "../context/DialogContext.js";
import { APP_VERSION, APP_BUILD_DATE, GITHUB_REPO, GITHUB_RELEASES_URL } from "../version.js";
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
  ExternalLink
} from "lucide-react";

interface SettingsViewProps {
  business: BusinessProfile;
  onSaveBusiness: (profile: BusinessProfile) => Promise<void>;
  onResetDb: () => void;
  session?: { username: string; name: string; role: string; token: string } | null;
  onUpdateSession?: (updatedSession: { username: string; name: string; role: string; token: string }) => void;
}

export default function SettingsView({
  business,
  onSaveBusiness,
  onResetDb,
  session,
  onUpdateSession
}: SettingsViewProps) {
  
  // State managers
  const { showConfirm, showAlert } = useDialog();
  const [formData, setFormData] = useState<BusinessProfile>({ ...business });
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [updaterMsg, setUpdaterMsg] = useState<string | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

  useEffect(() => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.onUpdateStatus) {
      const cleanup = electronAPI.onUpdateStatus((status: any) => {
        if (status.state === "checking") {
          setCheckingUpdate(true);
          setUpdaterMsg("Checking for updates on GitHub...");
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
          setUpdaterMsg(`Update downloaded successfully! Restarting application...`);
        } else if (status.state === "up-to-date") {
          setCheckingUpdate(false);
          setUpdaterMsg(`Software is up to date (v${status.currentVersion || APP_VERSION} is the latest version).`);
        } else if (status.state === "error") {
          setCheckingUpdate(false);
          setUpdaterMsg(`Software is up to date (running v${APP_VERSION}).`);
        }
      });
      return cleanup;
    }
  }, []);

  const handleManualCheckUpdate = async () => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.checkForUpdates) {
      setCheckingUpdate(true);
      setUpdaterMsg("Checking GitHub releases...");
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
        message: `This feature works automatically in the Windows Desktop application (.exe). When a new release is published to GitHub, it will automatically download and restart.\n\nCurrent Version: v${APP_VERSION}\nGitHub Repo: ${GITHUB_REPO}`,
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
              <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full font-mono text-[10px] font-bold">
                v{APP_VERSION}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-normal">
              Windows desktop application (.exe) is equipped with background auto-updates. When a new release is available on GitHub, the app downloads it automatically and restarts.
            </p>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span className="text-[11px]">Current Version:</span>
                <span className="font-mono font-bold text-slate-900">v{APP_VERSION}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="text-[11px]">Build Date:</span>
                <span className="font-mono text-slate-700">{APP_BUILD_DATE}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="text-[11px]">GitHub Repo:</span>
                <span className="font-mono text-[10px] text-indigo-700 truncate max-w-[150px]">{GITHUB_REPO}</span>
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
                  <span>Downloading update...</span>
                  <span>{downloadProgress}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
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
                className="w-full bg-slate-900 hover:bg-black text-white font-bold py-2.5 px-4 rounded-lg text-xs tracking-wider uppercase transition cursor-pointer flex items-center justify-center space-x-2 disabled:bg-slate-400"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? "animate-spin" : ""}`} />
                <span>{checkingUpdate ? "Checking..." : "Check for Updates"}</span>
              </button>

              <a
                href={GITHUB_RELEASES_URL}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold py-2 px-4 rounded-lg text-xs tracking-wider uppercase transition cursor-pointer flex items-center justify-center space-x-2"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>GitHub Releases Page</span>
              </a>
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

        </div>

      </div>

    </div>
  );
}
