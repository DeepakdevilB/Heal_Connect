'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, RefreshCw, Filter } from 'lucide-react';
import { auditLogApi, type AuditLogEntry } from '@/lib/adminApi';

const ACTION_COLORS: Record<string, string> = {
  BAN:                    'bg-red-100 text-red-700',
  UNBAN:                  'bg-green-100 text-green-700',
  DELETE_USER:            'bg-orange-100 text-orange-700',
  DELETE_PRACTITIONER:    'bg-orange-100 text-orange-700',
  VERIFY_PRACTITIONER:    'bg-blue-100 text-blue-700',
  ADJUST_WALLET:          'bg-purple-100 text-purple-700',
  MIGRATE:                'bg-yellow-100 text-yellow-800',
  MODERATE:               'bg-pink-100 text-pink-700',
  TICKET_REPLY:           'bg-gray-100 text-gray-700',
  CUSTOM:                 'bg-gray-100 text-gray-700',
};

const ACTION_OPTIONS = ['', 'BAN', 'UNBAN', 'DELETE_USER', 'DELETE_PRACTITIONER', 'VERIFY_PRACTITIONER', 'ADJUST_WALLET', 'MIGRATE', 'MODERATE'];
const TARGET_OPTIONS = ['', 'USER', 'PRACTITIONER', 'WALLET', 'SESSION', 'SYSTEM'];

function formatMeta(meta: string | null): string {
  if (!meta) return '—';
  try {
    const obj = JSON.parse(meta) as Record<string, unknown>;
    return Object.entries(obj)
      .map(([k, v]) => `${k}: ${v === null ? 'null' : String(v)}`)
      .join(' · ');
  } catch {
    return meta;
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AuditLogPage() {
  const router = useRouter();
  const [entries,    setEntries]    = useState<AuditLogEntry[]>([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [pages,      setPages]      = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [filterAction,  setFilterAction]  = useState('');
  const [filterTarget,  setFilterTarget]  = useState('');

  const fetchLog = useCallback(async () => {
    setLoading(true);
    const res = await auditLogApi.list({
      action:     filterAction || undefined,
      targetType: filterTarget || undefined,
      page,
      limit: 50,
    });
    if (res.success && res.data) {
      setEntries(res.data.entries);
      setTotal(res.data.pagination.total);
      setPages(res.data.pagination.pages);
    }
    setLoading(false);
  }, [filterAction, filterTarget, page]);

  useEffect(() => { void fetchLog(); }, [fetchLog]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-amber-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Admin Audit Log</h1>
            <p className="text-sm text-gray-500">{total} total entries — immutable record of admin actions</p>
          </div>
        </div>
        <button
          id="audit-log-refresh"
          type="button"
          onClick={() => void fetchLog()}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Filter className="w-4 h-4" /> Filter:
        </div>
        <select
          id="audit-filter-action"
          value={filterAction}
          onChange={(e) => { setPage(1); setFilterAction(e.target.value); }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          {ACTION_OPTIONS.map((a) => (
            <option key={a} value={a}>{a || 'All actions'}</option>
          ))}
        </select>
        <select
          id="audit-filter-target"
          value={filterTarget}
          onChange={(e) => { setPage(1); setFilterTarget(e.target.value); }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          {TARGET_OPTIONS.map((t) => (
            <option key={t} value={t}>{t || 'All targets'}</option>
          ))}
        </select>
        {(filterAction || filterTarget) && (
          <button
            type="button"
            onClick={() => { setPage(1); setFilterAction(''); setFilterTarget(''); }}
            className="text-sm text-amber-600 hover:text-amber-800 font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">No audit log entries found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500 uppercase text-xs tracking-wide">When</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500 uppercase text-xs tracking-wide">Admin</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500 uppercase text-xs tracking-wide">Action</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500 uppercase text-xs tracking-wide">Target</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500 uppercase text-xs tracking-wide">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-gray-400 whitespace-nowrap" title={new Date(e.createdAt).toLocaleString()}>
                      {timeAgo(e.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-gray-600 font-mono text-xs max-w-[160px] truncate">
                      {e.adminLabel}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${ACTION_COLORS[e.action] ?? 'bg-gray-100 text-gray-700'}`}>
                        {e.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {e.targetType}
                      {e.targetId && (
                        <button
                          type="button"
                          className="ml-1.5 text-amber-600 hover:underline font-mono text-xs"
                          title={e.targetId}
                          onClick={() => {
                            if (e.targetType === 'USER')         router.push(`/admin/users?highlight=${e.targetId}`);
                            if (e.targetType === 'PRACTITIONER') router.push(`/admin/practitioners?highlight=${e.targetId}`);
                          }}
                        >
                          {e.targetId.slice(0, 8)}…
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs max-w-xs truncate" title={e.meta ?? ''}>
                      {formatMeta(e.meta)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">Page {page} of {pages}</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
