'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarClock, Activity, Clock, User, Eye, Search,
  Filter, CheckCircle, AlertCircle, RefreshCw, Phone, Video, MessageSquare,
  FileText, ShieldAlert
} from 'lucide-react';
import {
  AdminShell, StatCard, StatusBadge, SearchBar,
  Toast, Pagination, SkeletonRow
} from '@/components/admin-shell';

const ADMIN_KEY = 'healconnect-admin-2026';

type SessionRecord = {
  id: string;
  user: string;
  userId: string;
  practitioner: string;
  practitionerId: string;
  type: string;
  status: string;
  durationMinutes: number;
  startTime: string;
  scheduledStartTime: string | null;
  scheduledEndTime: string | null;
  endTime: string | null;
  totalCost: number;
  paymentStatus: string;
  createdAt: string;
};

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<SessionRecord | null>(null);
  const [viewChat, setViewChat] = useState<SessionRecord | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [viewTranscript, setViewTranscript] = useState<SessionRecord | null>(null);
  const [transcriptData, setTranscriptData] = useState<any>(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => setToast({ message, type });

  const fetchChatLog = async (sessionId: string) => {
    setChatLoading(true);
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}/chat`, {
        headers: { 'x-admin-key': ADMIN_KEY },
      }).then(r => r.json());
      if (res.success) {
        setChatMessages(res.data.messages || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setChatLoading(false);
    }
  };

  const fetchTranscript = async (sessionId: string) => {
    setTranscriptLoading(true);
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}/transcript`, {
        headers: { 'x-admin-key': ADMIN_KEY },
      }).then(r => r.json());
      if (res.success && res.data.transcript) {
        setTranscriptData(res.data.transcript);
      } else {
        setTranscriptData(null);
      }
    } catch (err) {
      console.error(err);
      setTranscriptData(null);
    } finally {
      setTranscriptLoading(false);
    }
  };

  const scanTranscript = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}/transcript/scan`, {
        method: 'POST',
        headers: { 'x-admin-key': ADMIN_KEY },
      }).then(r => r.json());
      
      if (res.success) {
        const { flagged, reasons } = res.data.scanResult;
        if (flagged) {
          showToast(`Flagged for: ${reasons.join(', ')}`, 'error');
          fetchTranscript(sessionId); // refresh to show flags
        } else {
          showToast('Transcript is safe. No flags detected.', 'success');
        }
      } else {
        showToast('Scan failed', 'error');
      }
    } catch (err) {
      showToast('Error scanning transcript', 'error');
    }
  };

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const statusQuery = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
      const res = await fetch(`/api/admin/sessions?page=${page}&limit=10&search=${encodeURIComponent(search)}${statusQuery}`, {
        headers: { 'x-admin-key': ADMIN_KEY },
      }).then((r) => r.json());

      if (res.success && res.data) {
        setSessions(res.data.sessions || []);
        setTotalSessions(res.data.pagination.total);
        setPages(res.data.pagination.pages);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 5000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  const activeCount = sessions.filter((s) => ['ACTIVE', 'ACCEPTED', 'JOINING_CHANNEL'].includes(s.status)).length;
  const completedCount = sessions.filter((s) => s.status === 'COMPLETED').length;

  return (
    <AdminShell>
      <div className="space-y-5">
        {/* Header Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Database Sessions" value={totalSessions} icon={CalendarClock} color="indigo" />
          <StatCard label="Active Sessions (Live)" value={activeCount} icon={Activity} color="green" change="Live Sync" />
          <StatCard label="Completed Sessions" value={completedCount} icon={CheckCircle} color="blue" />
          <StatCard label="Avg Duration" value="Calculated from DB" icon={Clock} color="amber" />
        </div>

        {/* Real Data Sessions Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-gray-100 dark:border-white/10">
            <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search sessions by ID, user, practitioner..." />
            <div className="flex items-center gap-3">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-bold"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="rejected">Rejected</option>
              </select>
              <span className="text-xs font-semibold text-gray-500">{totalSessions} Sessions</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
                <tr>
                  {['Session ID', 'User', 'Practitioner', 'Type', 'Duration (Min)', 'Cost', 'Status', 'Scheduled For', 'Started At', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-extrabold text-gray-500 dark:text-white/50 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : sessions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-sm text-gray-400 font-medium">No data available yet</td>
                  </tr>
                ) : (
                  sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-amber-50/30 dark:hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-gray-500">{s.id.slice(0, 10)}...</td>
                      <td className="px-4 py-3 text-xs font-extrabold text-gray-900 dark:text-white">{s.user}</td>
                      <td className="px-4 py-3 text-xs font-bold text-purple-600">{s.practitioner}</td>
                      <td className="px-4 py-3 text-xs font-bold uppercase text-amber-700">
                        {s.type === 'VIDEO' ? '📹 Video' : s.type === 'AUDIO' ? '📞 Voice' : '💬 Chat'}
                      </td>
                      <td className="px-4 py-3 text-xs font-extrabold text-gray-900 dark:text-white text-center">
                        {s.durationMinutes > 0 ? `${s.durationMinutes} min` : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-emerald-600">₹{s.totalCost}</td>
                      <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {s.scheduledStartTime ? new Date(s.scheduledStartTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {s.status === 'PENDING' || s.status === 'TIME_PROPOSED' || s.status === 'CONFIRMED' ? 'Not started' : new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setSelectedSession(s)} title="View Session Details" className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 pb-4">
            <Pagination page={page} total={totalSessions} perPage={10} onChange={setPage} />
          </div>
        </div>

        {/* Session Detail Modal */}
        {selectedSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-100 dark:border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-extrabold text-gray-900 dark:text-white">Session {selectedSession.id.slice(0, 8)}</h3>
                <button onClick={() => setSelectedSession(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
              </div>
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                  <span className="text-gray-400 font-bold block">User</span>
                  <span className="font-extrabold text-gray-900 dark:text-white">{selectedSession.user}</span>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                  <span className="text-gray-400 font-bold block">Practitioner</span>
                  <span className="font-extrabold text-purple-600">{selectedSession.practitioner}</span>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                  <span className="text-gray-400 font-bold block">Scheduled For</span>
                  <span className="font-extrabold text-blue-600">
                    {selectedSession.scheduledStartTime ? new Date(selectedSession.scheduledStartTime).toLocaleString([], { dateStyle: 'long', timeStyle: 'short' }) : 'Instant Session'}
                  </span>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                  <span className="text-gray-400 font-bold block">Calculated Duration</span>
                  <span className="font-extrabold text-amber-600">{selectedSession.durationMinutes} minutes</span>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                  <span className="text-gray-400 font-bold block">Total Billed</span>
                  <span className="font-extrabold text-emerald-600">₹{selectedSession.totalCost}</span>
                </div>
              </div>
              <div className="mt-5 space-y-2">
                {selectedSession.type === 'CHAT' ? (
                  <button onClick={() => { setViewChat(selectedSession); setSelectedSession(null); fetchChatLog(selectedSession.id); }} className="w-full py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2">
                    <MessageSquare className="w-4 h-4" /> View Chat Log
                  </button>
                ) : (
                  <button onClick={() => { setViewTranscript(selectedSession); setSelectedSession(null); fetchTranscript(selectedSession.id); }} className="w-full py-2.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2">
                    <FileText className="w-4 h-4" /> View Transcript
                  </button>
                )}
                <button onClick={() => setSelectedSession(null)} className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white font-extrabold rounded-xl text-xs">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chat Log Modal */}
        {viewChat && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl h-[80vh] shadow-2xl border border-gray-100 dark:border-white/10 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white">Chat Transcript: {viewChat.id.slice(0, 8)}</h3>
                  <p className="text-xs text-gray-500 font-medium mt-1">Between {viewChat.user} and {viewChat.practitioner}</p>
                </div>
                <button onClick={() => setViewChat(null)} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-black/5">✕</button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900">
                {chatLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-gray-400 font-medium">No messages found in this session.</div>
                ) : (
                  chatMessages.map(msg => {
                    const isPractitioner = msg.senderType === 'PRACTITIONER';
                    return (
                      <div key={msg.id} className={`flex ${isPractitioner ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${
                          isPractitioner 
                            ? 'bg-blue-600 text-white rounded-br-none' 
                            : 'bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-white/5 rounded-bl-none'
                        }`}>
                          <div className="text-[10px] font-bold opacity-70 mb-1 uppercase tracking-wider">
                            {isPractitioner ? viewChat.practitioner : viewChat.user}
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <div className={`text-[10px] mt-2 font-medium ${isPractitioner ? 'text-blue-100' : 'text-gray-400'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Transcript Modal */}
        {viewTranscript && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl h-[80vh] shadow-2xl border border-gray-100 dark:border-white/10 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    Call Transcript: {viewTranscript.id.slice(0, 8)}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium mt-1">Between {viewTranscript.user} and {viewTranscript.practitioner}</p>
                </div>
                <button onClick={() => setViewTranscript(null)} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-black/5">✕</button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-900 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {transcriptLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                  </div>
                ) : !transcriptData ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <FileText className="w-12 h-12 mb-2 opacity-50" />
                    <span className="font-medium">No transcript available for this session.</span>
                  </div>
                ) : (
                  <>
                    {transcriptData.flaggedContent && transcriptData.flaggedContent.length > 0 && (
                      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                        <div className="flex items-center gap-2 font-bold mb-1">
                          <ShieldAlert className="w-4 h-4" />
                          This transcript contains flagged content!
                        </div>
                        <ul className="list-disc list-inside text-xs">
                          {transcriptData.flaggedContent.map((f: any) => (
                            <li key={f.id}>Reason: {f.reason} (Status: {f.status})</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {transcriptData.transcriptText}
                  </>
                )}
              </div>
              
              {transcriptData && (
                <div className="p-4 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex justify-end gap-3">
                  <button onClick={() => setViewTranscript(null)} className="px-5 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors">
                    Close
                  </button>
                  <button onClick={() => scanTranscript(viewTranscript.id)} className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-colors flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" /> Scan for Flags
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Toast */}
        <AnimatePresence>
          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </AnimatePresence>
      </div>
    </AdminShell>
  );
}
