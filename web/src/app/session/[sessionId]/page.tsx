'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { ArrowLeft, MessageSquare, Phone } from 'lucide-react';
import ChatWindow from '@/components/chat/ChatWindow';
import { Button } from '@/components/ui/button';
import { tokenStore, agoraApi, sessionsApi, type PractitionerProfile } from '@/lib/api';

// Agora SDK uses `window` at import time — must never be SSR'd
const AudioCallScreen = dynamic(() => import('@/components/chat/AudioCallScreen'), { ssr: false });

type Tab = 'chat' | 'call';

export default function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionType, setSessionType] = useState<string | null>(null);
  const [peer, setPeer] = useState<any>(null); // The other person in the chat
  const [isExpert, setIsExpert] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('chat');
  const [startingCall, setStartingCall] = useState(false);

  useEffect(() => {
    const token = tokenStore.getAccess();
    if (!token) { router.push('/login'); return; }

    let currentJwtUserId = '';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      currentJwtUserId = payload.userId;
      setUserId(currentJwtUserId);
    } catch {
      router.push('/login');
      return;
    }

    agoraApi.getChannel(token, sessionId).then((res) => {
      if (res.success && res.data) {
        setSessionType(res.data.sessionType);
        if (res.data.sessionType === 'AUDIO' || res.data.sessionType === 'VIDEO') {
          setTab('call');
        }
      }
    });

    // Fetch session to get peer info
    sessionsApi.get(token, sessionId).then((res) => {
      if (res.success && res.data) {
        const session = res.data.session;
        setActiveSession(session);
        
        // If our JWT userId matches the session's practitioner's userId, we are the expert.
        // Wait, sessions API returns practitioner { id, name ... } and user { id, name ... }
        // The practitioner ID is NOT the user ID. But wait! The JWT payload has userId and practitionerId.
        // It's safer to just parse practitionerId from JWT, or check if currentJwtUserId === session.userId.
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        const isPractitioner = tokenPayload.practitionerId === session.practitionerId;
        setIsExpert(isPractitioner);
        
        if (isPractitioner) {
          setPeer(session.user);
        } else {
          setPeer(session.practitioner);
        }
      }
    });
  }, [router, sessionId]);

  const handleSwitchToCall = async () => {
    const token = tokenStore.getAccess();
    if (!token || !activeSession?.practitionerId || startingCall) return;
    setStartingCall(true);
    try {
      const res = await sessionsApi.create(token, activeSession.practitionerId, 'AUDIO');
      if (res.success && res.data?.session) {
        router.push(`/session/${res.data.session.id}`);
      } else {
        alert(res.message || 'Could not start a call. Please recharge your wallet.');
      }
    } catch {
      alert('Unable to start the call. Please try again.');
    } finally {
      setStartingCall(false);
    }
  };

  if (!userId || !peer) return null;

  const showCallTab = sessionType === 'AUDIO' || sessionType === 'VIDEO';
  // Chat-only session, viewed by the consumer — offer a one-tap way to escalate to a call.
  const showSwitchToCall = sessionType === 'CHAT' && !isExpert;
  const initials = peer?.name
    ? peer.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <div className="flex flex-col h-screen bg-[#fffbf0]">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-yellow-100 px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-yellow-50 shrink-0">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Button>

        {/* Peer avatar */}
        <div className="relative shrink-0">
          {peer?.photoUrl ? (
            <Image
              src={peer.photoUrl}
              alt={peer.name || 'User'}
              width={38}
              height={38}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-[#f59e0b] to-[#ef4444] flex items-center justify-center text-white text-sm font-bold">
              {initials}
            </div>
          )}
          {peer?.isOnline !== undefined && peer.isOnline && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
          )}
        </div>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-[#1a1a1a] truncate">
            {peer?.name ?? 'Loading...'}
          </p>
          <p className="text-xs text-gray-400 truncate">
            {peer?.specialties?.slice(0, 2).join(' · ') ?? sessionId.slice(0, 8) + '...'}
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
          {showSwitchToCall && (
            <Button
              size="icon"
              onClick={handleSwitchToCall}
              disabled={startingCall}
              aria-label="Start a call with this expert"
              title="Switch to a call"
              className="h-8 w-8 rounded-full bg-emerald-500 hover:bg-emerald-600 border-0 text-white disabled:opacity-50 shrink-0"
            >
              <Phone className={cn('h-3.5 w-3.5', startingCall ? 'animate-pulse' : '')} />
            </Button>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'chat' ? (
          <ChatWindow
            sessionId={sessionId}
            currentUserId={isExpert ? activeSession?.practitionerId : userId}
            isExpert={isExpert}
            practitionerId={activeSession?.practitionerId ?? ''}
            practitionerName={isExpert ? '' : (peer?.name ?? 'the expert')}
          />
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
