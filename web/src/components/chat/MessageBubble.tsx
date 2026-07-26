'use client';

import { cn } from '@/lib/utils';
import type { Message } from '@/hooks/useSessionChat';

interface Props {
  message: Message;
  isMine: boolean;
}

export default function MessageBubble({ message, isMine }: Props) {
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[72%] px-4 py-2.5 text-sm shadow-sm',
          isMine
            ? 'bg-[#f59e0b] text-white rounded-2xl rounded-br-sm'
            : 'bg-white border border-yellow-100 text-[#1a1a1a] rounded-2xl rounded-bl-sm'
        )}
      >
        <p className="leading-relaxed break-words">{message.content}</p>
        <div className={cn('flex items-center gap-1 mt-1 text-[10px]', isMine ? 'justify-end text-white/70' : 'justify-start text-gray-400')}>
          <span>{time}</span>
          {isMine && (
            <span className={message.isRead ? 'text-white' : 'text-white/50'}>
              {message.isRead ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
