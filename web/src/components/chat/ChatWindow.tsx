'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSessionChat } from '@/hooks/useSessionChat';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import SessionTimerOverlay from './SessionTimerOverlay';
import EndSessionConfirmDialog from './EndSessionConfirmDialog';
import ReviewModal from './ReviewModal';
import { Button } from '@/components/ui/button';
import { Send, Wifi, WifiOff, MessagesSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  sessionId: string;
  currentUserId: string;
  isExpert?: boolean;
  practitionerId?: string;
  practitionerName?: string;
}

export default function ChatWindow({ sessionId, currentUserId, isExpert = false, practitionerId = '', practitionerName = 'the expert' }: Props) {
  const {
    messages, sessionStatus, otherTyping,
    elapsedSeconds, walletBalance,
    sendMessage, emitTypingStart, emitTypingStop, endSession,
  } = useSessionChat(sessionId, currentUserId);

  const [input, setInput] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-scroll on new messages / typing
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherTyping]);

  // Show review modal when session ends (only for users)
  useEffect(() => {
    if (sessionStatus === 'ended' && !isExpert && practitionerId) {
      const timer = setTimeout(() => setShowReview(true), 800);
      return () => clearTimeout(timer);
    }
  }, [sessionStatus, isExpert, practitionerId]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    emitTypingStart();
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(emitTypingStop, 2000);
  };

  const handleSend = useCallback(() => {
    if (!input.trim() || sessionStatus === 'ended') return;
    sendMessage(input.trim());
    setInput('');
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    emitTypingStop();
  }, [input, sessionStatus, sendMessage, emitTypingStop]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const isEnded = sessionStatus === 'ended';
  const isLowBalance = sessionStatus === 'low_balance';
  const isConnecting = sessionStatus === 'connecting';

  return (
    <div className="flex flex-col h-full bg-[#fffbf0]">

      {/* Timer + wallet overlay (only when active) */}
      {!isConnecting && !isEnded && (
        <SessionTimerOverlay
          elapsedSeconds={elapsedSeconds}
          walletBalance={walletBalance}
          onEndSession={() => setShowConfirm(true)}
          isLowBalance={isLowBalance}
        />
      )}

      {/* Low balance warning banner */}
      {isLowBalance && (
        <div className="flex items-center justify-center gap-2 bg-red-50 border-b border-red-200 px-4 py-2">
          <span className="text-xs font-medium text-red-600">
            ⚠️ Low balance — please recharge to keep the session going
          </span>
        </div>
      )}

      {/* Connecting state */}
      {isConnecting && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
          <Wifi className="h-8 w-8 animate-pulse text-[#f59e0b]" />
          <p className="text-sm">Connecting to session...</p>
        </div>
      )}

      {/* Ended state — summary + a clearly-labeled Chat History section */}
      {isEnded && (
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
              <WifiOff className="h-7 w-7 text-amber-400" />
            </div>
            <div className="text-center">
              <p className="font-bold text-lg text-[#1a1a1a]">Session Completed</p>
              <p className="text-sm text-gray-500 mt-1">
                {elapsedSeconds > 0
                  ? `Duration: ${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s`
                  : 'This session has been completed.'}
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full mt-1">
              {!isExpert && practitionerId && (
                <button
                  onClick={() => setShowReview(true)}
                  className="w-full text-center bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-full text-sm transition-colors flex items-center justify-center gap-2"
                >
                  ⭐ Rate this Session
                </button>
              )}
              <a
                href="/practitioners"
                className="w-full text-center bg-white border border-amber-200 hover:bg-amber-50 text-amber-700 font-semibold py-2.5 rounded-full text-sm transition-colors"
              >
                Book Another Session
              </a>
              <a
                href="/dashboard"
                className="w-full text-center text-gray-500 hover:text-gray-700 font-medium py-2 text-sm transition-colors"
              >
                Back to Dashboard
              </a>
            </div>
          </div>

          {/* Chat History — clearly labeled, own card, generous height */}
          {messages.length > 0 && (
            <div className="max-w-md mx-auto mt-8">
              <div className="flex items-center gap-2 mb-3 px-1">
                <MessagesSquare className="h-4 w-4 text-amber-500 shrink-0" />
                <h3 className="font-bold text-sm text-[#1a1a1a]">Chat History</h3>
                <span className="text-xs text-gray-400">({messages.length} message{messages.length === 1 ? '' : 's'})</span>
              </div>
              <div className="bg-white border border-yellow-100 rounded-2xl shadow-sm p-4 space-y-2 max-h-[420px] overflow-y-auto">
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isMine={msg.senderId === currentUserId}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Messages list (active session) */}
      {!isConnecting && !isEnded && (
        <div className="overflow-y-auto px-4 py-4 space-y-2 flex-1">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400 pt-16">
              <p className="text-sm">No messages yet. Say hello! 👋</p>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isMine={msg.senderId === currentUserId}
            />
          ))}

          {otherTyping && (
            <div className="flex justify-start">
              <div className="bg-white border border-yellow-100 rounded-2xl rounded-bl-sm px-3 shadow-sm">
                <TypingIndicator />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}

      {/* Input area */}
      {!isEnded && !isConnecting && (
        <div className="border-t border-yellow-100 bg-white px-3 py-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              disabled={isEnded}
              className={cn(
                'flex-1 resize-none rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-2.5 text-sm text-[#1a1a1a] placeholder:text-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/40 focus:border-[#f59e0b]',
                'max-h-32 overflow-y-auto transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              style={{ lineHeight: '1.5' }}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isEnded}
              className="h-10 w-10 rounded-full bg-[#f59e0b] hover:bg-[#d97706] border-0 text-white shrink-0 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5 text-center">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      )}

      {/* End session confirm dialog */}
      <EndSessionConfirmDialog
        open={showConfirm}
        onConfirm={() => { setShowConfirm(false); endSession(); }}
        onCancel={() => setShowConfirm(false)}
      />

      {/* Review modal — shown to users after session ends */}
      <ReviewModal
        open={showReview}
        practitionerId={practitionerId}
        practitionerName={practitionerName}
        sessionId={sessionId}
        onClose={() => setShowReview(false)}
        onSubmitted={() => setShowReview(false)}
      />
    </div>
  );
}
