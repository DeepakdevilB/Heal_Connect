'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Users, UserCheck, ShieldCheck, Wifi, Clock,
  Eye, Trash2, CheckCircle, XCircle, Edit3, X
} from 'lucide-react';
import {
  AdminShell, StatCard, StatusBadge, SearchBar,
  ConfirmDialog, Toast, Pagination, SkeletonRow,
} from '@/components/admin-shell';
import { adminApi, AdminUser, AdminPractitioner } from '@/lib/adminApi';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'users' | 'practitioners' | 'earnings';

interface ToastState { message: string; type: 'success' | 'error' | 'info' }

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

// ─── Rate Edit Modal ──────────────────────────────────────────────────────────

function RateEditModal({
  practitioner,
  onClose,
  onSave,
}: {
  practitioner: AdminPractitioner;
  onClose: () => void;
  onSave: (id: string, rate: number) => Promise<void>;
}) {
  const [rate, setRate] = useState(String(practitioner.perMinuteRate));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const n = parseFloat(rate);
    if (isNaN(n) || n < 0) return;
    setSaving(true);
    await onSave(practitioner.id, n);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-extrabold text-gray-900 dark:text-white">Edit Rate</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-white/60 mb-4">
          Set per-minute rate for <span className="font-bold text-gray-900 dark:text-white">{practitioner.name}</span>
        </p>
        <input
          type="number"
          min="0"
          step="0.01"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400 mb-4"
          placeholder="Rate per minute"
        />
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl font-extrabold text-sm bg-amber-500 hover:bg-amber-600 text-white transition-all disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Rate'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-700 dark:text-white transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── User View Modal ──────────────────────────────────────────────────────────

function UserModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-100 dark:border-white/10">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-extrabold text-gray-900 dark:text-white">User Details</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="space-y-3 text-sm">
          <Row label="Name" value={user.name ?? '—'} />
          <Row label="Email" value={user.email ?? '—'} />
          <Row label="Phone" value={user.phone ?? '—'} />
          <Row label="Provider" value={user.provider} />
          <Row label="Joined" value={new Date(user.createdAt).toLocaleDateString()} />
          <div className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-white/10">
            <span className="font-semibold text-gray-500 dark:text-white/50">Email Verified</span>
            <StatusBadge status={user.isEmailVerified ? 'verified' : 'unverified'} />
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="font-semibold text-gray-500 dark:text-white/50">Phone Verified</span>
            <StatusBadge status={user.isPhoneVerified ? 'verified' : 'unverified'} />
          </div>
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 rounded-xl font-semibold text-sm bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-700 dark:text-white transition-all"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ─── Practitioner View Modal ──────────────────────────────────────────────────

function PractitionerModal({ practitioner, onClose }: { practitioner: AdminPractitioner; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-100 dark:border-white/10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-extrabold text-gray-900 dark:text-white">Practitioner Details</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="space-y-3 text-sm">
          <Row label="Name" value={practitioner.name} />
          <Row label="Email" value={practitioner.email ?? '—'} />
          <Row label="Phone" value={practitioner.phone ?? '—'} />
          <Row label="Specialties" value={practitioner.specialties.join(', ') || '—'} />
          <Row label="Experience" value={`${practitioner.experienceYrs} yr${practitioner.experienceYrs !== 1 ? 's' : ''}`} />
          <Row label="Sessions" value={String(practitioner.sessionCount)} />
          <Row label="Avg Rating" value={practitioner.avgRating != null ? practitioner.avgRating.toFixed(1) : '—'} />
          <Row label="Rate/min" value={`$${practitioner.perMinuteRate.toFixed(2)}`} />
          <div className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-white/10">
            <span className="font-semibold text-gray-500 dark:text-white/50">KYC Status</span>
            <StatusBadge status={practitioner.isVerified ? 'verified' : 'pending'} />
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="font-semibold text-gray-500 dark:text-white/50">Online</span>
            <StatusBadge status={practitioner.isOnline ? 'active' : 'unverified'} />
          </div>
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 rounded-xl font-semibold text-sm bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-700 dark:text-white transition-all"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ─── Helper Row Component ─────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-white/10">
      <span className="font-semibold text-gray-500 dark:text-white/50">{label}</span>
      <span className="font-bold text-gray-900 dark:text-white text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState<Tab>('users');

  // ── Users state ──
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  // ── Practitioners state ──
  const [practitioners, setPractitioners] = useState<AdminPractitioner[]>([]);
  const [practitionersTotal, setPractitionersTotal] = useState(0);
  const [practitionersPage, setPractitionersPage] = useState(1);
  const [practitionersSearch, setPractitionersSearch] = useState('');
  const [kycFilter, setKycFilter] = useState('');
  const [practitionersLoading, setPractitionersLoading] = useState(false);
  const [practitionersError, setPractitionersError] = useState<string | null>(null);

  // ── Earnings state (re-uses practitioners list, own page) ──
  const [earningsPractitioners, setEarningsPractitioners] = useState<AdminPractitioner[]>([]);
  const [earningsTotal, setEarningsTotal] = useState(0);
  const [earningsPage, setEarningsPage] = useState(1);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [earningsError, setEarningsError] = useState<string | null>(null);

  // ── UI state ──
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false, title: '', message: '', onConfirm: () => {} });
  const [viewUser, setViewUser] = useState<AdminUser | null>(null);
  const [viewPractitioner, setViewPractitioner] = useState<AdminPractitioner | null>(null);
  const [editRatePractitioner, setEditRatePractitioner] = useState<AdminPractitioner | null>(null);

  const LIMIT = 10;

  const showToast = (message: string, type: ToastState['type'] = 'success') =>
    setToast({ message, type });

  // ── Fetch Users ──
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const res = await adminApi.getUsers({ search: usersSearch, page: usersPage, limit: LIMIT });
      if (res.success && res.data) {
        setUsers(res.data.users);
        setUsersTotal(res.data.pagination.total);
      } else {
        setUsersError(res.message ?? 'Failed to load users.');
      }
    } catch {
      setUsersError('Network error loading users.');
    } finally {
      setUsersLoading(false);
    }
  }, [usersSearch, usersPage]);

  // ── Fetch Practitioners ──
  const fetchPractitioners = useCallback(async () => {
    setPractitionersLoading(true);
    setPractitionersError(null);
    try {
      const res = await adminApi.getPractitioners({
        search: practitionersSearch,
        kycStatus: kycFilter || undefined,
        page: practitionersPage,
        limit: LIMIT,
      });
      if (res.success && res.data) {
        setPractitioners(res.data.practitioners);
        setPractitionersTotal(res.data.pagination.total);
      } else {
        setPractitionersError(res.message ?? 'Failed to load practitioners.');
      }
    } catch {
      setPractitionersError('Network error loading practitioners.');
    } finally {
      setPractitionersLoading(false);
    }
  }, [practitionersSearch, kycFilter, practitionersPage]);

  // ── Fetch Earnings (practitioners for earnings split tab) ──
  const fetchEarnings = useCallback(async () => {
    setEarningsLoading(true);
    setEarningsError(null);
    try {
      const res = await adminApi.getPractitioners({ page: earningsPage, limit: LIMIT });
      if (res.success && res.data) {
        setEarningsPractitioners(res.data.practitioners);
        setEarningsTotal(res.data.pagination.total);
      } else {
        setEarningsError(res.message ?? 'Failed to load earnings data.');
      }
    } catch {
      setEarningsError('Network error loading earnings data.');
    } finally {
      setEarningsLoading(false);
    }
  }, [earningsPage]);

  // ── Effects ──
  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { fetchPractitioners(); }, [fetchPractitioners]);
  useEffect(() => { if (activeTab === 'earnings') fetchEarnings(); }, [activeTab, fetchEarnings]);

  // Reset page when search changes
  const handleUsersSearch = (v: string) => { setUsersSearch(v); setUsersPage(1); };
  const handlePractitionersSearch = (v: string) => { setPractitionersSearch(v); setPractitionersPage(1); };

  // ── Actions ──
  const handleDeleteUser = (id: string, name: string) => {
    setConfirm({
      open: true,
      title: 'Delete User',
      message: `Are you sure you want to permanently delete "${name}"? This cannot be undone.`,
      onConfirm: async () => {
        setConfirm(c => ({ ...c, open: false }));
        try {
          const res = await adminApi.deleteUser(id);
          if (res.success) {
            showToast('User deleted successfully.');
            fetchUsers();
          } else {
            showToast(res.message ?? 'Failed to delete user.', 'error');
          }
        } catch {
          showToast('Network error.', 'error');
        }
      },
    });
  };

  const handleDeletePractitioner = (id: string, name: string) => {
    setConfirm({
      open: true,
      title: 'Delete Practitioner',
      message: `Are you sure you want to permanently delete "${name}"? This cannot be undone.`,
      onConfirm: async () => {
        setConfirm(c => ({ ...c, open: false }));
        try {
          const res = await adminApi.deletePractitioner(id);
          if (res.success) {
            showToast('Practitioner deleted successfully.');
            fetchPractitioners();
          } else {
            showToast(res.message ?? 'Failed to delete practitioner.', 'error');
          }
        } catch {
          showToast('Network error.', 'error');
        }
      },
    });
  };

  const handleVerifyPractitioner = async (id: string, approve: boolean) => {
    try {
      const res = await adminApi.verifyPractitioner(id, approve);
      if (res.success) {
        showToast(approve ? 'Practitioner approved.' : 'Practitioner rejected.');
        fetchPractitioners();
      } else {
        showToast(res.message ?? 'Action failed.', 'error');
      }
    } catch {
      showToast('Network error.', 'error');
    }
  };

  const handleUpdateRate = async (id: string, rate: number) => {
    const res = await adminApi.updatePractitionerRate(id, rate);
    if (res.success) {
      showToast('Rate updated successfully.');
      fetchPractitioners();
      fetchEarnings();
    } else {
      showToast(res.message ?? 'Failed to update rate.', 'error');
    }
  };

  // ── Derived stats ──
  const activeUsersCount = users.filter(u => u.isEmailVerified).length;
  const pendingKycCount = practitioners.filter(p => !p.isVerified).length;
  const verifiedCount = practitioners.filter(p => p.isVerified).length;
  const onlineCount = practitioners.filter(p => p.isOnline).length;

  return (
    <AdminShell>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}
      </AnimatePresence>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm(c => ({ ...c, open: false }))}
      />

      {/* User View Modal */}
      {viewUser && <UserModal user={viewUser} onClose={() => setViewUser(null)} />}

      {/* Practitioner View Modal */}
      {viewPractitioner && (
        <PractitionerModal
          practitioner={viewPractitioner}
          onClose={() => setViewPractitioner(null)}
        />
      )}

      {/* Rate Edit Modal */}
      {editRatePractitioner && (
        <RateEditModal
          practitioner={editRatePractitioner}
          onClose={() => setEditRatePractitioner(null)}
          onSave={handleUpdateRate}
        />
      )}

      <div className="space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard label="Total Users" value={usersTotal} icon={Users} color="blue" />
          <StatCard label="Total Practitioners" value={practitionersTotal} icon={UserCheck} color="purple" />
          <StatCard label="Active Users" value={activeUsersCount} icon={CheckCircle} color="green" />
          <StatCard label="Pending KYC" value={pendingKycCount} icon={Clock} color="amber" />
          <StatCard label="Verified Practitioners" value={verifiedCount} icon={ShieldCheck} color="indigo" />
          <StatCard label="Online Now" value={onlineCount} icon={Wifi} color="teal" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-white/5 p-1 rounded-2xl w-fit">
          {(['users', 'practitioners', 'earnings'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-xl text-sm font-extrabold capitalize transition-all ${
                activeTab === tab
                  ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/70'
              }`}
            >
              {tab === 'earnings' ? 'Earnings Split' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* ── USERS TAB ── */}
        {activeTab === 'users' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-gray-100 dark:border-white/10">
              <h2 className="text-sm font-extrabold text-gray-900 dark:text-white">All Users</h2>
              <SearchBar
                value={usersSearch}
                onChange={handleUsersSearch}
                placeholder="Search users…"
              />
            </div>

            {usersError && (
              <div className="m-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400">
                {usersError}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/10">
                    {['ID', 'Name', 'Email', 'Phone', 'Provider', 'Joined', 'Verified', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wide text-gray-400 dark:text-white/40">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                  {usersLoading
                    ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                    : users.length === 0
                    ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400 dark:text-white/30 font-semibold">
                          No users found.
                        </td>
                      </tr>
                    )
                    : users.map(user => (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-400 dark:text-white/40 max-w-[80px] truncate">{user.id.slice(0, 8)}…</td>
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{user.name ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-white/60">{user.email ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-white/60">{user.phone ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-white/60 capitalize">{user.provider}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-white/40 text-xs">{new Date(user.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={user.isEmailVerified ? 'verified' : 'unverified'} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setViewUser(user)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-500 transition-colors"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id, user.name ?? user.email ?? 'this user')}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>

            <div className="px-5 py-4">
              <Pagination
                page={usersPage}
                total={usersTotal}
                perPage={LIMIT}
                onChange={setUsersPage}
              />
            </div>
          </div>
        )}

        {/* ── PRACTITIONERS TAB ── */}
        {activeTab === 'practitioners' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-gray-100 dark:border-white/10">
              <h2 className="text-sm font-extrabold text-gray-900 dark:text-white">All Practitioners</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <SearchBar
                  value={practitionersSearch}
                  onChange={handlePractitionersSearch}
                  placeholder="Search practitioners…"
                />
                <select
                  value={kycFilter}
                  onChange={e => { setKycFilter(e.target.value); setPractitionersPage(1); }}
                  className="px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                >
                  <option value="">All KYC</option>
                  <option value="verified">Verified</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>

            {practitionersError && (
              <div className="m-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400">
                {practitionersError}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/10">
                    {['ID', 'Name', 'Specialties', 'Exp', 'Sessions', 'KYC', 'Online', 'Rate/min', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wide text-gray-400 dark:text-white/40">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                  {practitionersLoading
                    ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                    : practitioners.length === 0
                    ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-400 dark:text-white/30 font-semibold">
                          No practitioners found.
                        </td>
                      </tr>
                    )
                    : practitioners.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-400 dark:text-white/40 max-w-[80px] truncate">{p.id.slice(0, 8)}…</td>
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{p.name}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-white/60 max-w-[140px] truncate">
                          {p.specialties.slice(0, 2).join(', ')}{p.specialties.length > 2 ? '…' : ''}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-white/60">{p.experienceYrs}y</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-white/60">{p.sessionCount}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={p.isVerified ? 'verified' : 'pending'} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={p.isOnline ? 'active' : 'unverified'} />
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">${p.perMinuteRate.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => setViewPractitioner(p)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-500 transition-colors" title="View">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {!p.isVerified && (
                              <button onClick={() => handleVerifyPractitioner(p.id, true)} className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-500/10 text-green-500 transition-colors" title="Approve KYC">
                                <CheckCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {p.isVerified && (
                              <button onClick={() => handleVerifyPractitioner(p.id, false)} className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-500/10 text-amber-500 transition-colors" title="Reject KYC">
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button onClick={() => handleDeletePractitioner(p.id, p.name)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 transition-colors" title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>

            <div className="px-5 py-4">
              <Pagination
                page={practitionersPage}
                total={practitionersTotal}
                perPage={LIMIT}
                onChange={setPractitionersPage}
              />
            </div>
          </div>
        )}

        {/* ── EARNINGS SPLIT TAB ── */}
        {activeTab === 'earnings' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-gray-100 dark:border-white/10">
              <div>
                <h2 className="text-sm font-extrabold text-gray-900 dark:text-white">Earnings Split</h2>
                <p className="text-xs text-gray-400 dark:text-white/40 mt-0.5">Per-minute rates charged to patients for each practitioner</p>
              </div>
            </div>

            {earningsError && (
              <div className="m-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400">
                {earningsError}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/10">
                    {['Practitioner', 'Email', 'Specialties', 'Sessions', 'KYC', 'Rate/min', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wide text-gray-400 dark:text-white/40">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                  {earningsLoading
                    ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                    : earningsPractitioners.length === 0
                    ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400 dark:text-white/30 font-semibold">
                          No practitioners found.
                        </td>
                      </tr>
                    )
                    : earningsPractitioners.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{p.name}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-white/60">{p.email ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-white/60 max-w-[160px] truncate">
                          {p.specialties.slice(0, 2).join(', ')}{p.specialties.length > 2 ? '…' : ''}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-white/60">{p.sessionCount}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={p.isVerified ? 'verified' : 'pending'} />
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-black text-lg text-gray-900 dark:text-white">
                            ${p.perMinuteRate.toFixed(2)}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-white/40 ml-1">/min</span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setEditRatePractitioner(p)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-extrabold transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Edit Rate
                          </button>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>

            <div className="px-5 py-4">
              <Pagination
                page={earningsPage}
                total={earningsTotal}
                perPage={LIMIT}
                onChange={setEarningsPage}
              />
            </div>
          </div>
        )}

      </div>
    </AdminShell>
  );
}
