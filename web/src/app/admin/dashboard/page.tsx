'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, UserCheck, CalendarClock,
  Star, TrendingUp, Activity, Sparkles, Layers,
  ArrowRight, BarChart3, AlertCircle, Wallet,
} from 'lucide-react';
import { AdminShell, StatCard, StatusBadge } from '@/components/admin-shell';
import { adminApi, type AdminStats, type AdminSession } from '@/lib/adminApi';

const QUICK_ACTIONS = [
  { label: 'User Management', href: '/admin/users',     icon: Users,        color: 'from-blue-500 to-cyan-500' },
  { label: 'Sessions',        href: '/admin/sessions',  icon: CalendarClock,color: 'from-purple-500 to-pink-500' },
  { label: 'Payouts',         href: '/admin/payouts',   icon: Wallet,       color: 'from-amber-500 to-orange-500' },
  { label: 'Analytics',       href: '/admin/analytics', icon: BarChart3,    color: 'from-green-500 to-emerald-500' },
];

export default function AdminDashboard() {
  const [stats, setStats]               = useState<AdminStats | null>(null);
  const [recentSessions, setRecentSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');

  useEffect(() => {
    Promise.all([
      adminApi.getStats(),
      adminApi.getSessions({ limit: 5, page: 1 }),
    ])
      .then(([statsRes, sessionsRes]) => {
        if (statsRes.success && statsRes.data) setStats(statsRes.data);
        else setError('Failed to load stats');
        if (sessionsRes.success && sessionsRes.data) setRecentSessions(sessionsRes.data.sessions);
      })
      .catch(() => setError('Could not reach backend'))
      .finally(() => setLoading(false));
  }, []);

  const STATS = stats ? [
    { label: 'Total Users',            value: stats.totalUsers.toLocaleString(),         icon: Users,        color: 'blue'   },
    { label: 'Total Practitioners',    value: stats.totalPractitioners.toLocaleString(), icon: UserCheck,    color: 'purple' },
    { label: 'Active Sessions',        value: stats.activeSessions.toString(),           icon: Activity,     color: 'green'  },
    { label: 'Total Sessions',         value: stats.totalSessions.toLocaleString(),      icon: CalendarClock,color: 'amber'  },
    { label: 'Pending KYC',            value: stats.pendingKyc.toString(),               icon: AlertCircle,  color: 'rose'   },
    { label: 'Verified Practitioners', value: stats.verifiedPractitioners.toString(),    icon: Star,         color: 'indigo' },
    { label: 'Total Revenue',          value: `₹${stats.totalRevenue.toLocaleString()}`, icon: Wallet,       color: 'teal'   },
    { label: 'Reports',                value: '—',                                       icon: Layers,       color: 'rose'   },
  ] : [];

  return (
    <AdminShell>
      <div className="space-y-6">

        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-5 flex items-center justify-between text-white shadow-lg shadow-amber-200/40 overflow-hidden relative"
        >
          <div className="absolute right-0 top-0 w-48 h-full opacity-10 pointer-events-none">
            <Sparkles className="w-full h-full" />
          </div>
          <div className="relative z-10">
            <h2 className="text-xl font-black mb-0.5">Welcome back, Admin 👋</h2>
            <p className="text-white/80 text-sm font-medium">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              &nbsp;•&nbsp;HealConnect Admin Panel
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-3 relative z-10">
            {QUICK_ACTIONS.map(({ label, href, icon: Icon, color }) => (
              <a key={href} href={href} className="flex flex-col items-center gap-1 group">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-[10px] font-bold text-white/80 whitespace-nowrap">{label}</span>
              </a>
            ))}
          </div>
        </motion.div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm font-medium">
            {error} — check that the backend is running.
          </div>
        )}

        {/* Stats Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-white/10 animate-pulse">
                <div className="w-10 h-10 bg-gray-100 dark:bg-white/10 rounded-xl mb-3" />
                <div className="h-6 bg-gray-100 dark:bg-white/10 rounded w-16 mb-2" />
                <div className="h-3 bg-gray-100 dark:bg-white/10 rounded w-24" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <StatCard {...s} />
              </motion.div>
            ))}
          </div>
        )}

        {/* Bottom Grid */}
        <div className="grid lg:grid-cols-2 gap-5">

          {/* Recent Sessions — real data */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-white/10 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-500" /> Recent Sessions
              </h3>
              <a href="/admin/sessions" className="text-[10px] font-extrabold text-amber-600 hover:text-amber-700 flex items-center gap-0.5">
                View All <ArrowRight className="w-3 h-3" />
              </a>
            </div>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 bg-gray-100 dark:bg-white/10 rounded-xl animate-pulse" />)}</div>
            ) : recentSessions.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-white/40 py-6 text-center">No sessions in the database yet.</p>
            ) : (
              <div className="space-y-3">
                {recentSessions.map((s) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center shrink-0 text-sm">
                      {s.type === 'VIDEO' ? '📹' : s.type === 'AUDIO' ? '📞' : '💬'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 dark:text-white leading-tight truncate">
                        {s.user.name ?? s.user.email ?? 'Unknown'} → {s.practitioner.name}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-white/40 mt-0.5">
                        {new Date(s.createdAt).toLocaleString('en-IN')} · ₹{s.totalCost.toFixed(2)}
                        {s.duration > 0 ? ` · ${s.duration} min` : ''}
                      </p>
                    </div>
                    <StatusBadge status={s.status.toLowerCase()} />
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Quick Navigation */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-white/10 p-5 shadow-sm">
            <h3 className="text-sm font-extrabold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-500" /> Quick Navigation
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Manage Users',    href: '/admin/users',     icon: Users,        color: 'from-blue-400 to-cyan-500' },
                { label: 'View Sessions',   href: '/admin/sessions',  icon: CalendarClock,color: 'from-purple-400 to-pink-500' },
                { label: 'Process Payouts', href: '/admin/payouts',   icon: Wallet,       color: 'from-amber-400 to-orange-500' },
                { label: 'Analytics',       href: '/admin/analytics', icon: BarChart3,    color: 'from-green-400 to-emerald-500' },
                { label: 'Reviews',         href: '/admin/reviews',   icon: Star,         color: 'from-rose-400 to-pink-500' },
                { label: 'Settings',        href: '/admin/settings',  icon: TrendingUp,   color: 'from-indigo-400 to-violet-500' },
              ].map(({ label, href, icon: Icon, color }) => (
                <a key={href} href={href}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-amber-50 dark:hover:bg-white/10 transition-colors group">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center shrink-0`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs font-extrabold text-gray-700 dark:text-white group-hover:text-amber-700 transition-colors">{label}</span>
                  <ArrowRight className="w-3 h-3 ml-auto text-gray-400 group-hover:text-amber-500 transition-colors" />
                </a>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </AdminShell>
  );
}
