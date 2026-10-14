import React, { useState, useEffect, useCallback } from "react";
import {
  Cloud,
  CloudUpload,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileJson,
  RotateCcw,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Mail,
  FolderLock
} from "lucide-react";
import {
  TARGET_BACKUP_EMAIL,
  BACKUP_FOLDER_NAME,
  GOOGLE_APPS_SCRIPT_TEMPLATE,
  DEFAULT_GOOGLE_DRIVE_WEBHOOK_URL,
  DEFAULT_GOOGLE_DEPLOYMENT_ID,
  BackupStatus,
  DriveBackupFile,
  getBackupStatus,
  subscribeBackupStatus,
  uploadBackupToGoogleDrive,
  listGoogleDriveBackups,
  setAutoBackupEnabled,
  generateBackupFileName,
  restoreAutomatedBackup,
  saveDriveWebhookConfig
} from "../services/googleDriveBackup";
import { useDialog } from "../context/DialogContext";
import { DatabaseState } from "../types";

interface GoogleDriveBackupPanelProps {
  currentDb?: DatabaseState;
  onRestoreSuccess?: () => void;
}

export const GoogleDriveBackupPanel: React.FC<GoogleDriveBackupPanelProps> = ({
  currentDb,
  onRestoreSuccess
}) => {
  const { showConfirm, showAlert } = useDialog();
  const [status, setStatus] = useState<BackupStatus>(getBackupStatus());
  const [driveFiles, setDriveFiles] = useState<DriveBackupFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Technical details accordion (hidden by default since it is pre-configured)
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [inputWebhookUrl, setInputWebhookUrl] = useState(status.webhookUrl || DEFAULT_GOOGLE_DRIVE_WEBHOOK_URL);
  const [copiedScript, setCopiedScript] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Subscribe to backup status updates
  useEffect(() => {
    const unsubscribe = subscribeBackupStatus((newStatus) => {
      setStatus(newStatus);
      if (newStatus.webhookUrl && !inputWebhookUrl) {
        setInputWebhookUrl(newStatus.webhookUrl);
      }
    });
    return () => unsubscribe();
  }, [inputWebhookUrl]);

  // Load backups list
  const loadFiles = useCallback(async () => {
    setIsLoadingFiles(true);
    try {
      const files = await listGoogleDriveBackups();
      setDriveFiles(files);
    } catch (err: any) {
      console.error("Error loading backups:", err);
    } finally {
      setIsLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Copy Google Apps Script code to clipboard
  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2500);
    } catch {
      // Fallback
    }
  };

  // Save Webhook URL for pradipayanbackup@gmail.com
  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputWebhookUrl.trim()) {
      setActionMessage({
        type: "error",
        text: "कृपया Google Apps Script Webhook URL प्रविष्ट करा."
      });
      return;
    }

    setIsSavingConfig(true);
    setActionMessage(null);
    try {
      const res = await saveDriveWebhookConfig(inputWebhookUrl.trim());
      setActionMessage({
        type: "success",
        text: `गुगल ड्राईव्ह यशस्वीरीत्या लिंक झाले! (${TARGET_BACKUP_EMAIL}). टेस्ट बॅकअप स्नॅपशॉट तात्काळ तयार करण्यात आला.`
      });
      setShowSetupGuide(false);
      await loadFiles();
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: err.message || "Webhook URL सेव्ह करताना त्रुटी आली."
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Trigger Instant Backup Now (0% manual intervention, seamless)
  const handleInstantBackup = async () => {
    setIsProcessingAction(true);
    setActionMessage(null);
    try {
      const result = await uploadBackupToGoogleDrive(currentDb, true);
      setActionMessage({
        type: "success",
        text: `बॅकअप यशस्वीरीत्या तयार झाला: ${result.fileName}${
          status.isConfigured ? ` (आणि ${TARGET_BACKUP_EMAIL} गुगल ड्राईव्हवर सेव्ह झाला)` : " (सिस्टममध्ये सुरक्षित सेव्ह झाला)."
        }`
      });
      await loadFiles();
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: err.message || "बॅकअप तयार करताना त्रुटी आली."
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Download a backup directly to user's computer
  const handleDownloadFile = (fileName: string) => {
    const downloadUrl = `/api/backups/download/${encodeURIComponent(fileName)}`;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Restore database from a backup file
  const handleRestoreFile = async (file: DriveBackupFile) => {
    const confirmed = await showConfirm({
      title: "Restore Database Backup?",
      message: `सध्याचे सर्व इनव्हॉइसेस, स्टॉक आणि लेजर्स '${file.name}' फाईलमधून पूर्ववत (Restore) केले जातील. आपण खात्रीशीर आहात का?`,
      confirmText: "होय, Restore करा",
      cancelText: "रद्द करा",
      variant: "danger"
    });

    if (!confirmed) return;

    setIsProcessingAction(true);
    setActionMessage(null);
    try {
      const result = await restoreAutomatedBackup(file.name);
      await showAlert({
        title: "Restore Successful",
        message: result.message || `डेटा '${file.name}' फाईलमधून यशस्वीरीत्या रिस्टोअर झाला.`,
        variant: "success"
      });

      if (onRestoreSuccess) onRestoreSuccess();
      await loadFiles();
    } catch (err: any) {
      await showAlert({
        title: "Restore Failed",
        message: err.message || "बॅकअप रिस्टोअर करताना त्रुटी आली.",
        variant: "danger"
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });
    } catch {
      return isoStr;
    }
  };

  const storeName = currentDb?.business?.name || "BillingOnHand";
  const sampleFileName = generateBackupFileName(storeName);

  return (
    <div id="google-drive-backup-panel" className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 flex-wrap">
              <span>Google Drive Automated Cloud Backup</span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                100% Automated (0% Manual Intervention)
              </span>
              <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full text-[10px] font-mono font-semibold">
                JSON Format
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <span>Target Account:</span>
              <strong className="text-slate-800 font-mono flex items-center gap-1">
                <Mail className="w-3 h-3 text-slate-400" />
                {TARGET_BACKUP_EMAIL}
              </strong>
              <span>| Folder:</span>
              <strong className="text-slate-800 font-mono">{BACKUP_FOLDER_NAME}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status.isConfigured ? (
            <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-xs font-semibold inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Drive Active ({TARGET_BACKUP_EMAIL})</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-xs font-semibold inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Awaiting 1-Time Link ({TARGET_BACKUP_EMAIL})</span>
            </span>
          )}
        </div>
      </div>

      {/* Action / Error Notifications */}
      {actionMessage && (
        <div
          className={`p-3 rounded-lg text-xs font-medium flex items-start space-x-2 ${
            actionMessage.type === "success"
              ? "bg-emerald-50 border border-emerald-100 text-emerald-800"
              : "bg-rose-50 border border-rose-100 text-rose-800"
          }`}
        >
          {actionMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span className="leading-relaxed">{actionMessage.text}</span>
        </div>
      )}

      {/* Live Target Drive Card */}
      <div className="p-4 bg-gradient-to-br from-slate-50 to-emerald-50/40 border border-emerald-200/70 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>१००% ऑटोमॅटिक बॅकअप - Google Account: <span className="text-emerald-800 font-mono underline">{TARGET_BACKUP_EMAIL}</span></span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed max-w-2xl">
              सिस्टम सुरू होताना, प्रत्येक बिल किंवा स्टॉक अपडेट होताना आणि दर १५ मिनिटांनी तुमच्या फर्मच्या नावाने (<strong>{storeName}</strong>) JSON फाईल आपोआप <strong>{BACKUP_FOLDER_NAME}</strong> फोल्डरमध्ये पाठवली जाते. कर्मचाऱ्यांना कुठलेही लॉगिन बटण दाबण्याची गरज नाही.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSetupGuide(!showSetupGuide)}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
            >
              <span>{showSetupGuide ? "तपशील लपवा" : "क्लाऊड बॅकअप तपशील"}</span>
              {showSetupGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Dynamic File Naming Rule Banner */}
        <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block flex items-center gap-1">
              <FileJson className="w-3.5 h-3.5 text-indigo-600" />
              <span>Standard File Naming Format: [FirmName]_[Date]_[Time].json</span>
            </span>
            <p className="text-[11px] font-mono text-slate-800 font-semibold truncate">
              {sampleFileName}
            </p>
          </div>
          <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-mono rounded shrink-0">
            Firm: {storeName}
          </span>
        </div>
      </div>

      {/* Cloud Backup Configuration & Deployment Details (Collapsible) */}
      {showSetupGuide && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
              <FolderLock className="w-4 h-4 text-emerald-600" />
              <span>गुगल ड्राईव्ह ऑटोमॅटिक सिंक तपशील ({TARGET_BACKUP_EMAIL}):</span>
            </div>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-semibold rounded-full">
              Pre-Configured &amp; Active
            </span>
          </div>

          <div className="text-[11px] text-slate-700 space-y-2.5 leading-relaxed">
            <div className="p-2.5 bg-white border border-slate-200 rounded-lg space-y-1 font-mono text-[10px]">
              <div><strong>Account:</strong> {TARGET_BACKUP_EMAIL}</div>
              <div><strong>Target Folder:</strong> {BACKUP_FOLDER_NAME}</div>
              <div><strong>Deployment ID:</strong> {DEFAULT_GOOGLE_DEPLOYMENT_ID}</div>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center shrink-0 text-[10px]">१</span>
              <p>
                ब्राउझरमध्ये <strong>{TARGET_BACKUP_EMAIL}</strong> हे गुगल खाते लॉगिन करा आणि{" "}
                <a
                  href="https://script.google.com/home/start"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 font-semibold underline inline-flex items-center gap-0.5"
                >
                  <span>script.google.com</span>
                  <ExternalLink className="w-3 h-3" />
                </a>{" "}
                ओपन करून <strong>"New project"</strong> (नवीन प्रोजेक्ट) वर क्लिक करा.
              </p>
            </div>

            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center shrink-0 text-[10px]">२</span>
              <div className="space-y-1.5 w-full">
                <div className="flex items-center justify-between">
                  <p>तेथील जुना कोड खोडून खालील रेडीमेड कोड पेस्ट करा:</p>
                  <button
                    type="button"
                    onClick={handleCopyScript}
                    className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded text-[10px] font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                  >
                    {copiedScript ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedScript ? "कोड कॉपी झाला!" : "स्क्रिप्ट कोड कॉपी करा (Copy)"}</span>
                  </button>
                </div>
                <div className="bg-slate-900 text-slate-100 p-2.5 rounded-lg text-[10px] font-mono max-h-32 overflow-y-auto border border-slate-800">
                  <pre>{GOOGLE_APPS_SCRIPT_TEMPLATE}</pre>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center shrink-0 text-[10px]">३</span>
              <p>
                वर उजव्या बाजूला <strong>"Deploy" (डिप्लॉय)</strong> बटनावर क्लिक करा &gt; <strong>"New deployment"</strong> निवडा &gt; डाव्या बाजूला गियर आयकॉनवर क्लिक करून <strong>"Web app"</strong> निवडा.
                <br />
                - Execute as: <strong>Me ({TARGET_BACKUP_EMAIL})</strong>
                <br />
                - Who has access: <strong>Anyone</strong> (कोणीही)
                <br />
                त्यानंतर <strong>"Deploy"</strong> वर क्लिक करा आणि आलेली <strong>Web App URL</strong> कॉपी करा.
              </p>
            </div>

            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center shrink-0 text-[10px]">४</span>
              <div className="w-full space-y-2">
                <p>कॉपी केलेली Web App URL खाली पेस्ट करा आणि सेव्ह करा:</p>
                <form onSubmit={handleSaveWebhook} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={inputWebhookUrl}
                    onChange={(e) => setInputWebhookUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    required
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  />
                  <button
                    type="submit"
                    disabled={isSavingConfig}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-emerald-300 shrink-0"
                  >
                    {isSavingConfig ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>पडताळणी चालू आहे...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>सेव्ह करा &amp; कनेक्ट करा</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Backup Status & Control Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* Automatic Continuous Sync Toggle */}
        <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
          <div className="space-y-0.5">
            <label htmlFor="auto-backup-toggle" className="text-xs font-bold text-slate-800 block cursor-pointer">
              100% Automatic Cloud &amp; Local Sync
            </label>
            <p className="text-[10px] text-slate-500">
              Triggered automatically on startup, after invoice/stock changes, and every 15 minutes
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              id="auto-backup-toggle"
              type="checkbox"
              checked={status.autoBackupEnabled}
              onChange={(e) => setAutoBackupEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        {/* Last Snapshot Info */}
        <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
          <div className="space-y-0.5 truncate">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Last Snapshot Created
            </span>
            <span className="text-xs font-semibold text-slate-800 block truncate">
              {status.lastBackupTime ? formatDate(status.lastBackupTime) : "No backup recorded yet"}
            </span>
            {status.lastBackupFileName && (
              <span className="text-[10px] font-mono text-emerald-700 truncate block">
                {status.lastBackupFileName}
              </span>
            )}
          </div>
          <div className="shrink-0 ml-2">
            {status.state === "syncing" ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Syncing...</span>
              </span>
            ) : (
              <span className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <button
          id="gdrive-backup-now-btn"
          type="button"
          onClick={handleInstantBackup}
          disabled={isProcessingAction || status.state === "syncing"}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-lg text-xs tracking-wider uppercase transition cursor-pointer flex items-center justify-center space-x-2 disabled:bg-emerald-300 shadow-xs"
        >
          {status.state === "syncing" || isProcessingAction ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>बॅकअप तयार आणि अपलोड करत आहे...</span>
            </>
          ) : (
            <>
              <CloudUpload className="w-4 h-4" />
              <span>Create Instant Snapshot Now (तात्काळ बॅकअप घ्या)</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={loadFiles}
          disabled={isLoadingFiles}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-lg text-xs transition cursor-pointer flex items-center justify-center space-x-1.5 border border-slate-200 shrink-0"
          title="Refresh Backups List"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? "animate-spin" : ""}`} />
          <span>रिफ्रेश यादी</span>
        </button>
      </div>

      {/* Backups List Section */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
            <span>Automated Backup History ({driveFiles.length})</span>
          </h4>
          <span className="text-[10px] text-slate-400 font-mono">
            Location: {BACKUP_FOLDER_NAME}
          </span>
        </div>

        {isLoadingFiles ? (
          <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
            <span>Loading backup records...</span>
          </div>
        ) : driveFiles.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs space-y-1">
            <FileJson className="w-6 h-6 mx-auto text-slate-300" />
            <p className="font-semibold text-slate-600">No backup files found yet</p>
            <p className="text-[11px]">Click "Create Instant Snapshot Now" above to generate the first backup file.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto bg-white">
            {driveFiles.map((file) => (
              <div
                key={file.id || file.name}
                className="p-3 flex items-center justify-between hover:bg-slate-50/80 transition text-xs gap-3"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                    <FileJson className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 truncate font-mono text-[11px]">{file.name}</div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-2 flex-wrap">
                      <span>{formatDate(file.createdTime)}</span>
                      <span>•</span>
                      <span>{file.size || "—"}</span>
                      <span>•</span>
                      {file.isDrive ? (
                        <span className="px-1.5 py-0.2 bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold rounded text-[9px] inline-flex items-center gap-1">
                          <Cloud className="w-2.5 h-2.5" />
                          Google Drive ({TARGET_BACKUP_EMAIL})
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 font-semibold rounded text-[9px]">
                          Local Snapshot
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0">
                  {/* Restore button */}
                  <button
                    type="button"
                    onClick={() => handleRestoreFile(file)}
                    disabled={isProcessingAction}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded text-[11px] font-semibold flex items-center space-x-1 transition cursor-pointer"
                    title="Restore data from this backup"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restore</span>
                  </button>

                  {/* Direct Download button */}
                  <button
                    type="button"
                    onClick={() => handleDownloadFile(file.name)}
                    disabled={isProcessingAction}
                    className="p-1.5 hover:bg-slate-200 text-slate-700 rounded transition cursor-pointer flex items-center gap-1 border border-slate-200 bg-white"
                    title="Download JSON File"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span className="hidden sm:inline text-[10px] font-medium">Download</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
