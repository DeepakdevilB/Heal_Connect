'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  AdminShell,
  StatusBadge,
  SearchBar,
  Toast,
  Pagination,
} from '@/components/admin-shell';
import { LifeBuoy, Send, X, User } from 'lucide-react';
import { ticketsApi } from '@/lib/adminApi';
import type { AdminTicket, AdminTicketMessage } from '@/lib/adminApi';

export default function AdminTicketsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [page, setPage] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const [pageLimit, setPageLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [selected, setSelected] = useState<AdminTicket | null>(null);
  const [messages, setMessages] = useState<AdminTicketMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ticketsApi.list(statusFilter === 'all' ? undefined : statusFilter, page);
      if (res.success && res.data) {
        setTickets(res.data.tickets);
        setTotalTickets(res.data.pagination.total || 0);
        setPageLimit(res.data.pagination.limit || 20);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const openTicket = async (t: AdminTicket) => {
    setSelected(t);
    setMessages([]);
    const res = await ticketsApi.get(t.id);
    if (res.success && res.data) setMessages(res.data.ticket.messages || []);
  };

  const filteredTickets = tickets.filter((t) => {
    const name = t.user?.name || t.practitioner?.name || '';
    const q = search.toLowerCase();
    return t.subject.toLowerCase().includes(q) || name.toLowerCase().includes(q);
  });

  const handleReply = async (statusOverride?: string) => {
    if (!selected) return;
    if (!replyText.trim() && !statusOverride) return;
    setSending(true);
    try {
      const res = await ticketsApi.reply(selected.id, replyText.trim(), statusOverride);
      if (res.success && res.data) {
        if (res.data.message) setMessages((m) => [...m, res.data!.message!]);
        setReplyText('');
        const newStatus = res.data.status as AdminTicket['status'];
        setSelected((s) => (s ? { ...s, status: newStatus } : s));
        setTickets((prev) => prev.map((t) => (t.id === selected.id ? { ...t, status: newStatus } : t)));
        setToast({ message: statusOverride ? `Ticket marked ${statusOverride.toLowerCase()}` : 'Reply sent', type: 'success' });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to send reply', type: 'error' });
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Support Tickets</h1>
          <p className="text-gray-500 dark:text-gray-400">Respond to tickets raised by users and experts</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Ticket List */}
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <SearchBar value={search} onChange={setSearch} placeholder="Search tickets..." />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="block w-full sm:w-40 pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <div className="p-8 text-center text-gray-500">Loading tickets...</div>
                ) : filteredTickets.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">No tickets found.</div>
                ) : (
                  filteredTickets.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => openTicket(t)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors ${selected?.id === t.id ? 'bg-amber-50 dark:bg-amber-900/10' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          {t.user?.name || t.practitioner?.name || 'Unknown'}
                          {t.practitioner && <span className="text-[10px] text-amber-600 font-bold uppercase">Expert</span>}
                        </h4>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(t.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-800 dark:text-gray-200 font-medium mb-1 truncate">{t.subject}</div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{t.category} · {t._count?.messages ?? 0} messages</span>
                        <StatusBadge status={t.status} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <Pagination page={page} total={totalTickets} perPage={pageLimit} onChange={setPage} />
            </div>
          </div>

          {/* Ticket Detail & Reply */}
          <div className="flex-1 lg:max-w-md xl:max-w-lg bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
            {selected ? (
              <>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                  <h3 className="font-medium text-gray-900 dark:text-white flex items-center">
                    <LifeBuoy className="h-5 w-5 mr-2 text-gray-400" />
                    Ticket Details
                  </h3>
                  <div className="flex items-center gap-2">
                    {selected.status !== 'RESOLVED' && (
                      <button
                        onClick={() => handleReply('RESOLVED')}
                        disabled={sending}
                        className="text-xs font-semibold px-2.5 py-1 rounded-md text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                      >
                        Mark Resolved
                      </button>
                    )}
                    {selected.status !== 'CLOSED' && (
                      <button
                        onClick={() => handleReply('CLOSED')}
                        disabled={sending}
                        className="text-xs font-semibold px-2.5 py-1 rounded-md text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Close
                      </button>
                    )}
                    <button onClick={() => setSelected(null)} className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-md lg:hidden">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.subject}</h2>
                      <div className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                        {selected.user?.name || selected.practitioner?.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {selected.user?.email || selected.practitioner?.email} · {selected.category}
                      </div>
                    </div>
                    <StatusBadge status={selected.status} />
                  </div>

                  {messages.length === 0 ? (
                    <p className="text-sm text-gray-400">Loading conversation...</p>
                  ) : (
                    messages.map((m) => (
                      <div
                        key={m.id}
                        className={`text-sm rounded-lg p-3 max-w-[85%] ${
                          m.senderType === 'ADMIN'
                            ? 'bg-amber-50 dark:bg-amber-900/20 ml-auto'
                            : 'bg-gray-50 dark:bg-gray-700/30 mr-auto'
                        }`}
                      >
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">
                          {m.senderType === 'ADMIN' ? 'You (Support)' : m.senderType}
                        </p>
                        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{m.message}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reply</label>
                  <textarea
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your response here..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:text-white resize-none mb-3"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleReply()}
                      disabled={!replyText.trim() || sending}
                      className="flex items-center px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Reply
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 p-8">
                <LifeBuoy className="h-12 w-12 mb-4 opacity-20" />
                <p>Select a ticket from the list to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </AdminShell>
  );
}
