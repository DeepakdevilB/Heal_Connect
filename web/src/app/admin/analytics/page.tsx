'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, CalendarClock, DollarSign, MessageSquare, BarChart3 } from 'lucide-react';
import { AdminShell, StatCard } from '@/components/admin-shell';
import { adminApi, type AdminAnalytics } from '@/lib/adminApi';

export default function AnalyticsPage() {
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.getAnalytics()
      .then(res => {
        if (res.success && res.data) setData(res.data);
        else setError('Failed to load analytics');
      })
      .catch(() => setError('Could not reach backend'))
      .finally(() => setLoading(false));
  }, []);

  const totalSessions = data
    ? data.sessionsByType.CHAT + data.sessionsByType.AUDIO + data.sessionsByType.VIDEO
    : 0;

  const totalRevenue = data
    ? data.revenueByDay.reduce((sum, d) => sum + d.revenue, 0)
    : 0;

  const newUsersThisWeek = data
    ? data.userGrowth.reduce((sum, d) => sum + d.count, 0)
    : 0;

  const maxRevenue = data
    ? Math.max(...data.revenueByDay.map(d => d.revenue), 1)
    : 1;

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Analytics</h1>
          <span className="text-xs text-gray-400 dark:text-white/40 font-semibold">Last 7 days — live data</span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Revenue (7d)" value={loading ? '…' : `₹${totalRevenue.toLocaleString()}`} icon={DollarSign} color="green" />
          <StatCard label="New Users (7d)" value={loading ? '…' : newUsersThisWeek} icon={Users} color="blue" />
          <StatCard label="Total Sessions (7d)" value={loading ? '…' : totalSessions} icon={CalendarClock} color="amber" />
          <StatCard label="Chat Sessions" value={loading ? '…' : (data?.sessionsByType.CHAT ?? 0)} icon={MessageSquare} color="purple" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Revenue by Day */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-white/10 p-6 shadow-sm">
            <h2 className="text-base font-extrabold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-500" /> Revenue — Last 7 Days
            </h2>
            {loading ? (
              <div className="h-48 flex items-end justify-between gap-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="w-full h-full bg-gray-100 dark:bg-white/5 rounded-t-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-end justify-between gap-2">
                {(data?.revenueByDay ?? []).map((d, i) => {
                  const pct = maxRevenue > 0 ? (d.revenue / maxRevenue) * 100 : 0;
                  return (
                    <div key={i} className="w-full bg-gray-100 dark:bg-white/10 rounded-t-lg relative group flex flex-col justify-end" style={{ height: '100%' }}>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(pct, 2)}%` }}
                        transition={{ duration: 0.8, delay: i * 0.08 }}
                        className="w-full bg-gradient-to-t from-amber-500 to-orange-400 rounded-t-lg"
                      />
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap transition-opacity z-10">
                        ₹{d.revenue.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex justify-between mt-3 text-xs text-gray-400 dark:text-white/40">
              {(data?.revenueByDay ?? Array.from({ length: 7 }, (_, i) => ({ date: '' }))).map((d, i) => (
                <span key={i}>{d.date ? new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' }) : '—'}</span>
              ))}
            </div>
          </div>

          {/* Sessions by Type */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-white/10 p-6 shadow-sm">
            <h2 className="text-base font-extrabold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" /> Sessions by Type
            </h2>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-8 bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-5">
                {[
                  { label: 'Chat',  value: data?.sessionsByType.CHAT  ?? 0, color: 'bg-amber-500' },
                  { label: 'Audio', value: data?.sessionsByType.AUDIO ?? 0, color: 'bg-blue-500' },
                  { label: 'Video', value: data?.sessionsByType.VIDEO ?? 0, color: 'bg-purple-500' },
                ].map((item) => {
                  const pct = totalSessions > 0 ? (item.value / totalSessions) * 100 : 0;
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-semibold text-gray-700 dark:text-white/80">{item.label}</span>
                        <span className="font-extrabold text-gray-900 dark:text-white">{item.value} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2.5 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 1, delay: 0.3 }}
                          className={`h-full ${item.color} rounded-full`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top Practitioners */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-white/10 p-6 shadow-sm">
            <h2 className="text-base font-extrabold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-amber-500" /> Top Practitioners by Revenue
            </h2>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse" />)}</div>
            ) : (data?.topPractitioners ?? []).length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-white/40 py-4 text-center">No session data yet.</p>
            ) : (
              <div className="space-y-3">
                {(data?.topPractitioners ?? []).map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-extrabold shrink-0">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-extrabold text-gray-900 dark:text-white truncate">{p.name}</p>
                    </div>
                    <span className="text-sm font-extrabold text-emerald-600">₹{p.totalEarned.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User Growth */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-white/10 p-6 shadow-sm">
            <h2 className="text-base font-extrabold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-500" /> New User Registrations (7d)
            </h2>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-8 bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse" />)}</div>
            ) : (
              <div className="space-y-2">
                {(data?.userGrowth ?? []).map((d, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 dark:text-white/40 w-16 shrink-0">
                      {new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })}
                    </span>
                    <div className="flex-1 bg-gray-100 dark:bg-white/10 rounded-full h-2.5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: d.count > 0 ? `${Math.min((d.count / Math.max(...(data?.userGrowth ?? [{ count: 1 }]).map(x => x.count))) * 100, 100)}%` : '2%' }}
                        transition={{ duration: 0.8, delay: i * 0.05 }}
                        className="h-full bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full"
                      />
                    </div>
                    <span className="text-xs font-extrabold text-gray-900 dark:text-white w-6 text-right">{d.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </AdminShell>
  );
}
