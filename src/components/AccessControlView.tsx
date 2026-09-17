/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { UserAccount, UserPermissions } from "../types.js";
import {
  ShieldCheck,
  UserPlus,
  Trash2,
  Lock,
  UserCheck,
  Key,
  Shield,
  Fingerprint,
  RefreshCw,
  AlertTriangle,
  Sliders,
  Check,
  Save,
  CheckCircle2,
  XSquare
} from "lucide-react";

interface AccessControlViewProps {
  activeSession: { username: string; name: string; role: string; token: string; permissions?: any } | null;
  onUpdateSession?: (session: any) => void;
}

const MODULE_KEYS = [
  { id: "dashboard", label: "Dashboard Overview", desc: "Interactive charts, low stock visual metrics, and daily turnover totals." },
  { id: "parties", label: "Parties (Ledger Accounts)", desc: "Register clients/suppliers, outstanding books, state logs and supplier routes." },
  { id: "items", label: "Items (Stock Catalog)", desc: "Maintain inventory records, update barcodes, buy/sell rates, units and taxation." },
  { id: "sales", label: "Sales & GST Invoices", desc: "Create sales, returns, and print GST invoices in A4, A5, and Thermal layouts." },
  { id: "purchases", label: "Purchases (Bills)", desc: "Draft procurement listings, purchase logs, and incoming inventory audits." },
  { id: "transactions", label: "Incomes & Expenses Logs", desc: "File daily business operations, workspace expenditures, wages and utility charges." },
  { id: "reports", label: "Tax & Financial Reports", desc: "Breakdown of ledger audits, tax sheets, state supply breakdowns, and HSN-wise sums." },
  { id: "access_control", label: "User Access Control", desc: "Set administrative logins, manage operator identities, and edit modular checkboxes." },
  { id: "settings", label: "Business Settings & DB", desc: "Modify local business profile, company signatures, and trigger database backups." }
];

