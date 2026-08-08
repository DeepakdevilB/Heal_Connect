'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert, UserX, CheckCircle, AlertTriangle, MessageSquare, Trash2, X
} from 'lucide-react';
import {
  AdminShell, StatCard, StatusBadge, Toast, Pagination, SkeletonRow
} from '@/components/admin-shell';
import { banApi } from '@/lib/adminApi';

const ADMIN_KEY = 'healconnect-admin-2026';

type FlaggedRecord = {
  id: string;
  source: string;
  contentSnippet: string;
  reason: string;
  status: string;
  userId: string | null;
  practitionerId: string | null;
  sessionId: string | null;
  createdAt: string;
  user?: { name: string; email: string };
  practitioner?: { name: string };
};

export default function AdminModerationPage() {
  const [flags, setFlags] = useState<FlaggedRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [banTarget, setBanTarget] = useState<{
    flagId: string; type: 'user' | 'practitioner'; id: string; name: string;
  } | null>(null);
  const [banDays, setBanDays] = useState('7');
  const [banReason, setBanReason] = useState('');
  const [banSubmitting, setBanSubmitting] = useState(false);

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/moderation?status=${statusFilter}`, {
        headers: { 'x-admin-key': ADMIN_KEY },
      }).then((r) => r.json());

      if (res.success && res.data) {
        setFlags(res.data.flagged || []);
      }
    } catch (err) {
      console.error('Failed to fetch flagged content:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/moderation/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': ADMIN_KEY,
        },
        body: JSON.stringify({ status: newStatus }),
      }).then((r) => r.json());

      if (res.success) {
        showToast(`Flag marked as ${newStatus}`);
        fetchFlags();
      } else {
        showToast(res.message || 'Failed to update', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('An error occurred', 'error');
    }
  };

  const openBanModal = (flag: FlaggedRecord) => {
    if (flag.userId) {
      setBanTarget({ flagId: flag.id, type: 'user', id: flag.userId, name: flag.user?.name || 'this user' });
    } else if (flag.practitionerId) {
      setBanTarget({ flagId: flag.id, type: 'practitioner', id: flag.practitionerId, name: flag.practitioner?.name || 'this expert' });
    } else {
      showToast('No user or expert linked to this flag', 'error');
      return;
    }
    setBanDays('7');
    setBanReason(flag.reason.replace(/_/g, ' '));
  };

  const handleConfirmBan = async () => {
    if (!banTarget) return;
    const days = banDays.trim() === '' ? null : Number(banDays);
    if (days !== null && (Number.isNaN(days) || days <= 0)) {
      showToast('Duration must be a positive number of days (or blank for permanent)', 'error');
      return;
    }
    setBanSubmitting(true);
    try {
      const res = banTarget.type === 'user'
        ? await banApi.banUser(banTarget.id, days, banReason || undefined)
        : await banApi.banPractitioner(banTarget.id, days, banReason || undefined);

      if (res.success) {
        showToast(`${banTarget.type === 'user' ? 'User' : 'Expert'} suspended${days ? ` for ${days} day(s)` : ' permanently'}`);
        // Mark the flag resolved since action has been taken
        await handleUpdateStatus(banTarget.flagId, 'RESOLVED');
        setBanTarget(null);
      } else {
        showToast(res.message || 'Failed to suspend', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('An error occurred', 'error');
    } finally {
      setBanSubmitting(false);
    }
  };

  const pendingCount = flags.filter(f => f.status === 'PENDING').length;

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Content Moderation</h1>
          <p className="text-gray-500 dark:text-gray-400">Review flagged content and take action</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Pending Flags" value={pendingCount} icon={AlertTriangle} color="red" />
          <StatCard label="Resolved Flags" value={flags.filter(f => f.status === 'RESOLVED').length} icon={CheckCircle} color="green" />
          <StatCard label="Dismissed" value={flags.filter(f => f.status === 'DISMISSED').length} icon={Trash2} color="gray" />
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 font-medium"
          >
            <option value="all">All Flags</option>
            <option value="PENDING">Pending</option>
            <option value="RESOLVED">Resolved</option>
            <option value="DISMISSED">Dismissed</option>
          </select>
        </div>

        {/* List */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
              <tr>
                {['Date', 'Reporter', 'Target', 'Reason', 'Snippet', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-extrabold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
              ) : flags.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-sm text-gray-400 font-medium">No flagged content found</td>
                </tr>
              ) : (
                flags.map((flag) => (
                  <tr key={flag.id} className="hover:bg-amber-50/30 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(flag.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-xs font-bold text-gray-900 dark:text-white">System Auto-Flag</td>
                    <td className="px-4 py-3">
                      {flag.user ? (
                        <div className="text-xs font-bold text-blue-600">User: {flag.user.name}</div>
                      ) : flag.practitioner ? (
                        <div className="text-xs font-bold text-purple-600">Expert: {flag.practitioner.name}</div>
                      ) : <span className="text-xs text-gray-500">Unknown</span>}
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-red-600">{flag.reason.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-xs italic text-gray-700 dark:text-gray-300 max-w-xs truncate">"{flag.contentSnippet}"</td>
                    <td className="px-4 py-3"><StatusBadge status={flag.status} /></td>
                    <td className="px-4 py-3 flex gap-2">
                      {flag.status === 'PENDING' && (
                        <>
                          {(flag.userId || flag.practitionerId) && (
                            <button
                              onClick={() => openBanModal(flag)}
                              className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                              title="Suspend account"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleUpdateStatus(flag.id, 'RESOLVED')}
                            className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100"
                            title="Resolve (Action Taken)"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(flag.id, 'DISMISSED')}
                            className="p-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100"
                            title="Dismiss (False Alarm)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {banTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-800 p-5 shadow-xl"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <UserX className="w-4 h-4 text-red-600" /> Suspend {banTarget.type === 'user' ? 'User' : 'Expert'}
              </h3>
              <button onClick={() => setBanTarget(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              This temporarily suspends <span className="font-bold">{banTarget.name}</span> from logging in. They can be unsuspended anytime from the {banTarget.type === 'user' ? 'Users' : 'Practitioners'} page.
            </p>

            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">Duration (days)</label>
            <input
              type="number"
              min={1}
              value={banDays}
              onChange={(e) => setBanDays(e.target.value)}
              placeholder="Leave blank for permanent"
              className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 text-sm"
            />

            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">Reason</label>
            <textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              rows={2}
              className="w-full mb-4 px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 text-sm"
            />

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setBanTarget(null)}
                className="px-4 py-2 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBan}
                disabled={banSubmitting}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {banSubmitting ? 'Suspending...' : 'Suspend'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AdminShell>
  );
}
