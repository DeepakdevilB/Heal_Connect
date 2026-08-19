'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, LifeBuoy, Plus, X, Send, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ticketsApi, tokenStore } from '@/lib/api';
import type { SupportTicketEntry, TicketMessageEntry } from '@/lib/api';

const CATEGORIES = [
  { value: 'BILLING', label: 'Billing & Payments' },
  { value: 'TECHNICAL', label: 'Technical Issue' },
  { value: 'ACCOUNT', label: 'Account' },
  { value: 'SESSION', label: 'A Session / Call' },
  { value: 'OTHER', label: 'Other' },
];

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-blue-50 text-blue-600 border-blue-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  RESOLVED: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  CLOSED: 'bg-gray-100 text-gray-500 border-gray-200',
};

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicketEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('OTHER');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, TicketMessageEntry[]>>({});
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  const loadTickets = () => {
    const token = tokenStore.getAccess();
    if (!token) { setLoading(false); return; }
    setLoading(true);
    ticketsApi.mine(token)
      .then((res) => {
        if (res.success && res.data) setTickets(res.data.tickets);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTickets(); }, []);

  const handleCreate = async () => {
    const token = tokenStore.getAccess();
    if (!token || !subject.trim() || !message.trim()) return;
    setSubmitting(true);
    try {
      const res = await ticketsApi.create(token, subject.trim(), message.trim(), category);
      if (res.success) {
        setShowForm(false);
        setSubject('');
        setMessage('');
        setCategory('OTHER');
        loadTickets();
      } else {
        toast.error(res.message || 'Failed to raise ticket. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleExpand = async (ticketId: string) => {
    if (expanded === ticketId) { setExpanded(null); return; }
    setExpanded(ticketId);
    if (!detail[ticketId]) {
      const token = tokenStore.getAccess();
      if (!token) return;
      const res = await ticketsApi.get(token, ticketId);
      if (res.success && res.data) {
        setDetail((d) => ({ ...d, [ticketId]: res.data!.ticket.messages || [] }));
      }
    }
  };

  const handleReply = async (ticketId: string) => {
    const token = tokenStore.getAccess();
    if (!token || !replyText.trim()) return;
    setReplying(true);
    try {
      const res = await ticketsApi.reply(token, ticketId, replyText.trim());
      if (res.success && res.data) {
        setDetail((d) => ({ ...d, [ticketId]: [...(d[ticketId] || []), res.data!.message] }));
        setReplyText('');
        loadTickets();
      }
    } finally {
      setReplying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fffbf0] text-[#1a1a1a] flex flex-col font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-yellow-100 bg-white/80 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-500 hover:text-[#f59e0b] transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-extrabold text-[#1a1a1a]">Support</h1>
          </div>
          <Button
            onClick={() => setShowForm((s) => !s)}
            className="bg-amber-500 hover:bg-amber-600 text-white border-0 rounded-full px-4 font-semibold gap-1.5"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cancel' : 'Raise a Ticket'}
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl space-y-4">
        {showForm && (
          <Card className="bg-white border border-amber-200 shadow-sm">
            <CardContent className="p-5 space-y-3">
              <input
                type="text"
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full text-sm rounded-lg bg-amber-50/70 border border-amber-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-sm rounded-lg bg-amber-50/70 border border-amber-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
              >
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <textarea
                placeholder="Describe your issue..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full text-sm rounded-lg bg-amber-50/70 border border-amber-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400/40 resize-none"
              />
              <Button
                onClick={handleCreate}
                disabled={submitting || !subject.trim() || !message.trim()}
                className="bg-amber-500 hover:bg-amber-600 text-white border-0 rounded-full px-6 font-semibold disabled:opacity-40"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Ticket'}
              </Button>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-[#f59e0b] animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <Card className="bg-white border border-yellow-100 shadow-sm">
            <CardContent className="p-12 text-center text-gray-400">
              <LifeBuoy className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No support tickets yet.</p>
              <p className="text-sm mt-1">Need help with something? Raise a ticket and we'll get back to you.</p>
            </CardContent>
          </Card>
        ) : (
          tickets.map((t) => {
            const isOpen = expanded === t.id;
            const messages = detail[t.id] || [];
            return (
              <Card key={t.id} className="bg-white border border-yellow-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleExpand(t.id)}
                  className="w-full text-left p-4 flex items-center gap-3 bg-transparent border-none cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">{t.subject}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${STATUS_STYLES[t.status] || ''}`}>
                        {t.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-400">{t.category}</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">
                        {new Date(t.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                </button>
                {isOpen && (
                  <CardContent className="px-4 pb-4 pt-0 space-y-3">
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {messages.length === 0 ? (
                        <p className="text-xs text-gray-400 py-2">Loading conversation...</p>
                      ) : (
                        messages.map((m) => (
                          <div
                            key={m.id}
                            className={`text-sm rounded-xl p-3 max-w-[85%] ${
                              m.senderType === 'ADMIN'
                                ? 'bg-amber-50 border border-amber-100 mr-auto'
                                : 'bg-gray-50 border border-gray-100 ml-auto'
                            }`}
                          >
                            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">
                              {m.senderType === 'ADMIN' ? 'HealConnect Support' : 'You'}
                            </p>
                            <p className="text-gray-700 whitespace-pre-wrap">{m.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                    {t.status !== 'CLOSED' && (
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                        <input
                          type="text"
                          placeholder="Type a reply..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleReply(t.id); }}
                          className="flex-1 text-sm rounded-full bg-amber-50/70 border border-amber-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                        />
                        <button
                          onClick={() => handleReply(t.id)}
                          disabled={replying || !replyText.trim()}
                          className="p-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-40 border-none cursor-pointer"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </main>
    </div>
  );
}