export default function AccessControlView({ activeSession, onUpdateSession }: AccessControlViewProps) {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form Fields for constructing a brand-new user account
  const [newUsername, setNewUsername] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("staff"); // default is staff role
  const [isAddingUser, setIsAddingUser] = useState(false);

  // States for the Granular Permissions Grid Matrix Editor
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<any>(null);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

  const defaultPerms = (role: string) => {
    const isElevated = role === "owner" || role === "admin" || role === "manager";
    return {
      dashboard: { view: true, create: isElevated, update: isElevated, delete: isElevated },
      parties: { view: true, create: true, update: true, delete: isElevated },
      items: { view: true, create: true, update: true, delete: isElevated },
      sales: { view: true, create: true, update: true, delete: isElevated },
      purchases: { view: true, create: true, update: true, delete: isElevated },
      transactions: { view: true, create: true, update: true, delete: isElevated },
      reports: { view: isElevated, create: isElevated, update: isElevated, delete: isElevated },
      access_control: { view: isElevated, create: isElevated, update: isElevated, delete: isElevated },
      settings: { view: isElevated, create: isElevated, update: isElevated, delete: isElevated }
    };
  };

  // Fetch all users list
  const fetchUsers = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) {
        throw new Error("Unable to retrieve user directory from the server.");
      }
      const data = await res.json();
      setUsers(data);
      
      // Auto-update selectedUser details in permission card if currently selected exists
      if (selectedUser) {
        const currentUpdated = data.find((usr: UserAccount) => usr.username === selectedUser.username);
        if (currentUpdated) {
          setSelectedUser(currentUpdated);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load access directory.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handle adding new user under administrative control
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedUser = newUsername.trim().toLowerCase();
    const trimmedName = newName.trim();
    const trimmedPass = newPassword.trim();

    if (!trimmedUser || !trimmedName || !trimmedPass) {
      setErrorMessage("Please complete all fields to establish a user account.");
      return;
    }

    setIsAddingUser(true);
    try {
      const startPerms = defaultPerms(newRole);
      
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: trimmedUser,
          name: trimmedName,
          password: trimmedPass,
          role: newRole,
          permissions: startPerms
        })
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to create user account.");
      }

      setSuccessMessage(`Access granted for user "${trimmedUser}" successfully.`);
      setNewUsername("");
      setNewName("");
      setNewPassword("");
      setNewRole("staff");
      
      // Select the newly added user automatically so admin can immediately tweak permissions if desired!
      if (result.user) {
        handleSelectUserForPermissions(result.user);
      }
      
      fetchUsers();

      setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);
    } catch (err: any) {
      setErrorMessage(err.message || "Can't register user.");
    } finally {
      setIsAddingUser(false);
    }
  };

  // Toggle user permissions / key role
  const handleToggleRole = async (targetUsername: string, currentRole: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (targetUsername.toLowerCase() === "admin") {
      setErrorMessage("Primary 'admin' role permissions cannot be altered.");
      return;
    }

    const nextRole = currentRole === "owner" ? "staff" : "owner";
    const nextPerms = defaultPerms(nextRole);

    try {
      const res = await fetch(`/api/users/${encodeURIComponent(targetUsername)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          role: nextRole,
          permissions: nextPerms
        })
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to change role.");
      }

      setSuccessMessage(`Permissions changed to ${nextRole.toUpperCase()} for ${targetUsername}`);
      
      // Sync detailed permit state of selected user if applicable
      if (selectedUser && selectedUser.username === targetUsername) {
        setSelectedUser(result.user);
        setEditingPermissions(nextPerms);
      }
      
      fetchUsers();

      setTimeout(() => {
        setSuccessMessage(null);
      }, 3500);
    } catch (err: any) {
      setErrorMessage(err.message || "Could not assign role.");
    }
  };

  // Revoke Access completely (Delete user)
  const handleRevokeAccess = async (targetUsername: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const checkUser = targetUsername.toLowerCase();
    if (checkUser === "admin") {
      setErrorMessage("The primary 'admin' account cannot be deleted or revoked.");
      return;
    }

    if (checkUser === activeSession?.username?.toLowerCase()) {
      setErrorMessage("You cannot revoke your own active login session.");
      return;
    }

    if (!confirm(`Are you sure you want to permanently revoke all ledger billing access for user "${targetUsername}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${encodeURIComponent(targetUsername)}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || "Failed to delete user profile.");
      }

      setSuccessMessage(`Access revoked for "${targetUsername}".`);
      
      if (selectedUser && selectedUser.username === targetUsername) {
        setSelectedUser(null);
        setEditingPermissions(null);
      }

      fetchUsers();

      setTimeout(() => {
        setSuccessMessage(null);
      }, 3500);
    } catch (err: any) {
      setErrorMessage(err.message || "Could not delete user.");
    }
  };

  // Load selected user block for detailed editing matrix
  const handleSelectUserForPermissions = (u: UserAccount) => {
    setSelectedUser(u);
    const existingPerms = u.permissions || defaultPerms(u.role);
    // Hard deep copy to avoid direct mutations
    setEditingPermissions(JSON.parse(JSON.stringify(existingPerms)));
  };

  // Handle specific checkbox changes (module + action)
  const handleActionCheckboxChange = (modId: string, action: "view" | "create" | "update" | "delete", checked: boolean) => {
    if (!editingPermissions) return;
    
    // Ensure nested module block exists
    const updatedPerms = { ...editingPermissions };
    if (!updatedPerms[modId]) {
      updatedPerms[modId] = { view: false, create: false, update: false, delete: false };
    }
    
    updatedPerms[modId][action] = checked;
    
    // Auto-enable 'view' if create, update, or delete are checked, as view is a prerequisite
    if (checked && action !== "view") {
      updatedPerms[modId].view = true;
    }
    
    // If 'view' becomes false, auto-disable actions as they depend on view
    if (!checked && action === "view") {
      updatedPerms[modId].create = false;
      updatedPerms[modId].update = false;
      updatedPerms[modId].delete = false;
    }
    
    setEditingPermissions(updatedPerms);
  };

  // Preset utilities to improve speed
  const setPresetPermissions = (type: "full" | "read_only" | "reset") => {
    if (!editingPermissions || !selectedUser) return;
    
    let nextPerms: any = {};
    if (type === "full") {
      MODULE_KEYS.forEach((m) => {
        nextPerms[m.id] = { view: true, create: true, update: true, delete: true };
      });
    } else if (type === "read_only") {
      MODULE_KEYS.forEach((m) => {
        nextPerms[m.id] = { view: true, create: false, update: false, delete: false };
      });
    } else {
      nextPerms = defaultPerms(selectedUser.role);
    }
    setEditingPermissions(nextPerms);
  };

  // Commit and save custom fine-grained permissions to database state
  const handleSaveFineGrainedPermissions = async () => {
    if (!selectedUser || !editingPermissions) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSavingPermissions(true);

    try {
      const res = await fetch(`/api/users/${encodeURIComponent(selectedUser.username)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permissions: editingPermissions
        })
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to commit permissions onto database.");
      }

      setSuccessMessage(`Detailed permissions successfully configured and loaded for ${selectedUser.username}!`);
      
      // If we committed edits on ourselves, immediately notify core app session
      if (selectedUser.username.toLowerCase() === activeSession?.username?.toLowerCase() && onUpdateSession) {
        onUpdateSession({
          ...activeSession,
          permissions: editingPermissions
        });
      }

      // Reload users from backend
      fetchUsers();

      setTimeout(() => {
        setSuccessMessage(null);
      }, 3500);

    } catch (err: any) {
      setErrorMessage(err.message || "Failed to finalize permissions.");
    } finally {
      setIsSavingPermissions(false);
    }
  };

  return (
    <div id="v-access-control-module" className="space-y-6">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold font-sans text-slate-900 tracking-tight flex items-center space-x-2">
            <Fingerprint className="w-6 h-6 text-emerald-600" />
            <span>Store Access Control & Detailed Permissions</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Securely maintain store operator logins, assign administrative rights, or customize fine-grained module-by-module checkboxes.
          </p>
        </div>
        
        <button
          id="access-refresh-btn"
          onClick={fetchUsers}
          disabled={isLoading}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 disabled:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer select-none transition shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh registry</span>
        </button>
      </div>

      {errorMessage && (
        <div id="access-error-banner" className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold leading-relaxed flex items-start space-x-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div id="access-success-banner" className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold leading-relaxed flex items-start space-x-2.5">
          <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Grid panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Create new store user: Form panel */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-1.5 pb-2.5 border-b border-slate-100 text-slate-800">
            <UserPlus className="w-4.5 h-4.5 text-emerald-600" />
            <h3 className="font-bold text-sm tracking-tight">Create Store User Account</h3>
          </div>

          <form onSubmit={handleAddUser} className="space-y-4 font-sans">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5 font-mono">Full Operator Name</label>
              <input
                id="access-new-name"
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Associate Manager"
                className="w-full px-3 py-2 border border-slate-200 focus:border-indigo-500 rounded-lg text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5 font-mono">Unique Login Username</label>
              <input
                id="access-new-user"
                type="text"
                required
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="e.g. staff_billing"
                className="w-full px-3 py-2 border border-slate-200 focus:border-indigo-500 rounded-lg text-xs outline-none font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5 font-mono">Secured Entry Password</label>
              <input
                id="access-new-password"
                type="text"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="e.g. pass123"
                className="w-full px-3 py-2 border border-slate-200 focus:border-indigo-500 rounded-lg text-xs outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5 font-mono">Access Level / Role Authority</label>
              <select
                id="access-new-role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 focus:border-indigo-500 rounded-lg text-xs outline-none bg-slate-50 font-semibold"
              >
                <option value="staff">Staff Access (Defaults to read/create/edit)</option>
                <option value="owner">Owner Admin (Full Ledger & access management)</option>
              </select>
            </div>

            <div className="pt-2">
              <button
                id="access-submit-user-btn"
                type="submit"
                disabled={isAddingUser}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-3 rounded-lg text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isAddingUser ? "Creating Account..." : "Authorize New Account"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Existing users directory: List table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-slate-800">
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" />
              <h3 className="font-bold text-sm tracking-tight">Active Accounts Registry ({users.length})</h3>
            </div>
            <span className="text-[10px] font-semibold text-slate-400 italic">Select user below to edit checkboxes</span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-150 select-none">
                  <th className="py-2.5 px-4 font-bold text-[10px] uppercase tracking-wide">Operator Profile</th>
                  <th className="py-2.5 px-4 font-bold text-[10px] uppercase tracking-wide font-mono">Username</th>
                  <th className="py-2.5 px-4 font-bold text-[10px] uppercase tracking-wide font-mono">Password Hint</th>
                  <th className="py-2.5 px-4 font-bold text-[10px] uppercase tracking-wide">Privilege Role</th>
                  <th className="py-2.5 px-4 text-center font-bold text-[10px] uppercase tracking-wide">Operation Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isActiveSelf = u.username.toLowerCase() === activeSession?.username?.toLowerCase();
                  const isCurrentlyEdited = selectedUser && selectedUser.username === u.username;
                  
                  return (
                    <tr 
                      key={u.username} 
                      className={`transition-colors duration-150 cursor-pointer ${
                        isCurrentlyEdited ? "bg-emerald-50/80 hover:bg-emerald-50" : "hover:bg-slate-50/50"
                      }`}
                      onClick={() => u.username.toLowerCase() !== "admin" && handleSelectUserForPermissions(u)}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            u.role === "owner" ? "bg-amber-100 text-amber-800" : "bg-teal-100 text-teal-800"
                          }`}>
                            {u.name?.charAt(0).toUpperCase() || u.username?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 block leading-snug">{u.name}</span>
                            {isActiveSelf && (
                              <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md font-mono mt-0.5 inline-block font-bold">Active (You)</span>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100/70 px-1.5 py-0.5 rounded-lg border border-slate-150 text-[11px]">{u.username}</span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-500">
                        {u.passwordHash || "••••••••"}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase font-mono ${
                          u.role === "owner" 
                            ? "bg-amber-50 text-amber-700 border border-amber-250/20" 
                            : u.role === "admin"
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-250/20"
                              : "bg-teal-50 text-teal-700 border border-teal-250/20"
                        }`}>
                          {u.role}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          
                          {/* Configure detailed user permissions */}
                          {u.username.toLowerCase() !== "admin" && (
                            <button
                              onClick={() => handleSelectUserForPermissions(u)}
                              title="Tune Detailed Permissions Matrix"
                              className={`p-1.5 border rounded-lg transition cursor-pointer ${
                                isCurrentlyEdited
                                  ? "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700"
                                  : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-emerald-600"
                              }`}
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Toggle access role privilege */}
                          {u.username.toLowerCase() !== "admin" && (
                            <button
                              onClick={() => handleToggleRole(u.username, u.role)}
                              title="Toggle Access Rights Level (Owner vs Staff)"
                              className="p-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-indigo-600 rounded-lg transition cursor-pointer"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                            </button>
                          )}
                          
                          {/* Revoke complete access (Delete) */}
                          {u.username.toLowerCase() !== "admin" && !isActiveSelf && (
                            <button
                              onClick={() => handleRevokeAccess(u.username)}
                              title="Revoke All Access For User"
                              className="p-1.5 border border-slate-200 bg-rose-50/50 hover:bg-rose-50 text-slate-405 hover:text-rose-600 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {u.username.toLowerCase() === "admin" && (
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Master</span>
                          )}

                          {isActiveSelf && u.username.toLowerCase() !== "admin" && (
                            <span className="text-[10px] text-slate-400 font-semibold italic">Identity Lock</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* DETAILED PERMISSIONS CHECKBOX MATRIX COMPONENT */}
      {selectedUser && editingPermissions ? (
        <div id="v-detailed-permissions-panel" className="bg-white border-2 border-emerald-500/20 rounded-2xl p-6 shadow-md mt-6 space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
            <div className="flex items-start space-x-3">
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
                <Sliders className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
                  <span>Fine-Grained Permissions Manager</span>
                  <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold font-mono">@{selectedUser.username}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Adjust custom, modular access values for <span className="font-bold text-slate-700">{selectedUser.name}</span>. Toggle view, create, edit, or delete controls below.
                </p>
              </div>
            </div>

            {/* Presets and utilities buttons */}
            <div className="flex items-center flex-wrap gap-2 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">Presets:</span>
              <button
                type="button"
                onClick={() => setPresetPermissions("full")}
                className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100 rounded border border-indigo-250 transition cursor-pointer"
              >
                Full Access
              </button>
              <button
                type="button"
                onClick={() => setPresetPermissions("read_only")}
                className="px-2.5 py-1 bg-slate-50 text-slate-700 font-semibold hover:bg-slate-150 rounded border border-slate-200 transition cursor-pointer"
              >
                Read-Only (Viewer)
              </button>
              <button
                type="button"
                onClick={() => setPresetPermissions("reset")}
                className="px-2.5 py-1 bg-amber-50 text-amber-800 font-semibold hover:bg-amber-100 rounded border border-amber-200 transition cursor-pointer"
              >
                Reset Default {selectedUser.role.toUpperCase()}
              </button>
            </div>
          </div>

          {/* Granular Checkbox Matrix Row-by-Row Table */}
          <div className="border border-slate-150 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-150 select-none">
                  <th className="py-3 px-4 font-bold text-[10px] uppercase tracking-wide w-1/3">Target Module Name</th>
                  <th className="py-3 px-4 font-bold text-[10px] uppercase tracking-wide text-center">View (Access Area)</th>
                  <th className="py-3 px-4 font-bold text-[10px] uppercase tracking-wide text-center">Create (Add/Draft)</th>
                  <th className="py-3 px-4 font-bold text-[10px] uppercase tracking-wide text-center">Update (Edit/Adjust)</th>
                  <th className="py-3 px-4 font-bold text-[10px] uppercase tracking-wide text-center">Delete (Revoke/Wipe)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {MODULE_KEYS.map((m) => {
                  const modPerms = editingPermissions[m.id] || { view: false, create: false, update: false, delete: false };
                  
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-4 px-4">
                        <span className="font-bold text-slate-800 block text-xs">{m.label}</span>
                        <span className="text-[10px] text-slate-400 mt-0.5 block leading-normal">{m.desc}</span>
                      </td>

                      {/* View Checkbox cell */}
                      <td className="py-4 px-4 text-center">
                        <label className="inline-flex items-center justify-center p-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={modPerms.view}
                            onChange={(e) => handleActionCheckboxChange(m.id, "view", e.target.checked)}
                            className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                          />
                        </label>
                      </td>

                      {/* Create Checkbox cell */}
                      <td className="py-4 px-4 text-center">
                        <label className="inline-flex items-center justify-center p-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={modPerms.create}
                            disabled={!modPerms.view}
                            onChange={(e) => handleActionCheckboxChange(m.id, "create", e.target.checked)}
                            className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                          />
                        </label>
                      </td>

                      {/* Update Checkbox cell */}
                      <td className="py-4 px-4 text-center">
                        <label className="inline-flex items-center justify-center p-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={modPerms.update}
                            disabled={!modPerms.view}
                            onChange={(e) => handleActionCheckboxChange(m.id, "update", e.target.checked)}
                            className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                          />
                        </label>
                      </td>

                      {/* Delete Checkbox cell */}
                      <td className="py-4 px-4 text-center">
                        <label className="inline-flex items-center justify-center p-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={modPerms.delete}
                            disabled={!modPerms.view}
                            onChange={(e) => handleActionCheckboxChange(m.id, "delete", e.target.checked)}
                            className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                          />
                        </label>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Action Trigger Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => { setSelectedUser(null); setEditingPermissions(null); }}
              className="px-4 py-2 border border-slate-205 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg text-xs font-bold font-sans transition cursor-pointer select-none"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveFineGrainedPermissions}
              disabled={isSavingPermissions}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 px-5 rounded-lg text-xs tracking-wider uppercase shadow-sm transition duration-150 cursor-pointer disabled:bg-slate-100"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingPermissions ? "Saving Settings..." : "Save Module Checkboxes"}</span>
            </button>
          </div>

        </div>
      ) : (
        <div className="p-10 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-2 select-none bg-slate-50/50">
          <Sliders className="w-8 h-8 text-slate-300 mx-auto" />
          <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Detailed Matrix Blueprint Closed</h4>
          <p className="text-[10.5px] text-slate-450 max-w-xs mx-auto">
            Click on the sliders adjustments button ( <Sliders className="w-3 h-3 inline text-emerald-600 mx-0.5" /> ) next to any non-admin account in the registry above to customize detailed permission checkboxes explicitly.
          </p>
        </div>
      )}

    </div>
  );
}
