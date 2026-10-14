/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Lock,
  User,
  KeyRound,
  Store,
  ChevronRight,
  UserPlus,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  RotateCw
} from "lucide-react";

interface LoginViewProps {
  onLoginSuccess: (session: { username: string; name: string; role: string; token: string }) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setErrorMsg("All credential fields are required.");
      return;
    }

    if (isRegisterMode && !fullName.trim()) {
      setErrorMsg("Please provide your full name for registration.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isRegisterMode) {
        // Register route
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: trimmedUser,
            password: trimmedPass,
            name: fullName.trim()
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to finalize registration.");
        }

        setSuccessMsg("Registration successful! You can now log in using your newly created credentials.");
        setIsRegisterMode(false);
        setPassword("");
      } else {
        // Login route
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: trimmedUser,
            password: trimmedPass
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Invalid login credentials.");
        }

        // Emit local token storage and pass to React state
        localStorage.setItem("billingonhand_session", JSON.stringify(data));
        localStorage.setItem("vyapaar_session", JSON.stringify(data));
        onLoginSuccess(data);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Communication failure. Check server connectivity.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="auth-gate-canvas" className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      
      {/* Decorative vector overlays */}
      <div className="absolute top-0 left-0 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl translate-x-1/3 translate-y-1/3" />

      {/* Main card */}
      <div id="auth-card-panel" className="w-full max-w-sm bg-white border border-slate-200/90 rounded-3xl p-8 shadow-xl relative z-10 transition duration-300">
        
        {/* LOGO Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 mb-4 shadow-sm animate-fadeIn">
            <Store className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 font-sans">Billing On Hand</h1>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-sans">
            VAT & GST Compliant Store Point-of-Sale, Stock Ledger, and Financial Accounting Suite
          </p>
        </div>

        {/* Notices */}
        {errorMsg && (
          <div id="auth-error-alert" className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div id="auth-success-alert" className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-start space-x-2.5">
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5 font-mono">Administrative Username</label>
            <div className="relative">
              <input
                id="auth-input-username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs py-2.5 pl-9 pr-3 text-slate-900 placeholder-slate-400 outline-none transition font-mono font-bold"
              />
              <KeyRound className="w-4 h-4 text-slate-450 absolute left-3 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5 font-mono">Secured Access Password</label>
            <div className="relative">
              <input
                id="auth-input-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs py-2.5 pl-9 pr-3 text-slate-900 placeholder-slate-400 outline-none transition font-mono"
              />
              <Lock className="w-4 h-4 text-slate-450 absolute left-3 top-3.5" />
            </div>
          </div>

          <button
            id="auth-submit-btn"
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold py-3 px-4 rounded-xl text-xs tracking-wider uppercase shadow-md shadow-indigo-150 hover:shadow-indigo-200 transition duration-200 cursor-pointer flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin text-white" />
                <span>Processing Security Handshake...</span>
              </>
            ) : (
              <>
                <span>Login To Store Ledgers</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>

        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center text-center text-xs text-slate-450 font-mono">
          <span>Active Session SSL-Secured</span>
        </div>

      </div>

    </div>
  );
}
