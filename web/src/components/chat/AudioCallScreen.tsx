'use client';

import { useEffect, useState } from 'react';
import { useAgoraCall } from '@/hooks/useAgoraCall';
import { useDeepgramTranscription } from '@/hooks/useDeepgramTranscription';
import CallFeedbackModal from './CallFeedbackModal';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, PhoneOff, Phone, Radio } from 'lucide-react';

interface Props {
  sessionId: string;
}

export default function AudioCallScreen({ sessionId }: Props) {
  const {
    callState,
    isMuted,
    remoteUsers,
    localTrack,
    join,
    leave,
    toggleMute,
    error,
    startTime,
  } = useAgoraCall();

  const { transcriptStatus, liveSnippet, isTranscribing } = useDeepgramTranscription({
    sessionId,
    callState,
    localTrack,
    remoteUsers,
  });

  const [showFeedback, setShowFeedback] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Timer while connected
  useEffect(() => {
    if (callState !== 'connected') return;

    if (startTime) {
      const startTs = new Date(startTime).getTime();
      setElapsed(Math.max(0, Math.floor((Date.now() - startTs) / 1000)));
      const t = setInterval(() => {
        setElapsed(Math.max(0, Math.floor((Date.now() - startTs) / 1000)));
      }, 1000);
      return () => clearInterval(t);
    } else {
      const t = setInterval(() => setElapsed((s) => s + 1), 1000);
      return () => clearInterval(t);
    }
  }, [callState, startTime]);

  useEffect(() => {
    if (callState === 'ended') setShowFeedback(true);
  }, [callState]);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 p-6">
      {/* Status */}
      <div className="text-center space-y-3 max-w-sm mx-auto">
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto text-3xl transition-all ${
            callState === 'connected'
              ? 'bg-green-500/20 ring-4 ring-green-500/30 animate-pulse'
              : 'bg-muted'
          }`}
        >
          📞
        </div>

        {callState === 'idle' && <p className="text-muted-foreground text-sm">Ready to connect</p>}
        {callState === 'joining' && (
          <p className="text-muted-foreground text-sm animate-pulse">Connecting...</p>
        )}
        {callState === 'waiting' && (
          <>
            <p className="font-semibold text-amber-500 animate-pulse">Waiting...</p>
            <p className="text-xs text-muted-foreground">Waiting for other party to join...</p>
          </>
        )}
        {callState === 'connected' && (
          <div className="space-y-2">
            <p className="font-semibold text-green-600">Connected</p>
            <p className="text-muted-foreground text-sm font-mono">{formatTime(elapsed)}</p>

            {/* Live STT Status Badge */}
            {isTranscribing ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm animate-pulse">
                <Radio className="h-3 w-3 text-emerald-600 animate-spin" />
                <span>Live Audio Transcription Active</span>
              </div>
            ) : transcriptStatus === 'unavailable' ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs text-muted-foreground bg-muted/60 border border-border/40">
                <span>📝 Audio transcription unavailable</span>
              </div>
            ) : null}

            {/* Live speech snippet preview if active */}
            {isTranscribing && liveSnippet && (
              <div className="pt-2 px-3 py-1.5 bg-background/80 backdrop-blur border rounded-lg text-xs text-muted-foreground italic truncate max-w-xs mx-auto">
                &ldquo;{liveSnippet}&rdquo;
              </div>
            )}
          </div>
        )}
        {callState === 'ended' && <p className="text-muted-foreground text-sm">Call ended</p>}
        {callState === 'error' && <p className="text-destructive text-sm">{error}</p>}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {callState === 'idle' || callState === 'error' ? (
          <Button
            size="lg"
            className="rounded-full w-16 h-16 bg-green-500 hover:bg-green-600 shadow-md"
            onClick={() => join(sessionId)}
          >
            <Phone className="h-6 w-6 text-white" />
          </Button>
        ) : callState === 'connected' || callState === 'waiting' ? (
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
              className="rounded-full w-16 h-16 bg-destructive hover:bg-destructive/90 shadow-md"
              onClick={async () => {
                await leave();
                import('@/lib/api').then(({ sessionsApi, tokenStore }) => {
                  const token = tokenStore.getAccess();
                  if (token) sessionsApi.end(token, sessionId).catch(console.error);
                });
              }}
            >
              <PhoneOff className="h-6 w-6 text-white" />
            </Button>
          </>
        ) : null}
      </div>

      {/* Post-call feedback & transcript confirmation */}
      <CallFeedbackModal
        sessionId={sessionId}
        open={showFeedback}
        onClose={() => setShowFeedback(false)}
        transcriptStatus={transcriptStatus}
      />
    </div>
  );
}
