'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarClock, MessageSquare, Video, Phone,
  AlertCircle, CheckCircle, Activity, Wallet,
  UserCheck, Eye, Flag, RefreshCw, X, ChevronDown,
} from 'lucide-react';
import {
  AdminShell, StatCard, StatusBadge, SearchBar,
  ConfirmDialog, Toast, Pagination,
} from '@/components/admin-shell';
import { adminApi, type AdminSession } from '@/lib/adminApi';

export default function SessionsPage() {
  const [sessions, setSessions]       = useState<AdminSession[]>([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');

  const [viewSession, setViewSession] = useState<AdminSession | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({ open: false, title: '', message: '', onConfirm: () => {} });
  const [toast, setToast]             = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const PER_PAGE = 10;

  const fetchSessions = useCallback(() => {
    setLoading(true);
    adminApi.getSessions({ status: statusFilter || undefined, search: search || undefined, page, limit: PER_PAGE })
      .then(res => {
        if (res.success && res.data) {
          setSessions(res.data.sessions);
          setTotal(res.data.pagination.total);
        } else {
          setError(res.message ?? 'Failed to load sessions');
        }
      })
      .catch(() => setError('Could not reach backend'))
      .finally(() => setLoading(false));
  }, [statusFilter, search, page]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const activeSessions   = sessions.filter(s => s.status === 'ACTIVE').length;
  const completedToday   = sessions.filter(s => s.status === 'COMPLETED').length;
  const disputedSessions = sessions.filter(s => s.status === 'DISPUTED').length;

  const getTypeIcon = (type: string) => {
    if (type === 'VIDEO') return <Video size={15} className="text-blue-500" />;
    if (type === 'AUDIO') return <Phone size={15} className="text-green-500" />;
    return <MessageSquare size={15} className="text-amber-500" />;
  };

  return (
    <AdminShell>
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmConfig.open}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(c => ({ ...c, open: false }))}
      />

      {/* Session Detail Modal */}
      <AnimatePresence>
        {viewSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 dark:border-white/10 overflow-hidden"
            >
              <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-white/10">
                <h3 className="text-base font-extrabold text-gray-900 dark:text-white">Session Details</h3>
                <button onClick={() => setViewSession(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-4 text-sm">
                <div className="flex justify-between">
                  <div>
                    <p className="text-xs text-gray-400 dark:text-white/40 mb-1">Session ID</p>
                    <p className="font-mono font-bold text-gray-900 dark:text-white">{viewSession.id.slice(0, 16)}…</p>
                  </div>
                  <StatusBadge status={viewSession.status.toLowerCase()} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                    <p className="text-xs text-gray-400 dark:text-white/40 mb-1">User</p>
                    <p className="font-extrabold text-gray-900 dark:text-white">{viewSession.user.name ?? viewSession.user.email ?? '—'}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                    <p className="text-xs text-gray-400 dark:text-white/40 mb-1">Practitioner</p>
                    <p className="font-extrabold text-gray-900 dark:text-white">{viewSession.practitioner.name}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                    <p className="text-xs text-gray-400 dark:text-white/40 mb-1">Type</p>
                    <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white">
                      {getTypeIcon(viewSession.type)} {viewSession.type}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                    <p className="text-xs text-gray-400 dark:text-white/40 mb-1">Duration</p>
                    <p className="font-bold text-gray-900 dark:text-white">{viewSession.duration > 0 ? `${viewSession.duration} min` : 'Ongoing / Not recorded'}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                    <p className="text-xs text-gray-400 dark:text-white/40 mb-1">Started</p>
                    <p className="font-bold text-gray-900 dark:text-white">{new Date(viewSession.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                    <p className="text-xs text-gray-400 dark:text-white/40 mb-1">Total Cost</p>
                    <p className="font-extrabold text-emerald-600">₹{viewSession.totalCost.toFixed(2)}</p>
                  </div>
                </div>
              </div>
              <div className="p-5 border-t border-gray-100 dark:border-white/10 flex justify-end">
                <button onClick={() => setViewSession(null)} className="px-4 py-2 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20 transition-all">
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sessions Management</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Monitor all consultation sessions — real data from database.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Active Now"        value={activeSessions}   icon={Activity}     color="green"  />
          <StatCard label="Completed"         value={completedToday}   icon={CheckCircle}  color="blue"   />
          <StatCard label="Disputed"          value={disputedSessions} icon={AlertCircle}  color="amber"  />
          <StatCard label="Total (this page)" value={sessions.length}  icon={CalendarClock}color="purple" />
          <StatCard label="Total in DB"       value={total}            icon={Wallet}       color="teal"   />
          <StatCard label="Verified Experts"  value="—"               icon={UserCheck}    color="indigo" />
        </div>

        {/* Live active sessions banner */}
        {activeSessions > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-white/10 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
              </span>
              <h2 className="text-sm font-extrabold text-gray-900 dark:text-white">Live Active Sessions ({activeSessions})</h2>
              <button onClick={fetchSessions} className="ml-auto p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-400">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 dark:text-white/40">
                    <th className="text-left px-2 py-1.5 font-semibold uppercase">Type</th>
                    <th className="text-left px-2 py-1.5 font-semibold uppercase">User</th>
                    <th className="text-left px-2 py-1.5 font-semibold uppercase">Expert</th>
                    <th className="text-left px-2 py-1.5 font-semibold uppercase">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.filter(s => s.status === 'ACTIVE').map(s => (
                    <tr key={s.id} className="border-t border-gray-50 dark:border-white/5">
                      <td className="px-2 py-2"><div className="flex items-center gap-1">{getTypeIcon(s.type)} {s.type}</div></td>
                      <td className="px-2 py-2 font-semibold text-gray-900 dark:text-white">{s.user.name ?? s.user.email ?? '—'}</td>
                      <td className="px-2 py-2 font-semibold text-gray-900 dark:text-white">{s.practitioner.name}</td>
                      <td className="px-2 py-2 text-gray-500 dark:text-white/40">{new Date(s.createdAt).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Main sessions table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-gray-100 dark:border-white/10">
            <SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search by ID or user name…" />
            <div className="relative">
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                className="appearance-none px-3 py-2.5 pr-8 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-3 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
                <tr>
                  {['ID', 'Type', 'User', 'Expert', 'Date', 'Duration', 'Cost', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wide text-gray-400 dark:text-white/40">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-white/10 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                  : sessions.length === 0
                  ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-400 dark:text-white/30 font-semibold">
                        No sessions found.
                      </td>
                    </tr>
                  )
                  : sessions.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-400 dark:text-white/40">{s.id.slice(0, 8)}…</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">{getTypeIcon(s.type)} <span className="font-semibold text-gray-700 dark:text-white/80">{s.type}</span></div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{s.user.name ?? s.user.email ?? '—'}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{s.practitioner.name}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-white/40">{new Date(s.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-white/60">
                        {s.duration > 0 ? `${s.duration} min` : '—'}
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">₹{s.totalCost.toFixed(2)}</td>
                      <td className="px-4 py-3"><StatusBadge status={s.status.toLowerCase()} /></td>
                      <td className="px-4 py-3">
                        <button onClick={() => setViewSession(s)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-500 transition-colors" title="View">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
          <div className="px-5 py-4">
            <Pagination page={page} total={total} perPage={PER_PAGE} onChange={setPage} />
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
