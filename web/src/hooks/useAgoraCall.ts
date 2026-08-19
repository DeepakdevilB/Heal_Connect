'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import AgoraRTC, {
  type IAgoraRTCClient,
  type IMicrophoneAudioTrack,
  type IAgoraRTCRemoteUser,
} from 'agora-rtc-sdk-ng';
import { agoraApi, tokenStore, sessionsApi } from '@/lib/api';

export type CallState = 'idle' | 'joining' | 'waiting' | 'connected' | 'ended' | 'error';

interface UseAgoraCallReturn {
  callState: CallState;
  isMuted: boolean;
  remoteUsers: IAgoraRTCRemoteUser[];
  join: (sessionId: string) => Promise<void>;
  leave: () => Promise<void>;
  toggleMute: () => void;
  error: string | null;
  startTime: string | null;
}

export function useAgoraCall(): UseAgoraCallReturn {
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localTrackRef = useRef<IMicrophoneAudioTrack | null>(null);

  const [callState, setCallState] = useState<CallState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = useCallback(async () => {
    localTrackRef.current?.close();
    localTrackRef.current = null;
    if (clientRef.current) {
      await clientRef.current.leave().catch(() => {});
      clientRef.current = null;
    }
  }, []);


  const join = useCallback(async (sessionId: string) => {
    setError(null);
    setCallState('joining');

    try {
      const accessToken = tokenStore.getAccess();
      if (!accessToken) throw new Error('Not authenticated');

      // Fetch Agora token from backend
      const res = await agoraApi.getToken(accessToken, sessionId);
      if (!res.success || !res.data) throw new Error(res.message || 'Failed to get token');

      const { token, channelName, uid, appId } = res.data;

      // Create Agora client (audio only)
      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      clientRef.current = client;

      // Remote user event handlers
      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === 'audio') user.audioTrack?.play();
      });

      client.on('user-joined', (user) => {
        setRemoteUsers((prev) => {
          const exists = prev.find((u) => u.uid === user.uid);
          return exists ? prev : [...prev, user];
        });
        
        setCallState((current) => {
          if (current === 'waiting') {
            sessionsApi.connect(accessToken, sessionId).then((connectRes) => {
              if (connectRes.success && connectRes.data?.session?.startTime) {
                setStartTime(connectRes.data.session.startTime);
              }
            }).catch(console.error);
            return 'connected';
          }
          return current;
        });
      });

      client.on('user-unpublished', (user) => {
        setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
      });

      client.on('user-left', (user) => {
        setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
      });

      // Join channel
      await client.join(appId, channelName, token, uid);

      // Create and publish microphone track
      const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
      localTrackRef.current = micTrack;
      await client.publish(micTrack);

      if (client.remoteUsers.length > 0) {
        setRemoteUsers(client.remoteUsers);
        const connectRes = await sessionsApi.connect(accessToken, sessionId);
        if (connectRes.success && connectRes.data?.session?.startTime) {
          setStartTime(connectRes.data.session.startTime);
        }
        setCallState('connected');
      } else {
        setCallState('waiting');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to join call';
      setError(message);
      setCallState('error');
      await cleanup();
    }
  }, [cleanup]);

  const leave = useCallback(async () => {
    await cleanup();
    setCallState('ended');
    setRemoteUsers([]);
    setIsMuted(false);
  }, [cleanup]);

  // Listen for backend termination
  useEffect(() => {
    const token = tokenStore.getAccess();
    if (!token) return;
    
    let socket: any = null;
    const handleTerminated = () => leave();
    
    import('@/lib/socket').then(({ getSocket }) => {
      socket = getSocket(token);
      socket.on('session_terminated', handleTerminated);
    });

    return () => {
      if (socket) socket.off('session_terminated', handleTerminated);
    };
  }, [leave]);

  const toggleMute = useCallback(() => {
    if (!localTrackRef.current) return;
    const next = !isMuted;
    localTrackRef.current.setEnabled(!next);
    setIsMuted(next);
  }, [isMuted]);

  return { callState, isMuted, remoteUsers, join, leave,
    toggleMute,
    error,
    startTime,
  };
}
