import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[Billing On Hand UI Error]", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetSession = () => {
    try {
      localStorage.removeItem("billingonhand_session");
      localStorage.removeItem("vyapaar_session");
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          id="app-error-boundary-fallback"
          className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-slate-100 font-sans"
        >
          <div className="max-w-md w-full bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-2xl text-center">
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center mx-auto mb-4 text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h2 className="text-lg font-bold text-slate-100 mb-1">
              Billing On Hand Interface Recovery
            </h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              A temporary display issue occurred while rendering the workspace. Your billing data and inventory files are 100% safe on disk.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-sm transition cursor-pointer gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Application
              </button>

              <button
                type="button"
                onClick={this.handleResetSession}
                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-xs rounded-xl transition cursor-pointer gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset Session & Retry
              </button>
            </div>

            {this.state.error && (
              <details className="mt-4 text-left text-[11px] text-slate-400 bg-slate-950/60 p-3 rounded-lg border border-slate-800 overflow-auto max-h-36 font-mono">
                <summary className="cursor-pointer text-amber-400 font-medium mb-1">
                  Technical Details
                </summary>
                <p className="text-rose-400 font-semibold mb-1">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="text-[10px] text-slate-500 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
