'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert, UserX, CheckCircle, AlertTriangle, MessageSquare, Trash2
} from 'lucide-react';
import {
  AdminShell, StatCard, StatusBadge, Toast, Pagination, SkeletonRow
} from '@/components/admin-shell';

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
    </AdminShell>
  );
}
