'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserCheck, ShieldOff, Star, TrendingUp, Eye, Trash2,
  Check, X, Ban, RefreshCw, Award, DollarSign, Percent
} from 'lucide-react';
import {
  AdminShell, StatCard, StatusBadge, SearchBar,
  ConfirmDialog, Toast, Pagination, SkeletonRow
} from '@/components/admin-shell';

const ADMIN_KEY = 'healconnect-admin-2026';

type UserRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
  provider: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
  photoUrl?: string;
  sessionCount: number;
  reviewCount: number;
  balance: number;
  status: string;
};

type PractitionerRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
  bio?: string;
  specialties: string[];
  certifications: string[];
  languages: string[];
  experienceYrs: number;
  perMinuteRate: number;
  photoUrl?: string;
  isVerified: boolean;
  isOnline: boolean;
  createdAt: string;
  sessionCount: number;
  avgRating: number;
  status: string;
};

export default function AdminUsersPage() {
  const [tab, setTab] = useState<'users' | 'practitioners'>('users');
  const [searchUsers, setSearchUsers] = useState('');
  const [searchPract, setSearchPract] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [practPage, setPractPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [userPages, setUserPages] = useState(1);

  const [practitioners, setPractitioners] = useState<PractitionerRecord[]>([]);
  const [totalPract, setTotalPract] = useState(0);
  const [practPages, setPractPages] = useState(1);

  const [viewUser, setViewUser] = useState<UserRecord | null>(null);
  const [viewPract, setViewPract] = useState<PractitionerRecord | null>(null);
  
  const [editBalanceUser, setEditBalanceUser] = useState<UserRecord | null>(null);
  const [balanceInput, setBalanceInput] = useState('');

  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({ open: false, title: '', message: '', onConfirm: () => {} });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

  // Fetch real users from DB
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?page=${userPage}&limit=10&search=${encodeURIComponent(searchUsers)}`, {
        headers: { 'x-admin-key': ADMIN_KEY },
      }).then((r) => r.json());

      if (res.success && res.data) {
        setUsers(res.data.users || []);
        setTotalUsers(res.data.pagination.total);
        setUserPages(res.data.pagination.pages);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, [userPage, searchUsers]);

  // Fetch real practitioners from DB
  const fetchPractitioners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/practitioners?page=${practPage}&limit=10&search=${encodeURIComponent(searchPract)}`, {
        headers: { 'x-admin-key': ADMIN_KEY },
      }).then((r) => r.json());

      if (res.success && res.data) {
        setPractitioners(res.data.practitioners || []);
        setTotalPract(res.data.pagination.total);
        setPractPages(res.data.pagination.pages);
      }
    } catch (err) {
      console.error('Failed to fetch practitioners:', err);
    } finally {
      setLoading(false);
    }
  }, [practPage, searchPract]);

  useEffect(() => {
    if (tab === 'users') fetchUsers();
    else fetchPractitioners();
  }, [tab, fetchUsers, fetchPractitioners]);

  // Clean dummy practitioners on initial load
  useEffect(() => {
    fetch('/api/admin/clean-dummies', {
      method: 'POST',
      headers: { 'x-admin-key': ADMIN_KEY },
    }).then(() => fetchPractitioners()).catch(() => {});
  }, [fetchPractitioners]);

  // User Actions
  const deleteUser = (uid: string) => {
    setConfirmDialog({
      open: true,
      title: 'Delete User',
      message: 'Are you sure? This user record will be permanently deleted from the database.',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/users/${uid}`, {
            method: 'DELETE',
            headers: { 'x-admin-key': ADMIN_KEY },
          }).then((r) => r.json());
          if (res.success) {
            showToast('User deleted from database');
            fetchUsers();
          } else {
            showToast(res.message || 'Failed to delete user', 'error');
          }
        } catch {
          showToast('Failed to delete user', 'error');
        }
        setConfirmDialog((p) => ({ ...p, open: false }));
      },
    });
  };

  // Practitioner Actions
  const toggleVerification = async (pid: string, current: boolean) => {
    try {
      const res = await fetch(`/api/admin/practitioners/${pid}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
        body: JSON.stringify({ isVerified: !current }),
      }).then((r) => r.json());

      if (res.success) {
        showToast(current ? 'Practitioner status updated to Pending' : 'Practitioner Verified successfully!');
        fetchPractitioners();
      } else {
        showToast(res.message || 'Failed to update verification', 'error');
      }
    } catch {
      showToast('Failed to update verification', 'error');
    }
  };

  const deletePractitioner = (pid: string) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Practitioner',
      message: 'Are you sure? This practitioner will be permanently deleted from the database.',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/practitioners/${pid}`, {
            method: 'DELETE',
            headers: { 'x-admin-key': ADMIN_KEY },
          }).then((r) => r.json());
          if (res.success) {
            showToast('Practitioner deleted from database');
            fetchPractitioners();
          } else {
            showToast(res.message || 'Failed to delete', 'error');
          }
        } catch {
          showToast('Failed to delete practitioner', 'error');
        }
        setConfirmDialog((p) => ({ ...p, open: false }));
      },
    });
  };

  const handleUpdateBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBalanceUser) return;
    
    try {
      const res = await fetch(`/api/admin/users/${editBalanceUser.id}/balance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
        body: JSON.stringify({ balance: Number(balanceInput) }),
      }).then((r) => r.json());

      if (res.success) {
        showToast('Balance updated successfully!');
        setEditBalanceUser(null);
        fetchUsers();
      } else {
        showToast(res.message || 'Failed to update balance', 'error');
      }
    } catch {
      showToast('Failed to update balance', 'error');
    }
  };

  return (
    <AdminShell>
      <div className="space-y-5">
        {/* Top Summary Header */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Database Users" value={totalUsers} icon={Users} color="blue" />
          <StatCard label="Database Practitioners" value={totalPract} icon={UserCheck} color="purple" />
          <StatCard label="Verified Practitioners" value={practitioners.filter((p) => p.isVerified).length} icon={Award} color="green" />
          <StatCard label="Pending Verification" value={practitioners.filter((p) => !p.isVerified).length} icon={ShieldOff} color="amber" />
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 border-b border-gray-100 dark:border-white/10">
          <button
            onClick={() => setTab('users')}
            className={`px-4 py-2.5 text-sm font-extrabold transition-all border-b-2 -mb-px ${
              tab === 'users' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Registered Users ({totalUsers})
          </button>
          <button
            onClick={() => setTab('practitioners')}
            className={`px-4 py-2.5 text-sm font-extrabold transition-all border-b-2 -mb-px ${
              tab === 'practitioners' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Registered Practitioners ({totalPract})
          </button>
        </div>

        {/* ── USERS TAB ── */}
        {tab === 'users' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-gray-100 dark:border-white/10">
              <SearchBar value={searchUsers} onChange={(v) => { setSearchUsers(v); setUserPage(1); }} placeholder="Search DB users by name, email, phone..." />
              <span className="text-xs font-semibold text-gray-500 dark:text-white/50">{totalUsers} Users in Database</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
                  <tr>
                    {['User', 'Email', 'Phone', 'Provider', 'Verified', 'Sessions', 'Balance', 'Joined', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-extrabold text-gray-500 dark:text-white/50 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-sm text-gray-400 font-medium">No data available yet</td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-amber-50/30 dark:hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white text-xs font-extrabold shrink-0">
                              {u.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-extrabold text-gray-900 dark:text-white text-xs">{u.name}</p>
                              <p className="text-[10px] text-gray-400 font-mono">{u.id.slice(0, 8)}...</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-white/60">{u.email}</td>
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-white/60">{u.phone}</td>
                        <td className="px-4 py-3 text-xs font-bold capitalize text-amber-700">{u.provider}</td>
                        <td className="px-4 py-3"><StatusBadge status={u.isEmailVerified || u.isPhoneVerified ? 'verified' : 'unverified'} /></td>
                        <td className="px-4 py-3 text-xs font-extrabold text-gray-900 dark:text-white text-center">{u.sessionCount}</td>
                        <td className="px-4 py-3 text-xs font-bold text-emerald-600">₹{u.balance}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => setViewUser(u)} title="View Profile" className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Eye className="w-3.5 h-3.5" /></button>
                            <button onClick={() => { setEditBalanceUser(u); setBalanceInput(u.balance.toString()); }} title="Edit Balance" className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600"><DollarSign className="w-3.5 h-3.5" /></button>
                            <button onClick={() => deleteUser(u.id)} title="Delete User" className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-4 pb-4">
              <Pagination page={userPage} total={totalUsers} perPage={10} onChange={setUserPage} />
            </div>
          </motion.div>
        )}

        {/* ── PRACTITIONERS TAB ── */}
        {tab === 'practitioners' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-gray-100 dark:border-white/10">
              <SearchBar value={searchPract} onChange={(v) => { setSearchPract(v); setPractPage(1); }} placeholder="Search DB practitioners by name, email..." />
              <span className="text-xs font-semibold text-gray-500 dark:text-white/50">{totalPract} Practitioners in Database</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
                  <tr>
                    {['Practitioner', 'Specialties', 'Exp', 'Rate (₹/m)', 'Sessions', 'Rating', 'KYC Status', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-extrabold text-gray-500 dark:text-white/50 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                  ) : practitioners.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-sm text-gray-400 font-medium">No data available yet</td>
                    </tr>
                  ) : (
                    practitioners.map((p) => (
                      <tr key={p.id} className="hover:bg-amber-50/30 dark:hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-xs font-extrabold shrink-0">
                              {p.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-extrabold text-gray-900 dark:text-white text-xs">{p.name}</p>
                              <p className="text-[10px] text-gray-400">{p.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-white/60 font-medium">
                          {p.specialties.slice(0, 2).join(', ') || 'Vedic Astrology'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">{p.experienceYrs} yrs</td>
                        <td className="px-4 py-3 text-xs font-bold text-emerald-600">₹{p.perMinuteRate}/m</td>
                        <td className="px-4 py-3 text-xs font-extrabold text-gray-900 dark:text-white text-center">{p.sessionCount}</td>
                        <td className="px-4 py-3 text-xs font-bold text-amber-600">{p.avgRating > 0 ? `${p.avgRating} ★` : 'N/A'}</td>
                        <td className="px-4 py-3"><StatusBadge status={p.isVerified ? 'verified' : 'pending'} /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => toggleVerification(p.id, p.isVerified)}
                              title={p.isVerified ? 'Mark Pending' : 'Verify Practitioner'}
                              className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all ${
                                p.isVerified ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
                              }`}
                            >
                              {p.isVerified ? 'Unverify' : '✓ Verify'}
                            </button>
                            <button onClick={() => setViewPract(p)} title="View Details" className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Eye className="w-3.5 h-3.5" /></button>
                            <button onClick={() => deletePractitioner(p.id)} title="Delete Practitioner" className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-4 pb-4">
              <Pagination page={practPage} total={totalPract} perPage={10} onChange={setPractPage} />
            </div>
          </motion.div>
        )}

        {/* Confirm Dialog */}
        <ConfirmDialog
          open={confirmDialog.open}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog((d) => ({ ...d, open: false }))}
        />

        {/* Toast */}
        <AnimatePresence>
          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </AnimatePresence>

        {/* Edit Balance Modal */}
        <AnimatePresence>
          {editBalanceUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setEditBalanceUser(null)} />
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-500" />
                    Update User Balance
                  </h3>
                  <button onClick={() => setEditBalanceUser(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Updating balance for <strong>{editBalanceUser.name}</strong> ({editBalanceUser.email}). This will create an admin adjustment transaction.
                </p>

                <form onSubmit={handleUpdateBalance} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Wallet Balance (INR)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                      <input
                        type="number"
                        required
                        min="0"
                        value={balanceInput}
                        onChange={(e) => setBalanceInput(e.target.value)}
                        className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 dark:bg-white/5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-bold text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setEditBalanceUser(null)} className="flex-1 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5 transition-colors">
                      Cancel
                    </button>
                    <button type="submit" className="flex-1 py-2.5 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-500/20 transition-all">
                      Save Balance
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AdminShell>
  );
}
