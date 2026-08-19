'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, ChevronDown, ChevronUp, Loader2, Phone, Video, MessageCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { sessionsApi, tokenStore } from '@/lib/api';
import type { TranscriptEntry } from '@/lib/api';
import { getAvatarUrl } from '@/lib/utils';

function typeIcon(type: string) {
  if (type === 'VIDEO') return <Video className="w-3.5 h-3.5" />;
  if (type === 'AUDIO') return <Phone className="w-3.5 h-3.5" />;
  return <MessageCircle className="w-3.5 h-3.5" />;
}

export default function ExpertTranscriptsPage() {
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const token = tokenStore.getAccess();
    if (!token) { setLoading(false); return; }
    setLoading(true);
    sessionsApi.practitionerTranscripts(token, page)
      .then((res) => {
        if (res.success && res.data) {
          setTranscripts(res.data.transcripts);
          setPages(res.data.pagination.pages);
        }
      })
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="min-h-screen bg-[#fffbf0] text-[#1a1a1a] flex flex-col font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-yellow-100 bg-white/80 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/expert/dashboard" className="text-gray-500 hover:text-[#f59e0b] transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-extrabold text-[#1a1a1a]">Call Transcripts</h1>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-[#f59e0b] animate-spin" />
          </div>
        ) : transcripts.length === 0 ? (
          <Card className="bg-white border border-yellow-100 shadow-sm">
            <CardContent className="p-12 text-center text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No call transcripts yet.</p>
              <p className="text-sm mt-1">Transcripts from your audio and video sessions will show up here.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {transcripts.map((t) => {
              const isOpen = expanded === t.id;
              const client = t.session.user;
              return (
                <Card key={t.id} className="bg-white border border-yellow-100 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setExpanded(isOpen ? null : t.id)}
                    className="w-full text-left p-4 flex items-center gap-3 bg-transparent border-none cursor-pointer"
                  >
                    <img
                      src={getAvatarUrl(client?.name || 'User', client?.photoUrl ?? null)}
                      alt={client?.name || 'User'}
                      className="w-10 h-10 rounded-full object-cover border border-amber-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-900 truncate">{client?.name || 'Anonymous User'}</p>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                        {typeIcon(t.session.type)}
                        <span>{t.session.type}</span>
                        <span>·</span>
                        <span>
                          {new Date(t.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                  </button>
                  {isOpen && (
                    <CardContent className="px-4 pb-4 pt-0">
                      <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {t.transcriptText}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}

            {pages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="text-sm font-semibold text-gray-500 hover:text-[#f59e0b] disabled:opacity-30 disabled:cursor-not-allowed bg-transparent border-none cursor-pointer"
                >
                  Previous
                </button>
                <span className="text-xs text-gray-400">Page {page} of {pages}</span>
                <button
                  disabled={page >= pages}
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  className="text-sm font-semibold text-gray-500 hover:text-[#f59e0b] disabled:opacity-30 disabled:cursor-not-allowed bg-transparent border-none cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
