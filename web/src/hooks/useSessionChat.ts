'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { tokenStore, walletApi } from '@/lib/api';

export interface Message {
  id: string;
  senderId: string;
  senderType: 'USER' | 'PRACTITIONER';
  content: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export type SessionStatus = 'connecting' | 'active' | 'low_balance' | 'ended';

interface UseSessionChatReturn {
  messages: Message[];
  sessionStatus: SessionStatus;
  otherTyping: boolean;
  elapsedSeconds: number;
  walletBalance: number | null;
  sendMessage: (content: string) => void;
  emitTypingStart: () => void;
  emitTypingStop: () => void;
  markRead: (messageId: string) => void;
  endSession: () => void;
}

export function useSessionChat(sessionId: string, currentUserId: string): UseSessionChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('connecting');
  const [otherTyping, setOtherTyping] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const walletPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Wallet polling every 15s ──────────────────────────────────────────────
  const fetchWallet = useCallback(() => {
    const token = tokenStore.getAccess();
    if (!token) return;
    walletApi.getBalance(token).then((res) => {
      if (res.success && res.data) setWalletBalance(res.data.wallet.balance);
    });
  }, []);

  // ── Socket setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    const token = tokenStore.getAccess();
    if (!token) return;

    const socket = getSocket(token);
    socket.emit('join_room', { sessionId });

    socket.on('joined_room', () => {
      setSessionStatus('active');
      // Stop any existing timers before starting new ones (Strict Mode safety)
      if (timerRef.current) clearInterval(timerRef.current);
      if (walletPollRef.current) clearInterval(walletPollRef.current);
      // Start session timer
      timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
      // Start wallet polling
      fetchWallet();
      walletPollRef.current = setInterval(fetchWallet, 15000);
    });

    socket.on('message_history', ({ messages: hist }: { messages: Message[] }) => {
      setMessages(hist);
    });

    socket.on('new_message', ({ message }: { message: Message }) => {
      setMessages((prev) => [...prev, message]);
      if (message.senderId !== currentUserId) {
        socket.emit('message_read', { sessionId, messageId: message.id });
      }
    });

    socket.on('typing_update', ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
      if (userId !== currentUserId) setOtherTyping(isTyping);
    });

    socket.on('receipt_update', ({ messageId, readAt }: { messageId: string; readAt: string }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isRead: true, readAt } : m))
      );
    });

    socket.on('low_balance', () => setSessionStatus('low_balance'));

    socket.on('session_terminated', () => {
      stopTimers();
      setSessionStatus('ended');
      disconnectSocket();
    });

    return () => {
      socket.off('joined_room');
      socket.off('message_history');
      socket.off('new_message');
      socket.off('typing_update');
      socket.off('receipt_update');
      socket.off('low_balance');
      socket.off('session_terminated');
      stopTimers();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, currentUserId]);

  const stopTimers = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (walletPollRef.current) { clearInterval(walletPollRef.current); walletPollRef.current = null; }
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const sendMessage = useCallback((content: string) => {
    const token = tokenStore.getAccess();
    if (!token || !content.trim() || sessionStatus === 'ended') return;
    getSocket(token).emit('send_message', { sessionId, content: content.trim() });
  }, [sessionId, sessionStatus]);

  const emitTypingStart = useCallback(() => {
    const token = tokenStore.getAccess();
    if (!token) return;
    getSocket(token).emit('typing_start', { sessionId });
  }, [sessionId]);

  const emitTypingStop = useCallback(() => {
    const token = tokenStore.getAccess();
    if (!token) return;
    getSocket(token).emit('typing_stop', { sessionId });
  }, [sessionId]);

  const markRead = useCallback((messageId: string) => {
    const token = tokenStore.getAccess();
    if (!token) return;
    getSocket(token).emit('message_read', { sessionId, messageId });
  }, [sessionId]);

  const endSession = useCallback(() => {
    stopTimers();
    setSessionStatus('ended');
    disconnectSocket();
  }, []);

  return { messages, sessionStatus, otherTyping, elapsedSeconds, walletBalance, sendMessage, emitTypingStart, emitTypingStop, markRead, endSession };
}
