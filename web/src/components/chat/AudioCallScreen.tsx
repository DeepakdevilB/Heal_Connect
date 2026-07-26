'use client';

import { useEffect, useState } from 'react';
import { useAgoraCall } from '@/hooks/useAgoraCall';
import CallFeedbackModal from './CallFeedbackModal';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, PhoneOff, Phone } from 'lucide-react';

interface Props {
  sessionId: string;
}

export default function AudioCallScreen({ sessionId }: Props) {
  const { callState, isMuted, remoteUsers, join, leave, toggleMute, error } = useAgoraCall();
  const [showFeedback, setShowFeedback] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Timer while connected
  useEffect(() => {
    if (callState !== 'connected') return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [callState]);

  // Show feedback modal after call ends
  useEffect(() => {
    if (callState === 'ended') setShowFeedback(true);
  }, [callState]);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 p-6">
      {/* Status */}
      <div className="text-center space-y-2">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto text-3xl
          ${callState === 'connected' ? 'bg-green-500/20 animate-pulse' : 'bg-muted'}`}>
          📞
        </div>

        {callState === 'idle' && <p className="text-muted-foreground text-sm">Ready to connect</p>}
        {callState === 'joining' && <p className="text-muted-foreground text-sm animate-pulse">Connecting...</p>}
        {callState === 'connected' && (
          <>
            <p className="font-semibold text-green-500">Connected</p>
            <p className="text-muted-foreground text-sm font-mono">{formatTime(elapsed)}</p>
            <p className="text-xs text-muted-foreground">
              {remoteUsers.length > 0 ? `${remoteUsers.length} participant(s) in call` : 'Waiting for other party...'}
            </p>
          </>
        )}
        {callState === 'ended' && <p className="text-muted-foreground text-sm">Call ended</p>}
        {callState === 'error' && <p className="text-destructive text-sm">{error}</p>}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {callState === 'idle' || callState === 'error' ? (
          <Button
            size="lg"
            className="rounded-full w-16 h-16 bg-green-500 hover:bg-green-600"
            onClick={() => join(sessionId)}
          >
            <Phone className="h-6 w-6" />
          </Button>
        ) : callState === 'connected' ? (
          <>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full w-14 h-14"
              onClick={toggleMute}
            >
              {isMuted ? <MicOff className="h-5 w-5 text-destructive" /> : <Mic className="h-5 w-5" />}
            </Button>

            <Button
              size="lg"
              className="rounded-full w-16 h-16 bg-destructive hover:bg-destructive/90"
              onClick={leave}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </>
        ) : null}
      </div>

      {/* Post-call feedback */}
      <CallFeedbackModal
        sessionId={sessionId}
        open={showFeedback}
        onClose={() => setShowFeedback(false)}
      />
    </div>
  );
}
