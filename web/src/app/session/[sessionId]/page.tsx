'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import ChatWindow from '@/components/chat/ChatWindow';
import AudioCallScreen from '@/components/chat/AudioCallScreen';
import { tokenStore, agoraApi, sessionsApi, type PractitionerProfile } from '@/lib/api';
import { ArrowLeft, MessageSquare, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Tab = 'chat' | 'call';

export default function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionType, setSessionType] = useState<string | null>(null);
  const [practitioner, setPractitioner] = useState<PractitionerProfile | null>(null);
  const [tab, setTab] = useState<Tab>('chat');

  useEffect(() => {
    const token = tokenStore.getAccess();
    if (!token) { router.push('/login'); return; }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUserId(payload.userId);
    } catch {
      router.push('/login');
      return;
    }

    agoraApi.getChannel(token, sessionId).then((res) => {
      if (res.success && res.data) {
        setSessionType(res.data.sessionType);
      }
    });

    // Fetch session to get practitioner info
    sessionsApi.get(token, sessionId).then((res) => {
      if (res.success && res.data) {
        setPractitioner(res.data.session.practitioner);
      }
    });
  }, [router, sessionId]);

  if (!userId) return null;

  const showCallTab = sessionType === 'AUDIO' || sessionType === 'VIDEO';
  const initials = practitioner?.name
    ? practitioner.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <div className="flex flex-col h-screen bg-[#fffbf0]">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-yellow-100 px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-yellow-50 shrink-0">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Button>

        {/* Practitioner avatar */}
        <div className="relative shrink-0">
          {practitioner?.photoUrl ? (
            <Image
              src={practitioner.photoUrl}
              alt={practitioner.name}
              width={38}
              height={38}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-[#f59e0b] to-[#ef4444] flex items-center justify-center text-white text-sm font-bold">
              {initials}
            </div>
          )}
          {practitioner?.isOnline && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
          )}
        </div>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-[#1a1a1a] truncate">
            {practitioner?.name ?? 'Loading...'}
          </p>
          <p className="text-xs text-gray-400 truncate">
            {practitioner?.specialties?.slice(0, 2).join(' · ') ?? sessionId.slice(0, 8) + '...'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 shrink-0">
          <Button
            size="sm"
            variant={tab === 'chat' ? 'default' : 'ghost'}
            onClick={() => setTab('chat')}
            className={cn(
              'h-8 px-3 rounded-full text-xs gap-1',
              tab === 'chat' ? 'bg-[#f59e0b] hover:bg-[#d97706] border-0 text-white' : 'hover:bg-yellow-50'
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Chat
          </Button>
          {showCallTab && (
            <Button
              size="sm"
              variant={tab === 'call' ? 'default' : 'ghost'}
              onClick={() => setTab('call')}
              className={cn(
                'h-8 px-3 rounded-full text-xs gap-1',
                tab === 'call' ? 'bg-[#f59e0b] hover:bg-[#d97706] border-0 text-white' : 'hover:bg-yellow-50'
              )}
            >
              <Phone className="h-3.5 w-3.5" />
              Call
            </Button>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'chat' ? (
          <ChatWindow sessionId={sessionId} currentUserId={userId} />
        ) : (
          <AudioCallScreen sessionId={sessionId} />
        )}
      </div>
    </div>
  );
}

// inline cn to avoid extra import issues
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
