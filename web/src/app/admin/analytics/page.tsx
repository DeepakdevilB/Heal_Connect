'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, Users, Wallet, CalendarClock, MessageSquare,
  Sparkles, Layers, RefreshCw
} from 'lucide-react';
import { AdminShell, StatCard } from '@/components/admin-shell';

const ADMIN_KEY = 'healconnect-admin-2026';

type AnalyticsData = {
  chartData: Array<{
    date: string;
    users: number;
    practitioners: number;
    sessions: number;
    revenue: number;
    messages: number;
  }>;
  statusDistribution: Array<{ status: string; count: number }>;
  topCategories: Array<{ category: string; count: number }>;
};

type ChatAnalyticsData = {
  totalConversations: number;
  messagesToday: number;
  messagesThisWeek: number;
  avgMessagesPerSession: number;
  activeConversations: number;
  conversationTimeline: Array<{ date: string; count: number }>;
};

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [chatData, setChatData] = useState<ChatAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      const headers = { 'x-admin-key': ADMIN_KEY };
      const [res, chatRes] = await Promise.all([
        fetch('/api/admin/analytics/charts', { headers }).then((r) => r.json()).catch(() => null),
        fetch('/api/admin/analytics/chat', { headers }).then((r) => r.json()).catch(() => null),
      ]);

      if (res?.success && res.data) {
        setData(res.data);
      }
      if (chatRes?.success && chatRes.data) {
        setChatData(chatRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 10000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  const chartPoints = data?.chartData || [];
  const maxUsers = Math.max(...chartPoints.map((d) => d.users), 1);
  const maxSessions = Math.max(...chartPoints.map((d) => d.sessions), 1);
  const maxRevenue = Math.max(...chartPoints.map((d) => d.revenue), 1);
  const maxMessages = Math.max(...chartPoints.map((d) => d.messages), 1);

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-500" /> PostgreSQL Real Analytics Dashboard
            </h2>
            <p className="text-xs text-gray-500 font-semibold mt-0.5">
              Every chart and metric is generated dynamically from the live PostgreSQL database.
            </p>
          </div>
          <button
            onClick={fetchAnalytics}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-extrabold transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
          </button>
        </div>

        {/* Chat Analytics Header Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label="Total Chat Sessions" value={chatData?.totalConversations ?? 0} icon={MessageSquare} color="blue" />
          <StatCard label="Messages Today" value={chatData?.messagesToday ?? 0} icon={Sparkles} color="green" />
          <StatCard label="Messages This Week" value={chatData?.messagesThisWeek ?? 0} icon={TrendingUp} color="amber" />
          <StatCard label="Avg Msgs / Session" value={chatData?.avgMessagesPerSession ?? 0} icon={Layers} color="purple" />
          <StatCard label="Active Conversations" value={chatData?.activeConversations ?? 0} icon={CalendarClock} color="rose" />
        </div>

        {/* 30-Day User vs Practitioner Growth Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-white/10 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">
              User & Practitioner Registrations (Last 30 Days)
            </h3>
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="flex items-center gap-1 text-blue-600"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Users</span>
              <span className="flex items-center gap-1 text-purple-600"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Practitioners</span>
            </div>
          </div>

          {chartPoints.length === 0 || chartPoints.every((d) => d.users === 0 && d.practitioners === 0) ? (
            <div className="h-48 flex items-center justify-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl">
              <p className="text-xs text-gray-400 font-medium">No registration data available yet</p>
            </div>
          ) : (
            <div className="h-48 flex items-end gap-1 pt-6 border-b border-gray-100 dark:border-white/10 pb-2 overflow-x-auto">
              {chartPoints.map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative min-w-[12px]">
                  <div className="w-full flex items-end justify-center gap-0.5" style={{ height: '140px' }}>
                    <div
                      style={{ height: `${(d.users / maxUsers) * 130}px` }}
                      className="w-1.5 bg-blue-500 rounded-t-sm group-hover:brightness-110 min-h-[2px]"
                    />
                    <div
                      style={{ height: `${(d.practitioners / Math.max(maxUsers, 1)) * 130}px` }}
                      className="w-1.5 bg-purple-500 rounded-t-sm group-hover:brightness-110 min-h-[2px]"
                    />
                  </div>
                  <span className="text-[8px] font-bold text-gray-400 truncate">{d.date.slice(8)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sessions & Revenue Grid */}
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Sessions per Day */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-white/10 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">Sessions per Day</h3>
            {chartPoints.length === 0 || chartPoints.every((d) => d.sessions === 0) ? (
              <div className="h-40 flex items-center justify-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl">
                <p className="text-xs text-gray-400 font-medium">No session data available yet</p>
              </div>
            ) : (
              <div className="h-40 flex items-end gap-1 pt-4 border-b border-gray-100 dark:border-white/10 pb-2 overflow-x-auto">
                {chartPoints.slice(-14).map((d) => (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      style={{ height: `${(d.sessions / maxSessions) * 110}px` }}
                      className="w-full bg-gradient-to-t from-indigo-500 to-purple-400 rounded-t-sm min-h-[3px]"
                    />
                    <span className="text-[9px] font-bold text-gray-400">{d.date.slice(8)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Revenue per Day */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-white/10 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">Revenue Trend (₹)</h3>
            {chartPoints.length === 0 || chartPoints.every((d) => d.revenue === 0) ? (
              <div className="h-40 flex items-center justify-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl">
                <p className="text-xs text-gray-400 font-medium">No revenue data available yet</p>
              </div>
            ) : (
              <div className="h-40 flex items-end gap-1 pt-4 border-b border-gray-100 dark:border-white/10 pb-2 overflow-x-auto">
                {chartPoints.slice(-14).map((d) => (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      style={{ height: `${(d.revenue / maxRevenue) * 110}px` }}
                      className="w-full bg-gradient-to-t from-emerald-500 to-green-400 rounded-t-sm min-h-[3px]"
                    />
                    <span className="text-[9px] font-bold text-gray-400">{d.date.slice(8)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Status Breakdown & Top Booked Categories */}
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Session Status Distribution */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-white/10 p-5 shadow-sm">
            <h3 className="text-sm font-extrabold text-gray-900 dark:text-white mb-4">Session Status Breakdown</h3>
            {!data?.statusDistribution || data.statusDistribution.length === 0 ? (
              <div className="py-10 text-center text-xs text-gray-400 font-medium">No session status data available yet</div>
            ) : (
              <div className="space-y-3">
                {data.statusDistribution.map((s) => (
                  <div key={s.status} className="flex items-center justify-between text-xs font-bold">
                    <span className="text-gray-700 dark:text-white/80">{s.status}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-extrabold">{s.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chat Messages per Day */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-white/10 p-5 shadow-sm">
            <h3 className="text-sm font-extrabold text-gray-900 dark:text-white mb-4">Daily Messages Sent</h3>
            {chartPoints.length === 0 || chartPoints.every((d) => d.messages === 0) ? (
              <div className="py-10 text-center text-xs text-gray-400 font-medium">No message data available yet</div>
            ) : (
              <div className="h-36 flex items-end gap-1 pt-4 border-b border-gray-100 dark:border-white/10 pb-2 overflow-x-auto">
                {chartPoints.slice(-14).map((d) => (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      style={{ height: `${(d.messages / maxMessages) * 90}px` }}
                      className="w-full bg-gradient-to-t from-amber-500 to-orange-400 rounded-t-sm min-h-[3px]"
                    />
                    <span className="text-[9px] font-bold text-gray-400">{d.date.slice(8)}</span>
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
