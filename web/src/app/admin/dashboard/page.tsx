'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users, UserCheck, CalendarClock, MessageSquare, BookOpen,
  Star, TrendingUp, Activity, Clock, Sparkles, Layers, Hash,
  ArrowRight, BarChart3, CheckCircle, XCircle, AlertCircle, Wallet, ShieldAlert
} from 'lucide-react';
import { AdminShell, StatCard, StatusBadge, SkeletonRow } from '@/components/admin-shell';

const ADMIN_KEY = 'healconnect-admin-2026';

type StatsData = {
  totalUsers: number;
  totalPractitioners: number;
  pendingKyc: number;
  verifiedPractitioners: number;
  activeSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  totalChatConversations: number;
  totalMessages: number;
  totalRevenue: number;
  avgSessionDuration: number;
  avgRating: number;
  dau: number;
  wau: number;
  mau: number;
};

type ActivityEvent = {
  type: string;
  title: string;
  description: string;
  timestamp: string;
  status: string;
};

type ChartPoint = {
  date: string;
  users: number;
  practitioners: number;
  sessions: number;
  revenue: number;
  messages: number;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [topCategories, setTopCategories] = useState<Array<{ category: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const fetchRealData = useCallback(async () => {
    try {
      const headers = { 'x-admin-key': ADMIN_KEY };
      const [statsRes, actRes, chartRes] = await Promise.all([
        fetch('/api/admin/stats', { headers }).then((r) => r.json()).catch(() => null),
        fetch('/api/admin/activities', { headers }).then((r) => r.json()).catch(() => null),
        fetch('/api/admin/analytics/charts', { headers }).then((r) => r.json()).catch(() => null),
      ]);

      if (statsRes?.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (actRes?.success && actRes.data) {
        setActivities(actRes.data.activities || []);
      }
      if (chartRes?.success && chartRes.data) {
        setChartData(chartRes.data.chartData || []);
        setTopCategories(chartRes.data.topCategories || []);
      }
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRealData();
    // Live Auto-Refresh every 5 seconds
    const interval = setInterval(fetchRealData, 5000);
    return () => clearInterval(interval);
  }, [fetchRealData]);

  // Clean dummy practitioners on load
  useEffect(() => {
    fetch('/api/admin/clean-dummies', {
      method: 'POST',
      headers: { 'x-admin-key': ADMIN_KEY },
    }).catch(() => {});
  }, []);

  const STATS_CARDS = stats ? [
    { label: 'Total Users',              value: stats.totalUsers,               icon: Users,        color: 'blue',   change: `+${stats.dau} today` },
    { label: 'Total Practitioners',      value: stats.totalPractitioners,       icon: UserCheck,    color: 'purple' },
    { label: 'Active Sessions',          value: stats.activeSessions,           icon: Activity,     color: 'green',  change: 'Live' },
    { label: 'Pending Verifications',    value: stats.pendingKyc,               icon: AlertCircle,  color: 'amber' },
    { label: 'Verified Practitioners',   value: stats.verifiedPractitioners,    icon: CheckCircle,  color: 'indigo' },
    { label: 'Completed Sessions',       value: stats.completedSessions,        icon: CalendarClock,color: 'teal' },
    { label: 'Total Revenue',            value: `₹${stats.totalRevenue.toLocaleString()}`, icon: Wallet, color: 'rose' },
    { label: 'Avg Session Duration',     value: `${stats.avgSessionDuration}m`, icon: Clock,        color: 'amber' },
    { label: 'Avg Rating',               value: stats.avgRating > 0 ? `${stats.avgRating} ★` : 'N/A', icon: Star, color: 'purple' },
    { label: 'Daily Active Users (DAU)', value: stats.dau,                      icon: TrendingUp,   color: 'teal' },
    { label: 'Weekly Active (WAU)',      value: stats.wau,                      icon: Users,        color: 'blue' },
    { label: 'Monthly Active (MAU)',     value: stats.mau,                      icon: Layers,       color: 'indigo' },
  ] : [];

  const maxUsersInChart = Math.max(...chartData.map((d) => d.users), 1);
  const maxRevenueInChart = Math.max(...chartData.map((d) => d.revenue), 1);

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-5 flex items-center justify-between text-white shadow-lg shadow-amber-200/40 overflow-hidden relative"
        >
          <div className="absolute right-0 top-0 w-48 h-full opacity-10">
            <Sparkles className="w-full h-full" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black">HealConnect Live Operations</h2>
              <span className="w-2.5 h-2.5 rounded-full bg-green-300 animate-ping" />
            </div>
            <p className="text-white/80 text-xs font-semibold mt-0.5">
              Live PostgreSQL Sync &nbsp;•&nbsp; Auto-refreshed at {lastRefreshed || 'Just now'}
            </p>
          </div>
          <button
            onClick={fetchRealData}
            className="relative z-10 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-xs font-extrabold text-white transition-all"
          >
            Refresh Now
          </button>
        </motion.div>

        {/* Real Stats Grid */}
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
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {STATS_CARDS.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <StatCard {...s} />
              </motion.div>
            ))}
          </div>
        )}

        {/* Real Database Visual Charts */}
        <div className="grid lg:grid-cols-2 gap-5">
          {/* User Signups Trend (Last 30 Days) */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-white/10 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" /> New Users per Day (Real PostgreSQL Data)
                </h3>
                <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Last 30 Days daily registrations</p>
              </div>
            </div>
            {chartData.length === 0 || chartData.every((d) => d.users === 0) ? (
              <div className="h-44 flex items-center justify-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl">
                <p className="text-xs text-gray-400 font-medium">No user registration data available yet</p>
              </div>
            ) : (
              <div className="h-44 flex items-end gap-1 pt-6 border-b border-gray-100 dark:border-white/10 pb-2 overflow-x-auto">
                {chartData.slice(-14).map((d) => (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      style={{ height: `${(d.users / maxUsersInChart) * 120}px` }}
                      className="w-full bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t-sm group-hover:brightness-110 transition-all min-h-[4px]"
                    />
                    <span className="text-[9px] font-bold text-gray-400 truncate">{d.date.slice(8)}</span>
                    {/* Tooltip */}
                    <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap">
                      {d.date}: {d.users} users
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Revenue Trend (Last 30 Days) */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-white/10 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-500" /> Revenue Trend (Real PostgreSQL Data)
                </h3>
                <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Daily session payments (₹)</p>
              </div>
            </div>
            {chartData.length === 0 || chartData.every((d) => d.revenue === 0) ? (
              <div className="h-44 flex items-center justify-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl">
                <p className="text-xs text-gray-400 font-medium">No completed revenue transactions recorded yet</p>
              </div>
            ) : (
              <div className="h-44 flex items-end gap-1 pt-6 border-b border-gray-100 dark:border-white/10 pb-2 overflow-x-auto">
                {chartData.slice(-14).map((d) => (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      style={{ height: `${(d.revenue / maxRevenueInChart) * 120}px` }}
                      className="w-full bg-gradient-to-t from-emerald-500 to-green-400 rounded-t-sm group-hover:brightness-110 transition-all min-h-[4px]"
                    />
                    <span className="text-[9px] font-bold text-gray-400 truncate">{d.date.slice(8)}</span>
                    {/* Tooltip */}
                    <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap">
                      {d.date}: ₹{d.revenue}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Live Activity Stream & Top Categories */}
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Live Activity Feed */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-white/10 p-5 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-500" /> Real-time Activity Feed
              </h3>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full">
                {activities.length} Events
              </span>
            </div>
            {activities.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400 font-medium">No real-time activity recorded in database yet</div>
            ) : (
              <div className="space-y-3">
                {activities.map((act, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 dark:text-white">{act.title}</p>
                      <p className="text-[11px] text-gray-500 dark:text-white/60 truncate">{act.description}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Top Booked Categories */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-white/10 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                <Star className="w-4 h-4 text-purple-500" /> Practitioner Specialties
              </h3>
            </div>
            {topCategories.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400 font-medium">No specialty data available yet</div>
            ) : (
              <div className="space-y-3">
                {topCategories.map((c) => (
                  <div key={c.category} className="space-y-1">
                    <div className="flex justify-between text-xs font-extrabold text-gray-800 dark:text-white">
                      <span>{c.category}</span>
                      <span className="text-amber-600">{c.count}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full"
                        style={{ width: `${Math.min(100, (c.count / Math.max(...topCategories.map((t) => t.count), 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AdminShell>
  );
}
