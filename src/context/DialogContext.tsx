import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { AlertTriangle, Info, CheckCircle2, HelpCircle, X } from "lucide-react";

export type DialogVariant = "danger" | "warning" | "info" | "success";

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
}

export interface AlertOptions {
  title?: string;
  message: string;
  okText?: string;
  variant?: DialogVariant;
}

interface DialogContextValue {
  showConfirm: (options: ConfirmOptions | string) => Promise<boolean>;
  showAlert: (options: AlertOptions | string) => Promise<void>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialog(): DialogContextValue {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useDialog must be used within a DialogProvider");
  }
  return context;
}

interface DialogState {
  isOpen: boolean;
  type: "confirm" | "alert";
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  variant: DialogVariant;
  resolve: ((val: boolean) => void) | null;
}

const initialDialogState: DialogState = {
  isOpen: false,
  type: "confirm",
  title: "",
  message: "",
  confirmText: "Yes, Continue",
  cancelText: "Cancel",
  variant: "warning",
  resolve: null
};

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dialog, setDialog] = useState<DialogState>(initialDialogState);

  const showConfirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    return new Promise((resolve) => {
      const opts: ConfirmOptions = typeof options === "string" ? { message: options } : options;
      setDialog({
        isOpen: true,
        type: "confirm",
        title: opts.title || "Confirm Action",
        message: opts.message,
        confirmText: opts.confirmText || "Yes, Confirm",
        cancelText: opts.cancelText || "Cancel",
        variant: opts.variant || "danger",
        resolve: (confirmed: boolean) => {
          resolve(confirmed);
        }
      });
    });
  }, []);

  const showAlert = useCallback((options: AlertOptions | string): Promise<void> => {
    return new Promise((resolve) => {
      const opts: AlertOptions = typeof options === "string" ? { message: options } : options;
      setDialog({
        isOpen: true,
        type: "alert",
        title: opts.title || "Notice",
        message: opts.message,
        confirmText: opts.okText || "OK",
        cancelText: "",
        variant: opts.variant || "info",
        resolve: () => {
          resolve();
        }
      });
    });
  }, []);

  const handleClose = (confirmed: boolean) => {
    if (dialog.resolve) {
      dialog.resolve(confirmed);
    }
    setDialog(prev => ({ ...prev, isOpen: false, resolve: null }));
  };

  const getVariantStyles = (variant: DialogVariant) => {
    switch (variant) {
      case "danger":
        return {
          icon: AlertTriangle,
          iconBg: "bg-rose-100 text-rose-600 border border-rose-200",
          btnColor: "bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500",
          borderColor: "border-rose-100"
        };
      case "warning":
        return {
          icon: AlertTriangle,
          iconBg: "bg-amber-100 text-amber-600 border border-amber-200",
          btnColor: "bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500",
          borderColor: "border-amber-100"
        };
      case "success":
        return {
          icon: CheckCircle2,
          iconBg: "bg-emerald-100 text-emerald-600 border border-emerald-200",
          btnColor: "bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500",
          borderColor: "border-emerald-100"
        };
      case "info":
      default:
        return {
          icon: Info,
          iconBg: "bg-blue-100 text-blue-600 border border-blue-200",
          btnColor: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500",
          borderColor: "border-blue-100"
        };
    }
  };

  const currentStyles = getVariantStyles(dialog.variant);
  const IconComponent = currentStyles.icon;

  return (
    <DialogContext.Provider value={{ showConfirm, showAlert }}>
      {children}

      {/* In-App Non-Blocking Modal (replaces browser window.alert & window.confirm) */}
      {dialog.isOpen && (
        <div
          id="in-app-dialog-backdrop"
          className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto animate-fade-in select-none"
          onClick={() => {
            // Clicking backdrop cancels confirm or closes alert
            handleClose(false);
          }}
        >
          <div
            id="in-app-dialog-container"
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden transform transition-all animate-scale-up"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                handleClose(false);
              }
            }}
            tabIndex={-1}
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${currentStyles.iconBg}`}>
                  <IconComponent className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 id="in-app-dialog-title" className="text-lg font-bold text-slate-900 leading-snug">
                    {dialog.title}
                  </h3>
                  <div id="in-app-dialog-message" className="mt-2 text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                    {dialog.message}
                  </div>
                </div>
                <button
                  type="button"
                  id="in-app-dialog-close-btn"
                  onClick={() => handleClose(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex items-center justify-end gap-3">
                {dialog.type === "confirm" && (
                  <button
                    type="button"
                    id="in-app-dialog-cancel-btn"
                    onClick={() => handleClose(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-medium text-sm transition shadow-xs focus:outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    {dialog.cancelText}
                  </button>
                )}
                <button
                  type="button"
                  id="in-app-dialog-confirm-btn"
                  autoFocus
                  onClick={() => handleClose(true)}
                  className={`px-5 py-2.5 rounded-xl font-medium text-sm transition shadow-sm focus:outline-none focus:ring-2 ${currentStyles.btnColor}`}
                >
                  {dialog.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
};
