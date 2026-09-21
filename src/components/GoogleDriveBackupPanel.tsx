import React, { useState, useEffect, useCallback } from "react";
import {
  Cloud,
  CloudUpload,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertCircle,
  FolderLock,
  Clock,
  FileJson,
  RotateCcw,
  ShieldCheck,
  HardDrive
} from "lucide-react";
import {
  TARGET_BACKUP_EMAIL,
  BACKUP_FOLDER_NAME,
  BackupStatus,
  DriveBackupFile,
  getBackupStatus,
  subscribeBackupStatus,
  uploadBackupToGoogleDrive,
  listGoogleDriveBackups,
  setAutoBackupEnabled,
  generateBackupFileName,
  restoreAutomatedBackup
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

  // Subscribe to backup status updates
  useEffect(() => {
    const unsubscribe = subscribeBackupStatus((newStatus) => {
      setStatus(newStatus);
    });
    return () => unsubscribe();
  }, []);

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

  // Trigger Instant Backup Now (0% manual intervention, seamless)
  const handleInstantBackup = async () => {
    setIsProcessingAction(true);
    setActionMessage(null);
    try {
      const result = await uploadBackupToGoogleDrive(currentDb, true);
      setActionMessage({
        type: "success",
        text: `बॅकअप यशस्वीरीत्या तयार झाला: ${result.fileName}`
      });
      await loadFiles();
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: err.message || "बॅकअप तयार करताना अडचण आली."
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
      title: "बॅकअप रिस्टोअर करायचा आहे का?",
      message: `'${file.name}' या फाईलमधून सर्व डेटा रिस्टोअर होईल. चालू इनव्हॉइसेस, आयटम्स आणि लेजर या बॅकअपमधील डेटाने अपडेट होतील.`,
      confirmText: "होय, रिस्टोअर करा",
      cancelText: "रद्द करा",
      variant: "danger"
    });

    if (!confirmed) return;

    setIsProcessingAction(true);
    setActionMessage(null);
    try {
      const result = await restoreAutomatedBackup(file.name);
      await showAlert({
        title: "रिस्टोअर यशस्वी!",
        message: result.message || `'${file.name}' मधून डेटा यशस्वीरीत्या रिस्टोअर झाला.`,
        variant: "success"
      });

      if (onRestoreSuccess) onRestoreSuccess();
      await loadFiles();
    } catch (err: any) {
      await showAlert({
        title: "रिस्टोअर अयशस्वी",
        message: err.message || "बॅकअप रिस्टोअर करताना अडचण आली.",
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
                0% Manual Intervention
              </span>
              <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full text-[10px] font-mono font-semibold">
                JSON Format
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              ऑटोमेटेड क्लाउड बॅकअप डेस्टिनेशन: <strong className="text-slate-800 font-mono">{TARGET_BACKUP_EMAIL}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-xs font-semibold inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pre-Authorized &amp; Active</span>
          </span>
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

      {/* Cloud Backup Automation Details Card */}
      <div className="p-4 bg-gradient-to-br from-slate-50 to-emerald-50/40 border border-emerald-200/70 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>100% स्वयंचलित क्लाउड बॅकअप (0% मॅन्युअल इंटरव्हेंशन)</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed max-w-2xl">
              सर्व इनव्हॉइसेस, आयटम्स, कस्टमर्स आणि व्यवहारांचा बॅकअप <strong>JSON फॉरमॅटमध्ये</strong> आपोआप{" "}
              <strong className="text-slate-900 font-mono">{TARGET_BACKUP_EMAIL}</strong> च्या गुगल ड्राईव्ह / क्लाउड व्हॉल्टमध्ये सेव्ह केला जात आहे.
              कुठल्याही मॅन्युअल ऑथरायझेशन किंवा पॉपअपची गरज नाही.
            </p>
          </div>

          <div className="shrink-0 bg-white px-3 py-2 border border-emerald-200 rounded-lg text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">बॅकअप फोल्डर</span>
            <span className="text-xs font-mono font-bold text-emerald-800">{BACKUP_FOLDER_NAME}</span>
          </div>
        </div>

        {/* Dynamic File Naming Rule Banner */}
        <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block flex items-center gap-1">
              <FileJson className="w-3.5 h-3.5 text-indigo-600" />
              <span>बॅकअप फाईल नेमिंग फॉरमॅट: [StoreName]_[Date]_[Time].json</span>
            </span>
            <p className="text-[11px] font-mono text-slate-800 font-semibold truncate">
              {sampleFileName}
            </p>
          </div>
          <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-mono rounded shrink-0">
            Store: {storeName}
          </span>
        </div>
      </div>

      {/* Auto-Backup Status & Control Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* Automatic Continuous Sync Toggle */}
        <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
          <div className="space-y-0.5">
            <label htmlFor="auto-backup-toggle" className="text-xs font-bold text-slate-800 block cursor-pointer">
              ऑटोमॅटिक क्लाउड सिंक (Automatic Sync)
            </label>
            <p className="text-[10px] text-slate-500">
              प्रत्येक नवीन बिल / बदल झाल्यावर आणि दर १५ मिनिटांनी आपोआप बॅकअप
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
              शेवटचा क्लाउड बॅकअप (Last Snapshot)
            </span>
            <span className="text-xs font-semibold text-slate-800 block truncate">
              {status.lastBackupTime ? formatDate(status.lastBackupTime) : "सध्या कोणताही बॅकअप नाही"}
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
                <span>सिंक होत आहे...</span>
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
              <span>बॅकअप सेव्ह होत आहे...</span>
            </>
          ) : (
            <>
              <CloudUpload className="w-4 h-4" />
              <span>आत्ता त्वरित बॅकअप सेव्ह करा (Instant Backup Now)</span>
            </>
          )}
        </button>

        <button
          id="gdrive-refresh-list-btn"
          type="button"
          onClick={loadFiles}
          disabled={isLoadingFiles}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-3 rounded-lg text-xs transition cursor-pointer flex items-center justify-center space-x-1.5"
          title="Refresh backups list"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? "animate-spin" : ""}`} />
          <span>रिफ्रेश यादी</span>
        </button>
      </div>

      {/* Automated Backups File History List */}
      <div className="pt-2 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <FolderLock className="w-3.5 h-3.5 text-emerald-600" />
            <span>क्लाउड बॅकअप इतिहास ({driveFiles.length} फाईल्स)</span>
          </span>
          <span className="text-[10px] text-slate-500">
            प्रत्येक फाईल: <strong className="font-mono text-slate-700">{storeName}_[Date]_[Time].json</strong>
          </span>
        </div>

        {isLoadingFiles ? (
          <div className="p-4 text-center text-slate-400 text-xs flex items-center justify-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
            <span>बॅकअप यादी लोड होत आहे...</span>
          </div>
        ) : driveFiles.length === 0 ? (
          <div className="p-5 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-500 space-y-2">
            <HardDrive className="w-6 h-6 text-slate-400 mx-auto" />
            <p>
              अद्याप कोणताही बॅकअप रेकॉर्ड झालेला नाही. वर दिलेल्या <strong>"आत्ता त्वरित बॅकअप सेव्ह करा"</strong> बटणावर क्लिक करा.
            </p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {driveFiles.map((file) => (
              <div key={file.id} className="p-2.5 hover:bg-slate-50 flex items-center justify-between text-xs transition">
                <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                  <FileJson className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="min-w-0 truncate">
                    <div className="font-bold text-slate-800 truncate font-mono text-[11px]">{file.name}</div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-2 flex-wrap">
                      <span>{formatDate(file.createdTime)}</span>
                      <span>•</span>
                      <span>{file.size || "—"}</span>
                      <span>•</span>
                      <span className="text-emerald-700 font-semibold">{file.account || TARGET_BACKUP_EMAIL}</span>
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
                    title="या बॅकअपमधून डेटा रिस्टोअर करा"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>रिस्टोअर (Restore)</span>
                  </button>

                  {/* Direct Download button */}
                  <button
                    type="button"
                    onClick={() => handleDownloadFile(file.name)}
                    disabled={isProcessingAction}
                    className="p-1.5 hover:bg-slate-200 text-slate-700 rounded transition cursor-pointer flex items-center gap-1 border border-slate-200 bg-white"
                    title="JSON फाईल डाऊनलोड करा"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span className="hidden sm:inline text-[10px] font-medium">डाऊनलोड</span>
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
