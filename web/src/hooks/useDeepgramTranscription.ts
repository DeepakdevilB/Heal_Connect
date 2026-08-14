'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { IMicrophoneAudioTrack, IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';
import { deepgramApi, sessionsApi, tokenStore } from '@/lib/api';
import type { CallState } from './useAgoraCall';

export type TranscriptStatus = 'idle' | 'transcribing' | 'saved' | 'failed' | 'unavailable';

interface UseDeepgramTranscriptionProps {
  sessionId: string;
  callState: CallState;
  localTrack: IMicrophoneAudioTrack | null;
  remoteUsers: IAgoraRTCRemoteUser[];
}

interface UseDeepgramTranscriptionReturn {
  transcriptStatus: TranscriptStatus;
  liveSnippet: string;
  isTranscribing: boolean;
  transcriptCount: number;
}

export function useDeepgramTranscription({
  sessionId,
  callState,
  localTrack,
  remoteUsers,
}: UseDeepgramTranscriptionProps): UseDeepgramTranscriptionReturn {
  const [transcriptStatus, setTranscriptStatus] = useState<TranscriptStatus>('idle');
  const [liveSnippet, setLiveSnippet] = useState('');
  const [transcriptCount, setTranscriptCount] = useState(0);

  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  // Shared across startTranscription() and the "attach newly-joined remote track"
  // effect below — both MUST feed the same destination node, since that's the node
  // whose .stream is actually wired into the MediaRecorder. Previously the effect
  // created its own separate destination that was never connected to the recorder,
  // so any remote participant whose track published after transcription had already
  // started was silently missing from the transcript.
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const audioSourcesRef = useRef<Map<string, MediaStreamAudioSourceNode>>(new Map());
  const transcriptEntriesRef = useRef<string[]>([]);
  const isStartedRef = useRef(false);
  const hasSubmittedRef = useRef(false);

  // Clean up Web Audio & Recorder resources
  const cleanupAudio = useCallback(() => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    } catch {}
    mediaRecorderRef.current = null;

    try {
      audioSourcesRef.current.forEach((src) => {
        try {
          src.disconnect();
        } catch {}
      });
      audioSourcesRef.current.clear();
    } catch {}

    try {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    } catch {}
    audioContextRef.current = null;
    destinationRef.current = null;

    try {
      if (socketRef.current) {
        if (socketRef.current.readyState === WebSocket.OPEN) {
          // Deepgram close protocol
          socketRef.current.send(JSON.stringify({ type: 'CloseStream' }));
        }
        socketRef.current.close();
      }
    } catch {}
    socketRef.current = null;
    isStartedRef.current = false;
  }, []);

  // Submit accumulated transcript to backend with retries
  const submitTranscript = useCallback(async () => {
    if (hasSubmittedRef.current) return;
    const entries = transcriptEntriesRef.current;
    if (!entries || entries.length === 0) {
      setTranscriptStatus((prev) => (prev === 'transcribing' ? 'unavailable' : prev));
      return;
    }

    hasSubmittedRef.current = true;
    const fullTranscriptText = entries.join('\n\n').trim();
    if (!fullTranscriptText) return;

    const token = tokenStore.getAccess();
    if (!token) {
      setTranscriptStatus('failed');
      return;
    }

    // Attempt submission with retries (session might be transitioning to COMPLETED)
    let attempts = 0;
    const maxAttempts = 4;
    while (attempts < maxAttempts) {
      attempts++;
      try {
        const res = await sessionsApi.submitTranscript(token, sessionId, fullTranscriptText);
        if (res.success) {
          setTranscriptStatus('saved');
          return;
        }
        // If 409 / already submitted, treat as saved
        if (res.message && res.message.toLowerCase().includes('already submitted')) {
          setTranscriptStatus('saved');
          return;
        }
      } catch (err) {
        console.warn(`[STT] Transcript submission attempt ${attempts} failed:`, err);
      }

      if (attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 600));
      }
    }

    setTranscriptStatus('failed');
  }, [sessionId]);

  // Start live STT session
  const startTranscription = useCallback(async () => {
    if (isStartedRef.current) return;
    isStartedRef.current = true;

    try {
      const token = tokenStore.getAccess();
      if (!token) {
        setTranscriptStatus('unavailable');
        return;
      }

      // 1. Fetch Deepgram token from backend
      const tokenRes = await deepgramApi.getToken(token, sessionId);
      if (!tokenRes.success || !tokenRes.data?.isConfigured || !tokenRes.data?.apiKey) {
        console.info('[STT] Deepgram STT is not configured on server. Falling back to manual entry.');
        setTranscriptStatus('unavailable');
        return;
      }

      const apiKey = tokenRes.data.apiKey;

      // 2. Set up Web Audio mixing context
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const destination = audioCtx.createMediaStreamDestination();
      destinationRef.current = destination;

      // Connect local mic track
      if (localTrack) {
        try {
          const mediaStreamTrack = localTrack.getMediaStreamTrack();
          if (mediaStreamTrack) {
            const localSource = audioCtx.createMediaStreamSource(new MediaStream([mediaStreamTrack]));
            localSource.connect(destination);
            audioSourcesRef.current.set('local', localSource);
          }
        } catch (localErr) {
          console.warn('[STT] Failed to attach local audio track:', localErr);
        }
      }

      // Connect remote users' audio tracks
      remoteUsers.forEach((u) => {
        try {
          const remoteTrack = u.audioTrack?.getMediaStreamTrack();
          if (remoteTrack) {
            const remoteSource = audioCtx.createMediaStreamSource(new MediaStream([remoteTrack]));
            remoteSource.connect(destination);
            audioSourcesRef.current.set(String(u.uid), remoteSource);
          }
        } catch (remErr) {
          console.warn(`[STT] Failed to attach remote audio track for user ${u.uid}:`, remErr);
        }
      });

      // 3. Connect to Deepgram WebSocket with true multilingual code-switching, so a
      // single conversation that mixes Hindi and English mid-sentence ("Hinglish")
      // is transcribed correctly, plus diarization to separate the two speakers.
      // NOTE: language=multi is Deepgram's actual code-switching mode (Nova-2/Nova-3).
      // `detect_language=true` is a DIFFERENT feature — it picks one dominant language
      // for the whole session and would override/ignore a fixed `language` value — it
      // does not support switching languages within the same conversation, which is
      // what we actually need here. endpointing=100 is Deepgram's recommended value
      // for code-switching streams. See:
      // https://developers.deepgram.com/docs/multilingual-code-switching
      const deepgramWsUrl =
        'wss://api.deepgram.com/v1/listen?' +
        new URLSearchParams({
          model: 'nova-2',
          language: 'multi',
          diarize: 'true',
          smart_format: 'true',
          punctuate: 'true',
          interim_results: 'true',
          endpointing: '100',
        }).toString();

      const ws = new WebSocket(deepgramWsUrl, ['token', apiKey]);
      socketRef.current = ws;

      ws.onopen = () => {
        setTranscriptStatus('transcribing');

        // Choose supported mimeType for MediaRecorder
        const mimeTypes = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/ogg;codecs=opus',
          'audio/mp4',
        ];
        const selectedMime = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || '';

        try {
          const recorder = selectedMime
            ? new MediaRecorder(destination.stream, { mimeType: selectedMime })
            : new MediaRecorder(destination.stream);

          mediaRecorderRef.current = recorder;

          recorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
              ws.send(event.data);
            }
          };

          recorder.start(250); // Stream in 250ms chunks
        } catch (recErr) {
          console.warn('[STT] Failed to start MediaRecorder:', recErr);
          setTranscriptStatus('failed');
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const alternative = data.channel?.alternatives?.[0];
          if (!alternative) return;

          const transcript = alternative.transcript?.trim();
          if (!transcript) return;

          const isFinal = data.is_final || data.speech_final;

          // Determine speaker label from diarization words if available
          let speakerLabel = 'Speaker';
          if (alternative.words && alternative.words.length > 0) {
            const speakerId = alternative.words[0].speaker;
            if (speakerId !== undefined) {
              speakerLabel = `Speaker ${speakerId}`;
            }
          }

          if (isFinal) {
            const formatted = `[${speakerLabel}] ${transcript}`;
            transcriptEntriesRef.current.push(formatted);
            setTranscriptCount(transcriptEntriesRef.current.length);
            setLiveSnippet(transcript);
          } else {
            setLiveSnippet(transcript);
          }
        } catch {}
      };

      ws.onerror = (err) => {
        console.warn('[STT] Deepgram WebSocket error:', err);
        setTranscriptStatus((prev) => (prev === 'transcribing' ? 'failed' : prev));
      };

      ws.onclose = () => {
        // Closed gracefully or on connection end
      };
    } catch (err) {
      console.warn('[STT] Initialization error:', err);
      setTranscriptStatus('unavailable');
    }
  }, [sessionId, localTrack, remoteUsers]);

  // Dynamically attach any new remote audio tracks as users publish (e.g. the other
  // participant's Agora track finishes subscribing a moment after transcription
  // already started). Must reuse the SAME destination node that feeds the
  // MediaRecorder — see destinationRef comment above — otherwise this audio is
  // connected to a dead-end node and silently never reaches the transcript.
  useEffect(() => {
    if (transcriptStatus !== 'transcribing' || !audioContextRef.current || !destinationRef.current) return;
    const audioCtx = audioContextRef.current;
    const destination = destinationRef.current;

    remoteUsers.forEach((u) => {
      const key = String(u.uid);
      if (!audioSourcesRef.current.has(key)) {
        try {
          const remoteTrack = u.audioTrack?.getMediaStreamTrack();
          if (remoteTrack) {
            const remoteSource = audioCtx.createMediaStreamSource(new MediaStream([remoteTrack]));
            remoteSource.connect(destination);
            audioSourcesRef.current.set(key, remoteSource);
          }
        } catch {}
      }
    });
  }, [remoteUsers, transcriptStatus]);

  // Handle call lifecycle transitions
  useEffect(() => {
    if (callState === 'connected') {
      startTranscription();
    } else if (callState === 'ended') {
      cleanupAudio();
      submitTranscript();
    } else if (callState === 'error') {
      cleanupAudio();
    }
  }, [callState, startTranscription, cleanupAudio, submitTranscript]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, [cleanupAudio]);

  return {
    transcriptStatus,
    liveSnippet,
    isTranscribing: transcriptStatus === 'transcribing',
    transcriptCount,
  };
}
