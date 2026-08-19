'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminShell } from '@/components/admin-shell';
import {
  Users,
  ShieldCheck,
  UserPlus,
  Trash2,
  RefreshCw,
  Copy,
  CheckCheck,
  X,
  Eye,
  EyeOff,
  Lock,
} from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  role: string;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  createdById: string | null;
}

function Badge({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider
      ${role === 'SUPERADMIN' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
      {role === 'SUPERADMIN' ? <ShieldCheck className="w-3 h-3" /> : <Users className="w-3 h-3" />}
      {role === 'SUPERADMIN' ? 'Superadmin' : 'Moderator'}
    </span>
  );
}

function MfaBadge({ enabled }: { enabled: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold
      ${enabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
      {enabled ? <Lock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
      {enabled ? 'MFA On' : 'No MFA'}
    </span>
  );
}

function fmt(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminAccountsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [myId, setMyId] = useState('');

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createRole, setCreateRole] = useState<'SUPERADMIN' | 'MODERATOR'>('MODERATOR');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [copied, setCopied] = useState(false);

  // Action state
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'delete' | 'reset-mfa' | null>(null);
  const [actionConfirm, setActionConfirm] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [adminRes, meRes] = await Promise.all([
        fetch('/api/admin-auth/admins', { credentials: 'same-origin' }),
        fetch('/api/admin/session', { credentials: 'same-origin' }),
      ]);
      const adminData = await adminRes.json() as { success: boolean; data?: AdminUser[]; message?: string };
      const meData = await meRes.json() as { id?: string };
      if (!adminData.success) { setError(adminData.message ?? 'Failed to load admins'); return; }
      setAdmins(adminData.data ?? []);
      setMyId(meData.id ?? '');
    } catch {
      setError('Failed to load admin accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchAdmins(); }, [fetchAdmins]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      const res = await fetch('/api/admin-auth/admins', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: createEmail, role: createRole }),
      });
      const data = await res.json() as { success: boolean; data?: { tempPassword: string }; message?: string };
      if (!res.ok || !data.success) { setCreateError(data.message ?? 'Failed to create admin'); return; }
      setTempPassword(data.data?.tempPassword ?? '');
      setCreateEmail('');
      void fetchAdmins();
    } catch {
      setCreateError('Network error. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const copyPassword = () => {
    void navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAction = async () => {
    if (!actionId || !actionType) return;
    setActionLoading(true);
    try {
      const url = actionType === 'delete'
        ? `/api/admin-auth/admins/${actionId}`
        : `/api/admin-auth/admins/${actionId}/reset-mfa`;
      const res = await fetch(url, {
        method: actionType === 'delete' ? 'DELETE' : 'POST',
        credentials: 'same-origin',
      });
      const data = await res.json() as { success: boolean; message?: string };
      if (!data.success) { setError(data.message ?? 'Action failed'); }
      setActionId(null);
      setActionType(null);
      setActionConfirm('');
      void fetchAdmins();
    } catch {
      setError('Network error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-white mb-1 flex items-center gap-3">
              <ShieldCheck className="w-7 h-7 text-amber-400" />
              Admin Accounts
            </h1>
            <p className="text-white/50 text-sm">Manage admin users, roles, and MFA settings</p>
          </div>
          <button
            onClick={() => { setShowCreate(true); setTempPassword(''); setCreateEmail(''); setCreateError(''); }}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold px-5 py-2.5 rounded-2xl shadow-lg shadow-amber-500/30 transition-all"
          >
            <UserPlus className="w-4 h-4" /> Create Admin
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-2xl text-sm font-medium">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
            </div>
          ) : admins.length === 0 ? (
            <div className="text-center py-16 text-white/40">No admin accounts found</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-6 py-4 text-xs font-extrabold uppercase tracking-wider text-white/50">Email</th>
                  <th className="text-left px-6 py-4 text-xs font-extrabold uppercase tracking-wider text-white/50">Role</th>
                  <th className="text-left px-6 py-4 text-xs font-extrabold uppercase tracking-wider text-white/50">MFA</th>
                  <th className="text-left px-6 py-4 text-xs font-extrabold uppercase tracking-wider text-white/50">Last Login</th>
                  <th className="text-left px-6 py-4 text-xs font-extrabold uppercase tracking-wider text-white/50">Created</th>
                  <th className="text-right px-6 py-4 text-xs font-extrabold uppercase tracking-wider text-white/50">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-white font-semibold text-sm">{admin.email}</span>
                      {admin.id === myId && <span className="ml-2 text-amber-400 text-xs">(you)</span>}
                    </td>
                    <td className="px-6 py-4"><Badge role={admin.role} /></td>
                    <td className="px-6 py-4"><MfaBadge enabled={admin.mfaEnabled} /></td>
                    <td className="px-6 py-4 text-white/50 text-xs">{fmt(admin.lastLoginAt)}</td>
                    <td className="px-6 py-4 text-white/50 text-xs">{fmt(admin.createdAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {admin.mfaEnabled && (
                          <button
                            title="Reset MFA"
                            onClick={() => { setActionId(admin.id); setActionType('reset-mfa'); setActionConfirm(''); }}
                            className="p-2 rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 transition-colors"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {admin.id !== myId && (
                          <button
                            title="Revoke account"
                            onClick={() => { setActionId(admin.id); setActionType('delete'); setActionConfirm(''); }}
                            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create admin modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl">
            {tempPassword ? (
              <div className="text-center space-y-5">
                <CheckCheck className="w-12 h-12 text-green-400 mx-auto" />
                <h2 className="text-xl font-black text-white">Admin Created</h2>
                <p className="text-white/60 text-sm">Copy the temporary password now — it won&apos;t be shown again.</p>
                <div className="bg-black/40 border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3">
                  <code className="text-amber-400 font-mono text-sm flex-1 break-all">{tempPassword}</code>
                  <button onClick={copyPassword} className="text-white/50 hover:text-white transition-colors flex-shrink-0">
                    {copied ? <CheckCheck className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-white/40 text-xs">The new admin will be prompted to set up MFA on first login (if SUPERADMIN).</p>
                <button onClick={() => setShowCreate(false)} className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-2xl transition-colors">
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black text-white">Create Admin</h2>
                  <button type="button" onClick={() => setShowCreate(false)} className="text-white/40 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                </div>

                <div>
                  <label className="text-xs font-extrabold uppercase tracking-wider text-white/60 mb-1.5 block">Email</label>
                  <input
                    type="email" required
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    placeholder="newadmin@healconnect.com"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/30 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold uppercase tracking-wider text-white/60 mb-1.5 block">Role</label>
                  <select
                    value={createRole}
                    onChange={(e) => setCreateRole(e.target.value as 'SUPERADMIN' | 'MODERATOR')}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/50 appearance-none"
                  >
                    <option value="MODERATOR" className="bg-slate-900">Moderator</option>
                    <option value="SUPERADMIN" className="bg-slate-900">Superadmin</option>
                  </select>
                </div>

                {createError && <div className="text-red-400 text-xs font-semibold bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-2xl">{createError}</div>}

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-60 text-white font-extrabold py-4 rounded-2xl transition-all"
                >
                  {creating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><UserPlus className="w-4 h-4" /> Create</>}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Confirm action modal */}
      {actionId && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-2xl space-y-5">
            <div className="text-center">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${actionType === 'delete' ? 'bg-red-500/20' : 'bg-yellow-500/20'}`}>
                {actionType === 'delete' ? <Trash2 className="w-6 h-6 text-red-400" /> : <Lock className="w-6 h-6 text-yellow-400" />}
              </div>
              <h3 className="text-lg font-black text-white mb-2">
                {actionType === 'delete' ? 'Revoke admin access?' : 'Reset MFA?'}
              </h3>
              <p className="text-white/50 text-sm">
                {actionType === 'delete'
                  ? 'This admin will immediately lose all access. This cannot be undone.'
                  : 'The admin will need to set up TOTP again on their next login.'}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setActionId(null); setActionType(null); }} className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-2xl transition-colors">
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={actionLoading}
                className={`flex-1 font-bold py-3 rounded-2xl transition-colors ${actionType === 'delete' ? 'bg-red-500 hover:bg-red-600' : 'bg-yellow-500 hover:bg-yellow-600'} text-white`}
              >
                {actionLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
