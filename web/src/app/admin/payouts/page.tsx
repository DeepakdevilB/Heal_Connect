'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, CheckCircle, XCircle, Clock, AlertCircle,
  CreditCard, User, Eye, X, RefreshCw,
} from 'lucide-react';
import {
  AdminShell, StatCard, StatusBadge, SearchBar, Toast, Pagination,
} from '@/components/admin-shell';
import { adminApi, type AdminPayout } from '@/lib/adminApi';

export default function PayoutProcessingPage() {
  const [payouts, setPayouts]   = useState<AdminPayout[]>([]);
  const [filtered, setFiltered] = useState<AdminPayout[]>([]);
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [viewPayout, setViewPayout] = useState<AdminPayout | null>(null);
  const [toast, setToast]       = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const PER_PAGE = 10;

  const fetchPayouts = useCallback(() => {
    setLoading(true);
    adminApi.getPayouts()
      .then(res => {
        if (res.success && res.data) {
          setPayouts(res.data.payouts);
        } else {
          setError(res.message ?? 'Failed to load payouts');
        }
      })
      .catch(() => setError('Could not reach backend'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchPayouts(); }, [fetchPayouts]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      payouts.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.email ?? '').toLowerCase().includes(q)
      )
    );
    setPage(1);
  }, [search, payouts]);

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const totalEarned = payouts.reduce((sum, p) => sum + p.totalEarned, 0);
  const verified    = payouts.filter(p => p.isVerified).length;
  const withSessions = payouts.filter(p => p.completedSessionCount > 0).length;

  return (
    <AdminShell>
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {/* View Modal */}
      <AnimatePresence>
        {viewPayout && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-white/10 overflow-hidden"
            >
              <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-white/10">
                <h3 className="text-base font-extrabold text-gray-900 dark:text-white">Practitioner Earnings</h3>
                <button onClick={() => setViewPayout(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-3 text-sm">
                {[
                  { label: 'Name', value: viewPayout.name },
                  { label: 'Email', value: viewPayout.email ?? '—' },
                  { label: 'Phone', value: viewPayout.phone ?? '—' },
                  { label: 'Rate/min', value: `₹${viewPayout.perMinuteRate.toFixed(2)}` },
                  { label: 'Completed Sessions', value: String(viewPayout.completedSessionCount) },
                  { label: 'Total Earned', value: `₹${viewPayout.totalEarned.toLocaleString()}` },
                  { label: 'KYC', value: viewPayout.isVerified ? 'Verified' : 'Pending' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between py-1.5 border-b border-gray-50 dark:border-white/5">
                    <span className="text-gray-400 dark:text-white/40 font-semibold">{label}</span>
                    <span className="font-bold text-gray-900 dark:text-white">{value}</span>
                  </div>
                ))}
              </div>
              <div className="p-5 border-t border-gray-100 dark:border-white/10 flex justify-end">
                <button onClick={() => setViewPayout(null)} className="px-4 py-2 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20 transition-all">
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payout Processing</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Practitioner earnings from completed sessions — live from database</p>
          </div>
          <button onClick={fetchPayouts} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-white/20 transition-all">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">{error}</div>}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Total Practitioners" value={payouts.length}    icon={User}        color="purple" />
          <StatCard label="Total Earned (all)"  value={`₹${totalEarned.toLocaleString()}`} icon={Wallet} color="green" />
          <StatCard label="With Sessions"       value={withSessions}      icon={CheckCircle} color="blue"   />
          <StatCard label="KYC Verified"        value={verified}          icon={AlertCircle} color="indigo" />
          <StatCard label="Pending KYC"         value={payouts.length - verified} icon={Clock} color="amber" />
          <StatCard label="No Sessions Yet"     value={payouts.length - withSessions} icon={XCircle} color="red" />
        </div>

        {/* Razorpay info */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-white/10 p-5 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-gray-900 dark:text-white">
                RazorpayX Integration
                <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">Coming Soon</span>
              </p>
              <p className="text-xs text-gray-400 dark:text-white/40 mt-0.5">Payout requests, bank transfers and UPI will be managed here once RazorpayX is configured.</p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-gray-100 dark:border-white/10">
            <h2 className="text-sm font-extrabold text-gray-900 dark:text-white">All Practitioner Earnings</h2>
            <SearchBar value={search} onChange={setSearch} placeholder="Search by name or email…" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
                <tr>
                  {['Practitioner', 'Email', 'Rate/min', 'Sessions', 'Total Earned', 'KYC', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wide text-gray-400 dark:text-white/40">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-white/10 rounded animate-pulse" /></td>
                    ))}</tr>
                  ))
                  : paginated.length === 0
                  ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400 dark:text-white/30 font-semibold">No practitioners found.</td></tr>
                  )
                  : paginated.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{p.name}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-white/50">{p.email ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-white/70">₹{p.perMinuteRate.toFixed(2)}</td>
                      <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">{p.completedSessionCount}</td>
                      <td className="px-4 py-3 font-extrabold text-emerald-600">₹{p.totalEarned.toLocaleString()}</td>
                      <td className="px-4 py-3"><StatusBadge status={p.isVerified ? 'verified' : 'pending'} /></td>
                      <td className="px-4 py-3">
                        <button onClick={() => setViewPayout(p)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-500 transition-colors" title="View">
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
            <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
